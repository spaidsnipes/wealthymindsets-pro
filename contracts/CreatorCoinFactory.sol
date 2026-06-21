// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ███████████████████████████████████████████████████████████████
 *
 *   WealthyMindsets Pro — Creator Coin Factory
 *   ───────────────────────────────────────────
 *   Any user pays a creation fee (in ETH) to launch their own
 *   ERC-20 Creator Coin. The ETH fee goes directly to the WM$
 *   buyback engine, creating immediate buy pressure on WM$.
 *
 *   One wallet = one coin limit (prevents spam, keeps ecosystem
 *   exclusive). Owner can whitelist wallets for multiple coins.
 *
 *   All deployed coins are indexed on-chain for frontend discovery.
 *
 * ███████████████████████████████████████████████████████████████
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CreatorCoin.sol";

interface IWMSReceiver {
    function receiveFee(address creatorCoin) external payable;
}

contract CreatorCoinFactory is Ownable, ReentrancyGuard, Pausable {

    // ─── Config ───────────────────────────────────────────────────────────────
    address public immutable wmsContract;   // WM$ main token contract (receives creation fees)
    uint256 public creationFeeWei;          // ETH required to launch a Creator Coin
    bool    public onePerWallet;            // if true, one coin per creator wallet

    // ─── Registry ─────────────────────────────────────────────────────────────
    struct CoinRecord {
        address coinAddress;
        address creator;
        string  name;
        string  symbol;
        string  category;
        uint256 createdAt;
        bool    verified;       // owner-verified (blue checkmark equivalent)
    }

    // All deployed coins (index → record)
    CoinRecord[]                           public allCoins;

    // Mappings for lookup
    mapping(address => address)   public creatorToCoin;    // creator wallet → coin address
    mapping(address => uint256)   public coinToIndex;      // coin address → allCoins index
    mapping(address => bool)      public isCreatorCoin;    // quick validity check
    mapping(address => bool)      public multiCoinAllowed; // whitelisted multi-coin wallets

    // Category index for frontend filtering
    mapping(string  => uint256[]) public coinsByCategory;  // category → indices

    // ─── Fee Accounting ───────────────────────────────────────────────────────
    uint256 public totalCoinsDeployed;
    uint256 public totalFeesCollectedWei;  // ETH sent to WMS from creation fees

    // ─── Events ───────────────────────────────────────────────────────────────
    event CreatorCoinLaunched(
        address indexed coinAddress,
        address indexed creator,
        string  name,
        string  symbol,
        string  category,
        uint256 feeRate,
        uint256 initialSupply
    );
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event CoinVerified(address indexed coinAddress, bool verified);
    event MultiCoinWhitelisted(address indexed wallet, bool allowed);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error InsufficientCreationFee(uint256 required, uint256 sent);
    error AlreadyHasCoin(address creator, address existingCoin);
    error NotACreatorCoin(address addr);
    error ZeroAddress();
    error EmptyString();
    error InvalidSupply();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _wmsContract,
        uint256 _creationFeeWei,
        address _initialOwner
    )
        Ownable(_initialOwner)
    {
        if (_wmsContract == address(0)) revert ZeroAddress();
        wmsContract      = _wmsContract;
        creationFeeWei   = _creationFeeWei;  // e.g. 0.05 ETH = 50000000000000000
        onePerWallet     = true;
    }

    // ─── Main: Launch a Creator Coin ─────────────────────────────────────────
    /**
     * @dev Deploys a new ERC-20 Creator Coin for the calling wallet.
     *
     * @param name          Token name, e.g. "Drake Coin"
     * @param symbol        Token symbol, e.g. "DRAKECOIN"
     * @param initialSupply How many tokens to mint at launch (use 18 decimals)
     * @param maxSupply     Hard cap (0 = unlimited)
     * @param feeRate       Fee in bps: 200–500 (2%–5%)
     * @param creatorName   Human-readable creator name (for profile page)
     * @param category      "Music" | "Art" | "Business" | "Brand" | "Gaming" | etc.
     * @param metadataUri   IPFS URI with logo + description JSON
     */
    function launchCoin(
        string  memory name,
        string  memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        uint16  feeRate,
        string  memory creatorName,
        string  memory category,
        string  memory metadataUri
    )
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address coinAddress)
    {
        // ── Validations ────────────────────────────────────────────────────
        if (msg.value < creationFeeWei)
            revert InsufficientCreationFee(creationFeeWei, msg.value);

        if (onePerWallet && !multiCoinAllowed[msg.sender] && creatorToCoin[msg.sender] != address(0))
            revert AlreadyHasCoin(msg.sender, creatorToCoin[msg.sender]);

        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert EmptyString();
        if (initialSupply == 0) revert InvalidSupply();

        // ── Deploy new Creator Coin ────────────────────────────────────────
        CreatorCoin coin = new CreatorCoin(
            name,
            symbol,
            initialSupply,
            maxSupply,
            feeRate,
            creatorName,
            category,
            metadataUri,
            msg.sender,   // creator = deployer
            wmsContract,
            address(this)
        );

        coinAddress = address(coin);

        // ── Register in factory ────────────────────────────────────────────
        uint256 idx = allCoins.length;
        allCoins.push(CoinRecord({
            coinAddress: coinAddress,
            creator:     msg.sender,
            name:        name,
            symbol:      symbol,
            category:    category,
            createdAt:   block.timestamp,
            verified:    false
        }));

        creatorToCoin[msg.sender] = coinAddress;
        coinToIndex[coinAddress]  = idx;
        isCreatorCoin[coinAddress] = true;
        coinsByCategory[category].push(idx);
        totalCoinsDeployed++;

        // ── Forward creation fee to WMS ecosystem ─────────────────────────
        // This is the FIRST buyback trigger: every new coin launch
        // sends ETH directly to the WM$ contract as a fee.
        uint256 feeToSend = msg.value; // send full creation fee
        totalFeesCollectedWei += feeToSend;
        IWMSReceiver(wmsContract).receiveFee{value: feeToSend}(coinAddress);

        emit CreatorCoinLaunched(coinAddress, msg.sender, name, symbol, category, feeRate, initialSupply);
    }

    // ─── Owner Admin ──────────────────────────────────────────────────────────
    function setCreationFee(uint256 _feeWei) external onlyOwner {
        emit CreationFeeUpdated(creationFeeWei, _feeWei);
        creationFeeWei = _feeWei;
    }

    function setOnePerWallet(bool _enabled) external onlyOwner {
        onePerWallet = _enabled;
    }

    function setMultiCoinAllowed(address wallet, bool allowed) external onlyOwner {
        multiCoinAllowed[wallet] = allowed;
        emit MultiCoinWhitelisted(wallet, allowed);
    }

    function verifyCoin(address coinAddress, bool _verified) external onlyOwner {
        if (!isCreatorCoin[coinAddress]) revert NotACreatorCoin(coinAddress);
        allCoins[coinToIndex[coinAddress]].verified = _verified;
        emit CoinVerified(coinAddress, _verified);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View Functions ───────────────────────────────────────────────────────
    function totalCoins() external view returns (uint256) {
        return allCoins.length;
    }

    function getCoins(uint256 offset, uint256 limit) external view returns (CoinRecord[] memory) {
        uint256 end   = offset + limit > allCoins.length ? allCoins.length : offset + limit;
        uint256 count = end - offset;
        CoinRecord[] memory result = new CoinRecord[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allCoins[offset + i];
        }
        return result;
    }

    function getCoinsByCategory(string calldata category)
        external view returns (uint256[] memory)
    {
        return coinsByCategory[category];
    }

    function getCoinForCreator(address creatorWallet)
        external view returns (address)
    {
        return creatorToCoin[creatorWallet];
    }

    function factoryStats() external view returns (
        uint256 coinsDeployed,
        uint256 feesCollectedWei,
        uint256 currentFeeWei
    ) {
        return (totalCoinsDeployed, totalFeesCollectedWei, creationFeeWei);
    }
}

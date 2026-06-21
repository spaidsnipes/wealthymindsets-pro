// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ███████████████████████████████████████████████████████████████
 *
 *   WealthyMindsets Pro — Creator Coin Template
 *   ─────────────────────────────────────────────
 *   Deployed by: CreatorCoinFactory (one per creator)
 *
 *   How it works:
 *    • Any creator, artist, brand, or business deploys their own
 *      ERC-20 coin via the factory.
 *    • Every transfer automatically deducts a small fee (default 3%)
 *      and sends it to the WM$ ecosystem (treasury or buyback contract).
 *    • The fee creates constant buy pressure on the WM$ main token.
 *    • Creator can customize: name, symbol, supply, fee (2–5%)
 *    • Creator can mint more of THEIR coin (not WM$)
 *    • Creator cannot mint WM$ — only the WM$ owner can do that
 *
 *   Fee Flow:
 *    transfer(to, amount) →
 *      feeAmount = amount * feeRate / 10000
 *      netAmount = amount - feeAmount
 *      feeAmount → WM$ contract (receiveFee) as ETH, OR
 *      feeAmount in creator coin → treasury in creator coin tokens
 *    (see feeInEth flag — ETH fees require the coin to have ETH liquidity)
 *
 * ███████████████████████████████████████████████████████████████
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IWealthyMindset {
    function receiveFee(address creatorCoin) external payable;
    function treasury() external view returns (address);
}

contract CreatorCoin is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {

    // ─── Ecosystem Link ───────────────────────────────────────────────────────
    address public immutable wmsContract;    // WM$ main token contract
    address public immutable factory;        // factory that deployed this
    address public immutable creator;        // original creator wallet

    // ─── Fee Configuration ────────────────────────────────────────────────────
    // feeRate is in basis points: 200 = 2%, 300 = 3%, 500 = 5%
    // MIN: 200 (2%) | MAX: 500 (5%) — enforced at deployment and updates
    uint16  public feeRate;           // basis points, default 300 (3%)
    uint16  public constant FEE_MIN  = 200;  // 2%
    uint16  public constant FEE_MAX  = 500;  // 5%

    // Fees collected as creator coin tokens (sent to WM$ treasury wallet)
    uint256 public totalFeesCollected;  // lifetime fees in creator coin units
    uint256 public totalTransfers;      // lifetime transfer count

    // ─── Creator Coin Metadata ────────────────────────────────────────────────
    string  public creatorName;    // e.g. "DJ Khaled"
    string  public category;       // e.g. "Music", "Art", "Business", "Brand"
    string  public metadataUri;    // IPFS URI for logo, description, links
    uint256 public immutable deployedAt;

    // ─── Max Supply (optional) ───────────────────────────────────────────────
    uint256 public maxSupply;  // 0 = uncapped

    // ─── Events ───────────────────────────────────────────────────────────────
    event FeeCollected(address indexed from, address indexed to, uint256 feeAmount);
    event FeeRateUpdated(uint16 oldRate, uint16 newRate);
    event MetadataUpdated(string uri);
    event CreatorMinted(address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error FeeRateOutOfBounds(uint16 min, uint16 max);
    error MaxSupplyExceeded();
    error ZeroAddress();
    error ZeroAmount();

    // ─── Constructor (called by factory) ──────────────────────────────────────
    constructor(
        string  memory _name,
        string  memory _symbol,
        uint256 _initialSupply,
        uint256 _maxSupply,
        uint16  _feeRate,
        string  memory _creatorName,
        string  memory _category,
        string  memory _metadataUri,
        address _creator,
        address _wmsContract,
        address _factory
    )
        ERC20(_name, _symbol)
        Ownable(_creator)
    {
        if (_creator == address(0) || _wmsContract == address(0)) revert ZeroAddress();
        if (_feeRate < FEE_MIN || _feeRate > FEE_MAX) revert FeeRateOutOfBounds(FEE_MIN, FEE_MAX);
        if (_maxSupply != 0 && _initialSupply > _maxSupply) revert MaxSupplyExceeded();

        wmsContract  = _wmsContract;
        factory      = _factory;
        creator      = _creator;
        feeRate      = _feeRate;
        creatorName  = _creatorName;
        category     = _category;
        metadataUri  = _metadataUri;
        maxSupply    = _maxSupply;
        deployedAt   = block.timestamp;

        _mint(_creator, _initialSupply);
    }

    // ─── Transfer Override (where the magic happens) ──────────────────────────
    /**
     * @dev Every transfer automatically:
     *   1. Calculates the fee (feeRate basis points of the amount)
     *   2. Sends the fee to the WM$ treasury (in Creator Coin tokens)
     *   3. Sends the net amount to the recipient
     *
     *   WHY tokens not ETH?
     *   Sending creator coin tokens to the treasury is simpler and gas-efficient.
     *   The treasury periodically converts accumulated creator coins to USDC/ETH,
     *   then buys WM$ from the DEX — creating the buy pressure.
     *
     *   Fee-exempt: creator, factory, and wmsContract are exempt from fees
     *   (prevents double-taxation on protocol-internal transfers).
     */
    function _update(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        // Fee-exempt addresses (minting is from==address(0), burning is to==address(0))
        bool exempt = (
            from == address(0) ||       // minting
            to   == address(0) ||       // burning
            from == creator    ||       // creator's direct transfers
            from == factory    ||       // factory operations
            from == wmsContract ||      // wms operations
            to   == wmsContract         // paying fees to wms
        );

        if (!exempt && feeRate > 0) {
            uint256 fee    = (amount * feeRate) / 10_000;
            uint256 netAmt = amount - fee;

            // Get WM$ treasury address and send fee there
            address wmsTreasury = IWealthyMindset(wmsContract).treasury();
            if (wmsTreasury != address(0) && fee > 0) {
                super._update(from, wmsTreasury, fee); // fee → WM$ treasury
                totalFeesCollected += fee;
                emit FeeCollected(from, to, fee);
            }
            super._update(from, to, netAmt); // net amount → recipient
        } else {
            super._update(from, to, amount);
        }

        totalTransfers++;
    }

    // ─── Creator Minting ──────────────────────────────────────────────────────
    /**
     * @dev Creator can mint more of THEIR OWN coin only.
     *      Cannot mint WM$. Cannot exceed maxSupply if set.
     */
    function mint(address to, uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (maxSupply != 0 && totalSupply() + amount > maxSupply) revert MaxSupplyExceeded();
        _mint(to, amount);
        emit CreatorMinted(to, amount);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setFeeRate(uint16 _feeRate) external onlyOwner {
        if (_feeRate < FEE_MIN || _feeRate > FEE_MAX) revert FeeRateOutOfBounds(FEE_MIN, FEE_MAX);
        emit FeeRateUpdated(feeRate, _feeRate);
        feeRate = _feeRate;
    }

    function setMetadataUri(string calldata _uri) external onlyOwner {
        metadataUri = _uri;
        emit MetadataUpdated(_uri);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View Helpers ─────────────────────────────────────────────────────────
    function coinInfo() external view returns (
        string memory name_,
        string memory symbol_,
        string memory creatorName_,
        string memory category_,
        uint256 totalSupply_,
        uint256 maxSupply_,
        uint16  feeRate_,
        uint256 totalFees_,
        uint256 transfers_,
        uint256 deployedAt_
    ) {
        return (
            name(), symbol(), creatorName, category,
            totalSupply(), maxSupply, feeRate,
            totalFeesCollected, totalTransfers, deployedAt
        );
    }
}

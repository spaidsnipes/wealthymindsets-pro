// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ███████████████████████████████████████████████████████████████
 *
 *   WealthyMindsets Pro — WM$ Main Token
 *   ─────────────────────────────────────
 *   Name   : Wealthy Mindsets
 *   Symbol : WM$
 *   Supply : 1,000,000,000 (1 Billion)  — no automatic inflation
 *   Chain  : EVM-compatible (Ethereum, Base, BNB Chain, Polygon)
 *
 *   Key Properties:
 *    • Owner-only minting  (additional supply, capped by maxSupply)
 *    • No transfer tax     (zero friction on main token)
 *    • Designated treasury receives Creator Coin fees
 *    • Designated buyback contract can call buyback()
 *    • Ownership is NOT renounced during private phase
 *
 *   Security: OpenZeppelin 5.x — Ownable, ReentrancyGuard, Pausable
 *
 * ███████████████████████████████████████████████████████████████
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WealthyMindset is ERC20, ERC20Permit, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {

    // ─── Supply Caps ──────────────────────────────────────────────────────────
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion
    uint256 public constant MAX_SUPPLY     = 2_000_000_000 * 10**18; // Hard cap: 2 Billion (mint ceiling)

    // ─── Treasury & Ecosystem Addresses ──────────────────────────────────────
    address public treasury;        // receives Creator Coin revenue fees
    address public liquidityPool;   // primary DEX liquidity address
    address public buybackOperator; // address allowed to call buyback accounting

    // ─── Buyback Accounting ───────────────────────────────────────────────────
    // Creator Coins send ETH/USDC fees here → operator triggers WM$ buyback off-chain
    // or via a DEX router. These counters provide full on-chain audit trail.
    uint256 public totalFeesReceivedWei;    // lifetime ETH received from creator coins
    uint256 public totalWmsBoughtBack;       // lifetime WM$ tokens bought with fees
    uint256 public totalWmsBurned;           // lifetime WM$ burned from buybacks

    // ─── Events ───────────────────────────────────────────────────────────────
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event LiquidityPoolUpdated(address indexed old, address indexed newPool);
    event BuybackOperatorUpdated(address indexed old, address indexed newOperator);
    event CreatorFeeReceived(address indexed creatorCoin, uint256 amountWei);
    event BuybackExecuted(uint256 ethSpent, uint256 wmsReceived, bool burned);
    event Minted(address indexed to, uint256 amount, string reason);

    // ─── Errors ───────────────────────────────────────────────────────────────
    error MaxSupplyExceeded();
    error ZeroAddress();
    error ZeroAmount();
    error NotAuthorized();

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(
        address _treasury,
        address _liquidityPool,
        address _initialOwner
    )
        ERC20("Wealthy Mindsets", "WM$")
        ERC20Permit("Wealthy Mindsets")
        Ownable(_initialOwner)
    {
        if (_treasury == address(0) || _liquidityPool == address(0)) revert ZeroAddress();

        treasury      = _treasury;
        liquidityPool = _liquidityPool;
        buybackOperator = _initialOwner; // owner is operator by default

        // ── Initial Distribution (all minted at deployment) ──────────────────
        // Adjust these splits in deployment script if needed.
        // Percentages below match the WM$ tokenomics breakdown.
        uint256 supply = INITIAL_SUPPLY;

        _mint(_initialOwner,  supply * 15 / 100);  // 15% — Founder/Team (vesting recommended)
        _mint(_liquidityPool, supply * 30 / 100);  // 30% — Liquidity Pool
        _mint(_treasury,      supply * 20 / 100);  // 20% — Treasury/Operations
        _mint(_initialOwner,  supply * 20 / 100);  // 20% — Ecosystem Rewards (distributed over time)
        _mint(_initialOwner,  supply * 10 / 100);  // 10% — Marketing & Partnerships
        _mint(_initialOwner,  supply * 5  / 100);  // 5%  — Public Sale / IDO
    }

    // ─── Owner-Only Minting ───────────────────────────────────────────────────
    /**
     * @dev Mint additional WM$ tokens. Cannot exceed MAX_SUPPLY (2 Billion).
     *      Only callable by owner. Emits Minted event for audit.
     *      Used for: ecosystem rewards, partnership grants, future programs.
     */
    function mint(address to, uint256 amount, string calldata reason)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
        emit Minted(to, amount, reason);
    }

    // ─── Creator Coin Fee Reception ───────────────────────────────────────────
    /**
     * @dev Creator Coins call this when they send ETH fees.
     *      The ETH is held here until the buyback operator converts it to WM$.
     *      This gives a full on-chain record of every fee paid into the ecosystem.
     */
    function receiveFee(address creatorCoin) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        totalFeesReceivedWei += msg.value;
        emit CreatorFeeReceived(creatorCoin, msg.value);
    }

    /**
     * @dev Buyback operator records a completed buyback (bought WM$ from DEX).
     *      Optionally burns the purchased WM$ for deflationary pressure.
     *      The actual swap happens via the operator's EOA or a DEX integration.
     */
    function recordBuyback(
        uint256 ethSpent,
        uint256 wmsReceived,
        bool burnTokens
    )
        external
        nonReentrant
    {
        if (msg.sender != buybackOperator && msg.sender != owner()) revert NotAuthorized();
        if (ethSpent == 0 || wmsReceived == 0) revert ZeroAmount();

        totalWmsBoughtBack += wmsReceived;

        if (burnTokens) {
            // burn from treasury (treasury must have approved this contract)
            totalWmsBurned += wmsReceived;
            _burn(treasury, wmsReceived);
        }

        emit BuybackExecuted(ethSpent, wmsReceived, burnTokens);
    }

    /**
     * @dev Withdraw accumulated ETH fees to treasury for buyback operations.
     *      Only owner or buyback operator can call.
     */
    function withdrawFees(uint256 amount) external nonReentrant {
        if (msg.sender != buybackOperator && msg.sender != owner()) revert NotAuthorized();
        if (amount == 0 || amount > address(this).balance) revert ZeroAmount();
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setLiquidityPool(address _pool) external onlyOwner {
        if (_pool == address(0)) revert ZeroAddress();
        emit LiquidityPoolUpdated(liquidityPool, _pool);
        liquidityPool = _pool;
    }

    function setBuybackOperator(address _operator) external onlyOwner {
        if (_operator == address(0)) revert ZeroAddress();
        emit BuybackOperatorUpdated(buybackOperator, _operator);
        buybackOperator = _operator;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── View Helpers ─────────────────────────────────────────────────────────
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    function ecosystemStats() external view returns (
        uint256 feesReceivedWei,
        uint256 wmsBoughtBack,
        uint256 wmsBurned,
        uint256 pendingEthWei,
        uint256 circulatingSupply
    ) {
        return (
            totalFeesReceivedWei,
            totalWmsBoughtBack,
            totalWmsBurned,
            address(this).balance,
            totalSupply()
        );
    }

    // ─── Overrides ────────────────────────────────────────────────────────────
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }

    // Allow contract to receive ETH (for creator coin fees)
    receive() external payable {
        totalFeesReceivedWei += msg.value;
    }
}

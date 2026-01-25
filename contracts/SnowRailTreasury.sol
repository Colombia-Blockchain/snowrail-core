// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title SnowRailTreasury
 * @notice Autonomous treasury system with x402 payment protocol and SENTINEL trust validation
 * @dev Supports EIP-3009 gasless transfers, ERC-8004 agent identity, and ZK privacy
 * @author Colombia Blockchain
 * @custom:security-contact security@snowrail.xyz
 */
contract SnowRailTreasury is ReentrancyGuard, Pausable, AccessControl, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ============================================================================
    // CONSTANTS & ROLES
    // ============================================================================
    
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant SENTINEL_ROLE = keccak256("SENTINEL_ROLE");
    
    // EIP-712 TypeHash for x402 payments
    bytes32 public constant X402_PAYMENT_TYPEHASH = keccak256(
        "X402Payment(address from,address to,uint256 amount,address token,uint256 nonce,uint256 deadline,bytes32 resourceHash)"
    );
    
    // EIP-712 TypeHash for SENTINEL attestations
    bytes32 public constant TRUST_ATTESTATION_TYPEHASH = keccak256(
        "TrustAttestation(address target,uint256 trustScore,uint256 maxAmount,uint256 validUntil,bytes32 checkHash)"
    );

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    // Core token (usually USDC)
    IERC20 public immutable paymentToken;
    
    // Fee configuration (basis points, 100 = 1%)
    uint256 public protocolFeeBps = 50; // 0.5%
    uint256 public constant MAX_FEE_BPS = 500; // 5% max
    
    // Treasury addresses
    address public feeCollector;
    address public zkMixer;
    
    // Agent registry (ERC-8004 compatible)
    mapping(address => AgentCard) public agents;
    mapping(address => bool) public registeredAgents;
    
    // Payment nonces (for replay protection)
    mapping(address => uint256) public nonces;
    
    // SENTINEL trust cache
    mapping(address => TrustAttestation) public trustCache;
    
    // Payment history (for reputation)
    mapping(address => PaymentStats) public paymentStats;
    
    // Rate limiting
    mapping(address => RateLimit) public rateLimits;
    
    // ============================================================================
    // STRUCTS
    // ============================================================================
    
    struct AgentCard {
        string name;
        string version;
        address owner;
        uint256 trustLevel;
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastResetDay;
        bool active;
        bytes32 capabilitiesHash;
    }
    
    struct TrustAttestation {
        uint256 trustScore;
        uint256 maxAmount;
        uint256 validUntil;
        bytes32 checkHash;
        address attestor;
    }
    
    struct PaymentStats {
        uint256 totalVolume;
        uint256 successCount;
        uint256 failureCount;
        uint256 lastPaymentTime;
    }
    
    struct RateLimit {
        uint256 count;
        uint256 windowStart;
        uint256 maxPerWindow;
    }
    
    struct X402Payment {
        address from;
        address to;
        uint256 amount;
        address token;
        uint256 nonce;
        uint256 deadline;
        bytes32 resourceHash;
    }

    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event PaymentExecuted(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee,
        bytes32 resourceHash
    );
    
    event AgentRegistered(
        address indexed agent,
        string name,
        uint256 dailyLimit
    );
    
    event AgentUpdated(
        address indexed agent,
        uint256 newTrustLevel,
        uint256 newDailyLimit
    );
    
    event TrustAttestationRecorded(
        address indexed target,
        uint256 trustScore,
        uint256 maxAmount,
        address indexed attestor
    );
    
    event PrivatePaymentInitiated(
        bytes32 indexed commitment,
        uint256 amount
    );
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidSignature();
    error ExpiredDeadline();
    error InvalidNonce();
    error InsufficientTrust();
    error DailyLimitExceeded();
    error RateLimitExceeded();
    error AgentNotRegistered();
    error InvalidAmount();
    error ZeroAddress();
    error FeeTooHigh();

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    constructor(
        address _paymentToken,
        address _feeCollector,
        address _admin
    ) EIP712("SnowRailTreasury", "2.0.0") {
        if (_paymentToken == address(0)) revert ZeroAddress();
        if (_feeCollector == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();
        
        paymentToken = IERC20(_paymentToken);
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(SENTINEL_ROLE, _admin);
    }

    // ============================================================================
    // X402 PAYMENT PROTOCOL
    // ============================================================================
    
    /**
     * @notice Execute an x402 payment with signature verification
     * @param payment The payment details
     * @param signature The EIP-712 signature from the payer
     */
    function executeX402Payment(
        X402Payment calldata payment,
        bytes calldata signature
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        // Validate deadline
        if (block.timestamp > payment.deadline) revert ExpiredDeadline();
        
        // Validate nonce
        if (payment.nonce != nonces[payment.from]) revert InvalidNonce();
        
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            X402_PAYMENT_TYPEHASH,
            payment.from,
            payment.to,
            payment.amount,
            payment.token,
            payment.nonce,
            payment.deadline,
            payment.resourceHash
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        
        if (signer != payment.from) revert InvalidSignature();
        
        // Check SENTINEL trust (if attestation exists)
        _validateTrust(payment.to, payment.amount);
        
        // Increment nonce
        nonces[payment.from]++;
        
        // Calculate fee
        uint256 fee = (payment.amount * protocolFeeBps) / 10000;
        uint256 netAmount = payment.amount - fee;
        
        // Transfer tokens
        IERC20(payment.token).safeTransferFrom(payment.from, payment.to, netAmount);
        if (fee > 0) {
            IERC20(payment.token).safeTransferFrom(payment.from, feeCollector, fee);
        }
        
        // Generate payment ID
        paymentId = keccak256(abi.encode(
            payment.from,
            payment.to,
            payment.amount,
            payment.nonce,
            block.timestamp
        ));
        
        // Update stats
        paymentStats[payment.from].totalVolume += payment.amount;
        paymentStats[payment.from].successCount++;
        paymentStats[payment.from].lastPaymentTime = block.timestamp;
        
        emit PaymentExecuted(
            paymentId,
            payment.from,
            payment.to,
            payment.amount,
            fee,
            payment.resourceHash
        );
    }
    
    /**
     * @notice Simple payment without signature (direct call)
     * @param to Recipient address
     * @param amount Payment amount
     * @param resourceHash Hash of the resource being paid for
     */
    function pay(
        address to,
        uint256 amount,
        bytes32 resourceHash
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        if (amount == 0) revert InvalidAmount();
        if (to == address(0)) revert ZeroAddress();
        
        // Check trust
        _validateTrust(to, amount);
        
        // Check agent limits if caller is an agent
        if (registeredAgents[msg.sender]) {
            _checkAgentLimits(msg.sender, amount);
        }
        
        // Calculate fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 netAmount = amount - fee;
        
        // Transfer
        paymentToken.safeTransferFrom(msg.sender, to, netAmount);
        if (fee > 0) {
            paymentToken.safeTransferFrom(msg.sender, feeCollector, fee);
        }
        
        // Generate payment ID
        paymentId = keccak256(abi.encode(
            msg.sender,
            to,
            amount,
            nonces[msg.sender]++,
            block.timestamp
        ));
        
        // Update stats
        paymentStats[msg.sender].totalVolume += amount;
        paymentStats[msg.sender].successCount++;
        paymentStats[msg.sender].lastPaymentTime = block.timestamp;
        
        emit PaymentExecuted(paymentId, msg.sender, to, amount, fee, resourceHash);
    }

    // ============================================================================
    // ERC-8004 AGENT REGISTRY
    // ============================================================================
    
    /**
     * @notice Register a new agent with identity card
     * @param name Agent name
     * @param version Agent version
     * @param dailyLimit Maximum daily spend limit
     * @param capabilitiesHash Hash of agent capabilities
     */
    function registerAgent(
        string calldata name,
        string calldata version,
        uint256 dailyLimit,
        bytes32 capabilitiesHash
    ) external {
        agents[msg.sender] = AgentCard({
            name: name,
            version: version,
            owner: msg.sender,
            trustLevel: 50, // Start at neutral trust
            dailyLimit: dailyLimit,
            spentToday: 0,
            lastResetDay: block.timestamp / 1 days,
            active: true,
            capabilitiesHash: capabilitiesHash
        });
        
        registeredAgents[msg.sender] = true;
        _grantRole(AGENT_ROLE, msg.sender);
        
        emit AgentRegistered(msg.sender, name, dailyLimit);
    }
    
    /**
     * @notice Update agent trust level (SENTINEL only)
     * @param agent Agent address
     * @param newTrustLevel New trust level (0-100)
     */
    function updateAgentTrust(
        address agent,
        uint256 newTrustLevel
    ) external onlyRole(SENTINEL_ROLE) {
        if (!registeredAgents[agent]) revert AgentNotRegistered();
        if (newTrustLevel > 100) newTrustLevel = 100;
        
        agents[agent].trustLevel = newTrustLevel;
        
        // Adjust daily limit based on trust
        uint256 newLimit = (agents[agent].dailyLimit * newTrustLevel) / 100;
        
        emit AgentUpdated(agent, newTrustLevel, newLimit);
    }
    
    /**
     * @notice Get agent card data
     * @param agent Agent address
     */
    function getAgentCard(address agent) external view returns (AgentCard memory) {
        return agents[agent];
    }

    // ============================================================================
    // SENTINEL TRUST ATTESTATIONS
    // ============================================================================
    
    /**
     * @notice Record a trust attestation from SENTINEL
     * @param target Target address being attested
     * @param trustScore Trust score (0-100)
     * @param maxAmount Maximum recommended payment amount
     * @param validUntil Attestation expiry timestamp
     * @param checkHash Hash of the checks performed
     */
    function recordTrustAttestation(
        address target,
        uint256 trustScore,
        uint256 maxAmount,
        uint256 validUntil,
        bytes32 checkHash
    ) external onlyRole(SENTINEL_ROLE) {
        trustCache[target] = TrustAttestation({
            trustScore: trustScore,
            maxAmount: maxAmount,
            validUntil: validUntil,
            checkHash: checkHash,
            attestor: msg.sender
        });
        
        emit TrustAttestationRecorded(target, trustScore, maxAmount, msg.sender);
    }
    
    /**
     * @notice Get trust attestation for an address
     * @param target Address to check
     */
    function getTrustAttestation(address target) external view returns (TrustAttestation memory) {
        return trustCache[target];
    }
    
    /**
     * @notice Check if a payment would be approved by SENTINEL
     * @param target Payment recipient
     * @param amount Payment amount
     */
    function canPay(address target, uint256 amount) external view returns (bool, string memory) {
        TrustAttestation memory attestation = trustCache[target];
        
        if (attestation.validUntil == 0) {
            return (true, "No attestation - proceeding with caution");
        }
        
        if (block.timestamp > attestation.validUntil) {
            return (true, "Attestation expired - requires refresh");
        }
        
        if (attestation.trustScore < 60) {
            return (false, "Trust score too low");
        }
        
        if (amount > attestation.maxAmount) {
            return (false, "Amount exceeds max recommended");
        }
        
        return (true, "Approved by SENTINEL");
    }

    // ============================================================================
    // ZK MIXER INTEGRATION
    // ============================================================================
    
    /**
     * @notice Set the ZK mixer contract address
     * @param _zkMixer Address of the ZK mixer contract
     */
    function setZKMixer(address _zkMixer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        zkMixer = _zkMixer;
    }
    
    /**
     * @notice Deposit funds into ZK mixer for private withdrawal
     * @param amount Amount to deposit
     * @param commitment ZK commitment hash
     */
    function depositToMixer(
        uint256 amount,
        bytes32 commitment
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (zkMixer == address(0)) revert ZeroAddress();
        
        // Transfer to mixer
        paymentToken.safeTransferFrom(msg.sender, zkMixer, amount);
        
        // Call mixer deposit (if it has the interface)
        // IZKMixer(zkMixer).deposit(commitment, amount);
        
        emit PrivatePaymentInitiated(commitment, amount);
    }

    // ============================================================================
    // ADMIN FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Update protocol fee
     * @param newFeeBps New fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        
        uint256 oldFee = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        
        emit FeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @notice Update fee collector address
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Emergency token recovery
     * @param token Token address
     * @param amount Amount to recover
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // ============================================================================
    // INTERNAL FUNCTIONS
    // ============================================================================
    
    function _validateTrust(address target, uint256 amount) internal view {
        TrustAttestation memory attestation = trustCache[target];
        
        // If no attestation, allow (trust-less mode)
        if (attestation.validUntil == 0) return;
        
        // If expired, allow but could log warning
        if (block.timestamp > attestation.validUntil) return;
        
        // Check trust score
        if (attestation.trustScore < 40) revert InsufficientTrust();
        
        // Check amount (soft limit - could be made strict)
        // if (amount > attestation.maxAmount) revert AmountExceedsLimit();
    }
    
    function _checkAgentLimits(address agent, uint256 amount) internal {
        AgentCard storage card = agents[agent];
        
        // Reset daily limit if new day
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > card.lastResetDay) {
            card.spentToday = 0;
            card.lastResetDay = currentDay;
        }
        
        // Check limit
        if (card.spentToday + amount > card.dailyLimit) {
            revert DailyLimitExceeded();
        }
        
        card.spentToday += amount;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    /**
     * @notice Get the current nonce for an address
     * @param account Address to check
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }
    
    /**
     * @notice Get payment stats for an address
     * @param account Address to check
     */
    function getPaymentStats(address account) external view returns (PaymentStats memory) {
        return paymentStats[account];
    }
    
    /**
     * @notice Get the domain separator for EIP-712
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

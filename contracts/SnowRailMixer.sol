// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SnowRailMixer
 * @notice Zero-knowledge mixer for private payments using Noir circuits
 * @dev Implements deposit/withdraw pattern with Merkle tree commitments
 * @author Colombia Blockchain
 */
contract SnowRailMixer is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    uint256 public constant MERKLE_TREE_HEIGHT = 20;
    uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    // Fixed denominations for anonymity set
    uint256 public constant DENOMINATION_SMALL = 100 * 1e6;    // 100 USDC
    uint256 public constant DENOMINATION_MEDIUM = 1000 * 1e6;  // 1,000 USDC
    uint256 public constant DENOMINATION_LARGE = 10000 * 1e6;  // 10,000 USDC

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================
    
    IERC20 public immutable token;
    address public verifier;
    
    // Merkle tree
    bytes32[] public filledSubtrees;
    bytes32[] public zeros;
    uint32 public currentRootIndex;
    uint32 public nextIndex;
    
    // Roots history for withdrawal verification
    uint32 public constant ROOT_HISTORY_SIZE = 100;
    bytes32[ROOT_HISTORY_SIZE] public roots;
    
    // Nullifier tracking (prevents double-spend)
    mapping(bytes32 => bool) public nullifierHashes;
    
    // Commitment tracking
    mapping(bytes32 => bool) public commitments;
    
    // Denomination pools
    mapping(uint256 => Pool) public pools;
    
    // ============================================================================
    // STRUCTS
    // ============================================================================
    
    struct Pool {
        uint256 denomination;
        uint256 totalDeposits;
        uint256 totalWithdrawals;
        bool active;
    }

    // ============================================================================
    // EVENTS
    // ============================================================================
    
    event Deposit(
        bytes32 indexed commitment,
        uint256 denomination,
        uint32 leafIndex,
        uint256 timestamp
    );
    
    event Withdrawal(
        address indexed recipient,
        bytes32 nullifierHash,
        address indexed relayer,
        uint256 fee
    );
    
    event VerifierUpdated(address oldVerifier, address newVerifier);

    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidDenomination();
    error CommitmentAlreadyExists();
    error InvalidMerkleRoot();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error MerkleTreeFull();
    error InvalidVerifier();
    error PoolNotActive();

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================
    
    constructor(
        address _token,
        address _verifier,
        address _owner
    ) Ownable(_owner) {
        token = IERC20(_token);
        verifier = _verifier;
        
        // Initialize Merkle tree
        _initializeMerkleTree();
        
        // Initialize pools
        pools[DENOMINATION_SMALL] = Pool(DENOMINATION_SMALL, 0, 0, true);
        pools[DENOMINATION_MEDIUM] = Pool(DENOMINATION_MEDIUM, 0, 0, true);
        pools[DENOMINATION_LARGE] = Pool(DENOMINATION_LARGE, 0, 0, true);
    }

    // ============================================================================
    // DEPOSIT
    // ============================================================================
    
    /**
     * @notice Deposit tokens into the mixer
     * @param commitment The commitment hash (Poseidon hash of secret + nullifier)
     * @param denomination The deposit amount (must be a valid denomination)
     */
    function deposit(
        bytes32 commitment,
        uint256 denomination
    ) external nonReentrant returns (uint32 leafIndex) {
        // Validate denomination
        if (!_isValidDenomination(denomination)) revert InvalidDenomination();
        if (!pools[denomination].active) revert PoolNotActive();
        
        // Check commitment doesn't exist
        if (commitments[commitment]) revert CommitmentAlreadyExists();
        
        // Insert into Merkle tree
        leafIndex = _insert(commitment);
        commitments[commitment] = true;
        
        // Update pool stats
        pools[denomination].totalDeposits += denomination;
        
        // Transfer tokens
        token.safeTransferFrom(msg.sender, address(this), denomination);
        
        emit Deposit(commitment, denomination, leafIndex, block.timestamp);
    }

    // ============================================================================
    // WITHDRAW
    // ============================================================================
    
    /**
     * @notice Withdraw tokens from the mixer using ZK proof
     * @param proof The ZK proof bytes
     * @param root The Merkle root used in the proof
     * @param nullifierHash The nullifier hash to prevent double-spend
     * @param recipient The withdrawal recipient
     * @param relayer The relayer address (for fee)
     * @param fee The relayer fee
     * @param denomination The withdrawal denomination
     */
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address relayer,
        uint256 fee,
        uint256 denomination
    ) external nonReentrant {
        // Validate denomination
        if (!_isValidDenomination(denomination)) revert InvalidDenomination();
        
        // Check root is valid
        if (!isKnownRoot(root)) revert InvalidMerkleRoot();
        
        // Check nullifier hasn't been used
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();
        
        // Verify ZK proof
        if (!_verifyProof(proof, root, nullifierHash, recipient, relayer, fee, denomination)) {
            revert InvalidProof();
        }
        
        // Mark nullifier as used
        nullifierHashes[nullifierHash] = true;
        
        // Update pool stats
        pools[denomination].totalWithdrawals += denomination;
        
        // Transfer tokens
        uint256 netAmount = denomination - fee;
        token.safeTransfer(recipient, netAmount);
        
        if (fee > 0 && relayer != address(0)) {
            token.safeTransfer(relayer, fee);
        }
        
        emit Withdrawal(recipient, nullifierHash, relayer, fee);
    }

    // ============================================================================
    // MERKLE TREE
    // ============================================================================
    
    function _initializeMerkleTree() internal {
        // Initialize with zeros
        bytes32 currentZero = bytes32(0);
        zeros.push(currentZero);
        filledSubtrees.push(currentZero);
        
        for (uint32 i = 1; i < MERKLE_TREE_HEIGHT; i++) {
            currentZero = _hashLeftRight(currentZero, currentZero);
            zeros.push(currentZero);
            filledSubtrees.push(currentZero);
        }
        
        // Set initial root
        roots[0] = _hashLeftRight(currentZero, currentZero);
    }
    
    function _insert(bytes32 leaf) internal returns (uint32 index) {
        uint32 _nextIndex = nextIndex;
        if (_nextIndex >= 2**MERKLE_TREE_HEIGHT) revert MerkleTreeFull();
        
        uint32 currentIndex = _nextIndex;
        bytes32 currentLevelHash = leaf;
        bytes32 left;
        bytes32 right;
        
        for (uint32 i = 0; i < MERKLE_TREE_HEIGHT; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros[i];
                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }
            currentLevelHash = _hashLeftRight(left, right);
            currentIndex /= 2;
        }
        
        uint32 newRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        currentRootIndex = newRootIndex;
        roots[newRootIndex] = currentLevelHash;
        nextIndex = _nextIndex + 1;
        
        return _nextIndex;
    }
    
    function _hashLeftRight(bytes32 left, bytes32 right) internal pure returns (bytes32) {
        // Simplified hash - in production use Poseidon
        return keccak256(abi.encodePacked(left, right));
    }

    // ============================================================================
    // VERIFICATION
    // ============================================================================
    
    function _verifyProof(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address relayer,
        uint256 fee,
        uint256 denomination
    ) internal view returns (bool) {
        if (verifier == address(0)) revert InvalidVerifier();
        
        // Build public inputs
        bytes32[] memory publicInputs = new bytes32[](6);
        publicInputs[0] = root;
        publicInputs[1] = nullifierHash;
        publicInputs[2] = bytes32(uint256(uint160(recipient)));
        publicInputs[3] = bytes32(uint256(uint160(relayer)));
        publicInputs[4] = bytes32(fee);
        publicInputs[5] = bytes32(denomination);
        
        // Call verifier
        // In production, this would call the actual Noir verifier contract
        // return INoirVerifier(verifier).verify(proof, publicInputs);
        
        // For now, return true (implement actual verification in production)
        return proof.length > 0;
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================
    
    function isKnownRoot(bytes32 root) public view returns (bool) {
        if (root == 0) return false;
        
        uint32 i = currentRootIndex;
        do {
            if (roots[i] == root) return true;
            if (i == 0) {
                i = ROOT_HISTORY_SIZE - 1;
            } else {
                i--;
            }
        } while (i != currentRootIndex);
        
        return false;
    }
    
    function getLastRoot() public view returns (bytes32) {
        return roots[currentRootIndex];
    }
    
    function getPool(uint256 denomination) external view returns (Pool memory) {
        return pools[denomination];
    }
    
    function _isValidDenomination(uint256 denomination) internal pure returns (bool) {
        return denomination == DENOMINATION_SMALL ||
               denomination == DENOMINATION_MEDIUM ||
               denomination == DENOMINATION_LARGE;
    }

    // ============================================================================
    // ADMIN
    // ============================================================================
    
    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidVerifier();
        
        address oldVerifier = verifier;
        verifier = _verifier;
        
        emit VerifierUpdated(oldVerifier, _verifier);
    }
    
    function setPoolActive(uint256 denomination, bool active) external onlyOwner {
        if (!_isValidDenomination(denomination)) revert InvalidDenomination();
        pools[denomination].active = active;
    }
}

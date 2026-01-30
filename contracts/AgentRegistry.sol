// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant agent identity registry
 * @dev Manages AI agent identities, capabilities, and reputation on-chain
 */
contract AgentRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct Agent {
        address owner;              // Agent owner address
        string name;                // Agent display name
        string metadata;            // JSON metadata (IPFS hash or URL)
        uint256 trustScore;         // 0-100 trust score
        uint256 paymentsCount;      // Total successful payments
        uint256 totalVolume;        // Total payment volume (USDC, 6 decimals)
        uint256 maxTransaction;     // Max payment per tx
        uint256 dailyLimit;         // Daily spending limit
        bool verified;              // Verified by team
        bool active;                // Is agent active
        uint256 registeredAt;       // Registration timestamp
    }

    // agentId => Agent data
    mapping(bytes32 => Agent) public agents;

    // owner => agentIds[]
    mapping(address => bytes32[]) public ownerAgents;

    // agentId => capability => has it
    mapping(bytes32 => mapping(string => bool)) public capabilities;

    // Events
    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string name);
    event AgentVerified(bytes32 indexed agentId, address indexed verifier);
    event AgentUpdated(bytes32 indexed agentId);
    event PaymentRecorded(bytes32 indexed agentId, uint256 amount);
    event TrustScoreUpdated(bytes32 indexed agentId, uint256 newScore);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    /**
     * @notice Register a new agent
     * @param agentId Unique agent identifier (keccak256 of name + owner)
     * @param name Agent display name
     * @param metadata IPFS hash or metadata URL
     * @param maxTx Maximum transaction amount
     * @param dailyLimit Daily spending limit
     */
    function registerAgent(
        bytes32 agentId,
        string calldata name,
        string calldata metadata,
        uint256 maxTx,
        uint256 dailyLimit
    ) external {
        require(agents[agentId].owner == address(0), "Agent already registered");
        require(bytes(name).length > 0, "Name required");
        require(maxTx > 0, "Max transaction must be > 0");

        agents[agentId] = Agent({
            owner: msg.sender,
            name: name,
            metadata: metadata,
            trustScore: 50, // Start at 50/100
            paymentsCount: 0,
            totalVolume: 0,
            maxTransaction: maxTx,
            dailyLimit: dailyLimit,
            verified: false,
            active: true,
            registeredAt: block.timestamp
        });

        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, name);
    }

    /**
     * @notice Verify an agent (only VERIFIER_ROLE)
     */
    function verifyAgent(bytes32 agentId) external onlyRole(VERIFIER_ROLE) {
        require(agents[agentId].owner != address(0), "Agent not found");
        agents[agentId].verified = true;
        emit AgentVerified(agentId, msg.sender);
    }

    /**
     * @notice Add capability to agent
     */
    function addCapability(bytes32 agentId, string calldata capability) external {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        capabilities[agentId][capability] = true;
        emit AgentUpdated(agentId);
    }

    /**
     * @notice Record a payment (called by Treasury contract)
     */
    function recordPayment(bytes32 agentId, uint256 amount) external {
        require(agents[agentId].owner != address(0), "Agent not found");
        require(agents[agentId].active, "Agent not active");

        agents[agentId].paymentsCount++;
        agents[agentId].totalVolume += amount;

        // Auto-increase trust score based on activity
        if (agents[agentId].paymentsCount % 10 == 0 && agents[agentId].trustScore < 100) {
            agents[agentId].trustScore = agents[agentId].trustScore + 1;
            emit TrustScoreUpdated(agentId, agents[agentId].trustScore);
        }

        emit PaymentRecorded(agentId, amount);
    }

    /**
     * @notice Update trust score (VERIFIER_ROLE)
     */
    function updateTrustScore(bytes32 agentId, uint256 newScore)
        external
        onlyRole(VERIFIER_ROLE)
    {
        require(newScore <= 100, "Score must be 0-100");
        agents[agentId].trustScore = newScore;
        emit TrustScoreUpdated(agentId, newScore);
    }

    /**
     * @notice Get agent info
     */
    function getAgent(bytes32 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }

    /**
     * @notice Check if agent has capability
     */
    function hasCapability(bytes32 agentId, string calldata capability)
        external
        view
        returns (bool)
    {
        return capabilities[agentId][capability];
    }

    /**
     * @notice Get all agents owned by address
     */
    function getAgentsByOwner(address owner)
        external
        view
        returns (bytes32[] memory)
    {
        return ownerAgents[owner];
    }

    /**
     * @notice Generate agent ID from name and owner
     */
    function generateAgentId(string calldata name, address owner)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(name, owner));
    }
}

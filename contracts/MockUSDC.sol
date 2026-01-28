// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC with EIP-3009 transferWithAuthorization support
 * @dev Implements the full USDC interface including gasless transfers
 */
contract MockUSDC is ERC20, EIP712 {
    using ECDSA for bytes32;

    uint8 private constant DECIMALS = 6;

    // EIP-3009: Transfer With Authorization
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    // Mapping of used authorization states
    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    // Events
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor() ERC20("USD Coin", "USDC") EIP712("USD Coin", "2") {
        _mint(msg.sender, 1_000_000_000 * 10**DECIMALS); // 1B USDC
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Execute a transfer with a signed authorization
     * @param from Payer's address (Authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix time)
     * @param validBefore The time before which this is valid (unix time)
     * @param nonce Unique nonce
     * @param signature Signature of the authorization
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external {
        require(block.timestamp > validAfter, "Authorization not yet valid");
        require(block.timestamp < validBefore, "Authorization expired");
        require(!_authorizationStates[from][nonce], "Authorization already used");

        bytes32 structHash = keccak256(
            abi.encode(
                TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);

        require(signer == from, "Invalid signature");
        require(signer != address(0), "Invalid signer");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Check if an authorization has been used
     * @param authorizer Authorizer's address
     * @param nonce Nonce of the authorization
     * @return True if the nonce has been used
     */
    function authorizationState(
        address authorizer,
        bytes32 nonce
    ) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /**
     * @notice Mint tokens (for testing)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function for easy testing
     */
    function faucet() external {
        _mint(msg.sender, 10_000 * 10**DECIMALS); // 10k USDC
    }
}

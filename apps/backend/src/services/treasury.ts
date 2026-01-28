/**
 * @title TreasuryService
 * @description Service for interacting with SnowRailTreasury contract on Avalanche Fuji.
 *              Handles X402 payment execution, direct payments, and trust validation.
 *
 * @usage
 *   const treasury = new TreasuryService();
 *   await treasury.initialize();
 *   const result = await treasury.executeX402Payment(payment, signature);
 */

import { ethers } from "ethers";

// ============================================================================
// TYPES
// ============================================================================

export interface X402Payment {
  from: string;
  to: string;
  value: bigint | string;
  validAfter: number;
  validBefore: number;
  nonce: bigint | string;
  resourceHash: string;
}

export interface PaymentResult {
  success: boolean;
  txHash: string;
  explorerUrl: string;
  receipt?: ethers.TransactionReceipt;
  error?: string;
  errorCode?: string;
}

export interface TreasuryConfig {
  rpcUrl: string;
  privateKey: string;
  treasuryAddress: string;
  usdcAddress: string;
  chainId: number;
  explorerUrl: string;
}

// ============================================================================
// ABI (Minimal - only functions we need)
// ============================================================================

const TREASURY_ABI = [
  // X402 Payment
  "function executeX402Payment((address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, uint256 nonce, bytes32 resourceHash) payment, bytes signature) external returns (bool)",

  // Direct payment
  "function pay(address to, uint256 amount, bytes32 resourceHash) external returns (bool)",

  // Trust validation
  "function canPay(address target, uint256 amount) external view returns (bool)",

  // Nonce for X402
  "function nonces(address owner) external view returns (uint256)",

  // Events
  "event PaymentExecuted(address indexed from, address indexed to, uint256 amount, uint256 fee, bytes32 indexed resourceHash)",
];

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
];

// ============================================================================
// ERROR MAPPING
// ============================================================================

const ERROR_MAP: Record<string, { code: string; message: string; status: number }> = {
  InsufficientBalance: {
    code: "INSUFFICIENT_BALANCE",
    message: "Insufficient USDC balance",
    status: 400,
  },
  InsufficientAllowance: {
    code: "INSUFFICIENT_ALLOWANCE",
    message: "Treasury not approved to spend USDC",
    status: 400,
  },
  InvalidSignature: {
    code: "INVALID_SIGNATURE",
    message: "EIP-712 signature is invalid",
    status: 400,
  },
  PaymentExpired: {
    code: "PAYMENT_EXPIRED",
    message: "Payment intent has expired",
    status: 400,
  },
  TrustTooLow: {
    code: "TRUST_TOO_LOW",
    message: "Target address trust score is too low",
    status: 403,
  },
  ContractPaused: {
    code: "CONTRACT_PAUSED",
    message: "Treasury contract is paused",
    status: 503,
  },
  CALL_EXCEPTION: {
    code: "CONTRACT_ERROR",
    message: "Contract execution failed",
    status: 400,
  },
  INSUFFICIENT_FUNDS: {
    code: "INSUFFICIENT_GAS",
    message: "Insufficient AVAX for gas",
    status: 400,
  },
  NETWORK_ERROR: {
    code: "NETWORK_ERROR",
    message: "Failed to connect to Avalanche network",
    status: 503,
  },
};

// ============================================================================
// TREASURY SERVICE
// ============================================================================

export class TreasuryService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private treasury: ethers.Contract | null = null;
  private usdc: ethers.Contract | null = null;
  private config: TreasuryConfig | null = null;
  private initialized = false;

  /**
   * Initialize the service with environment variables
   */
  async initialize(): Promise<void> {
    // Validate required environment variables
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    const treasuryAddress = process.env.TREASURY_CONTRACT_ADDRESS;
    const usdcAddress = process.env.ASSET_ADDRESS;
    const chainId = parseInt(process.env.CHAIN_ID || "43113", 10);
    const explorerUrl = process.env.EXPLORER_URL || "https://testnet.snowtrace.io";

    if (!rpcUrl) throw new Error("RPC_URL is required");
    if (!privateKey) throw new Error("PRIVATE_KEY is required");
    if (!treasuryAddress) throw new Error("TREASURY_CONTRACT_ADDRESS is required");
    if (!usdcAddress) throw new Error("ASSET_ADDRESS is required");

    this.config = {
      rpcUrl,
      privateKey,
      treasuryAddress,
      usdcAddress,
      chainId,
      explorerUrl,
    };

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(rpcUrl, {
      chainId,
      name: chainId === 43113 ? "avalanche-fuji" : "avalanche",
    });

    this.wallet = new ethers.Wallet(privateKey, this.provider);

    // Initialize contracts
    this.treasury = new ethers.Contract(treasuryAddress, TREASURY_ABI, this.wallet);
    this.usdc = new ethers.Contract(usdcAddress, ERC20_ABI, this.wallet);

    // Verify connection
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainId}, got ${network.chainId}`);
    }

    this.initialized = true;
    console.log(`[Treasury] Initialized on chain ${chainId}`);
    console.log(`[Treasury] Wallet: ${this.wallet.address}`);
    console.log(`[Treasury] Contract: ${treasuryAddress}`);
  }

  /**
   * Check if service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.treasury || !this.wallet || !this.config) {
      throw new Error("TreasuryService not initialized. Call initialize() first.");
    }
  }

  /**
   * Execute an X402 gasless payment with EIP-712 signature
   */
  async executeX402Payment(payment: X402Payment, signature: string): Promise<PaymentResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    console.log(`[Treasury] Executing X402 payment...`);
    console.log(`[Treasury] From: ${payment.from}`);
    console.log(`[Treasury] To: ${payment.to}`);
    console.log(`[Treasury] Value: ${payment.value}`);

    try {
      // Convert values to proper types
      const paymentTuple = {
        from: payment.from,
        to: payment.to,
        value: BigInt(payment.value),
        validAfter: payment.validAfter,
        validBefore: payment.validBefore,
        nonce: BigInt(payment.nonce),
        resourceHash: payment.resourceHash,
      };

      // Check if payment is expired
      const now = Math.floor(Date.now() / 1000);
      if (now > payment.validBefore) {
        return this.createErrorResult("PAYMENT_EXPIRED", "Payment intent has expired");
      }

      // Estimate gas first to catch errors
      const gasEstimate = await this.treasury!.executeX402Payment.estimateGas(
        paymentTuple,
        signature
      );
      console.log(`[Treasury] Gas estimate: ${gasEstimate}`);

      // Execute transaction
      const tx = await this.treasury!.executeX402Payment(paymentTuple, signature, {
        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
      });

      console.log(`[Treasury] Tx submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      const duration = Date.now() - startTime;

      console.log(`[Treasury] Tx confirmed in ${duration}ms`);
      console.log(`[Treasury] Block: ${receipt.blockNumber}`);
      console.log(`[Treasury] Gas used: ${receipt.gasUsed}`);

      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash),
        receipt,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Execute a direct payment (requires prior USDC approval)
   */
  async pay(to: string, amount: bigint | string, resourceHash: string): Promise<PaymentResult> {
    this.ensureInitialized();

    const startTime = Date.now();
    console.log(`[Treasury] Executing direct payment...`);
    console.log(`[Treasury] To: ${to}`);
    console.log(`[Treasury] Amount: ${amount}`);

    try {
      const amountBn = BigInt(amount);

      // Check USDC balance
      const balance = await this.usdc!.balanceOf(this.wallet!.address);
      if (balance < amountBn) {
        return this.createErrorResult(
          "INSUFFICIENT_BALANCE",
          `Insufficient USDC: have ${balance}, need ${amountBn}`
        );
      }

      // Check allowance
      const allowance = await this.usdc!.allowance(this.wallet!.address, this.config!.treasuryAddress);
      if (allowance < amountBn) {
        console.log(`[Treasury] Approving USDC spend...`);
        const approveTx = await this.usdc!.approve(this.config!.treasuryAddress, amountBn);
        await approveTx.wait();
        console.log(`[Treasury] Approved`);
      }

      // Execute payment
      const tx = await this.treasury!.pay(to, amountBn, resourceHash);
      console.log(`[Treasury] Tx submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      const duration = Date.now() - startTime;

      console.log(`[Treasury] Tx confirmed in ${duration}ms`);

      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: this.getExplorerUrl(tx.hash),
        receipt,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check if a payment can proceed based on trust validation
   */
  async canPay(target: string, amount: bigint | string): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await this.treasury!.canPay(target, BigInt(amount));
    } catch (error) {
      console.error(`[Treasury] canPay error:`, error);
      return false;
    }
  }

  /**
   * Get nonce for X402 payments
   */
  async getNonce(address: string): Promise<bigint> {
    this.ensureInitialized();
    return await this.treasury!.nonces(address);
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(address: string): Promise<bigint> {
    this.ensureInitialized();
    return await this.usdc!.balanceOf(address);
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    this.ensureInitialized();
    return this.wallet!.address;
  }

  /**
   * Get explorer URL for a transaction
   */
  getExplorerUrl(txHash: string): string {
    const baseUrl = this.config?.explorerUrl || "https://testnet.snowtrace.io";
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Handle contract/network errors and map to user-friendly messages
   */
  private handleError(error: unknown): PaymentResult {
    console.error(`[Treasury] Error:`, error);

    // Extract error reason
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = "An unexpected error occurred";

    if (error instanceof Error) {
      const message = error.message;

      // Check for known error patterns
      for (const [pattern, mapped] of Object.entries(ERROR_MAP)) {
        if (message.includes(pattern)) {
          errorCode = mapped.code;
          errorMessage = mapped.message;
          break;
        }
      }

      // Extract revert reason if available
      if (message.includes("reverted with reason")) {
        const match = message.match(/reverted with reason string '(.+)'/);
        if (match) {
          errorMessage = match[1];
        }
      }

      // Handle ethers error codes
      const ethersError = error as { code?: string };
      if (ethersError.code && ERROR_MAP[ethersError.code]) {
        errorCode = ERROR_MAP[ethersError.code].code;
        errorMessage = ERROR_MAP[ethersError.code].message;
      }
    }

    return this.createErrorResult(errorCode, errorMessage);
  }

  /**
   * Create an error result
   */
  private createErrorResult(code: string, message: string): PaymentResult {
    return {
      success: false,
      txHash: "",
      explorerUrl: "",
      error: message,
      errorCode: code,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let treasuryInstance: TreasuryService | null = null;

/**
 * Get or create TreasuryService singleton
 */
export async function getTreasuryService(): Promise<TreasuryService> {
  if (!treasuryInstance) {
    treasuryInstance = new TreasuryService();
    await treasuryInstance.initialize();
  }
  return treasuryInstance;
}

export default TreasuryService;

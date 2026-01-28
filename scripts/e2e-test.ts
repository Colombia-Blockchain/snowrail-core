/**
 * SnowRail E2E Test Automation Script (Fuji)
 *
 * Executes the complete flow:
 * SENTINEL → Intent → Sign (EIP-712) → On-chain Confirm → Snowtrace
 *
 * Usage: pnpm e2e
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import chalk from 'chalk';
import Table from 'cli-table3';
import axios from 'axios';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  backend: process.env.API_URL || 'http://localhost:4000',
  rpcUrl: process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
  privateKey: process.env.PRIVATE_KEY,
  explorerUrl: process.env.EXPLORER_URL || 'https://testnet.snowtrace.io',
  chainId: 43113,

  // Test parameters
  testUrl: 'https://example.com',
  testAmount: 1, // 1 USDC
  recipientAddress: process.env.PAY_TO_ADDRESS || process.env.TREASURY_CONTRACT_ADDRESS,

  // Contract addresses
  treasuryAddress: process.env.TREASURY_CONTRACT_ADDRESS,
  usdcAddress: process.env.ASSET_ADDRESS,
};

// ============================================================================
// Validation
// ============================================================================

function validateConfig() {
  const missing = [];

  if (!CONFIG.privateKey) missing.push('PRIVATE_KEY');
  if (!CONFIG.treasuryAddress) missing.push('TREASURY_CONTRACT_ADDRESS');
  if (!CONFIG.usdcAddress) missing.push('ASSET_ADDRESS');
  if (!CONFIG.recipientAddress) missing.push('PAY_TO_ADDRESS or TREASURY_CONTRACT_ADDRESS');

  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missing.forEach(key => console.error(chalk.red(`   - ${key}`)));
    console.error(chalk.yellow('\nPlease check your .env file'));
    process.exit(1);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function printStep(step: number, title: string) {
  console.log('\n' + chalk.yellow('═'.repeat(70)));
  console.log(chalk.yellow.bold(`STEP ${step} – ${title}`));
  console.log(chalk.yellow('═'.repeat(70)));
}

function printSuccess(message: string) {
  console.log(chalk.green('✓ ') + message);
}

function printError(message: string) {
  console.log(chalk.red('✗ ') + message);
}

function printInfo(message: string) {
  console.log(chalk.cyan('ℹ ') + message);
}

function truncateHash(hash: string, length: number = 12): string {
  if (!hash) return 'N/A';
  return `${hash.slice(0, length)}...`;
}

// ============================================================================
// API Calls
// ============================================================================

async function callAPI(method: string, endpoint: string, data?: any) {
  const url = `${CONFIG.backend}${endpoint}`;

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const errData = error.response.data;
      let errorMsg = `API Error: ${error.response.status}`;

      // Show detailed error info
      if (errData.error) errorMsg += `\n  Error: ${errData.error}`;
      if (errData.errorCode) errorMsg += `\n  Code: ${errData.errorCode}`;
      if (errData.details) errorMsg += `\n  Details: ${JSON.stringify(errData.details, null, 2)}`;
      if (errData.message) errorMsg += `\n  Message: ${errData.message}`;

      throw new Error(errorMsg);
    }
    throw error;
  }
}

// ============================================================================
// STEP 1: SENTINEL Validation
// ============================================================================

async function step1_validate(url: string, amount: number) {
  printStep(1, 'SENTINEL Validation');

  printInfo(`Validating URL: ${url}`);
  printInfo(`Payment amount: ${amount} USDC`);

  const result = await callAPI('POST', '/v1/sentinel/validate', {
    url,
    amount,
  });

  // Display results
  const table = new Table({
    head: [
      chalk.cyan('Check'),
      chalk.cyan('Status'),
      chalk.cyan('Score'),
      chalk.cyan('Risk'),
    ],
    colWidths: [25, 12, 10, 15],
  });

  if (result.checks && Array.isArray(result.checks)) {
    result.checks.forEach((check: any) => {
      table.push([
        check.type || 'Unknown',
        check.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL'),
        check.score ? `${check.score}/100` : 'N/A',
        check.risk || 'unknown',
      ]);
    });
  }

  console.log(table.toString());

  // Summary
  const summaryTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    colWidths: [25, 30],
  });

  summaryTable.push(
    ['Trust Score', `${result.trustScore || 0}/100`],
    ['Risk Level', result.risk || 'unknown'],
    ['Can Pay', result.canPay ? chalk.green('YES') : chalk.red('NO')],
    ['Decision', result.decision || 'unknown']
  );

  console.log('\n' + summaryTable.toString());

  if (!result.canPay) {
    printError('SENTINEL blocked the payment - URL is not safe');
    if (result.blockedReasons) {
      console.log(chalk.red('Blocked reasons:'));
      result.blockedReasons.forEach((reason: string) => {
        console.log(chalk.red(`  - ${reason}`));
      });
    }
    process.exit(1);
  }

  printSuccess('SENTINEL validation passed');
  return result;
}

// ============================================================================
// STEP 2: Create Payment Intent
// ============================================================================

async function step2_createIntent(wallet: ethers.Wallet, url: string, amount: number) {
  printStep(2, 'Create Payment Intent');

  printInfo(`Sender: ${wallet.address}`);
  printInfo(`Recipient: ${CONFIG.recipientAddress}`);
  printInfo(`Amount: ${amount} USDC`);

  const result = await callAPI('POST', '/v1/payments/x402/intent', {
    url,
    amount,
    sender: wallet.address,
    recipient: CONFIG.recipientAddress,
    currency: 'USDC',
  });

  const intentId = result.intent?.id || result.intentId;
  const expiresAt = result.intent?.expiresAt || result.expiresAt;

  printSuccess(`Intent created: ${intentId}`);
  printInfo(`Expires at: ${new Date(expiresAt).toISOString()}`);

  return { intentId, intent: result.intent || result };
}

// ============================================================================
// STEP 3: Sign EIP-712 Authorization
// ============================================================================

async function step3_sign(wallet: ethers.Wallet, intentId: string) {
  printStep(3, 'Sign EIP-712 Authorization');

  printInfo('Fetching authorization data...');

  const result = await callAPI('POST', '/v1/payments/x402/sign', {
    intentId,
  });

  if (!result.authorization) {
    throw new Error('Invalid sign response - missing authorization');
  }

  const { authorization } = result;

  printInfo('Authorization data received');
  printInfo(`Nonce: ${truncateHash(authorization.message?.nonce || authorization.nonce || 'N/A', 16)}`);
  printInfo(`Valid After: ${new Date((authorization.message?.validAfter || authorization.validAfter || 0) * 1000).toISOString()}`);
  printInfo(`Valid Before: ${new Date((authorization.message?.validBefore || authorization.validBefore || 0) * 1000).toISOString()}`);

  // Sign with EIP-712
  printInfo('Signing with EIP-712...');

  // EIP-712 types for EIP-3009 TransferWithAuthorization
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
    ]
  };

  const signature = await wallet.signTypedData(
    authorization.domain,
    types,
    authorization.message
  );

  printSuccess(`Signature created: ${truncateHash(signature, 20)}`);

  return { signature, authorization };
}

// ============================================================================
// STEP 3.5: Approve Treasury (Required for transferFrom)
// ============================================================================

async function step3_5_approve(wallet: ethers.Wallet) {
  printStep(3.5, 'Approve Treasury for USDC');

  printInfo('Granting Treasury approval to spend USDC...');
  printInfo('This is required because Treasury uses transferFrom');

  const usdc = new ethers.Contract(
    CONFIG.usdcAddress!,
    [
      'function approve(address spender, uint256 amount) external returns (bool)',
      'function allowance(address owner, address spender) external view returns (uint256)'
    ],
    wallet
  );

  // Check current allowance
  const currentAllowance = await usdc.allowance(wallet.address, CONFIG.treasuryAddress);

  if (currentAllowance >= ethers.parseUnits(CONFIG.testAmount.toString(), 6)) {
    printSuccess(`Treasury already approved (allowance: ${ethers.formatUnits(currentAllowance, 6)} USDC)`);
    return;
  }

  // Approve max amount for future transactions
  const tx = await usdc.approve(CONFIG.treasuryAddress, ethers.MaxUint256);
  printInfo(`Approval tx submitted: ${truncateHash(tx.hash, 16)}`);

  await tx.wait();

  printSuccess('Treasury approved for unlimited USDC transfers');
}

// ============================================================================
// STEP 4: Confirm Payment (On-chain)
// ============================================================================

async function step4_confirm(intentId: string, signature: string) {
  printStep(4, 'Confirm Payment (On-chain)');

  printInfo('Executing payment on-chain...');
  printInfo('This will call the Treasury contract with the signed authorization');

  const result = await callAPI('POST', '/v1/payments/x402/confirm', {
    intentId,
    signature,
  });

  if (!result.success) {
    throw new Error('Payment confirmation failed: ' + (result.error || 'Unknown error'));
  }

  const txHash = result.txHash || result.receipt?.transactionHash;
  const blockNumber = result.receipt?.blockNumber;
  const status = result.receipt?.status;

  printSuccess('Transaction submitted!');
  printInfo(`Transaction Hash: ${txHash}`);
  printInfo(`Block Number: ${blockNumber || 'Pending'}`);
  printInfo(`Status: ${status === 1 ? chalk.green('SUCCESS') : chalk.yellow('PENDING')}`);

  return { txHash, receipt: result.receipt };
}

// ============================================================================
// STEP 5: Verify on Snowtrace
// ============================================================================

async function step5_verify(txHash: string, wallet: ethers.Wallet) {
  printStep(5, 'Verify on Snowtrace');

  const explorerUrl = `${CONFIG.explorerUrl}/tx/${txHash}`;

  printSuccess('Transaction verified!');
  printInfo(`Explorer: ${explorerUrl}`);

  // Final Summary
  const summaryTable = new Table({
    head: [chalk.cyan.bold('Summary'), chalk.cyan.bold('Value')],
    colWidths: [25, 45],
  });

  summaryTable.push(
    ['Wallet Address', wallet.address],
    ['Recipient', CONFIG.recipientAddress || 'N/A'],
    ['Amount', `${CONFIG.testAmount} USDC`],
    ['Transaction Hash', truncateHash(txHash, 20)],
    ['Network', 'Avalanche Fuji Testnet'],
    ['Chain ID', CONFIG.chainId.toString()],
    ['Snowtrace URL', explorerUrl]
  );

  console.log('\n' + summaryTable.toString());

  console.log('\n' + chalk.green('═'.repeat(70)));
  console.log(chalk.green.bold('✓ E2E TEST COMPLETED SUCCESSFULLY'));
  console.log(chalk.green('═'.repeat(70)) + '\n');

  return explorerUrl;
}

// ============================================================================
// Pre-flight Checks
// ============================================================================

async function preflightChecks() {
  printInfo('Running pre-flight checks...');

  // Check backend connectivity
  try {
    const health = await callAPI('GET', '/health');
    printSuccess(`Backend is running: ${CONFIG.backend}`);

    if (health.sentinel) {
      printInfo(`SENTINEL: ${health.sentinel.status || 'OK'}`);
    }
    if (health.treasury !== undefined) {
      printInfo(`Treasury: ${health.treasury ? 'ENABLED' : 'DISABLED'}`);
    }
  } catch (error: any) {
    printError(`Backend is not responding at ${CONFIG.backend}`);
    console.error(chalk.red('\nMake sure the backend is running:'));
    console.error(chalk.yellow('  pnpm backend:dev\n'));
    throw new Error('Backend not available');
  }

  // Check RPC connectivity
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const network = await provider.getNetwork();
    printSuccess(`RPC connected: Chain ID ${network.chainId}`);
  } catch (error) {
    printError('Failed to connect to RPC');
    throw new Error('RPC not available');
  }

  // Check wallet balance
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const wallet = new ethers.Wallet(CONFIG.privateKey!, provider);
    const balance = await provider.getBalance(wallet.address);
    const balanceInAvax = ethers.formatEther(balance);

    if (balance === 0n) {
      printError(`Wallet has no AVAX for gas fees: ${wallet.address}`);
      console.error(chalk.yellow('\nGet testnet AVAX from:'));
      console.error(chalk.yellow('  https://core.app/tools/testnet-faucet/\n'));
      throw new Error('Insufficient gas balance');
    }

    printSuccess(`Wallet has ${balanceInAvax} AVAX for gas`);
  } catch (error: any) {
    if (error.message.includes('Insufficient gas')) {
      throw error;
    }
    printError('Failed to check wallet balance');
    throw error;
  }

  printSuccess('All pre-flight checks passed!\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║           SNOWRAIL E2E TEST - AVALANCHE FUJI TESTNET             ║'));
  console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════════════╝\n'));

  try {
    // Validate configuration
    validateConfig();

    // Run pre-flight checks
    await preflightChecks();

    // Setup wallet
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const wallet = new ethers.Wallet(CONFIG.privateKey!, provider);

    printInfo(`Backend: ${CONFIG.backend}`);
    printInfo(`Wallet: ${wallet.address}`);
    printInfo(`Test URL: ${CONFIG.testUrl}`);
    printInfo(`Test Amount: ${CONFIG.testAmount} USDC`);

    // Execute E2E flow
    const validationResult = await step1_validate(CONFIG.testUrl, CONFIG.testAmount);

    const { intentId } = await step2_createIntent(
      wallet,
      CONFIG.testUrl,
      CONFIG.testAmount
    );

    const { signature } = await step3_sign(wallet, intentId);

    await step3_5_approve(wallet);

    const { txHash } = await step4_confirm(intentId, signature);

    await step5_verify(txHash, wallet);

    // Execution time
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    printInfo(`Total execution time: ${duration}s`);

  } catch (error: any) {
    console.log('\n' + chalk.red('═'.repeat(70)));
    console.log(chalk.red.bold('✗ E2E TEST FAILED'));
    console.log(chalk.red('═'.repeat(70)));

    if (error.response) {
      printError(`API Error: ${error.response.status}`);
      console.error(chalk.red(JSON.stringify(error.response.data, null, 2)));
    } else if (error.message) {
      printError(error.message);
    } else {
      printError('Unknown error occurred');
      console.error(error);
    }

    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

export { main };

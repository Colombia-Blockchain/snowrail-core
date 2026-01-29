/**
 * Complete X402 Payment Flow
 *
 * This example demonstrates the full end-to-end payment flow:
 * 1. Validate URL with SENTINEL
 * 2. Create payment intent
 * 3. Get EIP-712 authorization
 * 4. Sign with wallet
 * 5. Confirm payment on-chain
 *
 * Run: npx tsx examples/node-js/complete-flow.ts
 *
 * Prerequisites:
 * - Set PRIVATE_KEY in .env
 * - Backend running on localhost:3000
 * - Wallet has USDC and approved Treasury contract
 *
 * @requires @snowrail/sentinel ethers dotenv
 */

import { createSentinel } from '@snowrail/sentinel';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ Error: PRIVATE_KEY not set in .env file');
  process.exit(1);
}

interface PaymentParams {
  url: string;
  amount: number;
  sender: string;
  recipient: string;
}

async function completePaymentFlow(params: PaymentParams) {
  console.log('🚀 SnowRail Complete Payment Flow\n');

  // Initialize
  const sentinel = createSentinel();
  const wallet = new ethers.Wallet(PRIVATE_KEY);

  console.log('Configuration:');
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Wallet: ${wallet.address}`);
  console.log(`  Target: ${params.url}`);
  console.log(`  Amount: ${params.amount} USDC\n`);

  // ==========================================
  // STEP 1: Validate with SENTINEL
  // ==========================================
  console.log('Step 1/5: Validating URL with SENTINEL...');

  const validation = await sentinel.validate({
    url: params.url,
    amount: params.amount
  });

  console.log(`  Trust Score: ${validation.trustScore}/100`);
  console.log(`  Risk: ${validation.risk}`);
  console.log(`  Can Pay: ${validation.canPay}`);

  if (!validation.canPay) {
    console.log('\n❌ Payment BLOCKED by SENTINEL');
    console.log('Reasons:');
    validation.blockedReasons?.forEach(reason => {
      console.log(`  - ${reason}`);
    });
    process.exit(1);
  }

  console.log('  ✓ Validation passed\n');

  // ==========================================
  // STEP 2: Create Payment Intent
  // ==========================================
  console.log('Step 2/5: Creating payment intent...');

  const intentResponse = await fetch(`${API_URL}/v1/payments/x402/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: params.url,
      amount: params.amount,
      sender: params.sender,
      recipient: params.recipient
    })
  });

  if (!intentResponse.ok) {
    const error = await intentResponse.json();
    console.error('❌ Failed to create intent:', error);
    process.exit(1);
  }

  const { intent, usdcConfig } = await intentResponse.json();

  console.log(`  Intent ID: ${intent.id}`);
  console.log(`  Status: ${intent.status}`);
  console.log(`  Chain: ${usdcConfig.chainName}`);
  console.log(`  USDC Token: ${usdcConfig.tokenAddress}`);
  console.log(`  Expires: ${new Date(intent.expiresAt).toLocaleString()}`);
  console.log('  ✓ Intent created\n');

  // ==========================================
  // STEP 3: Get Authorization Data
  // ==========================================
  console.log('Step 3/5: Getting EIP-712 authorization...');

  const signResponse = await fetch(`${API_URL}/v1/payments/x402/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intentId: intent.id
    })
  });

  if (!signResponse.ok) {
    const error = await signResponse.json();
    console.error('❌ Failed to get authorization:', error);
    process.exit(1);
  }

  const { authorization } = await signResponse.json();

  console.log('  Authorization prepared:');
  console.log(`    Domain: ${authorization.domain.name} v${authorization.domain.version}`);
  console.log(`    Chain ID: ${authorization.domain.chainId}`);
  console.log(`    From: ${authorization.message.from}`);
  console.log(`    To: ${authorization.message.to}`);
  console.log(`    Value: ${authorization.message.value} (${params.amount} USDC)`);
  console.log('  ✓ Authorization ready\n');

  // ==========================================
  // STEP 4: Sign Authorization
  // ==========================================
  console.log('Step 4/5: Signing with wallet...');

  const signature = await wallet.signTypedData(
    authorization.domain,
    authorization.types,
    authorization.message
  );

  console.log(`  Signature: ${signature.substring(0, 20)}...`);
  console.log('  ✓ Signed\n');

  // ==========================================
  // STEP 5: Confirm Payment
  // ==========================================
  console.log('Step 5/5: Confirming payment on-chain...');

  const confirmResponse = await fetch(`${API_URL}/v1/payments/x402/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intentId: intent.id,
      signature
    })
  });

  if (!confirmResponse.ok) {
    const error = await confirmResponse.json();
    console.error('❌ Payment failed:', error);
    process.exit(1);
  }

  const result = await confirmResponse.json();

  console.log('  ✓ Payment confirmed!\n');

  // ==========================================
  // SUCCESS
  // ==========================================
  console.log('✨ Payment Completed Successfully!\n');
  console.log('Receipt:');
  console.log(`  Intent ID: ${result.receipt.intentId}`);
  console.log(`  TX Hash: ${result.txHash}`);
  console.log(`  Amount: ${result.receipt.amount} USDC`);
  console.log(`  From: ${result.receipt.sender}`);
  console.log(`  To: ${result.receipt.recipient}`);
  console.log(`  Status: ${result.receipt.status}`);
  console.log(`  Block: ${result.receipt.blockNumber}`);
  console.log(`  Gas Used: ${result.receipt.gasUsed}`);
  console.log(`  Timestamp: ${new Date(result.receipt.timestamp).toLocaleString()}`);
  console.log();
  console.log(`View on Explorer: ${result.explorerUrl}`);
  console.log();
}

// Example usage
async function main() {
  try {
    const wallet = new ethers.Wallet(PRIVATE_KEY);

    await completePaymentFlow({
      url: 'https://api.merchant.com',
      amount: 10, // 10 USDC
      sender: wallet.address,
      recipient: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' // Example recipient
    });
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other modules
export { completePaymentFlow };

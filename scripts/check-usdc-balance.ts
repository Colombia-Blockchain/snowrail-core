import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const WALLET_ADDRESS = process.env.PAY_TO_ADDRESS || '0x22f6F000609d52A0b0efCD4349222cd9d70716Ba';
const USDC_ADDRESS = process.env.ASSET_ADDRESS || '0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676';

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

async function checkBalance() {
  console.log('\n🔍 Checking USDC Balance...\n');
  console.log('Wallet:', WALLET_ADDRESS);
  console.log('USDC Contract:', USDC_ADDRESS);
  console.log('');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

  try {
    const balance = await usdc.balanceOf(WALLET_ADDRESS);
    const decimals = await usdc.decimals();
    const balanceFormatted = ethers.formatUnits(balance, decimals);

    console.log('✓ USDC Balance:', balanceFormatted, 'USDC');
    console.log('  Raw Balance:', balance.toString());

    if (balance === 0n) {
      console.log('\n⚠️  WARNING: Wallet has no USDC!');
      console.log('The E2E test will fail because there is no USDC to transfer.');
      console.log('\nTo get MockUSDC on Fuji:');
      console.log('1. Deploy MockUSDC contract (already done)');
      console.log('2. Call mint() function on the contract');
      console.log('3. Or transfer USDC from another wallet');
    } else {
      console.log('\n✓ OK: Wallet has sufficient USDC');
    }
  } catch (error: any) {
    console.error('\n❌ Error checking balance:', error.message);
  }
}

checkBalance();

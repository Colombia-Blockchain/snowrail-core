/**
 * Configuration Checker
 * Verifies all required environment variables are set
 */

import 'dotenv/config';
import chalk from 'chalk';

interface ConfigCheck {
  key: string;
  value: string | undefined;
  required: boolean;
  description: string;
}

const checks: ConfigCheck[] = [
  // Critical
  { key: 'PRIVATE_KEY', value: process.env.PRIVATE_KEY, required: true, description: 'Wallet private key' },
  { key: 'TREASURY_CONTRACT_ADDRESS', value: process.env.TREASURY_CONTRACT_ADDRESS, required: true, description: 'Treasury contract' },
  { key: 'ASSET_ADDRESS', value: process.env.ASSET_ADDRESS, required: true, description: 'USDC contract' },

  // Important
  { key: 'RPC_URL', value: process.env.RPC_URL, required: true, description: 'Avalanche RPC endpoint' },
  { key: 'API_URL', value: process.env.API_URL, required: false, description: 'Backend API URL' },
  { key: 'PORT', value: process.env.PORT, required: false, description: 'Backend port' },

  // Optional but recommended
  { key: 'SNOWTRACE_API_KEY', value: process.env.SNOWTRACE_API_KEY, required: false, description: 'For contract verification' },
  { key: 'PAY_TO_ADDRESS', value: process.env.PAY_TO_ADDRESS, required: false, description: 'Default payment recipient' },
  { key: 'MIXER_CONTRACT_ADDRESS', value: process.env.MIXER_CONTRACT_ADDRESS, required: false, description: 'Mixer contract' },
];

function truncate(str: string, len: number = 16): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan.bold('║              SNOWRAIL CONFIGURATION CHECKER                      ║'));
console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════════════╝\n'));

let hasErrors = false;
let hasWarnings = false;

checks.forEach(check => {
  const status = check.value ? '✓' : '✗';
  const statusColor = check.value ? chalk.green : (check.required ? chalk.red : chalk.yellow);
  const valueDisplay = check.value ? truncate(check.value, 40) : 'NOT SET';

  console.log(`${statusColor(status)} ${check.key.padEnd(30)} ${valueDisplay}`);
  console.log(`  ${chalk.gray(check.description)}`);

  if (!check.value && check.required) {
    hasErrors = true;
  } else if (!check.value && !check.required) {
    hasWarnings = true;
  }
});

console.log();

if (hasErrors) {
  console.log(chalk.red.bold('❌ ERRORS FOUND'));
  console.log(chalk.red('Please set the required environment variables in your .env file\n'));
  process.exit(1);
} else if (hasWarnings) {
  console.log(chalk.yellow.bold('⚠️  WARNINGS'));
  console.log(chalk.yellow('Some optional variables are not set. This is OK for testing.\n'));
} else {
  console.log(chalk.green.bold('✓ ALL CHECKS PASSED'));
  console.log(chalk.green('Configuration looks good!\n'));
}

// Additional checks
console.log(chalk.cyan('Additional information:'));
console.log(`  Network: ${process.env.NETWORK || 'fuji'}`);
console.log(`  Chain ID: ${process.env.CHAIN_ID || '43113'}`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log();

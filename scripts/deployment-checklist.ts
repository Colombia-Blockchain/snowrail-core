#!/usr/bin/env node
/**
 * SnowRail Deployment Checklist
 * Interactive checklist to verify deployment readiness
 */

import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  passed: boolean;
  message: string;
}

async function checkEnvironmentFile(): Promise<CheckResult> {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {
      passed: false,
      message: '.env file not found. Run: cp .env.example .env'
    };
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  // Check for required variables
  const required = ['PRIVATE_KEY', 'SNOWTRACE_API_KEY'];
  const missing = required.filter(key => !envContent.includes(key) || envContent.includes(`${key}=your_`));

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing or placeholder values: ${missing.join(', ')}`
    };
  }

  return {
    passed: true,
    message: '.env file configured correctly'
  };
}

async function checkDependencies(): Promise<CheckResult> {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    return {
      passed: false,
      message: 'Dependencies not installed. Run: pnpm install'
    };
  }

  return {
    passed: true,
    message: 'Dependencies installed'
  };
}

async function checkWalletBalance(): Promise<CheckResult> {
  try {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const minBalance = ethers.parseEther("1");

    if (balance < minBalance) {
      return {
        passed: false,
        message: `Insufficient balance: ${ethers.formatEther(balance)} AVAX (need 1.0 AVAX)`
      };
    }

    return {
      passed: true,
      message: `Wallet balance: ${ethers.formatEther(balance)} AVAX ✓`
    };
  } catch (error) {
    return {
      passed: false,
      message: `Could not check balance: ${error}`
    };
  }
}

async function checkContracts(): Promise<CheckResult> {
  const contractsPath = path.join(process.cwd(), 'contracts');
  const requiredContracts = [
    'SnowRailTreasury.sol',
    'MockUSDC.sol',
    'SnowRailMixer.sol'
  ];

  const missing = requiredContracts.filter(contract =>
    !fs.existsSync(path.join(contractsPath, contract))
  );

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing contracts: ${missing.join(', ')}`
    };
  }

  return {
    passed: true,
    message: 'All contracts present'
  };
}

async function checkBackend(): Promise<CheckResult> {
  const backendPath = path.join(process.cwd(), 'apps', 'backend', 'src', 'server.ts');
  if (!fs.existsSync(backendPath)) {
    return {
      passed: false,
      message: 'Backend server.ts not found'
    };
  }

  return {
    passed: true,
    message: 'Backend code ready'
  };
}

async function runChecklist() {
  console.log('\n' + '='.repeat(60));
  console.log('SNOWRAIL DEPLOYMENT CHECKLIST');
  console.log('='.repeat(60) + '\n');

  const checks = [
    { name: 'Environment Configuration', fn: checkEnvironmentFile },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Smart Contracts', fn: checkContracts },
    { name: 'Backend Code', fn: checkBackend },
    { name: 'Wallet Balance', fn: checkWalletBalance },
  ];

  let allPassed = true;

  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    const result = await check.fn();

    if (result.passed) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ ${result.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED - Ready for deployment!');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Deploy contracts:');
    console.log('   npx hardhat run scripts/deploy.ts --network fuji');
    console.log('\n2. Verify on Snowtrace:');
    console.log('   npx hardhat verify --network fuji <CONTRACT_ADDRESS> <ARGS>');
    console.log('\n3. Deploy backend to Railway');
    console.log('   See DEPLOYMENT.md for details');
  } else {
    console.log('⚠️  SOME CHECKS FAILED - Please fix issues above');
    console.log('='.repeat(60));
    console.log('\nGet help:');
    console.log('- Documentation: See DEPLOYMENT.md');
    console.log('- Testnet AVAX: https://core.app/tools/testnet-faucet/');
    console.log('- Snowtrace API Key: https://snowtrace.io/myapikey');
  }

  console.log('');
  process.exit(allPassed ? 0 : 1);
}

runChecklist();

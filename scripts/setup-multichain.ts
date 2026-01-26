#!/usr/bin/env node
/**
 * SnowRail Multichain Configuration Helper
 * Helps configure deployment for different chains
 */

import * as fs from 'fs';
import * as path from 'path';

interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  symbol: string;
  faucet?: string;
}

const CHAINS: Record<string, ChainConfig> = {
  // Avalanche (Primary)
  'avalanche-fuji': {
    name: 'Avalanche Fuji Testnet',
    chainId: 43113,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerApiUrl: 'https://api-testnet.snowtrace.io/api',
    symbol: 'AVAX',
    faucet: 'https://core.app/tools/testnet-faucet/'
  },
  'avalanche-mainnet': {
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    explorerApiUrl: 'https://api.snowtrace.io/api',
    symbol: 'AVAX'
  },

  // Cronos (Secondary)
  'cronos-testnet': {
    name: 'Cronos Testnet',
    chainId: 338,
    rpcUrl: 'https://evm-t3.cronos.org',
    explorerUrl: 'https://cronos.org/explorer/testnet3',
    symbol: 'TCRO',
    faucet: 'https://cronos.org/faucet'
  },
  'cronos-mainnet': {
    name: 'Cronos Mainnet',
    chainId: 25,
    rpcUrl: 'https://evm.cronos.org',
    explorerUrl: 'https://cronoscan.com',
    symbol: 'CRO'
  },

  // Mantle (Secondary)
  'mantle-testnet': {
    name: 'Mantle Testnet',
    chainId: 5001,
    rpcUrl: 'https://rpc.testnet.mantle.xyz',
    explorerUrl: 'https://explorer.testnet.mantle.xyz',
    symbol: 'MNT',
    faucet: 'https://faucet.testnet.mantle.xyz'
  },
  'mantle-mainnet': {
    name: 'Mantle Mainnet',
    chainId: 5000,
    rpcUrl: 'https://rpc.mantle.xyz',
    explorerUrl: 'https://explorer.mantle.xyz',
    symbol: 'MNT'
  }
};

function generateHardhatConfig(chains: string[]): string {
  const networkConfigs = chains.map(chain => {
    const config = CHAINS[chain];
    if (!config) return '';

    const networkName = chain.split('-')[0];
    return `    ${chain}: {
      url: "${config.rpcUrl}",
      chainId: ${config.chainId},
      accounts: [PRIVATE_KEY],
    },`;
  }).join('\n');

  return `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
${networkConfigs}
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: SNOWTRACE_API_KEY,
      avalanche: SNOWTRACE_API_KEY,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
`;
}

function displayChainInfo(chain: string) {
  const config = CHAINS[chain];
  if (!config) {
    console.log(`❌ Unknown chain: ${chain}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${config.name}`);
  console.log('='.repeat(60));
  console.log(`Chain ID:     ${config.chainId}`);
  console.log(`RPC URL:      ${config.rpcUrl}`);
  console.log(`Explorer:     ${config.explorerUrl}`);
  console.log(`Symbol:       ${config.symbol}`);
  if (config.faucet) {
    console.log(`Faucet:       ${config.faucet}`);
  }
  console.log('='.repeat(60));
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log(`
SnowRail Multichain Configuration Helper

Usage:
  npm run setup:chain <command> [options]

Commands:
  list                    List all supported chains
  info <chain>           Show chain information
  config <chain1,chain2>  Generate hardhat config for chains
  deploy <chain>         Show deployment instructions

Examples:
  npm run setup:chain list
  npm run setup:chain info avalanche-fuji
  npm run setup:chain config avalanche-fuji,cronos-testnet
  npm run setup:chain deploy avalanche-fuji
`);
    return;
  }

  switch (command) {
    case 'list':
      console.log('\nSupported Chains:\n');
      console.log('Testnets:');
      console.log('  - avalanche-fuji   (Primary)');
      console.log('  - cronos-testnet');
      console.log('  - mantle-testnet');
      console.log('\nMainnets:');
      console.log('  - avalanche-mainnet (Primary)');
      console.log('  - cronos-mainnet');
      console.log('  - mantle-mainnet');
      break;

    case 'info':
      if (!args[1]) {
        console.log('❌ Please specify a chain');
        console.log('Example: npm run setup:chain info avalanche-fuji');
        break;
      }
      displayChainInfo(args[1]);
      break;

    case 'config':
      if (!args[1]) {
        console.log('❌ Please specify chains (comma-separated)');
        console.log('Example: npm run setup:chain config avalanche-fuji,cronos-testnet');
        break;
      }
      const chains = args[1].split(',');
      const config = generateHardhatConfig(chains);

      // Save to hardhat.config.ts
      const configPath = path.join(process.cwd(), 'hardhat.config.ts');
      fs.writeFileSync(configPath, config);
      console.log(`✅ Generated hardhat.config.ts with chains: ${chains.join(', ')}`);
      break;

    case 'deploy':
      if (!args[1]) {
        console.log('❌ Please specify a chain');
        break;
      }
      const chain = args[1];
      displayChainInfo(chain);
      console.log('\nDeployment Command:');
      console.log(`npx hardhat run scripts/deploy.ts --network ${chain}`);
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Run "npm run setup:chain help" for usage information');
  }
}

main();

/**
 * SnowRail Network Configuration
 *
 * Centralized configuration for all network-specific settings.
 * This file eliminates hardcoded addresses across the codebase.
 */

export interface NetworkConfig {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: {
    usdc: string;
    treasury: string;
    mixer: string;
  };
  usdcDecimals: number;
}

/**
 * Avalanche Fuji Testnet Configuration
 */
export const fuji: NetworkConfig = {
  chainId: 43113,
  chainName: 'Avalanche Fuji Testnet',
  rpcUrl: process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
  explorerUrl: 'https://testnet.snowtrace.io',
  explorerApiUrl: 'https://api-testnet.snowtrace.io/api',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  contracts: {
    usdc: process.env.ASSET_ADDRESS || '0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676',
    treasury: process.env.TREASURY_CONTRACT_ADDRESS || '0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd',
    mixer: process.env.MIXER_CONTRACT_ADDRESS || '0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD',
  },
  usdcDecimals: 6,
};

/**
 * Avalanche Mainnet Configuration
 */
export const avalanche: NetworkConfig = {
  chainId: 43114,
  chainName: 'Avalanche C-Chain',
  rpcUrl: process.env.RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
  explorerUrl: 'https://snowtrace.io',
  explorerApiUrl: 'https://api.snowtrace.io/api',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  contracts: {
    usdc: process.env.ASSET_ADDRESS || '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Native USDC
    treasury: process.env.TREASURY_CONTRACT_ADDRESS || '', // Deploy to mainnet
    mixer: process.env.MIXER_CONTRACT_ADDRESS || '', // Deploy to mainnet
  },
  usdcDecimals: 6,
};

/**
 * Local Development Configuration
 */
export const localhost: NetworkConfig = {
  chainId: 31337,
  chainName: 'Localhost',
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  explorerUrl: '', // No explorer for localhost
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  contracts: {
    usdc: process.env.ASSET_ADDRESS || '', // Deploy MockUSDC locally
    treasury: process.env.TREASURY_CONTRACT_ADDRESS || '',
    mixer: process.env.MIXER_CONTRACT_ADDRESS || '',
  },
  usdcDecimals: 6,
};

/**
 * Network registry - maps network names to configurations
 */
export const networks: Record<string, NetworkConfig> = {
  fuji,
  avalanche,
  localhost,
  'avalanche-fuji': fuji, // Alias
  'avalanche-mainnet': avalanche, // Alias
};

/**
 * Get network configuration by name or chain ID
 */
export function getNetwork(networkOrChainId: string | number): NetworkConfig {
  if (typeof networkOrChainId === 'number') {
    const network = Object.values(networks).find(n => n.chainId === networkOrChainId);
    if (!network) {
      throw new Error(`Network with chain ID ${networkOrChainId} not found`);
    }
    return network;
  }

  const network = networks[networkOrChainId];
  if (!network) {
    throw new Error(`Network ${networkOrChainId} not found. Available: ${Object.keys(networks).join(', ')}`);
  }

  return network;
}

/**
 * Get current network from environment
 */
export function getCurrentNetwork(): NetworkConfig {
  const networkName = process.env.NETWORK || 'fuji';
  return getNetwork(networkName);
}

/**
 * Validate that all required contract addresses are set
 */
export function validateNetworkConfig(network: NetworkConfig): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!network.contracts.usdc || network.contracts.usdc === '') {
    missing.push('USDC contract address');
  }
  if (!network.contracts.treasury || network.contracts.treasury === '') {
    missing.push('Treasury contract address');
  }
  if (!network.contracts.mixer || network.contracts.mixer === '') {
    missing.push('Mixer contract address');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get explorer URL for a transaction
 */
export function getTransactionUrl(network: NetworkConfig, txHash: string): string {
  if (!network.explorerUrl) {
    return '';
  }
  return `${network.explorerUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for an address
 */
export function getAddressUrl(network: NetworkConfig, address: string): string {
  if (!network.explorerUrl) {
    return '';
  }
  return `${network.explorerUrl}/address/${address}`;
}

/**
 * Export default network (current environment)
 */
export default getCurrentNetwork();

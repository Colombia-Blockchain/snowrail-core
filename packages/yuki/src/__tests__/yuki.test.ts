/**
 * YUKI Engine Tests
 */

import { describe, it, expect } from 'vitest';
import { createYuki, YukiConfig } from '../index';

describe('YUKI Engine', () => {
  describe('Factory', () => {
    it('should create YUKI instance with default config', () => {
      const config: YukiConfig = {
        provider: 'mock',
        sentinelEndpoint: 'http://localhost:3000'
      };
      
      const yuki = createYuki(config);
      expect(yuki).toBeDefined();
      expect(typeof yuki.chat).toBe('function');
    });

    it('should create YUKI instance with mock provider', () => {
      const config: YukiConfig = {
        provider: 'mock',
        sentinelEndpoint: 'http://localhost:3000'
      };
      
      const yuki = createYuki(config);
      expect(yuki).toBeDefined();
    });
  });

  describe('Chat', () => {
    it('should respond to simple greeting', async () => {
      const config: YukiConfig = {
        provider: 'mock',
        sentinelEndpoint: 'http://localhost:3000'
      };
      
      const yuki = createYuki(config);
      const response = await yuki.chat('Hello');
      
      expect(response).toBeDefined();
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    });

    it('should handle payment intent', async () => {
      const config: YukiConfig = {
        provider: 'mock',
        sentinelEndpoint: 'http://localhost:3000'
      };
      
      const yuki = createYuki(config);
      const response = await yuki.chat('Pay $100 to https://merchant.com');
      
      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });
});

/**
 * @snowrail/yuki
 * AI Assistant for SnowRail Treasury
 * 
 * @example
 * ```typescript
 * import { createYuki } from '@snowrail/yuki';
 * 
 * const yuki = createYuki();
 * 
 * const response = await yuki.chat('user123', 'Check trust for https://merchant.com');
 * console.log(response.content);
 * ```
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

export { Yuki, createYuki } from './engine/core';
export * from './types';

import { createYuki } from './engine/core';
export default createYuki;

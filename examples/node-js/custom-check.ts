/**
 * Custom Security Check Example
 *
 * This example shows how to create and register a custom security check
 * for the SENTINEL trust layer.
 *
 * Run: npx tsx examples/node-js/custom-check.ts
 *
 * @requires @snowrail/sentinel
 */

import {
  BaseCheck,
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest,
  createSentinel
} from '@snowrail/sentinel';

/**
 * Custom Check: AllowlistCheck
 *
 * This check validates URLs against a predefined allowlist.
 * In production, this could load from a database or external API.
 */
class AllowlistCheck extends BaseCheck {
  public readonly type = 'allowlist' as CheckType;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'Allowlist Validation';
  public readonly description = 'Validates URLs against trusted allowlist';

  // Allowlist of trusted domains
  private readonly allowlist = [
    'api.stripe.com',
    'api.github.com',
    'api.openai.com',
    'www.google.com'
  ];

  async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);

    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    // Check if hostname is in allowlist
    const isAllowed = this.allowlist.includes(url.hostname);
    const score = isAllowed ? 100 : 30;
    const confidence = 0.95; // Very confident in allowlist

    if (isAllowed) {
      return this.success(score, confidence, {
        hostname: url.hostname,
        inAllowlist: true,
        message: 'Domain found in trusted allowlist'
      });
    } else {
      return this.failure(score, confidence, RiskLevel.MEDIUM, {
        hostname: url.hostname,
        inAllowlist: false,
        message: 'Domain not in allowlist',
        suggestion: 'Consider adding to allowlist if trusted'
      });
    }
  }
}

/**
 * Advanced Example: Rate Limit Check
 *
 * This check detects if a domain is being accessed too frequently
 * which could indicate automated attacks.
 */
class RateLimitCheck extends BaseCheck {
  public readonly type = 'rate_limit' as CheckType;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'Rate Limit Detection';
  public readonly description = 'Detects excessive payment requests';

  // Track requests per domain (in production, use Redis)
  private requests = new Map<string, number[]>();
  private readonly maxRequestsPerMinute = 10;

  async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);

    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    // Track this request
    const now = Date.now();
    const hostname = url.hostname;
    const timestamps = this.requests.get(hostname) || [];

    // Remove old timestamps (older than 1 minute)
    const recentTimestamps = timestamps.filter(ts => now - ts < 60000);
    recentTimestamps.push(now);
    this.requests.set(hostname, recentTimestamps);

    // Check if rate limit exceeded
    const requestCount = recentTimestamps.length;
    const exceeded = requestCount > this.maxRequestsPerMinute;

    if (exceeded) {
      const score = Math.max(0, 100 - (requestCount - this.maxRequestsPerMinute) * 10);

      return this.failure(score, 0.9, RiskLevel.HIGH, {
        hostname,
        requestCount,
        maxAllowed: this.maxRequestsPerMinute,
        message: `Rate limit exceeded: ${requestCount} requests in last minute`
      });
    } else {
      return this.success(100, 0.8, {
        hostname,
        requestCount,
        maxAllowed: this.maxRequestsPerMinute,
        message: 'Rate limit OK'
      });
    }
  }
}

/**
 * Demo: Using custom checks
 */
async function main() {
  console.log('🔧 Custom Security Check Example\n');

  // Create Sentinel instance
  const sentinel = createSentinel({
    defaultMinScore: 60
  });

  // Register custom checks
  console.log('Registering custom checks...');
  sentinel.registerCheck(new AllowlistCheck());
  sentinel.registerCheck(new RateLimitCheck());
  console.log('  ✓ AllowlistCheck registered');
  console.log('  ✓ RateLimitCheck registered\n');

  // ==========================================
  // Test 1: Allowlisted domain
  // ==========================================
  console.log('Test 1: Validating allowlisted domain...');
  console.log('URL: https://api.stripe.com\n');

  const result1 = await sentinel.validate({
    url: 'https://api.stripe.com',
    amount: 100
  });

  console.log(`Trust Score: ${result1.trustScore}/100`);
  console.log(`Can Pay: ${result1.canPay}`);

  const allowlistCheck1 = result1.checks.find(c => c.type === 'allowlist');
  if (allowlistCheck1) {
    console.log('\nAllowlist Check:');
    console.log(`  Status: ${allowlistCheck1.passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Score: ${allowlistCheck1.score}/100`);
    console.log(`  Message: ${allowlistCheck1.details.message}`);
  }
  console.log();

  // ==========================================
  // Test 2: Non-allowlisted domain
  // ==========================================
  console.log('Test 2: Validating non-allowlisted domain...');
  console.log('URL: https://unknown-merchant.com\n');

  const result2 = await sentinel.validate({
    url: 'https://unknown-merchant.com',
    amount: 100
  });

  console.log(`Trust Score: ${result2.trustScore}/100`);
  console.log(`Can Pay: ${result2.canPay}`);

  const allowlistCheck2 = result2.checks.find(c => c.type === 'allowlist');
  if (allowlistCheck2) {
    console.log('\nAllowlist Check:');
    console.log(`  Status: ${allowlistCheck2.passed ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Score: ${allowlistCheck2.score}/100`);
    console.log(`  Message: ${allowlistCheck2.details.message}`);
    if (allowlistCheck2.details.suggestion) {
      console.log(`  Suggestion: ${allowlistCheck2.details.suggestion}`);
    }
  }
  console.log();

  // ==========================================
  // Test 3: Rate limit detection
  // ==========================================
  console.log('Test 3: Testing rate limit detection...');
  console.log('Sending multiple rapid requests...\n');

  for (let i = 1; i <= 12; i++) {
    const result = await sentinel.validate({
      url: 'https://api.stripe.com',
      amount: 100
    });

    const rateLimitCheck = result.checks.find(c => c.type === 'rate_limit');

    if (rateLimitCheck) {
      const status = rateLimitCheck.passed ? '✓' : '✗';
      console.log(`Request ${i}: ${status} (${rateLimitCheck.details.requestCount}/${rateLimitCheck.details.maxAllowed} requests)`);

      if (!rateLimitCheck.passed) {
        console.log(`  ⚠️  ${rateLimitCheck.details.message}`);
      }
    }
  }
  console.log();

  // ==========================================
  // Summary
  // ==========================================
  console.log('✨ Custom check examples completed!\n');
  console.log('Key Takeaways:');
  console.log('  1. Extend BaseCheck class to create custom checks');
  console.log('  2. Implement execute() method with your validation logic');
  console.log('  3. Use this.success() or this.failure() to return results');
  console.log('  4. Register checks with sentinel.registerCheck()');
  console.log('  5. Your checks integrate seamlessly with SENTINEL\n');

  console.log('Next Steps:');
  console.log('  - See docs/guides/ADDING_CHECKS.md for detailed guide');
  console.log('  - Review real checks in packages/sentinel/src/checks/');
  console.log('  - Create checks for your specific use case');
}

// Run example
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

// Export checks for use in other modules
export { AllowlistCheck, RateLimitCheck };

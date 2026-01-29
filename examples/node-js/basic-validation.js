/**
 * Basic URL validation with SnowRail
 *
 * This example shows how to validate a URL before making a payment.
 * Run: node examples/node-js/basic-validation.js
 *
 * @requires @snowrail/sentinel
 */

const { createSentinel } = require('@snowrail/sentinel');

async function main() {
  // Create Sentinel instance
  const sentinel = createSentinel({
    defaultMinScore: 60,  // Minimum trust score required
    cacheEnabled: true    // Enable caching for performance
  });

  console.log('🔍 SnowRail Basic Validation Example\n');

  // Example 1: Validate a trusted URL
  console.log('Example 1: Validating trusted URL...');
  console.log('URL: https://api.stripe.com');

  const trustedResult = await sentinel.validate({
    url: 'https://api.stripe.com',
    amount: 100
  });

  console.log(`✓ Can pay: ${trustedResult.canPay}`);
  console.log(`  Trust score: ${trustedResult.trustScore}/100`);
  console.log(`  Risk level: ${trustedResult.risk}`);
  console.log(`  Decision: ${trustedResult.decision}\n`);

  // Example 2: Validate a suspicious URL (HTTP instead of HTTPS)
  console.log('Example 2: Validating suspicious URL...');
  console.log('URL: http://free-money.xyz');

  const suspiciousResult = await sentinel.validate({
    url: 'http://free-money.xyz',
    amount: 100
  });

  console.log(`✗ Can pay: ${suspiciousResult.canPay}`);
  console.log(`  Trust score: ${suspiciousResult.trustScore}/100`);
  console.log(`  Risk level: ${suspiciousResult.risk}`);
  console.log(`  Decision: ${suspiciousResult.decision}`);

  if (suspiciousResult.blockedReasons) {
    console.log('  Blocked reasons:');
    suspiciousResult.blockedReasons.forEach(reason => {
      console.log(`    - ${reason}`);
    });
  }
  console.log();

  // Example 3: Check individual security checks
  console.log('Example 3: Analyzing security checks...');
  console.log('URL: https://api.github.com\n');

  const githubResult = await sentinel.validate({
    url: 'https://api.github.com'
  });

  console.log('Security Checks:');
  githubResult.checks.forEach(check => {
    const status = check.passed ? '✓' : '✗';
    console.log(`  ${status} ${check.name}: ${check.score}/100`);
  });
  console.log();

  // Example 4: Use simple canPay() method
  console.log('Example 4: Quick check with canPay()...');

  const canPayStripe = await sentinel.canPay('https://api.stripe.com');
  const canPaySuspicious = await sentinel.canPay('http://suspicious-site.xyz');

  console.log(`  api.stripe.com: ${canPayStripe ? '✓ SAFE' : '✗ BLOCKED'}`);
  console.log(`  suspicious-site.xyz: ${canPaySuspicious ? '✓ SAFE' : '✗ BLOCKED'}`);
  console.log();

  // Example 5: Get trust score as decimal
  console.log('Example 5: Get trust score...');

  const trustScore = await sentinel.trust('https://www.google.com');
  console.log(`  google.com trust: ${(trustScore * 100).toFixed(0)}%`);
  console.log();

  console.log('✨ All examples completed!\n');
  console.log('Next steps:');
  console.log('  - Try validating your own URLs');
  console.log('  - Run complete-flow.ts for full payment flow');
  console.log('  - See docs/guides/INTEGRATION.md for more examples');
}

// Run examples
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});

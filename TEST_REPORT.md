# TEST REPORT

## SnowRail Core v2.0.0 - Green Baseline
**Date:** 2026-01-27  
**Test Framework:** Vitest 1.6.1  
**Node Version:** v22.21.0

---

## Test Summary

| Package | Tests | Passed | Failed | Duration |
|---------|-------|--------|--------|----------|
| @snowrail/sentinel | 18 | 18 | 0 | 1.63s |
| @snowrail/yuki | 4 | 4 | 0 | 1.20s |
| @snowrail/backend | N/A | N/A | N/A | N/A |
| @snowrail/frontend | N/A | N/A | N/A | N/A |
| **Total** | **22** | **22** | **0** | **~3s** |

---

## Test Matrix

### @snowrail/sentinel

| Test Suite | Test Case | Status |
|------------|-----------|--------|
| SENTINEL | should export createSentinel function | ✅ PASS |
| SENTINEL | should export Sentinel class | ✅ PASS |
| Trust Score | should return high score for trusted domains | ✅ PASS |
| Trust Score | should return low score for suspicious domains | ✅ PASS |
| Trust Score | should return moderate score for unknown domains | ✅ PASS |
| Risk Assessment | should categorize HIGH risk correctly | ✅ PASS |
| Risk Assessment | should categorize MEDIUM risk correctly | ✅ PASS |
| Risk Assessment | should categorize LOW risk correctly | ✅ PASS |
| Validation | should validate payment request structure | ✅ PASS |
| Validation | should reject invalid URLs | ✅ PASS |
| Validation | should handle HTTP URLs as suspicious | ✅ PASS |
| Caching | should cache validation results | ✅ PASS |
| Caching | should respect cache TTL | ✅ PASS |
| Events | should emit validation:start event | ✅ PASS |
| Events | should emit validation:complete event | ✅ PASS |
| Checks | TLS check should pass for HTTPS | ✅ PASS |
| Checks | DNS check should validate domain | ✅ PASS |
| Checks | Policy check should enforce limits | ✅ PASS |

### @snowrail/yuki

| Test Suite | Test Case | Status |
|------------|-----------|--------|
| Factory | should create YUKI instance with default config | ✅ PASS |
| Factory | should create YUKI instance with mock provider | ✅ PASS |
| Chat | should respond to simple greeting | ✅ PASS |
| Chat | should handle payment intent | ✅ PASS |

---

## Test Evidence

### Command Output

```bash
$ pnpm test

> snowrail@2.0.0 test
> turbo run test

• Packages in scope: @snowrail/backend, @snowrail/frontend, @snowrail/sentinel, @snowrail/yuki
• Running test in 4 packages

@snowrail/sentinel:test: 
@snowrail/sentinel:test:  RUN  v1.6.1 /packages/sentinel
@snowrail/sentinel:test:  ✓ src/__tests__/sentinel.test.ts (18 tests) 18ms
@snowrail/sentinel:test:  Test Files  1 passed (1)
@snowrail/sentinel:test:       Tests  18 passed (18)

@snowrail/yuki:test: 
@snowrail/yuki:test:  RUN  v1.6.1 /packages/yuki
@snowrail/yuki:test:  ✓ src/__tests__/yuki.test.ts (4 tests) 7ms
@snowrail/yuki:test:  Test Files  1 passed (1)
@snowrail/yuki:test:       Tests  4 passed (4)

 Tasks:    6 successful, 6 total
```

---

## Coverage Notes

- **@snowrail/sentinel:** Core validation logic covered
- **@snowrail/yuki:** Basic factory and chat covered
- **@snowrail/backend:** No unit tests (integration tested via endpoints)
- **@snowrail/frontend:** No tests (UI components, visual testing recommended)

---

## Recommendations for Future

1. Add integration tests for backend API endpoints
2. Add visual/snapshot tests for frontend components
3. Add E2E tests with Playwright/Cypress
4. Add contract tests for Solidity (Hardhat)
5. Increase coverage to 80%+ for core packages

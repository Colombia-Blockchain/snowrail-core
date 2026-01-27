# Exit Gates - SnowRail Core v2

## Technical Gates (ALL must PASS)

| Gate | Command | Expected | Status |
|------|---------|----------|--------|
| Install | `pnpm install` | exit 0, no errors | PENDING |
| Lint | `pnpm lint` | exit 0, warnings OK | PENDING |
| Typecheck | `pnpm typecheck` | exit 0, no TS errors | PENDING |
| Build | `pnpm build` | exit 0, dist/ created | PENDING |
| Test | `pnpm test` | exit 0, tests pass | PENDING |

## Documentation Gates (ALL must be TRUE)

| Document | Description | Status |
|----------|-------------|--------|
| AUDIT_REPORT.md | Security + quality findings | PENDING |
| CURATION_CHANGELOG.md | Files changed with reasons | PENDING |
| TEST_REPORT.md | Test matrix + evidence | PENDING |
| SECURITY_REVIEW.md | Vulnerabilities + mitigations | PENDING |

## Exit Criteria

```
EXIT_SIGNAL: false

Conditions for EXIT_SIGNAL: true
1. ALL technical gates = PASS
2. ALL documentation gates = TRUE
3. Zero unresolved blockers
4. Evidence logs preserved
```

# SnowRail Developer Guides

Comprehensive guides for extending and integrating SnowRail.

## Available Guides

| Guide | Description | Difficulty | Time |
|-------|-------------|------------|------|
| [Integration Guide](./INTEGRATION.md) | How to integrate SnowRail in your app | Beginner | 15 min |
| [Adding Checks](./ADDING_CHECKS.md) | Create custom security checks | Intermediate | 30 min |
| [Adding Adapters](./ADDING_ADAPTERS.md) | Create payment adapters | Advanced | 45 min |

---

## Quick Start

### I want to...

**...integrate SnowRail in my app**
→ Start with [Integration Guide](./INTEGRATION.md)

**...add a custom security check**
→ Read [Adding Checks](./ADDING_CHECKS.md)

**...support a new payment protocol**
→ Read [Adding Adapters](./ADDING_ADAPTERS.md)

**...see code examples**
→ Check [Examples Directory](../../examples/README.md)

**...understand the API**
→ See [API Reference](../api/ENDPOINTS.md)

---

## Guide Descriptions

### [Integration Guide](./INTEGRATION.md)

Learn how to integrate SnowRail Trust Layer into your application.

**What you'll learn:**
- Quick start with @snowrail/sentinel package
- Common integration patterns (Gateway, Pre-payment hook, Caching)
- Platform-specific guides (Next.js, Express, React Native, CLI)
- Use cases (Pre-payment validation, Agent systems, Multi-chain routing)
- Best practices and troubleshooting

**Who should read this:**
- Frontend developers
- Backend developers
- Full-stack developers
- Anyone integrating SnowRail

**Prerequisites:**
- Basic TypeScript/JavaScript knowledge
- Understanding of async/await
- Node.js installed

---

### [Adding Checks Guide](./ADDING_CHECKS.md)

Learn how to create custom security checks for SENTINEL.

**What you'll learn:**
- Check interface and BaseCheck class
- Step-by-step check creation
- Testing your checks
- Real example: PhishingCheck implementation
- Best practices (performance, error handling, scoring)
- Advanced topics (weighted checks, evidence collection)

**Who should read this:**
- Security engineers
- Contributors to SnowRail
- Developers needing custom validation

**Prerequisites:**
- Strong TypeScript knowledge
- Understanding of security concepts
- Experience with unit testing

---

### [Adding Adapters Guide](./ADDING_ADAPTERS.md)

Learn how to create adapters for new payment protocols.

**What you'll learn:**
- Adapter interface and hexagonal architecture
- Step-by-step adapter creation
- Real example: X402Adapter implementation
- Testing your adapters
- Best practices (error handling, timeouts, configuration)
- Advanced topics (multi-token, cross-chain, gasless transactions)

**Who should read this:**
- Blockchain developers
- Protocol engineers
- Contributors to SnowRail
- Developers integrating new chains/protocols

**Prerequisites:**
- Strong TypeScript knowledge
- Understanding of blockchain concepts
- Experience with Web3/ethers.js

---

## Learning Path

### Path 1: App Integration (Beginner)

1. Read [Integration Guide](./INTEGRATION.md) - 15 min
2. Try [Basic Example](../../examples/node-js/basic-validation.js) - 5 min
3. Build a simple validator - 30 min
4. Read [API Reference](../api/ENDPOINTS.md) - 10 min

**Total time:** ~1 hour
**Result:** Working SnowRail integration in your app

---

### Path 2: Custom Security (Intermediate)

1. Review [Adding Checks Guide](./ADDING_CHECKS.md) - 30 min
2. Study existing checks in codebase - 20 min
3. Create a simple custom check - 40 min
4. Write tests for your check - 30 min

**Total time:** ~2 hours
**Result:** Custom security check deployed in SENTINEL

---

### Path 3: Protocol Support (Advanced)

1. Read [Hexagonal Architecture](../architecture/BOUNDARIES.md) - 15 min
2. Study [Adding Adapters Guide](./ADDING_ADAPTERS.md) - 45 min
3. Review X402Adapter source code - 30 min
4. Create adapter for your protocol - 2-3 hours
5. Write integration tests - 1 hour

**Total time:** ~5 hours
**Result:** New payment protocol supported in SnowRail

---

## Code Examples

Each guide includes working code examples:

### Integration Guide Examples

- Gateway validation middleware
- Pre-payment hook
- Caching layer
- Next.js app
- Express.js API
- React Native app
- CLI tool

### Adding Checks Examples

- Basic check structure
- PhishingCheck implementation
- Unit tests
- Integration tests
- Scoring algorithms

### Adding Adapters Examples

- Lightning Network adapter
- X402Adapter (EIP-712)
- Multi-chain adapter
- Bridge adapter
- Gasless transactions

---

## Additional Resources

### Documentation

- [Main README](../../README.md) - Project overview
- [API Reference](../api/ENDPOINTS.md) - Complete API docs
- [Sentinel README](../../packages/sentinel/README.md) - SDK docs
- [STATE.md](../standing/STATE.md) - Project status

### Examples

- [Node.js Examples](../../examples/node-js/) - JS/TS examples
- [Python Example](../../examples/python/) - Python client
- [Go Example](../../examples/go/) - Go client
- [Next.js Template](../../examples/nextjs-app/) - Full app

### Community

- [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues) - Bug reports
- [Discussions](https://github.com/Colombia-Blockchain/snowrail-core/discussions) - Q&A

---

## Contributing to Guides

Found an issue or want to improve a guide?

1. Open an issue: [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)
2. Submit a PR with improvements
3. Tag with `documentation` label

### Guide Template

When creating new guides, follow this structure:

```markdown
# Guide Title

Brief description (1-2 sentences).

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Introduction
What will readers learn?

## Step-by-Step
Detailed steps with code examples

## Real Examples
Production code from SnowRail

## Best Practices
Dos and don'ts

## Troubleshooting
Common issues and solutions

## Next Steps
Links to related guides
```

---

## FAQ

### Do I need to read all guides?

No! Start with the guide that matches your goal:
- **Integrate SnowRail** → Integration Guide
- **Add security checks** → Adding Checks
- **Support new protocol** → Adding Adapters

### Are the code examples production-ready?

The examples from the codebase (X402Adapter, PhishingCheck, etc.) are production-ready. Tutorial examples are simplified for learning but follow the same patterns.

### Can I copy code from the guides?

Yes! All code in the guides is MIT licensed. Feel free to use it in your projects.

### How do I test my integration?

Each guide includes a "Testing" section with unit and integration test examples. Use these as templates for your own tests.

### Where can I get help?

- Check the [Troubleshooting](#troubleshooting) section in each guide
- Search [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)
- Open a new issue if your question isn't answered

---

## Version Information

**Guides Version:** 1.0.0
**Last Updated:** 2026-01-29
**Compatible with:** @snowrail/sentinel v2.0+

---

## Next Steps

1. Choose a guide based on your goal
2. Follow the step-by-step instructions
3. Try the code examples
4. Build your integration/extension
5. Share your experience!

**Happy building!** 🚀

---

**Questions?** Open an issue on [GitHub](https://github.com/Colombia-Blockchain/snowrail-core/issues)

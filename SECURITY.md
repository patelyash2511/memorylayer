# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ Yes    |

rec0 is in Open Beta. The latest release on PyPI (`memorylayer-py`) and the live API at `https://memorylayer-production.up.railway.app` are the only supported targets.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities by emailing:

**security@rec0.ai**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact / CVSS score if known
- Any suggested mitigations

### What to expect

| Timeline | Action |
|----------|--------|
| 48 hours | Acknowledgement of your report |
| 7 days   | Initial assessment and severity classification |
| 30 days  | Patch released (critical/high), or mitigation plan shared |
| 90 days  | Public disclosure (coordinated with reporter) |

We follow responsible disclosure. If you report a valid vulnerability, we will credit you in the release notes unless you prefer to remain anonymous.

---

## Scope

**In scope:**
- The rec0 API (`api/`) — authentication bypass, injection, data leakage
- The Python SDK (`sdk/`) — credential handling, dependency vulnerabilities
- The rec0 website — XSS, CSRF, data exposure

**Out of scope:**
- Denial-of-service attacks
- Brute force attacks against rate-limited endpoints
- Social engineering
- Physical security

---

## Security Practices

- All API keys are stored as bcrypt hashes (`SECRET_KEY_HASH`)
- No plaintext secrets are stored in the database
- All dependencies are pinned to exact versions (see `requirements.txt`)
- ONNX embedding model runs fully locally — no external API calls for core operations
- PostgreSQL via Supabase with connection pooling

---

*© 2026 Yash Patel / rec0.ai*

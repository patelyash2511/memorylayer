# Contributing to rec0

Thank you for your interest in contributing to rec0.

---

## Contributor License Agreement (CLA)

**By submitting a pull request, issue, or any other contribution to this repository, you agree to the following terms:**

1. **Copyright Assignment** — You assign and transfer all copyright, title, and interest in your contribution to **Yash Patel / rec0.ai**. This means rec0.ai becomes the sole copyright holder of all contributed code.

2. **License Grant** — To the extent any copyright assignment is not effective, you grant Yash Patel / rec0.ai a perpetual, worldwide, irrevocable, royalty-free license to use, reproduce, modify, distribute, sublicense, and otherwise exploit your contribution in any form.

3. **Original Work** — You represent that your contribution is your original work, that you have the right to make this assignment, and that your contribution does not violate any third-party rights.

4. **No Compensation** — You are not entitled to any compensation for your contributions unless separately agreed in writing with Yash Patel / rec0.ai.

**If you do not agree to these terms, please do not submit contributions.**

---

## How to Contribute

### Reporting Bugs

Open a GitHub issue with:
- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- rec0 version (`memorylayer-py` package version or API commit hash)

### Suggesting Features

Open a GitHub issue tagged `[feature request]`. Describe:
- The use case / pain point
- Your proposed solution
- Alternatives considered

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes, following the code style below
4. Add or update tests
5. Run the test suite: `cd api && pytest --tb=short`
6. Open a pull request against `master`

All pull requests must pass CI before review.

---

## Code Style

- **Python:** Follow PEP 8. Use type annotations where practical. No docstrings required for internal helpers.
- **JavaScript/React:** Follow the existing component patterns in `website/src/components/`.
- **No AI-generated boilerplate** — keep all code purposeful and minimal.

---

## Development Setup

### API

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
SECRET_KEY=dev-secret uvicorn api.main:app --reload
```

### SDK

```bash
cd sdk
pip install -e ".[dev]"
pytest tests/ --tb=short
```

### Website

```bash
cd website
npm install
npm run dev
```

---

## Questions?

Open a GitHub issue or email **hello@rec0.ai**.

---

*© 2026 Yash Patel / rec0.ai — All contributions to this repository become the intellectual property of Yash Patel / rec0.ai per the CLA above.*

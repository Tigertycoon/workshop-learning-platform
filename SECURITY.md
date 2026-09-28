# Security and deployment scope

This repository is a **local portfolio demo**, intended to bind to loopback. Source publication is not approval to host the service publicly or process real learner information.

Implemented safeguards include required signing configuration, password hashing, expiring tokens, server-side role checks, request validation, bounded uploads, baseline response headers, transactional writes and authentication rate limits. CI checks dependencies and scans Git history for known secret patterns.

## Known limits

- Tokens use browser local storage. There is no password-reset or token-revocation workflow.
- Login/registration limits are per process and per IP. A shared workshop network can therefore share one limit.
- Registration is open on the local server; group codes are a convenience, not a sensitive-data access policy.
- Media and installed game assets are static and publicly readable. Only trusted game scripts may be hosted on this origin.
- Upload checks cover size, filename and extension, not content scanning or antivirus.
- A strict Content Security Policy is not enabled because optional WebGL builds need separate compatibility work.
- Production operations, HTTPS/proxy design, backups, retention, monitoring, load testing and an account-recovery process are outside this demo.

Before using real accounts or internet hosting, review these boundaries for the actual deployment. Do not reuse passwords or secrets from another service.

## Reporting

Do not include live credentials or personal data in public issues. Use GitHub private vulnerability reporting when available. Reproduce issues using the synthetic local demo and provide the affected route, expected behavior and sanitized steps.

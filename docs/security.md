# Security

## Repository Safety

This repository is designed to become public. It must contain only hackathon code and public interface definitions. Private LitClinic source, data exports, infrastructure configuration, internal modules, and credentials are prohibited.

The ignore policy blocks environment files, private key and certificate formats, credential directories, dependency trees, build output, logs, and common local deployment state.

## Secret Handling

- Keep local values in an ignored `.env` variant.
- Keep `.env.example` limited to documented names with empty values.
- Use scoped development credentials, never production credentials.
- Store CI and deployment credentials in the selected platform's encrypted secret store.
- Rotate a credential immediately if it is committed, even if the commit is later removed.
- Never log authorization headers, cookies, signatures, wallet secrets, or provider responses that contain credentials.

Run the repository scan before each commit:

```bash
bun run secret:scan
```

CI also runs a dedicated history and content scan. Automated scanning reduces risk but does not replace review.

## Application Security Baseline

When applications are implemented:

- Validate all external input at the boundary.
- Apply least-privilege authorization to every operation.
- Use short-lived sessions or scoped machine tokens.
- Verify webhook signatures against the raw request body.
- Add timestamp and unique event ID checks against replay.
- Use explicit network allowlists and trusted contract metadata.
- Bound request size, execution time, retries, and external calls.
- Redact sensitive fields from errors and observability data.

## Wallet and Contract Safety

Wallet connection must not request a signature. Do not use `eth_sign` or unlimited approvals. Before any transaction, validate chain ID, contract address, function selector, arguments, native value, and token amount. Simulate writes and estimate gas where supported.

Contract addresses must come from reviewed, version-controlled deployment metadata. No mainnet or production deployment is included in this scaffold.

## Private LitClinic Boundary

The extension receives only the minimum data required through an approved API, SDK, webhook, or onchain interface. It must not connect directly to the private production database or reuse private administrator credentials.

## Reporting

Until a public security contact is selected, report potential vulnerabilities privately to the repository owner. Do not include exploit details or credentials in public issues.

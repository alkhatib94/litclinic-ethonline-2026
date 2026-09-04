# Care Agent Context Layer

## Purpose

The Care Agent Context Layer gives a future healthcare coordination agent a small, typed view of a wallet's public LitClinic state. It separates the public ETHOnline extension from LitClinic's private source code, database models, credentials, and infrastructure.

This phase does NOT expose medical records or clinical data to the AI agent.

The layer is read-only. It cannot initiate agent actions, payments, blockchain transactions, or changes to LitClinic.

## Public Contract

Version 1 requires:

- Contract version
- Ethereum wallet address
- Whether an account exists
- Explicit booleans describing whether agent actions and payments may be requested
- Generation timestamp and LitClinic source marker

Version 1 optionally allows:

- Chain ID
- Public pseudonymous display name
- ENS name
- Public account tier
- Aggregated onchain activity count
- Last onchain activity timestamp

Optional fields are omitted when LitClinic does not expose or cannot verify them. A missing value must not be inferred.

Future versions may add new allowlisted, non-sensitive fields through a reviewed schema version. The version 1 validator strips unknown properties so an upstream addition cannot silently reach API consumers.

## Intentionally Excluded Data

The contract excludes:

- Diagnoses
- Medications
- Prescriptions
- Medical records
- Email addresses
- Phone numbers
- Legal or full names
- Database identifiers
- Internal roles
- Authentication tokens
- Private notes
- Raw database objects

The optional `displayName` is reserved for a user-approved public pseudonym. An upstream implementation must not map a legal or full name into this field.

## Privacy Boundary

The private LitClinic service is responsible for mapping its internal state into the public contract. The ETHOnline repository never reads the private database and does not import private modules.

The SDK applies a strict allowlist to every successful response. Unknown top-level and nested properties are removed. Wallet addresses, timestamps, numeric ranges, provenance, and schema version are validated before data reaches the extension API.

Service credentials remain server-side. Errors contain stable codes and generic messages, never response bodies, authorization headers, or token values.

## Mock Mode

Set `LITCLINIC_CONTEXT_MODE` to `mock` for offline development.

Mock responses are deterministic for each valid wallet. They contain a pseudonymous demo label, a derived activity count, fixed demo timestamps, and no medical or personally identifiable information. Mock permissions never allow payment requests.

No network request or credential is required in mock mode.

## Remote Mode

Set `LITCLINIC_CONTEXT_MODE` to `remote` and configure:

- `LITCLINIC_API_URL`
- `LITCLINIC_SERVICE_TOKEN`
- `LITCLINIC_CONTEXT_ENDPOINT`

The endpoint is deliberately not hardcoded because no private production endpoint is assumed. It must be a relative path containing exactly one `{wallet}` placeholder. The SDK sends an authenticated HTTPS GET request, except that localhost HTTP is allowed for development.

Remote responses must implement the public version 1 contract directly. HTTP errors, network failures, timeouts, oversized payloads, malformed JSON, unsupported versions, invalid schemas, and wallet mismatches are rejected with typed errors.

## API

The extension API exposes:

- `GET /health`
- `GET /api/v1/context/:wallet`

Successful context responses use `{ "ok": true, "data": ... }`. Failures use a stable `{ "ok": false, "code": "...", "message": "..." }` envelope. Responses are marked `no-store`.

## Future AI-Agent Usage

A future agent may consume this context to decide which non-clinical coordination flow to present. Permission fields describe whether a request may be offered, not whether an action has already been authorized.

AI inference, consent workflows, action execution, and payment handling are outside Phase 1.

## Future Sponsor Integration Points

Sponsor adapters may later consume the public context through independent modules for identity, agent orchestration, onchain reads, storage, or transaction simulation. No sponsor integration is selected or claimed in Phase 1.

Each future adapter must document its data flow, permissions, retention, failure behavior, and whether data leaves the extension before implementation.

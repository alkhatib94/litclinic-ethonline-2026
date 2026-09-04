# Integration Boundary

## Boundary Model

```text
Private LitClinic
        |
        | HTTPS / SDK / onchain calls
        v
ETHOnline Extension
        |
        +-- AI agent
        +-- Partner integrations
        +-- Smart contracts
        +-- Onchain data
```

The private product is a separate system. The extension must operate against explicit, versioned interfaces and must not depend on its source layout, database schema, internal imports, or deployment access.

## Supported Boundary Types

### HTTPS API

Use HTTPS for synchronous application requests. Every endpoint should define:

- Versioned request and response schemas
- A stable success and error envelope
- Authentication and authorization requirements
- Rate limits, idempotency behavior, and timeouts
- Data classification and retention expectations

Only the minimum data needed for the extension should cross this boundary.

### SDK Package

The public SDK wraps approved HTTP or onchain interfaces. It must not embed credentials, private implementation logic, production hostnames, or undocumented fallback behavior.

The SDK should provide:

- Typed inputs and outputs
- Explicit network and endpoint configuration
- Bounded retries for safe operations
- Structured errors with no sensitive payload leakage
- Test doubles for local development

### Smart Contracts

Onchain reads and writes use reviewed ABIs and trusted, version-controlled deployment metadata. Before any write, clients must validate chain ID, target address, function selector, arguments, native value, and token amount. Transactions should be simulated when the network supports it.

### Webhooks and Events

Webhook requests require:

- Signature verification over the raw request body
- Timestamp validation and replay protection
- Unique event IDs and idempotent handling
- Bounded payload size
- Redacted logs

Event schemas should be versioned independently from application releases.

## Authentication

Machine-to-machine requests should use a scoped token or signed request designed for the extension. User authorization should use an approved short-lived session or wallet proof flow. Wallet connection alone must not trigger a signature request.

No current LitClinic production credential will be reused or copied into this repository.

## Module Contract

Each partner adapter should implement a narrow interface:

```ts
export interface PartnerAdapter<Input, Output> {
  execute(input: Input, signal?: AbortSignal): Promise<Output>;
}
```

Adapters should be independently configurable, testable, replaceable, and removable. A partner failure must not require changes to unrelated integrations.

## First Interface

Phase 1 implements the read-only Care Agent Context boundary and a deterministic local mock. The upstream path remains configurable until an approved private LitClinic endpoint exists. Any mutating endpoint requires a separate threat review and explicit approval.

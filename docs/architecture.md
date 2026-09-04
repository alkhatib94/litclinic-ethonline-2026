# Architecture

## Goals

The ETHOnline extension must be independently understandable, testable, and deployable. It must not require access to LitClinic's private source tree, database, internal modules, or production credentials.

The scaffold reserves modules without selecting an application framework prematurely:

- `apps/web` for a user-facing experience if required
- `apps/api` for extension-owned HTTP or webhook endpoints
- `packages/sdk` for typed communication with approved LitClinic interfaces
- `packages/shared` for public transport and domain types
- `packages/config` for validated runtime configuration
- `contracts` for contracts created during the hackathon
- `integrations` for isolated partner adapters

## Component Boundaries

### Applications

Applications orchestrate user flows. They may depend on public packages and integration adapters, but they must not contain LitClinic production credentials or import private LitClinic modules.

### SDK

The SDK is the only default boundary for private LitClinic HTTP integration. It will own request authentication, timeouts, error normalization, and typed public contracts after an interface is approved.

### Shared

Shared code is limited to data structures and utilities that are safe to publish. Proprietary domain logic belongs in the private product and must be exposed only through a reviewed interface.

### Config

Configuration is injected at runtime. Contract addresses, chain identifiers, endpoints, and feature settings must be validated before use. Secrets must never be placed in client bundles.

### Contracts

Hackathon contracts will be self-contained, tested, and documented with deployment records when implemented. No production transaction or deployment is part of the initial scaffold.

### Integrations

Each partner receives its own adapter directory and environment namespace. An adapter must define its inputs, outputs, permissions, failure behavior, and data retention before use.

## Data Flow

1. A user or event reaches an extension application.
2. The application validates untrusted input.
3. The application calls an isolated integration, the typed LitClinic SDK, or a reviewed smart contract.
4. Responses are normalized into public shared types.
5. Logs exclude credentials, authorization headers, sensitive health information, and private production payloads.

## Deployment

Deployment targets are intentionally undecided. Applications should remain container-friendly and receive configuration at runtime. Production LitClinic deployment remains separate and is not managed by this repository.

## Current Implementation Status

Only repository boundaries and minimal public types exist. Web, API, AI, partner, and contract functionality are not implemented.

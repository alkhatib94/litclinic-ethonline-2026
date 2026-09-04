# LitClinic - ETHOnline 2026

## Overview

This repository is the standalone workspace for new LitClinic functionality developed during ETHOnline 2026. It starts as a minimal, security-conscious monorepo so the event architecture can evolve without exposing or coupling to the private production application.

Current status: Phase 1 implements a read-only Care Agent Context Layer with a typed SDK, mock and remote providers, and a minimal API.

## Existing LitClinic Product

LitClinic is an existing health-themed Web3 product running on LitVM LiteForge. Its production application and source code predate ETHOnline 2026 and remain private.

The existing product is not hackathon work and is not included in this repository. This repository may consume explicitly documented public or authenticated interfaces exposed by LitClinic, subject to separate review.

## ETHOnline 2026 Extension

The extension is intended to support independently deployable modules for:

- AI agent capabilities
- Partner integrations
- Smart contracts
- Onchain data access
- A web or API surface when required

Phase 1 provides sanitized wallet context for a future healthcare coordination agent. It does not expose medical records or clinical data, run AI inference, request payments, or execute transactions.

## Architecture

The repository is organized around explicit boundaries:

1. Applications consume shared packages and integration adapters.
2. The SDK owns communication with approved LitClinic interfaces.
3. Partner adapters remain independent from each other.
4. Smart contracts expose reviewed onchain interfaces.
5. Secrets and private LitClinic implementation details stay outside this repository.

See [Architecture](docs/architecture.md), [Integration Boundary](docs/integration.md), and [Care Agent Context Layer](docs/context-layer.md).

## Repository Structure

```text
apps/
  web/          Optional public web application
  api/          Care Agent Context HTTP API
packages/
  sdk/          Typed authenticated LitClinic client
  shared/       Validated public context contract
  config/       Validated extension configuration
contracts/      Hackathon-specific smart contracts
integrations/   Independent partner adapters
docs/           Architecture, security, and disclosure
scripts/        Local validation utilities
```

The web application, partner adapters, AI inference, payments, and smart contracts remain intentionally unimplemented.

## Development

Prerequisites:

- Bun 1.3 or newer
- Node.js 20.19 or newer for compatible tooling

```bash
bun install
bun run typecheck
bun test
bun run secret:scan
```

Run the API in mock mode:

```bash
LITCLINIC_CONTEXT_MODE=mock bun run dev:api
```

On PowerShell:

```powershell
$env:LITCLINIC_CONTEXT_MODE="mock"
bun run dev:api
```

## Environment Variables

Copy `.env.example` to a local ignored environment file and provide only development or test credentials. Never commit secrets.

The Phase 1 configuration contract covers:

- Context mode
- Approved LitClinic API base URL
- Scoped service token
- Configurable context endpoint path
- Local API port

No production values are included.

## Security

This repository denies environment files, private keys, certificates, credential directories, build output, and dependency trees through `.gitignore`. A local secret scanner and CI secret scan provide additional safeguards.

See [Security](docs/security.md).

## Hackathon Disclosure

LitClinic existed before ETHOnline 2026. Only work committed to this repository during the event will be presented as hackathon work.

See [ETHOnline Disclosure](docs/ethonline-disclosure.md).

## Partner Integrations

[To be implemented during ETHOnline]

No partner integration is claimed or configured yet. Each selected integration will use an isolated adapter and document its required permissions and data flow.

## Demo

Print deterministic sanitized mock context:

```bash
bun run demo:context 0x0000000000000000000000000000000000000001
```

The same command uses the remote provider when remote mode and its required environment variables are configured. It never prints the service token.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

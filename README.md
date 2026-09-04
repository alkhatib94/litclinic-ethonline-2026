# LitClinic - ETHOnline 2026

## Overview

This repository is the standalone workspace for new LitClinic functionality developed during ETHOnline 2026. It starts as a minimal, security-conscious monorepo so the event architecture can evolve without exposing or coupling to the private production application.

Current status: repository foundation only. Hackathon features are [To be implemented during ETHOnline].

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

The exact event scope is [To be implemented during ETHOnline].

## Architecture

The repository is organized around explicit boundaries:

1. Applications consume shared packages and integration adapters.
2. The SDK owns communication with approved LitClinic interfaces.
3. Partner adapters remain independent from each other.
4. Smart contracts expose reviewed onchain interfaces.
5. Secrets and private LitClinic implementation details stay outside this repository.

See [Architecture](docs/architecture.md) and [Integration Boundary](docs/integration.md).

## Repository Structure

```text
apps/
  web/          Optional public web application
  api/          Optional extension API
packages/
  sdk/          Typed LitClinic boundary client
  shared/       Shared public types
  config/       Validated extension configuration
contracts/      Hackathon-specific smart contracts
integrations/   Independent partner adapters
docs/           Architecture, security, and disclosure
scripts/        Local validation utilities
```

Application and contract implementations are intentionally absent until the event scope is selected.

## Development

Prerequisites:

- Bun 1.3 or newer
- Node.js 20.19 or newer for compatible tooling

```bash
bun install
bun run check
```

Development commands will be added with the first implemented application.

## Environment Variables

Copy `.env.example` to a local ignored environment file and provide only development or test credentials. Never commit secrets.

The planned configuration contract covers:

- LitClinic API endpoint and scoped access token
- Chain ID and RPC endpoint
- AI provider credential
- Partner integration credentials
- Webhook signing secret

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

[To be implemented during ETHOnline]

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE).

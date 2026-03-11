# AGENTS.md

## Project Overview

CardPointe CLI tool for managing billing plans and payments. Uses two APIs:
- **CoPilot API** – Billing plans (Bearer token, OAuth)
- **CardPointe Gateway API** – Profiles (Basic Auth)

## Documentation Maintenance

**When making code changes, keep these files in sync:**

| Change type | Update these files |
|-------------|--------------------|
| New commands | `README.md` (Usage, Available Commands), `docs/cli-commands-reference.md` |
| Config format or options | `README.md` (Configuration), `config-local.yaml-example` |
| New profiles or env vars | `README.md`, `config-local.yaml-example` |
| API or behavior changes | `README.md`, `docs/api-reference.md` or `docs/cli-commands-reference.md` |

**Checklist after edits:**
- [ ] README.md reflects new usage, config, or commands
- [ ] config-local.yaml-example has current format if config changed
- [ ] docs/cli-commands-reference.md lists new/updated commands

## Setup

- Install: `npm install`
- Config: `~/.fiserv-cli` or `config-local.yaml` (see `config-local.yaml-example`)
- Run: `./bin/fiserv-cli` or `node bin/fiserv-cli`

## Config Format

Profiles use `copilot.*` and `cardpointe.*` for separate credentials. Old flat format is supported for backwards compatibility.

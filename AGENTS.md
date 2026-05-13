# AGENTS.md

Guidance for AI coding agents (Claude Code, etc.) working in this repo. `CLAUDE.md` points here.

## Project Overview

CardPointe CLI for managing billing plans and payments. Talks to **two distinct CardPointe/Fiserv APIs**. Choosing the wrong one is the most common mistake — they have different auth, base URLs, and credential fields:

| API | Base URL pattern | Auth | Used by |
|---|---|---|---|
| **CoPilot** | `global.<env>.copilot_api_url` (e.g. `https://api-uat.cardconnect.com`) | OAuth password grant → Bearer token from `token_endpoint` | `commands/billingplan.js` via `CardPointeAPI` |
| **CardPointe Gateway** | `global.<env>.cardpointe_api_url` (e.g. `https://<site>-uat.cardconnect.com/cardconnect/rest/`) — `<site>` placeholder is replaced with `config.sitename` | HTTP Basic | `commands/profile.js`; also called inline from `billingplan.export` for profile lookups |

Both clients live in `lib/api-client.js`. The `production: true/false` flag on a profile selects the `global.production` vs `global.uat` block from `config-global.yaml`.

## Commands

- Install: `npm install`
- Run CLI: `./bin/fiserv-cli <command>` (or `node bin/fiserv-cli`)
- All tests: `npm test`
- Watch / coverage: `npm run test:watch` / `npm run test:coverage`
- Single test file: `npx jest tests/unit/auth.copilot.test.js`
- Single test by name: `npx jest -t "<pattern>"`
- Run a unit test via the CLI: `./bin/fiserv-cli test <name>` (e.g. `test auth.copilot`). `UNIT_TESTS` in `commands/test.js` must list new test files.
- Live credential check (hits real API): `./bin/fiserv-cli test -p <profile> auth.cardpointe <merchantId>`

## Config resolution (multiple files merge — read before editing)

`bin/fiserv-cli` is the entry point and owns config loading. The flow:

1. Load `config-global.yaml` (checked in — endpoints, API versions, command-level URL overrides).
2. Load user config from the first of: `~/.fiserv-cli`, `~/.cardpointe-cli` (legacy), or `./config-local.yaml`. **Permissions are forced to 0600** on these files at startup.
3. Merge global ← user, pick the active profile (CLI `-p <name>` > `config.profile` > first profile key).
4. Flatten profile credentials: nested `copilot.{username,password,client_id,client_secret}` and `cardpointe.{username,password}` become top-level `username` / `password` / `client_id` / `client_secret` / `cardpointe_username` / `cardpointe_password`. The flat (legacy) format is still supported as a fallback. **Both keep working — preserve this when editing `flattenCredentials`.**
5. Export some values to `process.env` (`CARDCONNECT_CLIENT_ID`, etc.) without overriding values already set there. Env vars beat config.

`config-global.yaml` also has a `command.<name>` block that can override `copilot_api_url` per-command per-env (see `applyCommandConfig` in `commands/billingplan.js`). The `billingplan` command currently uses this to point at a different host than the generic CoPilot base.

Profiles use `copilot.*` and `cardpointe.*` for separate credentials. Old flat format is supported for backwards compatibility.

## Command wiring

Every subcommand in `bin/fiserv-cli` is registered against `program`, tagged with `cmd.api = 'copilot' | 'gateway' | 'other'` for grouped help output (see `setupCustomHelp`), and resolves its own profile via `loadConfigWithProfile(profileName)` before delegating to a handler in `commands/`. Keep this pattern when adding commands — handlers receive `(positionalArgs..., options, activeConfig)` and should not re-read config.

## `billingplan.export` specifics

- Reads CSV from arg or stdin; row 1 is the header.
- Plan-ID column auto-detected via `findPlanIdColumnIndex` (tries `billingPlanId`, `planId`, `id`, normalizing case/punctuation). Override with `--plan-id-column`.
- Merchant-ID column similarly auto-detected (tries `merchant_id`, `merchantId`, `merchId`, `mid`, `location`). Override with `--merchant-id-column`.
- For each row: fetches the billing plan via CoPilot, then — if `profileId` is present — also fetches the gateway profile (cached per `profileId::accountId::merchId`). Both responses are flattened into dotted-key columns (`billingPlan.foo.bar`, `profile.x.y`) appended to the input columns.
- Default output is stdout (so the command can be piped); `-o <file>` writes to disk.

## Conventions

- New unit test files must be added to the `UNIT_TESTS` array in `commands/test.js` to be runnable via `fiserv-cli test`.
- Verbose debug output (request URL/method/headers) is gated on `options.verbose` / `-v`; route new debug logging through the same flag and to `stderr` (`console.error`) so it does not corrupt stdout CSV/JSON output.

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

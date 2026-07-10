# Otterware

Otterware is a private, organization-aware artifact platform for people and agents. It provides a TanStack Start web app, immutable artifact versioning on Cloudflare, and the `otterware` CLI.

## What is included

- `apps/web` — TanStack Start application and versioned REST API on Cloudflare Workers.
- `apps/cli` — installable Node.js CLI with browser/device login and JSON output.
- `packages/contracts` — Zod request and response contracts shared by both clients.
- Cloudflare D1 — users, sessions, organizations, memberships, API keys, artifact metadata, versions, uploads, and audit events.
- Private Cloudflare R2 — immutable artifact file bodies.
- Better Auth — Google login, organizations, invitations, device authorization, and hashed organization API keys.

Uploaded HTML is served from `usercontent.otterware.dev`, not the authenticated application origin. Short-lived, version-scoped grants protect the private R2 objects and keep executable content away from application cookies.

## Requirements

- Node.js 24 Active LTS
- pnpm 11.9 or newer
- A Cloudflare account with Workers, D1, and R2 enabled
- Google OAuth credentials for production login

## Local development

```bash
git clone https://github.com/ckafrouni/otterware.git
cd otterware
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm db:migrate:local
pnpm dev
```

The development server runs at `http://localhost:3000`. When Google credentials are omitted, local email/password authentication is enabled. Production enables Google OAuth and disables password authentication.

Run all verification:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Install the CLI from a clone

On macOS, Linux, or an agent VM:

```bash
pnpm install
pnpm --dir apps/cli build
pnpm --dir apps/cli link --global
otterware --help
```

After a future npm release, installation becomes:

```bash
npm install --global otterware
```

## Install the agent skill

The repository includes the `otterware-artifacts` skill for Codex, Claude Code, OpenClaw, Hermes, and other agents supported by skills.sh. Install it with:

```bash
npx skills@latest add ckafrouni/otterware \
  --skill otterware-artifacts
```

The installer detects available agents and lets you select the targets. To install directly for Codex without prompts:

```bash
npx skills@latest add ckafrouni/otterware \
  --skill otterware-artifacts \
  --agent codex \
  --yes
```

From a local clone, use `npx skills@latest add . --skill otterware-artifacts`. The skill teaches agents to use private versus organization scope correctly, inspect before mutating, publish curated output directories, protect credentials, and push immutable versions with concurrency checks.

Authenticate a human-controlled machine with the browser device flow:

```bash
otterware auth login --url https://app.otterware.dev
otterware auth status
otterware organizations list
otterware organizations use <organization-id>
```

For an unattended organization agent, create a scoped key in the web settings and provide it through the environment rather than placing it in a prompt:

```bash
export OTTERWARE_TOKEN='otw_...'
otterware artifacts list
```

Device login represents a user and can access that user's private artifacts. Organization API keys can only access organization artifacts.

## Artifact commands

```bash
# Create an artifact and immutable version 1
otterware artifacts create ./dist \
  --slug product-demo \
  --title "Product demo" \
  --description "Interactive prototype" \
  --visibility private \
  --label "Initial version"

# Publish version 2, failing if another actor already published a version
otterware artifacts push product-demo ./dist \
  --label "Added mobile layout" \
  --if-version 1

otterware artifacts list
otterware artifacts show product-demo
otterware artifacts versions product-demo
otterware artifacts files product-demo --version 2
otterware artifacts read product-demo index.html --version 2
otterware artifacts pull product-demo ./download --version 2
otterware artifacts promote product-demo --version 1
otterware artifacts update product-demo --visibility organization
otterware artifacts archive product-demo
otterware artifacts restore product-demo
```

Every command supports `--json` at the root for automation. Configuration is stored with mode `0600` under `${XDG_CONFIG_HOME:-~/.config}/otterware/config.json`. `OTTERWARE_TOKEN`, `OTTERWARE_URL`, `OTTERWARE_PROFILE`, and `OTTERWARE_ORGANIZATION` override stored values.

## Cloudflare setup

R2 must first be enabled in the Cloudflare dashboard. Then create the resources:

```bash
cd apps/web
pnpm exec wrangler d1 create otterware
pnpm exec wrangler r2 bucket create otterware-artifacts
```

Replace the placeholder `database_id` in `apps/web/wrangler.jsonc` with the D1 ID printed by Wrangler.

Configure production secrets:

```bash
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put CONTENT_SIGNING_KEY
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

The Google OAuth redirect URI is:

```text
https://app.otterware.dev/api/auth/callback/google
```

Apply schema and deploy:

```bash
pnpm db:migrate:remote
pnpm deploy
```

Attach `app.otterware.dev` and `usercontent.otterware.dev` as Worker custom domains. The raw-content handlers reject production requests that do not arrive on the configured content hostname.

For the legacy hostname, configure `artifacts.otterware.dev/a/*` and `/l` to redirect to the corresponding `app.otterware.dev` routes after migration. Remove Cloudflare Access from the new app only after Better Auth is verified.

## Production trust boundary

Artifact agents receive only Otterware device tokens or scoped API keys. They must not have Cloudflare API tokens, R2 credentials, production deployment credentials, or unreviewed access to the protected deployment branch.

Production deployment belongs in a protected CI environment. After cutover, rotate and remove the existing Cloudflare token from OpenClaw and Hermes.

## Legacy migration

Once the new deployment is available and `OTTERWARE_TOKEN` is set, import the current static hub:

```bash
OTTERWARE_URL=https://app.otterware.dev \
OTTERWARE_TOKEN=otw_... \
pnpm migrate:legacy
```

The importer creates each artifact from version 1 and pushes every later immutable version in order. It never edits the old deployment.

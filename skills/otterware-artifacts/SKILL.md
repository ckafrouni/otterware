---
name: otterware-artifacts
description: Manage Otterware artifacts with the otterware CLI. Use when an agent needs to authenticate with Otterware, select a personal or organization workspace, create or publish static content, inspect or retrieve artifact files, manage immutable versions, update metadata, open previews, or archive and restore artifacts.
---

# Otterware Artifacts

Use the installed `otterware` CLI as the only boundary for artifact operations. Do not access Cloudflare, D1, R2, deployment credentials, or storage objects directly.

## Establish context

1. Verify the executable and version:

   ```bash
   command -v otterware
   otterware --cli-version
   ```

2. If it is missing, require Node.js 24 LTS and install the official npm package:

   ```bash
   npm install --global otterware@latest
   otterware --cli-version
   ```

   The official package is `otterware` and its repository metadata points to `https://github.com/ckafrouni/otterware`. When developing the CLI itself inside a clean Otterware checkout, use `pnpm install --frozen-lockfile`, `pnpm --dir apps/cli build`, and `npm install --global ./apps/cli`. Preserve existing checkout changes and never replace them automatically.

3. Check authentication before doing work:

   ```bash
   otterware --json auth status
   ```

4. If login is required, ask the user to complete the human-controlled device flow:

   ```bash
   otterware auth login --url https://app.otterware.dev
   ```

   Do not approve a device request on the user's behalf. For unattended agents, prefer a scoped organization API key supplied through `OTTERWARE_TOKEN`. Never print, commit, log, or place credentials in a prompt.

## Choose access scope

- Default new artifacts to `private` unless the user explicitly requests collaboration.
- Use `organization` only after identifying the intended organization.
- Inspect available organizations with `otterware --json organizations list`.
- Treat `otterware organizations use <id>` as a persistent configuration change. Use it only when the intended workspace is clear.
- A device-login token represents a user and may access that user's private artifacts. Organization API keys are restricted to organization artifacts.
- Use `--profile <name>` for separate accounts or deployments. Put global options before the command for clarity.

## Inspect before changing

Resolve an artifact by ID or slug, then inspect its metadata and versions:

```bash
otterware --json artifacts show <artifact>
otterware --json artifacts versions <artifact>
otterware --json artifacts files <artifact> --version <number>
```

Use `otterware artifacts read` for one file and `pull` for a full version. Prefer a temporary or explicitly approved destination when pulling; do not overwrite an existing working tree blindly.

## Publish safely

Use `create` only for a new artifact. It creates both the artifact and immutable version 1:

```bash
otterware --json artifacts create <output-directory> \
  --slug <slug> \
  --title <title> \
  --visibility private \
  --label "Initial version"
```

Publish a new immutable version of an existing artifact with `push`:

```bash
otterware --json artifacts push <artifact> <output-directory> \
  --label <summary> \
  --if-version <observed-current-version>
```

Always use `--if-version` for agent-driven updates. If it conflicts, stop, re-read the latest artifact and versions, compare the competing work, and report the conflict. Never retry with a newer version number without understanding what changed.

Publish a curated build/output directory, not a repository root. Before upload, inspect all files recursively for secrets, environment files, credentials, source maps, caches, and unrelated content. The CLI uploads every regular file in the selected directory except `.DS_Store` and `.otterware.json`; it rejects symbolic links. Use `--entry` when the entry file is not `index.html`.

## Distinguish operations

- `create`: create metadata and version 1 for a new artifact.
- `push`: upload content as a new immutable version.
- `update`: change title, description, slug, or visibility without publishing files.
- `promote`: make an existing version current without rewriting it.
- `archive` / `restore`: change whether the artifact is active.

Require clear user intent before changing visibility, promoting an older version, or archiving an artifact. Do not simulate version edits: published versions and their files are immutable.

## Return useful results

Use root `--json` for automation and parse fields rather than terminal prose. After a mutation, report the artifact ID or slug, resulting version, visibility, and preview URL. Do not expose authentication material in the report.

Read [references/cli.md](references/cli.md) when exact command flags, environment overrides, or retrieval examples are needed.

# Otterware CLI reference

## Global options and environment

```text
otterware --json <command>             Machine-readable output
otterware --profile <name> <command>   Named local profile
otterware --cli-version                Installed CLI version
```

Environment overrides:

```text
OTTERWARE_TOKEN          Device token or otw_ organization API key
OTTERWARE_URL            Application base URL
OTTERWARE_PROFILE        Active profile name
OTTERWARE_ORGANIZATION   Active organization ID
```

Stored credentials live at `${XDG_CONFIG_HOME:-~/.config}/otterware/config.json` with mode `0600`. Prefer environment injection for unattended agents. Never echo an environment variable containing a credential.

## Authentication

```bash
otterware auth login --url https://app.otterware.dev
otterware --json auth status
otterware auth logout
otterware auth config-path
```

`auth login` uses a browser device-authorization flow. `auth logout` removes locally stored credentials for the selected profile.

## Organizations

```bash
otterware --json organizations list
otterware --json organizations create "Organization name" --slug organization-slug
otterware organizations use <organization-id-or-slug>
```

Organization creation and workspace selection are state-changing operations. Do them only when requested or clearly necessary to the user's task.

## Artifact discovery and inspection

```bash
otterware --json artifacts list
otterware --json artifacts list --visibility private
otterware --json artifacts list --visibility organization
otterware --json artifacts list --archived
otterware --json artifacts show <artifact-id-or-slug>
otterware --json artifacts versions <artifact>
otterware --json artifacts files <artifact> --version <number>
```

`list` defaults to 50 results. Use `--limit <number>` when necessary.

## Creating and publishing

Create a private artifact and version 1:

```bash
otterware --json artifacts create ./dist \
  --slug product-demo \
  --title "Product demo" \
  --description "Interactive prototype" \
  --visibility private \
  --entry index.html \
  --label "Initial version"
```

Create an organization artifact only after selecting the organization:

```bash
otterware organizations use <organization>
otterware --json artifacts create ./dist \
  --slug shared-demo \
  --title "Shared demo" \
  --visibility organization
```

Push a concurrency-protected version:

```bash
otterware --json artifacts push product-demo ./dist \
  --label "Improve mobile layout" \
  --if-version 3
```

The source may be one file or a directory. A directory uses `index.html` as its default entry. A single file uses itself. Otherwise provide `--entry <relative-path>`.

## Metadata and lifecycle

```bash
otterware --json artifacts update <artifact> --title "New title"
otterware --json artifacts update <artifact> --description "New description"
otterware --json artifacts update <artifact> --visibility organization
otterware --json artifacts promote <artifact> --version <number>
otterware --json artifacts archive <artifact>
otterware --json artifacts restore <artifact>
```

`update` does not create a content version. `promote` changes which immutable version is current.

## Reading and downloading

Read the current entry file to standard output:

```bash
otterware artifacts read <artifact>
```

Read a specific text file or save a binary file:

```bash
otterware artifacts read <artifact> index.html --version 2
otterware artifacts read <artifact> image.png --version 2 > image.png
```

Download a full version:

```bash
destination="$(mktemp -d)"
otterware --json artifacts pull <artifact> "$destination" --version 2
```

Open the current preview in a browser only when a browser action is useful:

```bash
otterware artifacts open <artifact>
```

## Failure handling

- Authentication failure: run `auth status`; ask the user to log in or supply a scoped key through the environment.
- Permission failure: confirm private versus organization scope, membership, active organization, and API-key permissions. Do not seek broader infrastructure credentials.
- Version conflict: inspect the latest version and stop for reconciliation.
- Missing entry: pass an existing relative path with `--entry`.
- Symbolic-link rejection: materialize the intended files into a clean output directory; do not bypass the check.
- Network or server failure: preserve local source, report the error, and retry only when the operation is known to be idempotent. Inspect the artifact before retrying `create` or `push`.

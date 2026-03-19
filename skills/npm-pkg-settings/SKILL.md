---
name: npm-pkg-settings
description: Manages npm package publish settings — listing packages, viewing/updating access controls, linking trusted publishers, adding maintainers, and generating OTP codes. Use when automating npm package configuration, setting up trusted publishers for provenance, managing 2FA publishing access, or bulk-updating npm packages.
---

# npm-pkg-settings

CLI and programmatic API for managing npm package publish settings. Works by automating the npm website via browser-impersonating HTTP requests (`curl_chrome145`), since npm has no public API for package settings. Automatically handles OTP generation and submission during all operations.

## Setup

### Environment variables

Set in `.env` (auto-loaded by CLI) or export in shell:

| Variable | Required | Description |
|----------|----------|-------------|
| `NPM_OTP_SECRET` | Yes | Base32 TOTP secret for OTP generation |
| `NPM_USERNAME` | No | Enables auto-login (skipped if session is valid) |
| `NPM_PASSWORD` | No | Enables auto-login (skipped if session is valid) |

### Getting the OTP secret

Extract from npm's 2FA setup QR code:

```bash
# From a QR code screenshot
npm-pkg-settings decode-secret ./qr-code.png

# From an otpauth-migration:// URL (e.g. from Google Authenticator export)
npm-pkg-settings decode-secret 'otpauth-migration://offline?data=...'
```

### Session and gitignore

The CLI persists a browser session to `.npm-pkg-settings.session.txt`. Add to `.gitignore`:

```
.npm-pkg-settings.session.txt
.env
```

If a session expires, the tool re-authenticates automatically (requires `NPM_USERNAME` and `NPM_PASSWORD`).

## CLI

| Command | Usage | Description |
|---------|-------|-------------|
| `list` | `list [--sort date] [--json]` | List all packages on your account |
| `view` | `view <package>` | Show package access, provenance, trusted publishers, maintainers |
| `update` | `update <package> [flags]` | Modify package settings (combinable flags) |
| `otp` | `otp` | Generate a one-time password |
| `decode-secret` | `decode-secret <image-or-url>` | Extract TOTP secret from QR image or `otpauth-migration://` URL |

### `update` flags

All flags can be combined in a single call. Changes are previewed before applying (skip with `--yes`).

| Flag | Format | Effect |
|------|--------|--------|
| `--publishing-access` | `strict` or `default` | `strict` = 2FA always. `default` = tokens bypass 2FA |
| `--trusted-publisher` | `github:owner/repo?workflow=release.yml` | Link GitHub Actions trusted publisher |
| `--trusted-publisher` | `gitlab:ns/project?ci-file=.gitlab-ci.yml` | Link GitLab CI/CD trusted publisher |
| `--trusted-publisher` | `...&environment=production` | Append to set environment constraint |
| `--add-maintainer` | npm username | Add a collaborator |
| `--yes` / `-y` | — | Skip confirmation prompt |

GitHub trusted publishers are validated (repo existence, workflow file) before applying.

## Common workflows

### Bulk-update all packages (trusted publisher + strict 2FA)

```bash
# Get package names as JSON array, then loop
npm-pkg-settings list --json | jq -r '.[].name' | while read -r pkg; do
  npm-pkg-settings update "$pkg" \
    --trusted-publisher "github:owner/repo?workflow=release.yml" \
    --publishing-access strict \
    --yes
done
```

### Audit packages missing trusted publishers

```bash
# List all packages, then check each
for pkg in $(npm-pkg-settings list --json | jq -r '.[].name'); do
  settings=$(npm-pkg-settings view "$pkg" 2>&1)
  if ! echo "$settings" | grep -q "Trusted publishers"; then
    echo "MISSING: $pkg"
  fi
done
```

### Generate OTP for manual npm operations

```bash
npm-pkg-settings otp
# Output: 123456
#         expires in 18s
```

## Programmatic API

```ts
import { createClient } from 'npm-pkg-settings'

const client = createClient({
  otpSecret: process.env.NPM_OTP_SECRET!,
  username: process.env.NPM_USERNAME,      // optional — enables login()
  password: process.env.NPM_PASSWORD,      // optional — enables login()
  sessionFile: '.npm-pkg-settings.session.txt', // optional, this is the default
})
```

### Client methods

| Method | Signature | Notes |
|--------|-----------|-------|
| `login` | `() => Promise<{ skipped: boolean }>` | Skips if session valid. Requires username + password |
| `listPackages` | `() => Promise<PackageListItem[]>` | All packages on the account |
| `getPackageAccess` | `(name: string) => Promise<PackageSettings>` | Full settings for one package |
| `setPublishingAccess` | `(name: string, access: string) => Promise<void>` | Use raw API values (see table below) |
| `linkTrustedPublisher` | `(name: string, publisher: TrustedPublisher) => Promise<void>` | GitHub or GitLab |
| `addMaintainer` | `(name: string, npmUsername: string) => Promise<void>` | Add collaborator |
| `getUsername` | `() => Promise<string>` | Authenticated user's npm username |

### Bulk update example (programmatic)

```ts
const client = createClient({ otpSecret: process.env.NPM_OTP_SECRET! })
await client.login()

const packages = await client.listPackages()
for (const { name } of packages) {
  await client.linkTrustedPublisher(name, {
    type: 'github',
    owner: 'my-org',
    repository: name,
    workflow: 'release.yml',
  })
  await client.setPublishingAccess(name, 'tfa-always-required')
}
```

### Publishing access values

| API value (programmatic) | CLI flag value | Meaning |
|--------------------------|---------------|---------|
| `tfa-always-required` | `strict` | 2FA required for all publishes |
| `tfa-required-unless-automation` | `default` | 2FA required, automation tokens bypass |

### Key types

| Type | Fields |
|------|--------|
| `PackageListItem` | `name`, `version`, `description`, `isPrivate`, `isHighImpact`, `publisher`, `lastPublishTs`, `lastPublishRel`, `createdRel`, `updatedRel` |
| `PackageSettings` | `packageName`, `repository`, `publishingAccess`, `isPrivate`, `provenanceEnabled`, `oidcConnections[]`, `maintainers[{name, permissions}]` |
| `GitHubPublisher` | `type: 'github'`, `owner`, `repository`, `workflow`, `environment?` |
| `GitLabPublisher` | `type: 'gitlab'`, `namespace`, `project`, `ciFilePath`, `environment?` |

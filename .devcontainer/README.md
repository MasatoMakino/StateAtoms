# Dev Container Configuration

## Overview

This directory contains the development container configuration for StateAtoms project. The container provides a consistent Node.js 22 development environment with TypeScript support.

## Container Management

### Starting the Container

Use the devcontainer CLI to manage the container lifecycle:

```bash
# Start or create the container
devcontainer up --workspace-folder .

# Execute commands in the running container
devcontainer exec --workspace-folder . npm test
```

VS Code tasks are configured to use devcontainer CLI. See `.vscode/tasks.json` for available tasks.

### Migration from VS Code Dev Containers

This project has migrated from VS Code Dev Containers extension to devcontainer CLI for better credential isolation and editor independence.

**Key Changes:**
- Removed VS Code-specific settings from `devcontainer.json` (extensions, editor settings)
- All tasks use `devcontainer exec` instead of `docker exec`
- Credentials are isolated by default (no automatic forwarding)

## Credential Isolation

### Verification

The devcontainer CLI does **not** automatically forward credentials from the host to the container. You can verify this:

```bash
# Git global config should not exist
devcontainer exec --workspace-folder . git config --list --global
# Expected: fatal: unable to read config file '/home/node/.gitconfig': No such file or directory

# SSH auth socket should not be mounted
devcontainer exec --workspace-folder . env | grep SSH_AUTH_SOCK
# Expected: (no output)

# Git credential helper should not exist
devcontainer exec --workspace-folder . git config --list | grep credential
# Expected: (no output)

# GitHub environment variables should not exist
devcontainer exec --workspace-folder . env | grep -E "(GH_|GITHUB_)"
# Expected: No GitHub-related environment variables found
```

### Working with Git in the Container

Since credentials are isolated, you must configure Git authentication inside the container if needed:

```bash
# Enter the container
devcontainer exec --workspace-folder . /bin/bash

# Configure Git inside the container
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# For HTTPS authentication, use a personal access token
git config --global credential.helper store
```

**Note:** Container-level Git configuration is ephemeral and will be lost when the container is removed.

## Architecture

### Base Image

Uses Microsoft's official DevContainer image:
- **Image**: `mcr.microsoft.com/devcontainers/javascript-node:22`
- Based on Debian with Node.js 22 pre-installed
- Optimized for VS Code DevContainer compatibility

### Security Features

**Container Hardening:**
- `--cap-drop=ALL`: Removes all Linux capabilities for defense in depth
- `remoteUser: node`: Non-root user execution (UID:1000, GID:1000)
- Isolated credentials: No automatic credential forwarding from host

**npm Execution Isolation:**
- All npm commands execute exclusively in the container
- Host OS npm is never used, protecting against malicious package scripts
- Automatic `npm audit --audit-level=moderate` on container start

### node_modules Access Model

**Current Approach:**
- node_modules is stored on the host filesystem (no Docker volume)
- Host OS can read node_modules for IDE type definition support
- Enables IntelliSense, auto-completion, and type checking in host IDEs
- npm installation and script execution remain isolated in the container

**Security Trade-off:**
- **Previous**: Complete isolation via Docker named volumes (higher security, no IDE support)
- **Current**: npm execution isolated, node_modules accessible to host (balanced approach)
- Primary security boundary is the containerized npm execution environment

### Mount Configuration

```json
{
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/${localWorkspaceFolderBasename},type=bind,consistency=cached"
}
```

**Mount hierarchy:**
```text
/workspaces/StateAtoms/          (bind mount from host)
├── src/                          (host files)
├── .devcontainer/                (host files)
├── node_modules/                 (host files, npm managed in container)
└── package.json                  (host files)
```

## Container Features

- Node.js 22 runtime (Debian-based)
- Microsoft DevContainer image for IDE compatibility
- Security-hardened with dropped capabilities (`--cap-drop=ALL`)
- Isolated credentials (no automatic forwarding from host)
- Host-accessible node_modules for IDE type support
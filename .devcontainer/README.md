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

## Git Operations

**Important:** Git is **not installed** in the DevContainer. All Git operations (commit, push, etc.) must be performed on the host OS.

### Why Git is Not in the Container

The container is designed exclusively for npm execution isolation:
- **Host OS**: Handles all Git operations with your credentials and GPG/SSH keys
- **Container**: Only runs npm commands (build, test, format)
- **Benefits**: Simpler container (~80MB smaller), no credential management needed

### Verification

You can verify that Git is not available in the container:

```bash
# Git should not exist
devcontainer exec --workspace-folder . which git
# Expected: (no output)

devcontainer exec --workspace-folder . git --version
# Expected: bash: git: command not found
```

## Architecture

### Base Image

Uses official Node.js Docker image:
- **Image**: `node:22-bookworm-slim`
- Minimal Debian-based image with Node.js 22
- No additional tools (Git, build tools) for smaller footprint

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

- Node.js 22 runtime (minimal Debian-based image)
- Security-hardened with dropped capabilities (`--cap-drop=ALL`)
- No Git installation (all Git operations on host OS)
- Isolated npm execution environment
- Host-accessible node_modules for IDE type support

## Configuration Files

- **`devcontainer.json`**: Container configuration (image, security, lifecycle commands)
- **`sample-hooks/`**: Git hook samples for bridging host Git and container npm
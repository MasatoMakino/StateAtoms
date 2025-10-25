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

## Configuration Directory Protection

### Purpose

The `.devcontainer` directory itself is mounted as **read-only** inside the container to prevent malicious npm scripts from escalating privileges by modifying container configuration files.

### Security Risk Without Protection

A malicious npm package could:
- Modify `devcontainer.json` to remove `--cap-drop=ALL` or other security restrictions
- Alter `Dockerfile` to gain root access on next rebuild
- Change mount configurations to access sensitive host directories
- Bypass isolation by reconfiguring the container environment

### Implementation Method

The protection is achieved using **nested mount shadowing**:

```json
{
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/${localWorkspaceFolderBasename},type=bind,consistency=cached",
  "mounts": [
    "source=${localWorkspaceFolder}/.devcontainer,target=/workspaces/${localWorkspaceFolderBasename}/.devcontainer,type=bind,readonly"
  ]
}
```

**How it works:**
1. `workspaceMount` mounts the entire project directory as read-write
2. `mounts` array adds a nested readonly mount for the `.devcontainer` subdirectory
3. The nested mount shadows (overrides) the parent mount's permissions for that subdirectory
4. Result: Project files are writable, but `.devcontainer/` is read-only

**Mount hierarchy:**
```
/workspaces/StateAtoms/          (RW: true)  - project root
├── src/                          (RW: true)  - source files
├── .devcontainer/                (RW: false) - protected config
│   ├── devcontainer.json         (RW: false)
│   ├── Dockerfile                (RW: false)
│   └── README.md                 (RW: false)
└── node_modules/                 (RW: true)  - volume mount
```

### Verification

```bash
# Attempt to create a file (should fail)
devcontainer exec --workspace-folder . touch /workspaces/StateAtoms/.devcontainer/test.txt
# Expected: touch: cannot touch '...': Read-only file system

# Attempt to modify existing file (should fail)
devcontainer exec --workspace-folder . sh -c 'echo "test" > /workspaces/StateAtoms/.devcontainer/devcontainer.json'
# Expected: sh: 1: cannot create ...: Read-only file system

# Check mount permissions
devcontainer exec --workspace-folder . ls -la /workspaces/StateAtoms/.devcontainer
# Expected: dr-xr-xr-x (note the lack of 'w' permissions)
```

**Technical Note:** This technique uses Linux kernel's mount behavior where a subdirectory can be mounted with different options than its parent. While Docker documentation primarily shows mounting the same source to different destinations, nested mount shadowing is a standard capability inherited from the Linux mount system.

## Container Features

- Node.js 22 runtime
- Volume-mounted node_modules for better performance
- Security-hardened with dropped capabilities (`--cap-drop=ALL`)
- Isolated credentials (no automatic forwarding from host)
- Protected configuration directory (readonly mount)
# Dev Container Configuration

## Overview

This directory contains the development container configuration for StateAtoms project. The container provides a consistent Node.js 22 development environment with TypeScript support.

## Git Authentication Control

### Issue

By default, VS Code Dev Containers automatically forwards Git credentials from the host to the container, which may not be desired for testing authentication-free scenarios or security purposes.

### Solution

To disable Git credential forwarding, configure the following VS Code user settings:

#### Settings IDs and Values

**To Disable (Authentication-Free):**
- **`dev.containers.copyGitConfig`**: `false`
- **`dev.containers.gitCredentialHelperConfigLocation`**: `"none"`

**To Restore Default Behavior:**
- **`dev.containers.copyGitConfig`**: `true`
- **`dev.containers.gitCredentialHelperConfigLocation`**: `"global"`

#### How to Configure

1. Open VS Code Settings (`Ctrl/Cmd + ,`)
2. Search for "Dev Containers"
3. Modify the following settings:
   - **Copy Git Config**: Check/Uncheck as needed
   - **Git Credential Helper Config Location**: Select "none" or "global"

#### Important Notes

- These are **user-level settings** that affect all projects
- **Project-specific control is not possible** with current VS Code Dev Containers specification
- Each team member must configure these settings individually
- When disabled, Git operations requiring authentication (push, pull private repos) will fail in the container
- **Default values**: `copyGitConfig=true`, `gitCredentialHelperConfigLocation="global"`

### Verification

After applying the settings and rebuilding the container, verify the configuration:

```bash
# Should return empty or show an error (when disabled)
git config --get credential.helper

# Should show no credential helper entries (when disabled)
git config --list | grep credential
```

### Alternative Approaches Investigated

1. **`.vscode/settings.json`**: Does not override user-level credential forwarding
2. **`devcontainer.json` lifecycle commands**: VS Code re-applies credential helpers after execution
3. **Container-level Git configuration**: Conflicts with host Git config synchronization

## Container Features

- Node.js 22 runtime
- TypeScript support with latest VS Code extension
- GitLens extension for enhanced Git integration
- Volume-mounted node_modules for better performance
- Security-hardened with dropped capabilities
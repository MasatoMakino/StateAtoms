# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StateAtoms is a lightweight state management library for TypeScript that divides application state into small units called "Atoms". The library provides reactive state management with event-driven updates and serialization capabilities.

## Core Architecture

### Key Components

- **Atom**: Base class for holding primitive values with change notifications
- **ObjectAtom**: Specialized atom for objects using deep equality comparison via fast-equals
- **AtomContainer**: Container for managing multiple atoms/containers with event propagation
- **AtomEventArgs**: Event data interface for state changes

### Design Patterns

- Event-driven architecture using EventEmitter3
- Hierarchical state containers with automatic event propagation
- Serialization/deserialization support for state persistence
- Optional history management with undo/redo capabilities

### Key Files

- `src/Atom.ts`: Core atom implementation with change detection
- `src/AtomContainer.ts`: Container class with serialization and history features
- `src/ObjectAtom.ts`: Deep equality atom for complex objects
- `src/AtomEventArgs.ts`: Event argument interfaces

## Development Commands

All development commands should be executed via the development container using devcontainer CLI. See **`.vscode/tasks.json`** for available tasks:

### Container Management
- **Dev Container: up** - Create and start the development container

### Building
- **Dev Container: build** - Compiles TypeScript to ES modules in the `esm/` directory

### Testing
- **Dev Container: test** - Run all tests (175 tests)
- **Dev Container: coverage** - Run tests with coverage report

### Code Quality
- **Dev Container: pre-commit** - Format code using Biome
- **Dev Container: pre-push** - Full validation (build check, tests, Biome CI)

### Version Management
- **Dev Container: version (prompt)** - Interactive version bump (patch/minor/major/prerelease)

All tasks use `devcontainer exec --workspace-folder .` for command execution. Uses Biome for linting and formatting (2-space indentation, double quotes, 80 char line width).

### Git Hooks

This project uses manual Git hooks integrated with the DevContainer environment for automated code quality checks.

#### Why Manual Git Hooks?

In the DevContainer isolation architecture:
- **Git runs on the host OS** - All git operations (commit, push) execute on your machine
- **npm runs in the container** - All npm scripts execute in the isolated container
- **Husky is incompatible** - Husky requires npm to control Git hooks, which isn't possible across this boundary

Therefore, Git hooks are manually installed to bridge the host Git and container npm environments.

#### Automated Checks

**pre-commit hook** (`.git/hooks/pre-commit`):
- Automatically formats staged files using Biome
- Runs before each commit
- Starts DevContainer if not running

**pre-push hook** (`.git/hooks/pre-push`):
- Runs TypeScript build check (no emit)
- Executes all tests via Vitest
- Validates code with Biome CI
- Runs before each push
- Starts DevContainer if not running

#### Setup Instructions for New Contributors

Git hooks must be set up manually on each development machine:

1. **Verify Git config is clean** (remove any Husky remnants):
   ```bash
   git config --unset core.hooksPath
   ```

2. **Create pre-commit hook**:
   ```bash
   cat > .git/hooks/pre-commit << 'EOF'
   #!/bin/sh
   exec 1>&2
   echo "[pre-commit] Running code quality checks in DevContainer..."
   if ! docker ps --format '{{.Names}}' | grep -q 'stateatoms-npm-runner'; then
     echo "[pre-commit] DevContainer not running. Starting..."
     devcontainer up --workspace-folder . || exit 1
   fi
   if ! devcontainer exec --workspace-folder . npm run pre-commit; then
     echo "[pre-commit] ERROR: Code quality checks failed"
     exit 1
   fi
   echo "[pre-commit] ✓ All checks passed"
   exit 0
   EOF
   chmod +x .git/hooks/pre-commit
   ```

3. **Create pre-push hook**:
   ```bash
   cat > .git/hooks/pre-push << 'EOF'
   #!/bin/sh
   exec 1>&2
   echo "[pre-push] Running tests and CI checks in DevContainer..."
   if ! docker ps --format '{{.Names}}' | grep -q 'stateatoms-npm-runner'; then
     echo "[pre-push] DevContainer not running. Starting..."
     devcontainer up --workspace-folder . || exit 1
   fi
   if ! devcontainer exec --workspace-folder . npm run pre-push; then
     echo "[pre-push] ERROR: Tests or CI checks failed"
     exit 1
   fi
   echo "[pre-push] ✓ All checks passed"
   exit 0
   EOF
   chmod +x .git/hooks/pre-push
   ```

4. **Verify hooks are working**:
   ```bash
   git commit --allow-empty -m "test: Verify hooks"
   git reset --hard HEAD~1
   ```

#### Manual Alternative

If you prefer not to use Git hooks, run these commands manually before committing:
```bash
devcontainer exec --workspace-folder . npm run pre-commit
devcontainer exec --workspace-folder . npm run pre-push
```

### Version Release
For complete version bump and release procedures, see:
- **`.claude/docs/version-release-workflow.md`**: Comprehensive 11-step workflow guide covering version updates, quality checks, release branching, and signed tag creation.

## Technical Details

### Dependencies
- **eventemitter3**: Event system for state change notifications
- **fast-equals**: Deep equality comparison for ObjectAtom

### TypeScript Configuration
- Target: ES2021
- Module: ES2022
- Strict mode enabled
- Declaration files generated with source maps

### Architecture Notes
- All atoms must call `connectMemberAtoms()` in AtomContainer constructors after adding member atoms
- Event propagation flows upward through container hierarchy
- Serialization skips atoms/containers with `isSkipSerialization: true`
- History feature requires `useHistory: true` in container options

## Project Structure

### Local Development Files
- **`local-notes/`**: Directory for local development memos and notes (excluded from git)
  - Contains implementation considerations, debugging notes, and temporary documentation
  - Files in this directory are not tracked in version control
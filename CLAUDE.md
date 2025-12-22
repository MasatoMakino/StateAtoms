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

### Code Quality

- Uses Biome for formatting and linting (2-space indentation, double quotes, 80 char line width)
- Manual Git hooks available (optional, see Git Hooks Setup section)
- Pre-commit: Format staged files with Biome
- Pre-push: Run TypeScript build check, tests, and Biome CI

## Git Hooks Setup (Optional)

Git hooks can automatically run code quality checks before commits and pushes.

See **`.devcontainer/sample-hooks/README.md`** for setup instructions.

### Container Architecture & Security

#### Base Configuration
- **Image**: `mcr.microsoft.com/devcontainers/javascript-node:22`
- **User**: `node` (UID:1000, GID:1000) - non-root execution for security
- **Security**: `--cap-drop=ALL` (removes all Linux capabilities)
- **Port forwarding**: Not configured (library project, no server runtime)

#### Security Model

**npm Execution Isolation:**
- All npm commands (`npm ci`, `npm test`, `npm run build`, etc.) execute exclusively in the container
- Host OS npm is never used, protecting against malicious package scripts
- Automatic `npm audit --audit-level=moderate` on container start

**node_modules Access:**
- Host OS can read node_modules for IDE type definition support
- This enables IntelliSense, auto-completion, and type checking in host IDEs
- npm installation and script execution remain isolated in the container

**Security Trade-off:**
- **Before**: Complete isolation of node_modules via Docker named volumes (higher security, no IDE type support)
- **After**: npm execution isolated in container, node_modules accessible to host IDE (balanced approach prioritizing developer experience)
- Primary security boundary is the containerized npm execution environment

**Git Operations:**
- Git operations cannot be performed in the container
- While Git is installed, the container lacks authentication credentials and commit signing keys (GPG/SSH)
- This is intentional: the container is designed exclusively for npm execution isolation
- All Git operations (commit, push, etc.) must be performed on the host OS where credentials and keys are available

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
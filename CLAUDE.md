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

All development commands should be executed via the development container. See **`.vscode/tasks.json`** for available tasks:

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

Uses Biome for linting and formatting (2-space indentation, double quotes, 80 char line width).

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
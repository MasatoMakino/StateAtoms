# AGENTS.md

StateAtoms is a TypeScript state management library. It divides application state into small units called atoms.

## Development commands

On the host, run npm commands only inside the development container, through `devcontainer exec --workspace-folder .`. The container has no Git, so run Git on the host. For the available tasks (build, test, coverage, pre-commit, pre-push, version), see `.vscode/tasks.json`. For the container design, see `.devcontainer/README.md`.

Each worktree has its own DevContainer. In a new worktree, run `devcontainer up --workspace-folder .` once before the other commands. For more information, see [Worktrees](.devcontainer/DESIGN.md#worktrees).

```bash
# Start the container (once per working tree)
devcontainer up --workspace-folder .

# Run the tests
devcontainer exec --workspace-folder . npm test

# Type-check, test, and run Biome as the pre-push hook does
devcontainer exec --workspace-folder . npm run pre-push
```

Biome formats and lints the code. To set up Git hooks that run these checks, see `.devcontainer/sample-hooks/README.md`.

## Architecture notes

- An AtomContainer subclass calls `connectMemberAtoms()` in its constructor after it adds every member atom
- `beforeChange`, `change`, and `addHistory` propagate upward through the container hierarchy. `historyChange` does not propagate
- Serialization (`toObject`/`toJson`) skips atoms and containers with `skipSerialization: true`. Restore (`fromObject`/`fromJson`/`load`) and history include them
- History requires `useHistory` (`true` or `{ maxHistory }`) in the container options
- `dispose()` prevents memory leaks. A container owns its members, disposes them recursively, and removes all listeners. Disposing a shared member breaks its other subscribers by design

## Local notes

`local-notes/` holds local development memos. Git ignores this directory.

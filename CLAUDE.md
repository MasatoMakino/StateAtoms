# CLAUDE.md

StateAtoms is a TypeScript state management library. It divides application state into small units called atoms.

## Development commands

On the host, run npm commands only inside the development container, through `devcontainer exec --workspace-folder .`. The container has no Git, so run Git on the host. For the available tasks (build, test, coverage, pre-commit, pre-push, version), see `.vscode/tasks.json`. For the container design, see `.devcontainer/README.md`.

Biome formats and lints the code. To set up Git hooks that run these checks, see `.devcontainer/sample-hooks/README.md`.

## Agent container

`.devcontainer/claude/` defines a separate container for autonomous Claude Code agents. Git and the `gh` CLI are available inside it, and `init-firewall.sh` restricts its network. Inside this container, run commands directly without `devcontainer exec`.

## Architecture notes

- An AtomContainer subclass calls `connectMemberAtoms()` in its constructor after it adds every member atom
- `beforeChange`, `change`, and `addHistory` propagate upward through the container hierarchy. `historyChange` does not propagate
- Serialization (`toObject`/`toJson`) skips atoms and containers with `skipSerialization: true`. Restore (`fromObject`/`fromJson`/`load`) and history include them
- History requires `useHistory` (`true` or `{ maxHistory }`) in the container options
- `dispose()` prevents memory leaks. A container owns its members, disposes them recursively, and removes all listeners. Disposing a shared member breaks its other subscribers by design

## Local notes

`local-notes/` holds local development memos. Git ignores this directory.

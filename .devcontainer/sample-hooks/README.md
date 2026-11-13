# Git hooks

Git runs on the host, and npm runs in the DevContainer. These hooks run the checks of `package.json` in the container of the working tree:

- `pre-commit` runs `npm run pre-commit` with the staged files, then stages the formatted files again
- `pre-push` runs `npm run pre-push` (type check, tests, and `biome ci`)

Each hook finds the container by its `devcontainer.local_folder` label, and starts it when it is not running. Each worktree has its own container. For more information, see [Worktrees](../DESIGN.md#worktrees).

## Setup

`.git/hooks/` is not tracked. Copy the hooks in each clone:

```bash
cp .devcontainer/sample-hooks/pre-commit .devcontainer/sample-hooks/pre-push .git/hooks/
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

`git config core.hooksPath` must print nothing.

# commit-dev command

Automated development commit workflow that runs pre-commit formatting in Dev Container and commits changes on host OS.

## Steps:
1. Run pre-commit formatting in Dev Container: `docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm run pre-commit`
2. Stage all changes: `git add .`
3. Commit with provided message: `git commit -m "[message]"`

## Usage:
- `/commit-dev "feat: add new atom feature"`
- `/commit-dev "fix: resolve state synchronization issue"`

## Note:
This command leverages the Dev Container for code quality checks while keeping Git operations on the host OS for SSH signing.
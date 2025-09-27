# push-dev command

Automated development push workflow that runs pre-push validation in Dev Container and pushes changes from host OS.

## Steps:
1. Run pre-push validation in Dev Container: `docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm run pre-push`
   - Build check (TypeScript compilation without emit)
   - Run all tests (175 tests)
   - Biome CI linting check
2. Push to remote: `git push --set-upstream origin <branch-name>` (or `git push` if upstream exists)

## Usage:
- `/push-dev`

## Execution Behavior:
**Do not explain the command to the user. When instructed to execute this command, immediately begin execution following the steps in order.**

## Note:
This command ensures all quality checks pass before pushing. The validation runs in the secure Dev Container while Git push uses host OS authentication.
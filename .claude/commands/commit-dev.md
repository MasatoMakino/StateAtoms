# commit-dev command

Automated development commit workflow that runs pre-commit formatting in Dev Container and commits changes on host OS.

## Steps:
1. Run pre-commit formatting in Dev Container: `docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm run pre-commit`
2. Stage all changes: `git add .`
3. Analyze recent git history and provided message to create a comprehensive commit message
4. Commit with the enhanced message: `git commit -m "[enhanced-message]"`

## Message Enhancement:
- Review recent git log to understand development context
- Combine user's intent (from arguments) with actual changes made
- Create detailed, future-development-friendly commit messages
- Follow conventional commit format and best practices
- Include technical details that will be useful for future development

## Usage:
- `/commit-dev "add version bump tasks"` → enhanced with implementation details
- `/commit-dev "fix state sync"` → enhanced with context and technical specifics
- `/commit-dev "開発環境の改善"` → restructured as detailed English commit message

## Note:
This command leverages the Dev Container for code quality checks while keeping Git operations on the host OS for SSH signing. Commit messages are enhanced by analyzing git history and combining it with user intent to create comprehensive documentation for future development.
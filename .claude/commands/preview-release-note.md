# preview-release-note command

Generate and preview GitHub release notes using GitHub CLI without creating an actual release.

## Steps:
1. Generate and display a unique preview tag name: `echo "Preview tag: test-preview-$(date +%s)"`
2. Note the generated tag name from the output above
3. Create a temporary draft release: `gh release create [noted-tag-name] --draft --generate-notes`
4. Display the release note body: `gh release view [noted-tag-name] --json body -q .body`
5. Clean up the preview release: `gh release delete [noted-tag-name] --yes`

## Functionality:
- Shows what the auto-generated release notes would look like
- Uses GitHub's automatic release note generation based on current HEAD
- Compares from the latest published tag to the current commit
- Includes merged pull requests categorized by type (🪛 Changes, ❇️ Enhancement, 🐞 Bug Fixes, 🤖 CI/CD)
- Cleans up temporary artifacts automatically
- Works without creating local tags or specifying targets

## Usage:
- `/preview-release-note`

## Prerequisites:
- GitHub CLI (`gh`) must be installed and authenticated
- Repository must have at least one existing published tag
- Current branch should contain commits to preview

## Sample Output:
```
## What's Changed
### 🪛 Changes
* chore: add explicit minimal permissions to CI workflow

### ❇️ Enhancement / New Features
* feat: introduce development container environment
* ci: add Node.js v24 to CI workflow matrix

### 🐞 Bug Fixes
* Simplify dependabot cooldown configuration

### 🤖 CI / CD
* security: pin third-party GitHub Action to commit SHA
```

## Note:
This command provides a safe preview of release notes without publishing or permanently creating releases. The generated notes use GitHub's `.github/release.yml` configuration for categorization. It's useful for reviewing what will be included in the release notes before performing the actual release workflow documented in `.claude/docs/version-release-workflow.md`.
# Version Release Workflow

Complete workflow documentation for version updates and releases

## Overview

This document defines the standardized workflow for version updates and releases in the StateAtoms project. It includes quality assurance using development containers and secure release processes with signed tags.

**Key Points**:
- Uses DevContainer CLI (`devcontainer exec`) for all npm operations
- Version branches follow `version/vX.X.X` naming convention
- Signed tags are created on the version branch BEFORE PR submission
- Tags are pushed together with the branch and approved through PR review
- Repository rules prevent direct tag creation to main branch

## Prerequisites

### 1. Version Update Scope Confirmation

Confirm the following update scope with the user:
- **patch** (0.2.1 → 0.2.2): Bug fixes and minor improvements
- **minor** (0.2.1 → 0.3.0): New features with backward compatibility
- **major** (0.2.1 → 1.0.0): Breaking changes without backward compatibility

### 2. Environment Verification

- Development container is running
- GPG/SSH signing key is configured
- Access permissions to GitHub remote repository are available
- **Repository tag rules**: This repository has tag creation restrictions. Tags cannot be pushed directly and must be created through GitHub UI or Actions

## Workflow Steps

### Step 1: Switch to Default Branch

```bash
git checkout main
git pull origin main
```

**Checkpoint**: Ensure you are on the latest main branch

### Step 2: Update Dependencies

```bash
devcontainer exec --workspace-folder . npm ci
```

**Checkpoint**: Dependencies are successfully installed

### Step 3: Quality Checks

```bash
# Lint check
devcontainer exec --workspace-folder . npx biome ci .

# Test execution
devcontainer exec --workspace-folder . npm test

# Build check
devcontainer exec --workspace-folder . npm run build
```

**Important**: If any step fails, abort the workflow and resolve the issues before continuing

### Step 4: Version Bump Execution

Execute according to the version update scope confirmed in Step 1:

```bash
# For patch version update
devcontainer exec --workspace-folder . npm version patch --no-git-tag-version --ignore-scripts

# For minor version update
devcontainer exec --workspace-folder . npm version minor --no-git-tag-version --ignore-scripts

# For major version update
devcontainer exec --workspace-folder . npm version major --no-git-tag-version --ignore-scripts
```

**Checkpoint**: Versions in package.json and package-lock.json are updated

### Step 5: Create Version Branch and Tag

```bash
# Get the updated version number
NEW_VERSION=$(node -p "require('./package.json').version")

# Create version branch (following historical convention: version/v0.2.0)
git checkout -b "version/v${NEW_VERSION}"

# Commit changes
git add package.json package-lock.json
git commit -m "chore(release): bump version to v${NEW_VERSION}"

# Create signed tag on this commit
git tag -s "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
```

**Checkpoint**: Version branch is created, version update is committed, and signed tag is created

**Note**: The tag is created on the version branch before merging. This allows the tag to be included in the Pull Request.

### Step 6: Push Version Branch and Tag

```bash
git push origin "version/v${NEW_VERSION}" "v${NEW_VERSION}"
```

**Important**: Push both the branch and the tag together. Due to repository tag creation restrictions, tags must be pushed with their associated branch in a Pull Request.

### Step 7: Create Pull Request

Create PR using GitHub Web interface or GH CLI:

```bash
gh pr create \
  --title "Release v${NEW_VERSION}" \
  --body "Release version ${NEW_VERSION}" \
  --label "release" \
  --base main \
  --head "version/v${NEW_VERSION}"
```

**Configuration**:
- Title: `Release v[version-number]`
- Body: `Release version [version-number]`
- Label: `release`
- Base branch: `main`
- Branch naming: `version/v[version-number]` (historical convention)

### Step 8: Wait for PR Merge

- Wait for CI/CD checks to complete
- Wait for review completion if required
- Merge the PR

**Important**: When the PR is merged, both the version update commit and the tag will be merged into the main branch.

### Step 9: Update Main Branch and Verify Tag

```bash
git checkout main
git pull origin main

# Verify the tag exists on main
git tag -l "v${NEW_VERSION}"
git show "v${NEW_VERSION}"
```

**Checkpoint**: Switched to the latest main branch after PR merge and verified tag exists

### Step 10: Create GitHub Release

Create a GitHub Release from the merged tag:

#### Method A: GitHub Web UI (Recommended)

1. Navigate to: https://github.com/MasatoMakino/StateAtoms/releases/new
2. Select existing tag: `v${NEW_VERSION}` (e.g., `v0.2.2`)
3. Title: `Release v${NEW_VERSION}`
4. Description: `Release version ${NEW_VERSION}`
5. Click "Publish release"

#### Method B: GitHub CLI

```bash
NEW_VERSION=$(node -p "require('./package.json').version")
gh release create "v${NEW_VERSION}" \
  --title "Release v${NEW_VERSION}" \
  --notes "Release version ${NEW_VERSION}"
```

**Checkpoint**: GitHub release is published using the merged tag

## Post-Release Verification

Verification after release completion:

1. **GitHub Release**: Confirm that a release is automatically created from the tag
2. **npm Package**: Verify publication to npm via CI/CD (if applicable)
3. **Documentation**: Ensure version numbers are reflected in various documentation

## Troubleshooting

### If tests fail in Step 3
- Identify and fix the root cause of test failures
- After fixing, restart from Step 1

### If signing error occurs in Step 5
- Verify signing configuration: `git config --list | grep -E "(gpg|sign)"`
- Check signing key is configured: `git config user.signingkey`
- For SSH signing (current setup): Ensure 1Password SSH agent is running
- For GPG signing: Check GPG key availability with `gpg --list-secret-keys`
- Test signing capability: `git tag -s test-tag -m "test"` then `git tag -d test-tag`

### If tag push fails in Step 6
- **Repository rule violation**: This repository has tag creation restrictions
- Tags must be pushed together with their branch: `git push origin "version/vX.X.X" "vX.X.X"`
- The tag will be approved through the PR review process
- Do NOT attempt to push tags separately or bypass repository rules

### If tag is not visible after PR merge
- Verify the tag was included in the PR: `gh pr view <PR-number> --json files`
- Check if tag exists locally: `git tag -l "vX.X.X"`
- Pull with tags: `git pull --tags`
- If tag is missing, it may need to be recreated following the correct workflow

## Related Files

- `.vscode/tasks.json`: Version bump tasks for development container
- `.claude/commands/commit-dev.md`: Development commit command
- `.claude/commands/push-dev.md`: Development push command
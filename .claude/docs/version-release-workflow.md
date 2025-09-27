# Version Release Workflow

Complete workflow documentation for version updates and releases

## Overview

This document defines the standardized workflow for version updates and releases in the StateAtoms project. It includes quality assurance using development containers and secure release processes with signed tags.

## Prerequisites

### 1. Version Update Scope Confirmation

Confirm the following update scope with the user:
- **patch** (0.2.1 → 0.2.2): Bug fixes and minor improvements
- **minor** (0.2.1 → 0.3.0): New features with backward compatibility
- **major** (0.2.1 → 1.0.0): Breaking changes without backward compatibility

### 2. Environment Verification

- Development container is running
- GPG signing key is configured
- Access permissions to GitHub remote repository are available

## Workflow Steps

### Step 1: Switch to Default Branch

```bash
git checkout main
git pull origin main
```

**Checkpoint**: Ensure you are on the latest main branch

### Step 2: Update Dependencies

```bash
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm ci
```

**Checkpoint**: Dependencies are successfully installed

### Step 3: Quality Checks

```bash
# Lint check
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npx biome ci .

# Test execution
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm test

# Build check
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm run build
```

**Important**: If any step fails, abort the workflow and resolve the issues before continuing

### Step 4: Version Bump Execution

Execute according to the version update scope confirmed in Step 1:

```bash
# For patch version update
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm version patch --no-git-tag-version --ignore-scripts

# For minor version update
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm version minor --no-git-tag-version --ignore-scripts

# For major version update
docker exec -i -w /workspaces/StateAtoms stateatoms-dev npm version major --no-git-tag-version --ignore-scripts
```

**Checkpoint**: Versions in package.json and package-lock.json are updated

### Step 5: Create Release Branch

```bash
# Get the updated version number
NEW_VERSION=$(node -p "require('./package.json').version")

# Create release branch
git checkout -b "release/v${NEW_VERSION}"

# Commit changes
git add package.json package-lock.json
git commit -m "chore(release): bump version to v${NEW_VERSION}"
```

**Checkpoint**: Release branch is created and version update is committed

### Step 6: Push Release Branch

```bash
git push origin "release/v${NEW_VERSION}"
```

### Step 7: Create Pull Request

Create PR using GitHub Web interface or GH CLI:

```bash
gh pr create \
  --title "Release v${NEW_VERSION}" \
  --body "Release version ${NEW_VERSION}" \
  --label "release" \
  --base main \
  --head "release/v${NEW_VERSION}"
```

**Configuration**:
- Title: `Release v[version-number]`
- Body: `Release version [version-number]`
- Label: `release`
- Base branch: `main`

### Step 8: Wait for PR Merge

- Wait for CI/CD checks to complete
- Wait for review completion if required
- Wait for PR to be merged

### Step 9: Update Main Branch

```bash
git checkout main
git pull origin main
```

**Checkpoint**: Switched to the latest main branch after PR merge

### Step 10: Create Signed Tag

```bash
# Create signed tag
git tag -s "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
```

**Checkpoint**: GPG signed tag is created

### Step 11: Push Tag

```bash
git push origin "v${NEW_VERSION}"
```

**Checkpoint**: Tag is pushed to remote repository

## Post-Release Verification

Verification after release completion:

1. **GitHub Release**: Confirm that a release is automatically created from the tag
2. **npm Package**: Verify publication to npm via CI/CD (if applicable)
3. **Documentation**: Ensure version numbers are reflected in various documentation

## Troubleshooting

### If tests fail in Step 3
- Identify and fix the root cause of test failures
- After fixing, restart from Step 1

### If signing error occurs in Step 10
- Verify signing configuration: `git config --list | grep -E "(gpg|sign)"`
- Check signing key is configured: `git config user.signingkey`
- For SSH signing (current setup): Ensure 1Password SSH agent is running
- For GPG signing: Check GPG key availability with `gpg --list-secret-keys`
- Test signing capability: `git tag -s test-tag -m "test"` then `git tag -d test-tag`

### If tag creation error occurs after PR merge
- Ensure main branch is up to date
- Pull latest changes from remote
- Re-execute from Step 9

## Related Files

- `.vscode/tasks.json`: Version bump tasks for development container
- `.claude/commands/commit-dev.md`: Development commit command
- `.claude/commands/push-dev.md`: Development push command
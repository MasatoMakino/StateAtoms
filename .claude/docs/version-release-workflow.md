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

### Step 1: Verify Tag Protection Rules

First, identify the tag protection ruleset ID:

```bash
# List all rulesets and find the one for release tags
gh api repos/MasatoMakino/StateAtoms/rulesets --jq '.[] | select(.name == "Release Tags") | {id, name, target}'

# Expected output: Returns the ruleset ID (integer), name, and target type
```

Then check the ruleset status using the discovered ID:

```bash
# Store the ruleset ID for subsequent commands
RULESET_ID=$(gh api repos/MasatoMakino/StateAtoms/rulesets --jq '.[] | select(.name == "Release Tags") | .id')

gh api repos/MasatoMakino/StateAtoms/rulesets/${RULESET_ID} --jq '{
  name,
  enforcement,
  rules: [.rules[].type],
  bypass_actors_count: .bypass_actors | length,
  current_user_can_bypass
}'
```

**Expected output for maximum security:**
```json
{
  "name": "Release Tags",
  "enforcement": "active",
  "rules": ["creation", "deletion", "non_fast_forward", "required_signatures", "update"],
  "bypass_actors_count": 0,
  "current_user_can_bypass": "never"
}
```

**Action Required:**

If `rules` contains `"creation"` AND `current_user_can_bypass` is `"never"`:
1. Navigate to: `https://github.com/MasatoMakino/StateAtoms/rules/${RULESET_ID}`
2. Temporarily remove **"creation"** rule from the ruleset (keep other rules active)
3. Confirm and wait for user to complete this step
4. Re-run the verification command to confirm `"creation"` is not in the rules array

**Checkpoint**: Tag creation rule is temporarily removed, allowing tag creation for this release (other protection rules remain active)

### Step 2: Switch to Default Branch

```bash
git checkout main
git pull origin main
```

**Checkpoint**: Ensure you are on the latest main branch

### Step 3: Update Dependencies

```bash
devcontainer exec --workspace-folder . npm ci
```

**Checkpoint**: Dependencies are successfully installed

### Step 4: Quality Checks

```bash
# Lint check
devcontainer exec --workspace-folder . npx biome ci .

# Test execution
devcontainer exec --workspace-folder . npm test

# Build check
devcontainer exec --workspace-folder . npm run build
```

**Important**: If any step fails, abort the workflow and resolve the issues before continuing

### Step 5: Version Bump Execution

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

### Step 6: Create Version Branch and Signed Tag

**Prerequisites**: Verify that the "creation" rule was removed in Step 1, allowing tag creation.

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

### Step 7: Push Version Branch and Tag

```bash
git push origin "version/v${NEW_VERSION}" "v${NEW_VERSION}"
```

**Important**: Push both the branch and the tag together. Due to repository tag creation restrictions, tags must be pushed with their associated branch in a Pull Request.

### Step 8: Create Pull Request

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

### Step 9: Wait for PR Merge

- Wait for CI/CD checks to complete
- Wait for review completion if required
- Merge the PR

**Checkpoint**: PR is merged, both the version update commit and the tag are now on the main branch

### Step 10: Re-enable Tag Creation Protection

**Note**: If your terminal session has restarted since Step 1, re-derive the `RULESET_ID` variable:

```bash
RULESET_ID=$(gh api repos/MasatoMakino/StateAtoms/rulesets --jq '.[] | select(.name == "Release Tags") | .id')
echo "RULESET_ID: ${RULESET_ID}"
```

**Action Required:**

1. Navigate to: `https://github.com/MasatoMakino/StateAtoms/rules/${RULESET_ID}`
2. Add **"creation"** rule back to the ruleset
3. Confirm the change

Verify the creation rule is re-enabled:

```bash
# Use the same RULESET_ID from Step 1
gh api repos/MasatoMakino/StateAtoms/rulesets/${RULESET_ID} --jq '.rules[].type' | grep creation
# Expected output: "creation"
```

**Checkpoint**: Tag creation protection rule is re-enabled

**CRITICAL**: Do NOT skip this step. Leaving the creation rule disabled creates a security vulnerability.

### Step 11: Update Main Branch and Verify

```bash
git checkout main
git pull origin main

# Verify the tag exists on main
git tag -l "v${NEW_VERSION}"
git show "v${NEW_VERSION}"
```

**Checkpoint**: Switched to the latest main branch after PR merge and verified tag exists

### Step 12: Create GitHub Release (Manual - User Action)

**User Action Required:**

Create a GitHub Release via Web UI:

1. Navigate to: <https://github.com/MasatoMakino/StateAtoms/tags>
2. Find the new version tag `v${NEW_VERSION}` (e.g., `v0.2.2`)
3. Click the **"..."** (three dots) button next to the tag
4. Select **"Create release"** from the dropdown menu
5. **Release title**: `Release v${NEW_VERSION}`
6. **Describe this release**: `Release version ${NEW_VERSION}`
7. Click **"Publish release"**

**Checkpoint**: GitHub Release is published, triggering npm publish workflow via OIDC

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
# Git Hooks Setup for DevContainer

This directory contains sample Git hook files for this project.

## Why Manual Git Hooks?

In the DevContainer isolation architecture:
- **Git runs on the host OS** - All git operations (commit, push) execute on your machine
- **npm runs in the container** - All npm scripts execute in the isolated container
- **Husky is incompatible** - Husky requires npm to control Git hooks, which isn't possible across this boundary

Therefore, Git hooks are manually installed to bridge the host Git and container npm environments.

## Before Setup: Check for Existing Hooks

If you're migrating from Husky or have existing Git hooks:

```bash
# Check Git config for hooks path (should be empty)
git config core.hooksPath

# If it shows ".husky" or other path, remove it:
git config --unset core.hooksPath

# Check for existing hooks in .git/hooks/
ls -la .git/hooks/
```

## Quick Setup

```bash
# Copy hook files to .git/hooks/
cp .devcontainer/sample-hooks/pre-commit .git/hooks/
cp .devcontainer/sample-hooks/pre-push .git/hooks/

# Make executable
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

## What the Hooks Do

### pre-commit hook

1. Checks if DevContainer is running (starts if needed)
2. Gets list of staged files
3. Runs `npm run pre-commit` in DevContainer (Biome formatter with `--staged` flag)
4. Re-stages formatted files to ensure changes are committed
5. Handles file names with spaces correctly

### pre-push hook

1. Checks if DevContainer is running (starts if needed)
2. Runs `npm run pre-push` in DevContainer:
   - TypeScript build check (`tsc --noEmit`)
   - Vitest tests (`vitest --run`)
   - Biome CI checks (`biome ci .`)

## Testing

### Test pre-commit hook (comprehensive):

This test verifies multiple files, paths with spaces, and proper staging behavior:

```bash
# Create directory with spaces
mkdir -p "test dir/sub folder"

# Create multiple test files with bad formatting
cat > "test dir/file 1.js" << 'EOF'
function   foo(  ){const x=1;return x;}
EOF

cat > "test dir/sub folder/file 2.js" << 'EOF'
function   bar(  ){const y=2;return y;}
EOF

cat > "test dir/unstaged.js" << 'EOF'
function   baz(  ){const z=3;return z;}
EOF

# Stage only first two files (NOT unstaged.js)
git add "test dir/file 1.js" "test dir/sub folder/file 2.js"

# Commit (hook will format and re-stage)
git commit -m "test: Multiple files with spaces"

# Verify formatted content was committed
git show HEAD:"test dir/file 1.js"
# Expected: function foo() { const x = 1; return x; }

git show HEAD:"test dir/sub folder/file 2.js"
# Expected: function bar() { const y = 2; return y; }

# Verify unstaged file was NOT formatted or committed
cat "test dir/unstaged.js"
# Expected: function   baz(  ){const z=3;return z;} (still unformatted)

git ls-tree -r HEAD --name-only | grep "unstaged.js"
# Expected: (no output - file not in commit)

# Cleanup
rm -rf "test dir"
git reset --hard HEAD~1
```

### Test pre-push hook:

```bash
# This will run build check, tests, and Biome CI
git push origin HEAD
```

## How It Works

### Container Name Detection

Both hooks use dynamic container name detection:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
CONTAINER_NAME="$(basename "$REPO_ROOT")-npm-runner"
```

This ensures hooks work correctly:
- In git worktree environments (each worktree gets independent container)
- From any subdirectory within the repository
- When repository is renamed or moved

### Re-staging Logic (pre-commit)

The pre-commit hook uses efficient re-staging:

1. **Get staged files BEFORE npm run** (enables early return if no files staged)
2. **Run formatter** in container with `--staged` flag
3. **Re-stage each file** with proper handling:
   - IFS (Internal Field Separator) preservation for file names with spaces
   - File existence check (`[ -f "$file" ]`) to skip deleted files
   - Error handling for each `git add` operation

## Notes

- These hooks run npm commands inside the DevContainer
- Each developer must set up hooks manually (`.git/hooks/` is not tracked by git)
- Hooks require DevContainer to be running or will start it automatically
- Hooks are optional - you can run `npm run pre-commit` and `npm run pre-push` manually

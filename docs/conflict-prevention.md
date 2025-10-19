# Conflict Prevention & Recovery

## 🎯 Goal: Prevent Conflicts Before They Happen

### Pre-Work Validation (MANDATORY)

#### 1. Clean Working Tree
```bash
git status
# ✅ Expected: "nothing to commit, working tree clean"
# ❌ Problem: Uncommitted changes - commit or stash first
```

#### 2. Sync Staging with Remote
```bash
git checkout staging
git pull origin staging
# ✅ Ensures you have latest staging
```

#### 3. Check for Main Divergence
```bash
git fetch origin
git log --oneline origin/staging..origin/main
# ✅ Expected: EMPTY (no commits in main not in staging)
# ❌ Problem: Main has commits staging doesn't have
```

#### 4. Verify Sync Status
```bash
git rev-parse HEAD
git rev-parse origin/main
# ✅ Expected: Same commit hash if fully synced
```

## 🔍 Duplicate Work Detection

### Before Starting Implementation:

#### Check GitHub for Existing PRs
```bash
# Search similar keywords in recent commits
git log --oneline --grep="text color" origin/main
git log --oneline --grep="Issue #71" origin/main

# Check recent merges
git log --oneline origin/main -10
```

#### Verify Issue Status
- GitHub issue is not already resolved
- No similar work in progress
- Issue number not used elsewhere

## 🚨 Emergency Recovery Procedures

### When Conflicts Occur:

#### Step 1: Stop and Assess
```bash
# Don't force merge - assess situation first
git log --oneline origin/main..origin/staging  # What staging has
git log --oneline origin/staging..origin/main  # What main has
```

#### Step 2: Identify Problem Type
- **Circular Merge**: main ↔ staging merged both ways
- **Divergent Branches**: main and staging have different commits
- **Duplicate Work**: Same feature implemented twice

#### Step 3: Choose Recovery Strategy

### Recovery Option A: Reset to Main (If Main is Source of Truth)
```bash
git checkout staging
git branch staging-backup-$(date +%Y%m%d-%H%M%S)  # Backup first
git reset --hard origin/main
git push origin staging --force-with-lease
```

### Recovery Option B: Cherry-Pick Specific Commits
```bash
git checkout staging
git reset --hard origin/main  # Start clean
git cherry-pick <commit-hash>  # Add specific commits only
git push origin staging
```

### Recovery Option C: Abandon Staging (If Duplicate Work)
```bash
# If main already has your work
git checkout staging
git reset --hard origin/main
git push origin staging --force-with-lease
# Your work is already in main - staging reset is safe
```

## 📁 Dependency File Management

### Lock File Rules:

#### Choose ONE Lock File Only
```bash
# Choose either:
package-lock.json  # npm
# OR
yarn.lock         # yarn
# NEVER both in the same commit
```

#### After Dependency Changes:
```bash
npm install  # or yarn install
npm run build  # Verify build success
# Commit ONLY the necessary lock file
git add package-lock.json  # OR git add yarn.lock
# Remove the other file before committing
```

#### Build Failure Recovery:
```bash
# If build fails after dependency changes:
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

## 🎯 Conflict Prevention Checklist

### Before Starting Work:
- [ ] Working tree is clean (`git status`)
- [ ] Staging synced with remote (`git pull origin staging`)
- [ ] No divergence from main (`git log origin/staging..origin/main` empty)
- [ ] GitHub issue not already resolved
- [ ] No similar PRs merged recently
- [ ] Branch name follows pattern: `feature/ISSUE-description`

### During Development:
- [ ] Working on feature branch only
- [ ] Regular commits with clear messages
- [ ] Build validation after major changes

### Before Merging to Staging:
- [ ] All tests pass locally
- [ ] Build completes successfully
- [ ] No sensitive data in commits

### Before Merging to Main:
- [ ] Staging tested and validated
- [ ] No merge conflicts expected
- [ ] Deployment checklist complete

## 📊 Common Scenarios & Solutions

### Scenario 1: "Main has commits staging doesn't have"
**Problem**: You're trying to merge work that's already in main
**Solution**: Reset staging to main, your work is already deployed

### Scenario 2: "Circular merge detected"
**Problem**: Both main ↔ staging have been merged into each other
**Solution**: Reset staging to main, abandon circular dependencies

### Scenario 3: "Same work in both branches"
**Problem**: Duplicate implementation
**Solution**: Identify which version is better, reset other branch

### Scenario 4: "Dependency conflicts in lock files"
**Problem**: Both package-lock.json and yarn.lock committed
**Solution**: Choose one lock file, remove the other, reinstall dependencies
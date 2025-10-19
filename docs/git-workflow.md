# Git Workflow Guidelines

## 🎯 Core Principle: Unidirectional Flow

```
feature branch → staging → main
```

**NEVER**: `main → staging` (causes conflicts)

## 🚀 Standard Workflow Commands

### 1. Start New Feature
```bash
# Always start from clean staging
git checkout staging
git pull origin staging
git checkout -b feature/ISSUE-NUMBER-description
```

### 2. Complete Development
```bash
# Make your changes
git add .
git commit -m "feat: Description (#ISSUE-NUMBER)"
```

### 3. Merge to Staging
```bash
git checkout staging
git pull origin staging  # Get latest staging
git merge feature/ISSUE-NUMBER-description  # Fast-forward preferred
git push origin staging
```

### 4. Deploy to Production
```bash
# After staging validation:
git checkout main
git pull origin main
git merge staging --ff-only  # FAST-FORWARD ONLY
git push origin main
```

### 5. Clean Up
```bash
git branch -d feature/ISSUE-NUMBER-description
```

## 🚫 FORBIDDEN PATTERNS

### Never Do These:
```bash
# ❌ Circular merging (causes conflicts)
git checkout staging && git merge main
git checkout main && git merge staging

# ❌ Working directly on main/staging
git checkout main  # Don't commit directly
git checkout staging  # Don't commit directly

# ❌ Force pushing to main
git push origin main --force  # Dangerous
```

## ✅ ALLOWED PATTERNS

### These Are Safe:
```bash
# ✅ Feature development flow
feature → staging → main

# ✅ Fast-forward merges (preferred)
git merge --ff-only

# ✅ Feature branch cleanup
git branch -d feature-name
```

## 🔍 Troubleshooting

### If you encounter conflicts:
1. Stop - don't force merge
2. Check for duplicate work
3. See `conflict-prevention.md` for recovery

### If staging diverged from main:
```bash
git checkout staging
git reset --hard origin/main  # Use if main has latest work
```

## 📊 Branch Responsibilities

| Branch | Purpose | Rules |
|--------|---------|-------|
| **main** | Production | ✅ Read-only for development<br>❌ No direct commits |
| **staging** | Integration | ✅ Receives features<br>❌ Never receives main |
| **feature** | Development | ✅ From staging only<br>✅ Merges to staging only |

## 🔒 Safety Validation

Before any merge, verify:
```bash
git status  # Should be clean
git log --oneline origin/main..origin/staging  # Should show intended work only
git log --oneline origin/staging..origin/main  # Should be empty
```
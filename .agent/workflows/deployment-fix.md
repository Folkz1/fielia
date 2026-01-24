---
description: Steps to fix build errors and verify deployment readiness
---

# Fix & Deploy Workflow

## 1. Fix Type Error

The build is failing because `@types/pg` is missing.

- Command: `npm install -D @types/pg`

## 2. Verify Build Locally

Run the build locally to ensure no other errors exist.

- Command: `npm run build`

## 3. Push to GitHub

Sync the fixes to the repo to trigger deployment.

- Command: `git add .`
- Command: `git commit -m "fix(build): install @types/pg"`
- Command: `git push`

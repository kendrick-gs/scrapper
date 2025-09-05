#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
const hookDir = path.join(process.cwd(), '.git','hooks');
if (!fs.existsSync(hookDir)) fs.mkdirSync(hookDir);
const hookPath = path.join(hookDir,'pre-push');
const content = `#!/bin/sh
if ! grep -q '## \\[Unreleased]' CHANGELOG.md; then
  echo 'Missing Unreleased section in CHANGELOG.md'; exit 1; fi
if ! git diff --cached --name-only | grep -q '^CHANGELOG.md$' && git diff --name-only | grep -q '^CHANGELOG.md$'; then
git add CHANGELOG.md; fi
if [ -n "$(git diff --cached --name-only)" ]; then
node scripts/auto-commit.js || exit 1; fi
exit 0
`;
fs.writeFileSync(hookPath, content, {mode:0o755});
console.log('Installed pre-push hook.');

#!/usr/bin/env node
const { execSync } = require('child_process');
function run(cmd){ return execSync(cmd,{stdio:'pipe'}).toString().trim(); }
try {
  const branch = run('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'dev') { console.error('Not on dev; aborting.'); process.exit(1); }
  const staged = run('git diff --cached --name-only || true');
  if (!staged) { console.log('No staged changes.'); process.exit(0); }
  const changelog = run('cat CHANGELOG.md');
  if (!/## \[Unreleased\]/.test(changelog)) { console.error('Missing Unreleased section'); process.exit(1); }
  const files = staged.split('\n').filter(Boolean);
  let summary = files.slice(0,5).join(', '); if (files.length>5) summary += ', ...';
  const msg = `chore(auto): update ${summary}`;
  run(`git commit -m "${msg}"`);
  run('git push origin dev');
  console.log('Pushed with:', msg);
} catch(e){ console.error('Auto commit failed:', e.message); process.exit(1);}

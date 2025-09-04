## Contributing Guidelines

We follow Semantic Versioning 2.0.0 and Conventional Commits.

### Versioning Policy

Current release base: `v1.7.0`.

Until a new major version is explicitly released, only increment:

* PATCH (x.y.Z) for backwards compatible bug fixes
* MINOR (x.Y.z) for backwards compatible features

Do not change MAJOR (X.y.z) without an explicit decision.

### Commit Message Format (Conventional Commits)

```
<type>(optional scope): <short summary>

<body>

<footer>
```

Allowed types include:
`feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.

Examples:
* `feat: add bulk product import endpoint`
* `fix(cache): prevent infinite loop in refresh routine`

### Release Process

1. Ensure `dev` contains all intended changes since `v1.7.0`.
2. Update `package.json` version following semver.
3. Add a changelog entry (see below) summarizing notable changes.
4. Commit with `chore(release): bump version to x.y.z`.
5. Tag commit: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
6. Push: `git push origin <branch> && git push origin vX.Y.Z`.

### Changelog

Create or update `CHANGELOG.md` using Keep a Changelog structure (Unreleased section then releases).

### Safeguards

* No force pushes to `master` except for coordinated history resets.
* All feature work targets `dev`.
* Merge to `master` only during release.

### Questions

Open an issue or discussion for clarification before large or breaking changes.

# Releasing gitleaks-action

## Semver tags (immutable)

Semver tags like `v3.0.0`, `v3.1.0` are **immutable** — once pushed, they must never be force-updated or deleted. Tag protection rules enforce this.

## Rolling major tags

Rolling tags like `v3` point to the latest patch in their major line. After creating a new semver tag, update the rolling tag:

```bash
git tag -fa v3 v3.x.y
git push origin v3 --force
```

Only gitleaks org members should update rolling tags.

## Release checklist

1. Ensure `dist/` is up to date: `npm ci && npx ncc build src/index.js -o dist`
2. Verify the `verify-dist` CI check passes
3. Merge the PR to `master`
4. Create the semver tag: `git tag v3.x.y && git push origin v3.x.y`
5. Update the rolling tag (see above)
6. Create a GitHub Release from the semver tag with changelog notes

# Updating a fork or clone

Play Together has two safe update paths. Both preserve the rule that published game cartridges are immutable: never edit an existing release path to “catch up”.

## Fork: use the GitHub button

1. Open your fork’s **Actions** tab.
2. Choose **Update from upstream**.
3. Press **Run workflow**.
4. Review and merge the pull request it creates.

The workflow only fast-forwards a non-diverged `main` history. If your fork has changes, it fails safely rather than overwriting them.

## Clone: use the update command

```bash
pnpm repo:update --dry-run
pnpm repo:update
```

The command requires a clean worktree, adds the canonical repository as `upstream` when absent, fetches `upstream/main`, and performs only a fast-forward merge.

## Player update

Players do not update source code. When a deployed PWA has a newer `/version.json`, it shows an **Update** button that refreshes the application shell while preserving sign-in.

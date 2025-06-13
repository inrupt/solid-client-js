<!-- When fixing a bug: -->

This PR fixes #<issue ID>.

- [ ] I've added a unit test to test for potential regressions of this bug.
- [ ] The changelog has been updated, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When adding a new feature: -->

## New feature description

## Checklist

- [ ] All acceptance criteria are met.
- [ ] Relevant documentation, if any, has been written/updated.
- [ ] The changelog has been updated, if applicable.
- [ ] New functions/types have been exported in `index.ts`, if applicable.
- [ ] New modules (i.e. new `.ts` files) are listed in the `exports` field in `package.json`, if applicable.
- [ ] New modules (i.e. new `.ts` files) are listed in the `typedocOptions.entryPoints` field in `tsconfig.json`, if applicable.
- [ ] Commits in this PR are minimal and [have descriptive commit messages](https://chris.beams.io/posts/git-commit/).

<!-- When cutting a release: -->

This PR bumps the version to <version number>.

## Checklist

- [ ] I inspected the changelog to determine if the release was major, minor or patch. I then used the command `npm version <major|minor|patch>` to update the `package.json` and `package-lock.json` (and locally create a tag).
- [ ] The CHANGELOG has been updated to show version and release date - https://keepachangelog.com/en/1.0.0/.
- [ ] `@since X.Y.Z` annotations have been added to new APIs.
- [ ] The **only** commits in this PR are:
  - the CHANGELOG update.
  - the version update.
  - `@since` annotations.
- [ ] I will make sure **not** to squash these commits, but **rebase** instead.
- [ ] Once this PR is merged, I will push the tag created by `npm version ...` (e.g. `git push origin vX.Y.Z`).

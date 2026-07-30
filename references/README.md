# Reference films

Films whose camera language OpenDemo borrows from. **The media is not committed.**

```bash
node references/fetch.mjs           # download everything missing
node references/fetch.mjs --check   # verify what is on disk
```

Files land in `references/media/`, which is gitignored. `references.json` carries the
URL, an md5, and a pointer to the notes for each one.

Why a manifest instead of committing the videos, or parking them on a branch: git
fetches all branches by default, so a "reference branch" still costs every clone the
full download, permanently, in history. A manifest costs a few hundred bytes and the
people who need the media are the handful doing camera work.

## Adding a reference

1. Put the file somewhere fetchable over HTTP.
2. Add an entry to `references.json` — `id`, `file`, `url`, `md5`, `spec`.
3. Append a **Per-reference notes** section to [`../docs/reference-matching.md`](../docs/reference-matching.md).
   Keep the method in that doc generic; only the notes section is per-film.

If a reference is not fetchable, it does not belong in the repo. Keep it locally and
record what you measured from it in the notes — the measurements are the durable part,
not the file.

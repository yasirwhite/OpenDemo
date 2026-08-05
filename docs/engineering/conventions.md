# Engineering conventions

The rules that keep the repo small, navigable, and cheap for models to load.
Add to this file when a convention is decided; do not leave conventions implied.

## Naming

- **Templates are named after trees** — `cedar`, `birch`, `aspen`, `willow`,
  `sequoia`, `juniper`, … Short, memorable, and no meaning to collide with
  product words or preset slugs. One tree per template, lowercase, used as the
  folder name under `templates/` and the `slug` in `templates/index.json`.
- **Preset slugs describe the shot or beat** (`laptop-punch-reveal`,
  `reveal-line`) — kebab-case, registered in their engine's `presets/index`.
- **Terminology:** a *preset* is one shot or text beat; a *template* is a
  complete film built out of presets, with product slots and role-tagged copy.
  Docs and prompts should never use the two interchangeably.

## Media and repo size

- **No committed video/reference media, ever.** References, template preview
  videos and deliverables are tracked as manifests (URL + md5) and fetched —
  see `references/README.md` for the rationale. Small JPG preview strips are
  the one exception (`presets/previews/`).
- **Scratch work lives in `.demo-build/`** (gitignored). Working configs live
  in the gitignored config dirs, never in `examples/` or `templates/`.
- No long-lived asset branches: a branch costs every clone the download,
  permanently.

## Docs

- **Task-scoped, one hop from `AGENT_README.md`.** The router table there is
  the contract: an agent reads only the docs its task needs. When adding a
  doc, add it to that table; when a doc grows a second audience, split it
  rather than letting it poison the other audience's context.
- Engine READMEs stay colocated with their engine (`src/lib/<engine>/`);
  deep dives and methods live in `docs/`.

## Configs

- Measured values beat invented ones: parameter defaults in the engines were
  read off real films frame-by-frame, and configs should not casually override
  them.
- Configs are authored *outside* the repo (or in the gitignored config dirs);
  everything committed under `examples/` and `templates/` must render as-is.

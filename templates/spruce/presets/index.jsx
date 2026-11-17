/**
 * spruce preset registry — every preset the `spruce` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 *
 * spruce-type.jsx holds the grounds and the type (lines, counter, orbs, bloom,
 * lockup); spruce-ui.jsx the drawn product (glow pill, app windows, buttons,
 * dialogs, toolbar, laptop) and spruce-end.jsx the closing aura and end card.
 */

import { END_PRESETS } from "./spruce-end.jsx";
import { TYPE_PRESETS } from "./spruce-type.jsx";
import { UI_PRESETS } from "./spruce-ui.jsx";

export const SPRUCE_PRESETS = {
	...TYPE_PRESETS,
	...UI_PRESETS,
	...END_PRESETS,
};

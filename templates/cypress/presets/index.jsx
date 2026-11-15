/**
 * cypress preset registry — every preset the `cypress` launch film is built from.
 *
 * Registered into the shared textcards registry by ONE additive spread in
 * src/lib/textcards/src/presets/index.jsx. Same entry shape as every other
 * preset: note, nativeMs, params, render(cfg, t). All are pure functions of t.
 *
 * s1 the call grid, the agent's tile and the title bubbles; s2 the whiteboard
 * build; s3 the sort, the votes and the chat; s4 the notes doc, the word-swap
 * line and the end card.
 */

import { S1_PRESETS } from "./cypress-s1.jsx";
import { S2_PRESETS } from "./cypress-s2.jsx";
import { S3_PRESETS } from "./cypress-s3.jsx";
import { S4_PRESETS } from "./cypress-s4.jsx";

export const CYPRESS_PRESETS = {
	...S1_PRESETS,
	...S2_PRESETS,
	...S3_PRESETS,
	...S4_PRESETS,
};

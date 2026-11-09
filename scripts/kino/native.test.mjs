// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { buildKinoDocument } from "./bridge.mjs";

test("installed Kino model accepts split screen and presenter media", {
	skip: !process.env.KINO_PATH,
}, async () => {
	const model = await import(
		pathToFileURL(path.resolve(process.env.KINO_PATH, "engine/model.js")).href
	);
	const manifest = {
		version: 1,
		name: "Native compatibility fixture",
		width: 1920,
		height: 1080,
		duration: 700,
		media: [
			{ id: "screen", duration: 1500, width: 1920, height: 1080 },
			{ id: "presenter", duration: 710, width: 720, height: 1280 },
		],
		segments: [{ sourceId: "screen", start: 0, offset: 20, duration: 700, speed: 2 }],
		presenter: { sourceId: "presenter", start: 0, offset: 10, duration: 700 },
	};
	const result = buildKinoDocument(
		manifest,
		{ screen: "/api/media/screen", presenter: "/api/media/presenter" },
		model,
	);
	assert.equal(result.version, 6);
	assert.deepEqual(
		result.scenes.map((scene) => scene.duration),
		[600, 100],
	);
	assert.equal(result.scenes[1].layers[0].mediaOffset, 1220);
	assert.equal(result.scenes[1].layers[1].mediaOffset, 610);
	assert.equal(result.scenes[1].layers[1].playbackWindows[0].end, 100);
});

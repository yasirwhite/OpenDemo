// SPDX-License-Identifier: AGPL-3.0-only

import assert from "node:assert/strict";
import test from "node:test";
import { buildKinoDocument, planTimeline, unsupportedFeatures } from "./bridge.mjs";

const model = {
	createLayer: (type, fields) => ({ type, ...fields }),
	createScene: (fields) => fields,
	createDocument: (fields) => fields,
	parseDocument: (document) => document,
};
const source = {
	id: "screen",
	path: "media/screen.mp4",
	duration: 1500,
	width: 1920,
	height: 1080,
};
function manifest(overrides = {}) {
	return {
		version: 1,
		name: "Test",
		width: 1920,
		height: 1080,
		duration: 700,
		media: [source],
		segments: [{ sourceId: "screen", start: 0, offset: 20, duration: 700, speed: 2 }],
		...overrides,
	};
}

test("removes overlapping trims and maps speeds after removal", () => {
	const result = planTimeline(
		12,
		[
			{ startMs: 2000, endMs: 4000 },
			{ startMs: 3000, endMs: 5000 },
		],
		[{ startMs: 6000, endMs: 10000, speed: 2 }],
	);
	assert.equal(result.duration, 7);
	assert.deepEqual(result.segments, [
		{ start: 0, offset: 0, duration: 2, speed: 1 },
		{ start: 2, offset: 5, duration: 1, speed: 1 },
		{ start: 3, offset: 6, duration: 2, speed: 2 },
		{ start: 5, offset: 10, duration: 2, speed: 1 },
	]);
});

test("first matching speed wins; redundant boundaries merge", () => {
	const result = planTimeline(
		10,
		[],
		[
			{ startMs: 1000, endMs: 7000, speed: 2 },
			{ startMs: 3000, endMs: 9000, speed: 4 },
		],
	);
	assert.deepEqual(
		result.segments.map(({ offset, duration, speed }) => ({ offset, duration, speed })),
		[
			{ offset: 0, duration: 1, speed: 1 },
			{ offset: 1, duration: 3, speed: 2 },
			{ offset: 7, duration: 0.5, speed: 4 },
			{ offset: 9, duration: 1, speed: 1 },
		],
	);
});

test("clips stale regions beyond source and rejects malformed or empty results", () => {
	assert.equal(planTimeline(10, [{ startMs: 8000, endMs: 20000 }]).duration, 8);
	assert.throws(() => planTimeline(10, [{ startMs: 0, endMs: 10000 }]), /trimmed away/);
	assert.throws(() => planTimeline(10, [], [{ startMs: 0, endMs: 1000, speed: 0 }]), /speed/);
	assert.throws(() => planTimeline(NaN), /duration/);
	assert.throws(() => planTimeline(10, [{ startMs: 2000, endMs: 1000 }]), /after/);
});

test("splits long timelines without resetting accelerated source offsets", () => {
	const document = buildKinoDocument(manifest(), { screen: "/api/media/screen" }, model);
	assert.deepEqual(
		document.scenes.map((scene) => scene.duration),
		[600, 100],
	);
	const [first, second] = document.scenes.map((scene) => scene.layers[0]);
	assert.equal(first.mediaOffset, 20);
	assert.equal(second.mediaOffset, 1220);
	assert.equal(second.mediaStart, 0);
	assert.equal(second.mediaSpeed, 2);
	assert.deepEqual(second.playbackWindows, [
		{ start: 0, end: 100, visibility: "during", hold: false },
	]);
});

test("presenter stays above screen, keeps aspect ratio and clips across scene boundaries", () => {
	const document = buildKinoDocument(
		manifest({
			media: [source, { id: "human", duration: 200, width: 720, height: 1280 }],
			presenter: { sourceId: "human", start: 590, offset: 5, duration: 100 },
		}),
		{ screen: "/api/media/screen", human: "/api/media/human" },
		model,
	);
	const first = document.scenes[0].layers.at(-1);
	const second = document.scenes[1].layers.at(-1);
	assert.equal(first.mediaStart, 590);
	assert.equal(first.mediaDuration, 10);
	assert.equal(second.mediaOffset, 15);
	assert.equal(second.mediaDuration, 90);
	assert.ok(Math.abs(second.width / second.height - 720 / 1280) < 1e-10);
	assert.equal(document.scenes[0].layers[0].volume, 0);
	assert.equal(first.volume, 1);
});

test("fails before model creation for unmapped media or invalid source ranges", () => {
	assert.throws(() => buildKinoDocument(manifest(), {}, model), /Missing imported media/);
	assert.throws(
		() =>
			buildKinoDocument(
				manifest({
					segments: [{ sourceId: "screen", start: 0, offset: 100, duration: 700, speed: 3 }],
				}),
				{ screen: "/api/media/screen" },
				model,
			),
		/beyond its source/,
	);
	assert.throws(
		() =>
			buildKinoDocument(
				manifest({
					segments: [
						{ sourceId: "screen", start: 0, offset: 0, duration: 100, speed: 1 },
						{ sourceId: "screen", start: 50, offset: 100, duration: 100, speed: 1 },
					],
				}),
				{ screen: "/api/media/screen" },
				model,
			),
		/must not overlap/,
	);
});

test("warns about unsupported visual and editable cursor changes", () => {
	const warnings = unsupportedFeatures({
		media: { cursorCaptureMode: "editable-overlay", webcamVideoPath: "camera.webm" },
		editor: {
			zoomRegions: [{}],
			annotationRegions: [{}],
			cropRegion: { x: 0.1, y: 0, width: 0.9, height: 1 },
			padding: 30,
		},
	});
	assert.equal(warnings.length, 6);
	assert.deepEqual(
		unsupportedFeatures({ editor: { cropRegion: { x: 0, y: 0, width: 1, height: 1 } } }),
		[],
	);
});

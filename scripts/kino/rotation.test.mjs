// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildKinoDocument } from "./bridge.mjs";
import { displayDimensions, exportBundle, probe } from "./bundle.mjs";

test("display dimensions use matrix rotation before legacy rotate tags", () => {
	for (const rotation of [90, -90, 270, -270]) {
		assert.deepEqual(
			displayDimensions({ width: 1920, height: 1080, side_data_list: [{ rotation }] }),
			{ width: 1080, height: 1920 },
		);
	}
	assert.deepEqual(displayDimensions({ width: 1920, height: 1080, tags: { rotate: "90" } }), {
		width: 1080,
		height: 1920,
	});
	assert.deepEqual(
		displayDimensions({
			width: 1920,
			height: 1080,
			side_data_list: [{ rotation: 180 }],
			tags: { rotate: "90" },
		}),
		{ width: 1920, height: 1080 },
	);
});

test("rotated MP4 uses upright canvas and presenter aspect ratio", {
	skip: !process.env.KINO_FFMPEG_TESTS,
}, async (t) => {
	const directory = await mkdtemp(path.join(os.tmpdir(), "kino-rotation-"));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const plain = path.join(directory, "plain.mp4");
	const rotated = path.join(directory, "rotated.mp4");
	const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
	execFileSync(ffmpeg, [
		"-v",
		"error",
		"-f",
		"lavfi",
		"-i",
		"color=c=blue:size=1920x1080:rate=1",
		"-t",
		"1",
		"-c:v",
		"libx264",
		"-pix_fmt",
		"yuv420p",
		plain,
	]);
	execFileSync(ffmpeg, [
		"-v",
		"error",
		"-display_rotation",
		"90",
		"-i",
		plain,
		"-c",
		"copy",
		rotated,
	]);
	assert.deepEqual(probe(rotated), { duration: 1, width: 1080, height: 1920 });
	const manifest = await exportBundle({
		input: rotated,
		out: path.join(directory, "bundle"),
		human: rotated,
	});
	assert.equal(manifest.width, 1080);
	assert.equal(manifest.height, 1920);
	const model = {
		createLayer: (type, fields) => ({ type, ...fields }),
		createScene: (fields) => fields,
		createDocument: (fields) => fields,
		parseDocument: (value) => value,
	};
	const document = buildKinoDocument(
		manifest,
		{ screen: "/api/media/screen", presenter: "/api/media/presenter" },
		model,
	);
	const presenter = document.scenes[0].layers.at(-1);
	assert.ok(Math.abs(presenter.width / presenter.height - 1080 / 1920) < 1e-9);
});

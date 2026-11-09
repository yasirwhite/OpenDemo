// SPDX-License-Identifier: AGPL-3.0-only

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { digest, exportBundle, loadBundle } from "./bundle.mjs";

async function fixture(t) {
	const directory = await mkdtemp(path.join(os.tmpdir(), "opendemo-kino-"));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const input = path.join(directory, "personal-name.mp4");
	await writeFile(input, "synthetic test bytes, not real footage");
	return { directory, input, out: path.join(directory, "bundle") };
}
const measure = async () => ({ duration: 20, width: 1280, height: 720 });

test("bundle is portable, avoids source paths, and refuses overwritten output", async (t) => {
	const options = await fixture(t);
	const manifest = await exportBundle(options, measure);
	const { files } = await loadBundle(options.out);
	assert.equal(manifest.media[0].path, "media/screen.mp4");
	assert.equal(await digest(options.input), await digest(files.screen));
	const json = await readFile(path.join(options.out, "manifest.json"), "utf8");
	assert.ok(!json.includes(options.directory));
	assert.ok(!json.includes("personal-name"));
	await assert.rejects(exportBundle(options, measure), { code: "EEXIST" });
});

test("project trims and presenter offset survive without embedding original project", async (t) => {
	const options = await fixture(t);
	const project = path.join(options.directory, "edit.openscreen");
	await writeFile(
		project,
		JSON.stringify({
			version: 2,
			media: { screenVideoPath: "./personal-name.mp4" },
			editor: {
				trimRegions: [{ startMs: 2000, endMs: 5000 }],
				speedRegions: [{ startMs: 10000, endMs: 20000, speed: 2 }],
			},
		}),
	);
	const manifest = await exportBundle(
		{ ...options, input: project, human: options.input, humanStart: 3, humanOffset: 4 },
		measure,
	);
	assert.equal(manifest.duration, 12);
	assert.equal(manifest.presenter.duration, 9);
	assert.equal(manifest.presenter.offset, 4);
	assert.deepEqual(Object.keys((await loadBundle(options.out)).files), ["screen", "presenter"]);
});

test("unsupported visual settings require explicit lossy handoff", async (t) => {
	const options = await fixture(t);
	const project = path.join(options.directory, "edit.openscreen");
	await writeFile(
		project,
		JSON.stringify({
			version: 2,
			videoPath: options.input,
			editor: { zoomRegions: [{ startMs: 0, endMs: 1000 }] },
		}),
	);
	await assert.rejects(exportBundle({ ...options, input: project }, measure), /accept-visual-loss/);
	const manifest = await exportBundle(
		{ ...options, input: project, acceptVisualLoss: true },
		measure,
	);
	assert.equal(manifest.warnings.length, 1);
});

test("tampered media and traversal are refused before upload", async (t) => {
	const options = await fixture(t);
	const manifest = await exportBundle(options, measure);
	await writeFile(path.join(options.out, manifest.media[0].path), "changed");
	await assert.rejects(loadBundle(options.out), /integrity/);
	manifest.media[0].path = "../personal-name.mp4";
	await writeFile(path.join(options.out, "manifest.json"), JSON.stringify(manifest));
	await assert.rejects(loadBundle(options.out), /inside the bundle/);
});

test("directory symlinks cannot smuggle external media into a bundle", async (t) => {
	const options = await fixture(t);
	const manifest = await exportBundle(options, measure);
	const external = path.join(options.directory, "external");
	await mkdir(external);
	await writeFile(path.join(external, "clip.mp4"), "outside");
	await symlink(
		external,
		path.join(options.out, "linked"),
		process.platform === "win32" ? "junction" : "dir",
	);
	manifest.media[0].path = "linked/clip.mp4";
	await writeFile(path.join(options.out, "manifest.json"), JSON.stringify(manifest));
	await assert.rejects(loadBundle(options.out), /escapes the bundle/);
});

// SPDX-License-Identifier: AGPL-3.0-only
import assert from "node:assert/strict";
import { link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { importBundle, validateUploadSizes } from "./importer.mjs";

const model = {
	createLayer: (type, fields) => ({ type, ...fields }),
	createScene: (fields) => fields,
	createDocument: (fields) => fields,
	parseDocument: (value) => value,
};
const manifest = {
	version: 1,
	name: "Test",
	width: 640,
	height: 360,
	duration: 3,
	media: [{ id: "screen", width: 640, height: 360, duration: 3 }],
	segments: [{ sourceId: "screen", start: 0, offset: 0, duration: 3, speed: 1 }],
};

async function fixture(t, refusal) {
	const bundle = await mkdtemp(path.join(os.tmpdir(), "kino-import-"));
	t.after(() => rm(bundle, { recursive: true, force: true }));
	const calls = [];
	const client = {
		call: async (verb, input) => {
			calls.push(input.action);
			return input.action === refusal
				? { data: { held: true }, text: "held for review" }
				: { data: { project: input.action === "open" ? input.id : "upload-workspace" } };
		},
		importFile: async (file) => {
			calls.push(path.extname(file));
			return file.endsWith(".motion")
				? { project: "final-edit" }
				: { src: "/api/media/new-source" };
		},
	};
	return { bundle, manifest, files: { screen: "screen.mp4" }, model, client, calls };
}

test("opens the imported edit rather than leaving the upload workspace active", async (t) => {
	const options = await fixture(t);
	const result = await importBundle(options);
	assert.equal(result.project, "final-edit");
	assert.equal(result.rendered, false);
	assert.deepEqual(options.calls, ["create", ".mp4", ".motion", "open"]);
	const document = JSON.parse(await readFile(result.file, "utf8"));
	assert.equal(document.scenes[0].layers[0].src, "/api/media/new-source");
});

test("held create prevents all uploads", async (t) => {
	const options = await fixture(t, "create");
	await assert.rejects(importBundle(options), /held for review/);
	assert.deepEqual(options.calls, ["create"]);
});

test("held open reports the completed import and preserves recovery ID", async (t) => {
	const options = await fixture(t, "open");
	await assert.rejects(importBundle(options), /Imported project final-edit/);
	const result = JSON.parse(
		await readFile(path.join(options.bundle, "import-result.json"), "utf8"),
	);
	assert.equal(result.project, "final-edit");
});

test("missing create confirmation prevents uploads", async (t) => {
	const options = await fixture(t);
	options.client.call = async () => ({ data: {} });
	await assert.rejects(importBundle(options), /did not create/);
	assert.deepEqual(options.calls, []);
});

test("media refusal never imports a document", async (t) => {
	const options = await fixture(t);
	options.client.importFile = async () => ({ refused: { text: "upload held" } });
	await assert.rejects(importBundle(options), /upload held/);
	await assert.rejects(readFile(path.join(options.bundle, "handoff.motion")), { code: "ENOENT" });
});

test("document refusal never writes a successful import result", async (t) => {
	const options = await fixture(t);
	options.client.importFile = async (file) =>
		file.endsWith(".motion") ? { refused: { text: "document held" } } : { src: "/api/media/clip" };
	await assert.rejects(importBundle(options), /document held/);
	await assert.rejects(readFile(path.join(options.bundle, "import-result.json")), {
		code: "ENOENT",
	});
});

test("oversized media is rejected with actionable instructions before upload", async (t) => {
	const options = await fixture(t);
	const file = path.join(options.bundle, "clip.mp4");
	await writeFile(file, "123456");
	await assert.rejects(validateUploadSizes({ screen: file }, 5), /shorter selected takes/);
	await validateUploadSizes({ screen: file }, 6);
});

for (const name of ["handoff.motion", "import-result.json"]) {
	test(`${name} output symlink is rejected before any server call`, async (t) => {
		const options = await fixture(t);
		const outside = await mkdtemp(path.join(os.tmpdir(), "kino-outside-"));
		t.after(() => rm(outside, { recursive: true, force: true }));
		const target = path.join(outside, "untouched.txt");
		await writeFile(target, "do not change this");
		await symlink(target, path.join(options.bundle, name), "file");
		await assert.rejects(importBundle(options), /Unsafe output destination/);
		assert.deepEqual(options.calls, []);
		assert.equal(await readFile(target, "utf8"), "do not change this");
	});
}

test("atomic output replacement does not truncate an external hardlink target", async (t) => {
	const options = await fixture(t);
	const outside = await mkdtemp(path.join(os.tmpdir(), "kino-outside-"));
	t.after(() => rm(outside, { recursive: true, force: true }));
	const target = path.join(outside, "untouched.txt");
	await writeFile(target, "original contents");
	await link(target, path.join(options.bundle, "handoff.motion"));
	await link(target, path.join(options.bundle, "import-result.json"));
	await importBundle(options);
	assert.equal(await readFile(target, "utf8"), "original contents");
});

test("Windows junction output destination is rejected before server calls", {
	skip: process.platform !== "win32",
}, async (t) => {
	const options = await fixture(t);
	const outside = await mkdtemp(path.join(os.tmpdir(), "kino-outside-"));
	t.after(() => rm(outside, { recursive: true, force: true }));
	await writeFile(path.join(outside, "untouched.txt"), "original contents");
	await symlink(outside, path.join(options.bundle, "handoff.motion"), "junction");
	await assert.rejects(importBundle(options), /Unsafe output destination/);
	assert.deepEqual(options.calls, []);
	assert.equal(await readFile(path.join(outside, "untouched.txt"), "utf8"), "original contents");
});

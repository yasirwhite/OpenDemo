// SPDX-License-Identifier: AGPL-3.0-only
import { randomUUID } from "node:crypto";
import { lstat, open, realpath, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { buildKinoDocument } from "./bridge.mjs";

function refused(reply) {
	return reply?.isError || reply?.data?.held || reply?.data?.waiting;
}

async function safeOutputPaths(bundle) {
	const root = await realpath(bundle);
	if (!(await stat(root)).isDirectory()) throw new Error("Bundle must be a directory.");
	const paths = ["handoff.motion", "import-result.json"].map((name) => path.join(root, name));
	for (const file of paths) {
		let info;
		try {
			info = await lstat(file);
		} catch (error) {
			if (error.code === "ENOENT") continue;
			throw error;
		}
		// Node reports Windows junctions/reparse-point symlinks through lstat too.
		if (info.isSymbolicLink() || !info.isFile())
			throw new Error(
				`Unsafe output destination: ${path.basename(file)} must not be a symlink or directory.`,
			);
	}
	return paths;
}

async function atomicWrite(file, contents) {
	const temporary = path.join(path.dirname(file), `.opendemo-${randomUUID()}.tmp`);
	let owned = false;
	try {
		const handle = await open(temporary, "wx");
		owned = true;
		try {
			await handle.writeFile(contents);
		} finally {
			await handle.close();
		}
		// Replaces the directory entry rather than truncating a target through a link.
		await rename(temporary, file);
	} finally {
		if (owned) await rm(temporary, { force: true });
	}
}

export async function validateUploadSizes(files, limit) {
	if (!Number.isFinite(limit) || limit <= 0)
		throw new Error("Kino did not expose a valid upload limit.");
	for (const [id, file] of Object.entries(files)) {
		if ((await stat(file)).size > limit)
			throw new Error(
				`Media ${id} exceeds this Kino version's ${limit}-byte upload limit. Export shorter selected takes or a smaller compatible copy first; the original is unchanged. Automatic quality reduction is not used by this bridge.`,
			);
	}
}

export async function importBundle({ bundle, manifest, files, model, client }) {
	const [motionPath, resultPath] = await safeOutputPaths(bundle);
	const sources = Object.fromEntries(
		manifest.media.map((media) => [media.id, `/api/media/preflight-${media.id}`]),
	);
	buildKinoDocument(manifest, sources, model);
	// Requires exclusive use of this server during import: Kino's current project is global.
	const created = await client.call("project", {
		action: "create",
		name: manifest.name,
		width: manifest.width,
		height: manifest.height,
		duration: Math.min(manifest.duration, 600),
	});
	if (refused(created) || typeof created?.data?.project !== "string" || !created.data.project)
		throw new Error(created.text || "Kino did not create the handoff workspace.");
	for (const [id, file] of Object.entries(files)) {
		const uploaded = await client.importFile(file);
		if (uploaded.refused || !uploaded.src)
			throw new Error(uploaded.refused?.text || `Kino did not return a media source for ${id}.`);
		sources[id] = uploaded.src;
	}
	const document = buildKinoDocument(manifest, sources, model);
	await atomicWrite(motionPath, `${JSON.stringify(document, null, 2)}\n`);
	const imported = await client.importFile(motionPath);
	if (imported?.refused || !imported?.project)
		throw new Error(
			imported?.refused?.text || "Kino did not confirm importing the native document.",
		);
	await atomicWrite(
		resultPath,
		`${JSON.stringify({ project: imported.project, sources }, null, 2)}\n`,
	);
	const opened = await client.call("project", { action: "open", id: imported.project });
	if (refused(opened))
		throw new Error(
			`Imported project ${imported.project}, but opening it was refused: ${opened.text || "approval pending"}. The project ID is saved in import-result.json.`,
		);
	return {
		project: imported.project,
		file: motionPath,
		scenes: document.scenes.length,
		rendered: false,
	};
}

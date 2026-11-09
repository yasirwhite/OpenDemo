// SPDX-License-Identifier: AGPL-3.0-only

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planTimeline, unsupportedFeatures } from "./bridge.mjs";

export async function digest(file) {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(file)) hash.update(chunk);
	return hash.digest("hex");
}

export function probe(file) {
	const result = JSON.parse(
		execFileSync(
			process.env.FFPROBE_PATH || "ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration:stream=codec_type,width,height,duration:stream_tags=rotate:stream_side_data=rotation",
				"-of",
				"json",
				file,
			],
			{ encoding: "utf8", maxBuffer: 1024 * 1024 },
		),
	);
	const video = result.streams?.find((stream) => stream.codec_type === "video");
	const duration = Number(result.format?.duration || video?.duration);
	if (
		!video ||
		!Number.isFinite(duration) ||
		duration <= 0 ||
		duration > 86400 ||
		!video.width ||
		!video.height
	) {
		throw new Error(
			"Media must have a video stream and measured duration between 0 and 86400 seconds.",
		);
	}
	return { duration, ...displayDimensions(video) };
}

export function displayDimensions(stream) {
	let width = Number(stream.width);
	let height = Number(stream.height);
	const rotation = Number(
		stream.side_data_list?.find((item) => item.rotation != null)?.rotation ??
			stream.tags?.rotate ??
			0,
	);
	// Match Kino/FFmpeg/browser display orientation, rather than encoded pixel order.
	if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
	return { width: Math.round(width), height: Math.round(height) };
}

function sourcePath(value, directory) {
	if (typeof value !== "string" || !value.trim())
		throw new Error("Project has no screen media path.");
	if (/^file:/i.test(value)) return fileURLToPath(value);
	if (/^[a-z]+:\/\//i.test(value))
		throw new Error("Only local media files are supported. Download the media first.");
	return path.resolve(directory, value);
}

export async function exportBundle(
	{ input, out, human, humanStart = 0, humanOffset = 0, acceptVisualLoss = false },
	measure = probe,
) {
	input = path.resolve(input);
	out = path.resolve(out);
	let project = null;
	let screen = input;
	if ([".openscreen", ".json"].includes(path.extname(input).toLowerCase())) {
		project = JSON.parse(await readFile(input, "utf8"));
		if (![1, 2].includes(project.version))
			throw new Error("Expected OpenDemo project version 1 or 2.");
		screen = sourcePath(project.media?.screenVideoPath || project.videoPath, path.dirname(input));
	}
	const warnings = project ? unsupportedFeatures(project) : [];
	if (warnings.length && !acceptVisualLoss) {
		throw new Error(
			`Visual conversion needs a decision:\n${warnings.join("\n")}\nUse an exported OpenDemo video to preserve its look, or pass --accept-visual-loss for raw editable cuts.`,
		);
	}
	const screenInfo = await measure(screen);
	const timeline = planTimeline(
		screenInfo.duration,
		project?.editor?.trimRegions || [],
		project?.editor?.speedRegions || [],
	);
	const mediaInputs = [{ id: "screen", file: screen, info: screenInfo }];
	let presenter;
	if (human) {
		if (
			!Number.isFinite(humanStart) ||
			humanStart < 0 ||
			humanStart >= timeline.duration ||
			!Number.isFinite(humanOffset) ||
			humanOffset < 0
		) {
			throw new Error(
				"Presenter start must be within the output timeline; offset must be nonnegative.",
			);
		}
		const file = path.resolve(human);
		const info = await measure(file);
		if (humanOffset >= info.duration)
			throw new Error("Presenter offset is past the end of the source.");
		presenter = {
			sourceId: "presenter",
			start: humanStart,
			offset: humanOffset,
			duration: Math.min(timeline.duration - humanStart, info.duration - humanOffset),
		};
		mediaInputs.push({ id: "presenter", file, info });
	}
	// Refuse overwrite before copying anything. A failed export leaves its folder for inspection.
	await mkdir(path.dirname(out), { recursive: true });
	await mkdir(out);
	await mkdir(path.join(out, "media"));
	const media = [];
	for (const source of mediaInputs) {
		const actual = await realpath(source.file);
		if (!(await stat(actual)).isFile()) throw new Error("Media source must be a regular file.");
		const extension = path.extname(actual).toLowerCase();
		if (!/^\.[a-z0-9]{1,8}$/.test(extension))
			throw new Error("Media source needs a simple video file extension.");
		const relative = `media/${source.id}${extension}`;
		const destination = path.join(out, relative);
		await copyFile(actual, destination);
		media.push({
			id: source.id,
			path: relative,
			...source.info,
			sha256: await digest(destination),
		});
	}
	const manifest = {
		version: 1,
		name: "OpenDemo handoff",
		width: screenInfo.width,
		height: screenInfo.height,
		duration: timeline.duration,
		media,
		segments: timeline.segments.map((segment) => ({ sourceId: "screen", ...segment })),
		...(presenter ? { presenter } : {}),
		warnings,
	};
	await writeFile(path.join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	return manifest;
}

export async function loadBundle(directory) {
	const root = await realpath(directory);
	const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
	if (
		manifest.version !== 1 ||
		!Array.isArray(manifest.media) ||
		!manifest.media.length ||
		manifest.media.length > 32
	) {
		throw new Error("Unsupported or empty OpenDemo bundle.");
	}
	const files = {};
	for (const media of manifest.media) {
		if (
			typeof media.id !== "string" ||
			!/^[a-z][a-z0-9_-]*$/i.test(media.id) ||
			Object.hasOwn(files, media.id)
		)
			throw new Error("Invalid or duplicate media ID.");
		if (
			typeof media.path !== "string" ||
			media.path.includes("\\") ||
			path.posix.isAbsolute(media.path) ||
			media.path.split("/").includes("..") ||
			media.path.includes(":")
		) {
			throw new Error("Media paths must stay inside the bundle.");
		}
		const actual = await realpath(path.resolve(root, media.path));
		const relative = path.relative(root, actual);
		if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative))
			throw new Error("Media symlink escapes the bundle.");
		if (!(await stat(actual)).isFile()) throw new Error("Bundle media must be a regular file.");
		if (!/^[a-f0-9]{64}$/.test(media.sha256 || "") || (await digest(actual)) !== media.sha256)
			throw new Error(`Media integrity check failed: ${media.id}`);
		files[media.id] = actual;
	}
	return { manifest, files };
}

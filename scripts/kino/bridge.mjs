// SPDX-License-Identifier: AGPL-3.0-only
// Timing is expressed in seconds here; OpenDemo region inputs use milliseconds.
const EPSILON = 1e-8;
const MAX_SCENE_SECONDS = 600;
const MAX_SOURCE_SECONDS = 86400;

function number(value, name, min, max = Infinity) {
	if (!Number.isFinite(value) || value < min || value > max) {
		throw new Error(`${name} must be a finite number from ${min} to ${max}`);
	}
	return value;
}

function regions(input, name, duration) {
	if (!Array.isArray(input)) throw new Error(`${name} must be an array`);
	return input.map((region, index) => {
		const label = `${name}[${index}]`;
		const start = number(region.startMs, `${label}.startMs`, 0) / 1000;
		const end = number(region.endMs, `${label}.endMs`, 0) / 1000;
		if (end <= start) throw new Error(`${label} must have endMs after startMs`);
		return { start: Math.min(start, duration), end: Math.min(end, duration), speed: region.speed };
	});
}

/** Remove trimmed intervals and preserve the first matching speed region, like OpenDemo. */
export function planTimeline(duration, trimRegions = [], speedRegions = []) {
	number(duration, "source duration", 0.001, MAX_SOURCE_SECONDS);
	const trims = regions(trimRegions, "trimRegions", duration);
	const speeds = regions(speedRegions, "speedRegions", duration);
	speeds.forEach((region, index) => number(region.speed, `speedRegions[${index}].speed`, 0.1, 16));
	const boundaries = [
		...new Set([
			0,
			duration,
			...trims.flatMap((r) => [r.start, r.end]),
			...speeds.flatMap((r) => [r.start, r.end]),
		]),
	].sort((a, b) => a - b);
	const segments = [];
	let start = 0;
	for (let index = 0; index < boundaries.length - 1; index++) {
		const offset = boundaries[index];
		const end = boundaries[index + 1];
		if (end - offset < EPSILON || trims.some((r) => offset >= r.start && offset < r.end)) continue;
		const speed = speeds.find((r) => offset >= r.start && offset < r.end)?.speed ?? 1;
		const length = (end - offset) / speed;
		const previous = segments.at(-1);
		if (
			previous &&
			previous.speed === speed &&
			Math.abs(previous.offset + previous.duration * speed - offset) < EPSILON
		) {
			previous.duration += length;
		} else {
			segments.push({ start, offset, duration: length, speed });
		}
		start += length;
	}
	if (!segments.length) throw new Error("All source footage was trimmed away");
	return { duration: start, segments };
}

/** Explicit fidelity warnings: source media is transferred, not the OpenDemo compositor. */
export function unsupportedFeatures(project) {
	const editor = project.editor ?? {};
	const warnings = [];
	if (editor.zoomRegions?.length || editor.autoZoomEnabled)
		warnings.push(
			"Zooms and automatic focus are not converted; recreate them with editable Kino transforms.",
		);
	if (editor.annotationRegions?.length)
		warnings.push("Annotations, captions, and blur regions are not converted.");
	const crop = editor.cropRegion;
	if (crop && (crop.x !== 0 || crop.y !== 0 || crop.width !== 1 || crop.height !== 1))
		warnings.push("The OpenDemo crop is not applied; source media is fitted without cropping.");
	if (project.media?.cursorCaptureMode === "editable-overlay")
		warnings.push(
			"Editable cursor telemetry is not converted; the raw source may have no visible cursor.",
		);
	if (
		editor.wallpaper ||
		editor.padding ||
		editor.shadowIntensity ||
		editor.borderRadius ||
		editor.showBlur ||
		editor.motionBlurAmount
	)
		warnings.push(
			"Wallpaper, padding, shadows, rounded corners, and motion blur are not converted.",
		);
	if (project.media?.webcamVideoPath)
		warnings.push(
			"Webcam styling and synchronization are not inferred; pass an explicit presenter clip and offset.",
		);
	return warnings;
}

function fit(width, height, boxWidth, boxHeight) {
	const scale = Math.min(boxWidth / width, boxHeight / height);
	return { width: width * scale, height: height * scale };
}

/** Construct a native Kino document using the installed Kino model, without vendoring it. */
export function buildKinoDocument(manifest, importedSources, model) {
	if (manifest.version !== 1) throw new Error("Unsupported handoff manifest version");
	number(manifest.width, "width", 1, 16384);
	number(manifest.height, "height", 1, 16384);
	number(manifest.duration, "duration", 0.001, MAX_SCENE_SECONDS * 100);
	if (
		!Array.isArray(manifest.media) ||
		!Array.isArray(manifest.segments) ||
		!manifest.segments.length
	)
		throw new Error("Manifest needs media and screen segments");
	const media = new Map();
	for (const item of manifest.media) {
		if (!item.id || media.has(item.id)) throw new Error("Media IDs must be nonempty and unique");
		number(item.duration, `${item.id} duration`, 0.001, MAX_SOURCE_SECONDS);
		number(item.width, `${item.id} width`, 1);
		number(item.height, `${item.id} height`, 1);
		if (
			typeof importedSources[item.id] !== "string" ||
			!importedSources[item.id].startsWith("/api/media/")
		)
			throw new Error(`Missing imported media source: ${item.id}`);
		media.set(item.id, item);
	}
	const validateClip = (clip, label) => {
		const source = media.get(clip.sourceId);
		if (!source) throw new Error(`${label} references unknown media ${clip.sourceId}`);
		number(clip.start, `${label}.start`, 0);
		number(clip.offset, `${label}.offset`, 0);
		number(clip.duration, `${label}.duration`, 0.001);
		number(clip.speed ?? 1, `${label}.speed`, 0.1, 16);
		if (clip.start + clip.duration > manifest.duration + EPSILON)
			throw new Error(`${label} extends beyond the timeline`);
		if (clip.offset + clip.duration * (clip.speed ?? 1) > source.duration + EPSILON)
			throw new Error(`${label} extends beyond its source media`);
	};
	manifest.segments.forEach((clip, index) => validateClip(clip, `segments[${index}]`));
	const ordered = [...manifest.segments].sort((a, b) => a.start - b.start);
	for (let index = 1; index < ordered.length; index++) {
		if (ordered[index].start < ordered[index - 1].start + ordered[index - 1].duration - EPSILON) {
			throw new Error("Screen segments must not overlap on the output timeline");
		}
	}
	if (manifest.presenter) validateClip(manifest.presenter, "presenter");
	const scenes = [];
	for (
		let sceneStart = 0;
		sceneStart < manifest.duration - EPSILON;
		sceneStart += MAX_SCENE_SECONDS
	) {
		const sceneDuration = Math.min(MAX_SCENE_SECONDS, manifest.duration - sceneStart);
		const sceneIndex = scenes.length + 1;
		const layers = [];
		const addClip = (clip, index, presenter = false) => {
			const begin = Math.max(sceneStart, clip.start);
			const end = Math.min(sceneStart + sceneDuration, clip.start + clip.duration);
			if (end - begin < EPSILON) return;
			const source = media.get(clip.sourceId);
			const size = fit(
				source.width,
				source.height,
				manifest.width * (presenter ? 0.3 : 1),
				manifest.height * (presenter ? 0.4 : 1),
			);
			const margin = Math.min(manifest.width, manifest.height) * 0.03;
			const localStart = begin - sceneStart;
			layers.push(
				model.createLayer("video", {
					id: `${presenter ? "presenter" : "screen"}-${sceneIndex}-${index}`,
					name: presenter ? "Presenter (editable)" : `Screen cut ${index + 1}`,
					src: importedSources[clip.sourceId],
					x: presenter ? manifest.width - size.width - margin : (manifest.width - size.width) / 2,
					y: presenter
						? manifest.height - size.height - margin
						: (manifest.height - size.height) / 2,
					...size,
					mediaStart: localStart,
					mediaOffset: clip.offset + (begin - clip.start) * (clip.speed ?? 1),
					mediaDuration: end - begin,
					mediaSourceDuration: source.duration,
					mediaSpeed: clip.speed ?? 1,
					volume: presenter || !manifest.presenter ? 1 : 0,
					playbackWindows: [
						{ start: localStart, end: end - sceneStart, visibility: "during", hold: false },
					],
				}),
			);
		};
		manifest.segments.forEach((clip, index) => addClip(clip, index));
		if (manifest.presenter) addClip(manifest.presenter, 0, true);
		scenes.push(
			model.createScene({
				id: `scene-${sceneIndex}`,
				name: `Part ${sceneIndex}`,
				width: manifest.width,
				height: manifest.height,
				duration: sceneDuration,
				background: "#111111",
				layers,
			}),
		);
	}
	return model.parseDocument(
		model.createDocument({ name: manifest.name || "OpenDemo handoff", scenes }),
	);
}

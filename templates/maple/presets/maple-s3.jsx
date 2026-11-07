/**
 * maple-s3.jsx — section s3 presets (f269-f413, 8966-13800 ms): the white
 * mark on its gradient, resized, shrunk into an app icon, then the prompt.
 *
 * Measured on the reference's full-decode frames (30 fps clock, stage px;
 * scripts in sections/s3/py). Frame numbers are film frames.
 *
 *   f269       hard cut to a full-bleed ember mesh gradient; the mark is solid
 *              white (pink knockout [221,74,109]), centred (640, 359.5), with a
 *              light-blue selection box (corner handles) and the cursor on the
 *              bottom-right handle.
 *   f269-f290  RESIZE (alt-drag about the centre): mark width (vertical edge to
 *              edge) W = 458 - 214 x 0.81^(f-269): 285 f270, 322, 347, 367,
 *              385, 399, 410, 420, 427, 432 f279 ... 458 (residual < 3 px).
 *              Visible height 1.183 W (rounded corners). Box = mark + 1.3 px
 *              (x), + 2 px (y). Edges motion-blurred f269-f271.
 *   f269-f285  the gradient itself settles (swoosh edge at y10: x 1021, 1030,
 *              1039, 1046 ... 1082, x~0.83/frame) - not a zoom (a scale fit
 *              does not explain it), so two sampled colour grids crossfade.
 *   f299-f301  the cursor leaves down-right, smeared (868,631 -> ~925,700 ->
 *              gone).
 *   f301-f302  the mark (and box) shrinks inside the still full-bleed: W 458,
 *              ~405 (blurred), 254; then 110 f303, 70, 54, 48, 46, 45 f308.
 *   f303-f311  the full-bleed becomes an app-icon tile: a rounded square
 *              (radius 0.23 x side) shrinking about the centre, side ~1050 f303,
 *              720, 490, 335, 236, 177, 141, 121, 114, 113 f311, with zoom blur
 *              (centre sharp, edges smeared). The art scales slower than the
 *              tile (the resting tile shows the central ~57% of the gradient),
 *              and goes from the 16:9 frame to the square by f304. White [253,
 *              255,252] is revealed round it from f303. Rest: x584-696,
 *              y304-415, mark 45 x 53 px.
 *   f314       blue caret [0,147,252] 5 x 102 px at x758 (y307-408).
 *   f314-f360  TYPING "create variations of this logo": the caret glides (not
 *              steps): world x 760, 762, 766.5, 774.5, 784.5, 798, 813 ... 1811
 *              f356, 1821.5 f360 (bell-shaped speed, peak 36 px/frame f338).
 *              Glyphs pop from ~0.25x at the caret. Ink [20,20,20], x-height 46
 *              (c f320: 336-382), ascender 60, baseline 382, line ink 732-1809.
 *   f318-f398  CARET-TRACKING PAN (text + tile + caret, one layer): offset 2,
 *              5, 10, 16, 24 ... accelerating ~1.75 px/frame^2 to 41 px/frame
 *              (f345-f349), then decaying (36 f357, 17 f377, 6 f397). Measured
 *              per frame (tile edge, then a band correlation, then the parked
 *              caret).
 *   f352-f385  SEND BUTTON flies in from the right on its own curve: centre x
 *              640 + 496.5 x 0.858^(f-353) (ratio constant 0.85-0.87 every
 *              frame), side 189 - 126 x 0.785^(f-353); horizontal blur.
 *   f357-f382  cursor (white, black edge, 65 px class) comes in from the lower
 *              right on a straight line, decelerating (~0.86/frame), to rest
 *              with its tip at (659, 369).
 *   f390       click: the button drops to 0.765x in one frame; the cursor
 *              presses to 0.79x.
 *   f391-f409  button drifts down (centre y 359.5 -> 364, 379.5, 398, 419 ...
 *              552), the cursor with it but overshooting by up to 28 px
 *              (f406), then springing back.
 *   f410-f413  WHIP: the button leaves up (centre 513, 264, ~52, ~-70) with a
 *              vertical stretch + blur; the cursor is released and drifts down
 *              right, accelerating (660,565 -> 670,576 -> 688,597 -> 709,619).
 *   f413       the ember card's top edge enters at y668 (s4's rise), drawn
 *              here from s4's riseState().
 */
import React from "react";
import { CARD_ART, riseState } from "./maple-s4.jsx";
import {
	ArrowCursor,
	GradientArt,
	MapleMark,
	mix,
	Q,
	rgbs,
	SelectionBox,
} from "./maple-shared.jsx";

/** Prompt type: Inter-class grotesk. Inter is not installed here, and Arial
 * matches the reference's x-height (46) at its line width (1077 px ink for
 * the 30-char prompt) far better than Segoe UI (+7%). */
const TYPE = `"Inter Display", "Inter", Arial, "Helvetica Neue", "Segoe UI", sans-serif`;
const CX = 640;
const CY = 359.5;

// ── helpers ───────────────────────────────────────────────────────────────

/** Linear interpolation over [[f, ...values]] keys (clamped at both ends). */
function track(keys, f) {
	if (f <= keys[0][0]) return keys[0].slice(1);
	const last = keys[keys.length - 1];
	if (f >= last[0]) return last.slice(1);
	for (let i = 0; i < keys.length - 1; i++) {
		const a = keys[i];
		const b = keys[i + 1];
		if (f >= a[0] && f < b[0]) {
			const p = (f - a[0]) / (b[0] - a[0]);
			return a.slice(1).map((v, j) => v + (b[j + 1] - v) * p);
		}
	}
	return last.slice(1);
}
/** Same, interpolating in log space (sizes that shrink geometrically). */
function trackLog(keys, f) {
	return Math.exp(
		track(
			keys.map(([k, v]) => [k, Math.log(v)]),
			f,
		)[0],
	);
}
/** A per-frame table starting at frame f0 (linear between frames). */
function table(arr, f0, f) {
	const i = f - f0;
	if (i <= 0) return arr[0];
	if (i >= arr.length - 1) return arr[arr.length - 1];
	const i0 = Math.floor(i);
	return arr[i0] + (arr[i0 + 1] - arr[i0]) * (i - i0);
}
const sid = (s) => s.replace(/[^a-zA-Z0-9_-]/g, "");

/** Exact shutter average of n sub-frame renders (additive layers at 1/n in an
 * isolated group). children(o) gets the sample offset o in -0.5..0.5. */
function Accumulate({ n, blur = 0, children }) {
	if (n <= 1) return children(0);
	const out = [];
	for (let i = 0; i < n; i++) {
		out.push(
			<div
				key={i}
				style={{
					position: "absolute",
					inset: 0,
					opacity: 1 / n,
					mixBlendMode: "plus-lighter",
					filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
				}}
			>
				{children((i + 0.5) / n - 0.5)}
			</div>,
		);
	}
	return <div style={{ position: "absolute", inset: 0, isolation: "isolate" }}>{out}</div>;
}

// ── the ember field: two sampled colour grids ─────────────────────────────
//
// 32 x 18 cells of 40 px, medians of the reference's full-bleed (f302 and
// f269; the cells under the mark inpainted from their neighbours), drawn as
// SVG cells under a Gaussian blur of ~0.55 cell. G269 is the state on the cut
// frame, G300 the settled one; the field crossfades x0.83 per frame.

const G300 = [
	"4543664d42695a436e6745747746798849819a4c87ad4f8dbf5292cf5497dd579ce95ca1ef5fa5f165aaf26baff273b3",
	"f079b7ee7cbaeb7ebbe67bbde178bfdc73c0d66dc1cf67c3c960c7c25ac9bc58ced099e0cc98dec391dab689d3a97fcb",
	"514b6d58496f644973724977824b7c934d81a74f86ba518acb538dda5590e75894ee5b98f1619ef168a2f16da8ef72ab",
	"ec75aee974b0e573b1e06db1da67b4d461b3ce59b5c753b8c04fbeb94cc4b34bcdac4cd2c18ddcbb8bd9af83d1a17ac9",
	"5d5376634f756e4f787c4e7b8d4f7fa15182b45385c65386d75387e35588ec578bf05c90f06296f0689bee6c9feb6da1",
	"e76da2e46aa4df66a4d960a5d358a6ce53a8c84dadc24ab5b948beb248caaa48d1a549d4a14cd6b082d9a77ed19975c6",
	"6b5d7f6f567b7a557c88547e995480ad5481c05480d25380e0527eeb537fef5884f05d8af0628eee6691eb6794e86796",
	"e46397de5e98da5798d4539ad04e9dca4ba3c448abbc47b9b348c8aa49d1a448d39e49d69b4ad7994fd89e76d39270c7",
	"7966887b5e82865b80945981a55880b9567fcc547bdc5376e75174ed5376ef587df05d83ed6186eb6288e8618ae45e8d",
	"e05a8cda558dd65090d14d92cd4999c947a0c048b2b74ac3af4acfa74ad39f4ad69949d79649d7924dd6925ad58a6ac9",
	"867090886688926185a15e83b25b80c4597bd55474e3526cec5068ef5370ef5876ed5b7cec5c7de95c7fe65b82e25985",
	"de5687d95289d44d8ccf488dcc4795c448a7bd4ab9b44cc5ac4cd0a44ad59c4ad7954ad78f4ad68c4cd58852d48260cb",
	"947899946d8f9f6789ae6384be5f7fcf5a77dc556be7515fed505eef5468ed576eeb5870e95772e75776e4567ae0557e",
	"dd5382d84f86d44c89cf478bca4899c34aaabc4cbcb44ec8ab4ed3a34cd6994bd8904bd58a4ad5854bd4804fd17a56cc",
	"a281a2a27494ab6d8cba6885c8637cd75c70e25662ea5055ee4f58ee5260ec5464e85366e75268e5536de35373df5278",
	"dc507dd84e82d34b88ce478fca4a9bc24cacbb4ebcb450c9ab50d3a250d7964dd88c4bd5844bd57e4ad2784cce704fc7",
	"b087a9ae7b9ab7728fc46b85d06579dd5e6ae5575aea504bee4e4fed5157eb515be8505ce64f5fe44f65e24f6bdf4f71",
	"db4e77d84d7ed34b86cf498fca4b9cc44dacbc4fbcb651c9ac52d4a351d7944ed7884dd47f4bd3774acf714acb684bc2",
	"bc8eb0ba809ec37791cf7085d86976e26166e75a56eb5247ed4d48ec4e4fe94e51e74c54e64c56e44d5ce24d63df4d6a",
	"db4c71d84c7ad44b83cf4a8eca4c99c54ea9be51bbb654c8ae55d3a454d89250d6844dd37b4bcf714acb6649c55d48bb",
	"c893b4c685a1ce7c92d77485e06c75e66564e95d57ec5648ed4d40eb4c45e94b49e74a4ae5484ce44a53e24b5bdf4b62",
	"dc4b6ad84b74d44b7fd04b8bcc4c96c551a6bf54b9b958c7b159d3a657d89253d6814ed2754bcc6b4ac76048be5245b2",
	"d398b7d28ba5d88194de7885e57176e86965ec6259ec5c4dee5441eb4a3ce94a40e74843e64845e4494be34952e04a59",
	"dd4a62d94a6dd54b79d04b85cd4e93c752a4c156b6bb5ac5b35cd2aa5bd89455d78150d0724dca664ac15947b74b42a7",
	"dc9cb9dc8fa6df8596e57c86e97577ec6e6aed685cee6354ef5c4aed4d39ea4836e8473be7473de64842e44848e24850",
	"df4959da4964d64a72d14c81ce4f8fc854a2c358b4bd5dc3b660cfad5fd8995bd98252d1724ec8624bbe5646b24740a1",
	"e59fbce594a8e78998eb8188ee7a7bee736eef6e64ef685bef6352ef5f4bed573fea4831e84735e74738e6473de44744",
	"e1474ddc485ad94969d44d7acf518cca559dc45aafbf5fc0b963cdb264d8a560da8456d27250c7624cbc5447ae46419b",
	"eda2bbed97aaee8e9af0858cf07f80f07875f1736cf16e62f0695bf06454ef5f4eee5a45eb4a31e94830e74736e5473f",
	"e24748df4855da4a64d54d75d05186cb5698c65babc161bcba65ccb568d7ac66db8c5ad47554c8644ebb5549ab484498",
	"f3a4bbf29aabf2929df28990f28285f27c7bf17772f07169ee6b62ee675aed6255ec5d4dea5847ea5441e94b34e74735",
	"e34743e0484fdb4a5dd64e6fd15281cd5593c85ca6c362b8be67c8b86bd5b16cdb9562d77b58c96851bc5a4bab4a4697",
	"f5a3b9f59aacf4939ff38a92f18388f07d7fef7778ee7270ed6e68ed6862ec645bea5f55e95b4fe8564ae75244e74d3d",
	"e5473ae14848dd4a56d84d67d3517ace568dc95ca0c563b5c06ac6bb6fd2b571daa66cdb845ecd6f57bd6050ac504a99",
	"f39db3f397a9f2909df18893ef828bee7d84ee787ced7374eb6e6fea6969e96562e8615ce65c57e45751e4544ce35047",
	"e34b3fe24840dd4950d94c5fd45174d05688cb5c9bc664b0c26cc1be73d0b976dab274dd8f66d1775dc06556ae574f9c",
].join("");
const G269 = [
	"51426b5e43706b45757d477c8e4a83a04d89b3508fc45294d4559ae0599eea5da3f161a8f167adf36db2f174b6f07bb8",
	"ed7dbae97ebde57cbddf77bfda73c1d46dc3ce67c5c75fc8c05bcbbb5dd0d19be1c996ddbe8fd8b286d1a479c7926bba",
	"5b486f674973774a78884b7e9b4e83ad5088c0528cd1538fde5692e95996ef5d9bf163a1f269a5f26ea9ef73adec75b0",
	"e875b1e372b1df6cb2d867b4d160b4cb58b6c552bbbe4fc0b74bc7b04cceac4ed4c18edcb889d5aa80cf9b75c58765b4",
	"664f76734e78804f7c934f7fa65283ba5387cd5387db5388e8558aee598ef15e94f16499f0699def6da0ec6ea3e76da5",
	"e369a6dc65a5d85ea6d156a7cc51abc64dafbf49b8b748c2af48cda949d2a54ad4a14fd8af82d6a27acd9271c17e62b1",
	"71557b7d547c8d547e9f5480b35582c55381d75380e3537fec5481f05886f05e8bf16491ee6696ea6798e76697e26299",
	"dd5d9ad7569ad3529bcf4ea1c94aa5c247afb848beb049cca848d2a348d49c49d59a4bd79c57d79b76ce8b6cc0765eb0",
	"7e5d828a5a809a5881ac5781c0567ed2547be05276e95174ee547af05a80f05e84ee6188eb628be7608ce25d8edd588d",
	"d9538ed54f90d14b95cc489bc647a4bc49bab44bc5ac4ad0a54ad49d4ad69849d5954bd69250d6926ad18567c16f5aad",
	"8a6387976085a75d82b85a7fcb5779da5372e6516aed516aef5573ef5979ed5c7de95d7fe75c80e45a83e05887dc5589",
	"d8528dd34e91cf4b97cb479dc349adba4bbdb24ccaa94bd2a14bd59a4ad6934ad58f4ad48b4ed48858d37c60c56756ad",
	"966a8ca36587b26282c35d7cd35874e25367eb505eee5162ef556bed5771ea5872e75773e45476e2557bde5480db5285",
	"d7508bd24e91cd4b99c749a3c14bb1b94dbfb14ecca84dd39f4cd7964bd68e4bd4894ad4834dd37f50d07658c66051ac",
	"a47091af6a8abe6582cd6079da5a6ce5545dec4e54ee515dee5363eb5467e85368e6516be34f6ce05073dd507ada5080",
	"d64f88d14d90cc4c99c64aa4c14cb2b84fbfb250cda850d49e4fd8924cd5894bd4824ad47c4bd2764dcb6c50c4594bac",
	"b07695bc708bc96880d56374df5c65e75355ec4d4aee5054ed515aea515de74f5ee44e60e14b63e04d6bdd4e73da4e7b",
	"d64e84d14d8dcc4d98c64ca4c14db0ba4fc0b251cda852d59d51d88e4dd5844cd27d4ad27549ce6e4bc9624bbf4d45a6",
	"bc7d99c7748cd26d80dc6670e45e61e95650ec4f45ee4d4deb4f51e94d53e74c55e44b57e3495ae04b63dd4c6cda4c75",
	"d64d7fd14d8acd4d96c74ea2c34fb0bb52bfb355cdaa54d59f53d88c4fd4804dd0784acd6d4aca6549c35948b945409c",
	"c8819bd0798cda717fe2696fe76160ea5a51ec5343ed4b43ea4c47e84a4be64a4de4494fe34753e1495cde4a65db4b6f",
	"d74c7ad24d85ce4e92c94fa1c452acbe55c0b658cdad58d5a255d98d51d67e4dcf734bca6849c45c47bb4c43ab3a3a8d",
	"d4869dda7d8ee07580e56d6fe96661ec5f55ed5848ec4c3dea4a3fe94943e74846e64849e4474ce24854df495ddc4a67",
	"d84b73d44d80cf4e8eca519ec553aac057bcb85bcbb15bd4a55ada8c54d57c4fce6e4bc86249bf5446b44540a0343782",
	"dc8ba1e28191e67a80eb7273ed6b64ee6559ee5f50ef5846ec4936e9483be8473ee74741e54744e3484be14854de495e",
	"d94a6bd54c78d14e86cc5297c655a7c15ab8ba5ec9b25fd4a95edb8f56d57a51ce6a4dc45e49ba5044ad423e9833367c",
	"e490a2e88693ec7e84ed7777ef716aef6a60ef6657f06150ef5c48eb4933eb4634e84739e7473be54741e3474ae14753",
	"db4962d74a71d34d7ccd5291c857a3c25cb5bc60c7b663d3ae63d9955ad77d53cd6b4ec35e4bb85045a8413f93343779",
	"ed94a4ef8a95ee8287f07c7cf17671f17167f16c61f16758ef6250ee5d4aec5740ec4830ea4734e7473ae54743e1474e",
	"dd495bd94b6ad44d7bcf528dca58a0c45db1bf62c2b967ceb267d9a062da8257cf6e50c25e4cb65247a6444190373978",
	"f296a6f28d99f2868cf28181f37979f1746ef06f66ef6960ee6557ed6052ec5b4ceb5544ea523ee94832e6473be24848",
	"df4954da4b64d44f76d05389ca589ac65faec064bebb69cfb66bd9ad6adb895dd27456c56250b65349a34643903a3c79",
	"f497a8f4909cf2888ff28186f07a7bef7674ee706ded6b66ed665fec6258ea5d53e8584ce85446e75042e74936e44740",
	"df494ddc4b5dd64e6fd15282cc5894c75ea9c265bbbe6ccab96fd6b270dc9565d77c5ac86754b7584ea54a4890404179",
	"f095a5f28c9af18691ef8188ee7b81ee7679ed7173eb6c6dea6766e96460e75f5ae55954e5564ee4534ae34e44e4483c",
	"e14846dc4a57d74e67d2527bce5990c95fa4c568b6c16ec7bc74d5b775dda46fdc8462cb7159bb6052a7514c9344457d",
].join("");

const GX = 32;
const GY = 18;
const PAD = 16; // edge-extension margin, cells
const gridCache = new Map();
function decode(hex) {
	if (!gridCache.has(hex)) {
		const out = [];
		for (let i = 0; i < hex.length; i += 6)
			out.push([0, 2, 4].map((k) => Number.parseInt(hex.slice(i + k, i + k + 2), 16)));
		gridCache.set(hex, out);
	}
	return gridCache.get(hex);
}

/** The full-bleed ember gradient as a w x h block (stretched to any box).
 * `settle` 0 = the cut-frame state (G269), 1 = settled (G300). */
function EmberField({ w, h, settle = 1, blur = 0.55, grids = null, ext = false }) {
	const uid = sid(React.useId());
	const a = decode(grids?.[0] ?? G300);
	const b = decode(grids?.[1] ?? G269);
	const k = 1 - Math.max(0, Math.min(1, settle));
	const col = (i, j) => {
		const n = Math.min(GY - 1, Math.max(0, j)) * GX + Math.min(GX - 1, Math.max(0, i));
		return rgbs(k > 0.002 ? mix(a[n], b[n], k) : a[n]);
	};
	const colS = (i, j) => {
		const n = (ii, jj) =>
			Math.min(GY - 1, Math.max(0, jj)) * GX + Math.min(GX - 1, Math.max(0, ii));
		const pick = (ii, jj) => (k > 0.002 ? mix(a[n(ii, jj)], b[n(ii, jj)], k) : a[n(ii, jj)]);
		const di = i < 0 || i >= GX ? 0 : 1;
		const dj = j < 0 || j >= GY ? 0 : 1;
		const c = [0, 0, 0];
		for (let d = -3; d <= 3; d++)
			pick(i + d * di, j + d * dj).forEach((v, m) => {
				c[m] += v / 7;
			});
		return rgbs(c);
	};
	const cells = [];
	const cell = (key, x, y, cw, ch, c) =>
		cells.push(<rect key={key} x={x} y={y} width={cw + 0.04} height={ch + 0.04} fill={c} />);
	for (let j = 0; j < GY; j++)
		for (let i = 0; i < GX; i++) cell(`${i}_${j}`, i, j, 1, 1, col(i, j));
	const inner = cells.slice();
	// edge-extended margins (the tile can be larger than the art box)
	for (let i = 0; i < GX; i++) {
		cell(`t${i}`, i, -PAD, 1, PAD, colS(i, -1));
		cell(`b${i}`, i, GY, 1, PAD, colS(i, GY));
	}
	for (let j = 0; j < GY; j++) {
		cell(`l${j}`, -PAD, j, PAD, 1, colS(-1, j));
		cell(`r${j}`, GX, j, PAD, 1, colS(GX, j));
	}
	cell("c0", -PAD, -PAD, PAD, PAD, col(0, 0));
	cell("c1", GX, -PAD, PAD, PAD, col(GX - 1, 0));
	cell("c2", -PAD, GY, PAD, PAD, col(0, GY - 1));
	cell("c3", GX, GY, PAD, PAD, col(GX - 1, GY - 1));
	const region = { x: -PAD, y: -PAD, width: GX + 2 * PAD, height: GY + 2 * PAD };
	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${GX} ${GY}`}
			preserveAspectRatio="none"
			style={{ position: "absolute", left: 0, top: 0, display: "block", overflow: "visible" }}
		>
			<defs>
				<filter id={`${uid}b`} filterUnits="userSpaceOnUse" {...region}>
					<feGaussianBlur stdDeviation={blur} />
				</filter>
				{ext ? (
					<>
						<filter id={`${uid}w`} filterUnits="userSpaceOnUse" {...region}>
							<feGaussianBlur stdDeviation={3.5} />
						</filter>
						<filter id={`${uid}f`} filterUnits="userSpaceOnUse" {...region}>
							<feGaussianBlur stdDeviation={0.7} />
						</filter>
						<mask id={`${uid}m`} maskUnits="userSpaceOnUse" {...region}>
							<rect
								x={1}
								y={1}
								width={GX - 2}
								height={GY - 2}
								fill="#fff"
								filter={`url(#${uid}f)`}
							/>
						</mask>
					</>
				) : null}
			</defs>
			{ext ? (
				<>
					{/* beyond the sampled frame: a wide-blurred extension (the
					    tile shows more of the art than the full-bleed did) */}
					<g filter={`url(#${uid}w)`} shapeRendering="crispEdges">
						{cells}
					</g>
					<g mask={`url(#${uid}m)`}>
						<g filter={`url(#${uid}b)`} shapeRendering="crispEdges">
							{inner}
						</g>
					</g>
				</>
			) : (
				<g filter={`url(#${uid}b)`} shapeRendering="crispEdges">
					{cells}
				</g>
			)}
		</svg>
	);
}

/** Seeded film grain over a w x h box (the reference's high-pass std ~2.4). */
function Grain({ w, h, opacity = 0.09, seed = 5 }) {
	// the reference's grain is re-rolled every frame (still frames diff ~0.5-1)
	const uid = sid(React.useId());
	return (
		<svg
			width={w}
			height={h}
			style={{ position: "absolute", left: 0, top: 0, opacity, mixBlendMode: "overlay" }}
		>
			<filter id={`${uid}n`}>
				<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} />
				<feColorMatrix type="saturate" values="0" />
			</filter>
			<rect width={w} height={h} filter={`url(#${uid}n)`} />
		</svg>
	);
}

// ── the mark and the icon tile ────────────────────────────────────────────

/** The white mark with its pink knockout, centred at (x, y), width W (the
 * hexagon's vertical-edge distance). Rounded so the visible height is 1.183 W
 * like the reference's. */
function WhiteMark({ W, x = CX, y = CY, radius, knockout }) {
	return (
		<MapleMark width={W} radius={radius} fill={Q.pure} knockout={knockout} pad={4} cx={x} cy={y} />
	);
}

/** The selection box round a mark of width W (handles on the corners). The
 * handles scale with the mark (outer 8.5 px f269, 10.6 f271, 13.7 f274, 15.6
 * f290 = 0.034 W), the line too (~1.6 -> 2.1 px). */
function MarkBox({ W, x = CX, y = CY, opacity = 1 }) {
	const hw = W / 2 + 1.3;
	const hh = 0.5915 * W + 2;
	return (
		<SelectionBox
			x={x - hw}
			y={y - hh}
			w={hw * 2}
			h={hh * 2}
			line={1 + 0.0025 * W}
			handle={0.034 * W}
			opacity={opacity}
		/>
	);
}

/**
 * The gradient tile at side T (rounded square, radius 0.23 T) centred at
 * (x, y), carrying the mark. The art is the field, `art` x `artH` px (16:9
 * by default), centred at the tile centre + (dx, dy) and edge-extended beyond
 * its box. While the tile flies in (f303-f304) the whole field is squeezed
 * into it (its dusky top-left lands in the tile corner); from f306 it is the
 * 16:9 field at ~1/4 scale (fitted on f306-f312: the resting 113 px tile
 * shows a 320 px wide field offset +76 px, i.e. its red left-centre).
 */
function Tile({
	T,
	x = CX,
	y = CY,
	markW,
	art,
	artH = null,
	dx = 0,
	dy = 0,
	radius,
	knockout,
	settle = 1,
	corner = 0,
}) {
	const ah = artH ?? (art * 9) / 16;
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: x - T / 2,
					top: y - T / 2,
					width: T,
					height: T,
					borderRadius: T * 0.23,
					overflow: "hidden",
				}}
			>
				<div
					style={{
						position: "absolute",
						left: T / 2 + dx - art / 2,
						top: T / 2 + dy - ah / 2,
						width: art,
						height: ah,
					}}
				>
					<EmberField w={art} h={ah} settle={settle} ext={T > ah + 2} />
					{corner > 0 ? (
						// the art beyond the full-bleed crop (f303-f306): a deep navy
						// top-left corner and a lilac left edge the frame never showed
						<div
							style={{
								position: "absolute",
								inset: 0,
								opacity: corner,
								background:
									"radial-gradient(ellipse 42% 38% at 10% 4%, rgba(18,22,56,0.85), rgba(18,22,56,0) 100%), linear-gradient(90deg, rgba(222,212,252,0.55), rgba(222,212,252,0) 14%)",
							}}
						/>
					) : null}
				</div>
			</div>
			<WhiteMark W={markW} x={x} y={y} radius={radius} knockout={knockout} />
		</>
	);
}

/**
 * The prompt's send button, measured at rest (f386, 189 px): body [28,89,239]
 * at the top to [24,80,217] at the bottom, a ~3 px darker rim [24,64,214], a
 * light inner top edge [81,125,255], a soft GREY drop shadow below, white
 * up-arrow (~55 px tall, ~10 px stroke). `press` 1 = 0.75x (click f390).
 */
function PromptButton({ size, press = 0 }) {
	const sc = 1 - 0.25 * Math.max(0, Math.min(1, press));
	const a = size * 0.5;
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size * 0.22,
				background: "linear-gradient(180deg, rgb(30,90,240), rgb(27,84,229) 55%, rgb(24,79,218))",
				boxShadow: [
					`inset 0 0 0 ${(size * 0.016).toFixed(2)}px rgba(20,58,200,0.85)`,
					`inset 0 ${(size * 0.026).toFixed(2)}px ${(size * 0.012).toFixed(2)}px rgba(120,160,255,0.55)`,
					`0 ${(size * 0.04).toFixed(2)}px ${(size * 0.07).toFixed(2)}px rgba(20,24,40,0.16)`,
				].join(", "),
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transform: sc < 1 ? `scale(${sc.toFixed(4)})` : undefined,
			}}
		>
			<svg width={a} height={a} viewBox="0 0 24 24" fill="none">
				<path
					d="M12 19V5M5.5 11.5L12 5l6.5 6.5"
					stroke="#fff"
					strokeWidth="2.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

// ── maple-icon-resize (f269-f312) ─────────────────────────────────────────

const RESIZE = { w0: 458, a: 214, r: 0.81, f0: 269 };
const resizeW = (f) => RESIZE.w0 - RESIZE.a * RESIZE.r ** (f - RESIZE.f0);
// shrink (film frames): mark width and tile side, log-interpolated
const MARK_SHRINK = [
	[300, 458],
	[301, 420],
	[302, 254],
	[303, 110],
	[304, 70],
	[305, 54],
	[306, 48],
	[307, 46],
	[308, 45],
];
const TILE_SHRINK = [
	[300, 2600],
	[301, 2300],
	[302, 1700],
	[303, 1040],
	[304, 695],
	[305, 468],
	[306, 320],
	[307, 228],
	[308, 172],
	[309, 137],
	[310, 118],
	[311, 112],
	[312, 112],
];
// the selection box (sharp, one size per frame: it lags the blurred mark)
const BOX_W = [
	[300, 458],
	[301, 458],
	[302, 250],
	[303, 108],
];
// the field inside the tile: width, height (px) and offset of its centre
const ART_W = [
	[302, 1280],
	[303, 1040],
	[304, 695],
	[305, 470],
	[306, 379],
	[307, 344],
	[308, 330],
	[309, 320],
];
const ART_H = [
	[302, 720],
	[303, 1040],
	[304, 695],
	[305, 440],
	[306, 300],
	[307, 220],
	[308, 195],
	[309, 182],
	[312, 180],
];
const ART_CORNER = [
	[302.5, 0],
	[303, 1],
	[304, 1],
	[305, 0.8],
	[306, 0.45],
	[307, 0.15],
	[308, 0],
];
const ART_DX = [
	[304, 0],
	[305, 40],
	[306, 68],
	[307, 75],
	[312, 76],
];
const ART_DY = [
	[304, 0],
	[306, -5],
	[312, -7],
];
// cursor tip (dark-edge extreme) leaving down-right, smeared
const CURSOR_EXIT = [
	[299, 868, 631],
	[300, 925, 700],
	[301, 1000, 790],
];

const ICON_DEFAULTS = {
	frame0: 268.98, // film frame at startMs (8966 ms)
	radius: 20, // mark fillet (mark units)
	knockout: Q.pinkCut,
	cursorSize: 50, // tip -> right wing ~48 px (f290)
	shutter: 0.5, // frames
	grain: 0.09,
	settleRate: 0.83,
};

function iconResize(cfg, t) {
	const ms = t * 1000 - cfg.startMs;
	if (ms < 0 || ms >= cfg.durationMs) return null;
	const p = { ...ICON_DEFAULTS, ...cfg };
	const f = p.frame0 + ms * 0.03;
	const settle = 1 - p.settleRate ** Math.max(0, f - 269);
	const sh = p.shutter;
	const tipIn = p.cursorSize * 0.055; // path tip sits inside the dark edge

	if (f < 300.5) {
		// resize phase: the field is still (settling), the mark grows
		const dW = Math.abs(resizeW(f + sh / 2) - resizeW(f - sh / 2));
		const n = Math.min(12, Math.max(1, Math.ceil(dW / 3)));
		let cursor = null;
		if (f < 299) {
			// rides the corner handle, smeared like the mark while it is fast
			cursor = (
				<Accumulate n={n}>
					{(o) => {
						const W = resizeW(f + o * sh);
						return (
							<ArrowCursor
								x={CX + W / 2 + 1.3 + tipIn}
								y={CY + 0.5915 * W + 2 + tipIn}
								size={p.cursorSize}
							/>
						);
					}}
				</Accumulate>
			);
		} else {
			cursor = (
				<Accumulate n={8}>
					{(o) => {
						const [x, y] = track(CURSOR_EXIT, f + o * 0.6);
						return <ArrowCursor x={x + tipIn} y={y + tipIn} size={p.cursorSize} />;
					}}
				</Accumulate>
			);
		}
		return (
			<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
				<EmberField w={1280} h={720} settle={settle} />
				<Grain w={1280} h={720} opacity={p.grain} seed={5 + Math.floor(f + 0.5)} />
				<Accumulate n={n}>
					{(o) => {
						const W = resizeW(f + o * sh);
						return (
							<div style={{ position: "absolute", inset: 0 }}>
								<WhiteMark W={W} radius={p.radius} knockout={p.knockout} />
							</div>
						);
					}}
				</Accumulate>
				{/* the box and handles stay sharp in the reference (f269-f271) */}
				<MarkBox W={resizeW(f)} />
				{cursor}
			</div>
		);
	}

	// shrink phase. f301-f302: the mark (zoom-blurred) and its box shrink in
	// the still full-bleed field (field drawn once: an additive average of a
	// static gradient only adds 8-bit banding). f303-f311: the field becomes
	// the icon tile, zoom blur = exact sub-frame average + a small per-sample
	// blur where the tile edge steps > ~6 px between samples. Box stays sharp.
	const boxW = track(BOX_W, Math.round(f))[0];
	const boxOpacity = f < 302.5 ? 1 : f < 303.5 ? 0.35 : 0;
	const box = boxOpacity > 0 ? <MarkBox W={boxW} opacity={boxOpacity} /> : null;
	const exitCursor =
		f < 301.5 ? (
			<Accumulate n={8}>
				{(o) => {
					const [x, y] = track(CURSOR_EXIT, f + o * 0.6);
					return <ArrowCursor x={x + tipIn} y={y + tipIn} size={p.cursorSize} />;
				}}
			</Accumulate>
		) : null;
	if (f < 302.5) {
		return (
			<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
				<EmberField w={1280} h={720} settle={settle} />
				<Grain w={1280} h={720} opacity={p.grain} seed={5 + Math.floor(f + 0.5)} />
				<Accumulate n={10}>
					{(o) => (
						<div style={{ position: "absolute", inset: 0 }}>
							<WhiteMark
								W={trackLog(MARK_SHRINK, f + o * sh)}
								radius={p.radius}
								knockout={p.knockout}
							/>
						</div>
					)}
				</Accumulate>
				{box}
				{exitCursor}
			</div>
		);
	}
	const moving = f < 311.5;
	const n = moving ? 12 : 1;
	const edgeTravel =
		Math.abs(trackLog(TILE_SHRINK, f + sh / 2) - trackLog(TILE_SHRINK, f - sh / 2)) / 2;
	const sampleBlur = moving ? Math.min(16, (edgeTravel / n) * 0.6) : 0;
	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			<Accumulate n={n} blur={sampleBlur}>
				{(o) => {
					const g = f + o * sh;
					return (
						<div style={{ position: "absolute", inset: 0 }}>
							<Tile
								T={trackLog(TILE_SHRINK, g)}
								markW={trackLog(MARK_SHRINK, g)}
								art={trackLog(ART_W, g)}
								artH={trackLog(ART_H, g)}
								corner={track(ART_CORNER, g)[0]}
								dx={track(ART_DX, g)[0]}
								dy={track(ART_DY, g)[0]}
								radius={p.radius}
								knockout={p.knockout}
								settle={settle}
							/>
						</div>
					);
				}}
			</Accumulate>
			{box}
		</div>
	);
}

// ── maple-prompt-send (f313-f413) ─────────────────────────────────────────

// caret centre, world x, f314..f360 (glides; normalised it drives the typing)
const CARET = [
	760, 762, 766.5, 774.5, 784.5, 798, 813, 831.5, 851.5, 874, 897.5, 924, 951.5, 980, 1009.5,
	1041.5, 1074, 1107.5, 1142.5, 1176.5, 1211.5, 1246.5, 1283, 1318.5, 1354, 1389, 1424.5, 1459,
	1493, 1525.5, 1557.5, 1588.5, 1617.5, 1646, 1672.5, 1698, 1721, 1742, 1759.5, 1776.5, 1791, 1802,
	1811, 1817, 1820.5, 1821, 1821.5,
];
const CARET_F0 = 314;
// camera pan (px, text layer moves left), f318..f403
const PAN = [
	0, 2, 5, 10, 16, 24, 33, 44, 57, 71, 87, 105, 125, 147, 171, 196, 223, 252, 283, 315, 349, 384,
	421, 459, 498, 537, 577, 618, 659, 700, 741, 782, 822.2, 862, 901.2, 940, 978, 1015, 1051.2,
	1087.2, 1122.8, 1156.8, 1189.2, 1221, 1251.8, 1281.2, 1309.8, 1337.5, 1364.8, 1390.8, 1415.5,
	1439.8, 1463, 1485, 1506.2, 1527, 1546.8, 1565.5, 1583.8, 1601.2, 1618, 1634, 1649, 1663.2,
	1677.2, 1690.8, 1703.2, 1715.2, 1726.8, 1737.5, 1747.8, 1757.2, 1766.2, 1775, 1783.2, 1790.8,
	1797.8, 1804.8, 1811.2, 1817.2, 1822.7, 1827.5, 1831.9, 1835.8, 1839.4, 1842.6,
];
const PAN_F0 = 318;
const REF_CARET_SPAN = 1821.5 - 760; // caret travel of the reference line
// button centre x f351..f386: 640 + 496.5 x 0.858^(f-353), then the measured
// tail (it settles faster than the exponential from f375)
const BTN_X = [
	1314, 1218.7, 1136.5, 1061.5, 999.5, 947.5, 903.5, 867, 835.5, 808.5, 785.5, 766, 749, 734.5, 721,
	710, 700, 691.5, 684, 677.5, 672, 667, 663, 659.5, 656.5, 653.5, 650.5, 648.5, 647, 645.5, 644.5,
	643, 642.5, 641, 640.5, 640,
];
const BTN_F0 = 351;
// button drift after the click (centre y), and the whip
const BTN_Y = [
	[389, 359.5],
	[391, 359.5],
	[392, 364],
	[393, 379.5],
	[394, 398],
	[395, 419],
	[396, 439],
	[397, 457.5],
	[398, 474],
	[399, 488.5],
	[400, 501.5],
	[401, 513],
	[402, 522],
	[403, 530.5],
	[404, 536.5],
	[405, 541.5],
	[406, 546],
	[407, 549],
	[408, 551.5],
	[409, 552],
	[410, 513],
	[411, 264],
	[412, 52],
	[413, -70],
	[414, -180],
];
// cursor tip (dark-edge extreme), film frames
const CURSOR_B = [
	[356, 1330, 678],
	[357, 1243, 637],
	[358, 1164, 601],
	[359, 1093, 571],
	[360, 1035, 544],
	[361, 985, 521],
	[362, 942, 501],
	[363, 904, 483],
	[364, 870, 468],
	[365, 841, 454],
	[366, 816, 442],
	[367, 793, 432],
	[368, 773, 423],
	[369, 756, 415],
	[370, 741, 407],
	[371, 728, 400],
	[372, 717, 395],
	[373, 706, 390],
	[374, 696, 386],
	[375, 688, 382],
	[376, 681, 379],
	[377, 675, 376],
	[378, 670, 374],
	[379, 667, 372],
	[380, 663, 371],
	[381, 662, 369],
	[382, 660, 369],
	[383, 659, 369],
	[390, 659, 368],
	[391, 659, 368],
	[392, 659, 372],
	[393, 659, 384],
	[394, 659, 402],
	[395, 659, 422],
	[396, 659, 442],
	[397, 659, 461],
	[398, 659, 479],
	[399, 659, 495],
	[400, 659, 510],
	[401, 659, 524],
	[402, 659, 537],
	[403, 659, 548],
	[404, 659, 558],
	[405, 659, 566],
	[406, 659, 574],
	[407, 659, 576],
	[408, 659, 568],
	[409, 660, 562],
	[410, 660, 565],
	[411, 670, 576],
	[412, 688, 597],
	[413, 709, 619],
	[414, 732, 643],
];

// text metrics through a shared 2D canvas (system fonts: deterministic)
const metricCache = new Map();
function ctx2d() {
	if (!globalThis.__mapleS3Ctx)
		globalThis.__mapleS3Ctx = document.createElement("canvas").getContext("2d");
	return globalThis.__mapleS3Ctx;
}
function measure(key, font, fn) {
	const k = `${key}|${font}`;
	if (!metricCache.has(k)) {
		const c = ctx2d();
		c.font = font;
		metricCache.set(k, fn(c));
	}
	return metricCache.get(k);
}
const sizeForXHeight = (family, xh) =>
	(xh * 100) /
	measure("x", `400 100px ${family}`, (c) => c.measureText("x").actualBoundingBoxAscent);
const prefixWidth = (font, s) => measure(`w${s}`, font, (c) => c.measureText(s).width);

const PROMPT_DEFAULTS = {
	frame0: 312.48, // film frame at startMs (10416 ms)
	text: "create variations of this logo",
	xHeight: 45.3,
	baseline: 382,
	ink: Q.ink,
	tileSide: 112,
	tileMarkW: 45,
	radius: 20,
	knockout: Q.pinkCut,
	artW: 320, // the field inside the resting tile (px wide) and its offset
	artDx: 76,
	artDy: -7,
	textGap: 33, // tile right edge -> text origin (px)
	caretGap: 61, // tile right edge -> caret before typing
	caretTail: 6, // last advance -> caret
	caret: [5, 102, 307], // width, height, top (f314)
	popAt: 6, // px of reveal into a slot before its glyph is inserted
	popFrames: 2.5, // glyph pop 0.2x -> 1x
	buttonSize: 189,
	press: 0.94, // SendButton press (1 = 0.75x): 0.765x measured
	cursorSize: 65, // tip -> right wing ~62 px (f386)
	cursorPress: 0.79,
	card: true, // draw s4's ember card sliver on the last frame
};

function promptSend(cfg, t) {
	const ms = t * 1000 - cfg.startMs;
	if (ms < 0 || ms >= cfg.durationMs) return null;
	const p = { ...PROMPT_DEFAULTS, ...cfg };
	const f = p.frame0 + ms * 0.03;

	// ── line layout (world px; the tile sits at the frame centre) ──
	const fs = sizeForXHeight(TYPE, p.xHeight);
	const font = `400 ${fs.toFixed(3)}px ${TYPE}`;
	const chars = Array.from(p.text);
	const cum = [0];
	for (let i = 1; i <= chars.length; i++) cum.push(prefixWidth(font, chars.slice(0, i).join("")));
	const L = cum[chars.length];
	const tileR = CX + p.tileSide / 2;
	const origin = tileR + p.textGap;
	const caret0 = tileR + p.caretGap + p.caret[0] / 2;
	const caret1 = origin + L + p.caretTail + p.caret[0] / 2;
	const u = Math.max(0, Math.min(1, (table(CARET, CARET_F0, f) - 760) / REF_CARET_SPAN));
	const W = u * L;
	const caretX = caret0 + u * (caret1 - caret0);
	const panK = (caret1 - caret0) / REF_CARET_SPAN;
	let P = table(PAN, PAN_F0, f);
	if (f > PAN_F0 + PAN.length - 1) P += (f - (PAN_F0 + PAN.length - 1)) * 3;
	P *= panK;

	// glyphs: each one is inserted when the gliding reveal passes `popAt` px into
	// its slot, then pops 0.2x -> 1x about its baseline centre over ~2.5
	// frames, in its final place (the caret glides ahead of it; f316-f356).
	const uAt = (g) => (table(CARET, CARET_F0, g) - 760) / REF_CARET_SPAN;
	const glyphs = [];
	for (let i = 0; i < chars.length; i++) {
		const adv = cum[i + 1] - cum[i];
		if (chars[i] === " " || W < cum[i] + p.popAt) continue;
		// insertion frame: invert the monotonic reveal (bisection)
		let lo = CARET_F0;
		let hi = f;
		for (let k = 0; k < 18; k++) {
			const mid = (lo + hi) / 2;
			if (uAt(mid) * L >= cum[i] + p.popAt) hi = mid;
			else lo = mid;
		}
		const q = Math.min(1, (f - hi) / p.popFrames);
		const s = 0.2 + 0.8 * (1 - (1 - q) ** 2);
		const gx = origin + cum[i] + adv / 2 - P;
		if (gx < -200 || gx > 1480) continue;
		glyphs.push(
			<text
				key={i}
				x={gx.toFixed(2)}
				y={p.baseline}
				textAnchor="middle"
				transform={
					s < 0.999
						? `translate(${gx.toFixed(2)} ${p.baseline}) scale(${s.toFixed(4)}) translate(${(-gx).toFixed(2)} ${-p.baseline})`
						: undefined
				}
			>
				{chars[i]}
			</text>,
		);
	}
	const tileX = CX - P;
	const tile =
		tileX > -100 ? (
			<Tile
				T={p.tileSide}
				x={tileX}
				markW={p.tileMarkW}
				art={p.artW}
				dx={p.artDx}
				dy={p.artDy}
				radius={p.radius}
				knockout={p.knockout}
			/>
		) : null;
	const cx = caretX - P;
	const caretEl =
		f >= 313.5 && cx > -10 ? (
			<rect
				x={(cx - p.caret[0] / 2).toFixed(2)}
				y={p.caret[2]}
				width={p.caret[0]}
				height={p.caret[1]}
				rx={p.caret[0] / 2}
				fill={rgbs(Q.caret)}
			/>
		) : null;

	// ── send button (screen space, its own curve) ──
	let button = null;
	const btnAt = (g) => {
		const side = p.buttonSize - 126 * 0.785 ** (g - 353);
		return { x: table(BTN_X, BTN_F0, g) + (CX - 640), y: track(BTN_Y, g)[0], side };
	};
	if (f >= 351.5 && f < 413.5) {
		const pressed = f >= 389.5;
		const whip = f >= 409.5;
		// sub-frame average while it travels (fly-in f352-f362, drift f392-f402)
		const a0 = btnAt(f - 0.25);
		const a1 = btnAt(f + 0.25);
		const travel = whip ? 0 : Math.hypot(a1.x - a0.x, a1.y - a0.y);
		const n = Math.min(10, Math.max(1, Math.ceil(travel / 3)));
		let vfilter = null;
		let stretch = 1;
		if (whip) {
			const v = Math.abs(track(BTN_Y, f + 0.5)[0] - track(BTN_Y, f - 0.5)[0]);
			stretch = 1 + v / 700;
			vfilter = v * 0.15;
		}
		const uid = `s3wb${Math.round(f * 10)}`;
		button = (
			<div style={{ position: "absolute", inset: 0, filter: vfilter ? `url(#${uid})` : undefined }}>
				{vfilter ? (
					<svg width={0} height={0} style={{ position: "absolute" }}>
						<filter id={uid} x="-20%" y="-50%" width="140%" height="200%">
							<feGaussianBlur stdDeviation={`0 ${vfilter.toFixed(2)}`} />
						</filter>
					</svg>
				) : null}
				<Accumulate n={n}>
					{(o) => {
						const b = btnAt(f + o * 0.5);
						if (b.side <= 1) return null;
						const side = pressed ? p.buttonSize : b.side;
						return (
							<div
								style={{
									position: "absolute",
									left: (pressed ? CX : b.x) - side / 2,
									top: b.y - side / 2,
									transform: stretch !== 1 ? `scaleY(${stretch.toFixed(4)})` : undefined,
								}}
							>
								<PromptButton size={side} press={pressed ? p.press : 0} />
							</div>
						);
					}}
				</Accumulate>
			</div>
		);
	}

	// ── cursor ──
	let cursor = null;
	if (f >= 356.5) {
		const sizeAt = (g) =>
			p.cursorSize *
			(g < 389.5 ? 1 : g < 409.5 ? p.cursorPress : g < 410.5 ? (1 + p.cursorPress) / 2 + 0.05 : 1);
		// motion blur: the gliding entry reads grey in the reference (shutter
		// ~1 frame), the drift and the release drift less
		const shutter = f < 375 || f >= 410.5 ? 0.75 : 0.5;
		const c0 = track(CURSOR_B, f - shutter / 2);
		const c1 = track(CURSOR_B, f + shutter / 2);
		const nc = Math.min(20, Math.max(1, Math.ceil(Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / 1.5)));
		cursor = (
			<Accumulate n={nc}>
				{(o) => {
					const g = f + o * shutter;
					const [x, y] = track(CURSOR_B, g);
					const size = sizeAt(f);
					const tin = size * 0.055;
					return <ArrowCursor x={x + tin} y={y + tin} size={size} />;
				}}
			</Accumulate>
		);
	}

	// ── s4's ember card entering on the last frame (top fixed at y668) ──
	let card = null;
	if (p.card && f >= 412.5) {
		const rs = riseState(413);
		card = (
			<div
				style={{
					position: "absolute",
					left: CX - 430 * rs.s,
					top: 668,
					width: 860,
					height: 484,
					transform: `scale(${rs.s.toFixed(5)})`,
					transformOrigin: "0 0",
				}}
			>
				<GradientArt
					spec={CARD_ART.ember}
					width={860}
					height={484}
					radius={15}
					grain={0.12}
					seed={3}
				/>
			</div>
		);
	}

	return (
		<div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
			{tile}
			<svg
				width={1280}
				height={720}
				style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
				fill={rgbs(p.ink)}
				fontFamily={TYPE}
				fontSize={fs.toFixed(3)}
			>
				{glyphs}
				{caretEl}
			</svg>
			{card}
			{button}
			{cursor}
		</div>
	);
}

export const S3_PRESETS = {
	"maple-icon-resize": {
		note: "maple's resize-to-icon beat (f269-f312): a full-bleed sampled mesh gradient (ember, settling for ~15 frames) carrying the white mark with a coloured knockout inside a light-blue selection box; the cursor alt-drags the bottom-right handle and the mark grows about the centre on the film's exponential (x0.81/frame), the cursor leaves down-right, then the mark and the whole field shrink into a rounded app-icon tile (radius 0.23 x side) with zoom blur (exact sub-frame average), revealing the white ground. Pair with maple-ground (black -> white hold at the shrink). Retime only as a whole (film-frame clock from startMs = frame0).",
		nativeMs: 1450,
		params: {
			frame0: ["number", 268.98, "film frame at startMs"],
			radius: ["number", 20, "mark fillet, mark units"],
			knockout: ["array", "[221,74,109]", "knockout colour (pink on the ember)"],
			cursorSize: ["number", 50, "pointer size (resize phase)"],
			shutter: ["number", 0.5, "motion-blur shutter, frames"],
			grain: ["number", 0.09, "film grain over the full-bleed"],
			settleRate: ["number", 0.83, "per-frame decay of the gradient's settle from the cut state"],
		},
		render: iconResize,
	},
	"maple-prompt-send": {
		note: "maple's prompt beat (f313-f413): the app-icon tile on white; a blue caret, then the prompt types on as a glide (glyphs pop from 0.25x as their slots open; the caret follows a bell-shaped speed curve), while a caret-tracking pan (text + tile + caret as one layer, accelerating to ~41 px/frame, then decaying) carries the line off left; a blue send button flies in from the right with horizontal blur and settles at the centre (x0.858/frame), the cursor glides in from the lower right and rests on it; click (button 0.765x, cursor pressed), button + cursor drift down (cursor overshoots and springs back), then the button whips up out of frame with vertical stretch + blur and the released cursor drifts down-right. On the last frame s4's ember card top edge enters at y668. Text reflows by measured advances; the pan scales with the line length.",
		nativeMs: 3384,
		params: {
			frame0: ["number", 312.48, "film frame at startMs"],
			text: ["string", "create variations of this logo", "the typed prompt (user-voice)"],
			xHeight: ["number", 45.3, "prompt x-height px (reference 46)"],
			baseline: ["number", 382, "prompt baseline y"],
			tileSide: ["number", 112, "icon tile side (renders 113 px with AA, like the ref)"],
			tileMarkW: ["number", 45, "mark width on the tile"],
			textGap: ["number", 33, "tile right edge -> first glyph"],
			caretGap: ["number", 62, "tile right edge -> caret before typing"],
			buttonSize: ["number", 189, "send button side"],
			cursorSize: ["number", 65, "pointer size"],
			card: ["boolean", true, "draw s4's ember card sliver on the last frame (f413)"],
		},
		render: promptSend,
	},
};

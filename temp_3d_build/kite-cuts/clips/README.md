# Scene clips

Seven **meaningful segments**, not fifteen shots. A scene is one coherent idea; cuts *inside* a scene
are punch-ins and punch-outs on the same subject at the same home framing. Cuts *between* scenes change
the subject.

| # | clip | dur | shots | home w% | the idea |
|---|---|---|---|---|---|
| 1 | `01-open-and-record.mp4` | 8.00s | 3 | 71 | Laptop opens on the editor → punch in on the record control → punch back out to the same framing as the desktop takes over |
| 2 | `02-flat-app-zoom.mp4` | 4.00s | 2 | 77 | Screen detaches from the device, then becomes a genuine full-bleed 2D app. The film's only conventional eased zoom |
| 3 | `03-reopen-and-pan.mp4` | 6.20s | 3 | 52 | Laptop reopens off-centre right; two punches follow while **one** upward pan runs unbroken across both cut points |
| 4 | `04-light-and-sky.mp4` | 6.40s | 2 | 80 | Two held panels on light grounds; lateral drift reverses between them |
| 5 | `05-panel-dissolve.mp4` | 3.90s | 1 | 78 | Thin panel breathes 1.03×, then dissolves to white — the only non-hard transition |
| 6 | `06-record-iphone.mp4` | 7.20s | 1 | 71 | Longest shot. Camera breathes 70.5 → 74.1 → 70.6% — **net zero** over 7.2s |
| 7 | `07-phone-showcase.mp4` | 10.30s | 3 | 25 | Phone enters from the left edge, holds dead still 4.4s, punches tighter, exits right; ends empty |

## Rebuild / merge

```bash
node render-clips.mjs 2                      # all scenes
node render-clips.mjs 2 03-reopen-and-pan    # just one, for iteration
ffmpeg -y -f concat -safe 0 -i concat.txt -c copy ../kite-match-merged.mp4
```

The merge is a **stream copy** — no re-encode, so iterating on one clip costs one clip's render (6–15s),
not the whole film.

## Content slots — the configurability contract

Camera work, framing and timing are fixed per scene. Only the screen content changes. Each scene declares
its slots in `scenes.js`:

```js
slots: { primary: "kite", state: ["desktopRecord", "desktopWeather", "desktopSelect"] }
```

- **`primary`** — the main app screen the scene is built around.
- **`state[]`** — alternate states of that *same* screen (a dialog opening, a mode change). Scene 1 cycles
  through three of them at fixed keyframes, which is what makes a locked camera feel like a demonstration.

To drop a user's recording into a scene, only `primary` (and optionally `state[]`) needs to resolve to a
different texture source. Nothing about the camera needs to know.

**Not yet wired:** slots currently name canvas generators in `ui-textures.js`. Making them accept an
arbitrary image or video frame is the next step, and is what would let an LLM place a recorded demo into
these shots automatically.

## Choosing a scene for a recording

| recording shape | scene |
|---|---|
| desktop app, want the hardware reveal | 1 |
| want the UI read full-screen, no device | 2 |
| a flow with several steps to punch through | 3 |
| a single hero screen, calm | 4, 5 |
| long walkthrough needing a patient hold | 6 |
| mobile capture | 7 |

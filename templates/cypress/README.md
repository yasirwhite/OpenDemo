# cypress

A 62.5-second **feature launch film for an AI teammate that joins your
video calls**. It cuts on hard frames between two worlds:

- **the call**: a near-black call grid, with the agent as one of its tiles.
  The agent is a coral blob that draws a white line: a sunrise while it talks
  and a loop while it works. Its status reads under it.
- **the work**: warm cream paper, where the things the team asked for get
  built while they are still talking.

The beats:

1. **The call fills up.** Webcam tiles fade in and the grid reflows as each
   person joins. A seventh slot traces itself as a dashed outline, fills dark,
   and the agent's blob pops in.
2. **"Hey team".** The camera cuts in close on the agent's tile, and the blob
   becomes a sunrise with rays.
3. **The title card**, "Cypress Meetings" in serif under a slow push. A dark
   voice bubble transcribes the request word by word, and the agent's reply
   bubble rises in.
4. **The whiteboard starts.** The agent's tile fills the frame ("Taking
   notes..." becomes "Starting whiteboard"). A pixel-block iris opens onto a
   gridded whiteboard.
5. **The team fills the board.**
   - A claim rises in, and a coral dot becomes the agent's cursor tag.
   - A small call window docks top-right and a brand sticker peels on.
   - The heading is typed.
   - 17 sticky notes are typed in by five named cursors while the camera
     pans and pushes.
6. **A second claim and request.** The second claim on cream, then a second
   voice request.
7. **The sort.** "Organizing ideas" plays on the tile. On the board, every
   note is dragged into three column panels whose headers type on, and the
   collaborators stamp votes.
8. **The chat.** The board whips up under motion blur onto a chat on black.
   Messages stack and scroll, then come the request and "On it."
9. **The notes doc.** The agent's tag lands in a meeting-notes doc, types
   "Next steps", and a launch-plan card grows a Gantt chart. The camera
   pushes in, and the page whips away.
10. **The tagline.** "Plan as fast as you talk" rises in. The agent selects
    the first word and swaps it: Plan, Sketch, Sort, Work. A viewer cursor
    reacts.
11. **The end card.** A coral dot blooms into the mark and the serif
    wordmark types on beside it.

Choose it for an **agent or collaboration launch** where the story is "you
talk, it builds": meeting assistants, multiplayer canvases, AI that works
inside a shared space. It is fully drawn. The only footage-shaped things are
the webcam tiles in the first 7.5 seconds, which are image slots with drawn
stand-ins.

The placeholder product is **Cypress**, an AI teammate you add to a call. The
placeholder team is **Little Ember Coffee**, picking its winter special.

## Provenance

Derived from the **Claude Meetings launch film**, posted 2026-11-12 by
@claudeai at
[x.com/claudeai/status/2120973994191094179](https://x.com/claudeai/status/2120973994191094179).

- Checked on 2026-11-14 (fxtwitter API), two days after posting, it had
  **9,851,535 views, 80,935 likes, 5,124 reposts, 2,252 replies and 20,464
  bookmarks**.
- The account is large (2.1M followers), but a 0.8% like rate on ~10M views
  means the film carried the post.
- The dated record is in `references/launch-scouting.json`. The manifest
  entry (`claude-meetings`, md5 only, media not committed) is in
  `references/references.json`.

It was rebuilt **frame-by-frame on 2026-11-14** on the film's own 24fps
clock (stage px = reference px / 1.5), in four sections. `reference-notes.md`
has the section map and the key measurements, and each preset file cites the
reference frames its curves come from.

None of the reference's brand is used: no name, logo, people, copy or
scenario. The mark is a drawn six-petal bloom, not the reference's starburst.
The webcam people are replaced by image slots.

## Build and render

```bash
node src/lib/textcards/build.mjs --config templates/cypress/template.json
node src/lib/textcards/render.mjs --out cypress.mp4 --fps 24 --scale 1.5
```

Render at **24fps**: the presets replay curves measured per reference frame,
and several beats animate on twos. The film is authored on the 1280x720
stage, and `--scale 1.5` renders it at 1920x1080. If someone else may be
rendering from the same checkout, render from a private stage (see
`src/lib/textcards/README.md`, `--html`).

## What is fixed and what is replaceable

**Fixed (the template):**

- The timing of every beat, in reference frames. Each preset converts its
  scene-relative time to reference frames through `f0`, so a scene's motion
  follows it if you move its `startMs`, but its internal timing does not
  stretch.
- The cameras: the close-up push, the title zoom, the board's pan and push,
  the sort pull-back, the doc push, and both whips.
- The geometry: tile layouts per join, the bubble cards, the docked window,
  the note slots and the column panels.
- The palette: call black [0,1,0], tiles [21,23,20], coral [208,111,87],
  paper [250,249,244] and the six note colours.

**Replaceable (fields in `template.json`):**

| scene | fields | what they are |
|---|---|---|
| `call-grid`, `agent-hello` | `people[]` (`name`, `photo`, `camOff`, `avatarSrc`), `agentName`, `controls`, `status` | the six participants (**image slots**), the agent's name, the control bar, the hello line |
| `title-card`, `voice-1`, `reply-1` | `title`, `text`, `accent`, `name`, `markSrc` | feature title, the spoken request (`accent` = indices of coral wake words), the agent's reply |
| `s2-tile-iris` | `status1`, `status2` | the agent's two working statuses |
| `s2-whiteboard` | `claim1`, `heading`, `notes[]`, `people`, `stickerSrc`, `stickerTop`/`stickerBottom`/`stickerTagline`, `participants[]`, `othersLabel` | claim, board heading, the 17 notes, cursor names, the **sticker image slot** and its drawn fallback copy, the docked window's avatars |
| `s2-claim-voice` | `claim2`, `voice` | second claim and second request |
| `s3-tile` | `status` | "Organizing ideas" |
| `s3-board` | `heading`, `columns[]`, `notes`, `cursorNames`, `stickerSrc`, `participants` | the sort: column titles and sub-lines |
| `s3-chat` | `history`, `linkCard`, `thread[]`, `request`, `reply`, `markSrc` | the chat |
| `notes-doc` | `docTitle`, `date`, `author`, `heading`, `cardEyebrow`, `cardTitle`, `rows` (see preset params) | the meeting-notes doc and its launch-plan card |
| `swap-line` | `words[]`, `rest`, `reaction` | the tagline: swapped first words + the fixed tail |
| `endcard` | `word`, `markSrc` | wordmark and your mark |

**Slots: 8 image slots:**

- six participant photos or avatars (`people[]`)
- the sticker (`stickerSrc`)
- your mark (`markSrc`)

Without them, drawn stand-ins render: room-tone silhouettes, initials, a
drawn badge and the bloom mark.

Keep copy close to the placeholder lengths. The bubbles, notes and chat cards
wrap, but the cameras were measured on the reference's layout. If the copy
does not fit a beat, shorten the copy, not the beat.

## Presets

They live in `presets/` (one file per section plus `cypress-shared.jsx`) and
are registered by one spread in `src/lib/textcards/src/presets/index.jsx`.

| slug | beat |
|---|---|
| `cypress-call-grid` | the call fills, tiles reflow, the agent tile joins |
| `cypress-agent-hello` | close-up on the agent tile: sunrise, "Hey team" |
| `cypress-title-card` | cream title under the push |
| `cypress-voice-bubble` | voice request transcribed word by word |
| `cypress-reply-bubble` | the agent's reply |
| `cypress-tile-iris` | full-frame working tile, status swap, pixel iris |
| `cypress-whiteboard` | claim, docked window, sticker, heading, notes and cursors |
| `cypress-claim-voice` | claim 2 and the second request |
| `cypress-organize-tile` | "Organizing ideas" tile |
| `cypress-sort-board` | the sort into columns, votes, whip to the chat |
| `cypress-chat-stack` | the chat thread, request and reply |
| `cypress-notes-doc` | the notes doc, Next steps, Gantt card, whip |
| `cypress-swap-line` | the word-swap tagline |
| `cypress-endcard` | mark bloom and wordmark |

## Fonts

- Georgia stands in for the reference's text serif, with a hairline same-ink
  stroke where it needed weight.
- Segoe UI stands in for its geometric interface sans. Bubble text is
  tracked +1.4 px to match the reference's line widths.
- Both ship with Windows. Other systems fall back to Cambria/Times and
  Inter/system-ui, and wraps can shift.

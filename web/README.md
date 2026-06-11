# PushBox &mdash; J2ME (2005) &rarr; HTML5 / JavaScript

This folder is an HTML5 / JavaScript conversion of **PushBox**, an isometric
Sokoban game originally written for J2ME (MIDP 1.0) mobile phones in 2005
(10000+ downloads back then). The original Java source still lives at the
repository root (`PushBox.java`, `PushBoxCanvas.java`, `Sprite.java`).

The goal of the port was to keep the **2005 code recognizable** &mdash; same class
structure, constants, state machine, the isometric "diamond walk" tile
renderer, the embedded 33 levels and the movement / box-pushing logic &mdash;
while making it run in a browser instead of on a phone.

## How the conversion maps to the original

| Original (Java / J2ME) | Port (JavaScript) | Notes |
| --- | --- | --- |
| `PushBox.java` (MIDlet) | `js/PushBox.js` | Builds the canvas, wires keyboard input like `keyPressed`/`keyReleased`, and drives the old `run()` loop with a fixed 40&nbsp;ms timestep via `requestAnimationFrame`. |
| `PushBoxCanvas.java` (FullCanvas) | `js/PushBoxCanvas.js` | The whole game: state machine, isometric renderer, 33 embedded levels, win logic. |
| `Sprite.java` | `js/Sprite.js` | Player ("lion") and crate sprites, movement + pushing. |
| `javax.microedition.lcdui.Graphics` / `Image` | `js/runtime.js` | A tiny shim emulating just the MIDP drawing calls the game uses (`drawImage`, `setClip`, `translate`, `fillRect`, anchors) on a `<canvas>`. |
| packed art resource `a.bin` (lost) | `js/runtime.js` &rarr; `buildAssets()` | The original sprite/tile bundle is gone, so the tiles, crates, the lion sprite sheet, the bitmap font and the title/avatar art are **regenerated procedurally** into the same `data[]` table the original `loadImagesFromBundle("a.bin")` produced. |
| RMS `RecordStore` (saved level) | `localStorage` | Same intent: remember the current stage. |
| level data arrays | `js/levels.js` | Extracted **verbatim** from `PushBoxCanvas.java` by `tools/extract_levels.js`. |

## Run it

It is just static files &mdash; no build step, no dependencies:

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

## Play

- Arrow keys (or WASD) move the lion.
- Space / Enter = fire (advance menus / select a stage).
- Flow: **title &rarr; fire &rarr; pick a stage &rarr; fire &rarr; push every crate onto a blue target tile.**

## Developer tools (`web/tools/`)

- `extract_levels.js` &mdash; regenerates `js/levels.js` from the Java source.
- `headless_test.js` &mdash; stubs the DOM/canvas and checks that all 33 levels
  load, that the push&rarr;target&rarr;win mechanic works, and that a real level is
  solvable. Run with `node web/tools/headless_test.js`.
- `solver.js` &mdash; a BFS Sokoban solver that drives the real engine and returns
  a winning key sequence (used to verify levels are solvable / to script demos).

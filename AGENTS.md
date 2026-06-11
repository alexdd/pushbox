# AGENTS.md

## Project overview

This repo holds **PushBox**, an isometric Sokoban game.

- Repository root: the original **J2ME (MIDP 1.0)** Java source from 2005
  (`PushBox.java`, `PushBoxCanvas.java`, `Sprite.java`). This is kept for
  reference / portfolio comparison and is **not** built.
- `web/`: an **HTML5 / JavaScript** port of that game (see `web/README.md` for
  how the JS files map back to the Java classes).

## Cursor Cloud specific instructions

- **No dependencies / no build step.** The port is plain static HTML/JS and the
  tooling uses only Node and Python built-ins (both preinstalled). There is no
  `package.json`, lockfile, or `node_modules`.
- **Run the game** (development = production here, just static files):
  ```bash
  cd web && python3 -m http.server 8000   # http://localhost:8000/index.html
  ```
- **Tests / checks** (run from the repo root):
  - `node web/tools/headless_test.js` — stubs the DOM + canvas and asserts all
    33 levels load, the core push→target→win mechanic works, and a real level is
    solvable via the bundled solver. This is the main automated check.
  - `node --check web/js/*.js` — syntax check.
- **Non-obvious gotchas:**
  - The original artwork bundle `a.bin` is **lost**. The tiles, sprites, bitmap
    font and title/avatar art are regenerated procedurally at load time in
    `web/js/runtime.js` → `buildAssets()`, filling the same `data[]` indices the
    old `loadImagesFromBundle()` produced. If a sprite/tile looks wrong, fix it
    there, not in the game logic.
  - `web/js/levels.js` is **generated** from `PushBoxCanvas.java` by
    `node web/tools/extract_levels.js`. Don't hand-edit it; re-run the extractor
    if the Java level data ever changes.
  - Input is **quick taps = one tile** (the game itself uses continuous movement
    while a key is held). When scripting/automating play, send short key taps;
    holding a key moves multiple tiles.
  - `web/tools/solver.js` (`solve(levelIndex)`) drives the real engine with BFS
    and returns a winning arrow-key sequence — handy to confirm a level is
    solvable or to script a demo. Levels are 0-indexed there (level "1" = 0).
  - The win condition is the original's quirky one: `target_cnt` only counts
    crates that are *pushed* onto a target tile and must equal `targets[lev]`;
    crates that start on a target are not pre-counted. This is faithful to 2005,
    so don't "fix" it.

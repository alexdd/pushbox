# PushBox

Isometric Sokoban game originally written for **J2ME (MIDP 1.0)** feature phones in 2005
(10,000+ free downloads via major J2ME game portals). Levels from Lee Haywood's Sokoban
collection.

**Blog post:** [PushBox: J2ME to HTML5 in 49 Minutes](https://www.tekturcms.de/index.html#2026-06-13-pushbox-j2me-to-html5-in-49-minutes)

This branch is a plain **HTML5 / JavaScript** port of PushBox, plus a **Hyrule**
prototype: the same isometric tile engine scaled to a **1000×1000** overworld,
with a Fastify + WebSocket backend so up to **5 players** can walk it together.

## Run locally

PushBox only (static files, no backend):

```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html
```

Hyrule MMORPG prototype (serves PushBox and `/zelda/`):

```bash
npm install
npm start
# open http://localhost:3000/zelda/
```

Embed mode (for iframes): `index.html?embed=1`

## Checks

```bash
node tools/headless_test.js
node tools/zelda_test.js
node --check js/*.js
```

## Layout

| File | Role |
| --- | --- |
| `index.html` | Page shell, keyboard hints, script load order |
| `js/PushBox.js` | Canvas bootstrap, input, fixed-timestep game loop |
| `js/PushBoxCanvas.js` | State machine, isometric renderer, 33 levels, win logic |
| `js/Sprite.js` | Player and crate sprites, movement + pushing |
| `js/runtime.js` | MIDP `Graphics`/`Image` shim + procedural art (`buildAssets()`) |
| `js/levels.js` | Embedded level data (33 stages) |
| `tools/headless_test.js` | Headless smoke test + solver check |
| `tools/solver.js` | BFS solver driving the real engine |
| `zelda/` | Hyrule prototype (login, touch pad, isometric client) |
| `shared/world.js` | Deterministic 1000×1000 overworld (rivers, bridges, villages) |
| `server/index.js` | Fastify + WebSocket MMORPG backend (max 5 players) |

The original artwork bundle (`a.bin`) is lost; sprites and tiles are rebuilt procedurally
in `js/runtime.js`.

## Play

PushBox:

- Arrow keys (or WASD) move the player.
- Space / Enter = fire (advance menus / select a stage).
- Flow: **title → fire → pick a stage → fire → push every crate onto a target tile.**

Hyrule (`/zelda/`):

- Enter a name and join (max 5 concurrent players).
- Walk the isometric overworld (trees, rivers with bridges, five villages).
- See other players live, chat, and wave (`E` or the action button).
- Touch D-pad on phones and tablets; the canvas scales to the viewport.

Alex's homepage: [www.tekturcms.de](https://www.tekturcms.de/)

# PushBox

Isometric Sokoban game originally written for **J2ME (MIDP 1.0)** feature phones in 2005
(10,000+ free downloads via major J2ME game portals). Levels from Lee Haywood's Sokoban
collection.

**Blog post:** [PushBox: J2ME to HTML5 in 49 Minutes](https://www.tekturcms.de/index.html#2026-06-13-pushbox-j2me-to-html5-in-49-minutes)

## HTML5 port (`web/`)

On the **`html5-port`** branch, a [Cursor](https://cursor.com) cloud agent ported the game
to plain HTML5 / JavaScript in about **49 minutes**. The original three Java classes map
one-to-one to JavaScript modules; program structure and coding style were deliberately
kept the same as the 2005 source.

- **Play online:** embedded in the [blog post](https://www.tekturcms.de/index.html#2026-06-13-pushbox-j2me-to-html5-in-49-minutes) above
- **Run locally:**

  ```bash
  cd web
  python3 -m http.server 8000
  # open http://localhost:8000/index.html
  ```

- **Checks:** `node web/tools/headless_test.js` (from repo root)
- **Mapping & details:** see [`web/README.md`](web/README.md)

The original artwork bundle (`a.bin`) is lost; sprites and tiles are rebuilt
procedurally at load time in `web/js/runtime.js`.

## Original J2ME source (2005)

`PushBox.java`, `PushBoxCanvas.java`, `Sprite.java` at the repository root &mdash; kept
for reference / portfolio comparison, not built.

The old Java Applet version is still on Alex's homepage:
http://www.alex-duesel.de/index_alt.html

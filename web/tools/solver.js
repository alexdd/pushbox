// A breadth-first Sokoban solver that drives the *actual* ported engine, so a
// solution it returns is guaranteed to trigger PushBoxCanvas.STATE_WIN in the
// real game.  Used by headless_test.js and to obtain a key sequence for the
// demo.  solve(lev) -> array of "U"/"D"/"L"/"R" moves (arrow keys) or null.
"use strict";

function solve(lev, maxNodes) {
  maxNodes = maxNodes || 200000;
  const c = new PushBoxCanvas(document.getElementById("screen"));
  c.load();
  c.lev = lev;
  c.loadLevel();
  c.setState(PushBoxCanvas.STATE_GAME);
  c.frameTime = 40;

  const DIRS = [
    ["U", Sprite.DIR_NORTH],
    ["D", Sprite.DIR_SOUTH],
    ["L", Sprite.DIR_WEST],
    ["R", Sprite.DIR_EAST],
  ];

  function snap() {
    const objs = [];
    for (let i = 0; i < c.numObjects; i++) {
      const o = c.objects[i];
      objs.push({ i: o.globalIndex, tx: o.tileX, ty: o.tileY, dir: o.dir,
                  img: o.image, state: o.state, steps: o.steps, off: o.tileOffset,
                  tr: o.tileRow, x: o.x, y: o.y, moved: o.moved });
    }
    return { objs, tc: c.target_cnt, state: c.state };
  }

  function restore(s) {
    c.target_cnt = s.tc;
    c.state = s.state;
    for (const od of s.objs) {
      const o = c.objects[od.i];
      o.tileX = od.tx; o.tileY = od.ty; o.dir = od.dir; o.image = od.img;
      o.state = od.state; o.steps = od.steps; o.tileOffset = od.off;
      o.tileRow = od.tr; o.x = od.x; o.y = od.y; o.moved = od.moved;
      o.walk = Sprite.DIR_NONE; o.pushing = null; o.prev = null; o.next = null;
    }
    c.sorted = null;
    for (let i = 0; i < c.numObjects; i++) {
      const o = c.objects[i];
      if (o.type === Sprite.TYPE_LION) c.player = o;
      c.add_object(o);
    }
  }

  function doMove(dir) {
    c.player.setKeys(dir);
    for (let k = 0; k < 16; k++) {
      c.update();
      if (c.state === PushBoxCanvas.STATE_WIN) return;
      const p = c.player;
      if (p.state === Sprite.STATE_IDLE && p.steps === 0 && p.tileOffset === 0) break;
    }
  }

  function key(s) {
    return s.objs.map((o) => o.i + ":" + o.tx + "," + o.ty).sort().join("|") + "#" + s.tc;
  }

  const start = snap();
  const seen = new Set([key(start)]);
  let queue = [{ s: start, path: [] }];
  let nodes = 0;

  while (queue.length) {
    const { s, path } = queue.shift();
    if (path.length > 50) continue;
    for (const [name, dir] of DIRS) {
      restore(s);
      doMove(dir);
      nodes++;
      if (c.state === PushBoxCanvas.STATE_WIN) return path.concat(name);
      const ns = snap();
      const k = key(ns);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push({ s: ns, path: path.concat(name) });
      }
      if (nodes > maxNodes) return null;
    }
  }
  return null;
}

if (typeof module !== "undefined") module.exports = { solve };

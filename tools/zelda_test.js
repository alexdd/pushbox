/*
 * Headless checks for the Hyrule prototype:
 *   1. 1000×1000 world has rivers, bridges, houses, trees, walkable spawn
 *   2. ZeldaCanvas loads the world and the player can take a step
 *   3. Fastify + WebSocket: 5 players join, a 6th is rejected, moves broadcast
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { generateWorld, isWalkable, TILE } = require("../shared/world");
const { buildServer, MAX_PLAYERS } = require("../server/index");

function section(name) { console.log("  · " + name); }

// ---------------------------------------------------------------------------
section("world generator");
const world = generateWorld(1998, 1000);
assert.strictEqual(world.size, 1000);
assert.strictEqual(world.tiles.length, 1000 * 1000);
assert.ok(world.stats.water > 5000, "rivers should cover many water tiles");
assert.ok(world.stats.bridges > 20, "roads must cross rivers on bridges");
assert.ok(world.stats.houses >= 8, "villages should contain houses");
assert.ok(world.stats.trees > 200, "forests should plant trees");
assert.ok(world.stats.villages === 5);
assert.ok(isWalkable(world, world.spawn.x, world.spawn.y), "spawn must be walkable");

let walkableNear = 0;
for (let y = world.spawn.y - 4; y <= world.spawn.y + 4; y++) {
  for (let x = world.spawn.x - 4; x <= world.spawn.x + 4; x++) {
    if (isWalkable(world, x, y)) walkableNear++;
  }
}
assert.ok(walkableNear >= 10, "Hateno plaza should be walkable");

const world2 = generateWorld(1998, 1000);
assert.deepStrictEqual(Buffer.from(world.tiles), Buffer.from(world2.tiles), "same seed is deterministic");
assert.strictEqual(world.trees.length, world2.trees.length);

// ---------------------------------------------------------------------------
section("tile engine (1000×1000)");
function stubCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === "measureText") return () => ({ width: 8 });
      if (p === "createImageData") return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (p === "getImageData") return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}
const documentStub = {
  createElement() {
    const c = { width: 0, height: 0 };
    c.getContext = () => stubCtx();
    c.getWidth = function () { return this.width; };
    c.getHeight = function () { return this.height; };
    return c;
  },
  getElementById() {
    const c = documentStub.createElement();
    c.width = 320; c.height = 208;
    return c;
  }
};
const sandbox = {
  window: { addEventListener() {} },
  document: documentStub,
  requestAnimationFrame() {},
  console,
  ZeldaWorld: require("../shared/world")
};
vm.createContext(sandbox);
const load = (rel) => {
  const abs = path.join(__dirname, "..", rel);
  vm.runInContext(fs.readFileSync(abs, "utf8"), sandbox, { filename: rel });
};
load("js/runtime.js");
load("js/Sprite.js");
load("zelda/js/assets.js");
load("zelda/js/ZeldaCanvas.js");

const engineOut = vm.runInContext(`
  const screen = document.getElementById("screen");
  const engine = new ZeldaCanvas(screen);
  engine.resize(320, 208);
  const assets = buildHyruleAssets();
  const world = ZeldaWorld.generateWorld(1998, 1000);
  engine.loadWorld(world, assets);
  engine.spawnLocal({ id: 1, name: "Test", slot: 0, color: "#2f8f3a", tx: world.spawn.x, ty: world.spawn.y, dir: 2 });
  engine.state = ZeldaCanvas.STATE_GAME;
  const before = { x: engine.player.tileX, y: engine.player.tileY };
  engine.RIGHT = true;
  for (let i = 0; i < 20; i++) engine.step();
  engine.paint();
  ({
    size: engine.width_map,
    objects: engine.props.length,
    moved: engine.player.tileX !== before.x || engine.player.tileY !== before.y || engine.player.state === Sprite.STATE_MOVING,
    spawn: before,
    tile: engine.getTile(before.x, before.y)
  });
`, sandbox);

assert.strictEqual(engineOut.size, 1000);
assert.ok(engineOut.objects > 200, "props (trees+houses) loaded");
assert.ok(engineOut.moved, "player should walk on the plaza");
assert.ok(engineOut.tile === TILE.PATH || engineOut.tile === TILE.GRASS || engineOut.tile === TILE.FLOWER);

// ---------------------------------------------------------------------------
section("fastify + websocket (5 players)");
(async () => {
  const app = await buildServer({ logger: false, seed: 1998 });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const port = app.server.address().port;
  const health = await fetch("http://127.0.0.1:" + port + "/api/health").then((r) => r.json());
  assert.strictEqual(health.ok, true);
  assert.strictEqual(health.world.size, 1000);
  assert.strictEqual(health.max, MAX_PLAYERS);

  function openPlayer(name) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("ws://127.0.0.1:" + port + "/ws");
      const inbox = [];
      ws.addEventListener("message", (ev) => inbox.push(JSON.parse(ev.data)));
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ t: "join", name }));
      });
      ws.addEventListener("error", reject);
      const start = Date.now();
      const wait = () => {
        const welcome = inbox.find((m) => m.t === "welcome" || m.t === "error");
        if (welcome) return resolve({ ws, inbox, welcome });
        if (Date.now() - start > 4000) return reject(new Error("join timeout for " + name));
        setTimeout(wait, 20);
      };
      wait();
    });
  }

  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const s = await openPlayer("Held" + (i + 1));
    assert.strictEqual(s.welcome.t, "welcome", "player " + (i + 1) + " should join");
    sessions.push(s);
  }

  const sixth = await openPlayer("ZuViel");
  assert.strictEqual(sixth.welcome.t, "error");
  assert.strictEqual(sixth.welcome.code, "full");
  sixth.ws.close();

  const a = sessions[0], b = sessions[1];
  const destX = a.welcome.player.tx + 1;
  const destY = a.welcome.player.ty;
  a.ws.send(JSON.stringify({
    t: "move", tx: destX, ty: destY, x: 10, y: 20, dir: 1, moving: true
  }));

  const sawMove = await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (b.inbox.some((m) => m.t === "move" && m.player.id === a.welcome.player.id && m.player.tx === destX))
        return resolve(true);
      if (Date.now() - start > 4000) return reject(new Error("move was not broadcast"));
      setTimeout(poll, 20);
    };
    poll();
  });
  assert.ok(sawMove);

  a.ws.send(JSON.stringify({ t: "say", text: "Hallo Hyrule" }));
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (b.inbox.some((m) => m.t === "say" && m.text === "Hallo Hyrule")) return resolve();
      if (Date.now() - start > 4000) return reject(new Error("chat was not broadcast"));
      setTimeout(poll, 20);
    };
    poll();
  });

  for (const s of sessions) s.ws.close();
  await app.close();

  console.log("zelda_test: ok");
  console.log("  world", world.stats);
  console.log("  engine moved from", engineOut.spawn);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

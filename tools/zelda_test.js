/*
 * Headless checks for the Yoga Event Area:
 *   1. 1000×1000 world has rivers, temples, deities, walkable spawn
 *   2. ZeldaCanvas loads and the yogi can take a step
 *   3. Fastify: 5 online, 6th rejected; register/login; whisper; festival join
 */
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { generateWorld, isWalkable, TILE } = require("../shared/world");
const { createPopulation, stepAll } = require("../shared/npcs");
const { buildServer, MAX_PLAYERS } = require("../server/index");

function section(name) { console.log("  · " + name); }

section("world generator");
const world = generateWorld(1998, 1000);
assert.strictEqual(world.size, 1000);
assert.strictEqual(world.tiles.length, 1000 * 1000);
assert.ok(world.stats.water > 5000, "rivers should cover many water tiles");
assert.ok(world.stats.bridges > 20, "roads must cross rivers on bridges");
assert.ok(world.stats.houses >= 8, "ashrams should contain huts");
assert.ok(world.stats.trees > 200, "forests should plant trees");
assert.ok(world.temples.length >= 7, "seven deity temples");
const deities = world.temples.map((t) => t.deity);
["shiva", "kali", "ganesha"].forEach((d) => assert.ok(deities.includes(d), d + " temple"));
assert.ok(isWalkable(world, world.spawn.x, world.spawn.y), "spawn must be walkable");

let walkableNear = 0;
for (let y = world.spawn.y - 4; y <= world.spawn.y + 4; y++) {
  for (let x = world.spawn.x - 4; x <= world.spawn.x + 4; x++) {
    if (isWalkable(world, x, y)) walkableNear++;
  }
}
assert.ok(walkableNear >= 10, "ashram plaza should be walkable");

const world2 = generateWorld(1998, 1000);
assert.deepStrictEqual(Buffer.from(world.tiles), Buffer.from(world2.tiles), "same seed is deterministic");
assert.strictEqual(world.trees.length, world2.trees.length);
assert.strictEqual(world.temples.length, world2.temples.length);

section("ashram residents");
const pop = createPopulation(world);
assert.strictEqual(pop.npcs.length, 30);
const names = new Set(pop.npcs.map((n) => n.name));
assert.strictEqual(names.size, 30);
const behaviors = new Set(pop.npcs.map((n) => n.behavior));
assert.ok(behaviors.has("still") && behaviors.has("pace") && behaviors.has("wander") && behaviors.has("circuit") && behaviors.has("pilgrim") && behaviors.has("greet"));
for (let i = 0; i < pop.npcs.length; i++) {
  const n = pop.npcs[i];
  assert.ok(isWalkable(world, n.tx, n.ty), n.name + " must stand on walkable ground");
}
const stillBefore = pop.npcs.filter((n) => n.behavior === "still").map((n) => n.tx + "," + n.ty);
const mover = pop.npcs.find((n) => n.behavior === "pace" || n.behavior === "wander" || n.behavior === "pilgrim");
const moverBefore = mover.tx + "," + mover.ty;
for (let i = 0; i < 40; i++) stepAll(pop, world, [{ tx: world.spawn.x, ty: world.spawn.y }], 100000 + i * 1000);
for (let i = 0; i < pop.npcs.length; i++) {
  assert.ok(isWalkable(world, pop.npcs[i].tx, pop.npcs[i].ty), pop.npcs[i].name + " left the path");
}
const stillAfter = pop.npcs.filter((n) => n.behavior === "still").map((n) => n.tx + "," + n.ty);
assert.deepStrictEqual(stillAfter, stillBefore, "sitting yogis stay on their mat");
assert.notStrictEqual(pop.npcs.find((n) => n.id === mover.id).tx + "," + pop.npcs.find((n) => n.id === mover.id).ty, moverBefore, "a walking yogi should leave the first tile");

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
  ZeldaWorld: require("../shared/world"),
  YogaCatalog: require("../shared/catalog")
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
  engine.spawnLocal({ id: 1, name: "Test", slot: 0, color: "#c45c26", gender: "female", tx: world.spawn.x, ty: world.spawn.y, dir: 2 });
  engine.state = ZeldaCanvas.STATE_GAME;
  const before = { x: engine.player.tileX, y: engine.player.tileY };
  engine.RIGHT = true;
  for (let i = 0; i < 20; i++) engine.step();
  engine.resize(480, 320);
  engine.setCamera(engine.player.x, engine.player.y);
  engine.g.setClip(0, 0, engine.viewW, engine.viewH);
  engine.player.paint(engine.g);
  const clipHeld = engine.g.clipW >= engine.viewW && engine.g.clipH >= engine.viewH;
  const painted = new Set();
  const origPaint = Prop.prototype.paint;
  Prop.prototype.paint = function (g) {
    painted.add(this);
    return origPaint.call(this, g);
  };
  engine.paint();
  Prop.prototype.paint = origPaint;
  let missing = 0;
  let onScreen = 0;
  for (let i = 0; i < engine.props.length; i++) {
    const p = engine.props[i];
    if (!ZeldaCanvas.isOnScreen(engine, p)) continue;
    onScreen++;
    if (!painted.has(p)) missing++;
  }
  engine.paint();
  const ground = engine.visibleTiles();
  const under = ground.some((t) => t.tx === engine.player.tileX && t.ty === engine.player.tileY);
  ({
    size: engine.width_map,
    objects: engine.props.length,
    temples: engine.props.filter((p) => p.kind === "temple").length,
    moved: engine.player.tileX !== before.x || engine.player.tileY !== before.y || engine.player.state === Sprite.STATE_MOVING,
    spawn: before,
    tile: engine.getTile(before.x, before.y),
    clipHeld,
    missing,
    onScreen,
    under
  });
`, sandbox);

assert.strictEqual(engineOut.size, 1000);
assert.ok(engineOut.objects > 200, "props (trees+huts+temples) loaded");
assert.strictEqual(engineOut.clipHeld, true, "yogi sprite clip must not stick");
assert.ok(engineOut.onScreen > 0, "some trees or huts should be on screen");
assert.strictEqual(engineOut.missing, 0, "on-screen trees and huts must all be painted");
assert.strictEqual(engineOut.under, true, "the tile under the yogi must be in the camera window");
assert.ok(engineOut.temples >= 5, "temple props placed");
assert.ok(engineOut.moved, "yogi should walk on the plaza");
assert.ok(engineOut.tile === TILE.PATH || engineOut.tile === TILE.GRASS || engineOut.tile === TILE.FLOWER);

section("fastify + websocket + auth");
(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "yoga-"));
  const app = await buildServer({ logger: false, seed: 1998, dataDir });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const port = app.server.address().port;
  const health = await fetch("http://127.0.0.1:" + port + "/api/health").then((r) => r.json());
  assert.strictEqual(health.ok, true);
  assert.strictEqual(health.world.size, 1000);
  assert.ok((health.world.temples || []).length >= 7);
  assert.strictEqual(health.max, MAX_PLAYERS);
  assert.strictEqual(health.npcs, 30);

  const suffix = String(Date.now() % 100000);
  const reg = await fetch("http://127.0.0.1:" + port + "/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Mira" + suffix,
      password: "om1234",
      gender: "female",
      focus: "bhakti",
      asanas: ["padma", "surya"]
    })
  }).then((r) => r.json());
  assert.ok(reg.token, "register returns token");
  assert.strictEqual(reg.account.gender, "female");

  const login = await fetch("http://127.0.0.1:" + port + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Mira" + suffix, password: "om1234" })
  }).then((r) => r.json());
  assert.ok(login.token);

  const cal = await fetch("http://127.0.0.1:" + port + "/api/calendar", {
    headers: { Authorization: "Bearer " + login.token }
  }).then((r) => r.json());
  assert.ok(cal.festivals.length >= 5, "calendar has temple festivals");

  const joinedFest = await fetch("http://127.0.0.1:" + port + "/api/festivals/" + cal.festivals[0].id + "/join", {
    method: "POST",
    headers: { Authorization: "Bearer " + login.token, "Content-Type": "application/json" },
    body: JSON.stringify({ asanas: ["padma"], focus: "meditation", booked: ["dawn"] })
  }).then((r) => r.json());
  assert.ok(joinedFest.festival.mine);
  assert.ok(joinedFest.festival.mine.booked.indexOf("dawn") >= 0);

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

  function openAuth(token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket("ws://127.0.0.1:" + port + "/ws");
      const inbox = [];
      ws.addEventListener("message", (ev) => inbox.push(JSON.parse(ev.data)));
      ws.addEventListener("open", () => ws.send(JSON.stringify({ t: "auth", token })));
      ws.addEventListener("error", reject);
      const start = Date.now();
      const wait = () => {
        const welcome = inbox.find((m) => m.t === "welcome" || m.t === "error");
        if (welcome) return resolve({ ws, inbox, welcome });
        if (Date.now() - start > 4000) return reject(new Error("auth timeout"));
        setTimeout(wait, 20);
      };
      wait();
    });
  }

  const sessions = [];
  const authed = await openAuth(login.token);
  assert.strictEqual(authed.welcome.t, "welcome");
  assert.strictEqual(authed.welcome.player.gender, "female");
  assert.ok(authed.welcome.calendar.length >= 5);
  sessions.push(authed);

  for (let i = 0; i < 4; i++) {
    const s = await openPlayer("Yogi" + (i + 1));
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

  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (b.inbox.some((m) => m.t === "move" && m.player.id === a.welcome.player.id && m.player.tx === destX))
        return resolve(true);
      if (Date.now() - start > 4000) return reject(new Error("move was not broadcast"));
      setTimeout(poll, 20);
    };
    poll();
  });

  a.ws.send(JSON.stringify({ t: "whisper", to: b.welcome.player.id, text: "Namaste, gehen wir zum Shiva-Festival?" }));
  await new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      if (b.inbox.some((m) => m.t === "whisper" && m.text.indexOf("Shiva") >= 0)) return resolve();
      if (Date.now() - start > 4000) return reject(new Error("whisper was not delivered"));
      setTimeout(poll, 20);
    };
    poll();
  });

  for (const s of sessions) s.ws.close();
  await app.close();

  console.log("zelda_test: ok");
  console.log("  world", world.stats);
  console.log("  temples", world.temples.map((t) => t.deity + "@" + t.x + "," + t.y).join(" "));
  console.log("  engine moved from", engineOut.spawn);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

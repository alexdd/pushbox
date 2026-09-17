/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Fastify + WebSocket backend for the Hyrule MMORPG prototype.
 * Up to 5 concurrent players can join and walk the shared 1000×1000
 * isometric overworld in real time.
 */
"use strict";

const path = require("path");
const Fastify = require("fastify");
const { generateWorld, isWalkable, spawnForSlot, publicMeta } = require("../shared/world");

const MAX_PLAYERS = 5;
const COLORS = ["#2f8f3a", "#c43b3b", "#2f6fbf", "#7b3bb0", "#d4a017"];
const NAME_RE = /^[\w äöüÄÖÜß'-]{1,16}$/;

function sanitizeName(name) {
  const n = String(name || "").trim();
  if (!NAME_RE.test(n)) return null;
  return n;
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    slot: p.slot,
    color: p.color,
    x: p.x,
    y: p.y,
    tx: p.tx,
    ty: p.ty,
    dir: p.dir,
    moving: p.moving
  };
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

async function buildServer(opts) {
  const options = opts || {};
  const app = Fastify({ logger: options.logger === true });
  const world = generateWorld(options.seed);
  const players = new Map();
  let nextId = 1;

  function usedSlots() {
    const used = new Set();
    for (const p of players.values()) used.add(p.slot);
    return used;
  }

  function nextSlot() {
    const used = usedSlots();
    for (let s = 0; s < MAX_PLAYERS; s++) if (!used.has(s)) return s;
    return -1;
  }

  function broadcast(msg, exceptId) {
    const raw = JSON.stringify(msg);
    for (const p of players.values()) {
      if (p.id === exceptId) continue;
      if (p.ws.readyState === 1) p.ws.send(raw);
    }
  }

  function leave(id, reason) {
    const p = players.get(id);
    if (!p) return;
    players.delete(id);
    broadcast({ t: "leave", id, reason: reason || "disconnect" });
  }

  await app.register(require("@fastify/cors"), { origin: true });
  await app.register(require("@fastify/websocket"));

  app.get("/api/health", async () => ({
    ok: true,
    players: players.size,
    max: MAX_PLAYERS,
    world: publicMeta(world)
  }));

  app.get("/api/world", async () => publicMeta(world));

  app.get("/ws", { websocket: true }, (socket) => {
    let me = null;

    socket.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); }
      catch (e) { return; }
      if (!msg || typeof msg.t !== "string") return;

      if (msg.t === "join") {
        if (me) return;
        if (players.size >= MAX_PLAYERS) {
          send(socket, { t: "error", code: "full", message: "Server voll (5/5)" });
          socket.close();
          return;
        }
        const name = sanitizeName(msg.name);
        if (!name) {
          send(socket, { t: "error", code: "name", message: "Ungültiger Name" });
          return;
        }
        const slot = nextSlot();
        const spawn = spawnForSlot(world, slot);
        me = {
          id: nextId++,
          name,
          slot,
          color: COLORS[slot],
          x: 0,
          y: 0,
          tx: spawn.x,
          ty: spawn.y,
          dir: 2,
          moving: false,
          ws: socket
        };
        players.set(me.id, me);
        send(socket, {
          t: "welcome",
          player: publicPlayer(me),
          players: [...players.values()].filter((p) => p.id !== me.id).map(publicPlayer),
          world: publicMeta(world),
          max: MAX_PLAYERS
        });
        broadcast({ t: "join", player: publicPlayer(me) }, me.id);
        return;
      }

      if (!me) return;

      if (msg.t === "move") {
        const tx = msg.tx | 0, ty = msg.ty | 0;
        const manhattan = Math.abs(tx - me.tx) + Math.abs(ty - me.ty);
        if (manhattan > 4) return;
        if (!isWalkable(world, tx, ty)) return;
        me.tx = tx;
        me.ty = ty;
        me.x = msg.x | 0;
        me.y = msg.y | 0;
        me.dir = msg.dir & 3;
        me.moving = !!msg.moving;
        broadcast({ t: "move", player: publicPlayer(me) }, me.id);
        return;
      }

      if (msg.t === "say") {
        const text = String(msg.text || "").trim().slice(0, 80);
        if (!text) return;
        broadcast({ t: "say", id: me.id, name: me.name, text }, null);
        return;
      }

      if (msg.t === "emote") {
        const kind = String(msg.kind || "wave").slice(0, 16);
        broadcast({ t: "emote", id: me.id, name: me.name, kind }, null);
        return;
      }
    });

    socket.on("close", () => {
      if (me) leave(me.id, "disconnect");
    });

    socket.on("error", () => {
      if (me) leave(me.id, "error");
    });
  });

  const root = path.join(__dirname, "..");
  await app.register(require("@fastify/static"), {
    root,
    prefix: "/",
    index: ["index.html"]
  });

  app.decorate("hyrule", { world, players, MAX_PLAYERS });
  return app;
}

async function main() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const app = await buildServer({ logger: true });
  await app.listen({ port, host });
  app.log.info("Hyrule prototype at http://" + host + ":" + port + "/zelda/");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildServer, MAX_PLAYERS, COLORS };

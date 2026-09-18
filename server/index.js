/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Fastify + WebSocket backend for the Yoga Event Area.
 * Register/login, temple festivals, calendar, meet-ups and
 * private yogi chat — all live over WebSockets (max 5 online).
 */
"use strict";

const path = require("path");
const Fastify = require("fastify");
const { generateWorld, isWalkable, spawnForSlot, publicMeta } = require("../shared/world");
const Catalog = require("../shared/catalog");
const { createStore } = require("./store");

const MAX_PLAYERS = 5;
const COLORS = ["#c45c26", "#6b1d2a", "#2f6fbf", "#d4a017", "#2f8f3a"];
const NAME_RE = /^[\w äöüÄÖÜß'-]{1,16}$/;

function sanitizeName(name) {
  const n = String(name || "").trim();
  if (!NAME_RE.test(n)) return null;
  return n;
}

function publicPlayer(p) {
  return {
    id: p.id,
    accountId: p.accountId || 0,
    name: p.name,
    slot: p.slot,
    color: p.color,
    gender: p.gender || "male",
    asanas: p.asanas || [],
    focus: p.focus || "hatha",
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

function tokenOf(req) {
  const h = req.headers.authorization || "";
  if (h.slice(0, 7).toLowerCase() === "bearer ") return h.slice(7).trim();
  return req.headers["x-token"] || (req.body && req.body.token) || (req.query && req.query.token) || "";
}

async function buildServer(opts) {
  const options = opts || {};
  const app = Fastify({ logger: options.logger === true });
  const world = generateWorld(options.seed);
  const store = createStore({ dir: options.dataDir });
  store.ensureFestivals(world.temples || world.villages);
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

  function sendToAccount(accountId, msg) {
    for (const p of players.values()) {
      if (p.accountId === accountId) send(p.ws, msg);
    }
  }

  function leave(id, reason) {
    const p = players.get(id);
    if (!p) return;
    players.delete(id);
    broadcast({ t: "leave", id, reason: reason || "disconnect" });
  }

  function calendarPayload(accountId) {
    return store.festivals().map((f) => store.publicFestival(f, accountId));
  }

  function admit(socket, profile) {
    if (players.size >= MAX_PLAYERS) {
      send(socket, { t: "error", code: "full", message: "Ashram voll (5/5 Yogis online)" });
      socket.close();
      return null;
    }
    const name = sanitizeName(profile.name);
    if (!name) {
      send(socket, { t: "error", code: "name", message: "Ungültiger Name" });
      return null;
    }
    const slot = nextSlot();
    const spawn = spawnForSlot(world, slot);
    const me = {
      id: nextId++,
      accountId: profile.accountId || 0,
      name,
      slot,
      color: COLORS[slot],
      gender: profile.gender === "female" ? "female" : "male",
      asanas: profile.asanas || [],
      focus: profile.focus || "hatha",
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
      calendar: calendarPayload(me.accountId),
      catalog: { deities: Catalog.DEITIES, asanas: Catalog.ASANAS, foci: Catalog.FOCI },
      max: MAX_PLAYERS
    });
    broadcast({ t: "join", player: publicPlayer(me) }, me.id);
    return me;
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
  app.get("/api/catalog", async () => ({
    deities: Catalog.DEITIES, asanas: Catalog.ASANAS, foci: Catalog.FOCI
  }));

  app.post("/api/register", async (req, reply) => {
    const result = store.register(req.body || {});
    if (result.error) return reply.code(400).send(result);
    const token = store.createSession(result.account);
    return { token, account: result.account };
  });

  app.post("/api/login", async (req, reply) => {
    const body = req.body || {};
    const result = store.login(body.name, body.password);
    if (result.error) return reply.code(401).send(result);
    const token = store.createSession(result.account);
    return { token, account: result.account };
  });

  app.get("/api/me", async (req, reply) => {
    const acc = store.sessionAccount(tokenOf(req));
    if (!acc) return reply.code(401).send({ error: "Bitte anmelden." });
    return { account: store.publicAccount(acc) };
  });

  app.post("/api/profile", async (req, reply) => {
    const acc = store.sessionAccount(tokenOf(req));
    if (!acc) return reply.code(401).send({ error: "Bitte anmelden." });
    return store.updateProfile(acc.id, req.body || {});
  });

  app.get("/api/calendar", async (req) => {
    const acc = store.sessionAccount(tokenOf(req));
    return { festivals: calendarPayload(acc && acc.id) };
  });

  app.post("/api/festivals", async (req, reply) => {
    const acc = store.sessionAccount(tokenOf(req));
    if (!acc) return reply.code(401).send({ error: "Bitte anmelden." });
    const result = store.createFestival(acc.id, req.body || {}, world.temples);
    if (result.error) return reply.code(400).send(result);
    broadcast({ t: "calendar", festivals: calendarPayload(0) });
    return result;
  });

  app.post("/api/festivals/:id/join", async (req, reply) => {
    const acc = store.sessionAccount(tokenOf(req));
    if (!acc) return reply.code(401).send({ error: "Bitte anmelden." });
    const result = store.joinFestival(acc.id, req.params.id, req.body || {});
    if (result.error) return reply.code(400).send(result);
    broadcast({ t: "calendar", festivals: calendarPayload(0) });
    return result;
  });

  app.post("/api/festivals/:id/book", async (req, reply) => {
    const acc = store.sessionAccount(tokenOf(req));
    if (!acc) return reply.code(401).send({ error: "Bitte anmelden." });
    const result = store.bookSessions(acc.id, req.params.id, (req.body && req.body.booked) || []);
    if (result.error) return reply.code(400).send(result);
    return result;
  });

  app.get("/ws", { websocket: true }, (socket) => {
    let me = null;

    socket.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); }
      catch (e) { return; }
      if (!msg || typeof msg.t !== "string") return;

      if (msg.t === "auth") {
        if (me) return;
        const acc = store.sessionAccount(msg.token);
        if (!acc) {
          send(socket, { t: "error", code: "auth", message: "Sitzung ungültig — bitte neu anmelden." });
          return;
        }
        me = admit(socket, {
          accountId: acc.id,
          name: acc.name,
          gender: acc.gender,
          asanas: acc.asanas,
          focus: acc.focus
        });
        return;
      }

      if (msg.t === "join") {
        if (me) return;
        const gender = msg.gender === "female" ? "female" : "male";
        me = admit(socket, {
          name: msg.name,
          gender,
          asanas: Catalog.sanitizeAsanas(msg.asanas),
          focus: Catalog.sanitizeFocus(msg.focus)
        });
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
        const text = String(msg.text || "").trim().slice(0, 120);
        if (!text) return;
        broadcast({ t: "say", id: me.id, name: me.name, text }, null);
        return;
      }

      if (msg.t === "whisper") {
        const text = String(msg.text || "").trim().slice(0, 160);
        const to = msg.to | 0;
        if (!text || !players.has(to)) return;
        const row = store.addWhisper(me.id, to, text);
        const payload = { t: "whisper", from: me.id, to, name: me.name, text: row.text, at: row.at };
        send(players.get(to).ws, payload);
        send(socket, payload);
        return;
      }

      if (msg.t === "emote") {
        const kind = String(msg.kind || "namaste").slice(0, 16);
        broadcast({ t: "emote", id: me.id, name: me.name, kind }, null);
        return;
      }

      if (msg.t === "joinFestival") {
        if (!me.accountId) {
          send(socket, { t: "error", message: "Bitte registrieren, um Festivals zu buchen." });
          return;
        }
        const result = store.joinFestival(me.accountId, msg.festivalId, msg);
        if (result.error) { send(socket, { t: "error", message: result.error }); return; }
        send(socket, { t: "festival", festival: result.festival });
        broadcast({ t: "calendar", festivals: calendarPayload(0) });
        return;
      }

      if (msg.t === "book") {
        if (!me.accountId) return;
        const result = store.bookSessions(me.accountId, msg.festivalId, msg.booked || []);
        if (result.error) { send(socket, { t: "error", message: result.error }); return; }
        send(socket, { t: "festival", festival: result.festival });
        return;
      }

      if (msg.t === "meetup") {
        const to = msg.to | 0;
        if (!players.has(to)) return;
        const row = store.addMeetup(me.id, to, String(msg.festivalId || ""));
        send(players.get(to).ws, {
          t: "meetup",
          id: row.id,
          from: me.id,
          name: me.name,
          festivalId: row.festivalId
        });
        send(socket, { t: "meetupSent", id: row.id, to, festivalId: row.festivalId });
        return;
      }

      if (msg.t === "meetupAnswer") {
        const result = store.answerMeetup(msg.id | 0, me.id, !!msg.accept);
        if (result.error) return;
        const other = players.get(result.meetup.from);
        const payload = { t: "meetupResult", meetup: result.meetup, name: me.name };
        send(socket, payload);
        if (other) send(other.ws, payload);
        return;
      }
    });

    socket.on("close", () => { if (me) leave(me.id, "disconnect"); });
    socket.on("error", () => { if (me) leave(me.id, "error"); });
  });

  const root = path.join(__dirname, "..");
  await app.register(require("@fastify/static"), {
    root,
    prefix: "/",
    index: ["index.html"]
  });

  app.decorate("hyrule", { world, players, MAX_PLAYERS, store });
  return app;
}

async function main() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const app = await buildServer({ logger: true });
  await app.listen({ port, host });
  app.log.info("Yoga Event Area at http://" + host + ":" + port + "/zelda/");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildServer, MAX_PLAYERS, COLORS };

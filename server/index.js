/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Fastify + WebSocket backend for the Yoga Event Area.
 * Yoga-website accounts only. Temple festivals, calendar, meet-ups
 * and private yogi chat live over WebSockets (max 5 online).
 */
"use strict";

const path = require("path");
const Fastify = require("fastify");
const { generateWorld, isWalkable, spawnForSlot, publicMeta } = require("../shared/world");
const { createPopulation, stepAll, publicNpc, replyLine } = require("../shared/npcs");
const Catalog = require("../shared/catalog");
const { createStore } = require("./store");

const MAX_PLAYERS = 5;
const COLORS = ["#d4a574", "#5c8a55", "#c8965f", "#3d6b45", "#e0c9a0"];
const NAME_RE = /^[\w äöüÄÖÜß'.-]{1,50}$/;

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
  const ashram = createPopulation(world);
  let markers = [];

  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function spotFor(key, used) {
    const h = hash32(String(key));
    for (let i = 0; i < 60; i++) {
      const x = 4 + ((h + i * 97) % (world.size - 8));
      const y = 4 + (((Math.imul(h, 13) >>> 0) + i * 57) % (world.size - 8));
      const id = x + "," + y;
      if (used.has(id) || !isWalkable(world, x, y)) continue;
      used.add(id);
      return { x, y };
    }
    return { x: world.spawn.x + 2, y: world.spawn.y + 2 };
  }

  async function refreshMarkers() {
    const videos = [];
    const courses = [];
    const yogaBase = (process.env.YOGA_API_BASE || "http://yoga:8001").replace(/\/$/, "");
    const tadmin = (process.env.TADMIN_API_BASE || "http://tadmin:8000").replace(/\/$/, "");
    try {
      const res = await fetch(yogaBase + "/api/v1/yoga/courses-feed?limit=16");
      if (res.ok) {
        const rows = await res.json();
        for (let i = 0; i < rows.length && courses.length < 8; i++) {
          const row = rows[i];
          if (!row || !row.title) continue;
          courses.push({
            id: "course-" + (row.id || i),
            title: String(row.title).slice(0, 80),
            when: row.starts_at || row.startsAt || "",
            where: row.location || "",
            text: row.description || ""
          });
        }
      }
    } catch (err) { /* yoga feed optional */ }
    try {
      const url = tadmin + "/api/v1/youtube-playlist/?playlist_id=PLWbqZmfWsGrdBQgc9y2KnxbW36lmCnvfB&max_results=8";
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json();
        const list = body.videos || body.results || body || [];
        const rows = Array.isArray(list) ? list : [];
        for (let i = 0; i < rows.length && videos.length < 8; i++) {
          const row = rows[i];
          const videoId = row.videoId || row.video_id || row.id;
          if (!videoId || String(videoId).length > 20) continue;
          videos.push({
            id: "video-" + videoId,
            videoId: String(videoId),
            title: String(row.title || "Yoga-Video").slice(0, 80)
          });
        }
      }
    } catch (err) { /* playlist optional */ }
    const used = new Set();
    const next = [];
    for (let i = 0; i < videos.length; i++) {
      const at = spotFor(videos[i].id, used);
      next.push({ kind: "video", tx: at.x, ty: at.y, id: videos[i].id, videoId: videos[i].videoId, title: videos[i].title });
    }
    for (let i = 0; i < courses.length; i++) {
      const at = spotFor(courses[i].id, used);
      next.push({
        kind: "event",
        tx: at.x,
        ty: at.y,
        id: courses[i].id,
        title: courses[i].title,
        when: courses[i].when,
        where: courses[i].where,
        text: courses[i].text
      });
    }
    markers = next;
    broadcast({ t: "markers", markers });
  }

  async function pullPosition(yogaUserId) {
    const secret = process.env.INTERNAL_API_SECRET || "";
    const base = (process.env.YOGA_API_BASE || "").replace(/\/$/, "");
    if (!secret || !base || !yogaUserId) return null;
    try {
      const res = await fetch(base + "/api/v1/yoga/ashram-position/" + yogaUserId, {
        headers: { "X-Internal-Secret": secret }
      });
      if (!res.ok) return null;
      const body = await res.json();
      if (!body || !Number.isFinite(body.tx)) return null;
      return { x: body.tx | 0, y: body.ty | 0, dir: body.dir & 3 };
    } catch (err) {
      return null;
    }
  }

  function pushPosition(yogaUserId, tx, ty, dir) {
    const secret = process.env.INTERNAL_API_SECRET || "";
    const base = (process.env.YOGA_API_BASE || "").replace(/\/$/, "");
    if (!secret || !base || !yogaUserId) return;
    fetch(base + "/api/v1/yoga/ashram-position", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": secret },
      body: JSON.stringify({ user_id: yogaUserId, tx, ty, dir })
    }).catch(() => {});
  }

  function remember(me) {
    if (!me || !me.accountId) return;
    store.savePosition(me.accountId, me.tx, me.ty, me.dir);
    const acc = store.accountById(me.accountId);
    if (acc && acc.yogaUserId) pushPosition(acc.yogaUserId, me.tx, me.ty, me.dir);
  }

  function npcSnapshot() {
    return ashram.npcs.map(publicNpc);
  }

  function tickNpcs() {
    const nearby = [];
    for (const p of players.values()) nearby.push({ tx: p.tx, ty: p.ty });
    const says = stepAll(ashram, world, nearby, Date.now());
    broadcast({ t: "npcs", npcs: npcSnapshot() });
    for (let i = 0; i < says.length; i++) {
      broadcast({ t: "say", id: says[i].id, name: says[i].name, text: says[i].text, npc: true });
    }
  }
  const npcTimer = setInterval(tickNpcs, 420);
  const markerTimer = setInterval(() => { refreshMarkers().catch(() => {}); }, 120000);
  if (typeof markerTimer.unref === "function") markerTimer.unref();
  refreshMarkers().catch(() => {});
  if (typeof npcTimer.unref === "function") npcTimer.unref();

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
    const saved = store.savedPosition(profile.accountId);
    const spawn = saved && isWalkable(world, saved.x, saved.y)
      ? saved
      : Object.assign(spawnForSlot(world, slot), { dir: 2 });
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
      dir: spawn.dir == null ? 2 : spawn.dir & 3,
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
      max: MAX_PLAYERS,
      npcs: npcSnapshot(),
      markers
    });
    broadcast({ t: "join", player: publicPlayer(me) }, me.id);
    return me;
  }

  await app.register(require("@fastify/cors"), { origin: true });
  await app.register(require("@fastify/websocket"));

  app.get("/api/health", async () => ({
    ok: true,
    players: players.size,
    npcs: ashram.npcs.length,
    max: MAX_PLAYERS,
    world: publicMeta(world)
  }));

  app.get("/api/world", async () => publicMeta(world));
  app.get("/api/catalog", async () => ({
    deities: Catalog.DEITIES, asanas: Catalog.ASANAS, foci: Catalog.FOCI
  }));

  app.post("/api/yoga-login", async (req, reply) => {
    const auth = req.headers.authorization || "";
    if (!/^Basic\s+\S+/i.test(auth)) {
      return reply.code(401).send({ error: "Bitte mit dem Yoga-Website-Konto anmelden." });
    }
    const base = (process.env.YOGA_API_BASE || "http://yoga:8001").replace(/\/$/, "");
    let user;
    try {
      const res = await fetch(base + "/api/v1/auth/me", { headers: { Authorization: auth } });
      if (res.status === 401) {
        return reply.code(401).send({ error: "Yoga-Name oder Passwort stimmt nicht." });
      }
      if (!res.ok) {
        return reply.code(502).send({ error: "Yoga-Anmeldung gerade nicht erreichbar." });
      }
      user = await res.json();
    } catch (err) {
      return reply.code(502).send({ error: "Yoga-Anmeldung gerade nicht erreichbar." });
    }
    if (user.ashram_enabled === false) {
      return reply.code(403).send({
        error: "Dieses Konto ist nicht für das Ashram-Spiel freigeschaltet. Das geht in der Yogi-Verwaltung."
      });
    }
    const account = store.upsertYogaAccount(user);
    if (!account) return reply.code(400).send({ error: "Ungültiger Yoginame." });
    const token = store.createSession(account);
    return { token, account: store.publicAccount(account) };
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
        pullPosition(acc.yogaUserId).then((remote) => {
          if (remote && isWalkable(world, remote.x, remote.y)) {
            store.savePosition(acc.id, remote.x, remote.y, remote.dir);
          }
          if (me) return;
          me = admit(socket, {
            accountId: acc.id,
            name: acc.name,
            gender: acc.gender,
            asanas: acc.asanas,
            focus: acc.focus
          });
        });
        return;
      }

      if (!me) {
        send(socket, { t: "error", code: "auth", message: "Bitte mit dem Yoga-Website-Konto anmelden." });
        return;
      }

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
        remember(me);
        return;
      }

      if (msg.t === "say") {
        const text = String(msg.text || "").trim().slice(0, 120);
        if (!text) return;
        broadcast({ t: "say", id: me.id, name: me.name, text }, null);
        let nearest = null;
        let best = 6;
        for (let i = 0; i < ashram.npcs.length; i++) {
          const n = ashram.npcs[i];
          const dist = Math.abs(n.tx - me.tx) + Math.abs(n.ty - me.ty);
          if (dist < best) { best = dist; nearest = n; }
        }
        if (nearest) {
          broadcast({
            t: "say",
            id: nearest.id,
            name: nearest.name,
            text: replyLine(text, nearest.tx + nearest.ty),
            npc: true
          });
        }
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

    socket.on("close", () => { if (me) { remember(me); leave(me.id, "disconnect"); } });
    socket.on("error", () => { if (me) leave(me.id, "error"); });
  });

  const root = path.join(__dirname, "..");
  const staticFiles = require("@fastify/static");
  await app.register(staticFiles, {
    root: path.join(root, "js"),
    prefix: "/ashram/engine/",
    decorateReply: false
  });
  await app.register(staticFiles, {
    root: path.join(root, "shared"),
    prefix: "/ashram/shared/",
    decorateReply: false
  });
  await app.register(staticFiles, {
    root,
    prefix: "/",
    index: ["index.html"],
    decorateReply: false
  });

  app.decorate("hyrule", { world, players, MAX_PLAYERS, store });
  return app;
}

async function main() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "0.0.0.0";
  const app = await buildServer({
    logger: true,
    dataDir: process.env.DATA_DIR || undefined
  });
  await app.listen({ port, host });
  app.log.info("Yoga Event Area at http://" + host + ":" + port + "/ashram/");
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildServer, MAX_PLAYERS, COLORS };

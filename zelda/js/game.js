/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Hyrule client: login, WebSocket sync, keyboard + touch, fixed-timestep
 * loop (same 40 ms cadence as PushBox).
 */
"use strict";

const Hyrule = {
  canvas: null,
  engine: null,
  ws: null,
  assets: null,
  world: null,
  joined: false,
  lastSent: { tx: -1, ty: -1, dir: -1, moving: false, at: 0 },
  nearby: new Set()
};

function qs(id) { return document.getElementById(id); }

function fitView() {
  const hud = 0;
  const w = window.innerWidth;
  const h = window.innerHeight - hud;
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.max(2, Math.min(4, Math.round(dpr + (w < 700 ? 1 : 0))));
  const viewW = Math.max(240, Math.floor(w / scale));
  const viewH = Math.max(180, Math.floor(h / scale));
  if (Hyrule.engine) Hyrule.engine.resize(viewW, viewH);
  const screen = qs("screen");
  screen.style.width = w + "px";
  screen.style.height = h + "px";
}

function appendChat(line, cls) {
  const box = qs("chat-log");
  const p = document.createElement("p");
  if (cls) p.className = cls;
  p.textContent = line;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
  while (box.childElementCount > 40) box.removeChild(box.firstChild);
}

function setStatus(text) {
  qs("status").textContent = text;
}

function updateHud() {
  const e = Hyrule.engine;
  if (!e || !e.player) return;
  qs("hud-pos").textContent = e.player.tileX + "," + e.player.tileY;
  qs("hud-online").textContent = (1 + e.remotes.size) + "/5";
  let village = "Wildnis";
  if (e.world) {
    for (let i = 0; i < e.world.villages.length; i++) {
      const v = e.world.villages[i];
      if (Math.abs(v.x - e.player.tileX) < 16 && Math.abs(v.y - e.player.tileY) < 16) {
        village = v.name;
        break;
      }
    }
  }
  qs("hud-place").textContent = village;

  const next = new Set();
  for (const r of e.remotes.values()) {
    if (Math.abs(r.tileX - e.player.tileX) + Math.abs(r.tileY - e.player.tileY) <= 3) {
      next.add(r.pid);
      if (!Hyrule.nearby.has(r.pid)) {
        appendChat(r.name + " ist in der Nähe.", "sys");
      }
    }
  }
  Hyrule.nearby = next;
}

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return proto + "//" + location.host + "/ws";
}

function send(msg) {
  if (Hyrule.ws && Hyrule.ws.readyState === 1) Hyrule.ws.send(JSON.stringify(msg));
}

function maybeSendMove(force) {
  const p = Hyrule.engine && Hyrule.engine.player;
  if (!p || !Hyrule.joined) return;
  const moving = p.state === Sprite.STATE_MOVING;
  const now = Date.now();
  const changed = p.tileX !== Hyrule.lastSent.tx || p.tileY !== Hyrule.lastSent.ty ||
    p.dir !== Hyrule.lastSent.dir || moving !== Hyrule.lastSent.moving;
  if (!force && !changed && now - Hyrule.lastSent.at < 80) return;
  if (!changed && now - Hyrule.lastSent.at < 120) return;
  Hyrule.lastSent = { tx: p.tileX, ty: p.tileY, dir: p.dir, moving, at: now };
  send({ t: "move", tx: p.tileX, ty: p.tileY, x: p.x | 0, y: p.y | 0, dir: p.dir, moving });
}

function onMessage(msg) {
  const e = Hyrule.engine;
  switch (msg.t) {
    case "welcome":
      Hyrule.world = ZeldaWorld.generateWorld(msg.world.seed, msg.world.size);
      e.loadWorld(Hyrule.world, Hyrule.assets);
      e.spawnLocal(msg.player);
      for (let i = 0; i < msg.players.length; i++) e.upsertRemote(msg.players[i]);
      e.state = ZeldaCanvas.STATE_GAME;
      Hyrule.joined = true;
      qs("login").classList.add("hidden");
      qs("hud").classList.remove("hidden");
      qs("pad").classList.remove("hidden");
      qs("chat").classList.remove("hidden");
      setStatus(msg.player.name + " betritt Hateno");
      appendChat("Willkommen in Hyrule, " + msg.player.name + ".", "sys");
      appendChat("Pfeile / WASD oder Steuerkreuz. E oder Aktionstaste: winken.", "sys");
      maybeSendMove(true);
      updateHud();
      break;
    case "join":
      e.upsertRemote(msg.player);
      appendChat(msg.player.name + " ist beigetreten.", "sys");
      updateHud();
      break;
    case "leave":
      e.removeRemote(msg.id);
      appendChat("Ein Held hat die Welt verlassen.", "sys");
      updateHud();
      break;
    case "move":
      e.upsertRemote(msg.player);
      break;
    case "say":
      appendChat(msg.name + ": " + msg.text);
      break;
    case "emote": {
      const icon = msg.kind === "wave" ? "👋" : "!";
      e.emotes.set(msg.id, { icon, until: Date.now() + 1800 });
      appendChat(msg.name + " winkt.", "sys");
      break;
    }
    case "error":
      qs("login-error").textContent = msg.message || "Fehler";
      setStatus(msg.message || "Fehler");
      break;
  }
}

function connect(name) {
  setStatus("Verbinde…");
  qs("login-error").textContent = "";
  const ws = new WebSocket(wsUrl());
  Hyrule.ws = ws;
  ws.onopen = () => send({ t: "join", name });
  ws.onmessage = (ev) => {
    try { onMessage(JSON.parse(ev.data)); }
    catch (err) { console.error(err); }
  };
  ws.onclose = () => {
    if (Hyrule.joined) {
      appendChat("Verbindung getrennt.", "sys");
      setStatus("Getrennt");
    } else if (!qs("login-error").textContent) {
      qs("login-error").textContent = "Keine Verbindung zum Server.";
    }
  };
  ws.onerror = () => {
    qs("login-error").textContent = "WebSocket-Fehler.";
  };
}

function wireInput() {
  const e = Hyrule.engine;
  const held = Object.create(null);
  window.addEventListener("keydown", (ev) => {
    if (ev.target && ev.target.tagName === "INPUT") return;
    if (e.getGameAction(ev.key) !== 0) ev.preventDefault();
    if (held[ev.key]) return;
    held[ev.key] = true;
    e.keyPressed(ev.key);
    if (ev.key === "e" || ev.key === "E") send({ t: "emote", kind: "wave" });
  });
  window.addEventListener("keyup", (ev) => {
    held[ev.key] = false;
    e.keyReleased(ev.key);
  });

  function bindPad(id, dir) {
    const el = qs(id);
    const start = (ev) => { ev.preventDefault(); e.holdDir(dir, true); };
    const end = (ev) => { ev.preventDefault(); e.holdDir(dir, false); };
    el.addEventListener("touchstart", start, { passive: false });
    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("touchcancel", end, { passive: false });
    el.addEventListener("mousedown", start);
    window.addEventListener("mouseup", end);
  }
  bindPad("pad-up", "up");
  bindPad("pad-down", "down");
  bindPad("pad-left", "left");
  bindPad("pad-right", "right");

  qs("pad-act").addEventListener("touchstart", (ev) => {
    ev.preventDefault();
    send({ t: "emote", kind: "wave" });
  }, { passive: false });
  qs("pad-act").addEventListener("click", () => send({ t: "emote", kind: "wave" }));

  qs("chat-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = qs("chat-input");
    const text = input.value.trim();
    if (!text) return;
    send({ t: "say", text });
    input.value = "";
  });
}

function startLoop() {
  const e = Hyrule.engine;
  let last = 0, acc = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (last === 0) last = now;
    acc += now - last;
    last = now;
    if (acc > 500) acc = 500;
    while (acc >= e.frame_time) {
      e.step();
      acc -= e.frame_time;
    }
    e.paint();
    maybeSendMove(false);
    if ((e.tick & 7) === 0) updateHud();
  };
  requestAnimationFrame(frame);
}

function boot() {
  const screen = qs("screen");
  Hyrule.engine = new ZeldaCanvas(screen);
  Hyrule.assets = buildHyruleAssets();
  Hyrule.engine.assets = Hyrule.assets;
  fitView();
  window.addEventListener("resize", fitView);
  window.addEventListener("orientationchange", () => setTimeout(fitView, 200));
  wireInput();
  startLoop();

  qs("join-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const name = qs("name").value.trim();
    if (!name) {
      qs("login-error").textContent = "Bitte einen Namen eingeben.";
      return;
    }
    connect(name);
  });

  fetch("/api/health").then((r) => r.json()).then((info) => {
    qs("server-meta").textContent =
      "Welt " + info.world.size + "×" + info.world.size +
      " · " + info.players + "/" + info.max + " online · " +
      info.world.stats.houses + " Häuser · " + info.world.stats.trees + " Bäume · " +
      info.world.stats.bridges + " Brücken";
  }).catch(() => {
    qs("server-meta").textContent = "Server nicht erreichbar — bitte npm start.";
  });
}

window.addEventListener("load", boot);

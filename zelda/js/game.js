/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Yoga Event Area client: register/login, temple festivals, overlay
 * calendar, meet-ups, and click-to-whisper — all over WebSockets.
 */
"use strict";

const Hyrule = {
  canvas: null,
  engine: null,
  ws: null,
  assets: null,
  world: null,
  joined: false,
  token: "",
  account: null,
  calendar: [],
  catalog: { deities: [], asanas: [], foci: [] },
  whisperTo: null,
  lastSent: { tx: -1, ty: -1, dir: -1, moving: false, at: 0 },
  nearby: new Set()
};

function qs(id) { return document.getElementById(id); }

function fitView() {
  const vv = window.visualViewport;
  const w = Math.round(vv ? vv.width : window.innerWidth);
  const h = Math.round(vv ? vv.height : window.innerHeight);
  const overlap = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
  document.documentElement.style.setProperty("--kb", overlap + "px");
  document.body.classList.toggle("keyboard", overlap > 80);
  const dpr = window.devicePixelRatio || 1;
  const scale = w < 700 ? Math.max(2, Math.min(3, Math.round(dpr))) : Math.max(2, Math.min(3, Math.round(dpr)));
  const viewW = Math.max(200, Math.floor(w / scale));
  const viewH = Math.max(160, Math.floor(h / scale));
  if (Hyrule.engine) {
    Hyrule.engine.resize(viewW, viewH);
    const hud = qs("hud");
    const hudPx = hud && !hud.classList.contains("hidden") ? hud.getBoundingClientRect().height : 0;
    Hyrule.engine.uiTop = Math.ceil((hudPx * viewH) / Math.max(1, h)) + 2;
  }
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

function appendWhisper(line, cls) {
  const box = qs("whisper-log");
  const p = document.createElement("p");
  if (cls) p.className = cls;
  p.textContent = line;
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

function setStatus(text) { qs("status").textContent = text; }

function deityName(id) {
  const d = (Hyrule.catalog.deities || []).find((x) => x.id === id);
  return d ? d.name : id;
}

function asanaName(id) {
  const a = (Hyrule.catalog.asanas || YogaCatalog.ASANAS).find((x) => x.id === id);
  return a ? a.name : id;
}

function focusName(id) {
  const f = (Hyrule.catalog.foci || YogaCatalog.FOCI).find((x) => x.id === id);
  return f ? f.name : id;
}

function templeAtPlayer() {
  const e = Hyrule.engine;
  if (!e || !e.world || !e.player) return null;
  const list = e.world.temples || e.world.villages || [];
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (Math.abs(v.x - e.player.tileX) < 16 && Math.abs(v.y - e.player.tileY) < 16) return v;
  }
  return null;
}

function updateHud() {
  const e = Hyrule.engine;
  if (!e || !e.player) return;
  qs("hud-pos").textContent = e.player.tileX + "," + e.player.tileY;
  qs("hud-online").textContent = (1 + e.remotes.size) + "/5";
  const here = templeAtPlayer();
  qs("hud-place").textContent = here
    ? here.name + (here.deity ? " · " + deityName(here.deity) : "")
    : "Pfad";

  const next = new Set();
  for (const r of [...e.remotes.values(), ...e.npcs.values()]) {
    if (Math.abs(r.tileX - e.player.tileX) + Math.abs(r.tileY - e.player.tileY) <= 3) {
      next.add(r.pid);
      if (!Hyrule.nearby.has(r.pid)) appendChat(r.name + " ist in der Nähe — antippen zum Chatten.", "sys");
    }
  }
  Hyrule.nearby = next;
}

function apiBase() {
  const path = location.pathname;
  const at = path.indexOf("/zelda");
  return at > 0 ? path.slice(0, at).replace(/\/$/, "") : "";
}

function api(path) {
  return apiBase() + path;
}

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return proto + "//" + location.host + apiBase() + "/ws";
}

function send(msg) {
  if (Hyrule.ws && Hyrule.ws.readyState === 1) Hyrule.ws.send(JSON.stringify(msg));
}

function authHeaders() {
  return Hyrule.token ? { "Content-Type": "application/json", Authorization: "Bearer " + Hyrule.token } : { "Content-Type": "application/json" };
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

function showPanel(name, title) {
  qs("overlay").classList.remove("hidden");
  qs("sheet-title").textContent = title || name;
  ["calendar", "festival", "meet", "profile", "whisper"].forEach((id) => {
    qs("panel-" + id).classList.toggle("hidden", id !== name);
  });
}

function hideOverlay() { qs("overlay").classList.add("hidden"); }

function renderCalendar() {
  const box = qs("panel-calendar");
  const rows = Hyrule.calendar.slice().sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  box.innerHTML = rows.length ? "" : "<p>Noch keine Festivals.</p>";
  rows.forEach((f) => {
    const el = document.createElement("article");
    el.className = "fest-card";
    el.innerHTML = "<h3>" + f.title + "</h3><p>" + f.templeName + " · " + deityName(f.deity) +
      "</p><p>" + String(f.startsAt).slice(0, 16).replace("T", " ") + " · " + f.going + " Yogis</p>";
    const go = document.createElement("button");
    go.textContent = "Details & buchen";
    go.addEventListener("click", () => openFestival(f.id));
    el.appendChild(go);
    box.appendChild(el);
  });
}

function openFestival(id) {
  const f = Hyrule.calendar.find((x) => x.id === id);
  if (!f) return;
  const box = qs("panel-festival");
  const mine = f.mine || { asanas: (Hyrule.account && Hyrule.account.asanas) || [], focus: (Hyrule.account && Hyrule.account.focus) || "hatha", booked: [] };
  const asanaOpts = (Hyrule.catalog.asanas || YogaCatalog.ASANAS).map((a) => {
    const on = mine.asanas.indexOf(a.id) >= 0;
    return "<label class='chip'><input type='checkbox' name='asana' value='" + a.id + "'" + (on ? " checked" : "") + "/> " + a.name + "</label>";
  }).join("");
  const focusOpts = (Hyrule.catalog.foci || YogaCatalog.FOCI).map((fo) =>
    "<option value='" + fo.id + "'" + (mine.focus === fo.id ? " selected" : "") + ">" + fo.name + "</option>").join("");
  const sess = (f.sessions || []).map((s) => {
    const on = (mine.booked || []).indexOf(s.id) >= 0;
    return "<label class='chip'><input type='checkbox' name='sess' value='" + s.id + "'" + (on ? " checked" : "") + "/> " +
      s.time + " " + s.title + "</label>";
  }).join("");
  box.innerHTML = "<article class='fest-card'><h3>" + f.title + "</h3><p>Tempel: " + f.templeName +
    " · Devata: " + deityName(f.deity) + "</p><p class='meta'>Schwerpunkt für dieses Festival</p><select id='fest-focus'>" +
    focusOpts + "</select><p class='meta'>Lieblingsasanas</p><div class='checks' id='fest-asanas'>" + asanaOpts +
    "</div><p class='meta'>Veranstaltungen buchen</p><div class='checks'>" + sess +
    "</div><div class='row' style='margin-top:10px'><button type='button' id='fest-join'>Eintragen</button>" +
    "<button type='button' id='fest-book'>Buchung speichern</button></div></article>";
  showPanel("festival", "Festival");
  qs("fest-join").onclick = () => {
    const asanas = [...box.querySelectorAll("input[name=asana]:checked")].map((i) => i.value);
    send({ t: "joinFestival", festivalId: f.id, asanas, focus: qs("fest-focus").value });
  };
  qs("fest-book").onclick = () => {
    const booked = [...box.querySelectorAll("input[name=sess]:checked")].map((i) => i.value);
    const asanas = [...box.querySelectorAll("input[name=asana]:checked")].map((i) => i.value);
    send({ t: "joinFestival", festivalId: f.id, asanas, focus: qs("fest-focus").value, booked });
    send({ t: "book", festivalId: f.id, booked });
  };
}

function renderMeet() {
  const box = qs("panel-meet");
  const yogis = [...Hyrule.engine.remotes.values()];
  const fests = Hyrule.calendar;
  if (!yogis.length) {
    box.innerHTML = "<p>Gerade ist niemand sonst online. Sobald ein Yogi wandert, kannst du ihn einladen.</p>";
    return;
  }
  box.innerHTML = "<p>Verabrede dich und geht gemeinsam zu einem Festival.</p>";
  yogis.forEach((y) => {
    const el = document.createElement("article");
    el.className = "yogi-card";
    el.innerHTML = "<h3>" + y.name + "</h3><p>" + (y.gender === "female" ? "Yogini" : "Yogi") +
      " · " + focusName(y.focus) + "</p>";
    const sel = document.createElement("select");
    fests.forEach((f) => {
      const o = document.createElement("option");
      o.value = f.id;
      o.textContent = f.title;
      sel.appendChild(o);
    });
    const btn = document.createElement("button");
    btn.textContent = "Zum Festival einladen";
    btn.onclick = () => send({ t: "meetup", to: y.pid, festivalId: sel.value });
    const chat = document.createElement("button");
    chat.textContent = "Chatten";
    chat.onclick = () => openWhisper(y);
    el.appendChild(sel);
    el.appendChild(btn);
    el.appendChild(chat);
    box.appendChild(el);
  });
}

function renderProfile() {
  const box = qs("panel-profile");
  const acc = Hyrule.account || {};
  box.innerHTML = "<p><strong>" + (acc.name || (Hyrule.engine.player && Hyrule.engine.player.name) || "Gast") +
    "</strong> · " + (acc.gender === "female" ? "Yogini" : "Yogi") + "</p><p>Schwerpunkt: " +
    focusName(acc.focus) + "</p><p>Asanas: " + (acc.asanas || []).map(asanaName).join(", ") + "</p>" +
    "<p class='meta'>Gast-Wanderer können sich registrieren, um Festivals verbindlich zu buchen.</p>";
}

function openWhisper(yogi) {
  Hyrule.whisperTo = yogi.pid || yogi.id;
  qs("whisper-meta").textContent = "Privat mit " + (yogi.name || "Yogi") +
    (yogi.focus ? " · " + focusName(yogi.focus) : "");
  showPanel("whisper", "Chat · " + (yogi.name || ""));
}

function enterWorld() {
  qs("login").classList.add("hidden");
  qs("hud").classList.remove("hidden");
  qs("pad").classList.remove("hidden");
  fitView();
  qs("chat").classList.remove("hidden");
}

function onMessage(msg) {
  const e = Hyrule.engine;
  switch (msg.t) {
    case "welcome":
      Hyrule.world = ZeldaWorld.generateWorld(msg.world.seed, msg.world.size);
      Hyrule.calendar = msg.calendar || [];
      Hyrule.catalog = msg.catalog || Hyrule.catalog;
      e.loadWorld(Hyrule.world, Hyrule.assets);
      e.spawnLocal(msg.player);
      for (let i = 0; i < msg.players.length; i++) e.upsertRemote(msg.players[i]);
      const residents = msg.npcs || [];
      for (let i = 0; i < residents.length; i++) e.upsertNpc(residents[i]);
      e.state = ZeldaCanvas.STATE_GAME;
      Hyrule.joined = true;
      enterWorld();
      setStatus(msg.player.name + " betritt den Ashram");
      appendChat("Namaste, " + msg.player.name + ". Im Ashram üben " + (msg.npcs || []).length + " Yogis, jeder auf seine Art.", "sys");
      maybeSendMove(true);
      updateHud();
      break;
    case "join":
      e.upsertRemote(msg.player);
      appendChat(msg.player.name + " ist angekommen.", "sys");
      updateHud();
      break;
    case "leave":
      e.removeRemote(msg.id);
      appendChat("Ein Yogi hat den Pfad verlassen.", "sys");
      if (Hyrule.whisperTo === msg.id) appendWhisper("(offline)", "sys");
      updateHud();
      break;
    case "move":
      e.upsertRemote(msg.player);
      break;
    case "npcs":
      for (let i = 0; i < (msg.npcs || []).length; i++) e.upsertNpc(msg.npcs[i]);
      break;
    case "say":
      appendChat(msg.name + ": " + msg.text);
      break;
    case "whisper":
      if (Hyrule.whisperTo !== msg.from && Hyrule.whisperTo !== msg.to) {
        const other = msg.from === e.localId ? msg.to : msg.from;
        const remote = e.remotes.get(other) || { pid: other, name: msg.name };
        openWhisper(remote);
      }
      appendWhisper((msg.from === e.localId ? "Ich" : msg.name) + ": " + msg.text);
      appendChat("[privat] " + msg.name + ": " + msg.text, "sys");
      break;
    case "emote": {
      const icon = msg.kind === "namaste" || msg.kind === "wave" ? "🙏" : "!";
      e.emotes.set(msg.id, { icon, until: Date.now() + 1800 });
      appendChat(msg.name + " grüßt mit Namaste.", "sys");
      break;
    }
    case "calendar":
      Hyrule.calendar = msg.festivals || Hyrule.calendar;
      if (!qs("panel-calendar").classList.contains("hidden")) renderCalendar();
      break;
    case "festival":
      Hyrule.calendar = Hyrule.calendar.map((f) => f.id === msg.festival.id ? msg.festival : f);
      if (!Hyrule.calendar.some((f) => f.id === msg.festival.id)) Hyrule.calendar.push(msg.festival);
      appendChat("Festival aktualisiert: " + msg.festival.title, "sys");
      openFestival(msg.festival.id);
      break;
    case "meetup":
      appendChat(msg.name + " lädt dich zu einem Festival ein.", "sys");
      if (window.confirm(msg.name + " möchte mit dir zu einem Festival gehen. Annehmen?")) {
        send({ t: "meetupAnswer", id: msg.id, accept: true });
      } else {
        send({ t: "meetupAnswer", id: msg.id, accept: false });
      }
      break;
    case "meetupSent":
      appendChat("Einladung gesendet.", "sys");
      break;
    case "meetupResult":
      appendChat(msg.meetup.status === "accepted"
        ? (msg.name + " hat das Treffen angenommen. Geht gemeinsam zum Festival!")
        : (msg.name + " hat abgesagt."), "sys");
      break;
    case "error":
      if (qs("login-error")) qs("login-error").textContent = msg.message || "Fehler";
      setStatus(msg.message || "Fehler");
      appendChat(msg.message || "Fehler", "sys");
      break;
  }
}

function connectAfterAuth(token) {
  Hyrule.token = token;
  try { localStorage.setItem("yogaToken", token); } catch (e) { /* ignore */ }
  setStatus("Verbinde…");
  qs("login-error").textContent = "";
  const ws = new WebSocket(wsUrl());
  Hyrule.ws = ws;
  ws.onopen = () => send({ t: "auth", token });
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
  ws.onerror = () => { qs("login-error").textContent = "WebSocket-Fehler."; };
}

function basicHeader(name, password) {
  const raw = name + ":" + password;
  const bytes = new TextEncoder().encode(raw);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return "Basic " + btoa(bin);
}

async function enterWithBasic(basic) {
  const res = await fetch(api("/api/yoga-login"), {
    method: "POST",
    headers: { Authorization: basic }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    qs("login-error").textContent = data.error || "Anmeldung fehlgeschlagen";
    return false;
  }
  Hyrule.account = data.account;
  connectAfterAuth(data.token);
  return true;
}

function tryStoredYogaLogin() {
  let creds = "";
  try { creds = sessionStorage.getItem("yoga_credentials") || ""; } catch (e) { creds = ""; }
  if (!creds) return;
  qs("login-error").textContent = "Yoga-Konto wird übernommen…";
  enterWithBasic("Basic " + creds).catch(() => {
    qs("login-error").textContent = "Server nicht erreichbar.";
  });
}

function wireAuth() {
  qs("login-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    qs("login-error").textContent = "";
    try {
      const ok = await enterWithBasic(basicHeader(qs("login-name").value.trim(), qs("login-pass").value));
      if (ok) {
        try {
          sessionStorage.setItem("yoga_credentials", basicHeader(qs("login-name").value.trim(), qs("login-pass").value).slice(6));
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      qs("login-error").textContent = "Server nicht erreichbar.";
    }
  });
}

function wireInput() {
  const e = Hyrule.engine;
  const held = Object.create(null);
  window.addEventListener("keydown", (ev) => {
    const tag = ev.target && ev.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.getGameAction(ev.key) !== 0) ev.preventDefault();
    if (held[ev.key]) return;
    held[ev.key] = true;
    e.keyPressed(ev.key);
    if (ev.key === "e" || ev.key === "E") send({ t: "emote", kind: "namaste" });
  });
  window.addEventListener("keyup", (ev) => {
    held[ev.key] = false;
    e.keyReleased(ev.key);
  });

  function bindPad(id, dir) {
    const el = qs(id);
    const start = (ev) => {
      ev.preventDefault();
      if (ev.pointerId != null && el.setPointerCapture) el.setPointerCapture(ev.pointerId);
      e.holdDir(dir, true);
    };
    const end = (ev) => { ev.preventDefault(); e.holdDir(dir, false); };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }
  bindPad("pad-up", "up");
  bindPad("pad-down", "down");
  bindPad("pad-left", "left");
  bindPad("pad-right", "right");

  qs("pad-act").addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    send({ t: "emote", kind: "namaste" });
  });
  const chatToggle = qs("chat-toggle");
  chatToggle.addEventListener("click", () => {
    const open = document.body.classList.toggle("chat-open");
    chatToggle.setAttribute("aria-pressed", open ? "true" : "false");
    if (open) qs("chat-input").focus();
  });

  qs("chat-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const input = qs("chat-input");
    const text = input.value.trim();
    if (!text) return;
    send({ t: "say", text });
    input.value = "";
  });

  qs("screen").addEventListener("click", (ev) => {
    if (!Hyrule.joined) return;
    const rect = qs("screen").getBoundingClientRect();
    const sx = (ev.clientX - rect.left) * (qs("screen").width / rect.width);
    const sy = (ev.clientY - rect.top) * (qs("screen").height / rect.height);
    const yogi = e.pickYogiAt(sx, sy);
    if (yogi) openWhisper(yogi);
  });

  qs("whisper-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = qs("whisper-input").value.trim();
    if (!text || !Hyrule.whisperTo) return;
    send({ t: "whisper", to: Hyrule.whisperTo, text });
    qs("whisper-input").value = "";
  });

  qs("sheet-close").onclick = hideOverlay;
  document.querySelectorAll("#menu-bar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.getAttribute("data-panel");
      if (panel === "calendar") { renderCalendar(); showPanel("calendar", "Veranstaltungskalender"); }
      if (panel === "meet") { renderMeet(); showPanel("meet", "Treffen verabreden"); }
      if (panel === "profile") { renderProfile(); showPanel("profile", "Profil"); }
    });
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
  window.addEventListener("orientationchange", () => setTimeout(fitView, 250));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitView);
    window.visualViewport.addEventListener("scroll", fitView);
  }
  wireAuth();
  wireInput();
  startLoop();
  tryStoredYogaLogin();

  fetch(api("/api/health")).then((r) => r.json()).then((info) => {
    const st = info.world.stats || {};
    qs("server-meta").textContent =
      "Welt " + info.world.size + "×" + info.world.size +
      " · " + info.players + "/" + info.max + " online · " +
      (st.temples || (info.world.temples || []).length) + " Tempel · " +
      st.houses + " Ashram-Hütten";
  }).catch(() => {
    qs("server-meta").textContent = "Server nicht erreichbar — bitte npm start.";
  });
}

window.addEventListener("load", boot);

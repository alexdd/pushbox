/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * JSON persistence for yogi accounts, festival calendar and whispers.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Catalog = require("../shared/catalog");

function nowIso() { return new Date().toISOString(); }

function addHours(iso, hours) {
  return new Date(Date.parse(iso) + hours * 3600 * 1000).toISOString();
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), s, 32).toString("hex");
  return { salt: s, hash };
}

function verifyPassword(password, salt, hash) {
  const next = crypto.scryptSync(String(password), salt, 32).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(next, "hex"), Buffer.from(hash, "hex"));
  } catch (e) {
    return false;
  }
}

function seedFestivals(temples) {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const base = start.toISOString();
  const list = [];
  const sessionsFor = (deity) => ([
    { id: "dawn", title: "Morgendsadhana", time: "07:00", asanas: ["surya", "tadasana", "adho"] },
    { id: "noon", title: "Asana-Kreis", time: "12:00", asanas: ["virabhadra", "trikona", "vriksha"] },
    { id: "dusk", title: "Bhakti & Meditation", time: "18:00", asanas: ["padma", "bala", "savasana"] }
  ].map((s) => ({ ...s, deity })));

  for (let i = 0; i < temples.length; i++) {
    const t = temples[i];
    const deity = Catalog.deityById(t.deity);
    list.push({
      id: "fest-" + t.id,
      templeId: t.id,
      templeName: t.name,
      deity: t.deity,
      title: "Festival zu Ehren von " + deity.name,
      startsAt: addHours(base, 6 + i * 8),
      endsAt: addHours(base, 30 + i * 8),
      sessions: sessionsFor(t.deity),
      attendees: {},
      createdBy: "ashram"
    });
  }
  return list;
}

function createStore(opts) {
  const options = opts || {};
  const dir = options.dir || path.join(__dirname, "data");
  fs.mkdirSync(dir, { recursive: true });
  const accountsFile = path.join(dir, "accounts.json");
  const festivalsFile = path.join(dir, "festivals.json");

  const read = (file, fallback) => {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (e) { return fallback; }
  };
  const write = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  };

  const accounts = read(accountsFile, []);
  let festivals = read(festivalsFile, null);
  const sessions = new Map();
  const whispers = [];
  const meetups = [];
  let nextAccount = accounts.reduce((m, a) => Math.max(m, a.id), 0) + 1;

  function persistAccounts() { write(accountsFile, accounts); }
  function persistFestivals() { write(festivalsFile, festivals); }

  function ensureFestivals(temples) {
    if (!festivals || !festivals.length) {
      festivals = seedFestivals(temples || []);
      persistFestivals();
    }
  }

  function publicAccount(a) {
    return {
      id: a.id,
      name: a.name,
      gender: a.gender,
      asanas: a.asanas || [],
      focus: a.focus || "hatha"
    };
  }

  function publicFestival(f, accountId) {
    const mine = (f.attendees && accountId && f.attendees[accountId]) || null;
    return {
      id: f.id,
      templeId: f.templeId,
      templeName: f.templeName,
      deity: f.deity,
      title: f.title,
      startsAt: f.startsAt,
      endsAt: f.endsAt,
      sessions: f.sessions,
      going: Object.keys(f.attendees || {}).length,
      mine
    };
  }

  function findAccount(name) {
    const n = String(name || "").trim().toLowerCase();
    return accounts.find((a) => a.name.toLowerCase() === n) || null;
  }

  function register(body) {
    const name = String(body.name || "").trim();
    if (!/^[\w äöüÄÖÜß'.-]{2,50}$/.test(name)) return { error: "Ungültiger Yoginame (2–50 Zeichen)." };
    if (findAccount(name)) return { error: "Dieser Name ist schon vergeben." };
    const password = String(body.password || "");
    if (password.length < 4 || password.length > 64) return { error: "Passwort: 4–64 Zeichen." };
    const gender = body.gender === "female" ? "female" : (body.gender === "male" ? "male" : null);
    if (!gender) return { error: "Bitte Geschlecht wählen (Yogini / Yogi)." };
    const { salt, hash } = hashPassword(password);
    const acc = {
      id: nextAccount++,
      name,
      salt,
      hash,
      gender,
      asanas: Catalog.sanitizeAsanas(body.asanas),
      focus: Catalog.sanitizeFocus(body.focus),
      createdAt: nowIso()
    };
    accounts.push(acc);
    persistAccounts();
    return { account: publicAccount(acc) };
  }

  function upsertYogaAccount(user) {
    const name = String((user && user.username) || "").trim();
    if (!name || name.length > 50) return null;
    const yogaUserId = user.id;
    let acc = accounts.find((a) => a.yogaUserId === yogaUserId);
    if (!acc) acc = findAccount(name);
    if (!acc) {
      acc = {
        id: nextAccount++,
        name,
        yogaUserId,
        salt: "",
        hash: "",
        gender: "female",
        asanas: [],
        focus: "hatha",
        createdAt: nowIso()
      };
      accounts.push(acc);
    } else {
      acc.name = name;
      acc.yogaUserId = yogaUserId;
      if (!acc.gender) acc.gender = "female";
      if (!acc.focus) acc.focus = "hatha";
      if (!acc.asanas) acc.asanas = [];
    }
    persistAccounts();
    return acc;
  }

  function login(name, password) {
    const acc = findAccount(name);
    if (!acc || !verifyPassword(password, acc.salt, acc.hash)) {
      return { error: "Name oder Passwort stimmt nicht." };
    }
    return { account: publicAccount(acc) };
  }

  function createSession(account) {
    const token = crypto.randomBytes(18).toString("hex");
    sessions.set(token, { token, accountId: account.id, at: Date.now() });
    return token;
  }

  function sessionAccount(token) {
    const s = sessions.get(String(token || ""));
    if (!s) return null;
    return accounts.find((a) => a.id === s.accountId) || null;
  }

  function updateProfile(accountId, body) {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return { error: "Unbekanntes Profil." };
    if (body.asanas) acc.asanas = Catalog.sanitizeAsanas(body.asanas);
    if (body.focus) acc.focus = Catalog.sanitizeFocus(body.focus);
    persistAccounts();
    return { account: publicAccount(acc) };
  }

  function joinFestival(accountId, festivalId, extra) {
    const f = festivals.find((x) => x.id === festivalId);
    if (!f) return { error: "Festival nicht gefunden." };
    const acc = accounts.find((a) => a.id === accountId);
    f.attendees[accountId] = {
      name: acc ? acc.name : "Yogi",
      asanas: Catalog.sanitizeAsanas((extra && extra.asanas) || (acc && acc.asanas) || []),
      focus: Catalog.sanitizeFocus((extra && extra.focus) || (acc && acc.focus) || "hatha"),
      booked: Array.isArray(extra && extra.booked) ? extra.booked.slice(0, 6) : ((f.attendees[accountId] && f.attendees[accountId].booked) || []),
      at: nowIso()
    };
    persistFestivals();
    return { festival: publicFestival(f, accountId) };
  }

  function bookSessions(accountId, festivalId, booked) {
    const f = festivals.find((x) => x.id === festivalId);
    if (!f) return { error: "Festival nicht gefunden." };
    if (!f.attendees[accountId]) return { error: "Bitte zuerst für das Festival eintragen." };
    const ids = new Set(f.sessions.map((s) => s.id));
    f.attendees[accountId].booked = (booked || []).filter((id) => ids.has(id)).slice(0, 6);
    persistFestivals();
    return { festival: publicFestival(f, accountId) };
  }

  function createFestival(accountId, body, temples) {
    const temple = (temples || []).find((t) => t.id === body.templeId);
    if (!temple) return { error: "Tempel nicht gefunden." };
    const title = String(body.title || "").trim().slice(0, 60);
    if (title.length < 4) return { error: "Bitte einen Festivalnamen angeben." };
    const acc = accounts.find((a) => a.id === accountId);
    const f = {
      id: "fest-" + Date.now().toString(36),
      templeId: temple.id,
      templeName: temple.name,
      deity: temple.deity,
      title,
      startsAt: body.startsAt || addHours(nowIso(), 4),
      endsAt: body.endsAt || addHours(nowIso(), 28),
      sessions: [
        { id: "dawn", title: "Morgendsadhana", time: "07:00", asanas: ["surya", "adho"] },
        { id: "dusk", title: "Abendkreis", time: "18:00", asanas: ["padma", "savasana"] }
      ],
      attendees: {},
      createdBy: acc ? acc.name : "yogi"
    };
    festivals.push(f);
    persistFestivals();
    return { festival: publicFestival(f, accountId) };
  }

  function addWhisper(from, to, text) {
    const row = { id: whispers.length + 1, from, to, text, at: nowIso() };
    whispers.push(row);
    if (whispers.length > 400) whispers.splice(0, whispers.length - 400);
    return row;
  }

  function addMeetup(from, to, festivalId) {
    const row = { id: meetups.length + 1, from, to, festivalId, status: "open", at: nowIso() };
    meetups.push(row);
    return row;
  }

  function answerMeetup(id, toId, accept) {
    const row = meetups.find((m) => m.id === id && m.to === toId);
    if (!row) return { error: "Einladung nicht gefunden." };
    row.status = accept ? "accepted" : "declined";
    return { meetup: row };
  }

  return {
    register,
    login,
    upsertYogaAccount,
    createSession,
    sessionAccount,
    publicAccount,
    updateProfile,
    ensureFestivals,
    publicFestival,
    festivals: () => festivals,
    joinFestival,
    bookSessions,
    createFestival,
    addWhisper,
    addMeetup,
    answerMeetup,
    findAccount
  };
}

module.exports = { createStore, hashPassword, verifyPassword, seedFestivals };

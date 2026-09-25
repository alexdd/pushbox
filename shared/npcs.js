/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Thirty ashram residents. Each one has a yoga practice and a small
 * behavior: sit, pace, wander, circle a temple, walk the pilgrimage,
 * or greet whoever comes near. The server ticks them; clients only draw.
 */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AshramNpcs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const World = (typeof ZeldaWorld !== "undefined")
    ? ZeldaWorld
    : (typeof require === "function" ? require("./world") : null);

  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const COLORS = ["#d4a574", "#7dcea0", "#c8965f", "#85c1e9", "#f5cba7", "#bb8fce", "#f1948a", "#73c6b6"];

  /* behavior, focus, gender, home deity (or "spawn"), tempo in ticks, lines */
  const CAST = [
    ["Meera", "still", "meditation", "female", "shiva", 12, ["Ich sitze. Der Atem zählt, nicht die Schritte.", "Ein. Aus. Der Platz bleibt."]],
    ["Arun", "circuit", "vinyasa", "male", "ganesha", 2, ["Surya Namaskar, Runde drei.", "Fließend, nicht hetzen."]],
    ["Devi", "pilgrim", "bhakti", "female", "kali", 3, ["Der Pfad von Tempel zu Tempel ist schon das Gebet.", "Jaya, weiter."]],
    ["Hari", "pace", "hatha", "male", "shiva", 3, ["Ein Schritt, eine Haltung.", "Der Pfad trägt."]],
    ["Lila", "still", "yin", "female", "lakshmi", 16, ["Wir halten. Nichts muss sich bewegen.", "Die Hüfte darf weich bleiben."]],
    ["Nanda", "wander", "ashtanga", "male", "hanuman", 1, ["Fünf Atemzüge, dann die nächste Reihe.", "Dranbleiben."]],
    ["Sita", "still", "pranayama", "female", "saraswati", 10, ["Einatmen vier, halten vier, ausatmen sechs.", "Die Stimme kommt aus der Stille."]],
    ["Govinda", "wander", "bhakti", "male", "krishna", 3, ["Die Flöte ist leise, der Schritt auch.", "Radhe, nur im Vorbeigehen."]],
    ["Anjali", "greet", "hatha", "female", "spawn", 6, ["Namaste. Der Platz am Feuer ist frei.", "Willkommen im Kailash."]],
    ["Ravi", "circuit", "hatha", "male", "hanuman", 2, ["Krieger, dann Berg.", "Kraft ohne Härte."]],
    ["Padma", "still", "bhakti", "female", "lakshmi", 14, ["Der Lotus öffnet sich nicht auf Befehl.", "Danke, dass der Boden trägt."]],
    ["Tara", "pace", "meditation", "female", "kali", 4, ["Kurz und klar. Dann wieder sitzen.", "Die Sichel mäht nur das Überflüssige."]],
    ["Omkar", "wander", "meditation", "male", "shiva", 6, ["…", "Om, kaum laut."]],
    ["Bhavana", "circuit", "hatha", "female", "ganesha", 3, ["Füße parallel. Knie weich.", "Schaut auf den eigenen Teppich, nicht auf mich."]],
    ["Chandra", "still", "yin", "male", "saraswati", 18, ["Der Mond hat keine Eile.", "Heute nur die lange Seite."]],
    ["Isha", "pace", "pranayama", "female", "spawn", 3, ["Ein Atemzug pro Brückenschritt.", "Ufer, Mitte, Ufer."]],
    ["Mohan", "wander", "hatha", "male", "lakshmi", 4, ["Erst gießen, dann üben.", "Die Hütte braucht auch einen Rücken."]],
    ["Jyoti", "circuit", "bhakti", "female", "shiva", 3, ["Die Lampe einmal um den Schrein.", "Licht bleibt, auch wenn ich weitergehe."]],
    ["Keshav", "pilgrim", "ashtanga", "male", "hanuman", 2, ["Nächster Tempel, gleiche Serie.", "Die Straße ist die Praxis."]],
    ["Radha", "wander", "vinyasa", "female", "krishna", 2, ["Drehen, nicht stolpern.", "Der Kreis ist ein Tanz, kein Wettkampf."]],
    ["Vimal", "still", "yin", "male", "spawn", 20, ["Savasana. Augen zu, auch mitten auf dem Platz.", "Nichts tun ist die Haltung."]],
    ["Surya", "pace", "vinyasa", "male", "ganesha", 2, ["Nach Osten, solange der Weg hält.", "Sonne im Gesicht, Ferse am Boden."]],
    ["Ganga", "wander", "pranayama", "female", "kali", 4, ["Am Wasser wird der Atem länger.", "Nicht ins Nass, nur bis an den Rand."]],
    ["Durga", "pace", "hatha", "female", "kali", 3, ["Ich gehe die Schwelle ab.", "Wer eintritt, grüßt erst."]],
    ["Nataraj", "circuit", "meditation", "male", "shiva", 5, ["Der Tanz ist innen.", "Ein langsamer Kreis um den Berg."]],
    ["Asha", "greet", "bhakti", "female", "spawn", 5, ["Tee steht in der Hütte, der Pfad ist offen.", "Namaste, bleib so lange du magst."]],
    ["Prem", "wander", "bhakti", "male", "krishna", 2, ["Sing leise, dann hört man die anderen.", "Jeder Name ist ein Schritt."]],
    ["Shanti", "still", "yin", "female", "lakshmi", 15, ["Unter dem Dach ist Schatten genug.", "Schultern runter."]],
    ["Bodhi", "wander", "meditation", "male", "saraswati", 7, ["Langsam ist nicht verloren.", "Ich gehe, als säße ich."]],
    ["Uma", "circuit", "ashtanga", "female", "lakshmi", 2, ["Stehender Bogen, dann Baum.", "Zählt mit, wenn ihr wollt."]]
  ];

  function rngOf(seed) {
    let a = seed >>> 0;
    return function rng() {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function templeOf(world, deity) {
    const list = world.temples || [];
    for (let i = 0; i < list.length; i++) if (list[i].deity === deity) return list[i];
    return { x: world.spawn.x, y: world.spawn.y };
  }

  function ring(world, x, y, radius) {
    const pts = [];
    const spots = [[radius, 0], [0, radius], [-radius, 0], [0, -radius], [radius, radius], [-radius, radius]];
    for (let i = 0; i < spots.length; i++) {
      const p = World.findOpenNear(world, x + spots[i][0], y + spots[i][1]);
      const last = pts[pts.length - 1];
      if (!last || last.x !== p.x || last.y !== p.y) pts.push(p);
    }
    return pts.length ? pts : [World.findOpenNear(world, x, y)];
  }

  function createPopulation(world) {
    const rng = rngOf((world.seed || 1) ^ 0xA5A);
    const npcs = [];
    for (let i = 0; i < CAST.length; i++) {
      const [name, behavior, focus, gender, home, tempo, lines] = CAST[i];
      const anchor = home === "spawn" ? world.spawn : templeOf(world, home);
      const ox = ((i * 3) % 7) - 3;
      const oy = ((i * 5) % 7) - 3;
      const spot = World.findOpenNear(world, anchor.x + ox, anchor.y + oy);
      const waypoints = behavior === "pilgrim"
        ? (world.temples || []).map((t) => World.findOpenNear(world, t.x, t.y + 2))
        : ring(world, spot.x, spot.y, behavior === "circuit" ? 3 : 2);
      npcs.push({
        id: "npc-" + (i + 1),
        name,
        behavior,
        focus,
        gender,
        lines,
        tempo,
        wait: i % tempo,
        tx: spot.x,
        ty: spot.y,
        dir: i % 4,
        moving: behavior !== "still" && behavior !== "greet",
        slot: i % 5,
        color: COLORS[i % COLORS.length],
        waypoints,
        wp: 0,
        rng: rngOf((world.seed || 1) + i * 17),
        saidAt: 0
      });
      void rng;
    }
    return { npcs };
  }

  function occupiedSet(npcs, skip) {
    const used = new Set();
    for (let i = 0; i < npcs.length; i++) {
      if (npcs[i] === skip) continue;
      used.add(npcs[i].tx + "," + npcs[i].ty);
    }
    return used;
  }

  function canStep(world, used, x, y) {
    return World.isWalkable(world, x, y) && !used.has(x + "," + y);
  }

  function move(npc, world, used, nx, ny, dir) {
    if (!canStep(world, used, nx, ny)) return false;
    npc.tx = nx;
    npc.ty = ny;
    npc.dir = dir;
    npc.moving = true;
    return true;
  }

  function toward(npc, world, used, goal) {
    const dx = Math.sign(goal.x - npc.tx);
    const dy = Math.sign(goal.y - npc.ty);
    if (dx === 0 && dy === 0) return false;
    const first = Math.abs(goal.x - npc.tx) >= Math.abs(goal.y - npc.ty);
    const tries = first ? [[dx, 0, dx > 0 ? 1 : 3], [0, dy, dy > 0 ? 2 : 0]] : [[0, dy, dy > 0 ? 2 : 0], [dx, 0, dx > 0 ? 1 : 3]];
    for (let i = 0; i < tries.length; i++) {
      const [sx, sy, dir] = tries[i];
      if (!sx && !sy) continue;
      if (move(npc, world, used, npc.tx + sx, npc.ty + sy, dir)) return true;
    }
    return false;
  }

  function maybeSay(npc, now, force) {
    if (!npc.lines.length) return null;
    if (!force && now - npc.saidAt < 28000) return null;
    if (!force && npc.rng() > 0.35) return null;
    npc.saidAt = now;
    const text = npc.lines[(npc.rng() * npc.lines.length) | 0];
    return { id: npc.id, name: npc.name, text };
  }

  function playerNear(npc, players, dist) {
    if (!players) return false;
    for (const p of players) {
      if (Math.abs(p.tx - npc.tx) + Math.abs(p.ty - npc.ty) <= dist) return true;
    }
    return false;
  }

  function stepOne(npc, npcs, world, players, now) {
    if (npc.wait > 0) { npc.wait--; npc.moving = false; return null; }
    const used = occupiedSet(npcs, npc);
    let said = null;
    if (npc.behavior === "still") {
      npc.moving = false;
      said = maybeSay(npc, now, false);
    } else if (npc.behavior === "greet") {
      npc.moving = false;
      if (playerNear(npc, players, 6)) said = maybeSay(npc, now, true);
    } else if (npc.behavior === "pace") {
      const [dx, dy] = DIRS[npc.dir];
      if (!move(npc, world, used, npc.tx + dx, npc.ty + dy, npc.dir)) {
        npc.dir = (npc.dir + 2) & 3;
        npc.moving = false;
      }
      said = maybeSay(npc, now, false);
    } else if (npc.behavior === "wander") {
      const order = [0, 1, 2, 3];
      for (let i = order.length - 1; i > 0; i--) {
        const j = (npc.rng() * (i + 1)) | 0;
        const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      let stepped = false;
      for (let i = 0; i < order.length; i++) {
        const dir = order[i];
        const [dx, dy] = DIRS[dir];
        const nx = npc.tx + dx, ny = npc.ty + dy;
        const tile = World.getTile(world, nx, ny);
        const pathBias = tile === World.TILE.PATH || tile === World.TILE.BRIDGE;
        if (!pathBias && npc.rng() < 0.45) continue;
        if (move(npc, world, used, nx, ny, dir)) { stepped = true; break; }
      }
      npc.moving = stepped;
      said = maybeSay(npc, now, false);
    } else {
      const goal = npc.waypoints[npc.wp % npc.waypoints.length];
      if (goal && npc.tx === goal.x && npc.ty === goal.y) npc.wp = (npc.wp + 1) % npc.waypoints.length;
      const next = npc.waypoints[npc.wp % npc.waypoints.length];
      if (!next || !toward(npc, world, used, next)) npc.moving = false;
      said = maybeSay(npc, now, false);
    }
    npc.wait = Math.max(0, npc.tempo - 1);
    return said;
  }

  function stepAll(pop, world, players, now) {
    const says = [];
    const list = players ? [...players] : [];
    for (let i = 0; i < pop.npcs.length; i++) {
      const said = stepOne(pop.npcs[i], pop.npcs, world, list, now || Date.now());
      if (said) says.push(said);
    }
    return says;
  }

  function publicNpc(n) {
    return {
      id: n.id,
      name: n.name,
      gender: n.gender,
      focus: n.focus,
      slot: n.slot,
      color: n.color,
      tx: n.tx,
      ty: n.ty,
      dir: n.dir,
      moving: n.moving,
      behavior: n.behavior
    };
  }

  return { CAST, createPopulation, stepAll, stepOne, publicNpc };
});

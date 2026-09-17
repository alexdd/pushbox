/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Deterministic 1000×1000 overworld shared by the Fastify server and the
 * HTML5 client. Same seed → identical rivers, bridges, roads, villages,
 * houses and trees, so the server can validate walks without sending a
 * megabyte tile blob.
 */
"use strict";

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ZeldaWorld = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {

  const SIZE = 1000;
  const DEFAULT_SEED = 1998;

  const TILE = {
    GRASS: 0,
    PATH: 1,
    WATER: 2,
    BRIDGE: 3,
    SAND: 4,
    FLOWER: 5,
    WALL: 6,
    FLOOR: 7
  };

  const WALKABLE = {
    [TILE.GRASS]: true,
    [TILE.PATH]: true,
    [TILE.BRIDGE]: true,
    [TILE.SAND]: true,
    [TILE.FLOWER]: true,
    [TILE.FLOOR]: true
  };

  const VILLAGES = [
    { name: "Hateno", x: 500, y: 500 },
    { name: "Kakariko", x: 220, y: 210 },
    { name: "Rito", x: 790, y: 240 },
    { name: "Goron", x: 200, y: 780 },
    { name: "Zora", x: 820, y: 800 }
  ];

  const SPAWN_OFFSETS = [
    [0, 0],
    [2, 1],
    [-2, 1],
    [1, 2],
    [-1, 2]
  ];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function rng() {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function inBounds(x, y, size) {
    return x >= 0 && y >= 0 && x < size && y < size;
  }

  function idx(x, y, size) {
    return y * size + x;
  }

  function getTile(world, x, y) {
    if (!inBounds(x, y, world.size)) return TILE.WALL;
    return world.tiles[idx(x, y, world.size)];
  }

  function setTile(world, x, y, t) {
    if (!inBounds(x, y, world.size)) return;
    world.tiles[idx(x, y, world.size)] = t;
  }

  function isWalkableTile(t) {
    return !!WALKABLE[t];
  }

  function isWalkable(world, x, y) {
    if (!isWalkableTile(getTile(world, x, y))) return false;
    if (world.blocked && world.blocked.has(x + "," + y)) return false;
    return true;
  }

  function markBlocked(world, x, y) {
    world.blocked.add(x + "," + y);
  }

  function line(x0, y0, x1, y1, visit) {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0, y = y0;
    for (;;) {
      visit(x, y);
      if (x === x1 && y === y1) break;
      const e2 = err << 1;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  function stampDisk(world, cx, cy, r, tile, onlyOn) {
    const r2 = r * r;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        if (!inBounds(x, y, world.size)) continue;
        if (onlyOn && getTile(world, x, y) !== onlyOn) continue;
        setTile(world, x, y, tile);
      }
    }
  }

  function carveRiver(world, rng, startX, startY, heading, steps, halfWidth) {
    let x = startX;
    let y = startY;
    let dir = heading;
    for (let i = 0; i < steps; i++) {
      dir += (rng() - 0.5) * 0.28;
      x += Math.cos(dir);
      y += Math.sin(dir);
      const w = halfWidth + ((rng() < 0.15) ? 1 : 0);
      for (let oy = -w - 1; oy <= w + 1; oy++) {
        for (let ox = -w - 1; ox <= w + 1; ox++) {
          const tx = Math.round(x + ox);
          const ty = Math.round(y + oy);
          if (!inBounds(tx, ty, world.size)) continue;
          const d = Math.hypot(ox, oy);
          if (d <= w) setTile(world, tx, ty, TILE.WATER);
          else if (d <= w + 1.2 && getTile(world, tx, ty) !== TILE.WATER)
            setTile(world, tx, ty, TILE.SAND);
        }
      }
      if (x < 4 || y < 4 || x > world.size - 5 || y > world.size - 5) break;
    }
  }

  function carvePath(world, x0, y0, x1, y1) {
    line(x0, y0, x1, y1, (x, y) => {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 0; ox++) {
          const tx = x + ox, ty = y + oy;
          if (!inBounds(tx, ty, world.size)) continue;
          const t = getTile(world, tx, ty);
          if (t === TILE.WATER || t === TILE.BRIDGE) setTile(world, tx, ty, TILE.BRIDGE);
          else if (t !== TILE.WALL) setTile(world, tx, ty, TILE.PATH);
        }
      }
    });
  }

  function placeVillage(world, village, rng) {
    const { x: cx, y: cy, name } = village;
    const plaza = 10;
    for (let y = cy - plaza; y <= cy + plaza; y++) {
      for (let x = cx - plaza; x <= cx + plaza; x++) {
        if (!inBounds(x, y, world.size)) continue;
        const t = getTile(world, x, y);
        if (t === TILE.WATER) continue;
        const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        if (dx <= 2 || dy <= 2) setTile(world, x, y, TILE.PATH);
        else if (rng() < 0.08 && t === TILE.GRASS) setTile(world, x, y, TILE.FLOWER);
      }
    }
    stampDisk(world, cx, cy, 3, TILE.PATH);

    const houses = [];
    const spots = [
      [cx - 7, cy - 6], [cx + 5, cy - 6],
      [cx - 8, cy + 4], [cx + 6, cy + 4],
      [cx - 3, cy - 8], [cx + 2, cy + 6],
      [cx - 6, cy + 1], [cx + 4, cy - 2]
    ];
    for (let i = 0; i < spots.length; i++) {
      const hx = spots[i][0], hy = spots[i][1];
      if (!canPlaceHouse(world, hx, hy, 2, 2)) continue;
      const house = { x: hx, y: hy, w: 2, h: 2, roof: i % 3, village: name };
      occupyHouse(world, house);
      houses.push(house);
    }
    return houses;
  }

  function canPlaceHouse(world, x, y, w, h) {
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (!inBounds(tx, ty, world.size)) return false;
        const t = getTile(world, tx, ty);
        if (t === TILE.WATER || t === TILE.BRIDGE || t === TILE.WALL) return false;
        if (world.blocked.has(tx + "," + ty)) return false;
      }
    }
    return true;
  }

  function occupyHouse(world, house) {
    for (let ty = house.y; ty < house.y + house.h; ty++) {
      for (let tx = house.x; tx < house.x + house.w; tx++) {
        if (getTile(world, tx, ty) !== TILE.PATH) setTile(world, tx, ty, TILE.FLOOR);
        markBlocked(world, tx, ty);
      }
    }
  }

  function plantForests(world, rng) {
    const trees = [];
    const clusters = 48;
    for (let c = 0; c < clusters; c++) {
      const cx = 30 + ((rng() * (world.size - 60)) | 0);
      const cy = 30 + ((rng() * (world.size - 60)) | 0);
      if (nearVillage(cx, cy, 36)) continue;
      const n = 18 + ((rng() * 28) | 0);
      for (let i = 0; i < n; i++) {
        const tx = cx + ((rng() * 22 - 11) | 0);
        const ty = cy + ((rng() * 22 - 11) | 0);
        if (!canPlant(world, tx, ty)) continue;
        markBlocked(world, tx, ty);
        trees.push({ x: tx, y: ty, variant: rng() < 0.35 ? 1 : 0 });
      }
    }
    // a few lonely roadside trees
    for (let i = 0; i < 180; i++) {
      const tx = 8 + ((rng() * (world.size - 16)) | 0);
      const ty = 8 + ((rng() * (world.size - 16)) | 0);
      if (!canPlant(world, tx, ty)) continue;
      if (nearVillage(tx, ty, 16)) continue;
      markBlocked(world, tx, ty);
      trees.push({ x: tx, y: ty, variant: rng() < 0.4 ? 1 : 0 });
    }
    return trees;
  }

  function canPlant(world, x, y) {
    if (!inBounds(x, y, world.size)) return false;
    const t = getTile(world, x, y);
    if (t !== TILE.GRASS && t !== TILE.FLOWER) return false;
    if (world.blocked.has(x + "," + y)) return false;
    return true;
  }

  function nearVillage(x, y, radius) {
    for (let i = 0; i < VILLAGES.length; i++) {
      const v = VILLAGES[i];
      if (Math.abs(v.x - x) <= radius && Math.abs(v.y - y) <= radius) return true;
    }
    return false;
  }

  function plantVillageGrove(world, village, trees) {
    const ring = [
      [8, -5], [-8, 4], [6, 7], [-7, -6],
      [11, -4], [12, 5], [-12, 3], [-11, -6],
      [9, 11], [-8, 12], [14, -1], [-14, 0],
      [7, -12], [-6, -13], [13, 9], [-13, 8]
    ];
    for (let i = 0; i < ring.length; i++) {
      const tx = village.x + ring[i][0];
      const ty = village.y + ring[i][1];
      if (!canPlant(world, tx, ty)) continue;
      markBlocked(world, tx, ty);
      trees.push({ x: tx, y: ty, variant: i % 2 });
    }
  }

  function addHatenoRiver(world) {
    const y0 = 532;
    for (let x = 420; x <= 590; x++) {
      for (let w = -2; w <= 2; w++) {
        const y = y0 + w;
        if (!inBounds(x, y, world.size)) continue;
        const t = getTile(world, x, y);
        if (t === TILE.FLOOR || t === TILE.WALL) continue;
        const onRoad = t === TILE.PATH || t === TILE.BRIDGE || Math.abs(x - 500) <= 2;
        if (onRoad) setTile(world, x, y, TILE.BRIDGE);
        else if (Math.abs(w) === 2) {
          if (t === TILE.GRASS || t === TILE.FLOWER) setTile(world, x, y, TILE.SAND);
        } else {
          setTile(world, x, y, TILE.WATER);
        }
      }
    }
    carvePath(world, 500, 500, 500, 555);
  }

  function scatterRocksAndFlowers(world, rng) {
    for (let i = 0; i < 420; i++) {
      const x = 6 + ((rng() * (world.size - 12)) | 0);
      const y = 6 + ((rng() * (world.size - 12)) | 0);
      if (getTile(world, x, y) !== TILE.GRASS) continue;
      if (world.blocked.has(x + "," + y)) continue;
      if (nearVillage(x, y, 14)) continue;
      setTile(world, x, y, TILE.WALL);
    }
    for (let i = 0; i < 2200; i++) {
      const x = 4 + ((rng() * (world.size - 8)) | 0);
      const y = 4 + ((rng() * (world.size - 8)) | 0);
      if (getTile(world, x, y) !== TILE.GRASS) continue;
      setTile(world, x, y, TILE.FLOWER);
    }
  }

  function borderWall(world) {
    for (let i = 0; i < world.size; i++) {
      setTile(world, i, 0, TILE.WALL);
      setTile(world, i, 1, TILE.WALL);
      setTile(world, i, world.size - 1, TILE.WALL);
      setTile(world, i, world.size - 2, TILE.WALL);
      setTile(world, 0, i, TILE.WALL);
      setTile(world, 1, i, TILE.WALL);
      setTile(world, world.size - 1, i, TILE.WALL);
      setTile(world, world.size - 2, i, TILE.WALL);
    }
  }

  function findOpenNear(world, x, y) {
    if (isWalkable(world, x, y)) return { x, y };
    for (let r = 1; r < 12; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          const tx = x + ox, ty = y + oy;
          if (isWalkable(world, tx, ty)) return { x: tx, y: ty };
        }
      }
    }
    return { x: 500, y: 500 };
  }

  function spawnForSlot(world, slot) {
    const off = SPAWN_OFFSETS[slot % SPAWN_OFFSETS.length];
    return findOpenNear(world, world.spawn.x + off[0], world.spawn.y + off[1]);
  }

  function countTiles(world) {
    const counts = { water: 0, bridge: 0, path: 0, grass: 0, wall: 0, flower: 0, sand: 0, floor: 0 };
    const tiles = world.tiles;
    for (let i = 0; i < tiles.length; i++) {
      switch (tiles[i]) {
        case TILE.WATER: counts.water++; break;
        case TILE.BRIDGE: counts.bridge++; break;
        case TILE.PATH: counts.path++; break;
        case TILE.GRASS: counts.grass++; break;
        case TILE.WALL: counts.wall++; break;
        case TILE.FLOWER: counts.flower++; break;
        case TILE.SAND: counts.sand++; break;
        case TILE.FLOOR: counts.floor++; break;
      }
    }
    return counts;
  }

  function generateWorld(seed, size) {
    seed = (seed == null ? DEFAULT_SEED : seed) >>> 0;
    size = size || SIZE;
    const rng = mulberry32(seed);
    const world = {
      seed,
      size,
      tiles: new Uint8Array(size * size),
      trees: [],
      houses: [],
      villages: VILLAGES.map((v) => ({ name: v.name, x: v.x, y: v.y })),
      spawn: { x: 500, y: 500 },
      blocked: new Set(),
      stats: null
    };

    world.tiles.fill(TILE.GRASS);
    borderWall(world);

    carveRiver(world, rng, 180, 8, Math.PI * 0.55, size + 80, 2);
    carveRiver(world, rng, 8, 420, 0.12, size + 40, 2);
    carveRiver(world, rng, 640, 8, Math.PI * 0.72, size, 1);

    for (let i = 0; i < world.villages.length; i++) {
      const houses = placeVillage(world, world.villages[i], rng);
      world.houses.push.apply(world.houses, houses);
    }

    for (let i = 0; i < world.villages.length; i++) {
      for (let j = i + 1; j < world.villages.length; j++) {
        const a = world.villages[i], b = world.villages[j];
        carvePath(world, a.x, a.y, b.x, b.y);
      }
    }

    world.trees = plantForests(world, rng);
    for (let i = 0; i < world.villages.length; i++) {
      plantVillageGrove(world, world.villages[i], world.trees);
    }
    addHatenoRiver(world);
    scatterRocksAndFlowers(world, rng);

    // Keep village plazas clear of leftover rocks and make sure spawn is open.
    world.blocked.delete(world.spawn.x + "," + world.spawn.y);
    setTile(world, world.spawn.x, world.spawn.y, TILE.PATH);
    for (let i = 0; i < SPAWN_OFFSETS.length; i++) {
      const sx = world.spawn.x + SPAWN_OFFSETS[i][0];
      const sy = world.spawn.y + SPAWN_OFFSETS[i][1];
      if (getTile(world, sx, sy) === TILE.WALL) setTile(world, sx, sy, TILE.PATH);
      world.blocked.delete(sx + "," + sy);
    }

    const counts = countTiles(world);
    world.stats = {
      size,
      seed,
      water: counts.water,
      bridges: counts.bridge,
      paths: counts.path,
      trees: world.trees.length,
      houses: world.houses.length,
      villages: world.villages.length
    };
    return world;
  }

  function publicMeta(world) {
    return {
      seed: world.seed,
      size: world.size,
      spawn: world.spawn,
      villages: world.villages,
      stats: world.stats
    };
  }

  return {
    SIZE,
    DEFAULT_SEED,
    TILE,
    VILLAGES,
    SPAWN_OFFSETS,
    generateWorld,
    getTile,
    setTile,
    isWalkable,
    isWalkableTile,
    spawnForSlot,
    findOpenNear,
    inBounds,
    publicMeta
  };
});

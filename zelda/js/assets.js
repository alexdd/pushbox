/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * Procedural Hyrule tiles and props. Diamonds stay 48×24 so the original
 * PushBox isometric walker (TILE_DX=48, TILE_DY=24) can paint them unchanged.
 */
"use strict";

const HYRULE_PAL = {
  grassA: "#3d9a3a",
  grassB: "#348434",
  grassC: "#46a944",
  grassEdge: "#246628",
  path: "#c9a36a",
  pathHi: "#e0c08a",
  pathEdge: "#8a6a38",
  waterA: "#2b7ec8",
  waterB: "#3b92d8",
  waterEdge: "#164e86",
  bridge: "#8b5a2b",
  bridgeHi: "#b07840",
  sand: "#e6d08a",
  sandEdge: "#c4a85a",
  flower: "#e85d8a",
  flowerY: "#f2d24a",
  wall: "#7a7e86",
  wallHi: "#a8adb6",
  wallEdge: "#3e4248",
  floor: "#d8b48a",
  trunk: "#6b3f1f",
  leaf: "#1f7a32",
  leafD: "#145624",
  pine: "#0f5a2c",
  roofR: "#c4452b",
  roofB: "#2f6fbf",
  roofG: "#3d8a3a",
  house: "#e8d2a8",
  houseD: "#c4a878"
};

function hyruleDiamondPath(g, ox, oy) {
  g.beginPath();
  g.moveTo(ox + 24, oy + 0);
  g.lineTo(ox + 48, oy + 12);
  g.lineTo(ox + 24, oy + 24);
  g.lineTo(ox + 0, oy + 12);
  g.closePath();
}

function makeIsoTile(fill, edge, decorate) {
  const im = newImage(48, 24);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  hyruleDiamondPath(g, 0, 0);
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = edge;
  g.lineWidth = 1;
  g.stroke();
  if (decorate) decorate(g);
  return im;
}

function makeGrass(variant) {
  const fills = [HYRULE_PAL.grassA, HYRULE_PAL.grassB, HYRULE_PAL.grassC];
  return makeIsoTile(fills[variant % 3], HYRULE_PAL.grassEdge, (g) => {
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(22, 6, 4, 2);
    if (variant === 2) {
      g.fillStyle = "#2f6b28";
      g.fillRect(16, 12, 2, 2);
      g.fillRect(30, 10, 2, 2);
    }
  });
}

function makePathTile() {
  return makeIsoTile(HYRULE_PAL.path, HYRULE_PAL.pathEdge, (g) => {
    g.fillStyle = HYRULE_PAL.pathHi;
    g.fillRect(20, 8, 8, 3);
    g.fillRect(14, 12, 4, 2);
  });
}

function makeWater(frame) {
  const fill = frame ? HYRULE_PAL.waterB : HYRULE_PAL.waterA;
  return makeIsoTile(fill, HYRULE_PAL.waterEdge, (g) => {
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.beginPath();
    if (frame) {
      g.moveTo(12, 12); g.lineTo(20, 10);
      g.moveTo(28, 14); g.lineTo(36, 12);
    } else {
      g.moveTo(16, 14); g.lineTo(24, 12);
      g.moveTo(24, 8); g.lineTo(32, 10);
    }
    g.stroke();
  });
}

function makeBridgeTile() {
  return makeIsoTile(HYRULE_PAL.waterA, HYRULE_PAL.waterEdge, (g) => {
    g.fillStyle = HYRULE_PAL.bridge;
    g.beginPath();
    g.moveTo(24, 4); g.lineTo(42, 12); g.lineTo(24, 20); g.lineTo(6, 12);
    g.closePath();
    g.fill();
    g.strokeStyle = HYRULE_PAL.bridgeHi;
    g.beginPath();
    g.moveTo(10, 12); g.lineTo(38, 12);
    g.moveTo(16, 8); g.lineTo(32, 16);
    g.moveTo(32, 8); g.lineTo(16, 16);
    g.stroke();
  });
}

function makeSandTile() {
  return makeIsoTile(HYRULE_PAL.sand, HYRULE_PAL.sandEdge, (g) => {
    g.fillStyle = "#d4bc6e";
    g.fillRect(18, 10, 2, 2);
    g.fillRect(28, 14, 2, 2);
  });
}

function makeFlowerTile() {
  return makeIsoTile(HYRULE_PAL.grassA, HYRULE_PAL.grassEdge, (g) => {
    g.fillStyle = HYRULE_PAL.flower;
    g.fillRect(18, 10, 3, 3);
    g.fillStyle = HYRULE_PAL.flowerY;
    g.fillRect(28, 12, 3, 3);
    g.fillStyle = "#fff";
    g.fillRect(19, 11, 1, 1);
  });
}

function makeWallTile() {
  return makeIsoTile(HYRULE_PAL.wall, HYRULE_PAL.wallEdge, (g) => {
    g.fillStyle = HYRULE_PAL.wallHi;
    g.fillRect(20, 8, 8, 4);
    g.fillStyle = HYRULE_PAL.wallEdge;
    g.fillRect(16, 14, 6, 2);
  });
}

function makeFloorTile() {
  return makeIsoTile(HYRULE_PAL.floor, HYRULE_PAL.pathEdge, (g) => {
    g.strokeStyle = HYRULE_PAL.houseD;
    g.beginPath();
    g.moveTo(12, 12); g.lineTo(36, 12);
    g.stroke();
  });
}

function makeTreeSprite(pine) {
  const im = newImage(40, 62);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.beginPath();
  g.ellipse(20, 56, 12, 4, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = HYRULE_PAL.trunk;
  g.fillRect(17, 40, 6, 16);
  if (pine) {
    g.fillStyle = HYRULE_PAL.pine;
    for (let i = 0; i < 3; i++) {
      const top = 6 + i * 12;
      const w = 10 + i * 6;
      g.beginPath();
      g.moveTo(20, top);
      g.lineTo(20 + w, top + 16);
      g.lineTo(20 - w, top + 16);
      g.closePath();
      g.fill();
    }
  } else {
    g.fillStyle = HYRULE_PAL.leafD;
    g.beginPath();
    g.arc(20, 26, 16, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = HYRULE_PAL.leaf;
    g.beginPath();
    g.arc(16, 22, 12, 0, Math.PI * 2);
    g.fill();
  }
  return im;
}

function makeHouseSprite(roof) {
  const im = newImage(78, 72);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  const roofs = [HYRULE_PAL.roofR, HYRULE_PAL.roofB, HYRULE_PAL.roofG];
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.beginPath();
  g.ellipse(39, 66, 28, 6, 0, 0, Math.PI * 2);
  g.fill();
  // isometric box
  g.fillStyle = HYRULE_PAL.houseD;
  g.beginPath();
  g.moveTo(6, 38); g.lineTo(39, 52); g.lineTo(39, 68); g.lineTo(6, 54);
  g.closePath();
  g.fill();
  g.fillStyle = HYRULE_PAL.house;
  g.beginPath();
  g.moveTo(72, 38); g.lineTo(39, 52); g.lineTo(39, 68); g.lineTo(72, 54);
  g.closePath();
  g.fill();
  g.fillStyle = roofs[roof % 3];
  g.beginPath();
  g.moveTo(39, 8); g.lineTo(74, 28); g.lineTo(39, 44); g.lineTo(4, 28);
  g.closePath();
  g.fill();
  g.fillStyle = "#5a3318";
  g.fillRect(34, 54, 10, 14);
  g.fillStyle = "#8ec8e8";
  g.fillRect(16, 44, 8, 7);
  g.fillRect(54, 42, 8, 7);
  return im;
}

function tintPlayerSheet(base, hex) {
  const im = newImage(base.width, base.height);
  const g = im.getContext("2d");
  g.drawImage(base, 0, 0);
  const img = g.getImageData(0, 0, im.width, im.height);
  const d = img.data;
  const r = parseInt(hex.slice(1, 3), 16);
  const gg = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    // shirt-ish blues from the original avatar palette
    const isShirt = d[i] < 80 && d[i + 2] > 90 && d[i + 1] > 50 && d[i + 1] < 140;
    if (isShirt) {
      const shade = d[i + 2] / 160;
      d[i] = Math.min(255, (r * shade) | 0);
      d[i + 1] = Math.min(255, (gg * shade) | 0);
      d[i + 2] = Math.min(255, (b * shade) | 0);
    }
  }
  g.putImageData(img, 0, 0);
  return im;
}

function buildHyruleAssets() {
  const tiles = {
    grass: [makeGrass(0), makeGrass(1), makeGrass(2)],
    path: makePathTile(),
    water: [makeWater(0), makeWater(1)],
    bridge: makeBridgeTile(),
    sand: makeSandTile(),
    flower: makeFlowerTile(),
    wall: makeWallTile(),
    floor: makeFloorTile()
  };
  const trees = [makeTreeSprite(false), makeTreeSprite(true)];
  const houses = [makeHouseSprite(0), makeHouseSprite(1), makeHouseSprite(2)];
  const basePlayer = (typeof makePlayerSheet === "function") ? makePlayerSheet() : newImage(162, 90);
  const colors = ["#2f8f3a", "#c43b3b", "#2f6fbf", "#7b3bb0", "#d4a017"];
  const players = colors.map((c) => tintPlayerSheet(basePlayer, c));
  return { tiles, trees, houses, players, colors };
}

function makeMinimap(world) {
  const s = 160;
  const im = newImage(s, s);
  const g = im.getContext("2d");
  const img = g.createImageData(s, s);
  const d = img.data;
  const colors = {
    0: [50, 140, 52],
    1: [201, 163, 106],
    2: [40, 110, 190],
    3: [150, 96, 48],
    4: [230, 208, 138],
    5: [70, 160, 70],
    6: [110, 114, 122],
    7: [200, 170, 120]
  };
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const tx = ((x * world.size) / s) | 0;
      const ty = ((y * world.size) / s) | 0;
      const t = world.tiles[ty * world.size + tx];
      const c = colors[t] || colors[0];
      const o = (y * s + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = "#f2d24a";
  g.lineWidth = 2;
  for (let i = 0; i < world.villages.length; i++) {
    const v = world.villages[i];
    const px = (v.x / world.size) * s;
    const py = (v.y / world.size) * s;
    g.beginPath();
    g.arc(px, py, 3, 0, Math.PI * 2);
    g.stroke();
  }
  return im;
}

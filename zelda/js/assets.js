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
    g.fillStyle = "#f2a01a";
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

function makeTempleSprite(deityId) {
  const im = newImage(92, 96);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  const pal = {
    shiva: "#5b4a8a", kali: "#3a1848", ganesha: "#c45c26", lakshmi: "#d4a017",
    saraswati: "#d8e6f2", hanuman: "#c43b3b", krishna: "#2f6fbf"
  };
  const accent = pal[deityId] || "#c45c26";
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.beginPath();
  g.ellipse(46, 90, 34, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c9a36a";
  g.beginPath();
  g.moveTo(8, 58); g.lineTo(46, 74); g.lineTo(46, 90); g.lineTo(8, 74);
  g.closePath();
  g.fill();
  g.fillStyle = "#e8d2a8";
  g.beginPath();
  g.moveTo(84, 58); g.lineTo(46, 74); g.lineTo(46, 90); g.lineTo(84, 74);
  g.closePath();
  g.fill();
  g.fillStyle = accent;
  g.beginPath();
  g.moveTo(46, 6); g.lineTo(78, 42); g.lineTo(46, 56); g.lineTo(14, 42);
  g.closePath();
  g.fill();
  g.fillStyle = "#f2d24a";
  g.fillRect(44, 4, 4, 14);
  g.fillStyle = "#6b1d2a";
  g.fillRect(40, 72, 12, 16);
  g.fillStyle = "#8ec8e8";
  g.fillRect(18, 64, 8, 7);
  g.fillRect(66, 62, 8, 7);
  return im;
}

function makeDeityShrine(deityId) {
  const im = newImage(40, 58);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.fillStyle = "rgba(0,0,0,0.2)";
  g.beginPath();
  g.ellipse(20, 54, 12, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c9a36a";
  g.fillRect(8, 40, 24, 12);
  g.fillStyle = "#e8d2a8";
  g.fillRect(10, 38, 20, 4);
  const draw = {
    shiva() {
      g.fillStyle = "#5b4a8a";
      g.fillRect(18, 10, 4, 28);
      g.fillRect(10, 16, 20, 3);
      g.fillStyle = "#f2d24a";
      g.beginPath(); g.arc(20, 10, 5, Math.PI, 0); g.stroke();
    },
    kali() {
      g.fillStyle = "#2a1038";
      g.fillRect(16, 12, 8, 22);
      g.fillStyle = "#c43b3b";
      g.fillRect(10, 18, 20, 3);
      g.fillStyle = "#f2d24a";
      g.fillRect(18, 8, 4, 4);
    },
    ganesha() {
      g.fillStyle = "#c45c26";
      g.beginPath(); g.arc(20, 18, 8, 0, Math.PI * 2); g.fill();
      g.fillRect(16, 24, 8, 12);
      g.fillRect(12, 28, 4, 10);
      g.fillStyle = "#e8d2a8";
      g.fillRect(18, 20, 8, 3);
    },
    lakshmi() {
      g.fillStyle = "#d4a017";
      g.beginPath();
      g.moveTo(20, 10); g.lineTo(30, 28); g.lineTo(10, 28);
      g.closePath(); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(20, 30, 5, 0, Math.PI * 2); g.fill();
    },
    saraswati() {
      g.fillStyle = "#d8e6f2";
      g.fillRect(12, 14, 16, 18);
      g.strokeStyle = "#2f6fbf";
      g.beginPath(); g.moveTo(8, 32); g.quadraticCurveTo(20, 8, 32, 32); g.stroke();
    },
    hanuman() {
      g.fillStyle = "#c43b3b";
      g.fillRect(18, 12, 4, 24);
      g.fillRect(14, 32, 12, 4);
      g.fillStyle = "#8a6a38";
      g.fillRect(10, 20, 8, 6);
    },
    krishna() {
      g.fillStyle = "#2f6fbf";
      g.beginPath(); g.arc(20, 18, 7, 0, Math.PI * 2); g.fill();
      g.fillRect(16, 24, 8, 12);
      g.strokeStyle = "#f2d24a";
      g.beginPath(); g.moveTo(10, 16); g.quadraticCurveTo(6, 8, 14, 10); g.stroke();
    }
  };
  (draw[deityId] || draw.shiva)();
  return im;
}

function drawYogiFrame(g, ox, oy, dir, sub, gender, robe) {
  g.save();
  g.translate(ox, oy);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 27, 45);
  const bob = sub === 1 ? -1 : (sub === 2 ? 1 : 0);
  const swing = sub === 1 ? 2 : (sub === 2 ? -2 : 0);
  const skin = "#e0b089";
  const hair = gender === "female" ? "#2a1810" : "#1a120c";
  g.fillStyle = "rgba(0,0,0,.28)";
  g.fillRect(4, 41 + bob, 19, 3);
  g.fillStyle = robe;
  if (gender === "female") {
    g.fillRect(7, 22 + bob, 13, 16);
    g.fillRect(8 - swing, 34 + bob, 5, 8);
    g.fillRect(14 + swing, 34 + bob, 5, 8);
  } else {
    g.fillRect(7, 28 + bob, 13, 8);
    g.fillRect(8 - swing, 34 + bob, 4, 8);
    g.fillRect(15 + swing, 34 + bob, 4, 8);
    g.fillStyle = skin;
    g.fillRect(8, 21 + bob, 11, 8);
    g.fillStyle = robe;
  }
  g.fillStyle = skin;
  if (dir === 0) {
    g.fillRect(10, 14 + bob, 7, 8);
    g.fillStyle = hair;
    g.fillRect(9, 8 + bob, 9, 8);
  } else if (dir === 2) {
    g.fillRect(9, 12 + bob, 9, 10);
    g.fillStyle = hair;
    g.fillRect(9, 8 + bob, 9, 6);
    g.fillStyle = "#23303a";
    g.fillRect(11, 15 + bob, 2, 2);
    g.fillRect(15, 15 + bob, 2, 2);
    g.fillStyle = "#7a3b34";
    g.fillRect(12, 19 + bob, 4, 1);
    if (gender === "female") {
      g.fillStyle = "#c43b3b";
      g.fillRect(13, 13 + bob, 2, 2);
    }
  } else {
    const faceX = dir === 1 ? 13 : 6;
    g.fillRect(faceX, 13 + bob, 8, 10);
    g.fillStyle = hair;
    g.fillRect(dir === 1 ? 6 : 8, 8 + bob, 14, 8);
    g.fillStyle = "#23303a";
    g.fillRect(dir === 1 ? 17 : 8, 15 + bob, 2, 2);
  }
  if (gender === "male") {
    g.fillStyle = hair;
    g.fillRect(12, 6 + bob, 3, 4);
  } else {
    g.fillStyle = hair;
    g.fillRect(6, 16 + bob, 3, 10);
    g.fillRect(18, 16 + bob, 3, 10);
  }
  g.restore();
}

function makeYogiSheet(gender, robe) {
  const im = newImage(162, 90);
  const g = im.getContext("2d");
  for (let dir = 0; dir < 4; dir++) {
    for (let sub = 0; sub < 3; sub++) {
      const xframe = dir * 3 + sub;
      const col = xframe >> 1, row = xframe & 1;
      drawYogiFrame(g, col * 27, row * 45, dir, sub, gender, robe);
    }
  }
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
  const robes = ["#c45c26", "#6b1d2a", "#2f6fbf", "#d4a017", "#f4e6c5"];
  const yogis = {
    male: robes.map((c) => makeYogiSheet("male", c)),
    female: robes.map((c) => makeYogiSheet("female", c))
  };
  const basePlayer = yogis.male[0];
  const colors = robes;
  const players = yogis.male;
  const deityIds = ["shiva", "kali", "ganesha", "lakshmi", "saraswati", "hanuman", "krishna"];
  const temples = {};
  const shrines = {};
  for (let i = 0; i < deityIds.length; i++) {
    temples[deityIds[i]] = makeTempleSprite(deityIds[i]);
    shrines[deityIds[i]] = makeDeityShrine(deityIds[i]);
  }
  return { tiles, trees, houses, players, colors, yogis, temples, shrines };
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

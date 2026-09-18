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

function shadeHex(hex, factor) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * factor)));
  return "#" + [f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function isoPt(x, y) {
  return [Math.round(x), Math.round(y)];
}

function lerpPt(a, b, t) {
  return isoPt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t);
}

function fillPoly(g, pts, fill) {
  if (!pts.length) return;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

function expandPoly(pts, ox, oy, px) {
  return pts.map((p) => {
    const dx = p[0] - ox;
    const dy = p[1] - oy;
    const len = Math.hypot(dx, dy) || 1;
    return isoPt(p[0] + (dx / len) * px, p[1] + (dy / len) * px);
  });
}

/* Opaque silhouette first, then faces. No strokes, no axis-aligned holes. */
function drawIsoVolume(g, cx, cy, hw, hh, h, left, right, top) {
  const N = isoPt(cx, cy - hh);
  const E = isoPt(cx + hw, cy);
  const S = isoPt(cx, cy + hh);
  const W = isoPt(cx - hw, cy);
  const Nb = isoPt(N[0], N[1] + h);
  const Eb = isoPt(E[0], E[1] + h);
  const Sb = isoPt(S[0], S[1] + h);
  const Wb = isoPt(W[0], W[1] + h);
  const sil = expandPoly([N, E, Eb, Sb, Wb, W], cx, cy + (h >> 1), 1.2);
  fillPoly(g, sil, shadeHex(left, 0.42));
  fillPoly(g, [W, S, Sb, Wb], left);
  fillPoly(g, [S, E, Eb, Sb], right);
  fillPoly(g, [N, E, S, W], top);
  return { N, E, S, W, Nb, Eb, Sb, Wb, cx, cy, hw, hh, h, left, right, top };
}

function drawIsoCourses(g, vol, n, leftInk, rightInk) {
  for (let i = 1; i < n; i++) {
    const y = (vol.h * i / n) | 0;
    const W = [vol.W[0], vol.W[1] + y];
    const S = [vol.S[0], vol.S[1] + y];
    const E = [vol.E[0], vol.E[1] + y];
    fillPoly(g, [W, S, [S[0], S[1] + 1], [W[0], W[1] + 1]], leftInk);
    fillPoly(g, [S, E, [E[0], E[1] + 1], [S[0], S[1] + 1]], rightInk);
  }
}

function faceQuad(vol, face, u0, u1, v0, v1) {
  const topA = face === "L" ? lerpPt(vol.W, vol.S, u0) : lerpPt(vol.E, vol.S, u0);
  const topB = face === "L" ? lerpPt(vol.W, vol.S, u1) : lerpPt(vol.E, vol.S, u1);
  const A = isoPt(topA[0], topA[1] + vol.h * v0);
  const B = isoPt(topB[0], topB[1] + vol.h * v0);
  const C = isoPt(topB[0], topB[1] + vol.h * v1);
  const D = isoPt(topA[0], topA[1] + vol.h * v1);
  return [A, B, C, D];
}

function drawIsoPanel(g, vol, face, u0, u1, v0, v1, fill) {
  fillPoly(g, faceQuad(vol, face, u0, u1, v0, v1), fill);
}

function drawPyramidRoof(g, cx, cy, hw, hh, rise, color) {
  const N = isoPt(cx, cy - hh);
  const E = isoPt(cx + hw, cy);
  const S = isoPt(cx, cy + hh);
  const W = isoPt(cx - hw, cy);
  const P = isoPt(cx, cy - rise);
  fillPoly(g, expandPoly([P, E, S, W], cx, cy - rise * 0.35, 1.2), shadeHex(color, 0.38));
  fillPoly(g, [P, W, S], shadeHex(color, 0.72));
  fillPoly(g, [P, S, E], shadeHex(color, 1.02));
  fillPoly(g, [P, E, N], shadeHex(color, 1.14));
  fillPoly(g, [P, N, W], shadeHex(color, 0.88));
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const k = 1 - t;
    const y = cy - rise * t;
    const dN = isoPt(cx, y - hh * k);
    const dE = isoPt(cx + hw * k, y);
    const dS = isoPt(cx, y + hh * k);
    const dW = isoPt(cx - hw * k, y);
    fillPoly(g, [dW, dS, isoPt(dS[0], dS[1] + 1), isoPt(dW[0], dW[1] + 1)], shadeHex(color, 0.62));
    fillPoly(g, [dS, dE, isoPt(dE[0], dE[1] + 1), isoPt(dS[0], dS[1] + 1)], shadeHex(color, 0.92));
    fillPoly(g, [dN, dE, isoPt(dE[0], dE[1] + 1), isoPt(dN[0], dN[1] + 1)], shadeHex(color, 1.06));
  }
  return { N, E, S, W, P };
}

function nagaraWidth(t, baseHw) {
  return baseHw * (1 - Math.pow(Math.min(1, Math.max(0, t)), 2.45));
}

function drawShikharaMass(g, cx, baseCy, baseHw, height, fill) {
  const steps = 18;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const hw = Math.max(2, nagaraWidth(t, baseHw)) + 2;
    pts.push(isoPt(cx + hw, baseCy - height * t));
  }
  pts.push(isoPt(cx, baseCy + baseHw * 0.5 + 3));
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const hw = Math.max(2, nagaraWidth(t, baseHw)) + 2;
    pts.push(isoPt(cx - hw, baseCy - height * t));
  }
  fillPoly(g, pts, fill);
}

function drawShikhara(g, cx, baseCy, baseHw, height, stone, accent) {
  drawShikharaMass(g, cx, baseCy, baseHw, height, shadeHex(stone, 0.4));
  const steps = Math.max(16, (height / 3) | 0);
  const band = Math.ceil(height / steps) + 2;
  let top = null;
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps;
    const hw = Math.max(3, Math.round(nagaraWidth(t, baseHw)));
    const hh = Math.max(2, Math.round(hw * 0.5));
    const cy = baseCy - Math.round(height * t);
    const shade = 0.7 + t * 0.24;
    top = drawIsoVolume(g, cx, cy, hw, hh, band,
      shadeHex(stone, shade), shadeHex(stone, shade + 0.26),
      i === steps - 1 ? accent : shadeHex(stone, 1.1));
    if (i % 4 === 3) {
      drawIsoVolume(g, cx, cy + 1, hw + 2, Math.max(2, hh + 1), 3,
        shadeHex(accent, 0.62), shadeHex(accent, 0.88), shadeHex(stone, 1.16));
    } else if (i % 4 === 1 && hw > 7) {
      drawIsoPanel(g, top, "L", 0.38, 0.62, 0.15, 0.7, shadeHex(accent, 0.58));
      drawIsoPanel(g, top, "R", 0.38, 0.62, 0.15, 0.7, shadeHex(accent, 0.72));
    }
  }
  return top;
}

function drawHipRoof(g, cx, cy, hw, hh, rise, color) {
  const N = isoPt(cx, cy - hh);
  const E = isoPt(cx + hw, cy);
  const S = isoPt(cx, cy + hh);
  const W = isoPt(cx - hw, cy);
  const rw = Math.max(3, hw * 0.2);
  const rh = Math.max(2, hh * 0.2);
  const RN = isoPt(cx, cy - rise - rh);
  const RS = isoPt(cx, cy - rise + rh);
  const RE = isoPt(cx + rw, cy - rise);
  const RW = isoPt(cx - rw, cy - rise);
  fillPoly(g, expandPoly([RN, E, S, W], cx, cy - rise * 0.3, 1.3), shadeHex(color, 0.36));
  fillPoly(g, [RW, RS, S, W], shadeHex(color, 0.7));
  fillPoly(g, [RS, RE, E, S], shadeHex(color, 1.02));
  fillPoly(g, [RE, RN, N, E], shadeHex(color, 1.14));
  fillPoly(g, [RN, RW, W, N], shadeHex(color, 0.86));
  fillPoly(g, [RN, RE, RS, RW], shadeHex(color, 1.18));
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    const k = 1 - t * 0.82;
    const y = cy - rise * t;
    const dE = isoPt(cx + hw * k, y);
    const dS = isoPt(cx, y + hh * k);
    const dW = isoPt(cx - hw * k, y);
    fillPoly(g, [dW, dS, isoPt(dS[0], dS[1] + 1), isoPt(dW[0], dW[1] + 1)], shadeHex(color, 0.58));
    fillPoly(g, [dS, dE, isoPt(dE[0], dE[1] + 1), isoPt(dS[0], dS[1] + 1)], shadeHex(color, 0.9));
  }
}

function drawAmalaka(g, cx, cy, hw, gold) {
  const hh = Math.max(3, Math.round(hw * 0.42));
  const vol = drawIsoVolume(g, cx, cy, hw, hh, 5, shadeHex(gold, 0.72), shadeHex(gold, 1.05), shadeHex(gold, 1.18));
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    drawIsoPanel(g, vol, "L", t - 0.06, t + 0.04, 0.1, 0.9, shadeHex(gold, 0.55));
    drawIsoPanel(g, vol, "R", t - 0.06, t + 0.04, 0.1, 0.9, shadeHex(gold, 0.8));
  }
  return vol;
}

function drawKalasha(g, cx, cy, gold, spike) {
  fillPoly(g, [
    isoPt(cx - 5, cy + 4), isoPt(cx + 5, cy + 4),
    isoPt(cx + 4, cy), isoPt(cx - 4, cy)
  ], shadeHex(gold, 0.85));
  fillPoly(g, [
    isoPt(cx - 4, cy), isoPt(cx + 4, cy),
    isoPt(cx + 3, cy - 5), isoPt(cx - 3, cy - 5)
  ], gold);
  fillPoly(g, [
    isoPt(cx - 2, cy - 5), isoPt(cx + 2, cy - 5),
    isoPt(cx + 1, cy - 8), isoPt(cx - 1, cy - 8)
  ], shadeHex(gold, 1.15));
  fillPoly(g, [
    isoPt(cx - 1, cy - 8), isoPt(cx + 1, cy - 8),
    isoPt(cx, cy - 16)
  ], spike || gold);
}

const TEMPLE_THEME = {
  shiva: {
    stone: "#8a8496", accent: "#5b4a8a", gold: "#e6c25a",
    door: "#3a2a55", flag: "#c8d4e8"
  },
  kali: {
    stone: "#4a3654", accent: "#8a1a2a", gold: "#d4a017",
    door: "#2a0814", flag: "#c43b3b"
  },
  ganesha: {
    stone: "#c9894a", accent: "#c45c26", gold: "#f2d24a",
    door: "#6b2e12", flag: "#e08a1e"
  },
  lakshmi: {
    stone: "#e6c9a4", accent: "#c45a6e", gold: "#f0d060",
    door: "#8a3a48", flag: "#f2b6c2"
  },
  saraswati: {
    stone: "#dce4ee", accent: "#4a7cb8", gold: "#f2d24a",
    door: "#2f4f7a", flag: "#d8e6f2"
  },
  hanuman: {
    stone: "#b85a3a", accent: "#c43b3b", gold: "#f0c24a",
    door: "#6b1d2a", flag: "#e08a1e"
  },
  krishna: {
    stone: "#4a6ea8", accent: "#2a4a7a", gold: "#f2d24a",
    door: "#1a2e55", flag: "#3d8a3a"
  }
};

function drawTempleOrnament(g, deityId, cx, peakY, mandapa) {
  if (deityId === "shiva") {
    g.fillStyle = "#e6c25a";
    g.fillRect(cx - 1, peakY - 22, 2, 10);
    g.fillRect(cx - 5, peakY - 18, 10, 2);
    g.fillRect(cx - 5, peakY - 20, 2, 4);
    g.fillRect(cx + 3, peakY - 20, 2, 4);
  } else if (deityId === "kali") {
    drawIsoPanel(g, mandapa, "R", 0.28, 0.72, 0.18, 0.42, "#c43b3b");
  } else if (deityId === "ganesha") {
    fillPoly(g, [
      isoPt(cx - 7, peakY - 10), isoPt(cx - 2, peakY - 16), isoPt(cx + 2, peakY - 10)
    ], "#f2d24a");
  } else if (deityId === "lakshmi") {
    for (let i = 0; i < 4; i++) {
      const a = (i - 1.5) * 6;
      fillPoly(g, [
        isoPt(cx + a, peakY - 8), isoPt(cx + a + 3, peakY - 4), isoPt(cx + a - 3, peakY - 4)
      ], "#f0d060");
    }
  } else if (deityId === "saraswati") {
    g.fillStyle = "#4a7cb8";
    g.fillRect(cx - 8, peakY - 12, 16, 2);
    g.fillRect(cx - 1, peakY - 16, 2, 8);
  } else if (deityId === "hanuman") {
    g.fillStyle = "#e08a1e";
    g.fillRect(cx + 4, peakY - 20, 2, 14);
    fillPoly(g, [
      isoPt(cx + 6, peakY - 20), isoPt(cx + 16, peakY - 16), isoPt(cx + 6, peakY - 12)
    ], "#c43b3b");
  } else if (deityId === "krishna") {
    g.fillStyle = "#3d8a3a";
    g.fillRect(cx + 2, peakY - 18, 2, 8);
    fillPoly(g, [
      isoPt(cx + 3, peakY - 18), isoPt(cx + 10, peakY - 22), isoPt(cx + 8, peakY - 14)
    ], "#2a6b3a");
  }
}

function makeHouseSprite(roof) {
  const im = newImage(104, 114);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  const roofs = ["#b84328", "#c47a2a", "#8a7a38"];
  const roofC = roofs[roof % 3];
  const mud = roof === 1 ? "#d2b07a" : (roof === 2 ? "#c4a060" : "#d8bc88");
  const stone = "#7a6240";

  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath();
  g.ellipse(52, 107, 40, 6, 0, 0, Math.PI * 2);
  g.fill();

  fillPoly(g, [
    isoPt(52, 34), isoPt(92, 62), isoPt(94, 88),
    isoPt(52, 110), isoPt(10, 88), isoPt(12, 62)
  ], shadeHex(mud, 0.38));

  const plinth = drawIsoVolume(g, 52, 86, 40, 20, 10,
    shadeHex(stone, 0.7), shadeHex(stone, 0.94), shadeHex(stone, 1.08));
  drawIsoCourses(g, plinth, 2, shadeHex(stone, 0.58), shadeHex(stone, 0.78));

  const hall = drawIsoVolume(g, 52, 64, 32, 16, 24,
    shadeHex(mud, 0.76), shadeHex(mud, 1.02), shadeHex(mud, 1.12));
  drawIsoCourses(g, hall, 3, shadeHex(mud, 0.68), shadeHex(mud, 0.86));
  drawIsoPanel(g, hall, "L", 0.16, 0.5, 0.2, 0.62, shadeHex("#5a4030", 0.9));
  drawIsoPanel(g, hall, "L", 0.22, 0.44, 0.28, 0.54, shadeHex("#6a8a70", 0.85));
  drawIsoPanel(g, hall, "L", 0.3, 0.36, 0.28, 0.54, "#3a3020");
  drawIsoPanel(g, hall, "L", 0.22, 0.44, 0.38, 0.42, "#3a3020");

  drawHipRoof(g, 52, 64, 38, 18, 22, roofC);
  drawIsoVolume(g, 52, 66, 38, 18, 3,
    shadeHex(roofC, 0.52), shadeHex(roofC, 0.72), shadeHex(roofC, 0.82));

  const porch = drawIsoVolume(g, 52, 80, 18, 9, 14,
    shadeHex(mud, 0.68), shadeHex(mud, 0.94), shadeHex("#b08950", 1.02));
  drawIsoPanel(g, porch, "R", 0.18, 0.82, 0.16, 0.95, "#4a2814");
  drawIsoPanel(g, porch, "R", 0.3, 0.7, 0.28, 0.95, "#2e180c");
  drawIsoPanel(g, porch, "R", 0.12, 0.88, 0.1, 0.22, "#c4a060");
  drawIsoPanel(g, porch, "L", 0.55, 0.86, 0.22, 0.72, "#4a2814");
  drawIsoVolume(g, 40, 74, 3, 2, 16, "#6a4424", "#a07840", "#d2aa70");
  drawIsoVolume(g, 64, 74, 3, 2, 16, "#6a4424", "#a07840", "#d2aa70");

  g.fillStyle = "#5a3318";
  g.fillRect(71, 40, 2, 12);
  fillPoly(g, [isoPt(73, 40), isoPt(82, 36), isoPt(73, 46)], "#e08a1e");
  return im;
}

function makeTempleSprite(deityId) {
  const im = newImage(148, 176);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  const theme = TEMPLE_THEME[deityId] || TEMPLE_THEME.ganesha;
  const stone = theme.stone;
  const accent = theme.accent;

  g.fillStyle = "rgba(0,0,0,0.3)";
  g.beginPath();
  g.ellipse(74, 168, 56, 7, 0, 0, Math.PI * 2);
  g.fill();

  fillPoly(g, [
    isoPt(74, 14), isoPt(88, 28), isoPt(108, 70), isoPt(130, 132),
    isoPt(130, 148), isoPt(74, 170), isoPt(18, 148), isoPt(18, 132),
    isoPt(40, 70), isoPt(60, 28)
  ], shadeHex(stone, 0.36));
  drawShikharaMass(g, 74, 108, 28, 72, shadeHex(stone, 0.38));

  const jagati = drawIsoVolume(g, 74, 132, 56, 28, 12,
    shadeHex(stone, 0.62), shadeHex(stone, 0.88), shadeHex(stone, 1.08));
  drawIsoCourses(g, jagati, 3, shadeHex(stone, 0.5), shadeHex(stone, 0.72));
  for (let i = 0; i < 6; i++) {
    const t = (i + 0.5) / 6;
    drawIsoPanel(g, jagati, "L", t - 0.05, t + 0.03, 0.15, 0.85, theme.gold);
    drawIsoPanel(g, jagati, "R", t - 0.05, t + 0.03, 0.15, 0.85, shadeHex(theme.gold, 0.85));
  }

  drawIsoVolume(g, 50, 124, 11, 6, 20, shadeHex(stone, 0.7), shadeHex(stone, 0.92), shadeHex(accent, 0.95));
  drawShikhara(g, 50, 124, 10, 34, shadeHex(stone, 0.95), accent);
  drawIsoVolume(g, 98, 124, 11, 6, 20, shadeHex(stone, 0.7), shadeHex(stone, 0.92), shadeHex(accent, 0.95));
  drawShikhara(g, 98, 124, 10, 34, shadeHex(stone, 0.95), accent);

  const garbha = drawIsoVolume(g, 74, 108, 30, 15, 26,
    shadeHex(stone, 0.74), shadeHex(stone, 1.0), shadeHex(stone, 1.12));
  drawIsoCourses(g, garbha, 4, shadeHex(stone, 0.64), shadeHex(stone, 0.86));
  drawIsoPanel(g, garbha, "L", 0.12, 0.88, 0.08, 0.2, theme.gold);
  drawIsoPanel(g, garbha, "R", 0.12, 0.88, 0.08, 0.2, shadeHex(theme.gold, 0.85));

  const cap = drawShikhara(g, 74, 108, 26, 70, stone, accent);
  const amalakaY = cap ? cap.cy - 3 : 36;
  drawAmalaka(g, 74, amalakaY, 11, theme.gold);
  drawKalasha(g, 74, amalakaY - 6, theme.gold, theme.flag);

  const mandapa = drawIsoVolume(g, 74, 128, 22, 11, 18,
    shadeHex(stone, 0.7), shadeHex(stone, 0.96), shadeHex(theme.gold, 0.95));
  drawIsoCourses(g, mandapa, 3, shadeHex(stone, 0.6), shadeHex(stone, 0.82));
  drawPyramidRoof(g, 74, 128, 24, 12, 16, accent);

  drawIsoVolume(g, 63, 126, 3, 2, 16, "#8a6238", "#c4a060", "#e6c88a");
  drawIsoVolume(g, 85, 126, 3, 2, 16, "#8a6238", "#c4a060", "#e6c88a");

  const steps = drawIsoVolume(g, 74, 146, 14, 7, 8,
    shadeHex(stone, 0.58), shadeHex(stone, 0.82), shadeHex(stone, 1.05));
  drawIsoCourses(g, steps, 3, shadeHex(stone, 0.48), shadeHex(stone, 0.7));

  drawIsoPanel(g, mandapa, "R", 0.18, 0.82, 0.22, 0.95, theme.door);
  drawIsoPanel(g, mandapa, "R", 0.28, 0.72, 0.32, 0.95, shadeHex(theme.door, 0.7));
  drawIsoPanel(g, mandapa, "L", 0.55, 0.9, 0.28, 0.85, shadeHex(theme.door, 0.85));
  drawIsoPanel(g, mandapa, "R", 0.12, 0.88, 0.12, 0.22, theme.gold);

  drawIsoPanel(g, garbha, "L", 0.28, 0.72, 0.28, 0.72, shadeHex(accent, 0.55));
  drawIsoPanel(g, garbha, "R", 0.2, 0.55, 0.3, 0.7, shadeHex("#6a8aa0", 0.75));

  drawTempleOrnament(g, deityId, 74, amalakaY - 8, mandapa);
  return im;
}

function makeDeityShrine(deityId) {
  const im = newImage(52, 76);
  const g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  const theme = TEMPLE_THEME[deityId] || TEMPLE_THEME.shiva;

  g.fillStyle = "rgba(0,0,0,0.24)";
  g.beginPath();
  g.ellipse(26, 72, 16, 3, 0, 0, Math.PI * 2);
  g.fill();

  const base = drawIsoVolume(g, 26, 56, 16, 8, 8,
    shadeHex(theme.stone, 0.68), shadeHex(theme.stone, 0.92), shadeHex(theme.stone, 1.08));
  const cella = drawIsoVolume(g, 26, 42, 11, 6, 14,
    shadeHex(theme.stone, 0.74), shadeHex(theme.stone, 1.0), shadeHex(theme.stone, 1.12));
  drawIsoPanel(g, cella, "R", 0.2, 0.8, 0.2, 0.9, theme.door);
  drawIsoPanel(g, cella, "R", 0.32, 0.68, 0.32, 0.78, theme.accent);
  drawShikhara(g, 26, 42, 10, 24, theme.stone, theme.accent);
  drawAmalaka(g, 26, 16, 6, theme.gold);
  drawKalasha(g, 26, 12, theme.gold, theme.flag);
  drawIsoPanel(g, base, "L", 0.2, 0.8, 0.2, 0.8, theme.gold);
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

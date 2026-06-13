/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * runtime.js
  ----------
  The original PushBox was a MIDP-1.0 MIDlet.  It rendered through the
  javax.microedition.lcdui.Graphics API and loaded all of its artwork from a
  packed binary resource ("a.bin").  That resource is not part of this
  repository any more, so this file does two things:

    1. It provides a tiny shim that emulates just the slice of the lcdui
       Graphics / Image API that the game actually uses, drawing onto an
       HTML5 <canvas>.  This keeps PushBoxCanvas.js / Sprite.js almost
       identical to the 2005 Java source (same method names, same anchors,
       same setClip/translate/drawImage calls).

    2. It regenerates the lost sprite & tile bundle procedurally so the game
       is playable again.  buildAssets() returns the very same data[] array
       (and indices) the original loadImagesFromBundle("a.bin") produced.
*/

"use strict";

/* ---- MIDP anchor constants (Graphics.TOP | Graphics.LEFT) ---------------- */
var Anchor = { TOP: 0, LEFT: 0, HCENTER: 0, VCENTER: 0 };

/* ---- lcdui.Canvas game-action constants (used by keyPressed switch) ------ */
var Canvas = { UP: 1, DOWN: 6, LEFT: 2, RIGHT: 5, FIRE: 8 };

/* ---- Graphics: a minimal lcdui.Graphics emulation ------------------------ */
/* Clipping has REPLACE semantics (like MIDP), translate accumulates an
   offset, and drawImage/fillRect are clipped manually so the sprite-sheet
   frame clipping the game relies on keeps working. */
class Graphics {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.transX = 0;
    this.transY = 0;
    this.clipX = 0; this.clipY = 0; this.clipW = width; this.clipH = height;
    this.color = "#000000";
  }

  setColor(r, g, b) {
    this.color = "rgb(" + (r & 255) + "," + (g & 255) + "," + (b & 255) + ")";
  }

  translate(dx, dy) { this.transX += dx; this.transY += dy; }

  /* setClip takes user-space coords; we store the clip in device pixels. */
  setClip(x, y, w, h) {
    const dx = x + this.transX, dy = y + this.transY;
    const x0 = Math.max(0, dx), y0 = Math.max(0, dy);
    const x1 = Math.min(this.width, dx + w), y1 = Math.min(this.height, dy + h);
    this.clipX = x0; this.clipY = y0;
    this.clipW = Math.max(0, x1 - x0); this.clipH = Math.max(0, y1 - y0);
  }

  _isect(dx, dy, dw, dh) {
    const x0 = Math.max(this.clipX, dx);
    const y0 = Math.max(this.clipY, dy);
    const x1 = Math.min(this.clipX + this.clipW, dx + dw);
    const y1 = Math.min(this.clipY + this.clipH, dy + dh);
    if (x1 <= x0 || y1 <= y0) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  fillRect(x, y, w, h) {
    const r = this._isect(x + this.transX, y + this.transY, w, h);
    if (!r) return;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  _bar(x, y, w, h) {
    const r = this._isect(x + this.transX, y + this.transY, w, h);
    if (!r) return;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(r.x, r.y, r.w, r.h);
  }

  /* MIDP drawRect draws an outline of (w+1) x (h+1) pixels. */
  drawRect(x, y, w, h) {
    this._bar(x, y, w + 1, 1);
    this._bar(x, y + h, w + 1, 1);
    this._bar(x, y, 1, h + 1);
    this._bar(x + w, y, 1, h + 1);
  }

  drawImage(img, x, y, anchor) {
    const dx = x + this.transX, dy = y + this.transY;
    const r = this._isect(dx, dy, img.width, img.height);
    if (!r) return;
    this.ctx.drawImage(img, r.x - dx, r.y - dy, r.w, r.h, r.x, r.y, r.w, r.h);
  }
}
Graphics.TOP = 0;
Graphics.LEFT = 0;

/* ---- Image factory: offscreen canvas with the Java Image API we use ------ */
function newImage(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  // emulate Image.getWidth()/getHeight() used by drawString()
  c.getWidth = function () { return this.width; };
  c.getHeight = function () { return this.height; };
  return c;
}

/* ==========================================================================
   Procedural regeneration of the lost "a.bin" art bundle.
   Index layout matches the original loadImagesFromBundle()/load() wiring:

     data[0]       floor texture (tiled background)
     data[1]       title splash
     data[2]       crate sprite               (45x44)
     data[3]       wall block tile            (48x48 isometric cube)
     data[4]       crate-on-target sprite     (45x44)
     data[5]       player sprite sheet (162x90, 12 frames)
     data[6..41]   font glyphs (see load(): FONT_pics[3..38])
     data[42..45]  "alex" talking avatar frames
     data[46..48]  font glyphs A,B,C  (see load(): FONT_pics[0..2])
     data[49..52]  win banner animation
     data[54]      target tile               (48x24 isometric diamond)
   ========================================================================== */

const PALETTE = {
  floor:   "#274058",
  floorHi: "#31506b",
  grid:    "#1c3346",
};

function buildAssets(onProgress) {
  const data = new Array(55).fill(null);
  let progress = 0;
  const tick = () => { progress++; if (onProgress) onProgress(progress); };

  data[0]  = makeFloorTexture();           tick();
  data[1]  = makeTitle();                  tick();
  data[2]  = makeCrate(false);             tick();
  data[3]  = makeWall();                   tick();
  data[4]  = makeCrate(true);              tick();
  data[5]  = makePlayerSheet();            tick();
  data[54] = makeTargetTile();             tick();

  // Font glyphs --------------------------------------------------------------
  // load() wiring: FONT_pics[0..2]=data[46..48]=A,B,C ; FONT_pics[3..38]=data[6..41]
  // and drawString() indexes FONT_pics as: [0..25]=A..Z [26..35]=0..9 [36]=. [37]=! [38]=?
  // => data[46]=A data[47]=B data[48]=C, data[6..28]=D..Z, data[29..38]=0..9,
  //    data[39]=. data[40]=! data[41]=?
  data[46] = makeGlyph("A"); tick();
  data[47] = makeGlyph("B"); tick();
  data[48] = makeGlyph("C"); tick();
  const DZ = "DEFGHIJKLMNOPQRSTUVWXYZ"; // 23 letters, data[6..28]
  for (let i = 0; i < DZ.length; i++) { data[6 + i] = makeGlyph(DZ[i]); tick(); }
  for (let d = 0; d < 10; d++) { data[29 + d] = makeGlyph(String(d)); tick(); }
  data[39] = makeGlyph("."); tick();
  data[40] = makeGlyph("!"); tick();
  data[41] = makeGlyph("?"); tick();

  // "alex" avatar (developer mascot) frames ----------------------------------
  data[42] = makeAvatar(0); tick();
  data[43] = makeAvatar(1); tick();
  data[44] = makeAvatar(2); tick();
  data[45] = makeAvatar(3); tick();

  // win banner frames --------------------------------------------------------
  for (let f = 0; f < 4; f++) { data[49 + f] = makeWinFrame(f); tick(); }

  return data;
}

/* ---- individual asset painters ------------------------------------------- */

function makeFloorTexture() {
  const w = 48, h = 48, im = newImage(w, h), g = im.getContext("2d");
  g.fillStyle = PALETTE.floor;
  g.fillRect(0, 0, w, h);
  // faint isometric diamond lattice (period 48x48 so it tiles seamlessly)
  g.strokeStyle = PALETTE.grid;
  g.lineWidth = 1;
  for (let c = -48; c <= 96; c += 24) {
    g.beginPath();
    g.moveTo(-4, 0.5 * (-4) + c); g.lineTo(w + 4, 0.5 * (w + 4) + c); g.stroke();   // slope +1/2
    g.beginPath();
    g.moveTo(-4, -0.5 * (-4) + c); g.lineTo(w + 4, -0.5 * (w + 4) + c); g.stroke(); // slope -1/2
  }
  return im;
}

// Draws an isometric diamond path of full width 48 / height 24 with its
// top-left corner at (ox, oy).
function diamondPath(g, ox, oy) {
  g.beginPath();
  g.moveTo(ox + 24, oy + 0);
  g.lineTo(ox + 48, oy + 12);
  g.lineTo(ox + 24, oy + 24);
  g.lineTo(ox + 0, oy + 12);
  g.closePath();
}

function makeTargetTile() {
  const im = newImage(48, 24), g = im.getContext("2d");
  diamondPath(g, 0, 0);
  g.fillStyle = "#1f6fb2";
  g.fill();
  g.strokeStyle = "#9fd3ff";
  g.lineWidth = 1;
  g.stroke();
  // bullseye marker
  diamondPath(g, 12, 6); // half-size-ish inner diamond
  g.fillStyle = "rgba(202,233,251,.85)";
  g.beginPath();
  g.moveTo(24, 6); g.lineTo(36, 12); g.lineTo(24, 18); g.lineTo(12, 12); g.closePath();
  g.fillStyle = "#cae9fb";
  g.fill();
  g.beginPath();
  g.moveTo(24, 9); g.lineTo(31, 12); g.lineTo(24, 15); g.lineTo(17, 12); g.closePath();
  g.fillStyle = "#1a5c97";
  g.fill();
  return im;
}

function makeWall() {
  // 48x48: top face diamond at y0..24, two front faces at y24..48
  const im = newImage(48, 48), g = im.getContext("2d");
  // left front face
  g.beginPath();
  g.moveTo(0, 12); g.lineTo(24, 24); g.lineTo(24, 48); g.lineTo(0, 36); g.closePath();
  g.fillStyle = "#2c4a66"; g.fill();
  // right front face
  g.beginPath();
  g.moveTo(48, 12); g.lineTo(24, 24); g.lineTo(24, 48); g.lineTo(48, 36); g.closePath();
  g.fillStyle = "#21384e"; g.fill();
  // top face
  diamondPath(g, 0, 0);
  g.fillStyle = "#5f87a8"; g.fill();
  g.strokeStyle = "#84aacb"; g.lineWidth = 1; g.stroke();
  // brick lines on top
  g.strokeStyle = "rgba(15,30,45,.35)";
  g.beginPath(); g.moveTo(24, 6); g.lineTo(36, 12); g.lineTo(24, 18); g.lineTo(12, 12); g.closePath(); g.stroke();
  return im;
}

function makeCrate(onTarget) {
  // 45x44 — an isometric crate sitting on a tile.  Anchor offset (-21,-32)
  // is applied by the Sprite, so we draw the crate body in the lower part.
  const im = newImage(45, 44), g = im.getContext("2d");
  const baseL = onTarget ? "#2f7d52" : "#7a5a32";
  const baseR = onTarget ? "#246340" : "#5f4526";
  const top   = onTarget ? "#49b377" : "#a37a45";
  const edge  = onTarget ? "#bff3d4" : "#d8b277";
  const cx = 22;
  // top of the crate is a diamond (full width ~44, height ~22)
  const topY = 4;
  // left face
  g.beginPath();
  g.moveTo(0, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(cx, 43); g.lineTo(0, 32); g.closePath();
  g.fillStyle = baseL; g.fill();
  // right face
  g.beginPath();
  g.moveTo(44, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(cx, 43); g.lineTo(44, 32); g.closePath();
  g.fillStyle = baseR; g.fill();
  // top face
  g.beginPath();
  g.moveTo(cx, topY); g.lineTo(44, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(0, topY + 11); g.closePath();
  g.fillStyle = top; g.fill();
  // plank/edge highlights
  g.strokeStyle = edge; g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.moveTo(cx, topY); g.lineTo(cx, topY + 22);
  g.moveTo(0, topY + 11); g.lineTo(44, topY + 11);
  g.stroke();
  // cross brace on faces
  g.strokeStyle = "rgba(0,0,0,.25)";
  g.beginPath();
  g.moveTo(2, topY + 13); g.lineTo(cx - 2, 41);
  g.moveTo(43, topY + 13); g.lineTo(cx + 2, 41);
  g.stroke();
  return im;
}

/* Player sprite sheet: 162x90, 12 frames in a 6col x 2row grid.
   For xframe in 0..11: col = xframe>>1, row = xframe&1.
   xframe = dir*3 + sub, dir: 0=N 1=E 2=S 3=W, sub: 0=stand 1=step 2=step. */
function makePlayerSheet() {
  const im = newImage(162, 90), g = im.getContext("2d");
  for (let dir = 0; dir < 4; dir++) {
    for (let sub = 0; sub < 3; sub++) {
      const xframe = dir * 3 + sub;
      const col = xframe >> 1, row = xframe & 1;
      drawSmurf(g, col * 27, row * 45, dir, sub);
    }
  }
  return im;
}

// Blue smurf with white cap inside a 27x45 cell, feet near the bottom.
function drawSmurf(g, ox, oy, dir, sub) {
  g.save();
  g.translate(ox, oy);
  const bob = sub === 1 ? -1 : (sub === 2 ? 1 : 0);
  const legSwing = sub === 1 ? 2 : (sub === 2 ? -2 : 0);
  const blue = "#3d7dd4";
  const blueDark = "#2f66b0";
  const white = "#f8f8f8";

  // shadow
  g.fillStyle = "rgba(0,0,0,.28)";
  g.beginPath(); g.ellipse(13, 43, 9, 3, 0, 0, Math.PI * 2); g.fill();

  // white trousers + feet
  g.fillStyle = white;
  roundRect(g, 7, 29 + bob, 13, 7, 3); g.fill();
  g.fillRect(8 - legSwing, 33 + bob, 4, 9);
  g.fillRect(15 + legSwing, 33 + bob, 4, 9);

  // body
  g.fillStyle = blue;
  roundRect(g, 8, 21 + bob, 11, 11, 4); g.fill();
  g.fillStyle = blueDark;
  roundRect(g, 9, 22 + bob, 9, 2, 1); g.fill(); // belt line

  // arms
  g.fillStyle = blue;
  if (dir === 1) {
    g.fillRect(18, 22 + bob, 4, 7);
  } else if (dir === 3) {
    g.fillRect(5, 22 + bob, 4, 7);
  } else {
    g.fillRect(6, 23 + bob, 3, 6);
    g.fillRect(18, 23 + bob, 3, 6);
  }

  // head
  g.fillStyle = blue;
  g.beginPath(); g.ellipse(13, 15 + bob, 6, 6.5, 0, 0, Math.PI * 2); g.fill();

  // white Phrygian cap
  g.fillStyle = white;
  if (dir === 0) {
    g.beginPath();
    g.moveTo(6, 12 + bob);
    g.quadraticCurveTo(13, -1 + bob, 20, 12 + bob);
    g.lineTo(18, 14 + bob);
    g.lineTo(8, 14 + bob);
    g.closePath();
    g.fill();
  } else if (dir === 2) {
    g.beginPath();
    g.moveTo(5, 10 + bob);
    g.quadraticCurveTo(13, -3 + bob, 21, 10 + bob);
    g.lineTo(19, 12 + bob);
    g.lineTo(7, 12 + bob);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(16, 9 + bob);
    g.quadraticCurveTo(23, 7 + bob, 24, 14 + bob);
    g.lineTo(17, 12 + bob);
    g.fill();
  } else if (dir === 1) {
    g.beginPath();
    g.moveTo(8, 11 + bob);
    g.quadraticCurveTo(15, -2 + bob, 21, 8 + bob);
    g.quadraticCurveTo(23, 12 + bob, 16, 13 + bob);
    g.closePath();
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(20, 11 + bob);
    g.quadraticCurveTo(11, -2 + bob, 5, 8 + bob);
    g.quadraticCurveTo(3, 12 + bob, 10, 13 + bob);
    g.closePath();
    g.fill();
  }

  // face
  g.fillStyle = "#1a1a2e";
  if (dir === 2) {
    g.fillRect(10, 14 + bob, 2, 2);
    g.fillRect(15, 14 + bob, 2, 2);
    g.fillRect(12, 17 + bob, 2, 1);
  } else if (dir === 0) {
    g.fillStyle = blueDark;
    g.fillRect(11, 13 + bob, 4, 3);
  } else if (dir === 1) {
    g.fillRect(16, 14 + bob, 2, 2);
    g.fillRect(18, 16 + bob, 3, 3);
  } else {
    g.fillRect(9, 14 + bob, 2, 2);
    g.fillRect(6, 16 + bob, 3, 3);
  }
  g.restore();
}

function makeTitle() {
  const im = newImage(176, 70), g = im.getContext("2d");
  // soft banner
  g.fillStyle = "rgba(11,22,34,0)"; g.fillRect(0, 0, 176, 70);
  g.font = "bold 34px Arial Black, Arial, sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 5; g.strokeStyle = "#0a2540"; g.strokeText("PUSH", 88, 22);
  g.fillStyle = "#cae9fb"; g.fillText("PUSH", 88, 22);
  g.strokeText("BOX", 88, 52);
  g.fillStyle = "#f0b259"; g.fillText("BOX", 88, 52);
  return im;
}

function makeAvatar(frame) {
  // ~70x103 developer avatar with a few "talking" mouth frames
  const im = newImage(70, 103), g = im.getContext("2d");
  g.fillStyle = "#173049"; roundRect(g, 2, 2, 66, 99, 8); g.fill();
  // shoulders
  g.fillStyle = "#2e5d86"; roundRect(g, 8, 70, 54, 33, 12); g.fill();
  // head
  g.fillStyle = "#f0c9a0";
  g.beginPath(); g.ellipse(35, 44, 22, 25, 0, 0, Math.PI * 2); g.fill();
  // hair
  g.fillStyle = "#3a2a1c";
  g.beginPath(); g.arc(35, 30, 22, Math.PI, 0); g.fill();
  g.fillRect(13, 24, 44, 10);
  // eyes
  g.fillStyle = "#23303a";
  g.fillRect(26, 42, 4, 4); g.fillRect(42, 42, 4, 4);
  // mouth (animates with frame)
  g.fillStyle = "#7a3b34";
  const mh = [2, 6, 9, 5][frame % 4];
  roundRect(g, 28, 56, 14, mh, 2); g.fill();
  return im;
}

function makeWinFrame(frame) {
  const im = newImage(40, 24), g = im.getContext("2d");
  const colors = ["#ffd84d", "#fff0a8", "#ffd84d", "#ffb000"];
  g.fillStyle = colors[frame % 4];
  // a little star
  star(g, 12, 12, 10, 5, 4 + frame);
  g.fill();
  star(g, 30, 10, 7, 5, frame * 2);
  g.fill();
  return im;
}

/* font glyph: white character on transparent, ~9x12 to match drawString()
   advance/cursor maths (j*10 spacing, 9x11 caret). */
function makeGlyph(ch) {
  const w = 9, h = 12, im = newImage(w, h), g = im.getContext("2d");
  g.font = "bold 12px 'Courier New', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#ffffff";
  g.fillText(ch, w / 2, h / 2 + 1);
  return im;
}

/* ---- small canvas helpers ------------------------------------------------ */
function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function star(g, cx, cy, outer, points, rot) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : outer / 2.3;
    const a = (Math.PI / points) * i + (rot * Math.PI) / 180;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.closePath();
}

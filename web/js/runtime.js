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
     data[3]       wall / border tile           (48x24 flat diamond)
     data[4]       crate-on-target sprite     (45x44)
     data[5]       player sprite sheet (162x90, 12 frames)
     data[6..41]   font glyphs (see load(): FONT_pics[3..38])
     data[42..45]  "alex" talking avatar frames
     data[46..48]  font glyphs A,B,C  (see load(): FONT_pics[0..2])
     data[49..52]  win banner animation
     data[54]      target tile               (48x24 isometric diamond)
   ========================================================================== */

/* Original PushBox palette (screens / UI colours from PushBoxCanvas.java). */
const PALETTE = {
  navy:     "#003065",  // rgb(0,48,101) — outlines, target rings, crate cross
  uiBlue:   "#5997bb",  // rgb(89,151,187) — border tiles, status bar
  uiLite:   "#cae9fb",  // rgb(202,233,251) — "push" logo, text caret
  white:    "#ffffff",
  magenta:  "#ff00ff",  // crate sides, "box" logo, win sparkle
  magentaD: "#d400d4",
  cyan:     "#5ce1ff",  // crate tops on title / intro preview
  green:    "#5be85b",  // crate tops during play
  greenHi:  "#7dff7d",
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
  // Plain white — diamond outlines in the old texture tiled on a 48×48 grid that
  // does not match the isometric row spacing (24px), which drew cross-hatch lines
  // over the whole board including crates.
  const w = 48, h = 48, im = newImage(w, h), g = im.getContext("2d");
  g.fillStyle = PALETTE.white;
  g.fillRect(0, 0, w, h);
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

function diamondInset(g, ox, oy, inset) {
  g.moveTo(ox + 24, oy + inset);
  g.lineTo(ox + 48 - inset, oy + 12);
  g.lineTo(ox + 24, oy + 24 - inset);
  g.lineTo(ox + inset, oy + 12);
  g.closePath();
}

function fillDiamondRing(g, ox, oy, outer, inner, color) {
  g.beginPath();
  diamondInset(g, ox, oy, outer);
  diamondInset(g, ox, oy, inner);
  g.fillStyle = color;
  g.fill("evenodd");
}

function makeTargetTile() {
  const im = newImage(48, 24), g = im.getContext("2d");
  g.imageSmoothingEnabled = false;
  // Original bullseye: navy outer ring, white middle ring, navy dot — floor shows through centre.
  fillDiamondRing(g, 0, 0, 2, 6, PALETTE.navy);
  fillDiamondRing(g, 0, 0, 6, 10, PALETTE.white);
  g.fillStyle = PALETTE.navy;
  g.fillRect(22, 10, 4, 4);
  return im;
}

function makeWall() {
  // Flat border tile — medium blue diamond, no height (matches original screenshots).
  const im = newImage(48, 24), g = im.getContext("2d");
  diamondPath(g, 0, 0);
  g.fillStyle = PALETTE.uiBlue;
  g.fill();
  g.strokeStyle = PALETTE.navy;
  g.lineWidth = 1;
  g.stroke();
  return im;
}

function makeCrate(onTarget) {
  // 45x44 — magenta sides; green top off-target, cyan top when on a goal tile.
  const im = newImage(45, 44), g = im.getContext("2d");
  const cx = 22, topY = 4;
  const sideL = PALETTE.magenta;
  const sideR = PALETTE.magentaD;
  const top = onTarget ? PALETTE.cyan : PALETTE.green;
  const cross = onTarget ? "#0099bb" : "#2a8a2a";
  // left face
  g.beginPath();
  g.moveTo(0, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(cx, 43); g.lineTo(0, 32); g.closePath();
  g.fillStyle = sideL; g.fill();
  // right face
  g.beginPath();
  g.moveTo(44, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(cx, 43); g.lineTo(44, 32); g.closePath();
  g.fillStyle = sideR; g.fill();
  // top face
  g.beginPath();
  g.moveTo(cx, topY); g.lineTo(44, topY + 11); g.lineTo(cx, topY + 22); g.lineTo(0, topY + 11); g.closePath();
  g.fillStyle = top; g.fill();
  // X on top (subtle, inset — no outer diamond stroke)
  g.strokeStyle = cross;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(cx, topY + 2); g.lineTo(cx, topY + 20);
  g.moveTo(4, topY + 11); g.lineTo(40, topY + 11);
  g.stroke();
  return im;
}

/* Player sprite sheet: 162x90, 12 frames in a 6col x 2row grid.
   For xframe in 0..11: col = xframe>>1, row = xframe&1.
   xframe = dir*3 + sub, dir: 0=N 1=E 2=S 3=W, sub: 0=stand 1=step 2=step. */
/* Avatar palette (intro portrait + player sprite). */
const AVATAR_COLORS = {
  skin:      "#f0c9a0",
  hair:      "#3a2a1c",
  shirt:     "#2e5d86",
  shirtDark: "#1e4a6e",
  eye:       "#23303a",
  mouth:     "#7a3b34",
  pants:     PALETTE.uiLite,
};

function makePlayerSheet() {
  const im = newImage(162, 90), g = im.getContext("2d");
  for (let dir = 0; dir < 4; dir++) {
    for (let sub = 0; sub < 3; sub++) {
      const xframe = dir * 3 + sub;
      const col = xframe >> 1, row = xframe & 1;
      drawPlayerSprite(g, col * 27, row * 45, dir, sub);
    }
  }
  return im;
}

// Mini Alex (same look as the intro avatar) in a 27×45 isometric cell.
function drawPlayerSprite(g, ox, oy, dir, sub) {
  g.save();
  g.translate(ox, oy);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 27, 45);
  const bob = sub === 1 ? -1 : (sub === 2 ? 1 : 0);
  const legSwing = sub === 1 ? 2 : (sub === 2 ? -2 : 0);
  const cx = 13;
  const C = AVATAR_COLORS;

  g.fillStyle = "rgba(0,0,0,.28)";
  g.fillRect(4, 41 + bob, 19, 3);

  g.fillStyle = C.pants;
  roundRect(g, 7, 30 + bob, 13, 6, 2); g.fill();
  g.fillRect(8 - legSwing, 34 + bob, 4, 9);
  g.fillRect(15 + legSwing, 34 + bob, 4, 9);

  g.fillStyle = C.shirt;
  roundRect(g, 7, 21 + bob, 13, 11, 3); g.fill();

  g.fillStyle = C.shirt;
  if (dir === 1) g.fillRect(18, 22 + bob, 4, 7);
  else if (dir === 3) g.fillRect(5, 22 + bob, 4, 7);
  else {
    g.fillRect(6, 23 + bob, 3, 6);
    g.fillRect(18, 23 + bob, 3, 6);
  }

  if (dir === 0) {
    g.fillStyle = C.skin;
    g.fillRect(10, 18 + bob, 7, 4);
    g.fillStyle = C.hair;
    roundRect(g, 5, 8 + bob, 17, 13, 6); g.fill();
  } else if (dir === 2) {
    g.fillStyle = C.skin;
    g.fillRect(9, 13 + bob, 9, 10);
    g.fillStyle = C.hair;
    roundRect(g, 5, 8 + bob, 17, 8, 5); g.fill();
    g.fillStyle = C.eye;
    g.fillRect(10, 15 + bob, 2, 2);
    g.fillRect(15, 15 + bob, 2, 2);
    g.fillStyle = C.mouth;
    g.fillRect(11, 19 + bob, 5, 2);
  } else if (dir === 1) {
    g.fillStyle = C.skin;
    g.fillRect(13, 14 + bob, 8, 10);
    g.fillStyle = C.hair;
    roundRect(g, 3, 8 + bob, 16, 13, 6); g.fill();
    roundRect(g, 13, 8 + bob, 9, 7, 4); g.fill();
    g.fillStyle = C.eye;
    g.fillRect(17, 15 + bob, 2, 2);
    g.fillStyle = C.mouth;
    g.fillRect(17, 19 + bob, 3, 2);
  } else {
    g.fillStyle = C.skin;
    g.fillRect(6, 14 + bob, 8, 10);
    g.fillStyle = C.hair;
    roundRect(g, 8, 8 + bob, 16, 13, 6); g.fill();
    roundRect(g, 5, 8 + bob, 9, 7, 4); g.fill();
    g.fillStyle = C.eye;
    g.fillRect(8, 15 + bob, 2, 2);
    g.fillStyle = C.mouth;
    g.fillRect(7, 19 + bob, 3, 2);
  }
  g.restore();
}

function makeTitle() {
  const im = newImage(176, 70), g = im.getContext("2d");
  drawLogoWord(g, 4, 2, "push", PALETTE.uiLite, PALETTE.navy);
  drawLogoWord(g, 4, 30, "box", PALETTE.magenta, PALETTE.navy);
  return im;
}

// Rounded pixel logo letters (stacked "push" / "box" at top-left).
function drawLogoWord(g, ox, oy, word, fill, outline) {
  const cells = {
    p: [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,0,1],[1,0,0,0,0],[1,0,0,0,0]],
    u: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    s: [[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
    h: [[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
    b: [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
    o: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    x: [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
    e: [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
    r: [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  };
  const scale = 3, gap = 1;
  let x = ox;
  for (let i = 0; i < word.length; i++) {
    const grid = cells[word[i]];
    if (!grid) continue;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        if (!grid[row][col]) continue;
        const px = x + col * scale, py = oy + row * scale;
        g.fillStyle = outline;
        g.fillRect(px - 1, py - 1, scale + 2, scale + 2);
        g.fillStyle = fill;
        g.fillRect(px, py, scale, scale);
      }
    }
    x += grid[0].length * scale + gap;
  }
}

function makeAvatar(frame) {
  // alex[3] = face base; alex[0..2] = mouth overlays at offx+40 (base at offx+30).
  const im = newImage(70, 103), g = im.getContext("2d");
  if (frame === 3) {
    drawAvatarBody(g, false, 0);
    return im;
  }
  g.fillStyle = AVATAR_COLORS.mouth;
  const mh = frame === 0 ? 2 : (frame === 1 ? 6 : 9);
  roundRect(g, 18, 56, 14, mh, 2);
  g.fill();
  return im;
}

function drawAvatarBody(g, withMouth, mouthH) {
  const C = AVATAR_COLORS;
  g.fillStyle = "#173049";
  roundRect(g, 2, 2, 66, 99, 8);
  g.fill();
  g.fillStyle = C.shirt;
  roundRect(g, 8, 70, 54, 33, 12);
  g.fill();
  g.fillStyle = C.skin;
  g.beginPath();
  g.ellipse(35, 44, 22, 25, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = C.hair;
  g.beginPath();
  g.arc(35, 30, 22, Math.PI, 0);
  g.fill();
  g.fillRect(13, 24, 44, 10);
  g.fillStyle = C.eye;
  g.fillRect(26, 42, 4, 4);
  g.fillRect(42, 42, 4, 4);
  if (withMouth && mouthH > 0) {
    g.fillStyle = C.mouth;
    roundRect(g, 28, 56, 14, mouthH, 2);
    g.fill();
  }
}

function makeWinFrame(frame) {
  const im = newImage(84, 22), g = im.getContext("2d");
  const hi = [PALETTE.magenta, "#ff66ff", PALETTE.magenta, "#ff33ff"][frame % 4];
  drawLogoWord(g, 1, 2, "super", hi, PALETTE.navy);
  return im;
}

/* font glyph: white character on transparent, ~9x12 to match drawString()
   advance/cursor maths (j*10 spacing, 9x11 caret). */
function makeGlyph(ch) {
  const w = 9, h = 12, im = newImage(w, h), g = im.getContext("2d");
  g.font = "bold 12px 'Courier New', monospace";
  g.textAlign = "center"; g.textBaseline = "middle";
  const x = w / 2, y = h / 2 + 1;
  g.lineWidth = 2;
  g.lineJoin = "round";
  g.strokeStyle = PALETTE.navy;
  g.strokeText(ch, x, y);
  g.fillStyle = PALETTE.white;
  g.fillText(ch, x, y);
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

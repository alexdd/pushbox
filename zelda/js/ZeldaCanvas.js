/*
 * Copyright (c) 2026 Alex Düsel. www.tekturcms.de
 * All rights reserved.
 *
 * ZeldaCanvas — the PushBox isometric tile engine, scaled to a 1000×1000
 * overworld. The walker (setSlide / setCamGrid / nextXY / setRlen /
 * tile_x / tile_y / paintGame) is the 2005 algorithm with only three
 * adaptations: instance viewport size, extra tile types, and a bounds
 * check on rIndex so the camera can sit near the map edge.
 */
"use strict";

class Prop {
  constructor(kind, tileX, tileY, image, occW, occH, offsetX, offsetY) {
    this.kind = kind;
    this.tileX = tileX;
    this.tileY = tileY;
    this.occW = occW || 1;
    this.occH = occH || 1;
    this.image = image;
    this.swidth = image.width;
    this.sheight = image.height;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.tileOffset = 0;
    this.moved = false;
    this.prev = null;
    this.next = null;
    this.x = 0;
    this.y = 0;
    this.tileRow = tileX + tileY;
  }

  place(engine) {
    this.x = engine.tile_x(this.tileX, this.tileY) + Sprite.TILE_X;
    this.y = engine.tile_y(this.tileX, this.tileY) + Sprite.TILE_Y;
    this.tileRow = this.tileX + this.tileY;
  }

  doesOccupy(tileX, tileY) {
    return tileX >= this.tileX && tileX < this.tileX + this.occW &&
      tileY >= this.tileY && tileY < this.tileY + this.occH;
  }

  paint(g) {
    g.drawImage(this.image, this.x + this.offsetX, this.y + this.offsetY, Graphics.TOP | Graphics.LEFT);
  }
}

class ZeldaCanvas {
  constructor(canvas) {
    this.canvasEl = canvas;
    this.viewW = 320;
    this.viewH = 208;
    this.g = new Graphics(canvas.getContext("2d"), this.viewW, this.viewH);

    this.UP = false; this.DOWN = false; this.LEFT = false; this.RIGHT = false;
    this.release = false;
    this.frameTime = 0;
    this.frame_time = ZeldaCanvas.FRAMERATE_GAME;
    this.tick = 0;
    this.state = ZeldaCanvas.STATE_LOADING;

    this.size_map = 0;
    this.width_map = 0;
    this.height_map = 0;
    this.px_width = 0;
    this.px_height = 0;
    this.top_map = 0;
    this.max_row = 0;
    this.high_corner = 0;
    this.low_corner = 0;

    this.camX = 0; this.camY = 0; this.camDX = 0; this.camDY = 0;
    this.min_camX = 0; this.min_camY = 0; this.max_camX = 0; this.max_camY = 0;
    this.cam_gridX = 0; this.cam_gridY = 0; this.otx = 0; this.oty = 0;
    this.x = 0; this.y = 0; this.index = 0; this.row = 0; this.rOff = 0;
    this.slide = 0; this.rLen = 0;

    this.VP_TILES_WIDTH = ZeldaCanvas.VP_TILES_WIDTH;
    this.VP_TILES_HEIGHT = ZeldaCanvas.VP_TILES_HEIGHT;

    this.world = null;
    this.tiles = null;
    this.assets = null;
    this.minimap = null;
    this.player = null;
    this.localId = 0;
    this.remotes = new Map();
    this.props = [];
    this.hash = new Map();
    this.sorted = null;
    this.visibleProps = [];
    this.lastHashCX = -9999;
    this.lastHashCY = -9999;
    this.demo = false;
    this.data = [];
    this.blocked = null;
    this.emotes = new Map();
  }

  getWidth() { return this.viewW; }
  getHeight() { return this.viewH; }
  get VP_WIDTH() { return this.viewW; }
  get VP_HEIGHT() { return this.viewH; }

  resize(viewW, viewH) {
    this.viewW = Math.max(200, viewW | 0);
    this.viewH = Math.max(160, viewH | 0);
    this.canvasEl.width = this.viewW;
    this.canvasEl.height = this.viewH;
    this.g = new Graphics(this.canvasEl.getContext("2d"), this.viewW, this.viewH);
    this.VP_TILES_WIDTH = Math.ceil(this.viewW / ZeldaCanvas.TILE_DX) + 3;
    this.VP_TILES_HEIGHT = Math.ceil(this.viewH / (ZeldaCanvas.TILE_DY >> 1)) + 6;
    if (this.player) this.setCamera(this.player.x, this.player.y);
  }

  tile_x(tileX, tileY) {
    return ((tileX - tileY) * (ZeldaCanvas.TILE_DX >> 1)) + this.top_map;
  }

  tile_y(tileX, tileY) {
    return (tileX + tileY) * (ZeldaCanvas.TILE_DY >> 1);
  }

  getTile(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width_map || tileY < 0 || tileY >= this.height_map) return -1;
    return this.tiles[(this.width_map * tileY) + tileX];
  }

  tile_accessible(o, tileX, tileY) {
    if (tileX < 0 || tileX >= this.width_map || tileY < 0 || tileY >= this.height_map) return false;
    const tile = this.tiles[tileX + (tileY * this.width_map)];
    if (!ZeldaWorld.isWalkableTile(tile)) return false;
    const hit = this.getObjectSuperType(tileX, tileY);
    if (hit && hit !== o && hit !== this.player) return false;
    return true;
  }

  getObjectSuperType(tileX, tileY) {
    const cell = this.hash.get((tileX >> 3) + ":" + (tileY >> 3));
    if (!cell) return null;
    for (let i = 0; i < cell.length; i++) {
      if (cell[i].doesOccupy(tileX, tileY)) return cell[i];
    }
    return null;
  }

  notifyt() {}

  setSlide() {
    this.x = -this.otx;
    this.y = -this.oty;
    this.cam_gridX -= (this.height_map >> 1);
    this.index = (this.cam_gridY * (this.width_map + 1)) - (this.cam_gridX * (this.width_map - 1));
    this.row = this.cam_gridY << 1;
    this.rOff = this.cam_gridX + this.cam_gridY;

    if (this.otx < (ZeldaCanvas.TILE_DX >> 1)) {
      if (this.oty < (ZeldaCanvas.TILE_DY >> 1)) {
        this.x -= ZeldaCanvas.TILE_DX >> 1;
        this.y -= ZeldaCanvas.TILE_DY >> 1;
        this.index--;
        this.row--;
        this.rOff--;
        this.slide = 1;
      } else {
        this.slide = 0;
      }
    } else {
      if (this.oty < (ZeldaCanvas.TILE_DY >> 1)) {
        this.x += ZeldaCanvas.TILE_DX >> 1;
        this.y -= ZeldaCanvas.TILE_DY >> 1;
        this.index -= this.width_map;
        this.row--;
        this.slide = 0;
      } else {
        this.slide = 1;
      }
    }
  }

  setCamGrid() {
    if (this.camX >= 0) {
      this.cam_gridX = (this.camX / ZeldaCanvas.TILE_DX) | 0;
      this.otx = this.camX - (this.cam_gridX * ZeldaCanvas.TILE_DX);
    } else {
      this.cam_gridX = -(((1 - this.camX) / ZeldaCanvas.TILE_DX) | 0);
      this.otx = ZeldaCanvas.TILE_DX + this.camX - (this.cam_gridX * ZeldaCanvas.TILE_DX);
      this.cam_gridX--;
    }
    if (this.camY >= 0) {
      this.cam_gridY = (this.camY / ZeldaCanvas.TILE_DY) | 0;
      this.oty = this.camY - (this.cam_gridY * ZeldaCanvas.TILE_DY);
    } else {
      this.cam_gridY = -(((1 - this.camY) / ZeldaCanvas.TILE_DY) | 0);
      this.oty = ZeldaCanvas.TILE_DY + this.camY - (this.cam_gridY * ZeldaCanvas.TILE_DY);
      this.cam_gridY--;
    }
    if ((this.height_map & 0x1) === 0) {
      this.otx += (ZeldaCanvas.TILE_DX >> 1);
      if (this.otx >= ZeldaCanvas.TILE_DX) {
        this.otx -= ZeldaCanvas.TILE_DX;
        this.cam_gridX++;
      }
    }
  }

  nextXY() {
    if (this.slide === 1) {
      this.index++;
      this.x += ZeldaCanvas.TILE_DX >> 1;
    } else {
      this.index += this.width_map;
      this.x -= ZeldaCanvas.TILE_DX >> 1;
    }
    if (this.row < this.high_corner) this.rLen++;
    else if (this.row >= this.low_corner) this.rLen--;
    this.row++;
    if (this.row < this.height_map && this.slide === 1) this.rOff++;
    if (this.row >= this.height_map && this.slide === 0) this.rOff--;
    this.slide = 1 - this.slide;
  }

  setRlen() {
    if (this.row >= this.height_map)
      this.rOff -= 1 + (this.row - this.height_map);
    this.rLen = 1 + this.row;
    if (this.row <= this.high_corner) this.rLen = 1 + this.row;
    else if (this.row <= this.low_corner) this.rLen = this.max_row;
    else this.rLen = this.max_row + this.low_corner - this.row;
  }

  setCamera(x, y) {
    x -= (this.viewW >> 1);
    y -= (this.viewH >> 1);
    this.camX = (x < this.min_camX ? this.min_camX : (x > this.max_camX ? this.max_camX : x));
    this.camY = (y < this.min_camY ? this.min_camY : (y > this.max_camY ? this.max_camY : y));
  }

  add_object(o) {
    let prev = null;
    let next = this.sorted;
    while (true) {
      if (next == null || next.y > o.y) {
        o.prev = prev;
        o.next = next;
        if (prev == null) this.sorted = o;
        else prev.next = o;
        if (next != null) next.prev = o;
        break;
      }
      prev = next;
      next = next.next;
    }
  }

  hashKey(tx, ty) { return (tx >> 3) + ":" + (ty >> 3); }

  addToHash(prop) {
    for (let ty = prop.tileY; ty < prop.tileY + prop.occH; ty++) {
      for (let tx = prop.tileX; tx < prop.tileX + prop.occW; tx++) {
        const k = this.hashKey(tx, ty);
        let cell = this.hash.get(k);
        if (!cell) { cell = []; this.hash.set(k, cell); }
        cell.push(prop);
      }
    }
  }

  gatherVisible(cx, cy) {
    const r = 28;
    const seen = new Set();
    const out = [];
    const x0 = (cx - r) >> 3, x1 = (cx + r) >> 3;
    const y0 = (cy - r) >> 3, y1 = (cy + r) >> 3;
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const cell = this.hash.get(gx + ":" + gy);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const p = cell[i];
          if (seen.has(p)) continue;
          seen.add(p);
          out.push(p);
        }
      }
    }
    this.visibleProps = out;
  }

  rebuildSorted() {
    this.sorted = null;
    const list = this.visibleProps.slice();
    if (this.player) list.push(this.player);
    for (const remote of this.remotes.values()) list.push(remote);
    list.sort((a, b) => a.y - b.y);
    for (let i = 0; i < list.length; i++) {
      list[i].prev = null;
      list[i].next = null;
    }
    for (let i = 0; i < list.length; i++) this.add_object(list[i]);
  }

  loadWorld(world, assets) {
    this.world = world;
    this.tiles = world.tiles;
    this.assets = assets;
    this.size_map = world.size * world.size;
    this.width_map = world.size;
    this.height_map = world.size;

    this.px_width = ((this.width_map + this.height_map) * ((ZeldaCanvas.TILE_WIDTH >> 1) + 1)) - 2;
    this.px_height = (this.width_map + this.height_map) * (ZeldaCanvas.TILE_HEIGHT >> 1);
    this.top_map = (this.height_map - 1) * ((ZeldaCanvas.TILE_WIDTH >> 1) + 1);

    if (this.width_map <= this.height_map) {
      this.max_row = this.width_map;
      this.high_corner = this.width_map - 1;
      this.low_corner = this.height_map - 1;
    } else {
      this.max_row = this.height_map;
      this.high_corner = this.height_map - 1;
      this.low_corner = this.width_map - 1;
    }

    this.min_camX = -ZeldaCanvas.BORDER_W;
    this.min_camY = -ZeldaCanvas.BORDER_N;
    this.max_camX = (this.px_width + ZeldaCanvas.BORDER_E) - this.viewW;
    this.max_camY = (this.px_height + ZeldaCanvas.BORDER_S) - this.viewH;
    if (this.max_camX < 0) this.max_camX = 0;
    if (this.max_camY < 0) this.max_camY = 0;

    this.props = [];
    this.hash = new Map();
    for (let i = 0; i < world.trees.length; i++) {
      const t = world.trees[i];
      const img = assets.trees[t.variant & 1];
      const p = new Prop("tree", t.x, t.y, img, 1, 1, -20, -56);
      p.place(this);
      this.props.push(p);
      this.addToHash(p);
    }
    for (let i = 0; i < world.houses.length; i++) {
      const h = world.houses[i];
      const img = assets.houses[h.roof % 3];
      const p = new Prop("house", h.x, h.y, img, h.w, h.h, -20, -58);
      p.place(this);
      this.props.push(p);
      this.addToHash(p);
    }
    const temples = world.temples || [];
    for (let i = 0; i < temples.length; i++) {
      const t = temples[i];
      const img = (assets.temples && assets.temples[t.deity]) || assets.houses[0];
      const p = new Prop("temple", t.tx, t.ty, img, t.w || 3, t.h || 3, -22, -78);
      p.deity = t.deity;
      p.label = t.name;
      p.place(this);
      this.props.push(p);
      this.addToHash(p);
      if (assets.shrines && assets.shrines[t.deity]) {
        const shrine = new Prop("shrine", t.x, t.y - 3, assets.shrines[t.deity], 1, 1, -12, -50);
        shrine.deity = t.deity;
        shrine.label = t.deity;
        shrine.place(this);
        this.props.push(shrine);
      }
    }

    this.minimap = makeMinimap(world);
    this.lastHashCX = -9999;
    Sprite.engine = this;
  }

  spawnLocal(info) {
    const o = new Sprite(0);
    o.init(Sprite.TYPE_LION);
    o.setSpriteImage(this.yogiSheet(info), Sprite.TYPE_LION);
    o.isPlayer = true;
    o.name = info.name;
    o.color = info.color;
    o.gender = info.gender || "male";
    o.pid = info.id;
    o.setTile(info.tx, info.ty, info.dir == null ? 2 : info.dir);
    this.player = o;
    this.localId = info.id;
    this.setCamera(o.x, o.y);
    this.gatherVisible(o.tileX, o.tileY);
    this.rebuildSorted();
    return o;
  }

  upsertRemote(info) {
    if (info.id === this.localId) return;
    let o = this.remotes.get(info.id);
    if (!o) {
      o = new Sprite(info.id);
      o.init(Sprite.TYPE_LION);
      o.isPlayer = false;
      this.remotes.set(info.id, o);
    }
    o.name = info.name;
    o.color = info.color;
    o.gender = info.gender || "male";
    o.pid = info.id;
    o.asanas = info.asanas || [];
    o.focus = info.focus || "hatha";
    o.setSpriteImage(this.yogiSheet(info), Sprite.TYPE_LION);
    if (info.x || info.y) {
      o.x = info.x;
      o.y = info.y;
      o.tileX = info.tx;
      o.tileY = info.ty;
      o.tileRow = info.tx + info.ty;
      o.dir = info.dir & 3;
      o.moved = true;
    } else {
      o.setTile(info.tx, info.ty, info.dir & 3);
    }
    o.dir = info.dir & 3;
    o.setState(Sprite.STATE_IDLE);
    o.frameOffset = o.dir * 3;
    if (info.moving) {
      o.frames = Sprite.FRAMES_MOVING;
      o.frame = Sprite.FRAMES_MOVING[0];
      o.frameIndex = 0;
      o.frameDelay = Sprite.DEFAULT_FRAME_RATE;
    } else {
      o.frames = null;
      o.frame = 0;
    }
  }

  yogiSheet(info) {
    const gender = info.gender === "female" ? "female" : "male";
    const pack = (this.assets.yogis && this.assets.yogis[gender]) || this.assets.players;
    return pack[(info.slot || 0) % pack.length];
  }

  pickYogiAt(screenX, screenY) {
    const wx = screenX + this.camX;
    const wy = screenY + this.camY;
    let best = null;
    for (const o of this.remotes.values()) {
      const x = o.x + o.offsetX;
      const y = o.y + o.offsetY;
      if (wx >= x - 4 && wx <= x + o.swidth + 4 && wy >= y - 8 && wy <= y + o.sheight + 4) {
        best = o;
      }
    }
    return best;
  }

  removeRemote(id) {
    this.remotes.delete(id);
    this.emotes.delete(id);
  }

  processKeys() {
    if (!this.player || this.state !== ZeldaCanvas.STATE_GAME) return;
    if (this.UP) this.player.setKeys(Sprite.DIR_NORTH);
    else if (this.DOWN) this.player.setKeys(Sprite.DIR_SOUTH);
    else if (this.LEFT) this.player.setKeys(Sprite.DIR_WEST);
    else if (this.RIGHT) this.player.setKeys(Sprite.DIR_EAST);
    if (this.release) {
      this.UP = false; this.DOWN = false; this.LEFT = false; this.RIGHT = false;
      this.release = false;
    }
  }

  update() {
    if (!this.player) return;
    if (this.camDX !== 0 || this.camDY !== 0) {
      this.camX += this.camDX;
      this.camY += this.camDY;
      this.camDX = 0;
      this.camDY = 0;
    }
    this.setCamera(this.player.x, this.player.y);
    this.player.update(this.frameTime);
    for (const remote of this.remotes.values()) remote.animate(this.frameTime);
    if (this.player.tileX !== this.lastHashCX || this.player.tileY !== this.lastHashCY) {
      this.gatherVisible(this.player.tileX, this.player.tileY);
      this.lastHashCX = this.player.tileX;
      this.lastHashCY = this.player.tileY;
    }
    this.rebuildSorted();
  }

  step() {
    this.frameTime = this.frame_time;
    this.processKeys();
    if (this.state === ZeldaCanvas.STATE_GAME) this.update();
    this.tick++;
    if (this.tick > 100000) this.tick = 0;
  }

  tileImage(tile, tx, ty) {
    const a = this.assets.tiles;
    switch (tile) {
      case ZeldaWorld.TILE.PATH: return a.path;
      case ZeldaWorld.TILE.WATER: return a.water[(this.tick >> 3) & 1];
      case ZeldaWorld.TILE.BRIDGE: return a.bridge;
      case ZeldaWorld.TILE.SAND: return a.sand;
      case ZeldaWorld.TILE.FLOWER: return a.flower;
      case ZeldaWorld.TILE.WALL: return a.wall;
      case ZeldaWorld.TILE.FLOOR: return a.floor;
      default: return a.grass[(tx * 13 + ty * 7) % 3];
    }
  }

  paintTexture(g) {
    g.setColor(18, 46, 28);
    g.fillRect(0, 0, this.viewW, this.viewH);
  }

  paintGame(g) {
    let sorted = this.sorted;
    this.paintTexture(g);
    this.setCamGrid();
    this.setSlide();
    this.setRlen();

    const size = this.size_map;
    const water = ZeldaWorld.TILE.WATER;

    for (let i = this.VP_TILES_HEIGHT; --i >= 0; this.y += ZeldaCanvas.TILE_DY >> 1) {
      g.setClip(0, 0, this.viewW, this.viewH);

      if (this.y < this.viewH)
        for (let j = this.VP_TILES_WIDTH, px = this.x, rIndex = this.index, r = this.rOff;
             --j >= 0; px += ZeldaCanvas.TILE_DX, rIndex -= (this.width_map - 1), r++) {
          if (r < 0 || r >= this.rLen) continue;
          if (rIndex < 0 || rIndex >= size) continue;
          const tile = this.tiles[rIndex];
          const ty = (rIndex / this.width_map) | 0;
          const tx = rIndex - ty * this.width_map;
          g.drawImage(this.tileImage(tile, tx, ty), px, this.y, Graphics.TOP | Graphics.LEFT);
          if (tile === water) continue;
        }

      g.translate(-this.camX, -this.camY);
      while (sorted != null && sorted.tileRow <= this.row && sorted.tileOffset > 0) {
        if (ZeldaCanvas.isOnScreen(this, sorted)) sorted.paint(g);
        sorted = sorted.next;
      }
      g.translate(this.camX, this.camY);

      g.setClip(0, 0, this.viewW, this.viewH);
      g.translate(-this.camX, -this.camY);
      while (sorted != null && sorted.tileRow <= this.row) {
        if (ZeldaCanvas.isOnScreen(this, sorted)) sorted.paint(g);
        sorted = sorted.next;
      }
      g.translate(this.camX, this.camY);
      this.nextXY();
    }

    g.setClip(0, 0, this.viewW, this.viewH);
  }

  static isOnScreen(self, o) {
    const sx = o.x + o.offsetX;
    const sy = o.y + o.offsetY;
    return ((sx + o.swidth) >= self.camX && sx < (self.camX + self.viewW)
      && (sy + o.sheight) >= self.camY && sy < (self.camY + self.viewH));
  }

  paintOverlays() {
    const ctx = this.canvasEl.getContext("2d");
    ctx.save();
    ctx.translate(-this.camX, -this.camY);
    const people = [this.player, ...this.remotes.values()].filter(Boolean);
    for (let i = 0; i < people.length; i++) {
      const o = people[i];
      const label = o.name || "Yogi";
      ctx.font = "bold 10px monospace";
      const w = ctx.measureText(label).width + 8;
      const lx = o.x - (w >> 1);
      const ly = o.y + o.offsetY - 12;
      ctx.fillStyle = "rgba(10,20,14,0.7)";
      ctx.fillRect(lx, ly, w, 12);
      ctx.fillStyle = o.color || "#f2d24a";
      ctx.fillText(label, lx + 4, ly + 10);
      const em = this.emotes.get(o.pid);
      if (em && em.until > Date.now()) {
        ctx.font = "16px sans-serif";
        ctx.fillText(em.icon, o.x - 6, ly - 4);
      }
    }
    for (let i = 0; i < this.visibleProps.length; i++) {
      const p = this.visibleProps[i];
      if (p.kind !== "temple" || !p.label) continue;
      ctx.font = "bold 9px monospace";
      const tw = ctx.measureText(p.label).width + 6;
      ctx.fillStyle = "rgba(80,30,10,0.7)";
      ctx.fillRect(p.x - (tw >> 1), p.y + p.offsetY - 10, tw, 11);
      ctx.fillStyle = "#f2d24a";
      ctx.fillText(p.label, p.x - (tw >> 1) + 3, p.y + p.offsetY - 1);
    }
    ctx.restore();

    if (this.minimap && this.player) {
      const mm = this.minimap;
      const mx = this.viewW - mm.width - 8;
      const my = 8;
      ctx.drawImage(mm, mx, my);
      ctx.strokeStyle = "#f2d24a";
      ctx.strokeRect(mx, my, mm.width, mm.height);
      const px = mx + (this.player.tileX / this.width_map) * mm.width;
      const py = my + (this.player.tileY / this.height_map) * mm.height;
      ctx.fillStyle = "#fff";
      ctx.fillRect(px - 1, py - 1, 3, 3);
      for (const r of this.remotes.values()) {
        ctx.fillStyle = r.color || "#f44";
        const rx = mx + (r.tileX / this.width_map) * mm.width;
        const ry = my + (r.tileY / this.height_map) * mm.height;
        ctx.fillRect(rx - 1, ry - 1, 3, 3);
      }
    }
  }

  paint() {
    this.g.setClip(0, 0, this.viewW, this.viewH);
    if (this.state === ZeldaCanvas.STATE_LOADING) {
      this.g.setColor(18, 46, 28);
      this.g.fillRect(0, 0, this.viewW, this.viewH);
      return;
    }
    this.paintGame(this.g);
    this.paintOverlays();
  }

  keyPressed(key) {
    const action = this.getGameAction(key);
    if (action === Canvas.UP) this.UP = true;
    else if (action === Canvas.DOWN) this.DOWN = true;
    else if (action === Canvas.LEFT) this.LEFT = true;
    else if (action === Canvas.RIGHT) this.RIGHT = true;
  }

  keyReleased() {
    this.release = true;
  }

  getGameAction(key) {
    switch (key) {
      case "ArrowUp": case "w": case "W": return Canvas.UP;
      case "ArrowDown": case "s": case "S": return Canvas.DOWN;
      case "ArrowLeft": case "a": case "A": return Canvas.LEFT;
      case "ArrowRight": case "d": case "D": return Canvas.RIGHT;
      case " ": case "Enter": case "Spacebar": return Canvas.FIRE;
    }
    return 0;
  }

  holdDir(dir, down) {
    this.UP = this.DOWN = this.LEFT = this.RIGHT = false;
    this.release = false;
    if (!down) return;
    if (dir === "up") this.UP = true;
    else if (dir === "down") this.DOWN = true;
    else if (dir === "left") this.LEFT = true;
    else if (dir === "right") this.RIGHT = true;
  }
}

ZeldaCanvas.TILE_WIDTH = 46;
ZeldaCanvas.TILE_HEIGHT = 24;
ZeldaCanvas.TILE_DX = ZeldaCanvas.TILE_WIDTH + 2;
ZeldaCanvas.TILE_DY = ZeldaCanvas.TILE_HEIGHT;
ZeldaCanvas.VP_TILES_WIDTH = 8;
ZeldaCanvas.VP_TILES_HEIGHT = 28;
ZeldaCanvas.BORDER_N = 20;
ZeldaCanvas.BORDER_S = 10;
ZeldaCanvas.BORDER_E = 10;
ZeldaCanvas.BORDER_W = 10;
ZeldaCanvas.FRAMERATE_GAME = 40;
ZeldaCanvas.STATE_LOADING = 0;
ZeldaCanvas.STATE_GAME = 1;

/*
The MIT License (MIT)

Copyright (c) 2005 Alex Duesel, http://www.mandarine.tv
HTML5 / JavaScript conversion (c) 2025

  PushBoxCanvas.js  --  port of the 2005 PushBoxCanvas.java.

  The original extended Nokia's FullCanvas and ran its own Thread.  Here the
  same logic runs inside a <canvas>; the game thread's run() loop is fed by a
  fixed-timestep driver in PushBox.js.  Field names, the state machine, the
  isometric tile walker (setSlide/setCamGrid/nextXY/setRlen/paintGame) and the
  level data are all kept as close to the Java original as JavaScript allows.

  Note: a couple of identifiers in the 2005 source were inconsistent and would
  not actually compile (engine.notifyt vs notify, mapCornerLow vs low_corner,
  Sprite.TYPE_LION undefined). They are unified here so the game runs, with the
  original spelling preserved where it appeared.
*/

"use strict";

class PushBoxCanvas {

  constructor(canvas) {
    this.canvasEl = canvas;
    this.g = new Graphics(canvas.getContext("2d"), 176, 208);

    // ---- the static-ish mutable game state (instance fields here) ----
    this.INTRO_TEXT = null;

    this.UP = false; this.DOWN = false; this.LEFT = false; this.RIGHT = false;
    this.running = false; this.paint_flag = true; this.flag = true;
    this.demo = false; this.first = true; this.face = true;

    this.state = PushBoxCanvas.STATE_NONE;
    this.demo_idx = 0; this.delay = 0; this.tick = 0;
    this.frameTime = 0; this.frame_time = PushBoxCanvas.FRAMERATE_GAME;
    this.target_cnt = 0;
    this.size_map = 0; this.width_map = 0; this.height_map = 0;
    this.px_width = 0; this.px_height = 0; this.top_map = 0;
    this.intro_txt_idx = 0; this.progress = 0;
    this.max_row = 0; this.high_corner = 0; this.low_corner = 0;
    this.lev = 0; this.numObjects = 0; this.boxes = 0;
    this.camX = 0; this.camY = 0; this.camDX = 0; this.camDY = 0;
    this.min_camX = 0; this.min_camY = 0; this.max_camX = 0; this.max_camY = 0;
    this.cam_gridX = 0; this.cam_gridY = 0; this.otx = 0; this.oty = 0;
    this.x = 0; this.y = 0; this.index = 0; this.row = 0; this.rOff = 0;
    this.slide = 0; this.rLen = 0; this.currentIndex = 1;

    this.sorted = null;
    this.player = null;
    this.objects = new Array(PushBoxCanvas.MAX_OBJECTS).fill(null);
    this.blockes = null;

    this.data = new Array(55).fill(null);
    this.offscreen = null;
    this.FONT_pics = new Array(39).fill(null);
    this.alex = new Array(4).fill(null);

    this.time = 0;
    this.release = false;
  }

  // getWidth()/getHeight() emulate Canvas; the original phone screen is 176x208.
  getWidth() { return 176; }
  getHeight() { return 208; }
  repaint() { this.paint(this.g); }

  demoTurn(turn) {
    this.UP = false; this.DOWN = false; this.LEFT = false; this.RIGHT = false;
    switch (turn) {
      case 0: case 3: case 4: case 5: case 14: case 15: case 21: case 26:
        this.UP = true; break;
      case 1: case 2: case 6: case 9: case 20: case 22: case 23:
        this.LEFT = true; break;
      case 7: case 8: case 10: case 11: case 12: case 17: case 19: case 24: case 28: case 31:
        this.DOWN = true; break;
      case 13: case 16: case 18: case 25: case 27: case 29: case 30:
        this.RIGHT = true; break;
      default:
        this.demo_idx = 0; break;
    }
    if (this.UP) this.player.setKeys(Sprite.DIR_NORTH);
    else if (this.DOWN) this.player.setKeys(Sprite.DIR_SOUTH);
    else if (this.LEFT) this.player.setKeys(Sprite.DIR_WEST);
    else if (this.RIGHT) this.player.setKeys(Sprite.DIR_EAST);
  }

  setSlide() {
    this.x = -this.otx;
    this.y = -this.oty;
    this.cam_gridX -= (this.height_map >> 1);
    this.index = (this.cam_gridY * (this.width_map + 1)) - (this.cam_gridX * (this.width_map - 1));
    this.row = this.cam_gridY << 1;
    this.rOff = this.cam_gridX + this.cam_gridY;

    if (this.otx < (PushBoxCanvas.TILE_DX >> 1)) {
      if (this.oty < (PushBoxCanvas.TILE_DY >> 1)) {
        this.x -= PushBoxCanvas.TILE_DX >> 1;
        this.y -= PushBoxCanvas.TILE_DY >> 1;
        this.index--;
        this.row--;
        this.rOff--;
        this.slide = 1;
      } else {
        this.slide = 0;
      }
    } else {
      if (this.oty < (PushBoxCanvas.TILE_DY >> 1)) {
        this.x += PushBoxCanvas.TILE_DX >> 1;
        this.y -= PushBoxCanvas.TILE_DY >> 1;
        this.index -= this.width_map;
        this.row--;
        this.slide = 0;
      } else {
        this.slide = 1;
      }
    }
  }

  update() {
    if (this.camDX !== 0 || this.camDY !== 0) {
      this.camX += this.camDX;
      this.camY += this.camDY;
      this.camDX = 0;
      this.camDY = 0;
    }
    this.setCamera(this.player.x, this.player.y);
    for (let i = 0; i < this.numObjects; i++)
      this.objects[i].update(this.frameTime);
    this.sort();
  }

  // One iteration of the original run() loop body (the threading / sleeping is
  // handled by the fixed-timestep driver in PushBox.js).
  step() {
    this.frameTime = this.frame_time;
    if (this.delay > 0) { this.delay -= this.frameTime; return; }
    this.processKeys();
    switch (this.state) {
      case PushBoxCanvas.STATE_LOADING:
        this.load();
        this.intro_txt_idx = 0;
        this.setState(PushBoxCanvas.STATE_START);
        break;
      case PushBoxCanvas.STATE_START:
        this.update();
        break;
      case PushBoxCanvas.STATE_LEVEL_SELECT:
        break;
      case PushBoxCanvas.STATE_GAME:
        this.update();
        break;
      case PushBoxCanvas.STATE_WIN:
        this.update();
        break;
    }
    this.tick++;
    if (this.tick > 10000) this.tick = 0;
    if (this.INTRO_TEXT &&
        this.tick > this.INTRO_TEXT[this.intro_txt_idx][0].length + this.INTRO_TEXT[this.intro_txt_idx][1].length + 6) {
      if (this.state === PushBoxCanvas.STATE_START || this.state === PushBoxCanvas.STATE_LEVEL_SELECT) {
        this.tick = 0;
        this.face = false;
        this.intro_txt_idx += 1;
        if (this.state !== PushBoxCanvas.STATE_START)
          this.intro_txt_idx %= 2;
        else this.intro_txt_idx = 1;
      }
    }
    if (this.demo) this.demoTurn(this.demo_idx);
  }

  setState(s) {
    this.state = s;
    switch (this.state) {
      case PushBoxCanvas.STATE_START:
        this.tick = 0;
        this.target_cnt = 0;
        this.loadLevel();
        this.INTRO_TEXT = [
          [chars("Hi there! help"), chars("me push boxes!")],
          [chars("fire starts..."), chars("left key quits!")]
        ];
        this.demo = true;
        break;
      case PushBoxCanvas.STATE_LEVEL_SELECT:
        this.loadLevel();
        this.INTRO_TEXT = [
          [chars("Up or down key"), chars("to select level")],
          [chars("fire starts..."), chars("left key quits!")]
        ];
        this.demo = false;
        this.tick = 0;
        this.intro_txt_idx = 0;
        break;
      case PushBoxCanvas.STATE_GAME:
        this.INTRO_TEXT = [
          [chars("Go! push boxes!"), chars("fire quits...")],
          [chars("alle Kisten"), chars("auf blaue felder")]
        ];
        this.target_cnt = 0;
        this.tick = 0;
        this.UP = false; this.LEFT = false; this.RIGHT = false; this.DOWN = false;
        this.intro_txt_idx = 0;
        break;
      case PushBoxCanvas.STATE_WIN:
        this.tick = 0;
        this.flag = true;
        this.INTRO_TEXT = [
          [chars("Good Job!!"), chars("Stage " + (this.lev + 1) + " cleared")],
          [chars("you rock! press"), chars("fire to continue")]
        ];
        this.intro_txt_idx = 0;
        break;
    }
  }

  tile_x(tileX, tileY) {
    return ((tileX - tileY) * (PushBoxCanvas.TILE_DX >> 1)) + this.top_map;
  }

  tile_y(tileX, tileY) {
    return (tileX + tileY) * (PushBoxCanvas.TILE_DY >> 1);
  }

  notifyt(o, state) {
    switch (state) {
      case Sprite.STATE_PUSHED:
        if (this.target_cnt === PushBoxCanvas.targets[this.lev]) {
          this.setState(PushBoxCanvas.STATE_WIN);
        }
        break;
    }
  }

  getDirection(dx, dy) {
    let dir = -1;
    let aDx = dx, aDy = dy;
    if (aDx < 0) aDx = -aDx;
    if (aDy < 0) aDy = -aDy;
    if (aDx > aDy) dir = dx > 0 ? 1 : 3;
    else dir = dy > 0 ? 2 : 0;
    return dir;
  }

  setCamera(x, y) {
    x -= PushBoxCanvas.VP_FOCUS_OX;
    y -= PushBoxCanvas.VP_FOCUS_OY;
    this.camX = (x < this.min_camX ? this.min_camX : (x > this.max_camX ? this.max_camX : x));
    this.camY = (y < this.min_camY ? this.min_camY : (y > this.max_camY ? this.max_camY : y));
  }

  resetObjects() {
    this.numObjects = 0;
    for (let i = 2; --i >= 0;)
      this.boxes = 0;
    this.sorted = null;
  }

  addObject(type) {
    const o = this.objects[this.numObjects++];
    o.init(type);
    const numType = this.boxes;
    this.blockes[numType] = o;
    o.localIndex = this.boxes++;
    this.add_object(o);
    return o;
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

  remove_objectt(o) {
    if (o.prev != null) o.prev.next = o.next;
    else this.sorted = o.next;
    if (o.next != null) o.next.prev = o.prev;
  }

  numObjectsOfType(type) {
    let num = 0;
    for (let i = this.numObjects; --i >= 0;) {
      if (this.objects[i].type === type) num++;
    }
    return num;
  }

  getObjectSuperType(tileX, tileY) {
    let o = null;
    const os = this.blockes;
    for (let i = this.boxes; --i >= 0;) {
      const compare = os[i];
      if (compare.doesOccupy(tileX, tileY)) { o = compare; break; }
    }
    return o;
  }

  getObjectType(tileX, tileY, type) {
    let o = null;
    const os = this.blockes;
    for (let i = this.boxes; --i >= 0;) {
      const compare = os[i];
      if (compare.type !== type) continue;
      if (compare.doesOccupy(tileX, tileY)) { o = compare; break; }
    }
    return o;
  }

  loadLevel() {
    this.resetObjects();
    try {
      this.size_map = PushBoxCanvas.map[this.lev].length;
      this.width_map = PushBoxCanvas.mapw[this.lev];
      this.height_map = (this.size_map / this.width_map) | 0;

      this.px_width = ((this.width_map + this.height_map) * ((PushBoxCanvas.TILE_WIDTH >> 1) + 1)) - 2;
      this.px_height = (this.width_map + this.height_map) * (PushBoxCanvas.TILE_HEIGHT >> 1);
      this.top_map = (this.height_map - 1) * ((PushBoxCanvas.TILE_WIDTH >> 1) + 1);

      if (this.width_map <= this.height_map) {
        this.max_row = this.width_map;
        this.high_corner = this.width_map - 1;
        this.low_corner = this.height_map - 1;
      } else {
        this.max_row = this.height_map;
        this.high_corner = this.height_map - 1;
        this.low_corner = this.width_map - 1;
      }

      for (let i = 0; i < PushBoxCanvas.obj[this.lev].length; i++) {
        const type = PushBoxCanvas.obj[this.lev][i][0];
        const x = PushBoxCanvas.obj[this.lev][i][1];
        const y = PushBoxCanvas.obj[this.lev][i][2];
        const dir = 0;
        const o = this.addObject(type);
        o.setTile(x, y, dir);
        if (o.type === Sprite.TYPE_LION) this.player = o;
      }
    } catch (ioe) {
      console.error(ioe);
    }

    this.sort();

    this.min_camX = -PushBoxCanvas.BORDER_W;
    this.min_camY = -PushBoxCanvas.BORDER_N;
    this.max_camX = (this.px_width + PushBoxCanvas.BORDER_E) - PushBoxCanvas.VP_WIDTH;
    this.max_camY = (this.px_height + PushBoxCanvas.BORDER_S) - PushBoxCanvas.VP_HEIGHT;
    if (this.max_camX < 0) this.max_camX = 0;
    if (this.max_camY < 0) this.max_camY = 0;

    this.setCamera(this.player.x, this.player.y);
  }

  load() {
    // The original read images from the packed resource "a.bin"; that bundle
    // is gone, so we regenerate the same data[] table procedurally.
    this.data = buildAssets((p) => { this.progress = p; });

    Sprite.engine = this;

    for (let i = PushBoxCanvas.MAX_OBJECTS; --i >= 0;)
      this.objects[i] = new Sprite(i);

    this.blockes = new Array(20).fill(null);
    for (let i = 0; i < 36; i++)
      this.FONT_pics[i + 3] = this.data[i + 6];
    this.FONT_pics[0] = this.data[46];
    this.FONT_pics[1] = this.data[47];
    this.FONT_pics[2] = this.data[48];
    this.alex[0] = this.data[42];
    this.alex[1] = this.data[43];
    this.alex[2] = this.data[44];
    this.alex[3] = this.data[45];

    this.load_evel();
  }

  setCamGrid() {
    if (this.camX >= 0) {
      this.cam_gridX = (this.camX / PushBoxCanvas.TILE_DX) | 0;
      this.otx = this.camX - (this.cam_gridX * PushBoxCanvas.TILE_DX);
    } else {
      this.cam_gridX = -(((1 - this.camX) / PushBoxCanvas.TILE_DX) | 0);
      this.otx = PushBoxCanvas.TILE_DX + this.camX - (this.cam_gridX * PushBoxCanvas.TILE_DX);
      this.cam_gridX--;
    }
    if (this.camY >= 0) {
      this.cam_gridY = (this.camY / PushBoxCanvas.TILE_DY) | 0;
      this.oty = this.camY - (this.cam_gridY * PushBoxCanvas.TILE_DY);
    } else {
      this.cam_gridY = -(((1 - this.camY) / PushBoxCanvas.TILE_DY) | 0);
      this.oty = PushBoxCanvas.TILE_DY + this.camY - (this.cam_gridY * PushBoxCanvas.TILE_DY);
      this.cam_gridY--;
    }
    if ((this.height_map & 0x1) === 0) {
      this.otx += (PushBoxCanvas.TILE_DX >> 1);
      if (this.otx >= PushBoxCanvas.TILE_DX) {
        this.otx -= PushBoxCanvas.TILE_DX;
        this.cam_gridX++;
      }
    }
  }

  paint(g) {
    if (this.first) {
      g.setColor(0, 0, 0);
      g.fillRect(0, 0, this.getWidth(), this.getHeight());
      this.first = false;
    }
    g.setClip(0, 0, 176, 208);

    switch (this.state) {
      case PushBoxCanvas.STATE_LOADING:
        if (this.tick === 0) {
          g.setColor(89, 151, 187);
          g.fillRect(0, 0, this.getWidth(), this.getHeight());
          g.setColor(255, 255, 255);
        }
        g.fillRect(((176 / 2) | 0) - 27, ((208 / 2) | 0) - 5, this.progress, 10);
        break;

      case PushBoxCanvas.STATE_LEVEL_LOAD:
        break;

      case PushBoxCanvas.STATE_START:
      case PushBoxCanvas.STATE_LEVEL_SELECT:
      case PushBoxCanvas.STATE_GAME:
      case PushBoxCanvas.STATE_WIN: {
        this.paintGame(g);
        if (this.state === PushBoxCanvas.STATE_START)
          g.drawImage(this.data[1], 0, 2, Graphics.TOP | Graphics.LEFT);
        g.setColor(26, 97, 169);
        g.fillRect(0, 180, 176, 28);
        g.setColor(255, 255, 255);

        let offx = 70;
        let offy = 67;
        if (this.state === PushBoxCanvas.STATE_START) {
          if (this.face) {
            g.setColor(0, 48, 101);
            g.drawRect(offx + 29, offy + 0, 69 + 1, 103 + 1);
            if (this.currentIndex === 0) {
              g.drawImage(this.alex[0], offx + 30, offy + 1, Graphics.TOP | Graphics.LEFT);
            } else {
              g.drawImage(this.alex[3], offx + 30, offy + 1, Graphics.TOP | Graphics.LEFT);
              g.drawImage(this.alex[this.currentIndex], offx + 40, offy + 0 + 1, Graphics.TOP | Graphics.LEFT);
            }
          }
        }
        offx = 0;
        offy = 88;
        const xx = 0, yy = 0;
        const text = this.INTRO_TEXT[this.intro_txt_idx];
        let maxj = 0, maxi = 0;

        g.setColor(89, 151, 187);
        g.fillRect(offx + xx, offy + yy + 78, 176, 41);
        g.setColor(0, 48, 101);
        g.drawRect(offx + xx, offy + yy + 78, 175, 41);
        for (let i = 0; i < text.length; i++) {
          for (let j = 0; j < text[i].length; j++) {
            if (this.tick * 4 > (i * 2) * (text.length * text[i].length) + 20 + j * text.length) {
              this.drawString(g, "" + text[i][j] + "", offx + xx + 4 + j * 10, offy + yy + 87 + i * 15, 40);
              maxj = j;
              maxi = i;
            }
          }
        }
        if (this.tick * 4 % 15 < 7) {
          if (this.currentIndex !== 0 && !this.flag) {
            this.currentIndex++;
            if (this.currentIndex > 2) this.currentIndex = 1;
          }
          if (maxj < text[maxi].length - 1) {
            g.setColor(202, 233, 251);
            g.fillRect(offx + xx + 4 + maxj * 10, offy + yy + 87 + maxi * 15, 9, 11);
          } else {
            g.setColor(202, 233, 251);
            g.fillRect(offx + xx + 4 + maxj * 10 + 10, offy + yy + 87 + maxi * 15, 9, 11);
          }
        }
        if (maxi >= text.length - 1 && maxj >= text[maxi].length - 1) {
          this.currentIndex = 0;
        } else if (maxj >= text[maxi].length - 1) {
          this.currentIndex = 1;
          this.flag = true;
        } else this.flag = false;
        if (this.state === PushBoxCanvas.STATE_LEVEL_SELECT) {
          g.setColor(89, 151, 187);
          g.fillRect(0, 0, 80, 30);
          g.setColor(0, 48, 101);
          g.drawRect(0, 0, 79, 30);
          let levelstrg = "" + (this.lev + 1);
          if (this.lev + 1 < 10) levelstrg = "0" + (this.lev + 1);
          this.drawString(g, levelstrg + ".stage", 8, 10, 100);
        }
        if (this.state === PushBoxCanvas.STATE_WIN) {
          g.drawImage(this.data[(this.tick % 4) + 49], 10, 2, Graphics.TOP | Graphics.LEFT);
        }
        break;
      }
    }
    if (this.getWidth() > 176) {
      g.setClip(176, 0, 45, 208);
      g.setColor(0, 0, 0);
      g.fillRect(176, 0, 45, 208);
    }
  }

  paintGame(g) {
    let sorted = this.sorted;

    this.paintTexture(g);
    this.setCamGrid();
    this.setSlide();
    this.setRlen();

    let tile;

    for (let i = PushBoxCanvas.VP_TILES_HEIGHT; --i >= 0; this.y += PushBoxCanvas.TILE_DY >> 1) {
      g.setClip(0, 0, PushBoxCanvas.SCREEN_WIDTH, PushBoxCanvas.SCREEN_HEIGHT);

      if (this.y < PushBoxCanvas.SCREEN_HEIGHT)
        for (let j = PushBoxCanvas.VP_TILES_WIDTH, px = this.x, rIndex = this.index, r = this.rOff;
             --j >= 0; px += PushBoxCanvas.TILE_DX, rIndex -= (this.width_map - 1), r++) {
          if (r < 0 || r >= this.rLen) continue;
          tile = PushBoxCanvas.map[this.lev][rIndex];
          if (tile === 1)
            g.drawImage(this.data[54], px, this.y, Graphics.TOP | Graphics.LEFT);
          else if (tile === 2)
            g.drawImage(this.data[3], px, this.y, Graphics.TOP | Graphics.LEFT);
        }

      g.translate(-this.camX, -this.camY);
      while (sorted != null && sorted.tileRow <= this.row && sorted.tileOffset > 0) {
        if (PushBoxCanvas.isOnScreen(this, sorted)) sorted.paint(g);
        sorted = sorted.next;
      }
      g.translate(this.camX, this.camY);

      g.setClip(0, 0, PushBoxCanvas.SCREEN_WIDTH, PushBoxCanvas.SCREEN_HEIGHT);
      g.translate(-this.camX, -this.camY);
      while (sorted != null && sorted.tileRow <= this.row) {
        if (PushBoxCanvas.isOnScreen(this, sorted)) sorted.paint(g);
        sorted = sorted.next;
      }
      g.translate(this.camX, this.camY);
      this.nextXY();
    }

    g.setClip(0, 0, PushBoxCanvas.SCREEN_WIDTH, PushBoxCanvas.SCREEN_HEIGHT);
  }

  static isOnScreen(self, o) {
    const sx = o.x + o.offsetX;
    const sy = o.y + o.offsetY;
    return ((sx + o.swidth) >= self.camX && sx < (self.camX + PushBoxCanvas.VP_WIDTH)
      && (sy + o.sheight) >= self.camY && sy < (self.camY + PushBoxCanvas.VP_HEIGHT));
  }

  paintTexture(g) {
    const imgTexture = this.data[0];
    let ox = this.camX;
    let oy = this.camY;
    while (ox < 0) ox += PushBoxCanvas.TEXTURE_WIDTH;
    while (oy < 0) oy += PushBoxCanvas.TEXTURE_HEIGHT;
    ox = -(ox % PushBoxCanvas.TEXTURE_WIDTH);
    oy = -(oy % PushBoxCanvas.TEXTURE_HEIGHT);
    for (let y = oy; y < PushBoxCanvas.SCREEN_HEIGHT; y += PushBoxCanvas.TEXTURE_HEIGHT)
      for (let x = ox; x < PushBoxCanvas.SCREEN_WIDTH; x += PushBoxCanvas.TEXTURE_WIDTH)
        g.drawImage(imgTexture, x, y, Graphics.TOP | Graphics.LEFT);
  }

  processKeys() {
    if (this.state === PushBoxCanvas.STATE_GAME) {
      if (this.UP) this.player.setKeys(Sprite.DIR_NORTH);
      else if (this.DOWN) this.player.setKeys(Sprite.DIR_SOUTH);
      else if (this.LEFT) this.player.setKeys(Sprite.DIR_WEST);
      else if (this.RIGHT) this.player.setKeys(Sprite.DIR_EAST);
      if (this.release) {
        this.UP = false; this.DOWN = false; this.LEFT = false; this.RIGHT = false;
        this.release = false;
      }
    }
  }

  start() {
    this.setState(PushBoxCanvas.STATE_LOADING);
  }

  nextXY() {
    if (this.slide === 1) {
      this.index++;
      this.x += PushBoxCanvas.TILE_DX >> 1;
    } else {
      this.index += this.width_map;
      this.x -= PushBoxCanvas.TILE_DX >> 1;
    }
    if (this.row < this.high_corner) this.rLen++;
    else if (this.row >= this.low_corner) this.rLen--;
    this.row++;
    if (this.row < this.height_map && this.slide === 1) this.rOff++;
    if (this.row >= this.height_map && this.slide === 0) this.rOff--;
    this.slide = 1 - this.slide;
  }

  exit() {
    this.running = false;
  }

  setRlen() {
    if (this.row >= this.height_map)
      this.rOff -= 1 + (this.row - this.height_map);
    this.rLen = 1 + this.row;
    if (this.row <= this.high_corner) this.rLen = 1 + this.row;
    else if (this.row <= this.low_corner) this.rLen = this.max_row;
    else this.rLen = this.max_row + this.low_corner - this.row;
  }

  keyPressed(keyCode) {
    const action = this.getGameAction(keyCode);
    switch (action) {
      case Canvas.UP:
        if (this.state === PushBoxCanvas.STATE_GAME) this.UP = true;
        if (this.state === PushBoxCanvas.STATE_LEVEL_SELECT) {
          if (this.lev > 0) { this.lev--; this.loadLevel(); }
          else { this.lev = 32; this.loadLevel(); }
        }
        break;
      case Canvas.DOWN:
        if (this.state === PushBoxCanvas.STATE_GAME) this.DOWN = true;
        if (this.state === PushBoxCanvas.STATE_LEVEL_SELECT) {
          if (this.lev < 32) { this.lev++; this.loadLevel(); }
          else { this.lev = 0; this.loadLevel(); }
        }
        break;
      case Canvas.FIRE:
        if (this.state === PushBoxCanvas.STATE_LEVEL_SELECT) this.setState(PushBoxCanvas.STATE_GAME);
        else if (this.state === PushBoxCanvas.STATE_WIN) this.setState(PushBoxCanvas.STATE_LEVEL_SELECT);
        else if (this.state === PushBoxCanvas.STATE_START) this.setState(PushBoxCanvas.STATE_LEVEL_SELECT);
        else if (this.state === PushBoxCanvas.STATE_GAME) this.setState(PushBoxCanvas.STATE_LEVEL_SELECT);
        break;
      case Canvas.LEFT:
        if (this.state === PushBoxCanvas.STATE_GAME) this.LEFT = true;
        if (this.state === PushBoxCanvas.STATE_START) {
          // original quit the MIDlet; here we just stay on the title.
          this.saveLevel();
        }
        if (this.state === PushBoxCanvas.STATE_LEVEL_SELECT) {
          this.setState(PushBoxCanvas.STATE_START);
          this.intro_txt_idx = 1;
        }
        break;
      case Canvas.RIGHT:
        if (this.state === PushBoxCanvas.STATE_GAME) this.RIGHT = true;
        break;
    }
  }

  keyReleased(e) {
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

  stop() { this.destroy(); }
  destroy() { this.running = false; }

  sort() {
    for (let i = this.numObjects; --i >= 0;) {
      const o = this.objects[i];
      if (o.moved) this.remove_objectt(o);
    }
    for (let i = this.numObjects; --i >= 0;) {
      const o = this.objects[i];
      if (o.moved) { this.add_object(o); o.moved = false; }
    }
  }

  tile_accessible(o, tileX, tileY, dir) {
    let canMove = false;
    if (tileX >= 0 && tileX < this.width_map && tileY >= 0 && tileY < this.height_map) {
      const index = tileX + (tileY * this.width_map);
      const tile = PushBoxCanvas.map[this.lev][index];
      switch (tile) {
        case PushBoxCanvas.TILE_GROUND:
        case PushBoxCanvas.TILE_TARGET:
          canMove = true;
          break;
      }
    }
    return canMove;
  }

  getTile(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width_map || tileY < 0 || tileY >= this.height_map) {
      return -1;
    } else {
      const index = (this.width_map * tileY) + tileX;
      return PushBoxCanvas.map[this.lev][index];
    }
  }

  drawString(g, str, x, y, width) {
    const n = String(str).toUpperCase();
    const chars = n.split("");
    const line = new Array(chars.length);
    const dx = new Array(chars.length);
    let total = 0;
    for (let i = 0; i < chars.length; i++) {
      let im = null;
      const code = chars[i].charCodeAt(0);
      if (code !== 32) {
        switch (code) {
          case 46: im = this.FONT_pics[36]; break; // .
          case 63: im = this.FONT_pics[38]; break; // ?
          case 33: im = this.FONT_pics[37]; break; // !
        }
        if (im == null) {
          if (code >= 48 && code <= 57) im = this.FONT_pics[code - 22];
          else im = this.FONT_pics[code - 65];
        }
        if (im == null) { dx[i] = 1; line[i] = null; total += 1; continue; }
        dx[i] = im.getWidth() + 1;
        total += dx[i];
        line[i] = im;
      } else {
        dx[i] = 1;
        line[i] = null;
        total += 1;
      }
    }
    let xx = x;
    for (let i = 0; i < line.length; i++) {
      if (line[i] != null) g.drawImage(line[i], xx, y, Graphics.TOP | Graphics.LEFT);
      xx += dx[i];
    }
  }

  // The original persisted the current level in an RMS RecordStore; here we
  // use localStorage, with the same intent (remember where the player was).
  saveLevel() {
    try { window.localStorage.setItem(PushBoxCanvas.STORE_NAME, String(this.lev)); }
    catch (e) { /* ignore */ }
  }

  load_evel() {
    try {
      const v = window.localStorage.getItem(PushBoxCanvas.STORE_NAME);
      this.lev = v == null ? 0 : (parseInt(v, 10) || 0);
    } catch (e) {
      this.lev = 0;
    }
  }
}

/* helper: String -> array of single chars (Java new String(...).toCharArray()) */
function chars(s) { return s.split(""); }

/* ---- static constants (verbatim from PushBoxCanvas.java) ----------------- */
PushBoxCanvas.STORE_NAME = "PushBoxRMS";
PushBoxCanvas.SCREEN_WIDTH = 176;
PushBoxCanvas.SCREEN_HEIGHT = 208;
PushBoxCanvas.SCREEN_HCENTER = 176 >> 1;
PushBoxCanvas.SCREEN_VCENTER = 208 >> 1;
PushBoxCanvas.TILE_WIDTH = 46;
PushBoxCanvas.TILE_HEIGHT = 24;
PushBoxCanvas.TILE_DX = PushBoxCanvas.TILE_WIDTH + 2;
PushBoxCanvas.TILE_DY = PushBoxCanvas.TILE_HEIGHT;
PushBoxCanvas.TEXTURE_WIDTH = 48;
PushBoxCanvas.TEXTURE_HEIGHT = 48;
PushBoxCanvas.VP_WIDTH = PushBoxCanvas.SCREEN_WIDTH;
PushBoxCanvas.VP_HEIGHT = PushBoxCanvas.SCREEN_HEIGHT;
PushBoxCanvas.VP_TILES_WIDTH = 5;
PushBoxCanvas.VP_TILES_HEIGHT = 22;
PushBoxCanvas.VP_HCENTER = PushBoxCanvas.VP_WIDTH >> 1;
PushBoxCanvas.VP_VCENTER = PushBoxCanvas.VP_HEIGHT >> 1;
PushBoxCanvas.VP_FOCUS_OX = PushBoxCanvas.VP_HCENTER;
PushBoxCanvas.VP_FOCUS_OY = PushBoxCanvas.VP_VCENTER;
PushBoxCanvas.BORDER_N = 20;
PushBoxCanvas.BORDER_S = 10;
PushBoxCanvas.BORDER_E = 10;
PushBoxCanvas.BORDER_W = 10;
PushBoxCanvas.STATE_NONE = -1;
PushBoxCanvas.STATE_GAME = 0;
PushBoxCanvas.STATE_LEVEL_LOAD = 2;
PushBoxCanvas.STATE_LEVEL_SELECT = 3;
PushBoxCanvas.STATE_START = 4;
PushBoxCanvas.STATE_LOADING = 5;
PushBoxCanvas.STATE_WIN = 6;
PushBoxCanvas.TILE_GROUND = 0;
PushBoxCanvas.TILE_TARGET = 1;
PushBoxCanvas.FRAMERATE_GAME = 40;
PushBoxCanvas.FRAMERATE_TALKING = 40;
PushBoxCanvas.MAX_OBJECTS = 32;

/* ---- level data (transcribed verbatim into levels.js) -------------------- */
PushBoxCanvas.obj = LEVEL_DATA.obj;
PushBoxCanvas.map = LEVEL_DATA.map;
PushBoxCanvas.mapw = LEVEL_DATA.mapw;
PushBoxCanvas.targets = LEVEL_DATA.targets;

/* Sprite tile geometry depends on PushBoxCanvas tile size. */
Sprite.TILE_X = PushBoxCanvas.TILE_DX >> 1;
Sprite.TILE_Y = PushBoxCanvas.TILE_DY >> 1;

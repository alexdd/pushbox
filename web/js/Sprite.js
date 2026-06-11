/*
The MIT License (MIT)

Copyright (c) 2005 Alex Duesel, http://www.mandarine.tv
HTML5 / JavaScript conversion (c) 2025

  Sprite.js  --  direct port of the 2005 Sprite.java.
  The class structure, constants, field list and the movement / pushing
  logic are kept 1:1 with the original Java so the old code stays
  recognizable; only the syntax is now JavaScript.
*/

"use strict";

class Sprite {

  constructor(globalIndex) {
    // --- instance fields (same names as the Java source) ---
    this.frame = 0; this.frameIndex = 0; this.frameRate = 0; this.frameDelay = 0;
    this.loops = 0; this.globalIndex = globalIndex; this.localIndex = 0;
    this.type = 0; this.state = 0; this.ticks = 0;
    this.x = 0; this.y = 0; this.height = 0; this.dir = 0; this.speed = 0;
    this.currentTile = 0; this.tileRow = 0; this.tileX = 0; this.tileY = 0;
    this.tileOffset = 0; this.tileTicks = 0; this.frameOffset = 0;
    this.walk = 0; this.steps = 0;
    this.swidth = 0; this.sheight = 0; this.scanHeight = 0; this.scanMask = 0;
    this.offsetX = 0; this.offsetY = 0;
    this.frames = null;
    this.isPlayer = false; this.moved = false; this.painted = false; this.move = false;
    this.image = null;
    this.pushing = null; this.prev = null; this.next = null;
  }

  init(type) {
    this.type = type;
    this.isPlayer = (type === Sprite.BOX);
    this.walk = Sprite.DIR_NONE;
    this.steps = 0;
    this.pushing = null;
    this.move = false;
    this.setState(Sprite.STATE_IDLE);
    // original referenced the static PushBoxCanvas.data[]; here data lives on
    // the engine instance, so we read it through Sprite.engine.
    const imgs = [Sprite.engine.data[5], Sprite.engine.data[2], Sprite.engine.data[4]];
    this.setSpriteImage(imgs[type], type);
  }

  setState(state) {
    this.frameOffset = 0;
    let frames = null;
    let frameRate = Sprite.DEFAULT_FRAME_RATE;
    switch (state) {
      case Sprite.STATE_IDLE:
        if (this.isPlayer) {
          this.frameOffset += (this.dir * 3);
        }
        break;
      case Sprite.STATE_MOVING:
        if (this.isPlayer) {
          this.frameOffset += (this.dir * 3);
          frames = Sprite.FRAMES_MOVING;
        }
        break;
    }
    this.reset(frames, frameRate);
    this.state = state;
  }

  setTile(tileX, tileY, dir) {
    this.tileRow = tileX + tileY;
    this.x = Sprite.engine.tile_x(tileX, tileY) + Sprite.TILE_X;
    this.y = Sprite.engine.tile_y(tileX, tileY) + Sprite.TILE_Y;
    this.currentTile = Sprite.engine.getTile(tileX, tileY);
    this.height = 0;
    this.dir = dir;
    this.tileX = tileX;
    this.tileY = tileY;
    this.steps = 0;
    this.tileOffset = 0;
    this.tileTicks = 0;
    this.moved = true;
    this.setState(Sprite.STATE_IDLE);
  }

  doesOccupy(tileX, tileY) {
    let doesOccupy = false;
    let tx = this.tileX;
    let ty = this.tileY;
    if (tx === tileX && ty === tileY) {
      doesOccupy = true;
    } else if (this.tileOffset !== 0) {
      if (this.tileX + Sprite.DIR_X[this.dir] === tx && this.tileY + Sprite.DIR_Y[this.dir] === ty) {
        tx -= Sprite.DIR_X[this.dir];
        ty -= Sprite.DIR_Y[this.dir];
      } else {
        tx += Sprite.DIR_X[this.dir];
        ty += Sprite.DIR_Y[this.dir];
      }
      if (tx === tileX && ty === tileY)
        doesOccupy = true;
    }
    return doesOccupy;
  }

  update(frameTime) {
    let stop;
    let distance;
    if (this.ticks > 0) {
      this.ticks--;
      if (this.ticks === 0) {
        this.setState(this.state);
      }
    }
    switch (this.state) {
      case Sprite.STATE_IDLE:
        if (this.isPlayer) {
          if (this.move) {
            this.move = false;
            if (this.moveDir(this.dir)) {
              this.update(frameTime);
              return;
            }
          }
          if (this.walk !== Sprite.DIR_NONE) {
            if (this.moveDir(this.walk)) {
              this.update(frameTime);
              return;
            } else {
              this.dir = this.walk;
              this.setState(Sprite.STATE_IDLE);
            }
          }
        }
        if (this.frames === Sprite.FRAMES_MOVING)
          this.setState(Sprite.STATE_IDLE);
        break;
      case Sprite.STATE_MOVING:
        stop = false;
        distance = Sprite.SPEED;
        if (this.steps < distance) {
          stop = true;
          if (this.isPlayer) {
            const next = (this.walk === this.dir);
            if (next) {
              if (this.moveDir(this.dir))
                stop = false;
            }
          }
          if (stop) distance = this.steps;
        }
        this.steps -= distance;
        this.moveStep(this.dir, distance);
        if (stop) {
          this.stop();
          this.state = Sprite.STATE_IDLE;
        }
        break;
    }
    this.tileTicks++;
    this.animate(frameTime);
    this.walk = Sprite.DIR_NONE;
  }

  // Java had two overloads of move(); JS has no overloading, so the
  // single-arg "try to move in dir" version is moveDir() and the
  // (dir,distance) translation version is moveStep().
  moveDir(dir) {
    let move = true;
    let set = true;
    move = this.canMove(dir, 0);
    if (this.dir === dir && this.state === Sprite.STATE_MOVING)
      set = false;
    if (move || this.isPlayer)
      this.dir = dir;
    if (move) {
      this.move = false;
      this.push(dir);
      this.steps += Sprite.TILE_STEPS_DY;
      if (set)
        this.setState(Sprite.STATE_MOVING);
      else
        this.state = Sprite.STATE_MOVING;
    }
    if (Sprite.engine.demo) Sprite.engine.demo_idx++;
    return move;
  }

  push(dir) {
    this.dir = dir;
    if (this.pushing == null)
      this.pushing = Sprite.engine.getObjectSuperType(this.tileX + Sprite.DIR_X[dir], this.tileY + Sprite.DIR_Y[dir]);
    if (this.pushing != null) {
      this.pushing.push(dir);
      if (Sprite.engine.getTile(this.pushing.tileX + Sprite.DIR_X[dir], this.pushing.tileY + Sprite.DIR_Y[dir]) === 1) {
        this.pushing.image = Sprite.engine.data[4];
        if (Sprite.engine.getTile(this.pushing.tileX, this.pushing.tileY) !== 1)
          Sprite.engine.target_cnt += 1;
        Sprite.engine.notifyt(this, Sprite.STATE_PUSHED);
      } else if (Sprite.engine.getTile(this.pushing.tileX + Sprite.DIR_X[dir], this.pushing.tileY + Sprite.DIR_Y[dir]) === 0) {
        if (this.pushing.image === Sprite.engine.data[4])
          Sprite.engine.target_cnt -= 1;
        this.pushing.image = Sprite.engine.data[2];
      }
      this.pushing.setState(Sprite.STATE_PUSHED);
    }
  }

  stop() {
    if (this.pushing != null) {
      this.pushing.stop();
      this.pushing = null;
    }
    if (this.state === Sprite.STATE_PUSHED)
      this.state = Sprite.STATE_IDLE;
    this.steps = 0;
    this.tileOffset = 0;
  }

  canMove(dir, stack) {
    if (!Sprite.engine.tile_accessible(this, this.tileX + Sprite.DIR_X[dir], this.tileY + Sprite.DIR_Y[dir], dir))
      return false;
    let canMove = true;
    const block = Sprite.engine.getObjectSuperType(this.tileX + Sprite.DIR_X[dir], this.tileY + Sprite.DIR_Y[dir]);
    if (block != null) {
      canMove = false;
      if (block !== this.pushing && (this.steps !== 0 || block.state !== Sprite.STATE_IDLE)) {
        // blocked
      } else if (stack < 1) {
        if (block.type === Sprite.TARGET || block.type === Sprite.BOX2) {
          if (this.isPlayer)
            canMove = block.canMove(dir, stack++);
        }
      }
    }
    return canMove;
  }

  changeTile() {
    this.tileX += Sprite.DIR_X[this.dir];
    this.tileY += Sprite.DIR_Y[this.dir];
    this.currentTile = Sprite.engine.getTile(this.tileX, this.tileY);
    this.tileTicks = 0;
  }

  moveStep(dir, distance) {
    const offset = this.tileOffset + distance;
    if (offset >= Sprite.TILE_STEPS) {
      this.tileRow = this.tileX + this.tileY;
      this.tileOffset -= Sprite.TILE_STEPS;
    }
    if ((this.tileOffset === 0 || offset > Sprite.TILE_STEPS) && (dir === Sprite.DIR_SOUTH || dir === Sprite.DIR_EAST))
      this.tileRow = this.tileX + Sprite.DIR_X[dir] + this.tileY + Sprite.DIR_Y[dir];
    this.tileOffset += distance;
    if ((this.tileX !== this.tileX + Sprite.DIR_X[dir] || this.tileY !== this.tileY + Sprite.DIR_Y[dir]) && this.tileOffset >= (Sprite.TILE_STEPS >> 1))
      this.changeTile();
    this.x += Sprite.DIR_TILE_X[dir] * distance;
    this.y += Sprite.DIR_TILE_Y[dir] * distance;
    if (this.pushing != null)
      this.pushing.moveStep(dir, distance);
    this.moved = true;
  }

  setKeys(dir) {
    this.walk = dir;
  }

  setSpriteImage(img, type) {
    this.image = img;
    this.swidth = Sprite.SPRITE_WIDTH[type];
    this.sheight = Sprite.SPRITE_HEIGHT[type];
    this.scanHeight = Sprite.SPRITE_SCAN[type];
    for (let s = this.scanHeight; --s >= 0;)
      this.scanMask |= (0x1 << s);
    this.offsetX = Sprite.SPRITE_OFFSET_X[type];
    this.offsetY = Sprite.SPRITE_OFFSET_Y[type];
  }

  reset(frames, frameRate) {
    this.frames = frames;
    this.frameRate = frameRate;
    this.frameIndex = 0;
    this.frameDelay = frameRate;
    if (frames == null)
      this.frame = 0;
    else
      this.frame = frames[this.frameIndex];
    this.loops = 0;
    this.painted = false;
  }

  animate(frameTime) {
    if (frameTime > this.frameRate) frameTime = this.frameRate;
    this.frameDelay -= frameTime;
    if (!this.painted) return;
    if (this.frames != null && this.frameDelay <= 0) {
      this.frameIndex++;
      if (this.frameIndex === this.frames.length) {
        this.frameIndex = 0;
        this.loops++;
      }
      this.frameDelay += this.frameRate;
      this.frame = this.frames[this.frameIndex];
      this.painted = false;
    }
  }

  paint(g) {
    const xframe = this.frameOffset + this.frame;
    this.paintFrame(g, this.x, this.y - this.height, xframe);
    this.painted = true;
  }

  paintFrame(g, x, y, xframe) {
    x += this.offsetX;
    y += this.offsetY;
    const frameX = (xframe >> this.scanHeight) * this.swidth;
    const frameY = (xframe & this.scanMask) * this.sheight;
    g.setClip(x, y, this.swidth, this.sheight);
    g.drawImage(this.image, x - frameX, y - frameY, Graphics.TOP | Graphics.LEFT);
  }
}

/* ---- static constants (verbatim from Sprite.java) ------------------------ */
Sprite.engine = null;

Sprite.SPEED = 4;
Sprite.TILE_STEPS_DY = 12;
Sprite.TILE_STEPS = Sprite.TILE_STEPS_DY;
// TILE_X / TILE_Y reference PushBoxCanvas tile size (set after that class loads)
Sprite.STATE_IDLE = 0;
Sprite.STATE_MOVING = 1;
Sprite.STATE_PUSHED = 2;
Sprite.NUM_DIRECTIONS = 4;
Sprite.DIR_NONE = -1;
Sprite.DIR_NORTH = 0;
Sprite.DIR_EAST = 1;
Sprite.DIR_SOUTH = 2;
Sprite.DIR_WEST = 3;
Sprite.DIR_X = [0, 1, 0, -1];
Sprite.DIR_Y = [-1, 0, 1, 0];
Sprite.DIR_TILE_X = [2, 2, -2, -2];
Sprite.DIR_TILE_Y = [-1, 1, 1, -1];
Sprite.TYPE_LION = 0;      // the player (== BOX index in the image table)
Sprite.BOX = 0;
Sprite.TARGET = 1;
Sprite.BOX2 = 2;
Sprite.DEFAULT_FRAME_RATE = 150;

Sprite.SPRITE_WIDTH = [27, 45, 45];
Sprite.SPRITE_HEIGHT = [45, 44, 44];
Sprite.SPRITE_SCAN = [1, 1, 1];
Sprite.SPRITE_OFFSET_X = [-14, -21, -21];
Sprite.SPRITE_OFFSET_Y = [-41, -32, -32];
Sprite.FRAMES_MOVING = [1, 0, 2, 0];

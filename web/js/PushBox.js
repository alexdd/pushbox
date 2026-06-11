/*
The MIT License (MIT)

Copyright (c) 2005 Alex Duesel, http://www.mandarine.tv
HTML5 / JavaScript conversion (c) 2025

  PushBox.js  --  port of the 2005 PushBox.java MIDlet entry point.

  startApp() created the PushBoxCanvas and started its thread.  In the browser
  there is no MIDlet lifecycle, so this file builds the canvas, wires keyboard
  input the way FullCanvas.keyPressed/keyReleased did, and drives the game
  thread's run() loop with a fixed timestep (FRAMERATE_GAME = 40 ms) via
  requestAnimationFrame.
*/

"use strict";

class PushBox {
  constructor() {
    this.display = null;
    this.canvas = null;
  }

  startApp() {
    if (this.display != null) return;
    this.display = true;
    PushBox.app = this;

    const screen = document.getElementById("screen");
    this.canvas = new PushBoxCanvas(screen);

    this._wireInput(screen);
    this.canvas.start();        // -> setState(STATE_LOADING)
    this._startLoop();
  }

  _wireInput(screen) {
    const c = this.canvas;
    const held = Object.create(null);
    window.addEventListener("keydown", (e) => {
      if (c.getGameAction(e.key) !== 0) e.preventDefault();
      if (held[e.key]) return;   // ignore auto-repeat
      held[e.key] = true;
      c.keyPressed(e.key);
    });
    window.addEventListener("keyup", (e) => {
      held[e.key] = false;
      c.keyReleased(e.key);
    });
    // make the canvas focusable / clickable so keys reach the page
    screen.setAttribute("tabindex", "0");
    screen.addEventListener("click", () => screen.focus());
  }

  _startLoop() {
    const c = this.canvas;
    let last = 0;
    let acc = 0;
    const frame = (now) => {
      requestAnimationFrame(frame);
      if (last === 0) last = now;
      acc += now - last;
      last = now;
      if (acc > 500) acc = 500;     // avoid spiral-of-death after a tab switch
      while (acc >= c.frame_time) {
        c.step();
        acc -= c.frame_time;
      }
      c.repaint();
    };
    requestAnimationFrame(frame);
  }

  pauseApp() {}
  destroyApp() {}
}
PushBox.app = null;

window.addEventListener("load", () => {
  new PushBox().startApp();
});

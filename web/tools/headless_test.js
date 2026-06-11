// Headless logic test (no browser): stubs the DOM/canvas, loads the ported
// game classes, then checks:
//   1. all 33 levels load without error
//   2. the core mechanic (push a crate onto a target -> target_cnt++ -> WIN)
//      works, using a tiny synthetic level
//   3. a real shipped level (index 3) is solvable via the bundled solver
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function stubCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === "measureText") return () => ({ width: 8 });
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}
const documentStub = {
  createElement() {
    const c = { width: 0, height: 0 };
    c.getContext = () => stubCtx();
    c.getWidth = function () { return this.width; };
    c.getHeight = function () { return this.height; };
    c.setAttribute = () => {}; c.addEventListener = () => {};
    return c;
  },
  getElementById() { const c = documentStub.createElement(); c.width = 176; c.height = 208; return c; }
};
const sandbox = {
  window: { addEventListener() {}, localStorage: { getItem() { return null; }, setItem() {} } },
  document: documentStub, requestAnimationFrame() {}, console
};
vm.createContext(sandbox);
const base = path.join(__dirname, "..", "js");
for (const f of ["runtime.js", "levels.js", "Sprite.js", "PushBoxCanvas.js"])
  vm.runInContext(fs.readFileSync(path.join(base, f), "utf8"), sandbox, { filename: f });

// expose the solver into the sandbox
vm.runInContext(fs.readFileSync(path.join(__dirname, "solver.js"), "utf8"), sandbox, { filename: "solver.js" });

const code = `
  const out = {};
  const c = new PushBoxCanvas(document.getElementById("screen"));
  c.load();

  // (1) every level loads
  for (let L = 0; L < 33; L++) { c.lev = L; c.loadLevel(); }
  out.levelsLoaded = 33;

  // (2) core push mechanic on a synthetic level injected at index 0 of a copy
  const savedMap = PushBoxCanvas.map[0], savedObj = PushBoxCanvas.obj[0],
        savedW = PushBoxCanvas.mapw[0], savedT = PushBoxCanvas.targets[0];
  PushBoxCanvas.mapw[0] = 5;
  PushBoxCanvas.map[0] = [2,2,2,2,2, 2,0,0,1,2, 2,2,2,2,2];
  PushBoxCanvas.obj[0] = [[0,1,1],[1,2,1]];   // player(1,1), crate(2,1); target at (3,1)
  PushBoxCanvas.targets[0] = 1;
  c.lev = 0; c.loadLevel(); c.setState(PushBoxCanvas.STATE_GAME); c.frameTime = 40;
  c.RIGHT = true;                              // push EAST toward crate -> target
  let won = false;
  for (let s = 0; s < 30 && !won; s++) { c.step(); if (c.state === PushBoxCanvas.STATE_WIN) won = true; }
  out.pushMechanicWin = won;
  // restore real level 0
  PushBoxCanvas.map[0] = savedMap; PushBoxCanvas.obj[0] = savedObj;
  PushBoxCanvas.mapw[0] = savedW; PushBoxCanvas.targets[0] = savedT;

  // (3) solve a real shipped level
  const sol = solve(3, 2000000);
  out.level4_targets = PushBoxCanvas.targets[3];
  out.level4_solution = sol;
  out;
`;
const out = vm.runInContext(code, sandbox, { filename: "test.js" });

console.log("levels loaded            :", out.levelsLoaded);
console.log("push->target->WIN works  :", out.pushMechanicWin);
console.log("level 4 targets          :", out.level4_targets);
console.log("level 4 solution (keys)  :", out.level4_solution ? out.level4_solution.join(" ") : "NONE");

let ok = out.levelsLoaded === 33 && out.pushMechanicWin === true && Array.isArray(out.level4_solution);
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);

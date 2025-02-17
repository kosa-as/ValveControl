/*
 * Copyright (C) 2020, 2021, 2022 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

class World {
  constructor(p, width, height) {
    this.p = p;
    this.width = width;
    this.height = height;
    this.scale = 1;
    // (0, 0), in canvas dimensions:
    this.x0 = 0;
    this.y0 = 0;
    this.canvas = p.createCanvas(width, height);
    this.graphics = null;
    this.zoomInFactor = 1.05;
    this.zoomOutFactor = 0.95;
  }

  set(p, bounds) {
    let left = this.worldToCanvasX(bounds.x);
    let top = this.worldToCanvasY(bounds.y);
    let right = this.worldToCanvasX(bounds.x+bounds.width);
    let bottom = this.worldToCanvasY(bounds.y+bounds.height);
    // when needed, center for small dimensions:
    if (right - left < this.width) {
      left = (this.width - (right - left))/2;
    } else {
      // do not allow scrolling too far in either direction
      left = Math.max(this.width - (right - left), Math.min(left, 0));
    }
    if (bottom - top < this.height) {
      top = (this.height - (bottom - top))/2;
    } else {
      // do not allow scrolling too far in either direction
      top = Math.max(this.height - (bottom-top), Math.min(top, 0));
    }

    this.x0 = left - bounds.x*this.scale;
    this.y0 = top - bounds.y*this.scale;
    p.translate(this.x0, this.y0);
    p.scale(this.scale);
  }

  get state() {
    return {
      width: this.width,
      height: this.height,
      scale: this.scale,
      x0: this.x0,
      y0: this.y0,
      graphics: this.graphics};
  }

  set state(st) {
    this.width = st.width;
    this.height = st.height;
    this.scale = st.scale;
    this.x0 = st.x0;
    this.y0 = st.y0;
    this.canvas = st.canvas;
    this.graphics = st.graphics;
    this.resizeCanvas(st.width, st.height);
  }

  resizeCanvas(width, height) {
    this.width = width;
    this.height = height;
    this.p.resizeCanvas(width, height);
  }

  positionCanvas(px, py) {
    this.canvas.position(px, py);
  }

  mouseWheel(e) {
    if (e.ctrlKey) {
      let zoom = (e.deltaY < 0) ? this.zoomInFactor : this.zoomOutFactor;
      this.zoomAround(this.p.mouseX, this.p.mouseY, zoom);
    } else if (e.shiftKey) {
      this.x0 -= e.delta;
    } else {
      this.y0 -= e.delta;
    }
  }

  zoomAround(mx, my, zoom) {
      this.scale *= zoom;
      this.x0 = this.x0 + (this.x0 - mx)*(zoom - 1);
      this.y0 = this.y0 + (this.y0 - my)*(zoom - 1);
  }

  drag(wfromx, wfromy, wtox, wtoy) {
    console.log('drag: %s, %s, %s, %s', wfromx, wfromy, wtox, wtoy);
    let cfrom = this.worldToCanvas(wfromx, wfromy);
    let cto = this.worldToCanvas(wtox, wtoy);
    this.x0 += cto.x - cfrom.x;
    this.y0 += cto.y - cfrom.y;
  }

  fit(bounds) { // bounds in World dimensions
    let sc = Math.min(this.width/bounds.width, this.height/bounds.height)*.9;
    this.scale = sc;
  }

  canvasToWorld(cx, cy) {
    return {x: (cx - this.x0)/this.scale, y: (cy - this.y0)/this.scale};
  }

  worldToCanvasX(wx) {
    return wx * this.scale + this.x0;
  }

  worldToCanvasY(wy) {
    return wy * this.scale + this.y0;
  }

  worldToCanvas(wx, wy) {
    return {x: this.worldToCanvasX(wx), y: this.worldToCanvasY(wy)};
  }

  mousePoint() {
    return this.canvasToWorld(this.p.mouseX, this.p.mouseY);
  }

  shiftWorld(dx, dy) {
    this.x0 += dx * this.scale;
    this.y0 += dy * this.scale;
  }
};

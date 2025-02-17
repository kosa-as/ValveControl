/*
 * Copyright (C) 2020, 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

/***********************************************************
 * Viz couples data to visualisation
 ***********************************************************/

/*
 * Viz: the abstract base class for all visualisation classes.
 * inherits from BuildingBlock
 * elements:
 *   data: Data (which can be anything)
 *     the data to be visualised
 *   viz: BuildingBlock
 *     the object's visualisation
 * functions:
 *   new: Data --> Viz
 *     create Viz objects for all relevant sub data here.
 *   initViz: nil --> nil
 *     call initViz on all relevant sub viz object here
 *     create the object's own viz (BuildingBlock)
 *   setViz: BuildingBlock --> nil
 *     set the object's viz, and its dimensions
 *   refresh, move, draw, bounds, shift, objectsAt
 *     apply these functions on the object's viz
 */
class Viz extends BuildingBlock {
  constructor(data) {
    super();
    this.data = data;
    this.viz = null;
  }

  initViz() {
    // noop
  }

  setViz(viz) {
    viz.refreshMe();
    this.viz = viz;
    this.bounds = viz.bounds;
  }

  setParent(parent) {
    this.parent = parent;
    this.viz.setParent(parent);
  }

  relativeBounds(parent) {
    return this.viz.relativeBounds(parent);
  }

  refresh() {
    this.viz.refresh();
  }

  move(x, y) {
    this.viz.move(x, y);
  }

  hCenter(x) {
    this.viz.hCenter(x);
  }

  center(x, y) {
    this.viz.center(x, y);
  }

  shift(dx, dy) {
    this.viz.shift(dx, dy);
  }

  scale(sw, sh) {
    this.viz.scale(sw, sh);
  }

  get scaledBounds() {
    return this.viz.scaledBounds;
  }

  draw(p) {
    this.viz.draw(p);
  }

  objectsAt(x, y) {
    if (this.viz.atPos(x, y)) {
      return this.viz.objectsAt(x, y).concat([this]);
    } else {
      return [];
    }
  }

  highlight(on) {
    this.viz.highlight(on);
  }

  setAlpha(a) {
    this.viz.setAlpha(a);
  }
}

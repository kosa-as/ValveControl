/*
 * Copyright (C) 2021, 2022 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */


/*
 * Abstract class for drawing a diagram
 *
 * Visualisation is done using standard functions defined in p5js
 * Zooming and dragging are facilitated. The World object handles the
 * appropriate transformations.
 */

class DiagramP5 {

  /*
   * These abstract methods have to be defined by any subclass
   */
  initDiagram() { }
  draw(p) { }
  selection(px, py) { }
  handleMouseClick(p, e) { }
  dragIt(px, py) { }
  stopDraggingIt() { }
  help() { }

  constructor(parent) {

    /*
     * interface to the outside world, through functions
     *   in.draw(data)
     *     show the data as a diagram
     *   in.dimensions(px, py, width, height)
     *     set the location (px, py) and size (with, height) of the
     *     diagram
     *   out.selected(location)
     *     process the selected node, using its location
     *
     *   out functions can be (re)defined by the outside world.
     *   sub classes can extend this interface
     */
    this.in = {
      draw: function (data) {
        this.previousData = this.data;
        this.data = data;
        if (this.set_up) {
          this.initDiagram();
          this.sketch.redraw();
        }
      }.bind(this),
      dimensions: function (px, py, width, height) {
        this.dimensions(px, py, width, height);
      }.bind(this),
    };
    this.out = {
      selected: function (location) {
        console.log('selected location: %j', location);
      }
    };

    // default canvas dimensions: whole window
    this.px = 0;
    this.py = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.fixedSize = false;

    this.set_up = false;
    this.diagram = null;
    this.world = null;

    this.background = '#E8E8E8';
    // drawing: padded diagram
    this.padding = {left: 50, top: 50, right: 50, bottom: 50};
    this.drawing = null;

    // scrollbars
    this.scrollbars = null;

    // dragging:
    this.drag = {dragging: false,
                 ctrl: false,
                 start: {x: 0, y: 0}, // dragging startpoint
                 obj: null,
                 offset: {x: 0, y: 0} // dragging object offset
                };

    // highlighting:
    this.highlightedObj = null;

    // timeout for repeating key handling:
    this.timeout = {
      delay: 50, // const
      handler: null,
      start: 0,
      wait: 0,
      running: false
    }

    // is diagram visually changed?
    this.redrawNeeded = false;

    // help related:
    this.helpMessage = this.help();
    this.showHelp = false;

    /*
     * interface with sketch:
     * P5 event handling
     * All events are implemented by the 'this' DiagramP5 object
     */
    let diagramSketch = function(p) {
      let checkRedraw = function(f, e) {
        // executing function 'f' might result in a need for redraw
        this.redrawNeeded = false;
        let thisf = f.bind(this);
        let result = thisf(p, e);
        if (this.redrawNeeded) p.redraw();
        return result;
      }.bind(this);
      p.setup = function() {
        this.setup(p);
      }.bind(this);
      p.draw = function() {
        this.draw(p);
      }.bind(this);
      p.windowResized = function() {
        return checkRedraw(this.windowResized);
      }.bind(this);
      p.keyPressed = function() {
        return checkRedraw(this.keyPressed);
      }.bind(this);
      p.keyReleased = function() {
        return checkRedraw(this.keyReleased);
      }.bind(this);
      p.mouseMoved = function(e) {
        return checkRedraw(this.mouseMoved, e);
      }.bind(this);
      p.mousePressed = function(e) {
        return checkRedraw(this.mousePressed, e);
      }.bind(this);
      p.mouseDragged = function(e) {
        return checkRedraw(this.mouseDragged, e);
      }.bind(this);
      p.mouseReleased = function(e) {
        return checkRedraw(this.mouseReleased, e);
      }.bind(this);
      p.mouseWheel = function(e) {
        return checkRedraw(this.mouseWheel, e);
      }.bind(this);
    }.bind(this);

    this.sketch = new p5(diagramSketch, parent);
    this.cursor = 'default';
    this.overButton = false;
  }

  dimensions(px, py, width, height) {
    this.px = px;
    this.py = py;
    this.width = width;
    this.height = height;
    this.fixedSize = true;
    if (this.set_up) {
      this.world.positionCanvas(px, py);
      this.world.resizeCanvas(width, height);
      this.sketch.redraw();
    }
  }

  setup(p) {
    let px = this.px;
    let py = this.py;
    this.width = this.fixedSize ? this.width : p.windowWidth;
    this.height = this.fixedSize ? this.height : p.windowHeight;
    this.world = new World(p, this.width, this.height);
    if (px != null && py != null) this.world.positionCanvas(px, py);
    this.set_up = true;
    this.setCursor(p, 'wait');
    this.scrollbars = new Scrollbars(this);
    if (this.data) {
      this.initDiagram();
    } else {
      p.noLoop();
    }
  }

  makeDrawing(content) {
    let box = new BoundingBox(content);
    box.padding = this.padding;
    box.color = '#FFFFFF';
    box.strokeColor = '#FFFFFF';
    box.strokeWeight = 0;
    box.shadowed = false;
    box.refreshMe();
    return box;
  }

  updateDrawing(content) {
    this.drawing.setContent(content);
  }

  setCursor(p, type) {
    this.cursor = type;
    p.cursor(type);
  }

  mouseInCanvas(p) {
    let w = this.width;
    let h = this.height;
    if (this.scrollbars.vertical.visible)
      w -= this.scrollbars.width;
    if (this.scrollbars.horizontal.visible)
      h -= this.scrollbars.width;
    if (!(0 <= p.mouseX && p.mouseX <= w)) return false;
    if (!(0 <= p.mouseY && p.mouseY <= h)) return false;
    return true;
  }

  mouseInCanvasOrScrollbars(p) {
    let w = this.width;
    let h = this.height;
    if (!(0 <= p.mouseX && p.mouseX <= w)) return false;
    if (!(0 <= p.mouseY && p.mouseY <= h)) return false;
    return true;
  }

  windowResized(p) {
    if (!this.fixedSize) {
      this.width = p.windowWidth;
      this.height = p.windowHeight;
      this.world.resizeCanvas(this.width, this.height);
    }
    this.redrawNeeded = true;
  }

  selectionOfKlass(sel, klass) {
    let obj = sel.find(s => s instanceof klass);
    return obj;
  }

  highlight(obj) {
    if (this.highlightedObj) {
      this.highlightedObj.highlight(false);
    }
    this.highlightedObj = obj;
    this.highlightedObj.highlight(true);
    this.redrawNeeded = true;
  }

  resetHighlight() {
    if (this.highlightedObj) {
      this.highlightedObj.highlight(false);
      this.highlightedObj = null;
    }
  }

  mouseMoved(p, e) {
    if (!this.mouseInCanvas(p)) return;
    if (!this.diagram) return;
    let wpt = this.world.mousePoint();
    let obj = this.selection(wpt.x, wpt.y);
    if (obj && obj instanceof Button) {
      if (this.cursor != 'wait' && !this.overButton) {
        p.cursor('pointer');
        this.overButton = true;
      }
    } else if (this.overButton) {
      p.cursor(this.cursor);
      this.overButton = false;
    }
  }

  mousePressed(p, e) {
    if (this.scrollbars.onTracks(p.mouseX, p.mouseY)) {
      if (this.scrollbars.onThumb(p.mouseX, p.mouseY)) {
        // drag?
        let bar = this.scrollbars.horizontal.onTrack(p.mouseX, p.mouseY)
            ? this.scrollbars.horizontal
            : this.scrollbars.vertical;
        let wpt = this.world.mousePoint();
        this.drag.start.x = wpt.x;
        this.drag.start.y = wpt.y;
        this.drag.obj = bar;
        // only one coordinate is relevant....
        this.drag.offset.x = p.mouseX - bar.thumb.pos;
        this.drag.offset.y = p.mouseY - bar.thumb.pos;

      } else {
        this.scrollbars.step(p.mouseX, p.mouseY);
        this.scrollbars.moveWorld();
        this.redrawNeeded = true;
      }
      return;
    }
    if (!this.mouseInCanvas(p)) {
      return;
    }
    if (!this.diagram) return;
    let wpt = this.world.mousePoint();
    this.drag.ctrl = e.ctrlKey;
    this.drag.start.x = wpt.x;
    this.drag.start.y = wpt.y;
    this.drag.obj = null;
    if (e.ctrlKey) {
      this.drag.offset.x = p.mouseX - this.world.x0;
      this.drag.offset.y = p.mouseY - this.world.y0;
    } else {
      let obj = this.selection(wpt.x, wpt.y);
      if (obj) {
        // do not drag buttons
        if (obj instanceof Button) {
          this.buttonSelected = obj;
          obj.highlight(true);
          this.redrawNeeded = true;
        } else {
          this.drag.obj = obj;
          this.drag.offset.x = wpt.x - obj.bounds.x;
          this.drag.offset.y = wpt.y - obj.bounds.y;
        }
      }
    }
    //p.redraw();
  }

  mouseDragged(p, e) {
    if (!this.mouseInCanvasOrScrollbars(p)) return;
    if (!this.diagram) return;
    let wpt = this.world.mousePoint();
    // ignore micro dragging:
    let draggingDist = Math.abs(wpt.x-this.drag.start.x) + Math.abs(wpt.y-this.drag.start.y);
    let epsilon = 5;
    if (!this.drag.dragging && draggingDist * this.world.scale < epsilon) return;

    this.drag.dragging = true;
    if (this.drag.obj == this.scrollbars.horizontal || this.drag.obj == this.scrollbars.vertical) {
      this.drag.obj.dragThumb(p.mouseX - this.drag.offset.x, p.mouseY - this.drag.offset.y);
      this.scrollbars.moveWorld();
      this.redrawNeeded = true;
    } else {
      if (this.drag.ctrl) {
        // drag the canvas
        this.world.x0 = p.mouseX - this.drag.offset.x;
        this.world.y0 = p.mouseY - this.drag.offset.y;
        // also perform potential aditional diagram specific actions
      }
      this.dragIt(wpt.x-this.drag.offset.x, wpt.y-this.drag.offset.y);
      this.redrawNeeded = true;
    }
  }

  mouseReleased(p, e) {
    let handleButton = function() {
      if (this.buttonSelected) {
        this.buttonSelected.highlight(false);
        this.redrawNeeded = true;
      }
      this.buttonSelected = null;
    }.bind(this);
    if (this.drag.dragging) {
      this.drag.dragging = false;
      handleButton();
      this.stopDraggingIt();
    } else {
      if (!this.mouseInCanvas(p)) return;
      if (!this.diagram) return;
      handleButton();
      this.handleMouseClick(p, e);
    }
  }

  keyMod(p, mod1, mod2) {
    // mods: p.CONTROL, p.ALT
    function checkdown(m) {
      return (mod1 == m || mod2 == m) ? p.keyIsDown(m) : !p.keyIsDown(m);
    }
    return checkdown(p.CONTROL) && checkdown(p.ALT);
  }

  keyCodeMod(p, mod1, mod2, mod3) {
    // mods: p.SHIFT, p.CONTROL, p.ALT
    function checkdown(m) {
      return (mod1 == m || mod2 == m || mod3 == m) ? p.keyIsDown(m) : !p.keyIsDown(m);
    }
    return checkdown(p.SHIFT) && checkdown(p.CONTROL) && checkdown(p.ALT);
  }

  key(p, k, mod1, mod2) {
    return p.key == k && this.keyMod(p, mod1, mod2);
  }

  keyCode(p, k, mod1, mod2, mod3) {
    return p.keyCode == k && this.keyCodeMod(p, mod1, mod2, mod3);
  }

  handleKey(p) {
    let down = this.keyCode(p, p.DOWN_ARROW, p.SHIFT);
    let up = this.keyCode(p, p.UP_ARROW, p.SHIFT);
    let right = this.keyCode(p, p.RIGHT_ARROW, p.SHIFT);
    let left = this.keyCode(p, p.LEFT_ARROW, p.SHIFT);
    if (down || up || right || left) {
      let inc = 1/4;
      if (down) this.scrollbars.vertical.stepDirection(false, inc);
      else if (up) this.scrollbars.vertical.stepDirection(true, inc);
      else if (right) this.scrollbars.horizontal.stepDirection(false, inc);
      else if (left) this.scrollbars.horizontal.stepDirection(true, inc);
      this.scrollbars.moveWorld();
      this.redrawNeeded = true;
    } else {
      // default behaviour for unbound keys:
      return;
    }
  }

  keyPressed(p) {
    if (!this.mouseInCanvasOrScrollbars(p)) return;
    if (!this.diagram) return;
    this.startTimeout();
    return this.handleKey(p);
  }

  keyReleased(p) {
    if (!this.mouseInCanvasOrScrollbars(p)) return;
    this.stopTimeout();
    return false;
  }

  startTimeout() {
    this.timeout.running = true;
    this.timeout.wait = this.timeout.delay * 15; // initial delay is larger
    this.timeout.start = Date.now();
  }

  stopTimeout() {
    this.timeout.running = false;
    if (this.timeout.handler != null) {
      clearTimeout(this.timeout.handler);
      this.timeout.handler = null;
    }
  }

  // might be called in this.draw(p):
  checkRepeatKey(p) {
    if (!p.focused) {
      // reset
      this.stopTimeout();
    }
    if (this.timeout.running && this.timeout.handler == null) {
      let now = Date.now();
      let delta = now - this.timeout.start;
      let rerun = function() {
        // restart timer:
        this.timeout.start = Date.now();
        this.timeout.wait = this.timeout.delay;
        this.timeout.handler = null;
        this.handleKey(p);
        // can't delay redrawing!
        if (this.redrawNeeded) p.redraw();
      }.bind(this);
      this.timeout.handler = setTimeout(rerun, this.timeout.wait - delta);
    }
  }

  mouseWheel(p, e) {
    if (!this.mouseInCanvas(p)) return;
    if (!this.diagram) return;
    this.world.mouseWheel(e);
    this.redrawNeeded = true;
    return false;
  }

  saveAsSvg(p, title) {
    if (!this.diagram) return;
    let bnd = this.drawing.bounds;
    // store state:
    let worldSave = this.world.state;
    // svg graphics
    let graphics = p.createGraphics(bnd.width, bnd.height, p.SVG);
    this.world.state = {
      width: bnd.width,
      height: bnd.height,
      scale: 1,
      x0:  -bnd.x,
      y0:  -bnd.y,
      graphics: graphics};
    p.draw();
    p.save(graphics, title);
    // restore state:
    this.world.state = worldSave;
    this.redrawNeeded = true;
  }
}

/*
 * Copyright (C) 2021 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */


class SeparatorP5 {

  /*
   * Separator between the two diagrams 'diagram1' and 'diagram2'.
   * horizontalBar: boolean
   * For the time being the whole window is used
   * drag(dr) coordinates dragging
   */

  constructor(parent, horizontalBar, diagram1, diagram2) {
    this.horizontalBar = horizontalBar;
    this.diagram1 = diagram1;
    this.diagram2 = diagram2;

    this.in = {
      dimensions: function (px, py, width, height) {
        let fraction = this.mid / this.size;
        this.px = px;
        this.py = py;
        this.width = width;
        this.height = height;
        this.size = this.horizontalBar ? this.height : this.width;
        this.mid = this.size * fraction;
        this.divide(this.mid);
      }.bind(this)
    };
    this.out = {
      selected: function (location) {
        console.log('selected location: %j', location);
      }
    };

    // default dimensions: whole window
    this.px = 0;
    this.py = 0;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.barw = 8;
    this.bar = new BarP5(parent, this.horizontalBar);

    this.size = this.horizontalBar ? this.height : this.width;
    this.mid = this.size / 2;
    this.divide(this.mid);

    this.bar.out.drag = function(dr) {
      console.log('drag %j', dr);
      this.mid += dr;
      this.divide(this.mid);
    }.bind(this);

    this.bar.out.resize = function(width, height) {
      let fraction = this.mid / this.size;
      this.width = width;
      this.height = height;
      this.size = this.horizontalBar ? this.height : this.width;
      this.mid = this.size * fraction;
      this.divide(this.mid);
    }.bind(this);
  }

  divide(mid) {
    this.mid = mid;
    if (this.horizontalBar) {
      this.diagram1.in.dimensions(this.px, this.py, this.width, this.mid-this.barw/2);
      this.diagram2.in.dimensions(this.px, this.mid+this.barw/2, this.width, this.height-this.mid-this.barw/2);
      this.bar.in.dimensions(this.px, this.mid-this.barw/2, this.width, this.barw);
    } else {
      this.diagram1.in.dimensions(this.px, this.py, this.mid-this.barw/2, this.height);
      this.diagram2.in.dimensions(this.mid+this.barw/2, this.py, this.width-this.mid-this.barw/2, this.height);
      this.bar.in.dimensions(this.mid-this.barw/2, this.py, this.barw, this.height);
    }
  }
}

class BarP5 extends DiagramP5 {

  constructor(parent, horizontalBar) {
    super(parent);
    this.horizontalBar = horizontalBar;

    /*
     * super defines interface to the outside world, through functions
     *   in.draw(data)
     *   in.dimensions(px, py, width, height)
     *   out.selected(location)
     *
     * extension:
     */
    this.out.drag = function(dr) {
      console.log('Bar: drag %j', dr);
    };
    this.out.resize = function(width, height) {
      console.log('Bar: resize %j, %j', width, height);
    };
  }

  setup(p) {
    let px = this.px;
    let py = this.py;
    let w = this.width || 4;
    let h = this.height || p.windowHeight;
    this.world = new World(p, w, h, p.parent);
    if (px != null && py != null) this.world.positionCanvas(px, py);
    this.set_up = true;
    p.noLoop();
  }

  draw(p) {
    p.background('white');
    p.push();
    p.fill('#99BBDD');
    p.noStroke();
    let hgap = this.horizontalBar ? 4 : .5;
    let vgap = this.horizontalBar ? .5 : 4;
    p.rect(hgap, vgap, this.width-2*hgap, this.height-2*vgap);
    p.pop();
  }

  mouseInCanvas(p) {
    if (!p.width && !p.height) return true; // canvas spans whole window
    if (p.width && !(0 <= p.mouseX && p.mouseX <= p.width)) return false;
    if (p.height && !(0 <= p.mouseY && p.mouseY <= p.height)) return false;
    return true;
  }

  mouseWheel(p, e) {
    if (!this.mouseInCanvas(p)) return;
    return false;
  }

  windowResized(p) {
    this.out.resize(p.windowWidth, p.windowHeight);
    //      if (!p.width && !p.height)
    //        this.world.resizeCanvas(p.windowWidth, p.windowHeight);
  }

  mousePressed(p, e) {
    if (!this.mouseInCanvas(p)) return;
    this.drag.dragging = true;
    this.drag.offset.x = p.mouseX;
    this.drag.offset.y = p.mouseY;

    return false;
  }

  mouseReleased(p, e) {
    this.drag.dragging = false;
    return false;
  }

  mouseDragged(p, e) {
    if (!this.drag.dragging) return;
    let mx = p.mouseX;
    let my = p.mouseY;
    let dr = this.horizontalBar ? my-this.drag.offset.y : mx-this.drag.offset.x;
    console.log('bar: drag %j dr', dr);
    if (dr != 0) {
      this.out.drag(dr);
      p.redraw();
    }
    return false;
  }

  mouseMoved(p, e) {
    let eps = 3;
    if ((0-eps <= p.mouseX && p.mouseX <= p.width+eps) &&
        (0-eps <= p.mouseY && p.mouseY <= p.height+eps) &&
        !this.drag.dragging) {
      this.setCursor(p, this.horizontalBar ? 'row-resize' : 'col-resize');
    } else {
      this.setCursor(p, 'default');
    }
    p.redraw();
    return false;
  }

}

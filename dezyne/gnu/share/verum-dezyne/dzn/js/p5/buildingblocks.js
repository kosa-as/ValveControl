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
 * Building blocks are base for all visualisation.
 ***********************************************************/

/*
 * When DEBUG is on, additional visualisation is presented.
 * currently: each Frame will show a red border
 */
let DEBUG = false;

/*
 * BuildingBlock: the abstract base class for all building blocks.
 * elements:
 *   parent: the containing BuildingBLock (if any)
 *   bounds: { x: float, y: float, width: float, height: float, scaleX: float, scaleY: float };
 }
 *     location and dimensions  (default { 0, 0, 0, 0, 1, 1 }
 * functions:
 *   bounds: nil --> {float, float, float, float, float, float}
 *     returns current {x, y, with, height, scaleX, scaleY}
 *   relativeBounds: BuildingBlock --> {float, float, float, float, float, float}
 *     returns current {x, y, with, height, scaleX, scaleY} relative to a given parent
 *   scaledBounds: nil -> bounds
 *     returns bounds respecting potential scaling
 *   refreshMe: nil -> nil
 *     recalculates dimensions (if relevant)
 *   refresh: nil -> nil
 *     refreshes its sub blocks (if any) and recalculates dimensions (if relevant)
 *   move: (float, float) --> nil
 *     sets the location, and moves its sub blocks (if any)
 *   hCenter: float --> nil
 *     horizontally center around given x
 *   center: (float, float) --> nil
 *     horizontally and vertically center around given (x, y)
 *   shift: (float, float) --> nil
 *     relative move over (dz, dy)
 *   draw: nil --> nil
 *     the actual representation in p5js terms
 *   transform: nil -> nil
 *     translate and scale appropriately before drawing the shape
 *   atPos: (float, float) --> bool
 *     returns true if the given (x, y) is within bounds
 *   objectsAt: (float, float) --> [BuildingBlock]
 *     if atPos(x, y) returns itself and all sub blocks that are atPos(x, y)
 *   highlight: bool --> nil
 *     set or reset highlighted
 */
class BuildingBlock {
  constructor() {
    this.parent = null;
    this.bounds = { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 };
    this.highlighted = false;
    this.highlightColor = '#55AAFF';
    this.shadowColor = '#64646464';
    this.alpha = '#FF';
    this.visible = true;
  }

  setParent(parent) {
    this.parent = parent;
  }

  get scaledBounds() {
    return {x: this.bounds.x, y: this.bounds.y,
            width: this.bounds.width*this.bounds.scaleX,
            height: this.bounds.height*this.bounds.scaleY,
            scaleX: this.bounds.scaleX, scaleY: this.bounds.scaleY};
  }

  relativeBounds(parent) {
    let bnd = this.scaledBounds;
    if (this.parent && this.parent != parent) {
      let rbnd = this.parent.relativeBounds(parent);
      return {x: rbnd.x + bnd.x*rbnd.scaleX, y: rbnd.y + bnd.y*rbnd.scaleY,
              width: bnd.width*bnd.scaleX*rbnd.scaleX, height: bnd.height*bnd.scaleY*rbnd.scaleY,
              scaleX: bnd.scaleX*rbnd.scaleX, scaleY: bnd.scaleY*rbnd.scaleY};
    } else {
      return bnd;
    }
  }

  get absoluteBounds() {
    return this.relativeBounds(null);
  }

  refresh() {
    this.refreshMe();
  }

  refreshMe() {
    // noop
  }

  move(x, y) {
    this.bounds.x = x;
    this.bounds.y = y;
  }

  hCenter(x) {
    this.move(x-this.bounds.width/2, this.bounds.y);
  }

  center(x, y) {
    this.move(x-this.bounds.width/2, y-this.bounds.height/2);
  }

  shift(dx, dy) {
    let oldx = this.bounds.x;
    let oldy = this.bounds.y;
    this.move(oldx+dx, oldy+dy);
  }

  scale(scaleX, scaleY) {
    this.bounds.scaleX = scaleX;
    this.bounds.scaleY = scaleY;
  }

  draw(p) {
    // noop
  }

  transform(p) {
    p.translate(this.bounds.x, this.bounds.y);
    p.scale(this.bounds.scaleX, this.bounds.scaleY);
  }

  push(p) {
    this.pushed = (this.bounds.scaleX != 1 || this.bounds.scaleY != 1);
    if (this.pushed) {
      p.push();
      p.scale(this.bounds.scaleX, this.bounds.scaleY);
    }
  }

  pop(p) {
    if (this.pushed) {
      p.pop();
      this.pushed = false;
    }
  }

  atPos(x, y) {
    // check bounding box, allow some margin
    let eps = 2;
    return this.bounds.x - eps <= x &&
      x <= this.bounds.x + this.bounds.width*this.bounds.scaleX + eps &&
      this.bounds.y - eps <= y
      && y <= this.bounds.y + this.bounds.height*this.bounds.scaleY + eps;
  }

  objectsAt(x, y) {
    return this.atPos(x, y) ? [this] : [];
  }

  highlight(on) {
    this.highlighted = on;
  }

  setAlpha(a) {
    this.alpha = a;
  }

  addAlpha(col) {
    // has effect only when col is in '#rrggbb' or '#rrggbbaa' format
    // and this.alpha in '#aa' format
    if ((typeof col == 'string') && col[0] == '#' &&
        (typeof this.alpha == 'string') && this.alpha[0] == '#')
      return col.slice(0,7) + this.alpha.slice(1,3);
    else
      return col;
  }

  fill(p, col) {
    p.fill(this.addAlpha(col));
  }

  stroke(p, col) {
    p.stroke(this.addAlpha(col));
  }
}

/*
 * Box()
 *   a rectangle, default 1x1, colored black.
 *   currently its border look is fixed
 */
class Box extends BuildingBlock {
  constructor() {
    super();
    this.bounds.width = 1;
    this.bounds.height = 1;
    this.color = '#000000';
    this.strokeColor = '#000000';
    this.strokeWeight = .5;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.rect(x, y, this.bounds.width, this.bounds.height);
    }.bind(this);
    this.push(p);
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      this.stroke(p, this.highlightColor);
      p.strokeWeight(this.strokeWeight+2);
      shape(this.bounds.x, this.bounds.y);
    }
    this.stroke(p, this.strokeColor);
    p.strokeWeight(this.strokeWeight);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * DTriangle()
 *   a downward triangle
 *   currently its border look is fixed
 */
class DTriangle extends BuildingBlock {
  constructor() {
    super();
    this.bounds.width = 1;
    this.bounds.height = 1;
    this.color = '#000000';
    this.strokeColor = '#000000';
    this.strokeWeight = .5;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.triangle(x, y, x + this.bounds.width, y, x + this.bounds.width/2, y + this.bounds.height);
    }.bind(this);
    this.push(p);
    p.noStroke();
    this.fill(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      this.stroke(p, this.highlightColor);
      p.strokeWeight(this.strokeWeight+2);
      shape(this.bounds.x, this.bounds.y);
    }
    this.stroke(p, this.strokeColor);
    p.strokeWeight(this.strokeWeight);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * Text(text)
 *   a (left-aligned) representation of given text (string)
 *   currently its looks (font, size, and color) are fixed
 *   its width is calculated using p5js primitives
 */
class Text extends BuildingBlock {
  static canvas = document.createElement("canvas");
  static context = Text.canvas.getContext("2d");
  constructor(text) {
    super();
    this.text = text;
    this.font = 'arial'; // TODO
    this.size = 15; // TODO
    this.bold = false;
    this.fixedWidth = false;
    this.centered = false;
    this.bounds.width = this.vWidth();
    this.bounds.height = this.vHeight();
    this.descent = this.vDescent();
  }

  setWidth(w) {
    this.fixedWidth = true;
    this.bounds.width = w;
  }

  vWidth() {
    let width = 0;
    // (c) https://www.w3docs.com/snippets/javascript/how-to-calculate-text-width-with-javascript.html
//    let context = this.canvas.getContext("2d");
    Text.context.font = (this.bold ? 'bold ' : '') + this.size + 'px ' + this.font;
    this.text.split(/\n/).forEach(line => {
      let metrics = Text.context.measureText(line);
      width = Math.max(width, metrics.width);
    });
    return width;
  }

  vDescent() {
//    let context = this.canvas.getContext("2d");
    Text.context.font = (this.bold ? 'bold ' : '') + this.size + 'px ' + this.font;
    //check symbols that descend below baseline:
    return Text.context.measureText('gjpqy(){}[]/').actualBoundingBoxDescent;
  }

  vHeight() {
    let lines = this.text.split(/\n/);
    return this.size * lines.length;
  }

  refreshMe() {
    if (!this.fixedWidth) this.bounds.width = this.vWidth();
    this.bounds.height = this.vHeight();
    this.descent = this.vDescent();
  }

  draw(p) {
    if (!this.visible) return;
    p.push();
    this.transform(p);
    p.translate(this.centered ? this.bounds.width/2 : 0, -this.descent);
    p.textFont(this.font);
    p.textStyle(this.bold ? p.BOLD : p.NORMAL);
    p.textAlign(this.centered ? p.CENTER : p.LEFT, p.BASELINE);
    this.fill(p, '#000000');
    p.noStroke();
    p.textSize(this.size);
    p.textLeading(this.size);
    this.text.split(/\n/).forEach((line,i) => {
      p.text(line, 0, (i+1)*this.size);
    });
    p.pop();
  }
}

/*
 * VLine(len)
 *   a vertical line of given length (float)
 *   currently its looks are fixed
 */
class VLine extends BuildingBlock {
  constructor(len) {
    super();
    this.bounds.width = 0;
    this.bounds.height = len;
    this.color = '#000000';
    this.weight = .5;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.line(x, y, x, y + this.bounds.height);
    }.bind(this);
    this.push(p);
    p.noFill();
    if (this.highlighted) {
      this.stroke(p, this.highlightColor);
      p.strokeWeight(this.weight+2);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.weight);
    this.stroke(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * VDottedLine(len)
 *   a vertical dotted line of given length (float)
 *   currently its looks are fixed
 */
class VDottedLine extends BuildingBlock {
  constructor(len) {
    super();
    this.bounds.width = 0;
    this.bounds.height = len;
    this.color = '#888888';
    this.weight = .5;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      let py = 0;
      while (py < this.bounds.height-5) {
        p.line(x, y+ py, x, y + py+5);
        py += 10;
      }
      if (py < this.bounds.height) {
        p.line(x, y+py, y, y+this.bounds.height);
      }
    }.bind(this);
    this.push(p);
    p.noFill();
    if (this.highlighted) {
      this.stroke(p, this.highlightColor);
      p.strokeWeight(this.weight+2);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.weight);
    this.stroke(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * Dot()
 *   an (almost invisible) dot
 *   can be used as anchor point
 */
class Dot extends BuildingBlock {
  constructor() {
    super();
  }

  draw(p) {
    if (!this.visible) return;
    this.push(p);
    p.strokeWeight(.5);
    p.point(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * RectLine(fx, fy, tx, ty)
 *  a line from (fx, fy) to (tx, ty).
 */
class RectLine extends BuildingBlock {
  constructor(fx, fy, tx, ty) {
    super();
    this.color = '#000000';
    this.weight = 1;
    this.update(fx, fy, tx, ty);
  }

  update(fx, fy, tx, ty) {
    this.fx = fx;
    this.fy = fy;
    this.tx = tx;
    this.ty = ty;
    this.bounds.x = Math.min(fx,tx);
    this.bounds.y = Math.min(fy,ty);
    this.bounds.width = Math.abs(fx-tx);
    this.bounds.height = Math.abs(fy-ty);
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.strokeCap(p.SQUARE);
      p.beginShape();
      p.vertex(x + this.fx-this.bounds.x, y + this.fy-this.bounds.y);
      p.vertex(x + this.tx-this.bounds.x, y + this.ty-this.bounds.y);
      p.endShape();
    }.bind(this);
    this.push(p);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(this.weight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.weight);
    this.stroke(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * DirectedRectLine(fx, fy, tx, ty)
 *  a 'triangular' line starting at (fx, fy), ending at (tx, ty).
 *  the thickness of the line diminishes from start towards end
 */
class DirectedRectLine extends BuildingBlock {
  constructor(fx, fy, tx, ty) {
    super();
    this.thicknessStart = 3;
    this.thicknessEnd = 0;
    this.color = '#000000';
    this.refreshPoints(fx, fy, tx, ty);
  }

  refreshPoints(fx, fy, tx, ty) {
    this.fx = fx;
    this.fy = fy;
    this.tx = tx;
    this.ty = ty;
    this.bounds.x = Math.min(fx,tx);
    this.bounds.y = Math.min(fy,ty);
    this.bounds.width = Math.abs(fx-tx);
    this.bounds.height = Math.abs(fy-ty);
  }

  move(x, y) {
    let dx = x - this.bounds.x;
    let dy = y - this.bounds.y;
    this.refreshPoints(this.fx+dx, this.fy+dy, this.tx+dx, this.ty+dy);
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y, inc) {
      let dx = this.tx-this.fx;
      let dy = this.ty-this.fy;
      let len = Math.sqrt(dx*dx + dy*dy);
      let ex = dy / len;
      let ey = dx / len;
      let start = this.thicknessStart+inc;
      let end = this.thicknessEnd+inc;
      p.quad(x + this.fx - this.bounds.x + ex*start, y + this.fy - this.bounds.y - ey*start,
             x + this.tx - this.bounds.x + ex*end, y + this.ty - this.bounds.y - ey*end,
             x + this.tx - this.bounds.x - ex*end, y + this.ty - this.bounds.y + ey*end,
             x + this.fx - this.bounds.x - ex*start, y + this.fy -this.bounds.y + ey*start);
    }.bind(this);
    this.push(p);
    if (this.highlighted) {
      p.noStroke();
      this.fill(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y, 2);
    }
    p.noStroke();
    this.fill(p, this.color);
    shape(this.bounds.x, this.bounds.y, 0);
    this.pop(p);
  }
}

/*
 * HRectLine(fx, fy, tx, ty)
 *  a segmented line from (fx, fy) to (tx, ty).
 *  Currently 3 segments are drawn, the middle one being horizontal.
 *  Corners are 'rounded'
 */
class HRectLine extends BuildingBlock {
  constructor(fx, fy, tx, ty) {
    super();
    this.color = '#000000';
    this.weight = 1;
    this.yMiddle = 10; // relative to fy
    this.curve = 2; // roundness of corners
    this.refreshPoints(fx, fy, tx, ty);
  }

  refreshPoints(fx, fy, tx, ty) {
    this.fx = fx;
    this.fy = fy;
    this.tx = tx;
    this.ty = ty;
    this.bounds.x = Math.min(fx,tx);
    this.bounds.y = Math.min(fy,ty);
    this.bounds.width = Math.abs(fx-tx);
    this.bounds.height = Math.abs(fy-ty);
  }

  move(x, y) {
    let dx = x - this.bounds.x;
    let dy = y - this.bounds.y;
    this.refreshPoints(this.fx+dx, this.fy+dy, this.tx+dx, this.ty+dy);
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.strokeCap(p.SQUARE);
      p.noFill();
      p.beginShape();
      p.vertex(x + this.fx - this.bounds.x, y + this.fy - this.bounds.y);
      let sgn = (this.fx < this.tx) ? 1 : -1;
      if (Math.abs(this.fx - this.tx) < this.curve*2) {
        p.vertex(x + this.fx - this.bounds.x, y + this.fy+this.yMiddle - this.bounds.y);
      } else {
        p.vertex(x + this.fx - this.bounds.x, y + this.fy+this.yMiddle-this.curve - this.bounds.y);
        p.vertex(x + this.fx+this.curve*sgn - this.bounds.x, y + this.fy+this.yMiddle - this.bounds.y);
      }

      if (Math.abs(this.fx - this.tx) < this.curve*2) {
        p.vertex(x + this.tx - this.bounds.x, y + this.fy+this.yMiddle - this.bounds.y);
      } else {
        p.vertex(x + this.tx-this.curve*sgn - this.bounds.x, y + this.fy+this.yMiddle - this.bounds.y);
        p.vertex(x + this.tx - this.bounds.x, y + this.fy+this.yMiddle+this.curve - this.bounds.y);
      }
      p.vertex(x + this.tx - this.bounds.x, y + this.ty - this.bounds.y);
      p.endShape();
    }.bind(this);
    this.push(p);
    if (this.highlighted) {
      p.strokeWeight(this.weight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.weight);
    this.stroke(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }

  atPos(x, y) {
    // bounding box isn't good enough
    if (!super.atPos(x, y)) return false;

    let eps = 2;
    let midy = this.bounds.y + this.yMiddle*this.bounds.scaleY;
    let rightx = this.bounds.x + this.bounds.width*this.bounds.scaleX;

    if (this.bounds.x == this.fx) {
      return (y < midy && this.bounds.x - eps <= x && x <= this.bounds.x + eps ||
              y > midy && rightx - eps <= x && x <= rightx + eps ||
              midy - eps <= y && y <= midy + eps);
    } else {
      return (y < midy && rightx - eps <= x && x <= rightx + eps ||
              y > midy && this.bounds.x - eps <= x && x <= this.bounds.x + eps ||
              midy - eps <= y && y <= midy + eps);
    }
  }
}

/*
 * HArrow(fx, tx, y)
 *  a horizontal arrow from (fx, y) to (tx, y)
 *  currently its point dimensions are fixed
 */
class HArrow extends BuildingBlock {
  constructor(fx, tx, y) {
    super();
    this.pointHeight = 6;
    this.pointWidth = 10;
    this.color = '#000000';
    this.weight = 1;
    this.dotted = false;
    this.dotsize = 3;
    this.update(fx, tx, y);
    this.fx;
    this.tx;
  }

  update(fx, tx, y) {
    this.fx = fx;
    this.tx = tx;
    this.bounds.x = Math.min(fx, tx);
    this.bounds.y = y - this.pointHeight/2;
    this.bounds.width = Math.abs(fx-tx);
    this.bounds.height = this.pointHeight;
  }

  move(x, y) {
    if (this.fx < this.tx) {
      this.update(x, x+this.tx-this.fx, y+this.pointHeight/2);
    } else {
      this.update(x+this.fx-this.tx, x, y+this.pointHeight/2);
    }
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      // p.push();
      let py = this.pointHeight/2;
      if (this.dotted) {
        let fx = (this.fx < this.tx) ? this.fx : this.tx;
        let tx = (this.fx < this.tx) ? this.tx : this.fx;
        let px = fx;
        while (px < tx-this.dotsize) {
          p.line(x + px, y + py, x + px+this.dotsize, y + py);
          px += this.dotsize*2;
        }
        if (px < tx) {
          p.line(x + px, y + py, x + tx, y + py);
        }
      } else {
        p.line(x + this.fx - this.bounds.x, y + py, x + this.tx - this.bounds.x, y + py);
      }
      // p.pop();
      let dir = (this.fx < this.tx) ? 1 : -1;
      p.triangle(x + this.tx - this.bounds.x, y + this.pointHeight/2,
                 x + this.tx-dir*this.pointWidth - this.bounds.x, y,
                 x + this.tx-dir*this.pointWidth - this.bounds.x, y + this.pointHeight);
    }.bind(this);
    this.push(p);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(this.weight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.weight);
    this.stroke(p, this.color);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

/*
 * Group(content)
 *  a grouping of its content, a list of BuildingBlock-s
 *  elements do not have relative position
 *  the group has an origin, relative to which all elements are drawn
 */
class Group extends BuildingBlock {
  constructor(content) {
    super();
    this.origin = {x: 0, y: 0};
    this.setContent(content); // [buildingblock]
  }

  setContent(content) {
    content.forEach(bb => bb.setParent(this));
    this.content = content;
    this.refreshMe();
  }

  refresh() {
    this.content.forEach(c => c.refresh());
    this.refreshMe();
  }

  refreshMe() {
    if (this.content.length > 0) {
      let minx = 9999999;
      let maxx = -9999999;
      let miny = 9999999;
      let maxy = -9999999;
      this.content.forEach(c => {
        let bnd = c.scaledBounds;
        minx = Math.min(minx, bnd.x);
        maxx = Math.max(maxx, bnd.x + bnd.width);
        miny = Math.min(miny, bnd.y);
        maxy = Math.max(maxy, bnd.y + bnd.height);
      });

      this.bounds.x = this.origin.x + minx;
      this.bounds.y = this.origin.y + miny;
      this.bounds.width = maxx - minx;
      this.bounds.height = maxy - miny;
    }
  }

  move(x, y) {
    this.origin.x += x - this.bounds.x;
    this.origin.y += y - this.bounds.y;
    this.bounds.x = x;
    this.bounds.y = y;
  }

  draw(p) {
    if (!this.visible) return;
    p.push();
    p.translate(this.origin.x, this.origin.y);
    this.content.forEach(c => c.draw(p));
    p.pop();
  }

  atPos(x, y) {
    // Group is dimensionless, so no restrictions
    return true;
  }

  objectsAt(x, y) {
    let result = [];
    this.content.forEach(c => {
      result = result.concat(c.objectsAt(x - this.origin.x, y - this.origin.y))
    });
    return result;
  }

  setAlpha(a) {
    super.setAlpha(a);
    this.content.forEach(c => c.setAlpha(a));
  }
}

/*
 * Frame(content)
 *  an invisible frame around its content, a list of BuildingBlock-s
 *  Located at (0, 0) upon construction
 *  Function refreshMe updates the Frame's dimensions.
 */
class Frame extends BuildingBlock {
  constructor(content) {
    super();
    this.setContent(content); // [buildingblock]
  }

  setContent(content) {
    content.forEach(bb => bb.setParent(this));
    this.content = content;
    this.refreshMe();
  }

  refresh() {
    this.content.forEach(c => c.refresh());
    this.refreshMe();
  }

  refreshMe() {
    if (this.content.length > 0) {
      let minx = 9999999;
      let maxx = -9999999;
      let miny = 9999999;
      let maxy = -9999999;
      this.content.forEach(c => {
        let bnd = c.scaledBounds;
        minx = Math.min(minx, bnd.x);
        maxx = Math.max(maxx, bnd.x + bnd.width);
        miny = Math.min(miny, bnd.y);
        maxy = Math.max(maxy, bnd.y + bnd.height);
      });
      this.bounds.width = maxx - minx;
      this.bounds.height = maxy - miny;
      this.content.forEach(c => {
        c.shift(-minx, -miny);
      });
      this.shift(minx, miny);
    }
  }

  draw(p) {
    if (!this.visible) return;
    p.push();
    this.transform(p);
    if (DEBUG) {
      p.noFill();
      this.stroke(p, '#FF0000');
      p.strokeWeight(2.5);
      p.rect(0, 0, this.bounds.width, this.bounds.height);
    }
    this.content.forEach(c => c.draw(p));
    p.pop();
  }

  objectsAt(x, y) {
    if (this.atPos(x, y)) {
      let result = [];
      this.content.forEach(c => result = result.concat(c.objectsAt(x-this.bounds.x, y-this.bounds.y)));
      return result.concat([this]);
    } else {
      return [];
    }
  }

  setAlpha(a) {
    super.setAlpha(a);
    this.content.forEach(c => c.setAlpha(a));
  }

  hCenterElement(element) {
    element.hCenter(this.bounds.width/2);
    this.refreshMe();
  }
}

/*
 * Circle(radius, color)
 *  a circle with default radius 1 (float)
 */
class Circle extends BuildingBlock {
  constructor() {
    super();
    this.radius = 1; // float
    this.color = '#000000'; // p5 color
    this.shadowed = false;
    this.refreshMe();
  }

  refreshMe() {
    this.bounds.width = 2 * this.radius;
    this.bounds.height = 2 * this.radius;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.circle(x + this.radius, y + this.radius, this.radius*2);
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    if (this.highlighted) {
      p.strokeWeight(.5);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    this.pop(p);
  }
}

/*
 * HexagonBox(content)
 *  a hexagon around its content (BuildingBlock).
 *  Located at (0, 0) upon construction
 */
class HexagonBox extends BuildingBlock {
  constructor(content) {
    super();
    this.content = content; // buildingblock
    this.content.setParent(this);
    this.side = 1; // float
    this.padding = 1; // int
    this.color = '#000000'; // p5 color
    this.strokeColor = '#000000';
    this.strokeWeight = .5;
    this.shadowed = true;
    this.refreshMe();
  }

  setContent(content) {
    content.setParent(this);
    this.content = content;
    this.refreshMe();
  }

  refresh() {
    this.content.refresh();
    this.refreshMe();
  }

  refreshMe() {
    let cbnd = this.content.scaledBounds;
    if (cbnd.width/cbnd.height > Math.sqrt(3)) {
      this.side = (cbnd.width + 2*this.padding)/Math.sqrt(3);
    } else {
      this.side = ((cbnd.width + 2*this.padding) * Math.sqrt(3) + (cbnd.height + 2*this.padding) * 3) /  6;
    }
    this.bounds.width = this.side * Math.sqrt(3);
    this.bounds.height = this.side * 2;
    this.content.move(this.bounds.width/2 - cbnd.width/2, this.bounds.height/2 - cbnd.height/2);
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.strokeCap(p.SQUARE);
      p.beginShape();
      p.vertex(x + this.side*Math.sqrt(3)/2, y);
      p.vertex(x + this.side*Math.sqrt(3), y + this.side/2);
      p.vertex(x + this.side*Math.sqrt(3), y + this.side*3/2);
      p.vertex(x + this.side*Math.sqrt(3)/2, y + this.side*2);
      p.vertex(x, y + this.side*3/2);
      p.vertex(x, y + this.side/2);
      p.vertex(x + this.side*Math.sqrt(3)/2, y);
      p.endShape();
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(this.strokeWeight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.strokeWeight);
    this.stroke(p, this.strokeColor);
    shape(this.bounds.x, this.bounds.y);
    this.content.draw(p);
    this.pop(p);
  }

  objectsAt(x, y) {
    if (this.atPos(x, y)) {
      return  this.content.objectsAt(x-this.bounds.x, y-this.bounds.y).concat([this]);
    } else {
      return [];
    }
  }

  setAlpha(a) {
    super.setAlpha(a);
    this.content.setAlpha(a);
  }
}

/*
  a container with padding around its content
 */

class Padded extends BuildingBlock {
  constructor(content) {
    super();
    this.content = content; // buildingblock
    this.content.setParent(this);
    this.padding = {left: 1, top: 1, right: 1, bottom: 1};
  }

  setPadding(pad) {
    this.padding.left = pad;
    this.padding.top = pad;
    this.padding.right = pad;
    this.padding.bottom = pad;
  }

  setContent(content) {
    content.setParent(this);
    this.content = content;
    this.refreshMe();
  }

  refresh() {
    this.content.refresh();
    this.refreshMe();
  }

  refreshMe() {
    this.content.move(this.padding.left, this.padding.top);
    let cbnd = this.content.scaledBounds;
    this.bounds.width = Math.max(this.minWidth, cbnd.width) + (this.padding.left+this.padding.right);
    this.bounds.height = cbnd.height + (this.padding.top+this.padding.bottom);
  }

  // draw(p) { } // virtual

}

/*
 * RoundedBoundingBox(content)
 *  a rectangle with rounded corners around its content (BuildingBlock).
 *  Located at (0, 0) upon construction
 *  If visible is false, only the content is drawn.
 */
class RoundedBoundingBox extends Padded {
  constructor(content) {
    super(content);
    this.visible = true; // boolean
    this.color = '#FFFFFF'; // p5 color
    this.strokeColor = '#000000';
    this.strokeWeight = .5;
    this.round = 1; // in pixels
    this.minWidth = 0;
    this.shadowed = true;
    this.refreshMe();
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.rect(x, y, this.bounds.width, this.bounds.height, this.round);
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(this.strokeWeight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.strokeWeight);
    this.stroke(p, this.strokeColor);
    shape(this.bounds.x, this.bounds.y);

    p.push();
    p.translate(this.bounds.x, this.bounds.y);
    this.content.draw(p);
    p.pop();

    this.pop(p);
  }

  objectsAt(x, y) {
    if (this.atPos(x, y)) {
      return  this.content.objectsAt(x-this.bounds.x, y-this.bounds.y).concat([this]);
    } else {
      return [];
    }
  }

  setAlpha(a) {
    super.setAlpha(a);
    this.content.setAlpha(a);
  }
}

/*
 * BoundingBox(content)
 *  a RoundedBoundingBox without rounded corners
 */
class BoundingBox extends RoundedBoundingBox {
  constructor(content) {
    super(content);
    this.round = 0;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.rect(x, y, this.bounds.width, this.bounds.height, this.round);
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      this.stroke(p, this.highlightColor);
      p.strokeWeight(this.strokeWeight+2);
      shape(this.bounds.x, this.bounds.y);
    }
    this.stroke(p, this.strokeColor);
    p.strokeWeight(this.strokeWeight);
    shape(this.bounds.x, this.bounds.y);

    p.push();
    p.translate(this.bounds.x, this.bounds.y);
    this.content.draw(p);
    p.pop();

    this.pop(p);
  }
}

/*
 * TextBox(text)
 *  a RoundedBoundingBox with as content text (Text)
 */
class TextBox extends RoundedBoundingBox {
  constructor(text) {
    super(text);
    this.round = 7;
  }
}

/*
 * Button(text, callback, parent)
 *  a button, represented as a RoundedBoundingBox
 *  with given text, function callback: nil --> nil,
 * and parent: BuildingBlock
 */
class Button extends RoundedBoundingBox {
  constructor(text, callback, manager) {
    super(new Text(text));
    this.setPadding(2);
    this.color = '#EEEEEE';
    this.round = 1;
    this.shadowed = false;
    this.text = text;
    this.callback = callback;
    this.manager = manager;
  }

  draw(p) {
    if (!this.visible) return;
    super.draw(p);
  }
}

/* Table(content)
 *   a two dimensional table of Text elements.
 */

class Table extends BuildingBlock {
  constructor(content) {
    super();
    this.content = content;
    this.hpad = 8;
    this.vpad = 8;
    this.hsep = 8;
    this.vsep = 8;
    this.centered = false;

    this.colWidth = [];
    this.rowHeight = [];
    this.refreshMe();
  }

  refreshMe() {
    if (this.content.length == 0) {
      this.colWidth = [];
      this.rowHeight = [];
    } else {
      this.colWidth = this.content[0].map(elt => 0);
      this.rowHeight = this.content.map(row => 0);
    }
    this.content.forEach(row => {
      row.forEach((elt, ci) => {
        this.colWidth[ci] = Math.max(this.colWidth[ci], elt.bounds.width);
      });
    });
    this.content.forEach((row, ri) => {
      let rheight = 0;
      row.forEach(elt => {
        rheight = Math.max(rheight, elt.bounds.height);
      });
      this.rowHeight[ri] = rheight;
    });

    let twidth = this.hpad;
    this.colWidth.forEach(cw => { twidth += cw + this.hsep; });
    this.bounds.width = twidth - this.hsep + this.hpad;

    let theight = this.vpad;
    this.rowHeight.forEach(rh => { theight += rh + this.vsep; });
    this.bounds.height = theight - this.vsep + this.vpad;
  }

  draw(p) {
    if (!this.visible) return;
    p.push();
    this.transform(p);
    let py = 0;
    this.content.forEach((row, ri) => {
      if (ri > 0) {
        py += this.vsep/2;
        this.stroke(p, '#646464');
        p.strokeWeight(.5);
        p.line(this.hpad, py, this.bounds.width-this.hpad, py);
        py += this.vsep/2;
      } else {
        py += this.vpad;
      }
      let px = this.hpad;
      row.forEach((elt, ci) => {
        p.push();
        p.translate(px, py);
        if (this.centered) {
          elt.hCenter(this.colWidth[ci]/2);
        }
        elt.draw(p);
        p.pop();
        px += this.colWidth[ci] + this.hsep;
      });
      py += this.rowHeight[ri];
    });
    p.pop();
  }

  setAlpha(a) {
    super.setAlpha(a);
    this.content.forEach(row => row.forEach(elt => elt.setAlpha(a)));
  }
}

/* Alert
 *   an alert icon (red with white exclamation mark).
 *   drawn with p5 lines
 */

class Alert extends BuildingBlock {
  constructor() {
    super();
    this.bounds.width = 35;
    this.bounds.height = 35;
    this.color = '#E74745';
    this.shadowed = true;
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.beginShape();
      p.vertex(x + this.bounds.width/2, y);
      p.vertex(x + this.bounds.width, y + this.bounds.height);
      p.vertex(x, y + this.bounds.height);
      p.endShape(p.CLOSE);
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps*1.5, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    // exclamation mark:
    this.stroke(p, '#FFFFFF');
    p.strokeWeight(4);
    p.line(this.bounds.width/2, 12, this.bounds.width/2, this.bounds.height-11);
    p.line(this.bounds.width/2, this.bounds.height-6, this.bounds.width/2, this.bounds.height-5);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    this.pop(p);
  }
}


/*
 * Diamond()
 *  a diamond shape
 *  Located at (0, 0) upon construction
 */
class Diamond extends BuildingBlock {
  constructor() {
    super();
    this.bounds.width = 1;
    this.bounds.height = 1;
    this.shadowed = false;
    this.color = '#000000';
    this.strokeColor = '#000000';
    this.strokeWeight = .5;
    this.refreshMe();
  }

  draw(p) {
    if (!this.visible) return;
    let shape = function(x, y) {
      p.strokeCap(p.SQUARE);
      p.beginShape();
      p.quad(x + this.bounds.width/2, y, x + this.bounds.width, y + this.bounds.height/2,
             x + this.bounds.width/2, y + this.bounds.height, x, y + this.bounds.height/2);
    }.bind(this);
    this.push(p);
    if (this.shadowed) {
      let eps = 3;
      p.noStroke();
      p.fill(this.shadowColor);
      shape(this.bounds.x + eps, this.bounds.y + eps);
    }
    this.fill(p, this.color);
    p.noStroke();
    shape(this.bounds.x, this.bounds.y);
    p.noFill();
    if (this.highlighted) {
      p.strokeWeight(this.strokeWeight+2);
      this.stroke(p, this.highlightColor);
      shape(this.bounds.x, this.bounds.y);
    }
    p.strokeWeight(this.strokeWeight);
    this.stroke(p, this.strokeColor);
    shape(this.bounds.x, this.bounds.y);
    this.pop(p);
  }
}

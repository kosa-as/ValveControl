/*
 * Copyright (C) 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

class Scrollbar {
  constructor(xp, yp, tracklen, trackwidth) {
    this.track = { x: xp, y: yp, length: tracklen, width: trackwidth, color: '#EEEEEE' };
    this.drawing = {pos: 0, length: 0};
    this.thumb = { pos: 0, length: 0, color: '#BBBBBB' };
    this.visible = true;
  }

  /*
   * Thumb length and position are proportional:
   *
   * .-------------------------------------------------.
   * |                       D                         |
   * |                                                 |  drawing
   * |                                                 |  after scaling
   * |   A             B                    C          |  and dragging
   * .-------:--------------------:--------------------.
   *         .--------------------.
   *         |                    |
   *         |                    |    window
   *         |         d          |
   *         .--------------------.
   *         |   XXXXXX           |    scrollbar with thumb
   *         .---:-----:----------.
   *           a    b       c
   *
   * A = - drawing.pos (since window starts at 0)
   * B = window width == track.length
   * D = drawing.length
   * A + B + C = D
   *
   * a = thumb.pos
   * b = thumb.length
   * d = track.length
   * a + b + c = d
   *
   * so B == d
   *
   * invariants:
   *
   *   A + B + C == D
   *   a + b + c == d
   *   proportionality, i.e: A/a == B/b == C/c == D/d
   *
   * So, with F = D/d:
   *   thumb.length = b = B/F = track.length/F
   *   thumb.pos = a = A/F = - drawing.pos/F
   */

  refresh() {
    let F = this.drawing.length / this.track.length;
    if (F <= 1) {
      this.visible = false;
    } else {
      this.visible = true;
      this.thumb.length = this.track.length / F;
      this.thumb.pos = - this.drawing.pos / F;
    }
  }

  onThumb(px, py) {
    return (this.onTrack(px, py) &&
            this.thumb.pos <= this.position(px, py) &&
            this.position(px, py) <= this.thumb.pos + this.thumb.length)
  }

  stepDirection(toZero, inc) {
    let tpos = this.thumb.pos;
    let incr = this.thumb.length * inc;
    tpos = toZero ? (tpos - incr) : (tpos + incr);
    tpos = Math.min(Math.max(tpos, 0), this.track.length - this.thumb.length);
    this.thumb.pos = tpos;
  }

  step(px, py) {
    if (this.onTrack(px, py)) {
      if (this.position(px, py) >  this.thumb.pos + this.thumb.length)
        this.stepDirection(false, 3/4);
      else if (this.position(px, py) <  this.thumb.pos)
        this.stepDirection(true, 3/4);
    }
  }

  moveToThumb() {
    let F = this.drawing.length / this.track.length;
    this.drawing.pos = - this.thumb.pos * F;
  }

  dragThumb(tpos) {
    this.thumb.pos = Math.min(Math.max(tpos, 0), this.track.length - this.thumb.length);
  }


  // position(px, py) virtual

  // draw(p) { } virtual
}

class HorizontalScrollbar extends Scrollbar {
  constructor(xp, yp, tracklen, trackwidth) {
    super(xp, yp, tracklen, trackwidth);
  }

  refresh(parent) {
    this.track.x = 0;
    this.track.y = parent.height - this.track.width;
    this.track.length = parent.width - this.track.width;
    this.drawing.length = parent.drawing ? (parent.drawing.bounds.width * parent.world.scale) : 1;
    this.drawing.pos = parent.drawing ? parent.world.worldToCanvasX(parent.drawing.bounds.x) : 0;
    super.refresh();
  }

  onTrack(px, py) {
    return (this.visible &&
            this.track.x < px && px < this.track.x + this.track.length &&
            this.track.y < py && py < this.track.y + this.track.width);
  }

  moveWorld(parent) {
    if (this.visible) {
      this.moveToThumb();
      parent.world.x0 = parent.drawing ? (this.drawing.pos - parent.drawing.bounds.x * parent.world.scale) : 0;
    }
  }

  position(px, py) {
    return px - this.track.x;
  }

  draw(p) {
    if (this.visible) {
      p.push();
      p.translate(this.track.x, this.track.y);
      // track:
      p.noStroke();
      p.fill(this.track.color);
      p.rect(0, 0, this.track.length, this.track.width);
      // thumb:
      p.noStroke();
      p.fill(this.thumb.color);
      p.rect(this.thumb.pos, 2, this.thumb.length, this.track.width-4);
      p.pop();
    }
  }

  dragThumb(px, py) {
    super.dragThumb(px);
  }
}

class VerticalScrollbar extends Scrollbar {
  constructor(xp, yp, tracklen, trackwidth) {
    super(xp, yp, tracklen, trackwidth);
  }

  refresh(parent) {
    this.track.x = parent.width - this.track.width;
    this.track.y = 0;
    this.track.length = parent.height - this.track.width;
    this.drawing.length = parent.drawing ? (parent.drawing.bounds.height * parent.world.scale) : 1;
    this.drawing.pos = parent.drawing ? parent.world.worldToCanvasY(parent.drawing.bounds.y) : 0;
    super.refresh();
  }

  onTrack(px, py) {
    return (this.visible &&
            this.track.x < px && px < this.track.x + this.track.width &&
            this.track.y < py && py < this.track.y + this.track.length);
  }

  moveWorld(parent) {
    if (this.visible) {
      this.moveToThumb();
      parent.world.y0 = parent.drawing ? (this.drawing.pos - parent.drawing.bounds.y * parent.world.scale) : 0;
    }
  }

  position(px, py) {
    return py - this.track.y;
  }

  draw(p) {
    if (this.visible) {
      p.push();
      p.translate(this.track.x, this.track.y);
      // track:
      p.noStroke();
      p.fill(this.track.color);
      p.rect(0, 0, this.track.width, this.track.length);
      // thumb:
      p.noStroke();
      p.fill(this.thumb.color);
      p.rect(2, this.thumb.pos, this.track.width-4, this.thumb.length);
      p.pop();
    }
  }

  dragThumb(px, py) {
    super.dragThumb(py);
  }
}

class Scrollbars {
  constructor(parent) { // diagramP5
    this.parent = parent;
    this.width = 15;
    this.horizontal = new HorizontalScrollbar(0, 0, 1, this.width);
    this.vertical = new VerticalScrollbar(0, 0, 1, this.width);
    this.refresh();
  }

  refresh() {
    this.horizontal.refresh(this.parent);
    this.vertical.refresh(this.parent);
  }

  moveWorld() {
    this.horizontal.moveWorld(this.parent);
    this.vertical.moveWorld(this.parent);
  }

  draw(p) {
    this.horizontal.draw(p);
    this.vertical.draw(p);
    // corner:
    if (this.horizontal.visible && this.vertical.visible) {
      p.push();
      p.translate(this.vertical.track.x, this.horizontal.track.y);
      p.noStroke();
      p.fill('#BBBBBB');
      p.rect(0, 0, this.vertical.track.width, this.horizontal.track.width);
      p.pop();
    }
  }

  onTracks(px, py) {
    return (this.horizontal.onTrack(px, py) || this.vertical.onTrack(px, py));
  }

  onThumb(px, py) {
    return this.horizontal.onThumb(px, py) || this.vertical.onThumb(px, py);
  }

  step(px, py) {
    this.horizontal.step(px, py);
    this.vertical.step(px, py);
  }
}

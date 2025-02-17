/*
 * Copyright (C) 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
 * Copyright (C) 2022 Paul Hoogendijk <paul@dezyne.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

class SequenceDiagramP5 extends DiagramP5 {

  constructor(parent) {
    super(parent);
    /*
     * super defines interface to the outside world, through functions
     *   in.draw(data)
     *   in.dimensions(px, py, width, height)
     *   out.selected(location)
     *
     * extension:
     */
    this.out.event = function (event) {
        console.log('event: %j', event);
    };

    this.data = null;
    this.message = null;

    this.nrFocusFrames = 10;
    this.focusShift = {x:0, y:0};
    this.focusFrame = this.nrFocusFrames;

    this.activeEventIndex = -1;
    this.highlightedEvent = null;
    this.eventFocus = 'center'; // from {'left', 'center', 'right'}
    this.activeLifelineIndex = -1;
    this.highlightedLifeline = null;
    this.lifelineOrder = [];
  }

  /*
   * These abstrace methods have to be defined in this class:
   *
   * initDiagram() { }
   * draw(p) { }
   * selection(px, py) { }
   * handleKey(p) { }
   * handleMouseClick(p, e) { }
   * dragIt(px, py) { }
   * stopDraggingIt() { }
   * help() { }
   */

  initDiagram() {
    try {
      this.diagram = new SequenceDiagram(this.data);
      let extension = this.sameHeaders(this.previousData, this.data) && this.lifelineOrder.length > 0;
      if (extension)
        this.diagram.restoreLifelineOrder(this.lifelineOrder);
      this.diagram.initViz();
      // reset internal state
      if (extension) {
        if (this.activeLifelineIndex >= 0) {
          this.highlightedLifeline = this.diagram.body.findLifeline(this.activeLifelineIndex);
          this.highlightedLifeline.highlight(true);
        }
        this.lifelineOrder = [];
      } else {
        this.activeLifelineIndex = -1;
        this.highlightedLifeline = null;
        this.lifelineOrder = [];
      }
      this.drawing = this.makeDrawing(this.diagram);
      this.drawing.padding.top = 0;
      this.drawing.refresh();
      this.shiftToBottom();
      this.activeEventIndex = this.diagram.body.events.length-1;
      let componentLifelines = this.diagram.body.getComponentLifelines()
      if (!extension && componentLifelines.length==1) {
        this.setActiveLifeline(componentLifelines[0].index);
      }
      this.highlightActiveEvent();
      this.setCursor(this.sketch, 'default');
      this.sketch.noLoop();
      this.helpMessage.initViz();
    } catch(e) {
      this.diagram = null;
      this.message = new BoundingBox(new Text(''));
      this.message.setPadding(30);
      this.message.content.size = 30;
      this.message.color = '#F37361';
      this.setMessage(this.message, 'invalid input: see console [F12] for details');
      console.log('%j: %j', e, this.data);
      this.drawing = this.makeDrawing(this.message);
      this.sketch.noLoop();
    }
  }

  sameHeaders(data1, data2) {
    if (!data1 || !data2) return false;
    let headers1 = data1.lifelines.map(ll => ll.header.instance).join(',');
    let headers2 = data2.lifelines.map(ll => ll.header.instance).join(',');
    return headers1 == headers2;
  }

  setMessage(diagram, msg) {
    diagram.content.text = msg;
    diagram.content.refresh();
    diagram.center(this.sketch.windowWidth/2, this.sketch.windowHeight/2);
    diagram.refresh();
  }

  draw(p) {
    // for svg: use this.world.graphics to generate image i.s.o. p
    let gr = this.world.graphics || p;
    gr.clear();
    gr.background(this.background);
    if (this.diagram) {
      gr.push();
      this.drawing.refreshMe();
      this.world.set(gr, this.drawing.bounds);
      this.moveHeaderToTop();
      this.drawing.draw(gr);
      if (this.focusAnimating()) {
        p.loop();
      } else {
        p.noLoop();
        this.checkRepeatKey(p);
      }
      gr.pop();
    } else if (this.message) {
      gr.push();
      this.drawing.draw(gr);
      p.noLoop();
      gr.pop();
    }
    if (this.showHelp) {
      gr.push();
      gr.translate(10,10);
      this.helpMessage.draw(gr);
      gr.pop();
    }
    if (this.world.graphics) {
      p.image(gr, 0, 0);
    } else {
      this.scrollbars.refresh();
      this.scrollbars.draw(p);
    }
  }

  moveHeaderToTop() {
    let topLeft = this.world.canvasToWorld(0, 0);
    let bnd = this.diagram.absoluteBounds;
    let header = this.diagram.header;
    header.move(header.bounds.x, Math.max(0, topLeft.y - bnd.y));
  }

  selection(px, py) {
    let sel = this.diagram.objectsAt(px, py);
    return this.selectionOfKlass(sel, Header)
      || this.selectionOfKlass(sel, HeaderGroup)
      || this.selectionOfKlass(sel, Button)
      || this.selectionOfKlass(sel, Event)
      || this.selectionOfKlass(sel, Lifeline);
  }

  lastEvent() {
    let nrEvents = this.diagram.body.events.length;
    return (nrEvents > 0) ? this.diagram.body.events[nrEvents-1] : null;
  }

  hasMatchingLifeline(activity, lifeline) {
    return activity && lifeline && activity.lifeline.index == lifeline.index;
  }

  shiftActiveEvent(right) {
    function shift(pos) {
      if (right) return (pos == 'left') ? 'center' : 'right';
      else return (pos == 'right') ? 'center' : 'left';
    }
    if (this.highlightedEvent) {
      this.eventFocus = shift(this.eventFocus);
      this.focus(this.highlightedEvent, this.eventFocus);
      this.redrawNeeded = true;
    }
  }

  selectNextActiveEvent(down) {
    let matches = function(eventIndex, lifeline) {
      if (!lifeline) return true;
      let event = this.diagram.body.events[eventIndex];
      let qin = (event.type == 'out') &&
                (event.from.lifeline.index != event.to.lifeline.index) &&
                (event.to.lifeline.header.role == 'component');
      return this.hasMatchingLifeline(event.from, lifeline) ||
        (this.hasMatchingLifeline(event.to, lifeline) && !qin);
    }.bind(this);
    let nrEvents = this.diagram.body.events.length;
    if (down) {
      if (this.activeEventIndex < nrEvents-1)
        this.activeEventIndex++;
      while (this.activeEventIndex < nrEvents-1 && !matches(this.activeEventIndex, this.highlightedLifeline))
        this.activeEventIndex++;
    } else {
      if (this.activeEventIndex >= 0)
        this.activeEventIndex--;
      while (this.activeEventIndex >= 0 && !matches(this.activeEventIndex, this.highlightedLifeline))
        this.activeEventIndex--;
    }
    this.highlightActiveEvent();
    this.redrawNeeded = true;
  }

  selectActivity(event, selectedLifeline) {
    let from_selected = this.hasMatchingLifeline(event.from, selectedLifeline);
    let to_selected = this.hasMatchingLifeline(event.to, selectedLifeline);
    let select_from = (from_selected || event.type =='return') && !to_selected;
    let swap = this.world.p.keyIsDown(this.world.p.CONTROL);
    if ((select_from != swap) || !event.to)
      return event.from;
    else
      return event.to;
  }

  highlightActiveEvent() {
    if (this.highlightedEvent) {
      this.highlightedEvent.highlight(false);
    }
    if (this.activeEventIndex >= 0) {
      this.highlightedEvent = this.diagram.body.events[this.activeEventIndex];
      this.highlightedEvent.highlight(true);
      this.eventFocus = 'center';
      this.focus(this.highlightedEvent, this.eventFocus);
      let activity = this.selectActivity(this.highlightedEvent, this.highlightedLifeline);
      if (activity) {
        let location = activity.location;
        if (location) this.out.selected({...location,
                                         'working-directory': this.data['working-directory']});
      }
    } else {
      this.highlightedEvent = null;
      // do not change focus upon deselect
      // this.focus(null);
    }
    let index = Math.min(this.activeEventIndex+1, this.diagram.states.length-1);
    this.diagram.setActive(index);
  }

  resetHighlightEvent() {
    this.activeEventIndex = -1;
    this.highlightActiveEvent();
  }

  setActiveLifeline(index) {
    // deselect by second activate:
    this.activeLifelineIndex = (this.activeLifelineIndex == index) ? -1 : index;

    if (this.highlightedLifeline) {
      this.highlightedLifeline.highlight(false);
      this.highlightedLifeline.header.highlight(false);
    }
    if (this.activeLifelineIndex >= 0) {
      this.highlightedLifeline = this.diagram.body.findLifeline(this.activeLifelineIndex);
      this.highlightedLifeline.highlight(true);
      this.highlightedLifeline.header.highlight(true);
      this.redrawNeeded = true;
    } else {
      this.highlightedLifeline = null;
    }
    this.highlightActiveEvent();
  }

  get bottomRight() {
    let w = this.world.width;
    if (this.scrollbars.vertical.visible) w -= this.scrollbars.width;
    let h = this.world.height;
    if (this.scrollbars.horizontal.visible) h -= this.scrollbars.width;
    return this.world.canvasToWorld(w, h);
  }

  focus(obj, at) {
    // obj instanceof Event or null
    let topLeft = this.world.canvasToWorld(0, 0);
    let bottomRight = this.bottomRight;
    let oldX = 0;
    let oldY = 0;
    let newX = 0;
    let newY = 0;
    let margin = 10/this.world.scale;
    let dbnd = this.diagram.bounds;
    let bodybnd = this.diagram.body.absoluteBounds;
    let headerbnd = this.diagram.header.absoluteBounds;
    if (obj) {
      let objbnd = obj.absoluteBounds;
      // extend object bounds with the width of both headers:
      let extendWidth = function(hdr) {
        let hbnd = hdr.absoluteBounds;
        if (hbnd.x < objbnd.x) {
          let diff = objbnd.x - hbnd.x;
          objbnd.x -= diff;
          objbnd.width += diff;
        }
        if (hbnd.x + hbnd.width > objbnd.x + objbnd.width) {
          let diff = (hbnd.x + hbnd.width) - (objbnd.x + objbnd.width);
          objbnd.width += diff;
        }
      }.bind(this);
      if (obj.from) extendWidth(obj.from.lifeline.header);
      if (obj.to) extendWidth(obj.to.lifeline.header);
      oldX = objbnd.x;
      newX = (objbnd.width > (bottomRight.x - topLeft.x))
        ? ((at == 'left') ? topLeft.x + margin
           : (at == 'center') ? (bottomRight.x + topLeft.x)/2 - objbnd.width/2
           : bottomRight.x - objbnd.width - margin)
        : (oldX < topLeft.x) ? topLeft.x + margin
        : (oldX + objbnd.width > bottomRight.x) ? bottomRight.x - objbnd.width - margin
        : oldX;
      oldY = objbnd.y;
      newY = (oldY < topLeft.y + headerbnd.height) ? topLeft.y + headerbnd.height + margin
        : (oldY + objbnd.height > bottomRight.y) ? bottomRight.y - objbnd.height - margin
        : oldY;
      if (obj.index == this.diagram.body.events.length-1) {
        // scroll down the bottom of body, to show the eligibles
        oldY = dbnd.y + dbnd.height;
        newY = (oldY > bottomRight.y) ? bottomRight.y - margin : oldY;
      }
    } else {
      // assure right side header is left-aligned to view,
      oldX = dbnd.x;
      newX = (oldX + dbnd.width > bottomRight.x) ? bottomRight.x - dbnd.width - margin
        : oldX;
      newX = (newX < topLeft.x) ? topLeft.x + margin
        : newX;
      // scroll up to show body top
      oldY = dbnd.y;
      newY = (oldY < topLeft.y + dbnd.height) ? headerbnd.y + headerbnd.height + margin
        : oldY;
    }
    if (newX != oldX || newY != oldY) {
      this.startFocusAnimation(newX - oldX, newY - oldY);
    }
  }

  shiftToBottom() {
    let bottomRight = this.bottomRight;
    let margin = 10/this.world.scale;
    let bodybnd = this.diagram.body.bounds;
    // scroll up to show body bottom
    let oldY = bodybnd.y + bodybnd.height;
    if (oldY > bottomRight.y) {
      let newY = bottomRight.y - margin;
      this.world.shiftWorld(0, newY - oldY);
    }
  }

  startFocusAnimation(dx, dy) {
    this.focusShift = {x: 1/this.nrFocusFrames*dx, y: 1/this.nrFocusFrames*dy};
    this.world.shiftWorld(this.focusShift.x, this.focusShift.y);
    this.focusFrame = 1;
  }

  focusAnimating() {
    if (this.focusFrame == this.nrFocusFrames) return false;
    this.world.shiftWorld(this.focusShift.x, this.focusShift.y);
    this.focusFrame++;
    return true;
  }

  help() {
    let help = [
      ['', 'help'],
      ['F1 or ?', 'toggle this help pop-up'],
      ['','zooming and scrolling'],
      ['ctrl mouse scroll', 'zoom in or out around the mouse pointer location'],
      ['ctrl +','zoom in around the mouse pointer location'],
      ['ctrl -','zoom out around the mouse pointer location'],
      ['ctrl 1','reset the zoom factor to 1'],
      ['ctrl 0','zoom such that the whole diagram width fits on the canvas'],
      ['mouse scroll','scroll the diagram up or down'],
      ['shift mouse scroll','scroll the diagram left or right'],
      ['shift down arrow','scroll the diagram down'],
      ['shift up arrow','scroll the diagram up'],
      ['shift right arrow','scroll the diagram right'],
      ['shift left arrow','scroll the diagram left'],
      ['','dragging'],
      ['ctrl mouse drag','drag the canvas'],
      ['mouse drag on header','reposition the header element'],
      ['','selecting'],
      ['mouse click element','select the element'],
      ['    event','select the event and send its file location to the IDE'],
      ['    header','(de)select the corresponding lifeline'],
      ['    lifeline','(de)select the lifeline'],
      ['    eligible button','send the eligible event to the IDE'],
      ['mouse click canvas','deselect any event'],
      ['up arrow','select the previous event'],
      ['down arrow','select the next event'],
      ['left arrow','shift the focus on the selected event to the left'],
      ['right arrow','shift the focus on the selected event to the right'],
      ['','save'],
      ['ctrl s','save the diagram as an svg file'],
    ];
    return new Help(help);
  }

  handleKey(p) {
    // use p5 'key' variable for ASCII keys
    // use p5 'keyCode' variable for non-ASCII keys
    if (this.keyCode(p, 112) || this.key(p, '?')) { // 112: F1 key
      this.showHelp = ! this.showHelp;
      this.redrawNeeded = true;
      console.log('HELLUP');
    } else if (this.keyCode(p, p.DOWN_ARROW) || this.keyCode(p, p.DOWN_ARROW, p.CONTROL)) {
      this.selectNextActiveEvent(true); // down
    } else if (this.keyCode(p, p.UP_ARROW) || this.keyCode(p, p.UP_ARROW, p.CONTROL)) {
      this.selectNextActiveEvent(false); // up
    } else if (this.keyCode(p, p.RIGHT_ARROW)) {
      this.shiftActiveEvent(true); // right
    } else if (this.keyCode(p, p.LEFT_ARROW)) {
      this.shiftActiveEvent(false); // left
    } else if (this.key(p, '-', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, this.world.zoomOutFactor);
      this.redrawNeeded = true;
    } else if (this.key(p, '+', p.CONTROL) || this.key(p, '=', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, this.world.zoomInFactor);
      this.redrawNeeded = true;
    } else if (this.key(p, '0', p.CONTROL)) {
      // horizontal only!
      this.world.fit({width: this.drawing.scaledBounds.width, height: 1});
      this.redrawNeeded = true;
    } else if (this.key(p, '1', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, 1/this.world.scale);
      this.redrawNeeded = true;
    } else if (this.key(p, 's', p.CONTROL)) {
      this.saveAsSvg(p, 'sequence.svg');
    } else {
      return super.handleKey(p);
    }
    // suppress default behaviour:
    return false;
  }

  dragIt(px, py) {
    if (this.drag.ctrl) {
      // dragged the canvas
    } else if (this.drag.obj) {
      let obj = this.drag.obj;
      if (obj instanceof Header && (obj.role == 'provides' || obj.role == 'requires')) {
        this.dragHeader(obj, px, py);
      }
    }
  }

  dragHeader(header, px, py) {
    header.shift(px-header.bounds.x, 0);
    header.lifeline.align();
    this.diagram.body.reorder(header);
  }

  stopDraggingIt() {
    let obj = this.drag.obj;
    if (obj && obj instanceof Header && (obj.role == 'provides' || obj.role == 'requires')) {
      // restore obj's position by refreshing its group
      obj.lifeline.group.header.refreshMe();
      obj.lifeline.align();
      this.diagram.body.refreshEvents();
      this.redrawNeeded = true;
    }
  }

  handleMouseClick(p, e) {
    let wpt = this.world.mousePoint();
    // take care: handle body and header separately
    this.resetHighlight();
    let obj = this.selection(wpt.x, wpt.y);
    if (obj) {
      if (obj instanceof Button) {
        let manager = obj.manager;
        if (manager instanceof Message) {
          let location = manager.location;
          if (location) this.out.selected({...location,
                                           'working-directory': this.data['working-directory']});
        } else if (manager instanceof Eligible) {
          this.setCursor(p, 'wait');
          // save order for diagram extension :
          this.lifelineOrder = this.diagram.lifelineOrder;
          // test: this.in.draw(this.data);
          this.out.event(manager.text);
        }
      } else if (obj instanceof Event) {
        this.activeEventIndex = obj.index;
        this.highlightActiveEvent();
      } else if (obj instanceof Header) {
        this.setActiveLifeline(obj.lifeline.index);
      } else if (obj instanceof HeaderGroup) {
        // noop
      } else if (obj instanceof Lifeline) {
        this.setActiveLifeline(obj.index);
      }
    } else {
      this.resetHighlightEvent();
    }
    this.redrawNeeded = true;
  }
}

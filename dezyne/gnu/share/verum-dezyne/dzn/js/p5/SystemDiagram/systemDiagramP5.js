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

class SystemDiagramP5 extends DiagramP5 {

  constructor(parent) {
    super(parent);
    /*
     * super defines interface to the outside world, through functions
     *   in.draw(data)
     *   in.dimensions(px, py, width, height)
     *   out.selected(location)
     *
     * extension: none
     */

    this.tooltipObj = null;
    this.tooltip = null;
    this.highlightedExtras = [];

    this.nrFocusFrames = 10;
    this.focusShift = {x:0, y:0};
    this.focusFrame = this.nrFocusFrames;

    this.diagramStack = []; // [Instance]

    this.showInstance = true;
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
   * help() { }
   */

  initDiagram() {
    this.showInstance = this.sketch.getItem('system:showInstance');
    if (this.showInstance === null) this.showInstance = true;
    this.diagram = new SUT(this.data).instance;
    this.diagram.initVizLight(false);
    this.diagram.showInstance(this.showInstance);
    this.diagram.move(100, 100);
    this.diagramStack.push(this.diagram);
    this.drawing = this.makeDrawing(this.diagram);
    this.setCursor(this.sketch, 'default');
    this.sketch.noLoop();
    this.helpMessage.initViz();
    this.resetHighlight();
  }

  draw(p) {
    // for svg: use this.world.graphics to generate image i.s.o. p
    let gr = this.world.graphics || p;
    gr.clear();
    gr.background(this.background);
    if (!this.diagram) return;
    this.updateDrawing(this.diagram);
    this.drawing.refresh();
    gr.push();
    this.world.set(gr, this.drawing.bounds);
    this.drawing.draw(gr);
    gr.pop();
    if (this.diagram.changing || this.focusAnimating) p.loop();
    else {
      p.noLoop();
      this.checkRepeatKey(p);
    }
    this.drawDetails(gr);
    this.drawTooltip(gr, p.mouseX, p.mouseY);
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

  mouseMoved(p, e) {
    super.mouseMoved(p, e);
    if (!this.mouseInCanvas(p)) return;
    let obj = this.objAtMouse(p);
    if (obj && obj instanceof Port)
      this.setTooltip(obj);
    else
      this.setTooltip(null);
  }

  setTooltip(obj) {
    let old = this.tooltipObj;
    this.tooltipObj = obj;
    if (this.tooltipObj && this.tooltipObj != old) {
      if (this.tooltipObj instanceof Port) {
        let text = this.tooltipObj.name;
        this.tooltip = new BoundingBox(new Text(text));
        this.tooltip.setPadding(3);
        this.tooltip.color = '#FFFCB0';
        this.tooltip.refreshMe();
      }
    }
    if (this.tooltipObj || old)
      this.redrawNeeded = true;
  }

  highlight(obj) {
    super.highlight(obj);
    this.resetHighlightExtras();
  }

  resetHighlight() {
    super.resetHighlight();
    this.resetHighlightExtras();
    this.redrawNeeded = true;
  }

  highlightExtras(lst) {
    this.highlightedExtras = lst;
    this.highlightedExtras.forEach(h => h.highlight(true));
    this.redrawNeeded = true;
  }

  resetHighlightExtras() {
    this.highlightedExtras.forEach(h => h.highlight(false));
    this.highlightedExtras = [];
  }

  get bottomRight() {
    let w = this.world.width;
    if (this.scrollbars.vertical.visible) w -= this.scrollbars.width;
    let h = this.world.height;
    if (this.scrollbars.horizontal.visible) h -= this.scrollbars.width;
    return this.world.canvasToWorld(w, h);
  }

  focus(obj) {
    let sbnd = this.diagram.scaledBounds;
    let obnd = obj.relativeBounds(this.diagram.viz);
    // absolute coordinates:
    let oldX = (obj == this.diagram) ? sbnd.x : sbnd.x+obnd.x;
    let oldY = (obj == this.diagram) ? sbnd.y : sbnd.y+obnd.y;
    let newX = oldX;
    let newY = oldY;
    let topLeft = this.world.canvasToWorld(0, 0);
    let bottomRight = this.bottomRight;
    let newXY = this.world.canvasToWorld(100,100);
    if (oldX < topLeft.x || oldX + obnd.width > bottomRight.x) newX = newXY.x;
    if (oldY < topLeft.y || oldY + obnd.height > bottomRight.y) newY = newXY.y;

    if (newX != oldX || newY != oldY) {
      this.startFocusAnimation(newX - oldX, newY - oldY);
    }
  }

  startFocusAnimation(dx, dy) {
    this.focusShift = {x: 1/this.nrFocusFrames*dx, y: 1/this.nrFocusFrames*dy};
    this.world.shiftWorld(this.focusShift.x, this.focusShift.y);
    this.focusFrame = 1;
    this.redrawNeeded = true;
  }

  get focusAnimating() {
    if (this.focusFrame == this.nrFocusFrames) return false;
    this.world.shiftWorld(this.focusShift.x, this.focusShift.y);
    this.focusFrame++;
    return true;
  }

  highlightAndFocus(obj) {
    this.highlight(obj);
    this.focus(obj);
  }

  handleMouseClick(p, e) {
    let obj = this.objAtMouse(p);
    if (obj) {
      if (obj instanceof Button) {
        obj.callback(e.ctrlKey);
        this.redrawNeeded = true;
      } else {
        this.highlight(obj);
        if (obj instanceof Port) {
          this.highlightExtras(this.path(obj));
          this.redrawNeeded = true;
        }
        let location = obj.location;
        if (p.keyIsDown(p.CONTROL)) {
          if (obj instanceof Instance)
            location = obj.model && obj.model.location;
          else if (obj instanceof Port)
            location = obj.dinterface.location;
          else if (obj instanceof Binding)
            location = obj.fromPort.dinterface.location;
        }
        if (location) this.out.selected({...location, 'working-directory': this.data['working-directory']});
      }
    } else {
      this.resetHighlight();
    }
  }

  objAtMouse(p) {
    if (!this.mouseInCanvas(p)) return null;
    if (!this.diagram) return null;
    let wpt = this.world.mousePoint();
    return this.selection(wpt.x, wpt.y);
  }

  selection(px, py) {
    let sel = this.diagram.objectsAt(px, py);
    return this.selectionOfKlass(sel, Button) ||
      this.selectionOfKlass(sel, Binding) ||
      this.selectionOfKlass(sel, Port) ||
      this.selectionOfKlass(sel, Instance) ||
      this.selectionOfKlass(sel, Component) ||
      this.selectionOfKlass(sel, Foreign) ||
      this.selectionOfKlass(sel, System);
  }

  path(port) {
    function follow(port, bnd) {
      let port2 = (bnd.fromPort == port) ? bnd.toPort : bnd.fromPort;
      let result = [port2];
      if (port2.model instanceof System) {
        let bnd2 = (port2.model == bnd.system) ? port2.externalBinding : port2.internalBinding;
        if (bnd2) {
          result.push(bnd2);
          result = result.concat(follow(port2, bnd2));
        }
      }
      return result;
    }

    let result = [port];
    let ibnd = port.internalBinding;
    let ebnd = port.externalBinding;
    if (ibnd) {
      result.push(ibnd);
      result = result.concat(follow(port, ibnd));
    }
    if (ebnd) {
      result.push(ebnd);
      result = result.concat(follow(port, ebnd));
    }
    return result;
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
      ['ctrl 0','zoom such that the whole diagram fits on the canvas'],
      ['mouse scroll','scroll the diagram up or down'],
      ['shift mouse scroll','scroll the diagram left or right'],
      ['shift down arrow','scroll the diagram down'],
      ['shift up arrow','scroll the diagram up'],
      ['shift right arrow','scroll the diagram right'],
      ['shift left arrow','scroll the diagram left'],
      ['','dragging'],
      ['ctrl mouse drag','drag the canvas'],
      ['','selecting'],
      ['mouse click element','select the element and send its file location to the IDE:'],
      ['    instance','select the instance'],
      ['    port','select the port, and all connected bindings and ports'],
      ['    binding','select the binding'],
      ['ctrl mouse click element','select as above, but send the following file location to the IDE:'],
      ['    instance','the defining component'],
      ['    port','the defining interface'],
      ['    binding','the defining interface'],
      ['(ctrl) mouse click canvas','deselect any element'],
      ['', 'system opening and closing'],
      ['mouse click on system [-] or [+] button','close or open the system'],
      ['ctrl mouse click on system [-] or [+] button','close or open the system and all its sub systems'],
      ['', 'component navigation'],
      ['ctrl down arrow','select first sub component of the selected system'],
      ['ctrl up arrow','select the parent system of the selected component'],
      ['right arrow','select the component to the right of the selected component'],
      ['left arrow','select the component to the left of the selected component'],
      ['down arrow','select the first component in the row below the selected component'],
      ['up arrow','select the first component in the row above the selected component'],
      ['- on system selection','close the system'],
      ['+ on system selection','open the system'],
      ['enter','limit the view to the selected component'],
      ['backspace','undo the enter effect'],
      ['','save'],
      ['ctrl s','save the diagram as an svg file'],
      ['','preferences (persistent)'],
      ['i','toggle showing instance names'],
    ];
    return new Help(help);
  }

  handleKey(p) {
    // use p5 'key' variable for ASCII keys
    // use p5 'keyCode' variable for non-ASCII keys
    if (this.keyCode(p, 112) || this.key(p, '?')) { // 112: F1 key
      this.showHelp = ! this.showHelp;
      this.redrawNeeded = true;
    } else if (this.keyCode(p, p.ENTER)) {
      // hack: avoid checkRepeatKey loop, since keyReleased is not detected
      this.stopTimeout();
      this.enterInstance();
    } else if (this.keyCode(p, p.BACKSPACE)) {
      this.exitInstance();
    } else if (this.keyCode(p, p.DOWN_ARROW, p.CONTROL) ||
               this.keyCode(p, p.UP_ARROW, p.CONTROL) ||
               this.keyCode(p, p.DOWN_ARROW) ||
               this.keyCode(p, p.UP_ARROW) ||
               this.keyCode(p, p.RIGHT_ARROW) ||
               this.keyCode(p, p.LEFT_ARROW)) {
      this.navigateInstance(p, p.keyCode);
    } else if (this.key(p, '-')) {
      this.closeSystem();
    } else if (this.key(p, '+') || this.key(p, '=')) {
      this.openSystem();
    } else if (this.key(p, '-', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, this.world.zoomOutFactor);
      this.redrawNeeded = true;
    } else if (this.key(p, '+', p.CONTROL) || this.key(p, '=', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, this.world.zoomInFactor);
      this.redrawNeeded = true;
    } else if (this.key(p, '0', p.CONTROL)) {
      this.world.fit(this.drawing.scaledBounds);
      this.redrawNeeded = true;
    } else if (this.key(p, '1', p.CONTROL)) {
      this.world.zoomAround(p.mouseX, p.mouseY, 1/this.world.scale);
      this.redrawNeeded = true;
    } else if (this.key(p, 's', p.CONTROL)) {
      this.saveAsSvg(p, 'system.svg');
    } else if (this.key(p, 'i')) {
      this.showInstance = !this.showInstance;
      p.storeItem('system:showInstance', this.showInstance);
      this.diagram.showInstance(this.showInstance);
      this.redrawNeeded = true;
    } else {
      return super.handleKey(p);
    }
    // suppress default behaviour:
    return false;
  }

  get highlightedInstance() {
    if (this.highlightedObj && this.highlightedObj instanceof Instance) return this.highlightedObj;
    else return null;
  }

  get highlightedModel() {
    if (!this.highlightedObj) return null;
    else if (this.highlightedObj instanceof Instance) return this.highlightedObj.model;
    else if (this.highlightedObj instanceof Component ||
             this.highlightedObj instanceof Foreign ||
             this.highlightedObj instanceof System) return this.highlightedObj;
    else return null;
  }

  get highlightedSystem() {
    let model = this.highlightedModel;
    if (model && model instanceof System) return model;
    else return null;
  }

  openSystem() {
    let system = this.highlightedSystem;
    if (system && !system.isOpen) {
      system.openClose();
      this.redrawNeeded = true;
    }
  }

  closeSystem() {
    let system = this.highlightedSystem;
    if (system && system.isOpen) {
      system.openClose();
      this.redrawNeeded = true;
    }
  }

  enterInstance() {
    let inst = this.highlightedInstance;
    if (inst) {
      this.diagram = inst;
      this.diagramStack.push(this.diagram);
      this.highlightAndFocus(this.diagram);
    }
  }

  exitInstance() {
    if (this.diagramStack.length > 1) {
      this.diagramStack.pop();
      this.diagram = this.diagramStack[this.diagramStack.length-1];
      this.highlightAndFocus(this.diagram);
    }
  }

  navigateInstance(p, keyCode) {
    let inst = this.highlightedInstance;
    if (inst) {
      this.navigate(inst, p, keyCode)
    } else if (!this.highlightedObj) {
      this.highlightAndFocus(this.diagram);
    }
  }

  navigate(instance, p, keyCode) {
    if (this.keyCode(p, p.DOWN_ARROW, p.CONTROL)) {
      // navigate inward
      if (instance.model instanceof System && instance.model.isOpen) {
        let layer = instance.model.layers[0];
        if (layer) this.highlightAndFocus(layer.instances[0]);
      }
    } else if (this.keyCode(p, p.UP_ARROW, p.CONTROL)) {
      // navigate outward; do not navigate outside diagram:
      if (instance != this.diagram) this.highlightAndFocus(instance.parentSystem.instance);
    } else {
      // navigate in current system
      // do not navigate outside diagram:
      if (instance == this.diagram) return;
      let system = instance.parentSystem;
      if (this.keyCode(p, p.DOWN_ARROW)) {
        let layer = system.nextLayer(instance);
        if (layer) this.highlightAndFocus(layer.instances[0]);
      } else if (this.keyCode(p, p.UP_ARROW)) {
        let layer = system.previousLayer(instance);
        if (layer) this.highlightAndFocus(layer.instances[0]);
      } else if (this.keyCode(p, p.RIGHT_ARROW)) {
        let sel = system.nextInstance(instance);
        if (sel) this.highlightAndFocus(sel);
      } else if (this.keyCode(p, p.LEFT_ARROW)) {
        let sel = system.previousInstance(instance);
        if (sel) this.highlightAndFocus(sel);
      }
    }
  }

  dragIt(px, py) {
    if (this.drag.ctrl) {
      // dragged the canvas
      // nothing diagram specific
    }
  }

  drawDetails(p) {
    if (this.highlightedObj && this.world.scale < .75) {
      let summary = this.highlightedModel.summary;
      if (summary) {
        p.push();
        p.translate(-summary.bounds.x+10, -summary.bounds.y+10);
        summary.draw(p);
        p.pop();
      }
    }
  }

  drawTooltip(p, mx, my) {
    if (this.tooltipObj) {
      p.push();
      p.translate(mx+20, my);
      this.tooltip.draw(p);
      p.pop();
    }
  }
}

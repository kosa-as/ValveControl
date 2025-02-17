/*
 * Copyright (C) 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2022 Paul Hoogendijk <paul@dezyne.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

class StateDiagramP5 extends DiagramP5 {

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
    this.in.reset = function() {
      this.sketch.data = null;
      if (this.sketch.set_up) {
        this.data = null;
        this.initDiagram();
        this.redrawNeeded = true;
      }
    }.bind(this);

    this.phase = {status: 'none', // {'none', 'simple', 'noself', 'full', 'stable'}
                  stability: 0};

    this.simpleDiagram = null;
    this.noselfDiagram = null;
    this.fullDiagram = null;

    this.dataLimit = 4000;
    this.nrNodes = 0;
    this.detail = null;

    this.layoutAborted = false;
    this.diagram = this.Message();
    this.drawing = this.makeDrawing(this.diagram);

    this.timeOut = 0;
    this.sketch.loop();
  }

  /*
   * These abstract methods have to be defined in this class:
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
    this.resetEnvironment();
    if (this.data == null) {
      this.diagram = null;
      this.sketch.noLoop();
    } else {
      this.nrNodes = this.data.states.length + this.data.transitions.length;
      if (this.nrNodes > this.dataLimit) {
        let msg =
            'more than '+ this.dataLimit + ' nodes\n\n' +
            'cowardly refusing to\n' +
            'draw state diagram';
        this.data = {states:[{id:'0', state:[{instance:'', state:[{name:'WARNING', value:msg}]}]},],
                     transitions:[], clusters: []};
      } else {
        this.data.clusters = StateDiagramBase.clusterTransitions(this.data.transitions);
      }
      this.diagram = this.Message();
      this.sketch.loop();
      this.helpMessage.initViz();

      this.showSelf = true;

      // start timing...
      this.timeOut = this.sketch.millis();
      this.incTimeOut();
      this.simpleDiagram = new StateDiagramSimple(this.data);
      console.log('----------- PHASE I -----------');
      console.log('  nr nodes: ' + this.simpleDiagram.graph.nodes.length);
      this.phase.status = 'simple';
      this.phase.stability = this.stabilize(this.simpleDiagram, 1, this.timeOut);
    }
  }

  resetEnvironment() {
    //pre: this.set_up
    this.world.scale = 1;
    this.world.x0 = 0;
    this.world.y0 = 0;
    this.diagram = null;
    this.simpleDiagram = null;
    this.noselfDiagram = null;
    this.fullDiagram = null;
    this.phase.status = 'none';
    this.drag.dragging = false;
    this.highlightedObj = null;
    this.detail = null;
    this.showSelf = true;
  }

  Message() {
    let message = new RoundedBoundingBox(new Text(''));
    message.color = '#FFFFFF';
    message.setPadding(20);
    message.center(this.width/2, this.height/2);
    message.refresh();
    return message;
  }

  incTimeOut() {
    let time = this.sketch.millis();
    while (this.timeOut < time) this.timeOut += 1000;
  }

  drawMessage(msg, p) {
    this.diagram.content.text = msg;
    this.diagram.center(this.width/2, this.height/2);
    this.updateDrawing(this.diagram);
    this.drawing.refresh();
    p.push();
    this.world.set(p, this.drawing.bounds);
    this.drawing.draw(p);
    p.pop();
  }

  stabilize(diagram, accuracy, timeOut) {
    if (diagram.maxEnergyPerNode == null) {
      // first call
      diagram.update();
      diagram.maxEnergyPerNode = diagram.energyPerNode;
    }
    let result = 0;
    let time = this.sketch.millis();
    let iter = 0;
    while (time < timeOut && diagram.energyPerNode > accuracy) {
      let logEN = Math.log(accuracy/diagram.energyPerNode);
      let minEN = Math.min(Math.log(accuracy/diagram.maxEnergyPerNode), logEN);
      result = Math.floor((1 - logEN/minEN) * 100);
      diagram.update();
      iter++;
      diagram.maxEnergyPerNode = Math.max(diagram.maxEnergyPerNode, diagram.energyPerNode);
      time = this.sketch.millis();
    }
    if (diagram.energyPerNode <= accuracy) result = 100;
    console.log('at ' + Math.floor(time/1000) + ' sec: iterations: ' + iter + '; stability: ' + result);
    return result;
  }

  draw(p) {
    // for svg: use this.world.graphics to generate image i.s.o. p
    let gr = this.world.graphics || p;
    gr.clear();
    gr.background(this.background);
    if (this.diagram == null) {
      p.noLoop();
    } else if (this.phase.status == 'none') {
      p.noLoop();
    } else if (this.phase.status == 'simple') {
      p.loop();
      this.drawSimple(gr);
    } else if (this.phase.status == 'noself') {
      p.loop();
      this.drawNoSelf(gr);
    } else if (this.phase.status == 'full') {
      p.loop();
      this.drawFull(gr);
    } else {
      // show the final state diagram
      if (!this.drag.ctrl && !this.layoutAborted) this.drawing.refresh();
      gr.push();
      this.world.set(gr, this.drawing.bounds);
      this.drawing.draw(gr);
      if (this.drag.dragging && this.drag.obj && !(this.drag.obj instanceof Scrollbar) && !this.drag.ctrl) {
        // fixate the node position to the mouse point
        let wpt = this.world.mousePoint();
        this.drag.obj.drag(wpt.x-this.drag.offset.x, wpt.y-this.drag.offset.y);
      } else if (this.diagram.energyPerNode < this.accuracy || this.layoutAborted) {
        p.noLoop();
      }
      if (this.highlightedObj) {
        let bnd = this.diagram.scaledBounds;
        gr.push();
        gr.fill('#ffffffAA');
        gr.noStroke();
        gr.rect(bnd.x, bnd.y, bnd.width, bnd.height);
        this.highlightedObj.drawSubGraph(gr, 2);
        gr.pop();
      }
      gr.pop();
      this.drawDetails(gr);
      this.checkRepeatKey(p);
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

  drawSimple(gr) {
    this.drawMessage('calculating layout ' + this.nrNodes + ' nodes\n\n' +
                     'PHASE I accuracy ' + this.phase.stability + '%', gr);
    if (this.phase.stability < 100) {
      this.incTimeOut();
      this.phase.stability = this.stabilize(this.simpleDiagram, 1, this.timeOut);
    } else {
      this.noselfDiagram = new StateDiagramNoSelf(this.data);
      this.noselfDiagram.copyLayout(this.simpleDiagram);
      console.log('----------- PHASE II -----------');
      console.log('  nr nodes: ' + this.noselfDiagram.graph.nodes.length);
      this.phase.status = 'noself';
      // accuracy = .01 * Math.sqrt(this.nrNodes);
      this.accuracy = .001 * this.noselfDiagram.SDNodes.length;
      this.phase.stability = this.stabilize(this.noselfDiagram, this.accuracy, this.timeOut);
    }
  }

  drawNoSelf(gr) {
    this.drawMessage('calculating layout ' + this.nrNodes + ' nodes\n\n' +
                     'PHASE I accuracy 100%\n\n' +
                     'PHASE II accuracy ' + this.phase.stability + '%', gr);
    if (this.phase.stability < 100) {
      this.incTimeOut();
      this.phase.stability = this.stabilize(this.noselfDiagram, this.accuracy, this.timeOut);
    } else {
      this.fullDiagram = new StateDiagramFull(this.data);
      this.fullDiagram.copyLayout(this.noselfDiagram);
      this.fullDiagram.initViz();
      this.fullDiagram.refresh();
      console.log('----------- PHASE III -----------');
      console.log('  nr nodes: ' + this.fullDiagram.graph.nodes.length);
      this.phase.status = 'full';
      this.accuracy = .001 * this.fullDiagram.SDNodes.length;
      this.phase.stability = this.stabilize(this.fullDiagram, this.accuracy, this.timeOut);
    }
  }

  drawFull(gr) {
    this.drawMessage('calculating layout ' + this.nrNodes + ' nodes\n\n' +
                     'PHASE I accuracy 100%\n\n' +
                     'PHASE II accuracy 100%\n\n' +
                     'PHASE III accuracy ' + this.phase.stability + '%', gr);
    if (this.phase.stability < 100 && !this.layoutAborted) {
      this.incTimeOut();
      this.phase.stability = this.stabilize(this.fullDiagram, this.accuracy, this.timeOut);
    } else {
      this.diagram = this.fullDiagram;
      this.updateDrawing(this.diagram);
      this.drawing.refresh();
      this.world.fit(this.drawing.bounds);
      this.phase.status = 'stable';
      this.setCursor(this.sketch, 'default');
    }
  }

  mouseWheel(p, e) {
    if (!this.mouseInCanvas(p)) return;
    this.world.mouseWheel(e);
    this.redrawNeeded = true;
    return false;
  }

  handleMouseClick(p, e) {
    let wpt = this.world.mousePoint();
    let node = this.selection(wpt.x, wpt.y);
    if (node) {
      this.highlight(node);
      if (node.data.location) this.out.selected({...node.data.location, 'working-directory': this.data['working-directory']});
    } else {
      this.resetHighlight();
    }
    this.redrawNeeded = true;
  }

  // override super:
  mouseMoved(p, e) {
    super.mouseMoved(p, e);
    if (!this.mouseInCanvas(p)) return;
    let node = this.nodeAtMouse(p);
    if (node != this.detail) {
      if (this.detail) {
        if (this.detail instanceof Transition) this.detail.hover(false);
        this.detail = null;
      }
      if (node) {
        this.detail = node;
        if (this.detail instanceof Transition) this.detail.hover(true);
      }
      this.redrawNeeded = true;
    }
  }

  nodeAtMouse(p) {
    if (!this.mouseInCanvas(p)) return null;
    if (!this.diagram) return null;
    let wpt = this.world.mousePoint();
    return this.selection(wpt.x, wpt.y);
  }

  selection(px, py) {
    let sel = this.diagram.objectsAt(px, py);
    return this.selectionOfKlass(sel, State)
      || this.selectionOfKlass(sel, Transition);
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
      ['mouse drag element','drag the element'],
      ['ctrl mouse drag','drag the canvas'],
      ['','layouting'],
      ['esc','toggle automatic layouting'],
      ['','selecting'],
      ['mouse click element','select the element and send its file location to the IDE\n'
      +'highlight all directly reachable nodes'],
      ['mouse click canvas','deselect any element'],
      ['.','select the initial state'],
      ['','filtering'],
      ['s','toggle hiding self transitions'],
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
    } else if (this.keyCode(p, p.ESCAPE)) {
      this.layoutAborted = !this.layoutAborted;
      if (!this.layoutAborted) {
        p.loop();
        this.redrawNeeded = true;
      }
    } else if (this.key(p, '.')) {
      if (this.diagram instanceof StateDiagramFull) {
        let ini = this.diagram.states.find(state => state instanceof InitialState);
        if (ini) {
          this.highlight(ini);
          this.redrawNeeded = true;
        }
      }
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
      this.saveAsSvg(p, 'state.svg');
    } else if (this.key(p, 's')) {
      this.toggleSelf();
    } else {
      return super.handleKey(p);
    }
    // suppress default behaviour:
    return false;
  }

  dragIt(px, py) {
    if (this.drag.ctrl) {
      // dragged the canvas
      // nothing diagram specific
    } else if (this.drag.obj) {
      if (this.drag.obj instanceof State) {
        this.drag.obj.dragselfs(px, py);
      } else {
        this.drag.obj.drag(px, py);
      }
      this.sketch.loop();
    }
  }

  toggleSelf() {
    if (this.diagram instanceof StateDiagramFull) {
      this.showSelf = !this.showSelf;
      this.diagram.drawSelf(this.showSelf);
      this.redrawNeeded = true;
    }
  }

  drawDetails(p) {
    if (!this.mouseInCanvas(p)) return;
    if (this.detail && this.world.scale < .75) {
      p.push();
      //        console.log('show detail %j', this.detail);
      p.translate(-this.detail.bounds.x+10, -this.detail.bounds.y+10);
      this.detail.draw(p);
      p.pop();
    }
  }
}


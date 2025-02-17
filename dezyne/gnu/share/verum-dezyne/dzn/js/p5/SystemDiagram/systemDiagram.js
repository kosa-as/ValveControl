/*
 * Copyright (C) 2020, 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2022 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

/*
 * Port
 *   a Model's port.
 *   visualisation: downward triangle in a box
 */
class Port extends Viz {
  constructor(data, datamodels, model) {
    super(data); // {name, location, interface}
    this.name = data.name;
    this.location = data.location;
    this.blocking = data.blocking;
    this.dinterface = datamodels.find(m => m.name == data.interface);
    this.model = model;
  }

  initViz() {
    let box = new Box();
    box.bounds.width = 10;
    box.bounds.height = 10;
    box.color = this.blocking ? '#B3E6FF' : '#FFFCB0';
//    box.color = '#FFFCB0';
//    box.strokeWeight = this.blocking ? 1.5 : .5;
    let pnt = new DTriangle();
    pnt.bounds.width = pnt.bounds.height = 6;
    pnt.color = '#000000';
    pnt.move(2,2);
    this.setViz(new Frame([box, pnt]));
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }

  get internalBinding() {
    if (this.model instanceof System) {
      return this.model.getBinding(this);
    } else {
      return null;
    }
  }

  get externalBinding() {
    let parent = this.model.instance.parentSystem;
    return parent && parent.getBinding(this);
  }
}

/*
 * Ports
 *   either all provides or all requires ports of a Model
 *   functions:
 *     refreshMe: float --> nil
 *       set the object's width, and layout the ports.
 *     layoutPorts: nil --> nil
 *       evenly spread the ports. FIXME: handle large amount of ports.
 */
class Ports extends Viz {
  constructor(ports, datamodels, model) {
    super(ports); // [port]
    this.model = model;
    this.ports = ports.map(port => new Port(port, datamodels, model));
    this.modelWidth = 1;
  }

  initViz() {
    this.ports.forEach(port => port.initViz());
    this.setViz(new Frame(this.ports));
  }

  refresh() {
    this.viz.refresh();
    this.refreshMe();
  }

  setWidth(width) {
    this.modelWidth = width;
    this.refreshMe();
  }

  refreshMe() {
    this.layoutPorts();
    this.viz.refreshMe();
  }

  layoutPorts() {
    let nrports = this.ports.length;
    let spread = this.modelWidth/(nrports+1);
    this.ports.forEach((port, i) => {
      port.move(i*spread, 0);
    });
  }
}

/*
 * Summary
 *   a Model's summary
 *   represented as a BoundingBox containing the given name as Text
 */
class Summary extends Viz {
  constructor(data) {
    super(data); // {name}
  }

  initVizColor(color) {
    let name = new Text(this.data.name);
    let box = new BoundingBox(name);
    box.setPadding(15);
    box.color = color;
    this.setViz(box);
  }
}

/*
 * SimpleComponent
 *   represented as a Frame containing:
 *   . a BoundingBox containing the given name as Text
 *   . the provides Ports at the top (centered)
 *   . the requires ports on the bottom (centered)
 */
class SimpleComponent extends Viz {
  constructor(data, datamodels, instance) {
    super(data); // {name, location, provides, requires}
    this.location = data.location;
    this.instance = instance;
    this.summary = new Summary(data);
    this.provides = new Ports(data.provides, datamodels, this);
    this.requires = new Ports(data.requires, datamodels, this);
    this.bbox;
  }

  initVizColor(color) {
    this.summary.initVizColor(color);
    this.name = new Text(this.vizName(true));
    this.name.centered = true;
    this.bbox = new BoundingBox(this.name);
    this.bbox.setPadding(15);
    this.bbox.color = color;
    this.provides.initViz();
    this.requires.initViz();
    this.setViz(new Frame([this.bbox, this.provides, this.requires]));
    this.refreshMe();
  }

  vizName(long) {
    return long ? (this.instance.name + '\n«' + this.data.name + '»') : this.data.name;
  }

  showInstance(show) {
    this.name.text = this.vizName(show);
  }

  refresh() {
    this.viz.refresh();
    this.refreshMe();
  }

  refreshMe() {
    let bbnd = this.bbox.scaledBounds;
    this.provides.refreshMe();
    this.provides.setWidth(bbnd.width);
    this.provides.center(bbnd.x+bbnd.width/2, bbnd.y);
    this.requires.refreshMe();
    this.requires.setWidth(bbnd.width);
    this.requires.center(bbnd.x+bbnd.width/2, bbnd.y+bbnd.height);
    this.viz.refreshMe();
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }
}

/*
 * Component
 *   represented as a Frame containing:
 *   . a BoundingBox containing the given name as Text
 *   . the provides Ports at the top (centered)
 *   . the requires ports on the bottom (centered)
 */
class Component extends SimpleComponent {
  constructor(data, datamodels, instance) {
    super(data, datamodels, instance); // {name, provides, requires}
  }

  initViz() {
    super.initVizColor('#AEE8A0');
  }
}

/*
 * Foreign Component
 *   represented as a Frame containing:
 *   . a BoundingBox containing the given name as Text
 *   . the provides Ports at the top (centered)
 *   . the requires ports on the bottom (centered)
 */
class Foreign extends SimpleComponent {
  constructor(data, datamodels, instance) {
    super(data, datamodels, instance); // {name, provides, requires}
  }

  initViz() {
    super.initVizColor('#E5FFE5');
  }
}

/*
 * Erroneous Component
 *   represented as a Frame containing:
 *   . a BoundingBox containing the given name as Text
 */
class Erroneous extends SimpleComponent {
  constructor(data, datamodels, instance) {
    super({...data, provides:[], requires:[]}, datamodels, instance); // {name, provides, requires}
  }

  initViz() {
    super.initVizColor('#FD9A99');
  }
}

/*
 * Instance
 *   a model instance is represented as the Model itself
 *   To get the model, a lookup in the list of all models is needed.
 */
class Instance extends Viz {
  constructor(data, datamodels, parent) {
    super(data); // {name, location, model}
    this.name = data.name;
    this.location = data.location;
    let dmodel = datamodels.find(m => m.name == data.model);
    if (!dmodel)
      this.model = new Erroneous({name: data.model}, datamodels, this);
    else
      this.model = (dmodel.kind == 'component') ? new Component(dmodel, datamodels, this)
        : (dmodel.kind == 'foreign') ? new Foreign(dmodel, datamodels, this)
        : (dmodel.kind == 'system') ? new System(dmodel, datamodels, this)
        : null;
    this.parentSystem = parent;
  }

  initVizLight(light) {
    if (this.model instanceof System)
      this.model.initVizLight(light);
    else
      this.model.initViz();
    this.setViz(new Frame([this.model]));
  }

  showInstance(show) {
    this.model.showInstance(show);
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }

  get changing() {
    return (this.model instanceof System) && this.model.changing;
  }
}

/*
 * Binding
 *   represented as a HRectLine between two Ports
 *   The Ports are found using the encapsulating System
 *   Before calling refresh() on a binding, take care to refresh te
 *   corresponding Ports!
 */
class Binding extends Viz {
  constructor(data, system) {
    super(data); // {from, to, location}
    this.location = data.location;
    this.system = system;
    this.fromInstance;
    this.fromPort;
    this.toInstance;
    this.toPort;

    let from = this.data.from;
    let to = this.data.to;
    // check and switch form/to if necessary
    let ipfrom, ipto;
    ipfrom = this.loookupFrom(from);
    if (ipfrom.port) {
      ipto = this.loookupTo(to);
    } else {
      // switch
      ipfrom = this.loookupFrom(to);
      ipto = this.loookupTo(from);
    }
    this.fromInstance = ipfrom.instance;
    this.fromPort = ipfrom.port;
    this.toInstance = ipto.instance;
    this.toPort = ipto.port;
  }

  loookupFrom(from) {
    if (from.inst) {
      let inst = this.system.instances.find(inst => inst.data.name == from.inst);
      if (! inst) throw('Binding: instance ' + instance + ' not found');
      let port = inst.model.requires.ports.find(req => req.data.name == from.port);
      return {instance: inst, port: port};
    } else {
      let port = this.system.provides.ports.find(prov => prov.data.name == from.port);
      return {instance: null, port: port};
    }
  }

  loookupTo(to) {
    if (to.inst) {
      let inst = this.system.instances.find(inst => inst.data.name == to.inst);
      if (! inst) throw('Binding: instance ' + to.inst + ' not found');
      let port = inst.model.provides.ports.find(prov => prov.data.name == to.port);
      return {instance: inst, port: port};
    } else {
      let port = this.system.requires.ports.find(req => req.data.name == to.port);
      return {instance: null, port: port};
    }
  }

  initViz() {
    this.line = new HRectLine(0, 0, 1, 1);
    this.setViz(this.line);
    this.refresh();
  }

  refresh() {
    if (!this.fromPort || !this.toPort) return;
    let fbnd = this.fromPort.relativeBounds(this.system.viz);
    let tbnd = this.toPort.relativeBounds(this.system.viz);
    this.line.refreshPoints(fbnd.x+fbnd.width/2, fbnd.y+fbnd.height,
                            tbnd.x+tbnd.width/2, tbnd.y);
  }

  draw(p) {
    this.refresh();
    this.viz.draw(p);
  }
}

/*
 * Layer
 *   One layer of instances in a System
 */
class Layer extends Viz {
  constructor(instances) {
    super(instances);
    this.instances = instances;
    this.hsep = 20;
  }

  initVizLight(light) {
    this.instances.forEach(inst => inst.initVizLight(!light));
    this.setViz(new Frame(this.instances));
  }

  refreshMe() {
    let px = 0;
    this.viz.content.forEach(r => {
      r.move(px, 0);
      let bnd = r.scaledBounds;
      px += bnd.width + this.hsep;
    });
    this.viz.refreshMe();
  }

}

/*
 * System
 *   a system component, which can be represented open or closed. Open
 *   means all instances are shown. Opening and closing a System is
 *   done with a button. Default is open.
 *   an open System is represented as a Frame containing
 *   . a BoundingBox containing the given name as Text,
 *     and all Instances, subdivided in Layers
 *     Instances are ordered in layers, such that bindings point downward.
 *     Each layer containing Instances with equal 'rank'.
 *   . the provides Ports at the top (centered)
 *   . the requires ports on the bottom (centered)
 *   . a '-' Button to close the System
 *   . all bindings between Ports
 *   a closed System is represented as a Frame containing
 *   . a BoundingBox containing the given name as Text
 *   . the provides Ports at the top (centered)
 *   . the requires ports on the bottom (centered)
 *   . a '+' Button to open the System
 *
 *  functions:
 *    initViz: nil --> nil
 *      (recursively) create all BuildingBlocks.
 *      Both buttons are created, with common callback function
 *      buttonOpenClose();
 *    buttonOpenClose: nil --> nil
 *      forward to function openClose();
 *    openClose: nil --> nil
 *      swap boolean isOpen, and refresh the layout
 *   refreshMe: nil --> nil
 *     re-layout, using the isOpen boolean.
 *     Take care to re-use all created BuildingBlocks, using function
 *     setContent to update.
 *   refreshLayout: frame --> nil
 *     move each layer below the previous one, leaving a gap
 *     center all layers
 **/
class System extends Viz {
  constructor(data, datamodels, instance) {
    super(data); // {name, location, provides, requires, instances, bindings}
    this.summary = new Summary(data);
    this.name;
    this.location = data.location;
    this.provides = new Ports(data.provides, datamodels, this);
    this.requires = new Ports(data.requires, datamodels, this);
    this.instances = this.data.instances.map(inst => new Instance(inst, datamodels, this));
    this.bindings = this.data.bindings
      .map(binding => new Binding(binding, this))
      .filter(binding => binding.fromPort && binding.toPort);
    this.layers = this.makeLayers(this.instances);
    this.instance = instance;
    this.changeSteps = 11;
    this.changeCounter = 0;
    this.isOpen;
    this.openViz;
    this.bindingSep = 3;
    this.padding = 15;
  }

  initVizLight(light) {
    let color = light ? '#C9FFC9' : '#C0F7BC'; // '#C3FAC0';
    this.summary.initVizColor(color);
    this.name = new Text(this.vizName(true));
    this.name.centered = true;
    this.layers.forEach(layer => layer.initVizLight(light));

    // add a last 'empty' layer, used for layouting
    this.instFrame = new Frame(this.layers.concat(new Frame([])));

    this.provides.initViz();
    this.requires.initViz();
    this.bindings.forEach(binding => binding.initViz());
    this.openButton = new Button(' - ', this.buttonOpenClose, this);
    this.closedButton = new Button(' + ', this.buttonOpenClose, this);

    this.bbox = new BoundingBox(new Frame([this.openButton, this.name, this.instFrame]));
    this.bbox.setPadding(this.padding);
    this.bbox.color = color;
    this.frame = new Frame([this.bbox, this.provides, this.requires]
                           .concat(this.bindings));
    // CLOSED:
    // this.bbox = new BoundingBox(new Frame([this.closedButton, this.name]));
    // this.frame = new Frame([this.bbox, this.provides, this.requires]);

    this.isOpen = true;
    this.changeCounter = 0;
    this.setViz(this.frame);
    this.initialLayout = true;
    this.refreshMe();
  }

  vizName(long) {
    return long ? (this.instance.name + '\n«' + this.data.name + '»') : this.data.name;
  }

  showInstance(show) {
    this.instances.forEach(inst => inst.showInstance(show));
    this.name.text = this.vizName(show);
  }

  highlight(on) {
    this.bbox.highlight(on);
  }

  buttonOpenClose(ctrl) {
    // take care: this instanceof Button
    console.log('PRESSED with CTRL ' + ctrl);
    this.manager.openClose(ctrl)
  }

  openClose(ctrl) {
    this.setOpenClose(!this.isOpen, ctrl);
    this.changeCounter = this.changeSteps;
    this.refreshMe();
  }

  setOpenClose(open, ctrl) {
    this.isOpen = open;
    if (ctrl) {
      this.instances.forEach(inst => {
        if (inst.model instanceof System) {
          inst.model.setOpenClose(open, ctrl);
        }
      });
    }
  }

  get changing() {
    return this.changeCounter != 0 || this.instances.find(inst => inst.changing);
  }

  updateViz(frame) {
    this.viz.setContent(frame.content);
  }

  refresh() {
    this.viz.refresh();
    this.refreshMe();
  }

  refreshMe() {
    let bboxFrame = this.bbox.content;
    let padding = 6;
    let py = padding;
    let showClosed = !this.isOpen; //  && this.changeCounter == 0;
    let button = showClosed ? this.closedButton : this.openButton;
    button.move(0, py);
    let buttonbnd = button.scaledBounds;
    this.name.move(buttonbnd.width + padding, py);

    if (showClosed) {
      bboxFrame.setContent([this.closedButton, this.name]);
    } else {
      let nbnd = this.name.scaledBounds;
      py += nbnd.height + padding;
      // set the proper width and height of the bbox:
      this.preLayoutInstances();
      this.bbox.content.refreshMe();
      this.instFrame.refreshMe();
      this.instFrame.move(0, py);
      bboxFrame.setContent([this.openButton, this.name, this.instFrame]);
      bboxFrame.hCenterElement(this.instFrame);
    }
    this.bbox.refreshMe();
    let bbnd = this.bbox.scaledBounds;
    // position the ports:
    this.provides.setWidth(this.bbox.bounds.width);
    this.provides.center(bbnd.x+bbnd.width/2, bbnd.y);
    this.requires.setWidth(this.bbox.bounds.width);
    this.requires.center(bbnd.x+bbnd.width/2, bbnd.y+bbnd.height);

    if (showClosed) {
      this.frame.setContent([this.bbox, this.provides, this.requires]);
    } else {
      this.layoutInstances();
      this.layoutBindings();
      this.frame.setContent([this.bbox, this.provides, this.requires]
                            .concat(this.bindings));
    }
    this.viz.refreshMe();
    this.scale(1, 1);
    let bounds = this.scaledBounds;
    if (this.changeCounter == 0) {
      this.saveBounds = this.scaledBounds;
    } else {
      this.changeCounter--;
      let amt = this.changeCounter/this.changeSteps;
      let width = bounds.width + (this.saveBounds.width-bounds.width)*amt;
      let height = bounds.height + (this.saveBounds.height-bounds.height)*amt;
      let scaleWidth = width / bounds.width;
      let scaleHeight = height / bounds.height;
      this.scale(scaleWidth,scaleHeight);
    }
  }

  draw(p) {
    if (this.isOpen) {
      // HACK: first make instances invisible,
      this.instFrame.visible = false;
      this.viz.draw(p);
      // then redraw the instances (on top of the bindings)
      this.instFrame.visible = true;
      p.push();
      // following viz nesting transforms
      this.frame.transform(p);
      this.bbox.transform(p);
      this.bbox.content.transform(p);
      this.instFrame.draw(p);
      p.pop();
      // and finallly redraw bindings with alpha on
      p.push();
      // following viz nesting transforms
      this.transform(p);
      this.bindings.forEach(b => {
        b.setAlpha('#20');
        b.draw(p);
        b.setAlpha('FF');
      });
      p.pop();
    } else {
      this.viz.draw(p);
    }
  }

  makeLayers(instances) {
    let nodes = instances.map(inst => { return {instance: inst, rank: -1, children: []}; });
    nodes.forEach(node => {
      node.children = this.bindings
        .filter(b => (b.fromInstance &&
                      b.fromInstance.data.name == node.instance.data.name &&
                      b.toInstance))
        .map(b => {
          return { node: getnode(b.toInstance.data.name), binding: b };
        });
    });

    function getnode(name) {
      return nodes.find(n => n.instance.data.name == name);
    }

    function order(node, rank) {
      if (node.rank >= rank) return;
      node.rank = rank;
      node.children.forEach(c => { if (c.node) order(c.node, rank+1); });
    }

    nodes.forEach(node => order(node, 0));

    function getInstances(rank) {
      return nodes.filter(n => n.rank == rank).map(n => n.instance);
    }

    let layers = [];
    for (let rank = 0; rank < nodes.length; rank++) {
      let inst = getInstances(rank);
      if (inst.length > 0) {
        let layer = new Layer(inst);
        layers.push(layer);
      }
      else break;
    }
    return layers;
  }

  preLayoutInstances() {
    function maxheight(layer) {
      if (!layer.instances) return 0;
      let result = 0;
      layer.instances.forEach(inst => {
        let bnd = inst.scaledBounds;
        result = Math.max(result, bnd.height);
      });
      return result;
    }

    // re-set instance parents (might be disturbed due to enterInstance)
    this.layers.forEach(layer => {
      layer.instances.forEach(inst => {
        inst.setParent(layer);
      });
    });

    // initial Layers layout to get the proper bbox width and height
    let vsep = 20;
    let py = 0;
    this.layers.forEach(layer => {
      layer.refreshMe();
      layer.move(0, py);
      py += maxheight(layer) + vsep + this.bindingHeight(layer)*this.bindingSep;
    });
    // adapt location of last 'empty' layer:
    let last = this.instFrame.content[this.instFrame.content.length-1];
    last.move(0, py-this.padding);
    this.instFrame.refreshMe();
  }

  layoutInstances() {
    // use linear programming:
    // minimise total binding lengths by horizontal move of instances

    // STEP 1: unconstrained model, which determines the order of instances:
    // only done on initial layout, which prevents reshuffeling when instances close
    if (this.initialLayout) {
      let LPUmodel = this.generateLPmodel(false); // do not preserve instance order
      let LPUresult = solver.Solve(LPUmodel);
      // reshuffle instances according to their found position:
      this.layers.forEach(layer => {
        layer.instances.sort((i1, i2) => {
          let nm1 = i1.name+':x';
          let i1x = LPUresult[nm1] || 0;
          let nm2 = i2.name+':x';
          let i2x = LPUresult[nm2] || 0;
          let m1x = i1x + i1.scaledBounds.width/2;
          let m2x = i2x + i2.scaledBounds.width/2;
          if (m1x < m2x) return -1;
          if (m1x > m2x) return 1;
          return 0;
        });
      });
      // replace according to new ordering:
      this.preLayoutInstances();
    }

    // STEP 2: constrained model, which minimises bindings:
    let LPmodel = this.generateLPmodel(true); // preserve instance order
    let LPresult = solver.Solve(LPmodel);
    this.layers.forEach(layer => {
      layer.instances.forEach(inst => {
        let nm = inst.name+':x';
        let ix = LPresult[nm] || 0;
        inst.move(ix, inst.bounds.y);
      });
      layer.viz.refreshMe();
    });
    this.instFrame.refreshMe();

    // STEP 3: sort bindings to minimise crossings in the 'between layers' area
    this.bindings.sort((b1, b2) => {
      let fi1 = b1.fromInstance;
      let fi2 = b2.fromInstance;
      // from ports in different layers?
      if (!fi1 || !fi2) return 1;
      let layer1 = fi1.parent;
      let layer2 = fi2.parent;
      // helper function:
      let absx = port => port.relativeBounds(this.viz).x;
      if (layer1.scaledBounds.y < layer2.scaledBounds.y) return -1;
      else if (layer1.scaledBounds.y > layer2.scaledBounds.y) return 1;
      else if (absx(b1.fromPort) < absx(b2.fromPort)) {
        if (absx(b1.toPort) < absx(b1.fromPort)) return -1;
        else return 1;
      } else {
        if (absx(b2.toPort) < absx(b2.fromPort)) return 1;
        else return -1;
      }
      return 0;
    });
    this.layoutBindings();
    this.initialLayout = false;
  }

  bindingHeight(layer) {
    if (!layer.instances) return 0;

    let h = 0;
    let layerBindings = this.bindings.filter(bind => {
      return bind.fromInstance && layer.instances.find(c => c == bind.fromInstance);
    });
    let hBinds = layerBindings.map(bind => {
      return {bind: bind, height: 0};
    });
    let maxHeight = 0;
    for (let i1 = 0; i1 < hBinds.length; i1++) {
      let h1 = hBinds[i1].height;
      for (let i2 = 0; i2 < i1; i2++) {
        if (this.overlapping(hBinds[i1].bind, hBinds[i2].bind)) {
          h1 = Math.max(h1, hBinds[i2].height + 1);
        }
      }
      hBinds[i1].height = h1;
      maxHeight = Math.max(maxHeight, h1);
    }
    return maxHeight;
  }

  overlapping(binding1, binding2) {
    let fi1 = binding1.fromInstance;
    let fi2 = binding2.fromInstance;
    // from ports in different layers?
    if (fi1 && !fi2) return false;
    if (fi2 && !fi1) return false;
    if (fi1 && fi2 && this.layerIndex(fi1) != this.layerIndex(fi2)) return false;
    // same layer:
    let f1x = binding1.fromPort.relativeBounds(this.viz).x;
    let t1x = binding1.toPort.relativeBounds(this.viz).x;
    let f2x = binding2.fromPort.relativeBounds(this.viz).x;
    let t2x = binding2.toPort.relativeBounds(this.viz).x;
    return Math.max(f1x, t1x) >= Math.min(f2x, t2x) && Math.max(f2x, t2x) >= Math.min(f1x, t1x);
  }

  layoutBindings() {
    // avoid binding overlaps
    // first reset:
    this.bindings.forEach(bind => {
      bind.line.yMiddle = 10;
      if (bind.fromInstance) {
        let fibnd = bind.fromInstance.scaledBounds;
        let fipbnd = bind.fromInstance.parent.scaledBounds; // current layer
        bind.line.yMiddle += fipbnd.height - fibnd.height;
      }
    });
    // now check for overlap:
    for (let i1 = 0; i1 < this.bindings.length; i1++) {
      let mid1 = this.bindings[i1].line.yMiddle;
      for (let i2 = 0; i2 < i1; i2++) {
        if (this.overlapping(this.bindings[i1], this.bindings[i2])) {
          // move mid2 value from relative to i2 to relative to i1
          let mid2 = this.bindings[i2].line.yMiddle;
          if (this.bindings[i2].fromInstance) {
            // overlapping, so in same layer
            let f1bnd = this.bindings[i1].fromInstance.scaledBounds;
            let f2bnd = this.bindings[i2].fromInstance.scaledBounds;
            mid2 += f2bnd.height - f1bnd.height;
          }
          mid1 = Math.max(mid1, mid2 + this.bindingSep);
        }
      }
      this.bindings[i1].line.yMiddle = mid1;
    }
  }

  // navigation:
  layerIndex(instance) {
    return this.layers.findIndex(layer => {
      let inst = layer.instances.find(inst => inst == instance);
      return inst;
    });
  }

  nextInstance(instance) {
    let layerIndex = this.layerIndex(instance);
    let layer = this.layers[layerIndex];
    let i = layer.instances.findIndex(inst => inst == instance);
    if (i < layer.instances.length-1) return layer.instances[i+1];
    else if (layerIndex < this.layers.length-1) {
      let layer1 = this.layers[layerIndex+1];
      return layer1.instances[0];
    } else return null;
  }
  previousInstance(instance) {
    let layerIndex = this.layerIndex(instance);
    let layer = this.layers[layerIndex];
    let i = layer.instances.findIndex(inst => inst == instance);
    if (i > 0) return layer.instances[i-1];
    else if (layerIndex > 0) {
      let layer1 = this.layers[layerIndex-1];
      return layer1.instances[layer1.instances.length-1];
    }
    else return null;
  }
  nextLayer(instance){
    let layerIndex = this.layerIndex(instance);
    if (layerIndex < this.layers.length-1) return this.layers[layerIndex+1];
    else return null;
  }
  previousLayer(instance) {
    let layerIndex = this.layerIndex(instance);
    if (layerIndex > 0) return this.layers[layerIndex-1];
    else return null;
  }

  getBinding(port) {
    return this.bindings.find(bind => bind.fromPort == port || bind.toPort == port);
  }

  generateLPmodel(preserveOrder) {
    // generate a linear programming model for use by javascript-lp-solver package
    let model = { variables: {}, constraints: {}};
    // collect variables:
    // for rationale see below (set constraints)
    this.instances.forEach(inst => {
      model.variables[inst.name+':x'] = {};
    });
    this.bindings.forEach((bind, bi) => {
      let fromInst = bind.fromInstance;
      let toInst = bind.toInstance;
      if (fromInst || toInst) {
        let bnr = 'b'+bi;
        model.variables[bnr+':pos'] = {};
        model.variables[bnr+':neg'] = {};
      }
    });

    // set constraints and variable field values.
    // note: all variables have an implied non-negativity constraint
    //       (an 'unrestricted' model clause is needed otherwise)

    // instances are constrained by the system bounding box:
    this.instances.forEach(inst => {
      let v = model.variables[inst.name+':x'];
      // (implicit) -> I.x >= 0
      // I:x -> I.x <= this.instFrame.width - I.width
      let W = this.instFrame.scaledBounds.width;
      let wi = inst.scaledBounds.width;
      v[inst.name+':max'] = 1;
      model.constraints[inst.name+':max'] = { max: W - wi };
    });
    if (preserveOrder) {
      this.layers.forEach(layer => {
        for (let i = 1; i < layer.instances.length; i++) {
          // R:I[i]:I[i-1] -> I[i].x >= I[i-1].x + I[i-1].width + hsep
          let nm0 = layer.instances[i-1].name;
          let nm1 = layer.instances[i].name;
          let v0x = model.variables[nm0+':x'];
          let v1x = model.variables[nm1+':x'];
          v1x['R:'+nm1+':'+nm0] = 1;
          v0x['R:'+nm1+':'+nm0] = -1;
          let w0 = layer.instances[i-1].scaledBounds.width;
          model.constraints['R:'+nm1+':'+nm0] = { min: w0 + layer.hsep };
        };
      });
    }
    // binding length definition:
    this.bindings.forEach((bind, bi) => {
      let fromInst = bind.fromInstance;
      let toInst = bind.toInstance;
      if (fromInst || toInst) {
        let bnr = 'b'+bi;
        // absolute value handling method for b: introduce b+ and b-
        // (a): replace b by b+ - b-;
        // (b): replace |b| by b+ + b-;
        // (c): (implicit) -> b+ >= 0;
        // (d): (implicit) -> b- >= 0
        let vbpos = model.variables[bnr+':pos'];
        let vbneg = model.variables[bnr+':neg'];
        // b:def ->
        // if (fromInst && toInst) b = (toInst:x + toPort.x) - (fromInst:x + toPort.x)
        // else if (fromInst)      b = (0 + toPort.x) - (fromInst:x + toPort.x)
        // else if (toInst)        b = (toInst:x + toPort.x) - (0 + toPort.x)
        // vb[bnr+':def'] = 1; replaced by:
        vbpos[bnr+':def'] = 1;
        vbneg[bnr+':def'] = -1;
        if (fromInst) {
          let vf = fromInst ? model.variables[fromInst.name+':x'] : null;
          vf[bnr+':def'] = 1;
        }
        if (toInst) {
          let vt = toInst ? model.variables[toInst.name+':x'] : null;
          vt[bnr+':def'] = -1;
        }
        // take care: system padding causes shift for external ports!
        let df = fromInst ?
            bind.fromPort.relativeBounds(fromInst.viz).x :
            bind.fromPort.relativeBounds(this.viz).x - this.padding;
        let dt = toInst ?
            bind.toPort.relativeBounds(toInst.viz).x :
            bind.toPort.relativeBounds(this.viz).x - this.padding;
        model.constraints[bnr+':def'] = { equal: dt - df };

      }
    });

    //optimisation: sum(|b|) where |b| = b+ + b-
    this.bindings.forEach((bind, bi) => {
      let fromInst = bind.fromInstance;
      let toInst = bind.toInstance;
      if (fromInst || toInst) {
        let bnr = 'b'+bi;
        let vbpos = model.variables[bnr+':pos'];
        let vbneg = model.variables[bnr+':neg'];
        // heavy weight for  external provides bindings:
        let f = fromInst ? 1 : 2;
        vbpos['bOpt'] = f;
        vbneg['bOpt'] = f;
      }
    });
    model.optimize = 'bOpt';
    model.opType = 'min';
    return model;
  }
}

/*
 * SUT
 *   System Under Test
 *   Identified by name, so a lookup in the list of all models is required
 *   Mainly an instance of the corresponding Model without parent System
 */
class SUT extends Viz {
  constructor(data) {
    super(data); // {sut, models}
    let dmodel = data.models.find(m => m.name == data.sut);
    let location = dmodel && dmodel.location;
    this.instance = new Instance({name: 'sut', model: data.sut, location: location},
                                 data.models, null);
  }

  initViz() {
    this.instance.initVizLight(true);
    this.setViz(new Frame([this.instance]));
  }

  highlight(on) {
    this.viz.content[0].highlight(on);
  }

  get changing() {
    return this.instance.changing;

  }
}

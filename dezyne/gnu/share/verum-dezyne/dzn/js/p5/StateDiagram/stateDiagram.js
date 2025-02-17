/*
 * Copyright (C) 2020, 2021, 2022, 2023 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
 * Copyright (C) 2023 Rutger van Beusekom <rutger@dezyne.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

let SDColors = {
  state: { fill: '#FEFECE', stroke: '#A80036' },
  transition: { fill: '#FFFFFF', stroke: '#AAAAAA' },
  state2transition: { stroke: '#A80036' },
  transition2state: { stroke: '#106588' },
};

let GraphDefaults = {
  node: {
    stateMass: 4,
    stateCharge: 6,
    transitionMass: 2,
    transitionCharge: 3,
    waypointMass: .3,
    waypointCharge: 3,
  },
  edge: {
    length: 2,
    stiffness: 12,
  }
}

class SDNode extends Viz {
  constructor(data) {
    super(data); // {id}
    this.id = data.id;
    this.node = new Node(data.id);
  }

  setDiagram(diagram) {
    this.diagram = diagram;
    this.node.setGraph(diagram.graph);
  }

  setGraph(graph) {
    this.graph = graph;
    this.node.setGraph(graph);
  }

  drag(x, y) {
    this.node.pos.x = x + this.bounds.width/2;
    this.node.pos.y = y + this.bounds.height/2;
    this.refresh();
    this.diagram.graph.restart(); // reset time
  }

  refresh() {
    this.move(this.node.pos.x - this.bounds.width/2, this.node.pos.y - this.bounds.height/2);
  }

  subGraph(depth) { // -> [nodes, connections]
    let result = [this];
    if (depth > 0) {
      this.diagram.connections
        .filter(con => con.from == this)
        .filter(con => !result.find(rcon => rcon == con))
        .forEach(con => {
          result.push(con);
          let other = (con.from == this) ? con.to : con.from;
          let sub = other.subGraph(depth-1);
          // merge with result
          sub.forEach(s => {
            if (! result.find(r => r == s))
              result.push(s);
          });
        });
    }
    return result;
  }

  drawSubGraph(p, depth) {
    let sub = this.subGraph(depth);
    let grp = [];
    sub.filter(s => s instanceof Connection)
      .forEach(con => { grp = grp.concat(con.segments); });
    sub.filter(s => s instanceof SDNode)
      .forEach(node => { grp = grp.concat(node); });
    sub.filter(s => s instanceof Connection)
      .forEach(con => { grp = grp.concat(con.points); });

    let group = new Group(grp);
    group.origin = this.diagram.group.origin;
    group.draw(p);
  }
}

class State extends SDNode {
  constructor(data) {
    super(data); // {id, state}
    this.node.mass = GraphDefaults.node.stateMass;
    this.node.charge = GraphDefaults.node.stateCharge;
  }

  initViz() {
    let triples = this.data.state.map (state => {
      let instance = state.instance;
      let variables_string = state.state.map(o => o.name).join('\n');
      let values_string = state.state.map(o => o.value).join('\n');
      return [instance, variables_string, values_string];
    });
    // TODO: make filtering empty states an option
    triples = triples.filter(triple => triple[1] != '');

    let content = triples.map(tr => tr.map(elt => new Text(elt)));

    let state = new Table(content);
    let box = new RoundedBoundingBox(state);
    box.setPadding(5);
    box.color = SDColors.state.fill;
    box.strokeColor = SDColors.state.stroke;
    box.strokeWeight = 1;
    box.round = 10;
    this.setViz(box);
    this.refresh();
    this.node.width = this.bounds.width;
    this.node.height = this.bounds.height;
    this.node.charge = GraphDefaults.node.stateCharge * Math.max(this.node.width,this.node.height)/128;
  }

  dragselfs(x, y) {
    let px = this.bounds.x;
    let py = this.bounds.y;
    this.drag(x, y);
    this.selfset.forEach(s => {
      // s is a self Transition or Connection
      let elt = (s instanceof Transition) ? s : s.points[0];
      let nx = x + elt.bounds.x - px;
      let ny = y + elt.bounds.y - py;
      elt.drag(nx, ny);
    });
  }
}

class InitialState extends State {
  constructor(data) {
    super(data); // {id, state}
  }

  initViz() {
    let dot = new Circle();
    dot.radius = 15;
    dot.color = '#000000';
    this.setViz(dot);
    this.node.width = dot.radius*2;
    this.node.height = dot.radius*2;
    this.refresh();
  }
}

class ChoiceState extends State {
  constructor(data) {
    super(data); // {id, state}
  }

  initViz() {
    let diamond = new Diamond();
    diamond.bounds.width = 45;
    diamond.bounds.height = 60;
    diamond.color = SDColors.state.fill;
    diamond.strokeColor = SDColors.state.stroke;
    diamond.strokeWeight = 1;
    this.setViz(diamond);
    this.node.radius = diamond.bounds.height;
    this.refresh();
  }
}

class Transition extends SDNode {
  constructor(data) {
    super(data); // {id, trigger, action, from, to}
    this.from = data.from;
    this.to = data.to;
    this.node.mass = GraphDefaults.node.transitionMass;
    this.node.charge = GraphDefaults.node.transitionCharge;
  }

  initViz() {
    if (this.data.trigger == '') this.data.trigger = '*';
    let trigger = this.data.trigger ? new Text(this.data.trigger) : null;
    let action = new Text(this.data.action.join ('\n'));
    let transition = new Table(trigger == null ? [[action]] :
                               (action.text == '') ? [[trigger]] :
                               [[trigger], [action]]);
    let box = new RoundedBoundingBox(transition);
    box.setPadding(5);
    box.color = SDColors.transition.fill;
    box.strokeColor = SDColors.transition.stroke;
    box.strokeWeight = 0;
    box.shadowed = false;
    box.round = 10;
    this.setViz(box);
    this.refresh();
    this.node.width = this.bounds.width;
    this.node.height = this.bounds.height;
    this.node.charge = GraphDefaults.node.transitionCharge * (this.node.width+this.node.height)/250;
  }

  hover(on) {
    this.viz.strokeColor = SDColors.transition.stroke;
    this.viz.strokeWeight = on ? 1 : 0;
  }
}

class Waypoint extends Viz {
  constructor(data) {
    super(data); // {id, radius, color}
    this.id = data.id;
    this.node = new Node(data.id);
    this.node.mass = GraphDefaults.node.waypointMass;
    this.node.charge = GraphDefaults.node.waypointCharge;
  }

  setDiagram(diagram) {
    this.diagram = diagram;
    this.node.setGraph(diagram.graph);
  }

  setGraph(graph) {
    this.graph = graph;
    this.node.setGraph(graph);
  }

  initViz() {
    let dot = new Circle();
    dot.radius = this.data.radius;
    dot.color = this.data.color;
    this.setViz(dot);
    this.refresh();
    this.node.width = this.data.radius*2;
    this.node.height = this.data.radius*2;
  }

  drag(x, y) {
    this.node.pos.x = x + this.bounds.width/2;
    this.node.pos.y = y + this.bounds.height/2;
    this.refresh();
    this.diagram.graph.restart(); // reset time
  }

  refresh() {
    this.move(this.node.pos.x - this.bounds.width/2, this.node.pos.y - this.bounds.height/2);
  }
}

class Segment extends Viz {
  constructor(data) {
    super(data); // {from, to, color, index, total}
    this.fromNode = data.from;
    this.toNode = data.to;
    this.edge = new Edge(data.from.id, data.to.id);
    this.edge.length = GraphDefaults.edge.length;
    this.edge.stiffness = GraphDefaults.edge.stiffness;
  }

  setDiagram(diagram) {
    this.diagram = diagram;
    this.edge.setGraph(diagram.graph);
  }

  setGraph(graph) {
    this.graph = graph;
    this.edge.setGraph(graph);
  }

  initViz() {
    let arrow = new DirectedRectLine(this.fromNode.bounds.x + this.fromNode.bounds.width/2,
                                     this.fromNode.bounds.y + this.fromNode.bounds.height/2,
                                     this.toNode.bounds.x + this.toNode.bounds.width/2,
                                     this.toNode.bounds.y + this.toNode.bounds.height/2);
    let t0 = arrow.thicknessStart;
    let t1 = arrow.thicknessEnd;
    arrow.thicknessStart = (t0*(this.data.total-this.data.index) + t1*this.data.index)/this.data.total;
    arrow.thicknessEnd = (t0*(this.data.total-this.data.index-1) + t1*(this.data.index+1))/this.data.total;
    arrow.color = this.data.color;
    this.setViz(arrow);
  }

  refresh() {
    this.viz.refreshPoints(this.fromNode.bounds.x + this.fromNode.bounds.width/2,
                           this.fromNode.bounds.y + this.fromNode.bounds.height/2,
                           this.toNode.bounds.x + this.toNode.bounds.width/2,
                           this.toNode.bounds.y + this.toNode.bounds.height/2);
  }

  draw(p) {
    this.refresh();
    this.viz.draw(p);
  }
}

class Connection extends Viz {
  constructor(data) {
    super(data); // {from, to, color, nrPoints}
    this.from = data.from;
    this.to = data.to;
    this.id = 'C' + this.from.id + this.to.id;
    this.segments = []; // [{Edge, SDNode, SDNode, Viz}]
    this.points = []; // [Waypoint]
    this.constructBetween(data.from, data.to, data.nrPoints);
  }

  constructBetween(fromNode, toNode, nrPoints) {
    let prevNode = fromNode;
    for (let i = 0; i < nrPoints; i++) {
      let wpt = new Waypoint({id: '' + fromNode.id + '.' + i + '.' + toNode.id,
                              radius: 3*(nrPoints-i)/(nrPoints+1),
                              color: this.data.color});
      this.points.push(wpt);
      this.segments.push(new Segment({from: prevNode, to: wpt, color: this.data.color, index: i, total: nrPoints+1}));
      prevNode = wpt;
    }
    this.segments.push(new Segment({from: prevNode, to: toNode, color: this.data.color, index: nrPoints, total: nrPoints+1}));
    this.segments.forEach(con => con.edge.length /= (nrPoints+1));
  }

  setDiagram(diagram) {
    this.diagram = diagram;
    this.segments.forEach(seg => seg.setDiagram(diagram));
    this.points.forEach(point => point.setDiagram(diagram));
  }

  setGraph(graph) {
    this.graph = graph;
    this.segments.forEach(seg => seg.setGraph(graph));
    this.points.forEach(point => point.setGraph(graph));
  }

  initViz() {
    let vizList = [];
    this.points.forEach(point => {
      point.initViz();
      vizList.push(point);
    });
    this.segments.forEach(seg => {
      seg.initViz();
      vizList.push(seg);
    });
    this.setViz(new Group(vizList));
  }

  refresh() {
    this.points.forEach(pt => pt.refresh());
    this.segments.forEach(seg => seg.refresh());
  }

  draw(p) {
    this.refresh();
    this.viz.draw(p);
  }
}

class StateDiagramBase extends Viz {
  constructor(data, dotransitions, doself) {
    super(data); // {states, transitions}
    this.states = data.states.map(state => (state.id == '*') ? new InitialState(state) : new State(state));

    this.transitions = [];
    this.choices = [];
    this.constructChoices(data.clusters);

    this.connections = [];
    this.constructClusterTree(data.clusters, dotransitions, doself);
    this.SDNodes = [].concat(this.states, this.choices, this.transitions);
    let nodes = this.SDNodes.map(n => n.node);
    this.connections.map(con => con.points).forEach(points => {
      nodes = nodes.concat(points.map(pt => pt.node));
    })

    let edges = [];
    this.connections.map(con => con.segments).forEach(segs => {
      edges = edges.concat(segs.map(seg => seg.edge));
    })

    this.graph = new Graph(nodes, edges);
    this.SDNodes.forEach(n => n.setDiagram(this));
    this.connections.forEach(con => con.setDiagram(this));
    this.energyPerNode = 0;
    if (doself) this.setSelf();
  }

  constructChoices(clusters) {
    clusters.forEach(cluster => {
      if (cluster.common != null) {
        // clustered:
        let choice = new ChoiceState({id: cluster.id, state: []});
        this.choices.push(choice);
        this.constructChoices(cluster.clusters);
      }
    });
  }

  constructClusterTree(clusters, dotransitions, doself) {
    clusters.forEach(cluster => {
      // cluster is either a transition array or an object {id, common, clusters)
      if (Array.isArray(cluster)) {
        // not clustered: cluster is a transition array
        cluster.forEach(trans => {
          let ti = trans.id;
          let fromState = this.states.find(s => s.id == trans.from) || this.choices.find(c => c.id == trans.from);
          let toState = this.states.find(s => s.id == trans.to);
          if (fromState instanceof InitialState) {
            let con = new Connection({from: fromState, to: toState, color: SDColors.transition2state.stroke, nrPoints: 0});
            this.connections.push(con);
          } else if (!dotransitions) {
            if (fromState != toState) {
              let con = this.connections.find(c =>((c.from == fromState && c.to == toState) ||
                                                   (c.to == fromState && c.from == toState)));
              if (!con) {
                con = new Connection({from: fromState, to: toState, color: '#000000', nrPoints: 0});
                con.segments[0].edge.length = 40;
                con.segments[0].edge.stiffness = GraphDefaults.edge.stiffness;
                this.connections.push(con);
              } else {
                con.segments[0].edge.stiffness += GraphDefaults.edge.stiffness;
              }
            }
          } else if (doself || trans.from != trans.to) {
            let transition = new Transition({id: 't.'+trans.id+'.'+trans.to,
                                             trigger: trans.trigger,
                                             action: trans.action,
                                             from: trans.from,
                                             to: trans.to,
                                             location: trans.location});
            this.transitions.push(transition);
            let nrp = (trans.from == trans.to) ? 1 : 0;
            this.connections.push(new Connection({from: fromState, to: transition, color: SDColors.state2transition.stroke, nrPoints: nrp}));
            this.connections.push(new Connection({from: transition, to: toState, color: SDColors.transition2state.stroke, nrPoints: nrp}));
          }
        });
      } else {
        // clustered: cluster is an object {id, common, clusters)
        let trans = cluster.common;
        let fromState = this.states.find(s => s.id == trans.from) || this.choices.find(c => c.id == trans.from);
        let toState = this.choices.find(c => c.id == trans.to); //bug 1: trans.to was cluster.id
        if (!dotransitions) {
          let con = this.connections.find(c =>((c.from == fromState && c.to == toState) ||
                                               (c.to == fromState && c.from == toState)));
          if (!con) {
            con = new Connection({from: fromState, to: toState, color: '#000000', nrPoints: 0});
            con.segments[0].edge.length = 40;
            con.segments[0].edge.stiffness = GraphDefaults.edge.stiffness;
            this.connections.push(con);
          } else {
            con.segments[0].edge.stiffness += GraphDefaults.edge.stiffness;
          }
        } else {
          let transition = new Transition({id: 't.'+trans.id+'.'+trans.to,
                                           trigger: trans.trigger,
                                           action: trans.action,
                                           from: trans.from,
                                           to: trans.to,
                                           location: trans.location});
          this.transitions.push(transition);
          let nrp = 0;
          this.connections.push(new Connection({from: fromState, to: transition, color: SDColors.state2transition.stroke, nrPoints: nrp}));
          this.connections.push(new Connection({from: transition, to: toState, color: SDColors.transition2state.stroke, nrPoints: nrp}));
        }
        this.constructClusterTree(cluster.clusters, dotransitions, doself);
      }
    });
  }

  setSelf() {
    this.states.forEach(s => { s.self = false; });
    this.choices.forEach(c => { c.self = false; });
    this.transitions.forEach(trans => { trans.self = (trans.from == trans.to); });
    this.connections.forEach(con => { con.self = (con.from.self || con.to.self); });

    this.states.forEach(s => { s.selfset = []; });
    this.choices.forEach(c => { c.selfset = []; });
    this.transitions.forEach(trans => {
      if (trans.self) {
        let fromState = this.states.find(s => s.id == trans.from);
        fromState.selfset.push(trans);
      }
    });
    this.connections.forEach(con => {
      if (con.self) {
        if (con.from instanceof State) con.from.selfset.push(con);
        else if (con.to instanceof State) con.to.selfset.push(con);
      }
    });
  }

  initViz() {
    this.SDNodes.forEach(n => n.initViz());
    // flatten Groups
    let segments = [];
    this.connections.map(con => {
      segments = segments.concat(con.segments);
    });
    let nodes = this.SDNodes;
    this.connections.map(con => {
      nodes = nodes.concat(con.points);
    });
    segments.forEach(seg => seg.initViz());
    nodes.forEach(node => node.initViz());
    this.group = new Group(segments.concat(nodes));
    this.setViz(this.group);
  }

  update() {
    this.energyPerNode = this.graph.update();
  }

  refresh() {
    this.update();
    this.viz.refresh();
  }

  static clusterTransitions(transitions) {
    if (transitions.length > 0 && !transitions[0].id) {
      // initial (top level) call: give each transition a unique id.
      transitions.forEach((trans, ti) => {
        trans.id = 't.'+ti;
        trans.clustered = false;
      });
    }
    let groups = [];
    transitions.forEach(trans => {
      let group = groups.find(gr => gr.find(tr => tr.from == trans.from && tr.trigger == trans.trigger));
      if (group) group.push(trans)
      else groups.push([trans]);
    });
    let clusters = groups.map(group => {
      if (group.length == 1) return group;
      else {
        // factor out common actions:
        let i = 0;
        let common = true;
        while (common && i < group[0].action.length) {
          let action = group[0].action[i];
          group.forEach(tr => { common = common && i < tr.action.length && tr.action[i] == action; });
          if (common) i++;
        }
        if (i == 0) {
          return group;
        } else {
          let choiceid = 'c'+ group[0].from + group[0].to;
          let prepart = {...group[0],
                         id: 'p.'+group[0].from,
                         from: group[0].from,
                         to: choiceid,
                         trigger: group[0].trigger,
                       action: group[0].action.slice(0, i) };
          let tails = group.map(tr => {
            return {...tr, from: choiceid, trigger: null, action: tr.action.slice(i)};
          });
          return {id: choiceid, common: prepart, clusters: this.clusterTransitions(tails)};
        }
      }
    });
    return clusters;
  }
}

class StateDiagramFull extends StateDiagramBase {
  constructor(data) {
    super(data, true, true); // {states, transitions}, dotransitions, doself
  }

  copyLayout(noselfDiagram) {
    let mult = 2.66;
    this.states.forEach(st => {
      let ost = noselfDiagram.states.find(ost => st.id == ost.id);
      st.node.pos.x = ost.node.pos.x * mult;
      st.node.pos.y = ost.node.pos.y * mult;
    });
    this.choices.forEach(st => {
      let ost = noselfDiagram.choices.find(ost => st.id == ost.id);
      st.node.pos.x = ost.node.pos.x * mult;
      st.node.pos.y = ost.node.pos.y * mult;
    });
    this.transitions.filter(tr => tr.from != tr.to)
      .forEach(tr => {
        let otr = noselfDiagram.transitions.find(otr => tr.id == otr.id);
        tr.node.pos.x = otr.node.pos.x * mult;
        tr.node.pos.y = otr.node.pos.y * mult;
      });
    this.connections.filter(con => con.points.length == 0)
      .forEach(con => {
        let ocon = noselfDiagram.connections.find(ocon => con.id == ocon.id);
        if (ocon) {
          let edge = con.segments[0].edge;
          let oedge = ocon.segments[0].edge;
          edge.length = oedge.length;
          edge.stiffness = oedge.stiffness;
        }
      });

    // add self:
    let selfsets = this.states.map(s => []);
    this.transitions.filter(tr => tr.from == tr.to)
      .forEach(tr => {
        let si = this.states.findIndex(s => s.id == tr.from) || this.choices.findIndex(s => s.id == tr.from);
        selfsets[si].push(tr);
      });

    selfsets.forEach(ss => {
      let a = Math.PI*2/ss.length;
      ss.forEach((tr,ti) => {
        let fromState = this.states.find(s => s.id == tr.from) || this.choices.find(s => s.id == tr.from);
        tr.node.pos.x = fromState.node.pos.x + Math.cos(a*ti)*10;
        tr.node.pos.y = fromState.node.pos.y + Math.sin(a*ti)*10;
      });
    });
    this.connections.filter(con => con.points.length > 0)
      .forEach(con => {
        con.points[0].node.pos.x = (con.from.node.pos.x + con.to.node.pos.x)/2;
        con.points[0].node.pos.y = (con.from.node.pos.y + con.to.node.pos.y)/2;
        con.segments.forEach(seg => {
          seg.edge.length = ( (seg.fromNode.node.width + seg.fromNode.node.height)/4 +
                              (seg.toNode.node.width + seg.toNode.node.height)/4
                            )/2;
          seg.edge.stiffness = GraphDefaults.edge.stiffness;
        });
      });
  }

  drawSelf(show) {
    this.SDNodes.forEach(n => {
      if (n.self) n.viz.visible = show;
    });
    this.connections.forEach(con => {
      if (con.self) {
        con.points.forEach(p => { p.viz.visible = show; });
        con.segments.forEach(s => { s.viz.visible = show; });
      }
    });
  }

}

class StateDiagramNoSelf extends StateDiagramBase {
  constructor(data) {
    super(data, true, false); // {states, transitions}, dotransitions, doself
  }

  copyLayout(simpleDiagram) {
    this.states.forEach(st => {
      let ost = simpleDiagram.states.find(ost => st.id == ost.id);
      st.node.pos.x = ost.node.pos.x * 2;
      st.node.pos.y = ost.node.pos.y * 2;
    });
    this.choices.forEach(st => {
      let ost = simpleDiagram.choices.find(ost => st.id == ost.id);
      st.node.pos.x = ost.node.pos.x * 2;
      st.node.pos.y = ost.node.pos.y * 2;
    });

    // add transitions:
    this.transitions.forEach(tr => {
      let fromState = this.states.find(s => s.id == tr.from) || this.choices.find(s => s.id == tr.from);
      let toState = this.states.find(s => s.id == tr.to) || this.choices.find(s => s.id == tr.to);
      if (fromState) {
        tr.node.pos.x = (fromState.node.pos.x + toState.node.pos.x)/2;
        tr.node.pos.y = (fromState.node.pos.y + toState.node.pos.y)/2;
      }
    });
  }
}

class StateDiagramSimple extends StateDiagramBase {
  constructor(data) {
    super(data, false, false); // {states, transitions}, dotransitions, doself
  }
}

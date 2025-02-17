/*
 * Copyright (C) 2020, 2021, 2022 Rob Wieringa <rma.wieringa@gmail.com>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */

// minimalistic vector support:
function vector(x, y) {
  return {x: x, y: y};
}

function vSize2(v) {
  return v.x*v.x + v.y*v.y;
}

function vSize(v) {
  return Math.sqrt(vSize2(v));
}

function vdiff(v1, v2) {
  return vector(v1.x - v2.x, v1.y - v2.y);
}

class Node {
  constructor(id) {
    this.id = id; // string
    this.pos = vector(0, 0); // position
    this.vel = vector(0, 0); // velocity
    this.acc = vector(0, 0); // acceleration
    this.force = vector(0, 0);
    this.mass = 1;
    this.charge = 1;
    this.maxAcc = 5;
    this.width = 1;
    this.height = 1;
    this.graph; // Graph

    // Coulomb's law
    this.ke = 10000; // Coulomb's constant  ke ≈ 8.988×10^9 N⋅m^2⋅C^−2
  }

  setGraph(graph) {
    this.graph = graph;
  }

  distance(node) {
    return this.distances[node.index];
  }

  updatePhysics(dt) {
    // accelleration:
    this.acc.x = this.force.x / this.mass;
    this.acc.y = this.force.y / this.mass;
    let as = vSize(this.acc);
    if (as > this.maxAcc) {
      this.acc.x *= this.maxAcc/as;
      this.acc.y *= this.maxAcc/as;
    }
    // velocity:
    this.vel.x = (this.vel.x + this.acc.x * dt) * .9;
    this.vel.y = (this.vel.y + this.acc.y * dt) * .9;
    let vs = vSize(this.vel);
    let vs2 = vSize2(this.vel);
    // position:
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    // Newtonian kinetic energy: Ek = 1/2 m v^2
    this.kynetic = 0.5 * this.mass * vs2;
  }

  directionTo(pos) {
    let to = vector(pos.x - this.pos.x, pos.y - this.pos.y);
    let sz = vSize(to);
    if (sz == 0) {
      to.x = Math.random();
      to.y = Math.random();
    } else {
      to.x /= sz;
      to.y /= sz;
    }
    return to;
  }

  centerDist2(node) {
    let d2 = vSize2(vdiff(node.pos, this.pos));
    return d2;
  }

  surfaceDist2(node) {
    let dx2 = Math.max((node.pos.x - this.pos.x)*(node.pos.x - this.pos.x) -
                       (node.width/2 + this.width/2)*(node.width/2 + this.width/2),
                       0);
    let dy2 = Math.max((node.pos.y - this.pos.y)*(node.pos.y - this.pos.y) -
                       (node.height/2 + this.height/2)*(node.height/2 + this.height/2),
                       0);
    return dx2 + dy2; // might be <= 0 upon overlap
  }

  centerDist(node) {
    let d = vSize(vdiff(node.pos, this.pos));
    return d;
  }

  surfaceDist(node) {
    let d2 = surfaceDist2(node);
    if (d2 <= 0) return (this.width+this.height)*.001;
    else return Math.sqrt(d2);
  }

  // Coulomb's law
  repel(node) { // Node --> force
    // physical distance:
    let d2 = this.surfaceDist2(node);
    if (d2 == 0) d2 = (this.width + this.height)/400;
    let f1 = this.ke * this.charge * node.charge / d2;
    // graph distance: force factor
    let gd = this.distance(node);
    // log(x) = 2 * ( (x-1)/(x+1) + 1/3 * (x-1)^3/(x+1)^3 + ... )
    let f2 = 2 * gd/(gd+2) * .6;

    //if (f1 < 1) console.log('REPEL d2 = ' + d2 + '; f1 = ' + f1 + '; f2 = ' + f2 );

    let to = this.directionTo(node.pos);


    if (d2 > 1000000) return vector(0,0);

    return vector(to.x * -(f1*f2),  to.y * -(f1*f2));
  }

  // Hooke's law
  attract(edge) {
    if (edge.from == edge.to) return vector(0,0);
    let node = (edge.from == this.id) ? edge.toNode :
        (edge.to == this.id) ? edge.fromNode : null;
    if (node == null) throw('Node with id ' + this.id + ' not found');
    let d = this.centerDist(node);
    // lineair: let f = edge.stiffness * (d - edge.length)/2;
    // logarithmic:
    // let f = edge.stiffness * Math.log(d/edge.length);
    // log(x) = 2 * ( (x-1)/(x+1) + 1/3 * (x-1)^3/(x+1)^3 + ... )
    let f = edge.stiffness * 2 * (d/edge.length - 1) / (d/edge.length + 1);
    let to = this.directionTo(node.pos);
    return vector(to.x * f,  to.y * f);
  }
}

class Edge {
  constructor(from, to) {
    this.from = from; // Node id
    this.to = to; // Node id
    this.stiffness = 12;
    this.length = 3;
    this.graph; // Graph
  }

  setGraph(graph) {
    this.graph = graph;
  }

}

class Graph {
  constructor(nodes, edges) {
    this.nodes = nodes; // [Node]
    this.edges = edges; // [Edge]
    this.dt = 1;
    this.energy = 1;

    // performance: add local admin:
    this.nodes.forEach((node, i) => {
      node.index = i;
      node.edges = [];
    });
    this.edges.forEach(edge => {
      edge.fromNode = this.lookupNode(edge.from);
      edge.toNode = this.lookupNode(edge.to);
      edge.fromNode.edges.push(edge);
      edge.toNode.edges.push(edge);
    });


    // console.log('setting distances')
    this.setDistances();
    // console.log('done setting distances')

    // initial layout:
    let startNode = this.nodes[0];
    let maxDist = 0;
    this.nodes.forEach(node => {
      this.nodes.forEach(node2 => {
        let d = node.distance(node2);
        if (d > maxDist) {
          startNode = node;
          maxDist = d;
        }
      });
    });
    this.maxDist = maxDist;
    let R = 10*Math.sqrt(this.nodes.length);
    this.nodes.forEach(node => {
      let a = 2 * Math.PI * startNode.distance(node) / (maxDist+1);
      node.pos.x = R * (1 + Math.cos(a));
      node.pos.y = R * (1 + Math.sin(a));
    });

    this.tree = QuadTree.tree(nodes);
    //console.log(JSON.stringify(this.tree.toJSON(), null, ' '));
  }

  setDistances() {
    let distLimit = 5;
    let nrNodes = this.nodes.length;
    this.nodes.forEach(source => {
      source.distances = {};
      this.nodes.forEach(node => {
        node.candidate = false;
        source.distances[node.index] = nrNodes+1;
      });
      source.distances[source.index] = 0;
      let front = [source];
      source.candidate = true;
      let index = 0;
      while (index < front.length) {
        let frontNode = front[index];
        let frontDist = source.distances[frontNode.index];
        if (frontDist < distLimit) {
          frontNode.edges.forEach(edge => {
            let node = (edge.from == frontNode.id) ? edge.toNode : edge.fromNode;
            if (!node.candidate) {
              source.distances[node.index] = frontDist + 1;
              front.push(node);
              node.candidate = true;
            }
          });
        }
        index++;
      }
    });
  }

  lookupNode(id) {
    return this.nodes.find(n => (n.id == id));
  }

  update() {
    //console.log('----------------------- ' + this.nodes.length);
    this.nodes.forEach(node1 => {
      let force = vector(0,  0);
      let others = QuadTree.nodesInScope(node1.pos.x, node1.pos.y, 500, this.tree);
      //console.log(node1.id + ': OTHERS: ' + others.length);
      //let others = this.nodes;
      others.forEach(node2 => {
        if (node1 != node2) {
          let fr = node1.repel(node2);
          force.x += fr.x;
          force.y += fr.y;
        }
      });
      node1.edges.forEach(edge => {
          let fa = node1.attract(edge);
          force.x += fa.x;
          force.y += fa.y;
      });
      node1.force = force;
    });
    // wait until acc is updated for each node
    let kynetic = 0;
    this.nodes.forEach(node => {
      node.updatePhysics(this.dt);
      this.tree = QuadTree.relocateNode(this.tree, node);
      kynetic += node.kynetic;
    });

    // average per node:
    this.energy = kynetic / this.nodes.length;
    this.dt *= (this.energy < 1) ? this.energy : .998; // slow down
    return this.energy;
  }

  restart() {
    // console.log(JSON.stringify(this.tree.toJSON(), null, ' '));
    this.dt = 1;
  }

}

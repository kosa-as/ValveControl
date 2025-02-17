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

class QuadTree {

  //   :---:---:
  //   | 0 | 1 |
  //   :---:---:
  //   | 3 | 2 |
  //   :---:---:

  constructor(parent, px, py) {
    this.minSize = 1024;
    this.parent = parent;
    this.pos = {x:px, y:py};
    this.isLeaf = true;
    this.subTrees = null;
    this.nodes = [];
    this.size = this.parent ? this.parent.size / 2 : this.minSize;
  }

  divide() {
    this.subTrees = [new QuadTree(this, this.pos.x, this.pos.y),
                     new QuadTree(this, this.pos.x + this.size/2, this.pos.y),
                     new QuadTree(this, this.pos.x + this.size/2, this.pos.y + this.size/2),
                     new QuadTree(this, this.pos.x, this.pos.y + this.size/2)];
    this.isLeaf = false;
  }

  isInside(px, py) {
    return this.pos.x <= px && px < this.pos.x + this.size &&
           this.pos.y <= py && py < this.pos.y + this.size;
  }

  isEmpty() {
    if (this.isLeaf)
      return this.nodes.length == 0;
    else {
      let empty = true;
      this.subTrees.forEach(sub => { empty = empty && sub.isEmpty(); });
      return empty;
    }
  }

  containsNode(node) {
    if (this.isLeaf)
      return this.nodes.find(n => n.id == node.id);
    else  {
      return this.subTrees[0].containsNode(node) ||
        this.subTrees[1].containsNode(node) ||
        this.subTrees[2].containsNode(node) ||
        this.subTrees[3].containsNode(node);
    }
  }

  addNode(node) {
    // pre: tree.isInside(node.pos.x, node.pos.pos.y))
    if (this.isLeaf && this.size > this.minSize) {
      this.divide();
    }
    if (this.isLeaf) {
      this.nodes.push(node);
      node.tree = this;
    } else {
      if (this.subTrees[0].isInside(node.pos.x, node.pos.y))
        this.subTrees[0].addNode(node);
      else if (this.subTrees[1].isInside(node.pos.x, node.pos.y))
        this.subTrees[1].addNode(node);
      else if (this.subTrees[2].isInside(node.pos.x, node.pos.y))
        this.subTrees[2].addNode(node);
      else
        this.subTrees[3].addNode(node);
    }
  }

  remove(node) {
    // pre: isLeaf && contains(node)
    let index = this.nodes.findIndex(n => n.id == node.id);
    if (index > -1) {
      this.nodes.splice(index, 1);
    }
  }

  removeNode(node) {
    if (!this.containsNode(node))
      return;
    else if (this.isLeaf)
      this.remove(node);
    else {
      this.subTrees.forEach(sub => sub.removeNode(node));
      if (this.isEmpty()) {
        this.isLeaf = true;
        this.subTrees = null;
      }
    }
  }

  toJSON() {
    return { pos: this.pos,
             size: this.size,
             isLeaf: this.isLeaf,
             subTrees: this.subTrees ? this.subTrees.map(sub => sub.toJSON()) : [],
             nodes: this.nodes.map(node => { return {id: node.id, x: node.pos.x, y: node.pos.y}; }),
           };
  }

  static growTree(tree, direction) {
    // direction: index of tree in new parent

    let px = (direction == 0 || direction == 3) ? tree.pos.x : tree.pos.x - tree.size;
    let py = (direction == 0 || direction == 1) ? tree.pos.y : tree.pos.y - tree.size;

    let parent = new QuadTree(null, px, py);
    parent.size = tree.size * 2;
    parent.divide();
    parent.subTrees[direction] = tree;
    tree.parent = parent;
    return parent;
  }

  static fittingTree(currentTree, px, py) {
    if (currentTree.isInside(px, py))
      return currentTree;
    else {
      let index = (px < currentTree.pos.x)
          ? ((py < currentTree.pos.y) ? 2 : 1)
          : ((py < currentTree.pos.y) ? 3 : 0);
      let parent = QuadTree.growTree(currentTree, index);
      return QuadTree.fittingTree(parent, px, py);
    }
  }

  static addNodeToTree(tree, node) {
    let parent = QuadTree.fittingTree(tree, node.pos.x, node.pos.y);
    parent.addNode(node);
    return parent;
  }

  static relocateNode(tree, node) {
    let parent = QuadTree.fittingTree(tree, node.pos.x, node.pos.y);
    let tree1 = node.tree;
    if (!tree1.isInside(node.pos.x, node.pos.y)) {
      tree1.removeNode(node);
      let parent = tree1.parent;
      while (!parent.isInside(node.pos.x, node.pos.y))
        parent = parent.parent;
      parent.addNode(node);
    }

    return parent;

  }

  static leafsInScope(px, py, radius, tree) {
    // => list of leafs
    if (px + radius < tree.pos.x || px - radius > tree.pos.x + tree.size ||
        py + radius < tree.pos.y || py - radius > tree.pos.y + tree.size)
      return [];
    else {
      if (tree.isLeaf) return [tree];
      else return tree.subTrees.flatMap(sub => QuadTree.leafsInScope(px, py, radius, sub));
    }
  }

  static nodesInScope(px, py, radius, tree) {
    // => list of nodes
    if (px + radius < tree.pos.x || px - radius > tree.pos.x + tree.size ||
        py + radius < tree.pos.y || py - radius > tree.pos.y + tree.size)
      return [];
    else {
      if (tree.isLeaf) return tree.nodes;
      else {
        let scopes = tree.subTrees.map(sub => QuadTree.nodesInScope(px, py, radius, sub));
        return [].concat(scopes[0], scopes[1], scopes[2], scopes[3]);
      }
    }
  }

  static tree(nodes) {
    let tree = new QuadTree(null, 0, 0);
    nodes.forEach(node => {
      tree = QuadTree.addNodeToTree(tree, node);
    });
    return tree;
  }
}

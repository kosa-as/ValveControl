// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
// Copyright © 2020, 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

if (!Array.prototype.append_map) {
  Array.prototype.append_map = function(lambda) {
    return [].concat.apply([], this.map(lambda));
  }
}

Array.prototype.rfind = function(pred) {
  for (var i = this.length-1; i>=0; i--) {
    if (pred(this[i])) return this[i];
  }
}

Array.prototype.eq = function(other) {
  return this.length == other.length && this.every(function(o, i) { return o == other[i]; });
}

dzn = dzn || {}
dzn.view = dzn.view || {}

dzn.view.Trace_widget = function(locator, meta) {
  dzn.runtime.init(this, locator, meta);
  this._dzn.meta.ports = ['widget'];
  this.origin = 'trace';

  this.widget = new dzn.view.Iwidget({provides: {name: 'widget', component: this}, requires: {}});
  this.DIV = document.getElementById (this.origin);
  this.diagram = new SequenceDiagramP5 (this.origin);

  this.trace = null;
  this.data = null;

  this.diagram.out.event = function (event) {
    console.log('event %s', event);
    if (event == '<back>') {
      this.widget.out.back ();
    } else {
      this.widget.out.event (event);
    }
  }.bind(this);


  this.diagram.out.selected = function (location) {
    console.log ('Trace_widget.out.selected: location=%j', location);
    //var sel = {selection: [location], origin: 'state'};
    var sel = {selection: [location]};
    this.widget.out.selected (sel);
  }.bind (this);

  this.widget.in.notify = function(notification) {
    if (!this.DIV) return;
    this.widget.out.request({label:'trace',origin:'trace'});
  }.bind(this);

  this.widget.in.draw = function(data) {
    console.log ('Trace_widget.draw=%j', data && JSON.stringify (data).substring (0,80));
    if (data.trace) {
      data = data.trace;
      data = JSON.parse(data);
      this.diagram.in.draw(data);
    }
  }.bind(this);

  this.widget.in.redraw = function() {
    if (!this.DIV) return;
    this.diagram.in.redraw();
    this.diagram.in.set_cursor('');
  };

  this.widget.in.go_to = function(selection) {
    if (!this.DIV) return;
    if (selection.origin == 'trace') return;
    console.log('trace selection: %j', selection);
    // if (block) SeqDiag.in.go_to(block.links, block.blocknode);
    // else SeqDiag.in.go_to([], null);
    // this.diagram.in.set_cursor('');
  };

  this.widget.in.go_to_index = function(selection) {
    //this.diagram.in.gotoIndex(selection[0].index);
  };

  this.widget.in.go_to_instance = function(selection){
    if (!this.DIV) return;
    //console.log('Trace_widget.go_to_instance: selection=%j', selection);
    // this.diagram.in.go_to_instance(selection);
    // this.diagram.in.set_cursor('');
  };

  this.widget.in.clear = function(){
    if (!this.DIV) return;
    console.log('Trace_widget.in.clear');
    // SeqDiag.in.set_cursor('');
  };

  this.widget.in.select = function(pointer){
    if (!this.DIV) return;
    console.log('Trace_widget.in.select');
  };

  this.widget.in.stop = function() {
    if (!this.DIV) return;
    console.log('Trace_widget.in.stop');
    //SeqDiag.in.stop();
    //SeqDiag.in.set_cursor('');
  };

  this.widget.in.origin = function() {
    this.widget.out.origin_label({label:this.origin,origin:this.origin});
  }

  this._dzn.rt.bind(this);
};

if (node_p()) {
  // nodejs
  module.exports = dzn;
}

//code generator version: development

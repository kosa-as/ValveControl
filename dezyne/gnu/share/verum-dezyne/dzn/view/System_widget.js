// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
// Copyright © 2020,2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
// Copyright © 2021 Rutger van Beusekom <rutger.van.beusekom@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

dzn = dzn || {}
dzn.view = dzn.view || {}

dzn.view.System_widget = function (locator, meta) {
  dzn.runtime.init (this, locator, meta);
  this._dzn.meta.ports = ['widget'];
  this.origin = 'system';

  this.widget = new dzn.view.Iwidget({provides: {name: 'widget', component: this}, requires: {}});

  this.DIV = document.getElementById (this.origin);
  this.diagram = new SystemDiagramP5 (this.origin);

  this.sut = {};
  this.data = {root:{elements:[]}};

  this.diagram.out.selected = function(location) {
    this.widget.out.selected({selection:[location]});
  }.bind (this);

  this.widget.in.init = function() {
    if (!this.DIV) return;
    this.diagram.in.set_cursor('');
  };

  this.widget.in.notify = function(notification) {
    if (!this.DIV) return;
    if (notification.label == 'system' || notification.label == 'parse') {
      //this.diagram.in.set_cursor('wait'); //FIXME: set_cursor is not a function
      this.widget.out.request({label:'system',origin:'system'});
    }
  };

  this.widget.in.draw = function(data) {
    console.log ('System_widget.draw=%j', data && JSON.stringify (data).substring (0,80));
    if (data.system) {
      var ast = JSON.parse (data.system);
      var p5_data = Ast2P5.ast2data (ast)
      this.diagram.in.draw (p5_data);
    }
  };

  this.widget.in.redraw = function() {
    if (!this.DIV) return;
    this.diagram.in.redraw();
    this.diagram.in.set_cursor('');
  };

  this.widget.in.go_to = function(selection) {
    return;
    if (!this.DIV) return;
    console.log ('System_widget.go_to: selection=%j', selection);
    // if (!this.diagram.diagram) return;
    // var blackboxes = this.blackboxes(selection.selection[0]['instance+state']);
    // this.show_trace(selection.selection[0].event, blackboxes);
    // this.diagram.in.set_cursor('');
  }

  this.widget.in.go_to_instance = function(selection) {
    if (!this.DIV) return;
    console.log ('System_widget.go_to_instance: selection=%j', selection);
    // this.diagram.in.set_cursor('');
  };

  this.widget.in.clear = function() {
    if (!this.DIV) return;
    console.log('hello ViewWidget clear');
    //this.diagram.in.set_cursor('');
  };

  this.widget.in.select = function(pointer) {
    if (!this.DIV) return;
    console.log('System_widget.select');
    //this.diagram.in.set_cursor('');
  };

  this.widget.in.stop = function() {
    if (!this.DIV) return;
    console.log('System_widget stop');
    //this.diagram.in.stop();
    //this.diagram.in.set_cursor('');
  };

  this.widget.in.origin = function() {
    this.widget.out.origin_label({label:this.origin,origin:this.origin});
  }

  this.widget.in.go_to_index = function() {};

  this._dzn.rt.bind (this);
};

if (node_p ()) {
  // nodejs
  module.exports = dzn;
}

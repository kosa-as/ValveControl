// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

dzn = dzn || {}
dzn.view = dzn.view || {}

dzn.view.State_widget = function(locator, meta) {
  dzn.runtime.init(this, locator, meta);
  this._dzn.meta.ports = ['widget'];

  this.widget = new dzn.view.Iwidget({provides: {name: 'widget', component: this}, requires: {}});

  this.widget.in.notify = function(notification) {};

  this.widget.in.draw = function(data) {};

  this.widget.in.redraw = function() {};

  this.widget.in.go_to = function(selection) {};

  this.widget.in.go_to_index = function(selection) {};

  this.widget.in.go_to_instance = function(selection) {};

  this.widget.in.clear = function() {};

  this.widget.in.select = function(pointer) {};

  this.widget.in.stop = function() {};

  this.widget.in.origin = function() {};

  this._dzn.rt.bind(this);
};

if (node_p()) {
  // nodejs
  module.exports = dzn;
}

//code generator version: development

// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
// Copyright © 2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

dzn = dzn || {}
dzn.view = dzn.view || {}

dzn.view.State_widget = function (locator, meta) {
  dzn.runtime.init (this, locator, meta);
  this._dzn.meta.ports = ['widget'];
  this.origin = 'state';

  this.widget = new dzn.view.Iwidget({provides: {name: 'widget', component: this}, requires: {}});

  this.DIV = document.getElementById (this.origin);
  this.diagram = new StateDiagramP5 (this.origin);

  function instace_state2string(state) {
    return Object.keys(state).map(function(key) {
            return key + '=' + state[key];
    }).join(',\n-    ');
  };

  function state2string (state) {
    var instances = Object.keys(state);
    return instances
      .filter(function(i) {
        return state[i].state && Object.keys(state[i].state).length>0; })
      .map(function(i) {
        return i.split('.').filter(function(s) {return s != 'sut';}).join('.')
          + ':\n-    ' + instace_state2string(state[i].state);
      }).join('\n');
  };

  function state2array (state) {
    var instances = Object.keys(state);
    return instances
      .filter(function(i) {
        return state[i].state && Object.keys(state[i].state).length>0; })
      .map(function(i) {
        return { instance: i.split('.').filter(function(s) {return s != 'sut';}).join('.'),
                 kind: state[i].kind,
                 state: '-    ' + instace_state2string(state[i].state)
               };
      });
  };

  function event2string(event) {
    return event
      .filter(function(event) {
        return event.from.startsWith('<external>') || event.to.startsWith('<external>');
      })
      .map(function(event) {
        var p = (event.from.startsWith('<external>') ? event.from : event.to).split('.');
        p = (p.length == 2) ? p.slice(1) : p.slice(2);
        return p.join('.') + '.'+ event.name;
      })
      .join('\n');
  };

  this.diagram.out.selected = function (location) {
    console.log ('State_widget.out.selected: location=%j', location);
    //var sel = {selection: [location], origin: 'state'};
    var sel = {selection: [location]};
    this.widget.out.selected (sel);
  }.bind (this);

  this.widget.in.notify = function(notification) {
    console.log ('State_widget.in.notify notification = %j', notification);
    if (notification.label == 'state')
      ////this.diagram.in.set_cursor('wait');
      this.widget.out.request({label:'state',origin:'state'});
  };

  this.widget.in.draw = function(data) {
    console.log ('State_widget.in.draw: data = %j', data);
    if (data.state) {
      data = data.state;
      data = JSON.parse (data);
      console.log ('State_widget.in.draw: data = %j', data);
      this.diagram.in.draw (data);
    }
    else
      console.log ('data.state: %j', data.state);
  };

  this.widget.in.redraw = function() {
    //if (!this.DIV) return;
    console.log ('State_widget.in.redraw');
    this.diagram.in.redraw();
    this.diagram.in.set_cursor('');
  };

  this.widget.in.go_to = function() {
    //if (!this.DIV) return;
    console.log ('State_widget.in.go_to');
  }
  this.widget.in.go_to_instance = function() {
    //if (!this.DIV) return;
    console.log ('State_widget.in.go_to_instance');
  }
  this.widget.in.go_to_index = function() {
    //if (!this.DIV) return;
    console.log ('State_widget.in.go_to_index');
  }
  this.widget.in.stop = function() {
    //if (!this.DIV) return;
    console.log ('State_widget.in.stop');
  }

  this.widget.in.origin = function() {
    this.widget.out.origin_label({label:this.origin,origin:this.origin});
  }

  this._dzn.rt.bind (this);
};

if (node_p ()) {
  // nodejs
  module.exports = dzn;
}

//code generator version: development

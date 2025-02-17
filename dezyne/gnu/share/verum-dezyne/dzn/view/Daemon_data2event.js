// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

dzn = dzn || {}
dzn.view = dzn.view || {}

dzn.view.Daemon_data2event = function (locator, meta) {
  dzn.runtime.init (this, locator, meta);
  this._dzn.meta.ports = ['data2event'];

  this.data2event = new dzn.view.Idaemon_data2event({provides: {name: 'data2event', component: this}, requires: {}});

  this.data2event.in.data2event = function(data) {
    var label = libenvelope.label(data);

    if(this.data2event.out[label])
      this.data2event.out[label](libenvelope.data (data));
    else {
      console.error('Daemon_data2event: label mismatch: `%s\' in data: %j', label, data);
      this.data2event.out.error('label mismatch: "' + label + '" in data');
    }
  };

  this.data2event.in.wrap = function(label, data) {
    this.data2event.out.envelope (libenvelope.wrap (label, data));
  };

  this._dzn.rt.bind (this);
};

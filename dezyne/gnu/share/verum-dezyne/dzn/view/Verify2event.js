// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

function node_p () {return typeof module !== 'undefined';}

dzn.Verify2event = function (locator, meta) {
  dzn.runtime.init (this, locator, meta);
  this._dzn.meta.ports = ['verify'];

  this.verify = new dzn.Iverify2event({provides: {name: 'verify', component: this}, requires: {}});

  this.verify.in.has_trace = function(data){
    return data.verify.trace != undefined;
  };

  this._dzn.rt.bind (this);
};

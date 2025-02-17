// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2019 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
// Copyright © 2020 Paul Hoogendijk <paul.hoogendijk@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

function node_p () {return typeof module !== 'undefined';}
if (node_p ()) {var libtransport = require (__dirname + '/../libtransport');}

dzn.transport.Serialize = function (locator, meta) {
  dzn.runtime.init (this, locator, meta);
  this._dzn.meta.ports = ['serialize'];

  this.serialize = new dzn.transport.Iserialize({provides: {name: 'serialize', component: this}, requires: {}});

  this.serialize.in.pack = function(data) {
    //console.log ('   => %j', libtransport.serialize (data));
    this.serialize.out.message (libtransport.serialize(data));
  };

  this.serialize.in.unpack = function(msg) {
    //console.log ('Serialize unpack: %j', msg);
    //console.log ('   => %j', libtransport.unserialize (msg));
    this.serialize.out.data (libtransport.unserialize (msg));
  };

  this.serialize.in.ping = function(msg) {
    this.serialize.out.pong (msg);
  };

  this._dzn.rt.bind (this);
};

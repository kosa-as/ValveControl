// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2019 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

function node_p () {return typeof module !== 'undefined';}

var libtransport = {
  serialize: function (d) {
    return JSON.stringify(d);
  },
  unserialize: function (d) {
    return JSON.parse(d);
  },
}

if (node_p ()) {
  module.exports = libtransport;
}

// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2019 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

function node_p () {return typeof module !== 'undefined';}

var libenvelope = {
  wrap: function(label, data) {
    var v = {};
    v[label]=data;
    return v;
  },
  label: function (data) {
    return Object.keys(data)[0];
  },
  data: function (data) {
    return data[libenvelope.label(data)];
  },
}

if (node_p ()) {
  module.exports = libenvelope;
}

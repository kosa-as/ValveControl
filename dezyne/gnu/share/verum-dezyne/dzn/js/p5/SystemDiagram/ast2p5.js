/*
 * Copyright (C) 2020,2021 Rob Wieringa <rma.wieringa@gmail.com>
 * Copyright (C) 2022 Paul Hoogendijk <paul@dezyne.org>
 * Copyright (C) 2022 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
 *
 * This file is part of Dezyne-P5.
 * Dezyne-P5 offers Dezyne web views based on p5.js
 *
 * Dezyne-P5 is free software, it is distributed under the terms of
 * the GNU General Public Licence version 3 or later.
 * See <http://www.gnu.org/licenses/>.
 */



let Ast2P5 = {

  is_a: function(o, klass) {
    return o && o['<class>'] == klass;
  },

  name2string: function(name) { // is_a 'scope_name'
    // TODO: fix namespaces
    return name.ids[name.ids.length-1];
  },

  models: function(rns) { // root or namespace
    let result = [];
    rns.elements
      .filter(o => Ast2P5.is_a(o, 'namespace'))
      .forEach(o => result = result.concat(Ast2P5.models(o)));
    rns.elements
      .filter(o => Ast2P5.is_a(o, 'interface') ||
              Ast2P5.is_a(o, 'component') ||
              Ast2P5.is_a(o, 'system') ||
              Ast2P5.is_a(o,'foreign'))
      .forEach(o => result.push(o));
    return result;
  },

  sut: function(root) {
    let components = Ast2P5.models(root);

    function findByName(name) {
      // TODO: fix namespaces
      return components.find(c => Ast2P5.name2string(c.name) == Ast2P5.name2string(name));
    }

    function size(comp) {
      if (!comp) return 0;
      if (Ast2P5.is_a(comp, 'interface') ) return 0;
      if (Ast2P5.is_a(comp, 'component') || Ast2P5.is_a(comp, 'foreign')) return 1;
      let sz = 1;
      comp.instances.elements.forEach(i => {
        let sub = findByName(i.type_name);
        sz += size(sub);
      });
      return sz;
    }

    let sut = null;
    let sutSize = 0;
    components.forEach(o => {
      let sz = size(o);
      if (sz > sutSize) {
        sut = o;
        sutSize = sz;
      }
    });
    return Ast2P5.name2string(sut.name);
  },

  model2p5: function(o) {
    if (Ast2P5.is_a(o, 'interface')) {
      return Ast2P5.interface2p5(o);
    } else if (Ast2P5.is_a(o, 'component')) {
      return Ast2P5.component2p5(o);
    } else if (Ast2P5.is_a(o, 'system')) {
      return Ast2P5.system2p5(o);
    } else if (Ast2P5.is_a(o, 'foreign')) {
      return Ast2P5.foreign2p5(o);
    }
  },

  ports2p5: function(ports, direction) {
    return ports.elements.filter(p => p.direction == direction && !p['injected?']).map(Ast2P5.port2p5);
  },

  interface2p5: function(intf) {
    return { kind: 'interface',
             name: Ast2P5.name2string(intf.name),
             location: intf.location
           };
  },

  component2p5: function(comp) {
    return { kind: 'component',
             name: Ast2P5.name2string(comp.name),
             location: comp.location,
             provides: Ast2P5.ports2p5(comp.ports, 'provides'),
             requires: Ast2P5.ports2p5(comp.ports, 'requires'),
           };
  },

  bindInjected: function(binding) {
    return binding.left.port_name == '*' || binding.right.port_name == '*';
  },

  system2p5: function(sys) {
    return { kind: 'system',
             name: Ast2P5.name2string(sys.name),
             location: sys.location,
             provides: Ast2P5.ports2p5(sys.ports, 'provides'),
             requires: Ast2P5.ports2p5(sys.ports, 'requires'),
             instances: sys.instances.elements.map(Ast2P5.instance2p5),
             bindings: sys.bindings.elements.filter(bind => !Ast2P5.bindInjected(bind)).map(Ast2P5.binding2p5),
           };
  },

  foreign2p5: function(comp) {
    return { kind: 'foreign',
             name: Ast2P5.name2string(comp.name),
             location: comp.location,
             provides: Ast2P5.ports2p5(comp.ports, 'provides'),
             requires: Ast2P5.ports2p5(comp.ports, 'requires'),
           };
  },

  blocking: function(port) {
    return port['blocking?'] == 'blocking';
  },

  port2p5: function(port) {
    return {name: port.name, location: port.location,
            interface: Ast2P5.name2string(port.type_name), blocking: Ast2P5.blocking(port)};
  },

  instance2p5: function(inst) {
    return {name: inst.name,
            location: inst.location,
            model: Ast2P5.name2string(inst.type_name)};
  },

  binding2p5: function(binding) {
    let left = Ast2P5.endpoint2p5(binding.left);
    let right = Ast2P5.endpoint2p5(binding.right);
    // mixup of from and to will be corrected in systemDiagram.js
    return {from: left, to: right, location: binding.location};
  },

  endpoint2p5: function(ep) {
    return {inst: ep.instance_name, port: ep.port_name, location: ep.location};
  },

  ast2data: function(root) {
    return {sut: Ast2P5.sut(root),
            models: Ast2P5.models(root).map(o => Ast2P5.model2p5(o)),
            'working-directory': root['working-directory']
           };
  },
};

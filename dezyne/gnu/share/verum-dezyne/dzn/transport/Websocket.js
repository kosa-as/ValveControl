// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2019 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
// Copyright © 2020 Paul Hoogendijk <paul.hoogendijk@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

// Copyright © 2017 Jan Nieuwenhuizen <janneke@gnu.org>

// This file is part of dzn.Websocket

// dzn.Websocket is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// dzn.Websocket is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with dzn.Websocket.  If not, see
// <http://www.gnu.org/licenses/>.

function node_p () {return typeof (module) !== 'undefined';}

dzn.transport.Websocket = function (locator, meta) {
  this._dzn = {};
  this._dzn.locator = locator;
  this._dzn.rt = locator.get (new dzn.runtime ());
  this._dzn.rt.components = (this._dzn.rt.components || []).concat ([this]);
  this._dzn.meta = meta;
  this._dzn.meta.ports = ['websocket'];
  this._dzn.meta.children = [];

  this.websocket = new dzn.transport.Iwebsocket ({provides: {name: 'websocket', component: this}, requires: {}});

  this.id=10;
  this.set_id = function (o) {
    if (!o.id) o.id = ++this.id;
    return o.id;
  }.bind (this);

  this.close = function () {};
  this.get = function (out_ws) {};
  this.send = function (msg) {};
  this.ack = function(error) {
    if(error) {
      console.error('Websocket error: %s', '' + error);
      this.websocket.out.error(this.websocket, {stderr:'' + error});
    }}.bind (this);

  this.connect = function (ws) {
    this.set_id (ws);
    ws.onerror = function (e) {this.websocket.out.error (ws, e);}.bind (this);
    ws.onclose = function (ws) {
      if (this.is_client_side()) {
        log('Websocket client-side: onclose');
        this.websocket.out.disconnect (ws, {kanarie:'disconnect'});
      } else {
        log('Websocket server-side: onclose');
        // console.log('Websocket connections: ', this.wss.clients);
        // console.log('this.clients().length = ', this.clients().length);
        if (this.clients().length == 1) { // only when last connection closes
          log('last client leaving')
          this.websocket.out.disconnect (ws, {kanarie:'disconnect'});
        }
      }
      delete ws;
    }.bind (this);
    ws.onmessage = function (event) {
      // console.log ('websocket onmessage data=%j', event.data);
      try {var msg = event.data;}
      catch (e) {process.nextTick(function (){this.websocket.out.error (ws, {kanarie: 'onmessage', error:e});}.bind (this));}
      this.websocket.out.message (ws, msg);
    }.bind (this);
    if (this.is_client_side()) {
      this.get = function (out_ws) {out_ws.value=ws;};
      this.close = function () {if (ws && ws.close) ws.close ();};
      this.free = function () {if (ws) ws.onclose = ws.onerror = ws.onmessage = ws.onopen = function () {};};
      this.send = function (msg) {ws.send (msg, this.ack);}.bind(this);
    }
  }.bind (this);

  this.clients = function () {
    // this.wss.clients also contains closed connections
    // closed connection has attribute _socket == null or has _socket.destroyed == true
    return this.wss.clients.filter(function (connection) {return connection._socket;});
  }.bind (this);

  this.is_listening = function () {return this.wss;}.bind(this);
  this.is_client_side = function () {return !this.wss;}.bind(this);

  // events
  this.websocket.in.listen = function (config) {
    try {
      if (!this.is_listening()) {
        config['clientTracking'] = true;
        this.wss = new (require ('ws').Server) (config);

        // Broadcast to all connections
        this.close = function () {this.clients().forEach(function (ws) {if (ws && ws.close) ws.close ();});}.bind(this);
        this.free = function () {this.clients().forEach(function (ws) {if (ws) ws.onclose = ws.onerror = ws.onmessage = ws.onopen = function () {};})}.bind(this);
        this.send = function (msg) {this.clients().forEach(function (ws) {ws.send (msg, this.ack);}.bind(this))}.bind(this);

        this.wss.on ('connection', function (ws) {
	  this.connect(ws);
          if (this.clients().length == 1) this.websocket.out.connected (ws); // only for first connection
        }.bind (this));
        this.websocket.out.listening ();
      }
    }
    catch (e) {this.websocket.out.error (null, {kanarie: 'listen', error:''+e});}
  }

  this.websocket.in.open = function (url) {
    console.log ('websocket.open url=%j', url);
      try {var ws = node_p () ? new require ('ws') (url) : new WebSocket (url); }
      catch (e) {if (node_p()) process.nextTick(function () {this.websocket.out.error (ws, {kanarie: 'open', error:e});}.bind (this));
		 else setTimeout(function () {this.websocket.out.error (ws, {kanarie: 'open', error:e});}.bind (this), 0);}
    this.connect (ws);
    ws.onopen = function () {this.websocket.out.connected (ws);}.bind (this);
  };

  this.websocket.in.connection = this.connect;
  this.websocket.in.get = function (ws) {this.get (ws);};
  this.websocket.in.close = function () {this.close ();};
  this.websocket.in.free = function () {this.free ();};
  this.websocket.in.send = function (msg) {
    //console.log ('websocket send msg=%j', msg);
    this.send (msg, this.ack);};

  this._dzn.rt.bind (this);
};

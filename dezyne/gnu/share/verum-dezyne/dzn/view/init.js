// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2020 Rob Wieringa <Rob.Wieringa@verum.com>
// Copyright © 2020,2021 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

function showHelp(){
  var win = window.open('root/help.html', '_blank');
  win.focus();
};

function init_View(div, model, port) {
  var runtime = new dzn.runtime (function() {console.error ('test: illegal'); throw new Error ('test: oops: illegal'); });
  var loc = new dzn.locator ().set (runtime);

  log = function (s) {
    if (s.includes('transport')) {} else console.log(s);
  };
  loc.set (log, 'trace');

  window.addEventListener("keypress", function(e) { if (e.key == 'h')  showHelp(); }, false);

  var view = new dzn.view.View(loc, {name: 'view'});

  document.title = model;
  view.daemon.daemon_proxy.url = 'ws://127.0.0.1:' + port;

  view.control.out.error = function (e) {
    console.log('-------------------- VIEW ERROR --------------------');
    console.log('error: %j', e);

    var elt = document.getElementById (div);
    while (elt && elt.firstChild){
      elt.removeChild (elt.firstChild);
    }

    console.log ('retrying...');
    setTimeout (function () {init_View (div, model, port);}, 1000);
  }

  try {
    view.control.in.setup();
  }
  catch (e) {
    console.log ('ERROR %j', e);
  }
}

function parse_params() {
  var param_string = window.location.href.replace (/.*\?/, '');
  var params = {};
  param_string.split ('&').forEach (function (p) {var kv = p.split ('=');params[kv[0]]=kv[1];});
  return params;
}

function init (div) {
  var params = parse_params();
  if (params.port) global_view_port = params.port;
  if (params.editor) global_http_port = params.editor;
  init_View (div, params.model || '', global_view_port);
}

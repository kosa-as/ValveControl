// Verum-Dezyne --- An IDE for Dezyne
//
// Copyright © 2019 Rob Wieringa <Rob.Wieringa@verum.com>
//
// This file is part of Verum-Dezyne.
//
// Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
// All rights reserved.

var debug = false;
function debug_alert (s) {
  console.log (s);
  debug && alert (s);
}
var daemon_url = window.location.protocol + '//' + window.location.host;
var views = {};

if (!Array.prototype.each) {
  Array.prototype.each = Array.prototype.forEach;
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

function clean_url () {
  var uri = window.location.toString ();
  if (uri.indexOf ('?') > 0) {
    var clean = uri.substring (0, uri.indexOf ('?'));
    window.history.replaceState ({}, document.title, clean);
  }
}

function parse_url () {
  var decode = function (s) {
    return decodeURIComponent (s.replace (/\+/g, ' '));
  }
  var r = /([^&=]+)=?([^&]*)/g;
  var q = window.location.search.substring (1);
  var parameters = {};
  var e;
  while (e = r.exec(q))
    parameters[decode (e[1])] = decode (e[2]);
  return parameters;
}

function http_get (url, callback) {
  var xmlHttp = new XMLHttpRequest ();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback (xmlHttp.responseText);
  }
  xmlHttp.open ("GET", url, true);
  xmlHttp.send (null);
}

function parse_post (parameters) {
  console.log ('login POST' + JSON.stringify ($_POST));
  return $.extend (parameters, $_POST);
}

function init_connector () {
  Con.init({
    host: window.location.hostname,
    port: window.location.port,
    client: { name: 'webclient', version: '0.0'}//version.version }
  });
}

function resize_iframe (o) {
  o.style.height = o.contentWindow.document.body.scrollHeight + 'px';
  o.style.width = o.contentWindow.document.body.scrollWidth + 'px';
}

function wrap (property, data) {
  var envelope = {};
  envelope[property] = data;
  return envelope;
}

function time_start(msg) {
  time_ = (new Date()).getTime();
  time_prev_ = time_;
  time_stamp(msg);
}

function format_msec(msec) {
  var sec = (msec/1000) >> 0 
  var min = (sec/60) >> 0 ;
  var sec = (sec)%60;
  var res = (min<10?" " + min:min) + ":" + (sec<10?"0"+sec:sec);
  return res;
}
function time_stamp(msg) {
  var delta = (new Date()).getTime() - time_;
  stamp = format_msec(delta);
  var delta = (new Date()).getTime() - time_prev_;
  stamp += " " + format_msec(delta)

  time_prev_ = (new Date()).getTime();
 
  if (msg) {
    console.log(stamp+":"+msg);
  }
  else {
    console.log(stamp);
  }
}
function base_name(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
   return base;
}

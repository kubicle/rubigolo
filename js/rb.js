'use strict';

var main = require('./main');


//--- String

function hasLf(s) {
    if (s.slice(-1) !== '\n') return 0;
    if (s.slice(-2) !== '\r\n') return 1;
    return 2;
}

String.prototype.chomp = function (tail) {
  if (tail === undefined) {
    return this.chop(hasLf(this)); // NB: we cut 0 if no LF
  }
  var pos = this.length - tail.length;
  if (this.substr(pos) === tail) {
    return this.substr(0, pos);
  }
  return this.toString(); // unchanged string is returned
};

String.prototype.chop = function (count) {
  if (count === undefined) {
    // special behavior: chop ending \n or \r\n
    count = hasLf(this) || 1; // we cut at least 1
  }
  return this.substr(0, this.length - count);
};

String.prototype.startWith = function (head) {
  return this.substr(0, head.length) === head;
};

String.prototype.endWith = function (tail) {
  return this.substr(this.length - tail.length) === tail;
};

main.strFormat = function (fmt) {
  return fmt; //TODO
};

//--- Array

main.Array = function (size, init) {
  var i, a = [];
  if (typeof init === 'function') {
    for (i = 0; i < size; i++) { a[i] = init(); }
  } else {
    for (i = 0; i < size; i++) { a[i] = init; }
  }
  return a;
};

Array.prototype.contains = function (e) {
  return this.indexOf(e) !== -1;
};

Array.prototype.size = function () {
  return this.length;
};

Array.prototype.clear = function () {
  for (var i=this.length; i>0; i--) this.pop();
};

Array.prototype.select = Array.prototype.filter;

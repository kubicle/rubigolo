'use strict';


//--- String

function hasLf(s) {
  if (s.slice(-1) !== '\n') return 0;
  if (s.slice(-2) !== '\r\n') return 1;
  return 2;
}

String.prototype.chomp = function (tail) {
  if (tail === undefined) {
    return this.substr(0, this.length - hasLf(this)); // NB: we cut 0 if no LF
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
  } else if(typeof count !== 'number') {
    throw new Error('Invalid parameter type for String.count: ' + typeof count);
  }
  return this.substr(0, this.length - count);
};

String.prototype.startWith = function (head) {
  return this.substr(0, head.length) === head;
};

String.prototype.endWith = function (tail) {
  return this.substr(this.length - tail.length) === tail;
};

String.prototype.tail = function (count) {
  if (count <= 0) return '';
  return this.slice(-count);
};

/** Inclusive range, like s[n..m] - exclusive one is done by using "slice" */
String.prototype.range = function (begin, end) {
  if (end === -1 || end === undefined) {
    return this.slice(begin);
  }
  return this.slice(begin, end + 1);
};

String.prototype.format = function (num) {
  if (this[0] !== '%') throw new Error('Invalid format: ' + this.toString());
  var fmt = this.slice(1,-1), res, pos = 0;
  var code = this.slice(-1);
  switch (code) {
  case 'd', 'x': //'%2d'
    var padChar = ' ';
    if (fmt[pos] === '0') { pos++; padChar = '0'; }
    var len = parseInt(fmt.substr(pos));
    res = num.toString(code === 'x' ? 16 : 10);
    for (var i = len - res.length; i > 0; i--) { res = padChar + res; }
    return res;
  case 'f': //'%.02f'
    if (fmt[0] !== '.') break;
    var prec = parseInt(fmt.substr(1));
    return num.toFixed(prec);
  }
  throw new Error('Unknown format: ' + this.toString());
};

String.prototype.between = function (low, high) {
  return this >= low && this <= high;
};

function escapeRegexp(str) {
  return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

String.prototype.replaceAll = function (pattern, replaceBy) {
  if (pattern instanceof RegExp) {
    if (pattern.global) return this.replace(pattern, replaceBy); // just in case...
    var mode = pattern.ignoreCase ? 'gi' : 'g';
    return this.replace(new RegExp(pattern.source, mode), replaceBy);
  }
  // NB: this would be fast and simpler on V8: this.split(pattern).join('')
  return this.replace(new RegExp(escapeRegexp(pattern), 'g'), replaceBy);
};


//--- Array

/** Mimics the Ruby Array constructor. Same limitation as in Ruby: do not use an object unless
 *  you really want all items to "point" to this object (i.e. modifying the objet will affect all items)
 *  @param {int} size
 *  @param {value|func} init - if a value is given, it is assigned to all items in the array.
 *         If a func is given, array[i] = func(i) will be performed for each item.
 *  @return {Array} - the new array
 */
Array.new = function (size, init) {
  if (size === undefined) return [];
  if (init === undefined) return new Array(size);

  var i, a = [];
  if (typeof init === 'function') {
    for (i = 0; i < size; i++) { a[i] = init(i); }
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
  this.length = 0;
};

Array.prototype.select = Array.prototype.filter;

Array.prototype.count = function (what) {
  switch (typeof what) {
  case 'undefined': return this.length;
  case 'function':
    var count = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      if (what(this[i])) count++;
    }
    return count;
  default:
    count = 0;
    for (i = this.length - 1; i >= 0; i--) {
      if (this[i] === what) count++;
    }
    return count;
  }
};

/** Inclusive range, like a[n..m] - exclusive one is done by using "slice" */
Array.prototype.range = function (begin, end) {
  if (end === -1 || end === undefined) {
    return this.slice(begin);
  }
  return this.slice(begin, end + 1);
};

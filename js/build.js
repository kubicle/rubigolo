(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],4:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":3,"_process":2,"inherits":1}],5:[function(require,module,exports){
//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('./ai/Shaper');


var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = 1000;
var SHARED_EYE = 1; // between brothers

function grpNdx(g) { return '#' + g.ndx; }
function giNdx(gi) { return '#' + gi.group.ndx; }


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(code, i, j, vcount, neighbors) {
    this.code = code;
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.vtype = undefined; // see vXXX contants below
    this.owner = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.stolen = false;
}
module.exports = Void;

var vEYE = 1, vFAKE_EYE = 2, vDAME = 3;
var vtypes = ['void', 'eye', 'fake-eye', 'dame'];

function vtype2str(vtype) {
    return vtype ? vtypes[vtype] : vtypes[0];
}

function isOneNotDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return true;
    }
    return false;
}

Void.prototype.findOwner = function () {
    // see which color has yet-alive groups around this void
    var hasBlack = isOneNotDead(this.groups[BLACK]);
    var hasWhite = isOneNotDead(this.groups[WHITE]);

    // every group around now dead = eye stolen by who killed them
    if (!hasBlack && !hasWhite) {
        if (this.vtype && !this.stolen) this.wasJustStolen();
        return;
    }

    if (hasBlack && hasWhite) return; // still undefined owner
    var color = hasBlack ? BLACK : WHITE;
    if (this.isFakeEye(color)) return;
    return this.setEyeOwner(color);
};

Void.prototype.isFakeEye = function (color) {
    // Potential fake eyes are identified only once (when still "undefined")
    // after which they can only lose this property
    if (this.vtype && this.vtype !== vFAKE_EYE) return false;

    if (this.vcount > 1) return false;
    var groups = this.groups[color];
    if (groups.length < 2) return false; // not shared

    var isFake = false;
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.numContactPoints === 1 && gi.voids.length <= 1) {
            isFake = true;
            gi.addParentGroups(groups, 'FAKE_EYE');
        }
    }
    if (!isFake) return false;
    if (this.vtype === vFAKE_EYE) return true;
    this.vtype = vFAKE_EYE;
    this.owner = color;
    if (main.debug) main.log.debug('FAKE EYE: ' + this);
    return true;
};

Void.prototype.setEyeOwner = function (color) {
    if (this.vtype === vEYE && color === this.owner) return;
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.owner = color;

    // Now tell the groups about this void
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        groups[i]._info.addVoid(this);
    }
    // If more than 1 group and they were not brothers yet, they become brothers
    if (groups.length > 1) Band.gather(groups);
};

Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner !== undefined) {
        var groups = this.groups[this.owner];
        for (var i = groups.length - 1; i >= 0; i--) {
            groups[i]._info.removeVoid(this);
        }
        this.owner = undefined;
    }
    this.vtype = vDAME;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype.wasJustStolen = function () {
    if (this.owner === undefined) throw new Error('stolen eye of undefined owner');
    if (main.debug) main.log.debug('STOLEN EYE: ' + this);
    // remove eye from previous owners and build the list of killers
    var groups = this.groups[this.owner];
    var killers = [];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        gi.removeVoid(this);
        killers.pushUnique(gi.killers);
    }
    // we "add" the eye to each killer
    this.stolen = true;
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.owner = 1 - this.owner;
    for (var k = killers.length - 1; k >= 0; k--) {
        killers[k]._info.addVoid(this);
    }
};

Void.prototype.getSingleOwner = function () {
    if (this.owner === undefined) return null;
    var groups = this.groups[this.owner];
    if (groups.length > 1) return null;
    return groups[0];
};

Void.prototype.toString = function () {
    var s = vtype2str(this.vtype) + ' ' + this.code + '-' + Grid.colorToChar(this.code) + ' (' + Grid.moveAsString(this.i, this.j) + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.colorName(color) + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    console.log(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        console.log('    Color ' + color + ' (' + Grid.colorToChar(color) + '): ' +
            this.groups[color].map(grpNdx));
    }
};

//---

/** @class One list of "brother" groups = groups which share eyes.
 *  @param {GroupInfo} gi0 - first group in band */
function Band(gi0) {
    this.bandId = gi0.group.ndx; // unique enough
    this.brothers = [gi0]; // array of GroupInfo
    gi0.band = this;
    gi0.dependsOn.clear(); // does not depend on parents anymore
}

Band.prototype.toString = function () {
    return this.brothers.map(giNdx);
};

Band.prototype._add1 = function (gi) {
    gi.dependsOn.clear(); // does not depend on parents anymore

    if (!gi.band) {
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    var brothers = gi.band.brothers;
    for (var n = brothers.length - 1; n >= 0; n--) {
        this.brothers.push(brothers[n]);
        brothers[n].band = this;
    }
};

Band.prototype.remove = function (gi) {
    var ndx = this.brothers.indexOf(gi);
    if (ndx < 0) throw new Error('Band.remove on wrong Band');
    this.brothers.splice(ndx, 1);
    gi.band = null;
};

// groups contains the groups in the band
Band.gather = function (groups) {
    if (main.debug) main.log.debug('BROTHERS: ' + groups.length + ' groups: ' + groups);
    if (groups.length === 1) throw new Error('add Band of 1');

    // look if one of the group is already in a band
    var band = null;
    for (var n = 0; n < groups.length; n++) {
        if (groups[n]._info.band) { band = groups[n]._info.band; break; }
    }
    // if not, create a new band with 1st group in it
    var first = 0;
    if (!band) band = new Band(groups[first++]._info);
    // add all groups to band
    for (n = first; n < groups.length; n++) {
        band._add1(groups[n]._info);
    }
};


//---

/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group) {
    this.voids = []; // empty zones next to a group
    this.dependsOn = [];
    this.deadEnemies = [];
    this.killers = [];

    this.resetAnalysis(group);
}

// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function (group) {
    this.group = group;
    this.eyeCount = 0;
    this.voids.clear();
    this.dependsOn.clear();
    this.band = null;
    this.isAlive = false;
    this.isDead = false;
    this.deadEnemies.clear();
    this.killers.clear();
    this.numContactPoints = 0;
};

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ', ' +
        this.eyeCount + ' eyes, ' + this.voids.length + ' voids  brothers:[' +
        brothers + '] parents:[' + this.dependsOn.map(giNdx) +
        '] deadEnemies:[' + this.deadEnemies.map(giNdx) + '])';
};

// Adds a void or an eye to an owner-group
GroupInfo.prototype.addVoid = function (v) {
    if (main.debug) main.log.debug('OWNED EYE: ' + v + ' owned by ' + this);
    this.voids.push(v);
    if (v.vtype === vEYE) this.eyeCount++;
};

// Removes given void from the group (if not owned, does nothing)
GroupInfo.prototype.removeVoid = function (v) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) return;
    if (main.debug) main.log.debug('LOST EYE: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    if (v.vtype === vEYE) this.eyeCount--;
};

GroupInfo.prototype.addParentGroups = function (groups, reason) {
    if (this.band) {
        this.band.remove(this);
    }
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) < 0) {
            if (main.debug) main.log.debug('DEPENDS-' + reason + ': ' + this + ' depends on ' + gi);
            this.dependsOn.push(gi);
        }
    }
};

// NB: if we had another way to get the numContactPoints info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group;
    // find allies 1 stone away
    var empties = g.allLives();
    var allAllies = [];
    var numContactPoints = 0;
    for (var e = empties.length - 1; e >= 0; e--) {
        var allies = empties[e].uniqueAllies(g.color);
        if (allies.length === 1) continue;
        numContactPoints++;
        allAllies.pushUnique(allies);
    }
    if (!numContactPoints) return;
    this.numContactPoints = numContactPoints;
    Band.gather(allAllies);
};

/** Returns the (first) single eye of a group */
GroupInfo.prototype.getSingleEye = function () {
    for (var i = this.voids.length - 1; i >= 0; i--) {
        var eye = this.voids[i];
        //if (eye.vtype === vEYE && eye.getSingleOwner()) return eye;
        if (eye.vtype === vEYE) return eye;
    }
    return null;
};

GroupInfo.prototype.considerDead = function (reason) {
    this.isDead = true;

    var enemies = this.killers = this.group.allEnemies();
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i]._info.deadEnemies.push(this);
    }
    if (main.debug) main.log.debug('DEAD-' + reason + ': ' + this);
};

/** Returns a number telling how "alive" a group is.
 *  NB: for end-game counting, this logic is enough because undetermined situations
 *  have usually all been resolved - otherwise it means both players cannot see it ;) */
GroupInfo.prototype.liveliness = function (shallow) {
    if (this.isAlive || this.eyeCount >= 2) {
        return ALIVE;
    }
    var racePoints = this.group.lives / 100;
    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow) {
        for (var n = this.dependsOn.length - 1; n >= 0; n--) {
            familyPoints += this.dependsOn[n].liveliness(true);
        }
        if (this.band) {
            var brothers = this.band.brothers;
            for (n = brothers.length - 1; n >= 0; n--) {
                if (brothers[n] === this) continue;
                familyPoints += brothers[n].liveliness(true) - SHARED_EYE;
            }
        }
    }
    return this.voids.length + this.deadEnemies.length + familyPoints + racePoints;
};

GroupInfo.prototype.checkDoubleEye = function () {
    if (this.voids.length + this.deadEnemies.length >= 2) {
        if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
        this.isAlive = true;
        return true;
    }
    return false;
};

GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return false;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var parent = this.dependsOn[n];
        if (parent.isAlive) {
            if (main.debug) main.log.debug('ALIVE-parents: ' + this);
            this.isAlive = true;
            return true;
        }
        if (!parent.isDead) allAreDead = false;
    }
    if (!allAreDead) return false;
    this.considerDead('parentsDead');
    return true;
};

GroupInfo.prototype.checkBrothers = function () {
    if (!this.band) return false;
    var brothers = this.band.brothers;
    var numEyes = 1, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        if (brothers[n] === this) continue;
        var neighbor = brothers[n];
        if (oneIsAlive || neighbor.isAlive) {
            oneIsAlive = neighbor.isAlive = true;
        } else {
            numEyes += neighbor.eyeCount - SHARED_EYE;
            if (numEyes >= 2) { // checkLiveliness does that too; TODO: remove if useless
                oneIsAlive = neighbor.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return false;
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return true;
};

GroupInfo.prototype.checkSingleEye = function () {
    if (this.eyeCount !== 1) return false;
    var eye = this.getSingleEye();
    var coords = [];
    var alive = Shaper.getEyeMakerMove(this.group.goban, eye.i, eye.j, eye.vcount, coords);
    if (alive === 1) {
        return false; // it depends which player will play first, we cannot say yet
    }
    if (alive === 0) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.deadEnemies.length) return false;
        this.considerDead('singleEyeShape');
        return true;
    }
    if (main.debug) main.log.debug('ALIVE-singleEye: ' + this);
    this.isAlive = true;
    return true;
};

GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this.liveliness();
    if (life >= ALIVE) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return true;
    }
    if (life < minLife) {
        this.considerDead('liveliness=' + life.toFixed(2));
        return true;
    }
    return false;
};

GroupInfo.prototype.checkLiveliness1 = function () {
    return this.checkLiveliness(1);
};

GroupInfo.prototype.checkLiveliness2 = function () {
    return this.checkLiveliness(2);
};

// These checks will be run in _lifeOrDeathLoop
GroupInfo.lifeOrDeathChecks = [
    GroupInfo.prototype.checkDoubleEye,
    GroupInfo.prototype.checkParents,
    GroupInfo.prototype.checkBrothers,
    GroupInfo.prototype.checkLiveliness1,
    GroupInfo.prototype.checkSingleEye,
    GroupInfo.prototype.checkLiveliness2
];


//---

/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.goban = null;
    this.allVoids = [];
}
module.exports = BoardAnalyser;

/** Calling this method updates the goban to show the detected result.
 *  If grid is not given a new one will be created from goban */
BoardAnalyser.prototype.countScore = function (goban, grid) {
    if (main.debug) main.log.debug('Counting score...');
    this.goban = goban;
    this.scores = [0, 0];
    this.prisoners = Group.countPrisoners(goban);
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return;

    this._initVoidsAndGroups();
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();

    this._lifeOrDeathLoop();

    this.finalCounting();
    if (main.debug) main.log.debug(this.filler.grid.toText(function (c) { return Grid.colorToChar(c); }));
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    console.log(this.filler.grid.toText(function (c) {
        return Grid.colorToChar(c);
    }));
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.debugDump();
    }
    if (this.scores) {
        var eyes = [[], [], []];
        for (var ndx in this.allGroups) {
            var g = this.allGroups[ndx];
            var numEyes = g._info.eyeCount;
            eyes[numEyes >= 2 ? 2 : numEyes].push(g);
        }
        console.log('\nGroups with 2 eyes or more: ' + eyes[2].map(grpNdx));
        console.log('Groups with 1 eye: ' + eyes[1].map(grpNdx));
        console.log('Groups with no eye: ' + eyes[0].map(grpNdx));
        console.log('Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        }));
    }
};

BoardAnalyser.prototype._addGroup = function (g) {
    if (this.allGroups[g.ndx]) return;
    this.allGroups[g.ndx] = g;
    if (!g._info) {
        g._info = new GroupInfo(g);
    } else {
        g._info.resetAnalysis(g);
    }
};

BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, voidCode, neighbors);
            if (vcount === 0) continue;
            this.allVoids.push(new Void(voidCode, i, j, vcount, neighbors));
            voidCode++;
            // keep all the groups
            for (var color = BLACK; color <= WHITE; color++) {
                var groups = neighbors[color];
                for (var n = groups.length - 1; n >= 0; n--) {
                    this._addGroup(groups[n]);
                }
            }
            neighbors = [[], []];
        }
    }
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroups) {
        this.allGroups[ndx]._info.findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    for (var n = this.allVoids.length - 1; n >= 0; n--) {
        this.allVoids[n].findOwner();
    }
};

BoardAnalyser.prototype._findBattleWinners = function () {
    var life = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.owner !== undefined) continue;
            life[BLACK] = life[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness();
                }
            }
            // make sure we have a winner, not a tie
            if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
                if (main.debug) main.log.debug('BATTLED EYE in dispute: ' + v);
                continue;
            }
            var winner = life[BLACK] > life[WHITE] ? BLACK : WHITE;
            if (main.debug) main.log.debug('BATTLED EYE: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner] + ' VS ' + life[1 - winner]);
            v.setEyeOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

BoardAnalyser.prototype._reviewGroups = function (fn, stepNum) {
    var count = 0, reviewedCount = 0;
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;
        if (fn.call(gi)) count++;
    }
    if (main.debug) {
        var msg = 'REVIEWED ' + reviewedCount + ' groups for step ' + stepNum;
        if (count) msg += ' => found ' + count + ' alive/dead groups. Restarting...';
        main.log.debug(msg);
    }
    if (count === reviewedCount) return -1; // really finished
    return count;
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function () {
    var checks = GroupInfo.lifeOrDeathChecks;
    var stepNum = 0;
    while (stepNum < checks.length) {
        var count = this._reviewGroups(checks[stepNum], stepNum);
        if (count === 0) {
            stepNum++;
            continue;
        }
        // we found dead/alive groups => rerun all the checks from start
        stepNum = 0;
        this._findEyeOwners();
        if (count < 0) return;
    }
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (g._info.liveliness() >= 1) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.setAsDame();
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype._colorVoids = function () {
    var color;
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        if (v.owner !== undefined && v.vtype !== vFAKE_EYE) {
            this.scores[v.owner] += v.vcount;
            color = Grid.TERRITORY_COLOR + v.owner;
        } else {
            color = Grid.DAME_COLOR;
        }
        this.filler.fillWithColor(v.i, v.j, v.code, color);
    }
};

BoardAnalyser.prototype.finalCounting = function () {
    this._findDameVoids();
    this._colorVoids();

    // color all dead groups
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (!gi.isDead) continue;
        var color = g.color;
        var stone = g.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

},{"./Grid":9,"./Group":10,"./ZoneFiller":19,"./ai/Shaper":29,"./main":32}],6:[function(require,module,exports){
//Translated from game_logic.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');
var Goban = require('./Goban');
var SgfReader = require('./SgfReader');
var HandicapSetter = require('./HandicapSetter');

/** @class GameLogic enforces the game logic.
 *  public read-only attribute: goban, komi, curColor, gameEnded, gameEnding, whoResigned
 */
function GameLogic() {
    this.console = false;
    this.history = [];
    this.errors = [];
    this.handicap = 0;
    this.whoResigned = null;
    this.goban = null;
}
module.exports = GameLogic;

GameLogic.prototype.newGame = function (gsize, handicap, komi) {
    if (handicap === undefined) handicap = 0;
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.curColor = main.BLACK;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = null;
    if (!this.goban || gsize !== this.goban.gsize) {
        if (gsize < 5) gsize = 5;
        this.goban = new Goban(gsize);
    } else {
        this.goban.clear();
    }
    this.komi = (( komi ? komi : (( handicap === 0 ? 6.5 : 0.5 )) ));
    return this.setHandicap(handicap);
};

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
GameLogic.prototype.setHandicap = function (h) {
    if (this.history.length > 0) {
        throw new Error('Handicap cannot be changed during a game');
    }
    this.handicap = HandicapSetter.setHandicap(this.goban, h);
    // White first when handicap
    if (this.handicap !== 0) {
        this.curColor = main.WHITE;
    }
    return true;
};

// game is a series of moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
GameLogic.prototype.loadMoves = function (game) {
    try {
        game = this.sgfToGame(game);
        for (var move, move_array = game.split(','), move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
            if (!this.playOneMove(move)) {
                throw new Error('Failed playing the loaded move: ' + move);
            }
        }
        return true;
    } catch (err) {
        this.errorMsg('Failed loading moves. Please double check the format of your input.');
        this.errorMsg('Error: ' + err.message + ' (' + err.constructor.name + ')');
        main.log.error('Error while loading moves:\n' + err + '\n' + err.stack);
        return false;
    }
};

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) {
        return this.errorMsg('Game already ended');
    }
    // $log.debug("GameLogic playing #{Grid.color_name(@cur_color)}: #{move}") if $debug
    if (/^[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playAStone(move);
    } else if (move === 'undo') {
        return this.requestUndo();
    } else if (move === 'half_undo') {
        return this.requestUndo(true);
    } else if (move.startWith('resi')) {
        return this.resign();
    } else if (move === 'pass') {
        return this.passOneMove();
    } else if (move.startWith('hand')) {
        return this.setHandicap(move.split(':')[1]);
    } else if (move.startWith('load:')) {
        return this.loadMoves(move.range(5, -1));
    } else if (move.startWith('log')) {
        return this.setLogLevel(move.split(':')[1]);
    } else {
        return this.errorMsg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
GameLogic.prototype.playAStone = function (move) {
    var i, j;
    var _m = Grid.parseMove(move);
    i = _m[0];
    j = _m[1];
    
    if (!Stone.validMove(this.goban, i, j, this.curColor)) {
        return this.errorMsg('Invalid move: ' + move);
    }
    Stone.playAt(this.goban, i, j, this.curColor);
    this.storeMoveInHistory(move);
    this.nextPlayer();
    this.numPass = 0;
    return true;
};

// One player resigns.
GameLogic.prototype.resign = function () {
    this.storeMoveInHistory('resign');
    this.whoResigned = this.curColor;
    this.gameEnded = true;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.passOneMove = function () {
    this.storeMoveInHistory('pass');
    this.numPass += 1;
    if (this.numPass >= 2) {
        this.gameEnding = true;
    }
    this.nextPlayer();
    return true;
};

// Call this each time GameLogic#game_ending goes to true (ending mode).
// The score should be counted and proposed to players.
// "accept" parameter should be true if all players accept the proposed ending (score count).
// Only after this call will the game be really finished.
// If accept=false, this means a player refuses to end here
// => the game should continue until the next time all players pass.
GameLogic.prototype.acceptEnding = function (accept, whoRefused) {
    if (!this.gameEnding) return this.errorMsg('The game is not ending yet');
    this.gameEnding = false;
    if (accept) {
        this.gameEnded = true; // ending accepted. Game is finished.
        return true;
    }
    // Score refused (in dispute)
    // if the player who refused just played, we give the turn back to him
    if (whoRefused !== this.curColor) {
        this.history.pop(); // remove last "pass" (half a move so "undo" cannot help)
        this.nextPlayer();
    }
    return true;
};

// Returns how many moves have been played so far
// (can be bigger than the stone count since "pass" or "resign" are also moves)
GameLogic.prototype.moveNumber = function () {
    return this.history.length;
};

// Returns a text representation of the list of moves played so far
GameLogic.prototype.historyString = function () {
    return (( this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '' )) +
        this.history.join(',') +
        ' (' + this.history.length + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.prisoners = function () {
    return Group.countPrisoners(this.goban);
};

// If called with on=true, error messages will be directly displayed on the console.
// If not called, the default behavior needs the caller to use get_errors method.
GameLogic.prototype.messagesToConsole = function (on) {
    if (on === undefined) on = true;
    this.console = on;
};

// Returns the error messages noticed until now and clears the list.
GameLogic.prototype.getErrors = function () {
    var errors = this.errors;
    this.errors = [];
    return errors;
};

GameLogic.prototype.setLogLevel = function (cmd) {
    try {
        var a = cmd.split('=');
        var flag = parseInt(a[1]) !== 0;
        if (!flag && a[1] !== '0') {
            throw new Error(0);
        }
        switch (a[0]) {
        case 'group':
            main.debugGroup = flag;
            break;
        case 'ai':
            main.debugAi = flag;
            break;
        case 'all':
            main.debug = main.debugGroup = main.debugAi = flag;
            break;
        default: 
            throw new Error(1);
        }
        return true;
    } catch (_exc) {
        return this.errorMsg('Invalid log command: ' + cmd);
    }
};

// ===============================================================================
//private;
// ===============================================================================
GameLogic.prototype.nextPlayer = function () {
    this.curColor = 1 - this.curColor;
};

// Always returns false
GameLogic.prototype.errorMsg = function (msg) {
    if (!this.console) {
        this.errors.push(msg);
    } else {
        console.log(msg);
    }
    return false;
};

GameLogic.prototype.storeMoveInHistory = function (move) {
    return this.history.push(move);
};

// undo one full game turn (e.g. one black move and one white)
GameLogic.prototype.requestUndo = function (halfMove) {
    var count = halfMove ? 1 : 2;
    if (this.history.length < count) {
        return this.errorMsg('Nothing to undo');
    }
    for (var i = count; i >= 1; i--) {
        if (!this.history[this.history.length-1].endWith('pass')) { // no stone to remove for a pass
            Stone.undo(this.goban);
        }
        this.history.pop();
    }
    if (halfMove) this.nextPlayer();
    this.numPass = 0;
    return true;
};

// Converts a game (list of moves) from SGF format to our internal format.
// Returns the game unchanged if it is not an SGF one.
// Returns an empty move list if nothing should be played (a game is pending).
GameLogic.prototype.sgfToGame = function (game) {
    if (!game.startWith('(;FF')) { // are they are always the 1st characters?
        return game;
    }
    var reader = new SgfReader(game);
    this.newGame(reader.boardSize);
    this.komi = reader.komi;
    return reader.toMoveList();
};

},{"./Goban":8,"./Grid":9,"./Group":10,"./HandicapSetter":11,"./SgfReader":16,"./Stone":17,"./main":32}],7:[function(require,module,exports){
//Translated from genes.rb using babyruby2js
'use strict';

var main = require('./main');
//require 'yaml';

/** @class public read-only attribute: map
 */
function Genes(map, limits) {
    if (map === undefined) map = {};
    if (limits === undefined) limits = {};
    this.map = map;
    this.limits = limits;
}
module.exports = Genes;

Genes.SMALL_MUTATION_AMOUNT = 0.05; // e.g. 0.05 -> plus or minus 5%
// for limits
Genes.LOW = 0;
Genes.HIGH = 1;
Genes.prototype.clone = function () {
    return new Genes(main.clone(this.map), main.clone(this.limits));
};

Genes.prototype.setLimits = function (limits) {
    this.limits = limits;
};

Genes.prototype.toString = function () {
    var s = '';
    for (var k in this.map) {
        s += k + ':' + '%.02f'.format(this.map[k]) + ', ';
    }
    return s.chomp(', ');
};

// Returns a distance between 2 sets of genes
Genes.prototype.distance = function (gene2) {
    var dist = 0.0;
    for (var k in this.map) {
        var m = this.map[k];
        var n = gene2.map[k];
        // first handle sign differences
        if ((n < 0) !== (m < 0)) {
            if (n < 0) {
                m -= n;
                n = 0;
            } else {
                n -= m;
                m = 0;
            }
        } else {
            m = Math.abs(m);
            n = Math.abs(n);
        }
        // then separate 0 values
        if (n === 0.0) {
            var d = (( m > 1.0 ? 1.0 : m ));
        } else if (m === 0.0) {
            d = (( n > 1.0 ? 1.0 : n ));
        } else {
            // finally we can do a ratio
            d = 1.0 - (( n >= m ? m / n : n / m ));
        }
        dist += d; // puts "Distance for #{k} between #{'%.02f' % @map[k]} and #{'%.02f' % gene2.map[k]}: #{d}"
    }
    // puts "Total distance: #{'%.02f' % dist}"
    return dist;
};

// If limits are given, they will be respected during mutation.
// The mutated value will remain >=low and <=high.
// So if you want to remain strictly >0 you have to set a low limit as 0.0001 or alike.
Genes.prototype.get = function (name, defValue, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    var val = this.map[name];
    if (val) {
        return val;
    }
    this.map[name] = defValue;
    if (lowLimit || highLimit) {
        this.limits[name] = [lowLimit, highLimit];
    }
    if (lowLimit && highLimit && lowLimit > highLimit) {
        throw new Error('Limits are invalid: ' + lowLimit + ' > ' + highLimit);
    }
    return defValue;
};

Genes.prototype.serialize = function () {
    return main.YAML.dump(this);
};

Genes.unserialize = function (dump) {
    return main.YAML.load(dump);
};

// mutation_rate: 0.05 for 5% mutation on each gene
// wide_mutation_rate: 0.20 for 20% chances to pick any value in limit range
// if wide mutation is not picked, a value near to the old value is picked
Genes.prototype.mate = function (parent2, kid1, kid2, mutationRate, wideMutationRate) {
    var p1 = this.map;
    var p2 = parent2.map;
    kid1.setLimits(this.limits);
    kid2.setLimits(this.limits);
    var k1 = kid1.map;
    var k2 = kid2.map;
    var crossPoint2 = ~~(Math.random()*~~(p1.length));
    var crossPoint = ~~(Math.random()*~~(crossPoint2));
    var pos = 0;
    for (var key in p1) {
        if (pos < crossPoint || pos > crossPoint2) {
            k1[key] = p1[key];
            k2[key] = p2[key];
        } else {
            k1[key] = p2[key];
            k2[key] = p1[key];
        }
        if (Math.random() < mutationRate) {
            k1[key] = this.mutation1(key, k1[key], wideMutationRate);
        }
        if (Math.random() < mutationRate) {
            k2[key] = this.mutation1(key, k2[key], wideMutationRate);
        }
        pos += 1;
    }
};

Genes.prototype.mutation1 = function (name, oldVal, wideMutationRate) {
    var limits = this.limits[name];
    if (limits) {
        var low = limits[Genes.LOW];
        var high = limits[Genes.HIGH];
        if (Math.random() < wideMutationRate) {
            var val = low + Math.random() * (high - low);
        } else {
            var variation = 1 + (Math.random() * 2 * Genes.SMALL_MUTATION_AMOUNT) - Genes.SMALL_MUTATION_AMOUNT;
            val = oldVal * variation;
            if (low && val < low) {
                val = low;
            }
            if (high && val > high) {
                val = high;
            }
        }
    } else {
        // not used yet; it seems we will always have limits for valid values
        // add or remove up to 5
        val = oldVal + (Math.random() - 0.5) * 10;
    }
    return val;
};

Genes.prototype.mutateAll = function () {
    for (var key in this.map) {
        this.map[key] = this.mutation1(key, this.map[key], 1.0);
    }
    return this;
};

// E02: unknown method: chomp!(...)
// E02: unknown method: dump(...)
// W02: unknown constant supposed to be attached to main: YAML
// E02: unknown method: load(...)
// W02: unknown constant supposed to be attached to main: YAML
},{"./main":32}],8:[function(require,module,exports){
//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

var EMPTY = main.EMPTY, BORDER = main.BORDER;


/** @class Stores what we have on the board (namely, the stones and the empty spaces).
 *  - Giving coordinates, a Goban can return an existing stone.
 *  - It also remembers the list of stones played and can share this info for undo feature.
 *  - For console game and debug features, a goban can also "draw" its content as text.
 *  See Stone and Group classes for the layer above this.
 *  public read-only attribute: gsize, grid, scoringGrid, mergedGroups, killedGroups, garbageGroups
 */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    this.gsize = gsize;
    this.grid = new Grid(gsize);
    this.scoringGrid = new Grid(gsize);
    this.ban = this.grid.yx;
    var i, j;
    for (j = 1; j <= gsize; j++) {
        for (i = 1; i <= gsize; i++) {
            this.ban[j][i] = new Stone(this, i, j, EMPTY);
        }
    }
    for (j = 1; j <= gsize; j++) {
        for (i = 1; i <= gsize; i++) {
            this.ban[j][i].findNeighbors();
        }
    }
    // sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel]; // so that we can always do @killed_groups.last.color, etc.
    this.mergedGroups = [Goban.sentinel];
    this.garbageGroups = [];
    this.numGroups = 0;

    this.history = [];
    this._moveIdStack = [];
    this._moveIdGen = this.moveId = 0; // moveId is unique per tried move
}
module.exports = Goban;

// Prepares the goban for another game (same size, same number of players)
Goban.prototype.clear = function () {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.ban[j][i];
            if (stone.group) {
                stone.group.clear();
            }
        }
    }
    // Collect all the groups and put them into @garbage_groups
    this.killedGroups.shift(); // removes @@sentinel
    this.mergedGroups.shift(); // removes @@sentinel
    this.garbageGroups.concat(this.killedGroups);
    this.garbageGroups.concat(this.mergedGroups);
    this.killedGroups.clear();
    this.mergedGroups.clear();
    this.killedGroups.push(Goban.sentinel);
    this.mergedGroups.push(Goban.sentinel);
    this.numGroups = 0;

    this.history.clear();
    this._moveIdStack.clear();
    this._moveIdGen = this.moveId = 0;
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.newGroup = function (stone, lives) {
    var group = this.garbageGroups.pop();
    if (group) {
        return group.recycle(stone, lives);
    } else {
        this.numGroups += 1;
        return new Group(this, stone, lives, this.numGroups);
    }
};

Goban.prototype.image = function () {
    return this.grid.toLine(function (s) {
        return Grid.colorToChar(s.color);
    });
};

// For tests; can load a game image (without the move history)
Goban.prototype.loadImage = function (image) {
    this.scoringGrid.loadImage(image);
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            var color = this.scoringGrid.yx[j][i];
            if (color !== EMPTY) Stone.playAt(this, i, j, color);
        }
    }
};

// For debugging only
Goban.prototype.debugDisplay = function () {
    console.log('Board:');
    console.log(this.grid.toText(function (s) {
        return Grid.colorToChar(s.color);
    }));
    console.log('Groups:');
    console.log(this.grid.toText(function (s) {
        if (s.group) {
            return '' + s.group.ndx;
        } else {
            return '.';
        }
    }));
    console.log('Full info on groups and stones:');
    var groups = {};
    for (var row, row_array = this.grid.yx, row_ndx = 0; row=row_array[row_ndx], row_ndx < row_array.length; row_ndx++) {
        for (var s, s_array = row, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s && s.group) {
                groups[s.group.ndx] = s.group;
            }
        }
    }
    for (var ndx = 1; ndx <= this.numGroups; ndx++) {
        if (groups[ndx]) {
            console.log(groups[ndx].debugDump());
        }
    }
};

// This display is for debugging and text-only game
Goban.prototype.toString = function () {
    return this.grid.toText(function (s) {
        return Grid.colorToChar(s.color);
    });
};

// Basic validation only: coordinates and checks the intersection is empty
// See Stone class for evolved version of this (calling this one)
Goban.prototype.validMove = function (i, j) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) {
        return false;
    }
    return this.ban[j][i].isEmpty();
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.color = function (i, j) {
    var stone = this.ban[j][i];
    if (stone) { // works because BORDER == nil
        return stone.color;
    }
    return BORDER;
};

// No validity test here
Goban.prototype.isEmpty = function (i, j) {
    return this.ban[j][i].isEmpty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

// Plays a stone and stores it in history
// Returns the existing stone and the caller (Stone class) will update it
Goban.prototype.putDown = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) {
        throw new Error('Tried to play on existing stone in ' + stone);
    }
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Returns the existing stone and the caller (Stone class) will update it
Goban.prototype.takeBack = function () {
    return this.history.pop();
};

// If inc > 0 (e.g. +1), increments the move ID
// otherwise, unstack (pop) the previous move ID (we are doing a "undo")
Goban.prototype.updateMoveId = function (inc) {
    if (inc > 0) {
        this._moveIdGen++;
        this._moveIdStack.push(this.moveId);
        this.moveId = this._moveIdGen;
    } else {
        this.moveId = this._moveIdStack.pop();
    }
};

Goban.prototype.previousStone = function () {
    return this.history[this.history.length-1];
};

},{"./Grid":9,"./Group":10,"./Stone":17,"./main":32}],9:[function(require,module,exports){
//Translated from grid.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class A generic grid - a Goban owns a grid
 *  public read-only attribute: gsize, yx
 */
function Grid(gsize) {
    if (gsize === undefined) gsize = 19;
    this.gsize = gsize;
    // We keep extra "border" cells around the real board.
    // Idea is to avoid to have to check i,j against gsize in many places.
    // Having a real item (BORDER) on the way helps to detect bugs.
    this.yx = Array.new(gsize + 2, function () {
        return Array.new(gsize + 2, main.BORDER);
    });
}
module.exports = Grid;

Grid.COLOR_NAMES = ['black', 'white'];
Grid.NOTATION_A = 'a'.charCodeAt(); // notation origin; could be A or a
Grid.EMPTY_CHAR = '+';
Grid.DAME_CHAR = '?';
Grid.STONE_CHARS = '@O';
Grid.DEAD_CHARS = '&#';
Grid.TERRITORY_CHARS = '-:';
Grid.COLOR_CHARS = Grid.STONE_CHARS + Grid.DEAD_CHARS + Grid.TERRITORY_CHARS + Grid.DAME_CHAR + Grid.EMPTY_CHAR;
Grid.EMPTY_COLOR = -1; // this is same as EMPTY, conveniently
Grid.DAME_COLOR = -2; // index of ? in above string; 2 from the end of the string
Grid.DEAD_COLOR = 2;
Grid.TERRITORY_COLOR = 4;
Grid.CIRCULAR_COLOR_CHARS = Grid.DAME_CHAR + Grid.EMPTY_CHAR + Grid.COLOR_CHARS;
Grid.ZONE_CODE = 100; // used for zones (100, 101, etc.); must be > COLOR_CHARS.size

// Converts a "territory" character into an owner score (-1= black, +1= white)
// dame, empty, live*2, dead*2, terr*2
Grid.territory2owner = [0,0, -1,+1, +1,-1, -1,+1];
// Converts potential territory number to a char (-1, -0.5, 0, +0.5, +1) -> char
Grid.territory2char = '-\'?.:';


Grid.prototype.copy = function (sourceGrid) {
    if (sourceGrid.gsize !== this.gsize) {
        throw new Error('Cannot copy between different sized grids');
    }
    var srcYx = sourceGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = srcYx[j][i];
        }
    }
    return this;
};

/** Converts from goban grid (stones) to simple grid (colors)
 *  @param {Goban} goban - not modified
 *  @return {Grid} the grid (this)
 */
Grid.prototype.initFromGoban = function (goban) {
    var sourceGrid = goban.grid;
    if (sourceGrid.gsize !== this.gsize) {
        throw new Error('Cannot copy between different sized grids');
    }
    var srcYx = sourceGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = srcYx[j][i].color;
        }
    }
    return this;
};

// Returns the "character" used to represent a stone in text style
Grid.colorToChar = function (color) {
    if (color >= Grid.ZONE_CODE) {
        return String.fromCharCode(('A'.charCodeAt() + color - Grid.ZONE_CODE));
    }
    if (color < Grid.DAME_COLOR || color >= Grid.COLOR_CHARS.length) {
        throw new Error('Invalid color ' + color);
    }
    if (color < 0) color += Grid.COLOR_CHARS.length;
    return Grid.COLOR_CHARS[color];
};

// Returns the name of the color/player (e.g. "black")
Grid.colorName = function (color) { // TODO remove me or?
    return Grid.COLOR_NAMES[color];
};

Grid.charToColor = function (char) {
    return Grid.CIRCULAR_COLOR_CHARS.indexOf(char) + Grid.DAME_COLOR;
};

Grid.prototype.toText = function (block) {
    return this.toTextExt(true, '\n', block);
};

Grid.prototype.toLine = function (block) {
    return this.toTextExt(false, ',', block);
};

// Receives a block of code and calls it for each vertex.
// The block should return a string representation.
// This method returns the concatenated string showing the grid.
Grid.prototype.toTextExt = function (withLabels, endOfRow, block) {
    var yx = new Grid(this.gsize).yx;
    var maxlen = 1, i, j, val;
    for (j = this.gsize; j >= 1; j--) {
        for (i = 1; i <= this.gsize; i++) {
            val = block(this.yx[j][i]);
            if (val === null) {
                val = '';
            }
            yx[j][i] = val;
            if (val.length > maxlen) {
                maxlen = val.length;
            }
        }
    }
    var numChar = maxlen;
    var white = '          ';
    var s = '';
    for (j = this.gsize; j >= 1; j--) {
        if (withLabels) {
            s += '%2d'.format(j) + ' ';
        }
        for (i = 1; i <= this.gsize; i++) {
            val = yx[j][i];
            if (val.length < numChar) {
                val = white.substr(1, numChar - val.length) + val;
            }
            s += val;
        }
        s += endOfRow;
    }
    if (withLabels) {
        s += '   ';
        for (i = 1; i <= this.gsize; i++) {
            s += white.substr(1, numChar - 1) + Grid.xLabel(i);
        }
        s += '\n';
    }
    if (endOfRow !== '\n') {
        return s.chop();
    }
    return s;
};

Grid.prototype.toString = function () {
    var s = '';
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            s += Grid.colorToChar(this.yx[j][i]);
        }
        s += '\n';
    }
    return s;
};

// Returns a text "image" of the grid. See also copy? method.
// Image is upside-down to help compare with a copy paste from console log.
// So last row (j==gsize) comes first in image
Grid.prototype.image = function () {
    if (main.instanceOf(Object, this.yx[1][1])) {
        return this.toLine(function (s) {
            return Grid.colorToChar(s.color);
        });
    } else {
        return this.toLine(function (c) {
            return Grid.colorToChar(c);
        });
    }
};

// Watch out our images are upside-down on purpose (to help copy paste from screen)
// So last row (j==gsize) comes first in image
Grid.prototype.loadImage = function (image) {
    var rows = image.split(/\"|,/);
    if (rows.length !== this.gsize) {
        throw new Error('Invalid image: ' + rows.length + ' rows instead of ' + this.gsize);
    }
    for (var j = this.gsize; j >= 1; j--) {
        var row = rows[this.gsize - j];
        if (row.length !== this.gsize) {
            throw new Error('Invalid image: row ' + row);
        }
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = Grid.charToColor(row[i - 1]);
        }
    }
};

var SKIPPED_I = 9;

// Parses a move like "c12" into 3,12
Grid.parseMove = function (move) {
    var i = move[0].charCodeAt() - Grid.NOTATION_A + 1;
    if (i > SKIPPED_I) i--;
    var j = parseInt(move.substr(1, 2));
    if (isNaN(j)) throw new Error('Illegal move parsed: ' + move);
    return [i, j];
};

// Builds a string representation of a move (3,12->"c12")  
Grid.moveAsString = function (col, row) {
    if (col >= SKIPPED_I) col++;
    return String.fromCharCode((col + Grid.NOTATION_A - 1)) + row;
};

// Converts a numeric X coordinate in a letter (e.g 3->c)
Grid.xLabel = function (i) {
    if (i >= SKIPPED_I) i++;
    return String.fromCharCode((i + Grid.NOTATION_A - 1));
};

// E02: unknown method: index(...)

},{"./main":32}],10:[function(require,module,exports){
//Translated from group.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');

var EMPTY = main.EMPTY;

/** @class Always require goban instead of stone
 *  A group keeps the list of its stones, the updated number of "lives" (empty intersections around),
 *  and whatever status information we need to decide what happens to a group (e.g. when a
 *  group is killed or merged with another group, etc.).
 *  Note that most of the work here is to keep this status information up to date.
 *    public read-only attribute: goban, stones, lives, color
 *    public read-only attribute: mergedWith, mergedBy, killedBy, ndx
 *    public write attribute: mergedWith, mergedBy, extraLives  *  only used in this file
 *  Create a new group. Always with a single stone.
 *  Do not call this using Group.new but Goban#newGroup instead.
 */
function Group(goban, stone, lives, ndx) {
    this.goban = goban;
    this.stones = [stone];
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = null; // a group
    this.mergedBy = null; // a stone
    this.killedBy = null; // a stone
    this.ndx = ndx; // unique index
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = this.mergedBy = this.killedBy = null;
    return this;
};

Group.prototype.clear = function () {
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.clear();
    }
    return this.goban.garbageGroups.push(this);
};

Group.prototype.toString = function () {
    var s = '{group #' + this.ndx + ' of ' + this.stones.length + ' ' + Grid.colorName(this.color) + ' stones [';
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        s += stone.asMove() + ',';
    }
    s = s.chop();
    s += '], lives:' + this.lives;
    if (this.mergedWith) {
        s += ' MERGED with #' + this.mergedWith.ndx;
    }
    if (this.killedBy) {
        s += ' KILLED by ' + this.killedBy.asMove();
    }
    s += '}';
    return s;
};

// debug dump does not have more to display now that stones are simpler
// TODO: remove it unless stones get more state data to display
Group.prototype.debugDump = function () {
    return this.toString();
};

Group.prototype.stonesDump = function () {
    return this.stones.map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

// Builds a list of all lives of the group (empty stones around)
// Costly!
Group.prototype.allLives = function () {
    var _allLives = [];
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== EMPTY) continue;

            if (!_allLives.contains(life)) {
                _allLives.push(life);
            }
        }
    }
    return _allLives;
};

// Builds a list of all enemies of the group
// Costly!
Group.prototype.allEnemies = function () {
    var _allEnemies = [];
    var enemyColor = 1 - this.color;
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color !== enemyColor) continue;

            if (!_allEnemies.contains(en.group)) {
                _allEnemies.push(en.group);
            }
        }
    }
    if (main.debugGroup) main.log.debug(this + ' has ' + _allEnemies.length + ' enemies');
    return _allEnemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
Group.prototype.livesAddedByStone = function (stone) {
    var lives = 0;
    for (var life, life_array = stone.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
        if (life.color !== EMPTY) continue;

        lives++;
        for (var s, s_array = life.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === this && s !== stone) {
                lives--;
                break;
            }
        }
    }
    if (main.debugGroup) main.log.debug(lives + ' lives added by ' + stone + ' for group ' + this);
    return lives;
};

// Connect a new stone or a merged stone to this group
Group.prototype.connectStone = function (stone, onMerge) {
    if (onMerge === undefined) onMerge = false;
    if (main.debugGroup) main.log.debug('Connecting ' + stone + ' to group ' + this + ' (on_merge=' + onMerge + ')');

    this.stones.push(stone);
    this.lives += this.livesAddedByStone(stone);
    if (!onMerge) this.lives--; // minus one since the connection itself removes 1

    if (this.lives < 0) { // can be 0 if suicide-kill
        throw new Error('Unexpected error (lives<0 on connect)');
    }
    if (main.debugGroup) main.log.debug('Final group: ' + this);
};

// Disconnect a stone
// on_merge must be true for merge or unmerge-related call 
Group.prototype.disconnectStone = function (stone, onMerge) {
    if (onMerge === undefined) onMerge = false;
    if (main.debugGroup) {
        main.log.debug('Disconnecting ' + stone + ' from group ' + this + ' (on_merge=' + onMerge + ')');
    }
    // groups of 1 stone become empty groups (->garbage)
    if (this.stones.length > 1) {
        this.lives -= this.livesAddedByStone(stone);
        if (!onMerge) { // see comment in connect_stone
            this.lives += 1;
        }
        if (this.lives < 0) { // can be 0 if suicide-kill
            throw new Error('Unexpected error (lives<0 on disconnect)');
        }
    } else {
        this.goban.garbageGroups.push(this);
        if (main.debugGroup) {
            main.log.debug('Group going to recycle bin: ' + this);
        }
    }
    // we always remove them in the reverse order they came
    if (this.stones.pop() !== stone) {
        throw new Error('Unexpected error (disconnect order)');
    }
};

// When a new stone appears next to this group
Group.prototype.attackedBy = function (stone) {
    this.lives -= 1;
    if (this.lives <= 0) { // also check <0 so we can raise in die_from method
        return this._dieFrom(stone);
    }
};

// When a group of stones reappears because we undo
// NB: it can never kill anything
Group.prototype._attackedByResuscitated = function (stone) {
    this.lives--;
    if (main.debugGroup) main.log.debug(this + ' attacked by resuscitated ' + stone);

    if (this.lives < 1) throw new Error('Unexpected error (lives<1 on attack by resucitated)');
};

// Stone parameter is just for debug for now
Group.prototype.notAttackedAnymore = function (stone) {
    this.lives++;
    if (main.debugGroup) main.log.debug(this + ' not attacked anymore by ' + stone);
};

// Merges a subgroup with this group
Group.prototype.merge = function (subgroup, byStone) {
    if (subgroup.mergedWith === this || subgroup === this || this.color !== subgroup.color) {
        throw new Error('Invalid merge');
    }
    if (main.debugGroup) main.log.debug('Merging subgroup:' + subgroup + ' to main:' + this);

    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.setGroupOnMerge(this);
        this.connectStone(s, true);
    }
    subgroup.mergedWith = this;
    subgroup.mergedBy = byStone;
    this.goban.mergedGroups.push(subgroup);
    if (main.debugGroup) main.log.debug('After merge: subgroup:' + subgroup + ' main:' + this);
};

// Reverse of merge
Group.prototype._unmerge = function (subgroup) {
    if (main.debugGroup) main.log.debug('Unmerging subgroup:' + subgroup + ' from main:' + this);

    for (var s, s_array = subgroup.stones, s_ndx = s_array.length - 1; s=s_array[s_ndx], s_ndx >= 0; s_ndx--) {
        this.disconnectStone(s, true);
        s.setGroupOnMerge(subgroup);
    }
    subgroup.mergedBy = subgroup.mergedWith = null;
    if (main.debugGroup) main.log.debug('After _unmerge: subgroup:' + subgroup + ' main:' + this);
};

// This must be called on the main group (stone.group)
Group.prototype.unmergeFrom = function (stone) {
    for (;;) {
        var subgroup = this.goban.mergedGroups[this.goban.mergedGroups.length - 1];
        if (subgroup.mergedBy !== stone || subgroup.mergedWith !== this) break;
        this._unmerge(subgroup);
        this.goban.mergedGroups.pop();
    }
};

// Called when the group has no more life left
Group.prototype._dieFrom = function (killerStone) {
    if (main.debugGroup) main.log.debug('Group dying: ' + this);
    if (this.lives < 0) throw new Error('Unexpected error (lives<0)');

    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.notAttackedAnymore(stone);
        }
        stone.die();
    }
    this.killedBy = killerStone;
    this.goban.killedGroups.push(this);
    if (main.debugGroup) main.log.debug('Group dead: ' + this);
};

// Called when "undo" operation removes the killer stone of this group
Group.prototype._resuscitate = function () {
    this.killedBy = null;
    this.lives = 1; // always comes back with a single life
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        stone.resuscitateIn(this);
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy._attackedByResuscitated(stone);
        }
    }
};

Group.resuscitateFrom = function (killerStone, goban) {
    for (;;) {
        var group = goban.killedGroups[goban.killedGroups.length - 1];
        if (group.killedBy !== killerStone) break;
        goban.killedGroups.pop();
        if (main.debugGroup) main.log.debug('taking back ' + killerStone + ' so we resuscitate ' + group.debugDump());
        group._resuscitate();
    }
};

// Returns prisoners grouped by color of dead stones  
Group.countPrisoners = function (goban) {
    var prisoners = [0, 0];
    for (var i = 1; i <= goban.killedGroups.length - 1; i++) {
        var g = goban.killedGroups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

},{"./Grid":9,"./main":32}],11:[function(require,module,exports){
//Translated from handicap_setter.rb using babyruby2js
'use strict';

var main = require('./main');
var HandicapSetter = require('./HandicapSetter');
var Grid = require('./Grid');
var Stone = require('./Stone');

/** @class */
function HandicapSetter() {}
module.exports = HandicapSetter;

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
// Returns the handicap actual count
HandicapSetter.setHandicap = function (goban, h) {
    var i, j;
    if (h === 0 || h === '0') {
        return 0;
    }
    // Standard handicap?
    if (main.isA(String, h)) {
        var eq = h.indexOf('=');
        if (h[0].between('0', '9') && eq < 0) {
            h = parseInt(h);
        }
    }
    if (main.isA('Fixnum', h)) { // e.g. 3
        return HandicapSetter.setStandardHandicap(goban, h);
    }
    // Could be standard or not but we are given the stones so use them   
    if (eq) { // "3=d4-p16-p4" would become "d4-p16-p4"
        h = h.range(eq + 1, -1);
    }
    var moves = h.split('-');
    for (var move, move_array = moves, move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
        var _m = Grid.parseMove(move);
        i = _m[0];
        j = _m[1];
        
        Stone.playAt(goban, i, j, main.BLACK);
    }
    return moves.length;
};

// Places the standard (star points) handicap
//   count: requested handicap
// NB: a handicap of 1 stone does not make sense but we don't really need to care.
// Returns the handicap actual count (if board is too small it can be smaller than count)
HandicapSetter.setStandardHandicap = function (goban, count) {
    // we want middle points only if the board is big enough 
    // and has an odd number of intersections
    var gsize = goban.gsize;
    if ((gsize < 9 || gsize % 2 === 0) && count > 4) {
        count = 4;
    }
    // Compute the distance from the handicap points to the border:
    // on boards smaller than 13, the handicap point is 2 points away from the border
    var distToBorder = (( gsize < 13 ? 2 : 3 ));
    var short = 1 + distToBorder;
    var middle = (1 + gsize) / 2;
    var long = gsize - distToBorder;
    for (var ndx = 0; ndx < count; ndx++) {
        // Compute coordinates from the index.
        // Indexes correspond to this map (with Black playing on North on the board)
        // 2 7 1
        // 4 8 5
        // 0 6 3
        // special case: for odd numbers and more than 4 stones, the center is picked
        if (count % 2 === 1 && count > 4 && ndx === count - 1) {
            ndx = 8;
        }
        switch (ndx) {
        case 0:
            var x = short;
            var y = short;
            break;
        case 1:
            x = long;
            y = long;
            break;
        case 2:
            x = short;
            y = long;
            break;
        case 3:
            x = long;
            y = short;
            break;
        case 4:
            x = short;
            y = middle;
            break;
        case 5:
            x = long;
            y = middle;
            break;
        case 6:
            x = middle;
            y = short;
            break;
        case 7:
            x = middle;
            y = long;
            break;
        case 8:
            x = middle;
            y = middle;
            break;
        default: 
            break; // not more than 8
        }
        Stone.playAt(goban, x, y, main.BLACK);
    }
    return count;
};

// E02: unknown method: index(...)

},{"./Grid":9,"./HandicapSetter":11,"./Stone":17,"./main":32}],12:[function(require,module,exports){
//Translated from influence_map.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');

/** @class public read-only attribute: map
 */
function InfluenceMap(goban) {
    var self = this;
    this.goban = goban;
    this.gsize = goban.gsize;
    this.map = Array.new(this.gsize + 1, function () {
        return Array.new(self.gsize + 1, function () {
            return [0, 0];
        });
    });
}
module.exports = InfluenceMap;

InfluenceMap.prototype.clear = function () {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            for (var c = 0; c < 2; c++) {
                this.map[j][i][c] = 0;
            }
        }
    }
};

InfluenceMap.prototype.buildMap = function () {
    this.clear();
    var influence = [4, 2, 1];
    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color !== main.EMPTY) {
                this.map[j][i][color] += influence[0];
                // Then we propagate it decreasingly with distance
                for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                    if (n1.color !== main.EMPTY) {
                        continue;
                    }
                    this.map[n1.j][n1.i][color] += influence[1];
                    // Second level
                    for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                        if (n2.color !== main.EMPTY) {
                            continue;
                        }
                        if (n2 === stone) {
                            continue;
                        }
                        this.map[n2.j][n2.i][color] += influence[2]; // 3rd level // n2.neighbors.each do |n3| //   next if n3 == n1 //   @map[n3.j][n3.i][color] += influence[3] // end
                    }
                }
            }
        }
    }
    if (main.debug) {
        return this.debugDump();
    }
};

InfluenceMap.prototype.debugDump = function () {
    var c;
    function inf2str(inf) { return '%2d'.format(inf[c]); }

    for (c = 0; c < 2; c++) {
        console.log('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            console.log('' + '%2d'.format(j) +
                this.map[j].slice(1, this.gsize + 1).map(inf2str).join('|'));
        }
        var cols = '  ';
        for (var i = 1; i <= this.gsize; i++) { cols += ' ' + Grid.xLabel(i) + ' '; }
        console.log(cols);
    }
};

},{"./Grid":9,"./main":32}],13:[function(require,module,exports){
//Translated from player.rb using babyruby2js
'use strict';


/** @class public read-only attribute: goban, color, isHuman
 */
function Player(isHuman, goban) {
    this.isHuman = isHuman;
    this.goban = goban;
}
module.exports = Player;

Player.prototype.setColor = function (color) {
    this.color = color;
};

},{}],14:[function(require,module,exports){
//Translated from potential_territory.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
var Stone = require('./Stone');
var BoardAnalyser = require('./BoardAnalyser');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;

var POT2CHAR = Grid.territory2char;
var POT2OWNER = Grid.territory2owner;

var UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
var XY_AROUND = Stone.XY_AROUND; // UP RIGHT DOWN LEFT
var XY_DIAGONAL = Stone.XY_DIAGONAL;


/** @class */
function PotentialTerritory(goban) {
    this.goban = goban;
    this.gsize = goban.gsize;
    this.boan = new BoardAnalyser();
    this.realGrid = this.goban.scoringGrid; // we can reuse the already allocated grid
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(this.gsize), new Grid(this.gsize)];
    this.reducedGrid = new Grid(this.gsize);
    this.territory = new Grid(this.gsize); // result of evaluation
    this._prepareBorderConnect();
}
module.exports = PotentialTerritory;

// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype.guessTerritories = function () {
    // update real grid to current goban
    this.realGrid.initFromGoban(this.goban);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    for (var first = BLACK; first <= WHITE; first++) {
        this._foresee(this.grids[first], first, 1 - first);
    }
    // now merge the result
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var owner = 0;
            for (first = BLACK; first <= WHITE; first++) {
                owner += POT2OWNER[2 + this.grids[first].yx[j][i]];
            }
            this.territory.yx[j][i] = owner / 2.0;
        }
    }
    if (main.debug) main.log.debug('Guessing territory for:\n' + this.realGrid +
        '\nBLACK first:\n' + this.grids[BLACK] + 'WHITE first:\n' + this.grids[WHITE] + this);
    return this.territory.yx;
};

PotentialTerritory.prototype.potential = function () {
    return this.territory;
};

PotentialTerritory.prototype.toString = function () {
    return '\n+1=white, -1=black, 0=no one\n' +
        this.territory.toText(function (v) { return v === 0 ? '    0' : '%+.1f'.format(v); }) +
        this.territory.toText(function (v) { return POT2CHAR[2 + v * 2]; });
};

PotentialTerritory.prototype.image = function () {
    return this.territory.toLine(function (v) { return POT2CHAR[2 + v * 2]; });
};

// For unit tests
PotentialTerritory.prototype._grid = function (first) {
    return this.grids[first];
};

PotentialTerritory.prototype._foresee = function (grid, first, second) {
    this.tmp = this.territory; // safe to use it as temp grid here
    this.reducedYx = null;
    var moveCount = this.goban.moveNumber();
    // enlarging starts with real grid
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    if (main.debug) main.log.debug('after 1st enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);

    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) main.log.debug('after reduce:\n' + this.reducedGrid);

    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    if (main.debug) main.log.debug('after 2nd enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);

    // passed grid will receive the result (scoring grid)
    this.boan.countScore(this.goban, grid.initFromGoban(this.goban));
    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    while (moveCount-- > 0) Stone.undo(this.goban);
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, first, second) {
    if (main.debug) main.log.debug('enlarge ' + first + ',' + second);
    var inYx = inGrid.yx;
    var outYx = outGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (inYx[j][i] !== EMPTY) {
                continue;
            }
            this.enlargeAt(inYx, outYx, i, j, first, second);
        }
    }
};

// Reduces given grid using the real grid as reference.
// We can safely "reduce" if no enemy was around at the end of the enlarging steps.
PotentialTerritory.prototype.reduce = function (grid) {
    var yx = grid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            // cannot reduce a real stone
            if (this.realYx[j][i] !== EMPTY) continue;
            
            var color = yx[j][i];
            // if we did not enlarge here, no need to reduce
            if (color === EMPTY) continue;

            // reduce if no enemy was around
            var enemies = this.inContact(yx, i, j, 1 - color);
            if (enemies === 0) {
                yx[j][i] = EMPTY;
            }
        }
    }
};

// "enlarge" around a given spot
// Note we read and write on separate grids
PotentialTerritory.prototype.enlargeAt = function (inYx, outYx, i, j, first, second) {
    switch (this.inContact(inYx, i, j, first)) {
    case 0: // no ally in line, check diagonal too
        if (!this.diagonalMoveOk(inYx, i, j, first, second)) return;
        break;
    case 4: // no need to fill the void
        return;
    case 3: // fill only if enemy is around
        if (this.inContact(inYx, i, j, second) === 0) return;
    }
    return this.addStone(outYx, i, j, first);
};

// Add a stone on given grid.
// When the reduced grid is known, use it and play moves on goban too.
PotentialTerritory.prototype.addStone = function (yx, i, j, color, border) {
    if (this.reducedYx) {
        // skip if useless move (it was reduced)
        if (!border && this.reducedYx[j][i] === EMPTY) {
            return;
        }
        // we check only against sucicide (e.g. no need to check against ko or non empty)
        var stone = this.goban.stoneAt(i, j);
        if (stone.moveIsSuicide(color)) {
            return;
        }
        Stone.playAt(this.goban, i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.inContact = function (yx, i, j, color) {
    var num = 0;
    for (var dir = UP; dir <= LEFT; dir++) {
        var vect = XY_AROUND[dir];
        if (yx[j + vect[1]][i + vect[0]] === color) {
            num++;
        }
    }
    return num;
};

// Authorises a diagonal move if first color is on a diagonal stone from i,j
// AND if second color is not next to this diagonal stone
PotentialTerritory.prototype.diagonalMoveOk = function (yx, i, j, first, second) {
    for (var v = 0; v < 4; v++) {
        var vect = XY_DIAGONAL[v];
        if (yx[j + vect[1]][i + vect[0]] !== first) continue;
        if (yx[j + vect[1]][i] === second || yx[j][i + vect[0]] === second) continue;
        return true;
    }
    return false;
};

// Returns the position of specified border stone
function borderPos(dir, n, gsize) {
    switch (dir) {
    case UP: return [n, 1]; // bottom border
    case RIGHT: return [1, n]; // facing right => left border
    case DOWN: return [n, gsize]; // facing down => top border
    case LEFT: return [gsize, n]; // right border
    }
}

PotentialTerritory.prototype._prepareBorderConnect = function () {
    var points = [];
    for (var dir = UP; dir <= LEFT; dir++) {
        var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
        for (var n = this.gsize - 1; n >= 2; n--) {
            var p = borderPos(dir, n, this.gsize);
            points.push([p[0], p[1], dx, dy]);
        }
    }
    this.borderPoints = points;
};

/** Example for left border: (direction = RIGHT)
 G=GOAL, S=SPOT, L=LEFT, R=RIGHT (left & right could be switched, it does not matter)
 +
 L0 L1 L2
 G  S1 S2 S3
 R0 R1 R2
 +
 */
PotentialTerritory.prototype.connectToBorders = function (yx) {
    var points = this.borderPoints;
    var l0, r0, l1, r1, l2, r2;
    for (var i = points.length - 1; i >=0; i--) {
        var p = points[i];
        var gi = p[0], gj = p[1];
        if (yx[gj][gi] !== EMPTY) continue;
        var dx = p[2], dy = p[3]; // direction from border to center
        var s1i = gi + dx, s1j = gj + dy; // spot 1
        var color = yx[s1j][s1i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s2i = s1i + dx, s2j = s1j + dy;
        color = yx[s2j][s2i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 === color && l1 === color) continue;
            if (r0 === color && r1 === color) continue;
            this.addStone(yx, s1i, s1j, color, true);
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s3i = s2i + dx, s3j = s2j + dy;
        color = yx[s3j][s3i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            l2 = yx[s2j-dx][s2i-dy]; r2 = yx[s2j+dx][s2i+dy];
            if (l0 === color && l1 === color && l2 === color) continue;
            if (r0 === color && r1 === color && r2 === color) continue;
            this.addStone(yx, s2i, s2j, color, true);
            if (l0 === color && l1 === color) continue;
            if (r0 === color && r1 === color) continue;
            this.addStone(yx, s1i, s1j, color, true);
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
    }
};

},{"./BoardAnalyser":5,"./Grid":9,"./Stone":17,"./main":32}],15:[function(require,module,exports){
//Translated from score_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var BoardAnalyser = require('./BoardAnalyser');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function ScoreAnalyser() {
    this.goban = null;
    this.analyser = new BoardAnalyser();
}
module.exports = ScoreAnalyser;

// Compute simple score difference for a AI-AI game (score info not needed)
ScoreAnalyser.prototype.computeScoreDiff = function (goban, komi) {
    this.analyser.countScore(goban);
    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;
    var b = scores[BLACK] + prisoners[WHITE];
    var w = scores[WHITE] + prisoners[BLACK] + komi;
    return b - w;
};

// Returns score info as an array of strings
ScoreAnalyser.prototype.computeScore = function (goban, komi, whoResigned) {
    this.startScoring(goban, komi, whoResigned);
    var txt = this.scoreInfoToS(this.scoreInfo);
    return txt;
};

// Initialize scoring phase
ScoreAnalyser.prototype.startScoring = function (goban, komi, whoResigned) {
    this.goban = goban;
    if (whoResigned !== undefined && whoResigned !== null) {
        var winner = Grid.COLOR_NAMES[1 - whoResigned];
        var other = Grid.COLOR_NAMES[whoResigned];
        this.scoreInfo = winner + ' won (since ' + other + ' resigned)';
        return this.scoreInfo;
    }
    this.analyser.countScore(goban);
    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;
    var totals = [];
    var details = [];
    var addPris = true;
    for (var c = BLACK; c <= WHITE; c++) {
        var kom = (( c === WHITE ? komi : 0 ));
        var pris = (( addPris ? prisoners[1 - c] : -prisoners[c] ));
        totals[c] = scores[c] + pris + kom;
        details[c] = [scores[c], pris, kom];
    }
    this.scoreInfo = [totals, details];
    return this.scoreInfo;
};

ScoreAnalyser.prototype.getScore = function () {
    return this.scoreInfoToS(this.scoreInfo);
};

function pointsToString(n) {
    return ( n !== 1 ? n + ' points' : '1 point' );
}

ScoreAnalyser.prototype.scoreInfoToS = function (info) {
    if (main.isA(String, info)) { // for games where all but 1 resigned
        return [info];
    }
    if (!info || info.length !== 2) {
        throw new Error('Invalid score info: ' + info);
    }
    var totals = info[0];
    var details = info[1];
    if (totals.length !== details.length) {
        throw new Error('Invalid score info');
    }
    var s = [];
    var diff = totals[0] - totals[1];
    s.push(this.scoreDiffToS(diff));

    for (var c = 0; c < 2; c++) {
        var detail = details[c];
        if (detail === null) {
            s.push(Grid.colorName(c) + ' resigned');
            continue;
        }
        if (detail.length !== 3) {
            throw new Error('Invalid score details');
        }
        var score = detail[0];
        var pris = detail[1];
        var komi = detail[2];
        var komiStr = (( komi > 0 ? ' + ' + komi + ' komi' : '' ));
        s.push(Grid.colorName(c) + ' (' + Grid.colorToChar(c) + '): ' +
            pointsToString(totals[c]) + ' (' + score + ' ' +
            ( pris < 0 ? '-' : '+' ) + ' ' + Math.abs(pris) + ' prisoners' +
            komiStr + ')');
    }
    return s;
};

ScoreAnalyser.prototype.scoreDiffToS = function (diff) {
    if (diff === 0) return 'Tie game';
    var win = ( diff > 0 ? BLACK : WHITE );
    return Grid.colorName(win) + ' wins by ' + pointsToString(Math.abs(diff));
};

},{"./BoardAnalyser":5,"./Grid":9,"./main":32}],16:[function(require,module,exports){
//Translated from sgf_reader.rb using babyruby2js
'use strict';

var main = require('./main');
// Example:
// (;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]
// SO[http://www.littlegolem.com];B[pd];W[pp];
// B[ce];W[dc]...;B[tt];W[tt];B[tt];W[aq])


/** @class public read-only attribute: boardSize, komi, handicap, handicapStones
 */
function SgfReader(sgf) {
    this.text = sgf;
    this.nodes = [];
    this.boardSize = 19;
    this.handicap = 0;
    this.handicapStones = [];
    this.komi = 6.5;
    this.parseGameTree(sgf + '');
    return this.getGameInfo();
}
module.exports = SgfReader;

// Raises an exception if we could not convert the format
SgfReader.prototype.toMoveList = function () {
    // NB: we verify the expected player since our internal move format
    // does not mention the player each time.
    var expectedPlayer = 'B';
    var moves = '';
    if (this.handicap > 0) {
        expectedPlayer = 'W';
        if (this.handicapStones.length !== 0) {
            if (this.handicapStones.length !== this.handicap) {
                throw new Error('List of ' + this.handicapStones.length + ' handicap stones given does not match the handicap number of ' + this.handicap);
            }
            moves = 'hand:' + this.handicap + '=' + this.handicapStones.join('-') + ',';
        } else {
            moves = 'hand:' + this.handicap + ',';
        }
    }
    for (var i = 1; i <= this.nodes.length - 1; i++) {
        var name = this.nodes[i][0];
        var value = this.nodes[i][1];
        if (name !== 'B' && name !== 'W') {
            if (name !== 'C') { // comments can be ignored
                main.log.warn('Unknown property ' + name + '[' + value + '] ignored');
            }
            continue;
        }
        if (name !== expectedPlayer) {
            throw new Error('Move for ' + expectedPlayer + ' was expected and we got ' + name + ' instead');
        }
        moves += this.convertMove(value) + ',';
        expectedPlayer = (( expectedPlayer === 'B' ? 'W' : 'B' ));
    }
    return moves.chop();
};

//private;
SgfReader.prototype.getGameInfo = function () {
    var header = this.nodes[0];
    if (!header || header[0] !== 'FF') {
        throw new Error('SGF header missing');
    }
    for (var p = 0; p <= header.length - 1; p += 2) {
        var name = header[p];
        var val = header[p + 1];
        switch (name) {
        case 'FF':
            if (parseInt(val) < 4) {
                main.log.warn('SGF version FF[' + val + ']. Not sure we handle it.');
            }
            break;
        case 'SZ':
            this.boardSize = parseInt(val);
            break;
        case 'HA':
            this.handicap = parseInt(val);
            break;
        case 'AB':
            this.handicapStones.push(this.convertMove(val));
            break;
        case 'KM':
            this.komi = parseFloat(val);
            break;
        case 'RU':
        case 'RE':
        case 'PB':
        case 'PW':
        case 'BR':
        case 'WR':
        case 'BT':
        case 'WT':
        case 'TM':
        case 'DT':
        case 'EV':
        case 'RO':
        case 'PC':
        case 'GN':
        case 'ON':
        case 'GC':
        case 'SO':
        case 'US':
        case 'AN':
        case 'CP':
            //NOP
            break;
        default: 
            main.log.info('Unknown property in SGF header: ' + name + '[' + val + ']');
        }
    }
};

SgfReader.prototype.convertMove = function (sgfMove) {
    if (sgfMove === 'tt') {
        return 'pass';
    }
    var i = sgfMove[0];
    if (i >= 'i') i = String.fromCharCode(i.charCodeAt() + 1);
    return i + (this.boardSize - (sgfMove[1].charCodeAt() - 'a'.charCodeAt())).toString();
};

SgfReader.prototype.parseGameTree = function (t) {
    t = this.skip(t);
    t = this.get('(', t);
    t = this.parseNode(t);
    this.finished = false;
    while (!this.finished) {
        t = this.parseNode(t);
    }
    return this.get(')', t);
};

SgfReader.prototype.parseNode = function (t) {
    t = this.skip(t);
    if (t[0] !== ';') {
        this.finished = true;
        return t;
    }
    t = this.get(';', t);
    var node = [];
    while (true) {
        var i = 0;
        while (t[i] && t[i].between('A', 'Z')) {
            i += 1;
        }
        var propIdent = t.substr(0, i);
        if (propIdent === '') {
            this.error('Property name expected', t);
        }
        node.push(propIdent);
        t = this.get(propIdent, t);
        while (true) {
            t = this.get('[', t);
            var brace = t.indexOf(']');
            if (brace < 0) {
                this.error('Missing \']\'', t);
            }
            var val = t.substr(0, brace);
            node.push(val);
            t = this.get(val + ']', t);
            if (t[0] !== '[') {
                break;
            }
            node.push(null); // multiple values, we use nil as name for 2nd, 3rd, etc.
        }
        if (!t[0] || !t[0].between('A', 'Z')) {
            break;
        }
    }
    this.nodes.push(node);
    return t;
};

SgfReader.prototype.skip = function (t) {
    return t.trimLeft();
};

SgfReader.prototype.get = function (lex, t) {
    if (!t.startWith(lex)) {
        this.error(lex + ' expected', t);
    }
    return t.replace(lex, '').trimLeft();
};

SgfReader.prototype.error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t.substr(0, 20) + '...');
};

// E02: unknown method: info(...)
// E02: unknown method: index(...)
},{"./main":32}],17:[function(require,module,exports){
//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');

var EMPTY = main.EMPTY;

/** @class A "stone" stores everything we want to keep track of regarding an intersection on the board.
 *  By extension, an empty intersection is also a stone, with a color attribute equals to EMPTY.
 *  This class is also the entry point for moves in general, so it has methods to play or undo,
 *  and verify if a planned move is authorized.
 *  public read-only attribute: goban, group, color, i, j, neighbors
 */
function Stone(goban, i, j, color) {
    this.goban = goban;
    this.i = i;
    this.j = j;
    this.color = color;
    this.group = null;
    this._uniqueAlliesId = [];
    this._uniqueAllies = [];
}
module.exports = Stone;

Stone.XY_AROUND = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // top, right, bottom, left
Stone.XY_DIAGONAL = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top-right, bottom-right, bottom-left, top-left

Stone.prototype.clear = function () {
    this.color = EMPTY;
    this.group = null;
    this._uniqueAlliesId.clear();
    this._uniqueAllies.clear();
};

// Computes each stone's neighbors (called for each stone after init)
// NB: Stones next to side have only 3 neighbors, and the corner stones have 2
Stone.prototype.findNeighbors = function () {
    // neighbors contains the neighboring stones (empty or not); no need to compute coordinates anymore
    this.neighbors = [];
    var coords = Stone.XY_AROUND;
    for (var i = coords.length - 1; i >= 0; i--) {
        var stone = this.goban.stoneAt(this.i + coords[i][0], this.j + coords[i][1]);
        if (stone !== main.BORDER) {
            this.neighbors.push(stone);
        }
    }
};

Stone.prototype.toString = function () {
    if (this.color === EMPTY) {
        return 'empty:' + this.asMove();
    } else {
        return 'stone' + Grid.colorToChar(this.color) + ':' + this.asMove();
    }
};

// Returns "c3" for a stone in 3,3
Stone.prototype.asMove = function () {
    return '' + Grid.moveAsString(this.i, this.j);
};

Stone.prototype.debugDump = function () {
    return this.toString(); // we could add more info
};

// Returns a string with the list of empty points, sorted (debug only)
Stone.prototype.emptiesDump = function () {
    return this.empties().map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

Stone.prototype.isEmpty = function () {
    return this.color === EMPTY;
};

Stone.validMove = function (goban, i, j, color) {
    // Remark: no log here because of the noise created with web server mode
    if (!goban.validMove(i, j)) { // also checks if empty
        return false;
    }
    var stone = goban.stoneAt(i, j);
    if (stone.moveIsSuicide(color)) {
        return false;
    }
    if (stone._moveIsKo(color)) {
        return false;
    }
    return true;
};

// Is a move a suicide?
// not a suicide if 1 free life around
// or if one enemy group will be killed
// or if the result of the merge of ally groups will have more than 0 life
Stone.prototype.moveIsSuicide = function (color) {
    for (var i = this.neighbors.length - 1; i >= 0; i--) {
        var s = this.neighbors[i];
        if (s.color === EMPTY) {
            return false;
        } else if (s.color !== color) {
            if (s.group.lives === 1) return false; // we kill 1 group
        } else {
            if (s.group.lives > 1) return false; // our neighbor group will still have lives left
        }
    }
    // $log.debug("move #{@i}, #{@j}, color:#{color} would be a suicide") if $debug
    return true;
};

// Is a move a ko?
// if the move would kill with stone i,j a single stone A (and nothing else!)
// and the previous move killed with stone A a single stone B in same position i,j
// then it is a ko
Stone.prototype._moveIsKo = function (color) {
    // 1) Must kill a single group
    // NB: we don't need to iterate on unique groups because on condition #2 below
    var groupA = null;
    //TODO: check here if we always have the unique allies ready anyway
    for (var n = this.neighbors.length - 1; n >= 0; n--) {
        var enemy = this.neighbors[n].group;
        if (!enemy || enemy.color !== 1 - color) continue;
        if (enemy.lives !== 1) continue;
        if (groupA) return false;
        groupA = enemy;
    }
    if (!groupA) return false;

    // 2) This killed group must be a single stone A
    if (groupA.stones.length !== 1) {
        return false;
    }
    var stoneA = groupA.stones[0];
    // 3) Stone A was played just now
    if (this.goban.previousStone() !== stoneA) {
        return false;
    }
    // 4) Stone B was killed by A in same position we are looking at
    var groupB = this.goban.killedGroups[this.goban.killedGroups.length-1];
    if (groupB.killedBy !== stoneA) {
        return false;
    }
    if (groupB.stones.length !== 1) {
        return false;
    }
    var stoneB = groupB.stones[0];
    if (stoneB.i !== this.i || stoneB.j !== this.j) {
        return false;
    }
    //if (main.debug) main.log.debug('ko in ' + this.toString() + ', color:' + color + ' cannot be played now');
    return true;
};

Stone.prototype.die = function () {
    this.color = EMPTY;
    this.group = null;
};

Stone.prototype.resuscitateIn = function (group) {
    this.group = group;
    this.color = group.color;
};

Stone.playAt = function (goban, i, j, color) {
    var stone = goban.putDown(i, j);
    stone._putDown(color);
    return stone;
};

// Called to undo a single stone (the main undo feature relies on this)  
Stone.undo = function (goban) {
    var stone = goban.takeBack();
    if (!stone) return;
    if (main.debug) main.log.debug('Stone.undo ' + stone);
    stone._takeBack();
};

// Called for each new stone played
Stone.prototype._putDown = function (color) {
    this.color = color;
    if (main.debug) main.log.debug('put_down: ' + this.toString());

    var allies = this.uniqueAllies(color); // note we would not need unique if group#merge ignores dupes

    this.goban.moveId = undefined; // we can do better later; easier for now...

    if (allies.length === 0) {
        this.group = this.goban.newGroup(this, this.numEmpties());
    } else {
        this.group = allies[0];
        this.group.connectStone(this);
    }
    // kill before merging to get the right live-count in merged subgroups
    var enemies = this.uniqueAllies(1 - color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        enemies[e].attackedBy(this);
    }
    for (var a = 1; a < allies.length; a++) {
        this.group.merge(allies[a], this);
    }
    this.goban.updateMoveId(+1);
};

Stone.prototype._takeBack = function () {
    if (main.debugGroup) main.log.debug('_takeBack: ' + this.toString() + ' from group ' + this.group);

    this.goban.moveId = undefined; // we can do better later; easier for now...

    this.group.unmergeFrom(this);
    this.group.disconnectStone(this);
    var enemies = this.uniqueAllies(1 - this.color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        enemies[e].notAttackedAnymore(this);
    }
    var logGroup;
    if (main.debugGroup) logGroup = this.group;

    this.group = null;
    this.color = EMPTY;
    Group.resuscitateFrom(this, this.goban);
    if (main.debugGroup) main.log.debug('_takeBack: end; main group: ' + logGroup.debugDump());

    this.goban.updateMoveId(-1);
};

Stone.prototype.setGroupOnMerge = function (newGroup) {
    this.group = newGroup;
};

Stone.prototype.uniqueAllies = function (color) {
    var isCached;
    if (this.goban.moveId && this._uniqueAlliesId[color] === this.goban.moveId) {
    //    return this._uniqueAllies[color];
         isCached = true;
    }
    var allies = [];
    var neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === color && !allies.contains(s.group)) {
            allies.push(s.group);
        }
    }
    if (isCached) {
        var msg = main.compareValue(allies, this._uniqueAllies[color]);
        if (msg)
            console.warn('uniqueAllies cache is wrong:', msg);
        main.count++;
    } else {
        this._uniqueAlliesId[color] = this.goban.moveId;
        this._uniqueAllies[color] = allies;
    }
    return allies;
};

Stone.prototype.uniqueEnemies = function (allyColor) {
    return this.uniqueAllies(1 - allyColor);
};

// Returns the empty points around this stone
Stone.prototype.empties = function () {
//main.count++;
    var empties = [], neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === EMPTY) empties.push(s);
    }
    return empties;
};

// Number of empty points around this stone
Stone.prototype.numEmpties = function () {
//main.count++;
    var count = 0, neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].color === EMPTY) count++;
    }
    return count;
};

/** Returns the count of ally stones around.
 *  If an array is passed, the stones are pushed on it. */
Stone.prototype.allyStones = function (color, array) {
    var count = 0, neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].color === color) {
            if (array) array.push(neighbors[i]);
            count++;
        }
    }
    return count;
};

},{"./Grid":9,"./Group":10,"./main":32}],18:[function(require,module,exports){
//Translated from stone_constants.rb using babyruby2js
'use strict';

var main = require('./main');
// Special stone values in goban
main.BORDER = null;
// Colors
main.EMPTY = -1;
main.BLACK = 0;
main.WHITE = 1;
},{"./main":32}],19:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class public read-only attribute: grid
 *  if a grid is given, it is used as starting point; 
 *  otherwise, the goban scoring_grid is used.
 */
function ZoneFiller(goban, grid) {
    if (!grid) {
        grid = goban.scoringGrid.initFromGoban(goban);
    }
    this.goban = goban;
    this.grid = grid;
    this.yx = grid.yx;
    this.groups = null;
}
module.exports = ZoneFiller;

// "Color" a goban zone.
// to_replace can be EMPTY or a zone code (but cannot be a real color like BLACK)
// neighbors, if given should be an array of n arrays, with n == number of colors
// if neighbors are not given, we do simple "coloring"
ZoneFiller.prototype.fillWithColor = function (startI, startJ, toReplace, color, neighbors) {
    // $log.debug("fill #{start_i} #{start_j}; replace #{to_replace} with #{color}") if $debug
    if (this.yx[startJ][startI] !== toReplace) return 0;
    var vcount = 0;
    this.toReplace = toReplace;
    this.groups = neighbors;
    var gap, gaps = [[startI, startJ, startJ]];

    while ((gap = gaps.pop())) {
        // $log.debug("About to do gap: #{gap} (left #{gaps.size})") if $debug
        var i = gap[0], j0 = gap[1], j1 = gap[2];
        
        if (this.yx[j0][i] !== toReplace) continue; // gap already done by another path

        while (this._check(i, j0 - 1)) j0--;
        while (this._check(i, j1 + 1)) j1++;

        vcount += j1 - j0 + 1;
        // $log.debug("Doing column #{i} from #{j0}-#{j1}") if $debug
        for (var ix = i - 1; ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                // $log.debug("=>coloring #{i},#{j}") if $debug and ix<i
                if (ix < i) this.yx[j][i] = color;
                // $log.debug("checking neighbor #{ix},#{j}") if $debug
                if (this._check(ix, j)) {
                    if (!curgap) {
                        // $log.debug("New gap in #{ix} starts at #{j}") if $debug
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    // $log.debug("--- pushing gap [#{ix},#{curgap},#{j-1}]") if $debug
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            } // for j
            // $log.debug("--- pushing gap [#{ix},#{curgap},#{j1}]") if $debug and curgap
            if (curgap) gaps.push([ix, curgap, j1]); // last gap
        } // for ix
    } // while gap
    return vcount;
};

//private

// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === main.BORDER) return false;
    if (color === this.toReplace) return true;

    if (this.groups && color < 2) {
        var group = this.goban.stoneAt(i, j).group;
        if (group && this.groups[color].indexOf(group) < 0) {
            this.groups[color].push(group);
        }
    }
    return false;
};

},{"./main":32}],20:[function(require,module,exports){
//Translated from ai1_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var allHeuristics = require('./AllHeuristics');
var main = require('../main');
var Grid = require('../Grid');
var Stone = require('../Stone');
var Player = require('../Player');
var InfluenceMap = require('../InfluenceMap');
var PotentialTerritory = require('../PotentialTerritory');
var BoardAnalyser = require('../BoardAnalyser');
var Genes = require('../Genes');

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class
 *  public read-only attribute: goban, inf, ter, enemyColor, genes
 *  TODO: 
 *  - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
 *  - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
 *  - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
 *  - an eye shape constructor
 */
function Ai1Player(goban, color, genes) {
    if (genes === undefined) genes = null;
    Player.call(this, false, goban);
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.boan = new BoardAnalyser();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize);
    this.scoreGrid = new Grid(this.gsize);

    this.genes = (( genes ? genes : new Genes() ));
    this.minimumScore = this.getGene('smaller-move', 0.033, 0.02, 0.066);

    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var i = 0; i < heuristics.length; i++) {
        var h = new (heuristics[i])(this);
        this.heuristics.push(h);
    }
    this.setColor(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    return this.prepareGame(this.genes);
}
inherits(Ai1Player, Player);
module.exports = Ai1Player;

Ai1Player.prototype.getHeuristic = function (heuristicName) {
    for (var n = this.heuristics.length - 1; n >= 0; n--) {
        var h = this.heuristics[n];
        if (h.constructor.name === heuristicName) return h;
    }
    throw new Error('Invalid heuristic name: ' + heuristicName);
};

Ai1Player.prototype.prepareGame = function (genes) {
    this.genes = genes;
    this.numMoves = 0;
};

Ai1Player.prototype.setColor = function (color) {
    Player.prototype.setColor.call(this, color);
    this.enemyColor = 1 - color;
    for (var i = 0; i < this.heuristics.length; i++) {
        this.heuristics[i].initColor();
    }
};

Ai1Player.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

function score2str(i, j, score) {
    return Grid.moveAsString(i, j) + ':' + score.toFixed(3);
}

Ai1Player.prototype._foundSecondBestMove = function(i, j, score) {
    if (main.debug) {
        main.log.debug('=> ' + score2str(i,j,score) + ' becomes 2nd best move');
        if (this.secondBestI !== NO_MOVE) main.log.debug(' (replaces ' + score2str(this.secondBestI, this.secondBestJ, this.secondBestScore) + ')');
    }
    this.secondBestScore = score;
    this.secondBestI = i; this.secondBestJ = j;
};

Ai1Player.prototype._foundBestMove = function(i, j, score) {
    if (main.debug) {
        if (this.numBestTwins > 1) {
            main.log.debug('=> TWIN ' + score2str(i, j, score) + ' replaces equivalent best move ' + score2str(this.bestI, this.bestJ, this.bestScore));
        } else if (this.bestI !== NO_MOVE) {
            main.log.debug('=> ' + score2str(i, j, score) + ' becomes the best move');
        }
    }
    if (this.numBestTwins === 1) {
        this._foundSecondBestMove(this.bestI, this.bestJ, this.bestScore);
    }
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
};

Ai1Player.prototype._keepBestMoves = function(i, j, score) {
    // Keep the best move and the 2nd best move
    if (score < this.bestScore) {
        this._foundSecondBestMove(i, j, score);
    } else if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score);
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score);
    }
};


var sOK = 0, sINVALID = -1, sBLUNDER = -2;

// TMP: Called by heuristics which do not handle evalBoard yet
Ai1Player.prototype.boardIterator = function (evalFn) {
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            scoreYx[j][i] += evalFn(i, j);
        }
    }
};

// Returns the move chosen (e.g. c4 or pass)
// You can also check:
//   player.bestScore to see the score of the move returned
//   player.secondBestScore
Ai1Player.prototype.getMove = function () {
    this.numMoves++;
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
    this._prepareEval();

    // init grids (and mark invalid moves)
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    var i,j;
    for (j = 1; j <= this.gsize; j++) {
        for (i = 1; i <= this.gsize; i++) {
            if (!Stone.validMove(this.goban, i, j, this.color)) {
                stateYx[j][i] = sINVALID;
                continue;
            }
            stateYx[j][i] = sOK;
            scoreYx[j][i] = 0;
        }
    }
    // do eval using each heuristic (NB: order is important)
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].evalBoard(stateYx, scoreYx);
    }
    // now collect best score (and 2nd best)
    for (j = 1; j <= this.gsize; j++) {
        for (i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] >= sOK && scoreYx[j][i] > this.secondBestScore) {
                this._keepBestMoves(i, j, scoreYx[j][i]);
            }
        }
    }
    if (this.bestScore <= this.minimumScore) {
        return 'pass';
    }
    return Grid.moveAsString(this.bestI, this.bestJ);
};

Ai1Player.prototype._prepareEval = function () {
    this.currentMove = this.goban.moveNumber();
    this.bestScore = this.secondBestScore = this.minimumScore;
    this.bestI = this.secondBestI = NO_MOVE;
    this.survey = null;

    this.inf.buildMap();
    this.ter.guessTerritories();
    this.boan.countScore(this.goban);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Ai1Player.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    main.log.debug(Grid.moveAsString(i, j) + ' seen as blunder: ' + reason);
};

/** For tests */
Ai1Player.prototype._testMoveEval = function (i, j) {
    if (this.currentMove !== this.goban.moveNumber()) this.getMove();
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    // to get eval "again", set the state back to OK even if it got marked invalid later
    if (Stone.validMove(this.goban, i, j, this.color)) stateYx[j][i] = sOK;
    var score = 0, survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        scoreYx[j][i] = 0;
        h.evalBoard(stateYx, scoreYx);
        var s = scoreYx[j][i];
        if (s) survey[h.constructor.name] = s;
        score += s;
    }
    this.survey = survey;
    return score;
};

/** For tests */
Ai1Player.prototype.testMoveEval = function (i, j) {
    var score = this._testMoveEval(i, j);

    this._foundBestMove(i, j, score);
    this.secondBestI = NO_MOVE;
    return score;
};

/** For tests */
Ai1Player.prototype.testHeuristic = function (i, j, heuristicName) {
    if (this.currentMove !== this.goban.moveNumber()) this.getMove();
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    this.getMove();
    stateYx[j][i] = sOK;
    scoreYx[j][i] = 0;
    var h = this.getHeuristic(heuristicName);
    h.evalBoard(stateYx, scoreYx);
    return scoreYx[j][i];
};

Ai1Player.prototype.getMoveSurveyText = function (rank) {
    var survey, score, move;
    switch (rank) {
    case 1:
        if (this.bestI === NO_MOVE) break;
        this._testMoveEval(this.bestI, this.bestJ);
        survey = this.survey; score = this.bestScore;
        move = Grid.moveAsString(this.bestI, this.bestJ);
        break;
    case 2:
        if (this.secondBestI === NO_MOVE) break;
        this._testMoveEval(this.secondBestI, this.secondBestJ);
        survey = this.survey; score = this.secondBestScore;
        move = Grid.moveAsString(this.secondBestI, this.secondBestJ);
        break;
    }
    if (!survey) return '';
    var txt = 'Stats of ' + move + ' (' + score.toFixed(3) + '):\n';
    for (var h in survey) {
        if (survey[h] === 0) continue;
        txt += '- ' + h + ': ' + survey[h].toFixed(3) + '\n';
    }
    return txt;
};


},{"../BoardAnalyser":5,"../Genes":7,"../Grid":9,"../InfluenceMap":12,"../Player":13,"../PotentialTerritory":14,"../Stone":17,"../main":32,"./AllHeuristics":21,"util":4}],21:[function(require,module,exports){
//Translated from all_heuristics.rb using babyruby2js
'use strict';

// When creating a new heuristic, remember to add it here.
var Spacer = require('./Spacer');
var Executioner = require('./Executioner');
var Savior = require('./Savior');
var Hunter = require('./Hunter');
var Connector = require('./Connector');
var Pusher = require('./Pusher');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var Shaper = require('./Shaper');


var allHeuristics = function () {
    return [Executioner, Savior, Hunter, Connector, Spacer, Pusher, NoEasyPrisoner, Shaper];
};
module.exports = allHeuristics;

},{"./Connector":22,"./Executioner":23,"./Hunter":25,"./NoEasyPrisoner":26,"./Pusher":27,"./Savior":28,"./Shaper":29,"./Spacer":30}],22:[function(require,module,exports){
//Translated from connector.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Heuristic = require('./Heuristic');
var Grid = require('../Grid');


/** @class A move that connects 2 of our groups is good.
 */
function Connector(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);
    this.allyCoeff1 = this.getGene('ally-1enemy', 0.33, 0.01, 1.0);
    this.allyCoeff2 = this.getGene('ally-more-enemies', 1.66, 0.01, 3.0);
}
inherits(Connector, Heuristic);
module.exports = Connector;

Connector.prototype.evalMove = function (i, j) {
    return this.connectsMyGroups(i, j, this.color) +
           this.connectsMyGroups(i, j, 1 - this.color);
};

Connector.prototype.connectsMyGroups = function (i, j, color) {
    // TODO: one other way to connect 2 groups is to "protect" the cutting point; handle this here
    var stone = this.goban.stoneAt(i, j);
    var s1, s1b, s2, s2b, s3;
    var numStones = 0, numEnemies = 0;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case main.EMPTY: continue;
        case color:
            numStones++;
            if (!s1) {
                s1 = s;
            } else if (!s2) {
                if (s.group !== s1.group) s2 = s; else s1b = s;
            } else {
                if (s.group !== s2.group) s3 = s; else s2b = s;
            }
            break;
        default: numEnemies++;
        }
    }
    if (!s2) return 0; // nothing to connect here
    if (numStones === 4) return 0; // 1 empty between 4 stones; never connect unless forced to
    // 3 of our stones around: no need to connect unless enemy comes by
    if (numStones === 3 && numEnemies === 0) return 0;

    var numGroups = s3 ? 3 : 2;
    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // No need to connect if both connection points are free (no cutting stone yet)
        if (this.goban.isEmpty(s1.i, s2.j) && this.goban.isEmpty(s2.i, s1.j)) return 0;
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    var score;
    if (numEnemies === 0) {
        score = this.inflCoeff / this.inf.map[j][i][color];
    } else {
        score = this.allyCoeff1 * numGroups;
    }
    if (main.debug) {
        main.log.debug('Connector for ' + Grid.colorName(color) + ' gives ' + score.toFixed(3) + ' to ' + i + ',' + j +
            ' (allies:' + numGroups + ' enemies: ' + numEnemies + ')');
    }
    return score;
};

},{"../Grid":9,"../main":32,"./Heuristic":24,"util":4}],23:[function(require,module,exports){
//Translated from executioner.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Executioner only preys on enemy groups in atari
var Heuristic = require('./Heuristic');

/** @class */
function Executioner(player) {
    Heuristic.call(this, player);
}
inherits(Executioner, Heuristic);
module.exports = Executioner;


// In this board, c5 is a "sure death" move
// 5 O@+OO
// 4 O@O@+
// 3 OO@@+
// 2 ++@++
// 1 ++@++
//   abcde
Executioner.prototype.isSureDeath = function (empty, color) {
    var numKill = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            return false;
        case color:
            if (n.group.lives > 1) return false; // TODO: where do we worry about life of group?
            break;
        default:
            if (n.group.lives > 1) break; // not a kill
            if (n.group.stones.length > 1) return false; // kill more than 1 stone
            if (numKill) return false; // kill at least 2 groups (hence more than 1 stone)
            numKill++;
        }
    }
    return true;
};

Executioner.prototype.evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    if (this.isSureDeath(stone, this.color)) {
        return this.markMoveAsBlunder(i, j, 'sure death');
    }
    var threat = 0, saving = 0;
    for (var g, g_array = stone.uniqueEnemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives > 1) { // NB: more than 1 is a job for hunter
            continue;
        }
        threat += this.groupThreat(g);
        for (var ally, ally_array = g.allEnemies(), ally_ndx = 0; ally=ally_array[ally_ndx], ally_ndx < ally_array.length; ally_ndx++) {
            if (ally.lives > 1) {
                continue;
            }
            saving += this.groupThreat(ally);
        }
    }
    if (threat === 0) {
        return 0;
    }
    if (main.debug) {
        main.log.debug('Executioner heuristic found a threat of ' + threat + ' at ' + i + ',' + j);
    }
    if (main.debug && saving > 0) {
        main.log.debug('...this would also save ' + saving);
    }
    return threat + saving;
};

},{"../main":32,"./Heuristic":24,"util":4}],24:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';

var main = require('../main');


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player, consultant) {
    this.player = player;
    this.consultant = !!consultant;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;
    this.boan = player.boan;

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);
}
module.exports = Heuristic;

Heuristic.prototype.initColor = function () {
    // For consultant heuristics we reverse the colors
    if (this.consultant) {
        this.color = this.player.enemyColor;
        this.enemyColor = this.player.color;
    } else {
        this.color = this.player.color;
        this.enemyColor = this.player.enemyColor;
    }
};

//TMP For heuristics which do not handle evalBoard yet
Heuristic.prototype.evalBoard = function (/*stateYx, scoreYx*/) {
    var self = this;
    this.player.boardIterator(function (i, j) {
        return self.evalMove(i, j);
    });
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

Heuristic.prototype.territoryScore = function (i, j, color) {
    var ter = this.ter.potential().yx;
    return ter[j][i] * ( color === main.BLACK ? 1 : -1);
};

// TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
Heuristic.prototype.groupThreat = function (g) {
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties();
    }
    return g.stones.length * 2 + // 2 points are pretty much granted for the prisonners
        this.spaceInvasionCoeff * numEmpties; //...and the "open gate" to territory will count a lot
};

Heuristic.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.player.markMoveAsBlunder(i, j, this.constructor.name + ':' + reason);
};

Heuristic.prototype.distanceFromStoneToBorder = function (stone) {
    var gsize = this.goban.gsize;
    var i = stone.i, j = stone.j;
    return Math.min(Math.min(i - 1, gsize - i), Math.min(j - 1, gsize - j));
};

Heuristic.prototype.diagonalStones = function (s1, s2) {
    return [this.goban.stoneAt(s1.i, s2.j), this.goban.stoneAt(s2.i, s1.j)];
};

Heuristic.prototype.distanceBetweenStones = function (s1, s2, color) {
    var dx = Math.abs(s2.i - s1.i), dy = Math.abs(s2.j - s1.j);
    if (dx + dy === 1) return 0; // already connected
    var enemy = 1 - color;
    var numEnemies = 0, between;
    if (dx === 1 && dy === 1) { // hane
        var diags = this.diagonalStones(s1, s2);
        if (diags[0].color === color || diags[1].color === color) return 0;
        if (diags[0].color === enemy) numEnemies++;
        if (diags[1].color === enemy) numEnemies++;
        if (numEnemies === 0) return 0; // safe hane
        if (numEnemies === 2) return 9; // cut!
        if (this.distanceFromStoneToBorder(s1) === 0 || this.distanceFromStoneToBorder(s2) === 0) {
            // hane close to border works even if 1 enemy unless another enemy is waiting on the border
            var empty = diags[0].color === enemy ? diags[1] : diags[0];
            if (empty.allyStones(enemy) !== 0) return 1;
            return 0;
        }
        return 1;
    }
    if (dx + dy === 2) {
        between = this.goban.stoneAt((s1.i + s2.i) / 2, (s1.j + s2.j) /2);
        if (between.color === color) return 0; // already connected
        if (between.color === enemy) return between.group.lives; // REVIEW ME
        for (var i = between.neighbors.length - 1; i >= 0; i--) {
            if (between.neighbors[i].color === enemy) numEnemies++;
        }
        if (numEnemies >= 1) return 1; // needs 1 move to connect (1 or 2 enemies is same)
        if (this.distanceFromStoneToBorder(s1) + this.distanceFromStoneToBorder(s2) === 0) {
            return 0; // along border with 0 enemy around is safe
        }
        return 0.5; // REVIEW ME
    }
    var d1 = this.distanceFromStoneToBorder(s1), d2 = this.distanceFromStoneToBorder(s2);
    if (dx + dy === 3 && d1 === 0 && d2 === 0) {
        // TODO code betweenStones and test it
        var betweens = this.betweenStones(s1, s2);
        var dist = 0;
        for (var b = betweens.length - 1; b >= 0; b--) {
            between = betweens[b];
            if (between.color === enemy) dist += between.group.lives;
            if (between.allyStones(enemy) !== 0) dist += 1;
        }
        return dist;
    }
    //TODO: add other cases like monkey-jump
    return dx + dy;
};

/** Evaluates if a new stone at i,j will be able to connect with a "color" group around.
 *  Basically this is to make sure i,j is not alone (and not to see if i,j is a connector!) */
// +@+
// O+O
// @*@ <-- TODO review this case; looks like white here cannot connect
Heuristic.prototype.canConnect = function (i, j, color) {
    var stone = this.goban.stoneAt(i,j);

    // first look around for empties and allies (a single ally means we connect!)
    var empties = [];
    for (var nNdx = stone.neighbors.length - 1; nNdx >= 0; nNdx--) {
        var n = stone.neighbors[nNdx];
        if (n.color === color && n.group.lives > 1) return n;
        if (n.color === main.EMPTY) empties.push(n);
    }
    // look around each empty for allies
    var moveNeeded = 2;
    for(var eNdx = empties.length - 1; eNdx >= 0; eNdx--) {
        var empty = empties[eNdx];
        for (var n2Ndx = empty.neighbors.length - 1; n2Ndx >= 0; n2Ndx--) {
            var en = empty.neighbors[n2Ndx];
            if (en === stone) continue; // same stone
            if (en.color !== color) continue; // empty or enemy
            if (en.group.lives === 1) continue; // TODO: look better at group's health
            var dist = this.distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

},{"../main":32}],25:[function(require,module,exports){
//Translated from hunter.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Stone = require('../Stone');
// Hunters find threats to struggling enemy groups.
// Ladder attack fits in here.
var Heuristic = require('./Heuristic');

/** @class */
function Hunter(player, consultant) {
    if (consultant === undefined) consultant = false;
    Heuristic.call(this, player, consultant);
}
inherits(Hunter, Heuristic);
module.exports = Hunter;

Hunter.prototype.evalMove = function (i, j, level) {
    if (level === undefined) level = 1;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var allies = stone.uniqueAllies(this.color);
    var egroups = null;
    var snapback = false;
    for (var eg, eg_array = stone.uniqueEnemies(this.color), eg_ndx = 0; eg=eg_array[eg_ndx], eg_ndx < eg_array.length; eg_ndx++) {
        if (eg.lives !== 2) { // NB if 1 this is a case for Executioner
            continue;
        }
        // if even a single of our groups around is in atari this will not work (enemy will kill our group and escape)
        var ourGroups = eg.allEnemies(), atari = false;
        for (var n = ourGroups.length - 1; n >= 0; n--) {
            if (ourGroups[n].lives < 2) { atari = true; break; }
        }
        if (atari) continue;
        
        if (empties.length === 1 && allies.length === 0) {
            // unless this is a snapback, this is a dumb move
            // it is a snapback if the last empty point (where the enemy will have to play) 
            // would not make the enemy group connect to another enemy group
            // (equivalent to: the empty point has no other enemy group as neighbor)
            var enemiesAroundEmpty = empties[0].uniqueAllies(eg.color);
            if (enemiesAroundEmpty.length !== 1 || enemiesAroundEmpty[0] !== eg) {
                continue;
            }
            // here we know this is a snapback
            snapback = true;
            if (main.debug) {
                main.log.debug('Hunter sees a snapback in ' + stone);
            }
        }
        if (main.debug) {
            main.log.debug('Hunter (level ' + level + ') looking at ' + i + ',' + j + ' threat on ' + eg);
        }
        if (!egroups) egroups = [eg];
        else egroups.push(eg);
    }
    if (!egroups) return 0;

    // unless snapback, make sure our new stone's group is not in atari
    if (!snapback && empties.length < 2) {
        var lives = empties.length;
        for (var ag, ag_array = allies, ag_ndx = 0; ag=ag_array[ag_ndx], ag_ndx < ag_array.length; ag_ndx++) {
            lives += ag.lives - 1;
        }
        if (lives < 2) {
            return 0;
        }
    }
    Stone.playAt(this.goban, i, j, this.color); // our attack takes one of the 2 last lives (the one in i,j)
    // filter out the attacks that fail
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (!this.atariIsCaught(egroups[g], level)) egroups.splice(g, 1);
    }
    Stone.undo(this.goban); // important to undo before, so we compute threat right
    if (!egroups.length) return 0; // none is caught
    
    // find the bigger threat if more than 1 chase is possible
    var threat = 0;
    for (g = egroups.length - 1; g >= 0; g--) {
        var t = this.groupThreat(egroups[g]);
        if (t > threat) threat = t;
    }
    if (main.debug) {
        main.log.debug('Hunter found a threat of ' + threat + ' at ' + i + ',' + j);
    }
    return threat;
};

Hunter.prototype.atariIsCaught = function (g, level) {
    if (level === undefined) level = 1;
    var allLives = g.allLives();
    if (allLives.length !== 1) {
        throw new Error('Unexpected: hunter #1: ' + allLives.length);
    }
    var lastLife = allLives[0];
    var stone = Stone.playAt(this.goban, lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this.escapingAtariIsCaught(stone, level);
    Stone.undo(this.goban);
    if (main.debug) {
        main.log.debug('Hunter: group in atari would be caught: ' + g);
    }
    return isCaught;
};

// stone is the atari escape move
Hunter.prototype.escapingAtariIsCaught = function (stone, level) {
    if (level === undefined) level = 1;
    var g = stone.group;
    if (g.lives > 2) {
        return false;
    }
    if (g.lives === 0) {
        return true;
    }
    // g.lives is 1 or 2
    for (var allyThreatened, allyThreatened_array = stone.neighbors, allyThreatened_ndx = 0; allyThreatened=allyThreatened_array[allyThreatened_ndx], allyThreatened_ndx < allyThreatened_array.length; allyThreatened_ndx++) {
        if (allyThreatened.color !== this.color) {
            continue;
        }
        if (allyThreatened.group.lives < g.lives) {
            return false;
        }
    }
    if (g.lives === 1) {
        return true;
    }
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) {
        throw new Error('Unexpected: hunter #2');
    }
    var e1 = empties[0]; // need to keep the empties ref since all_lives returns volatile content
    var e2 = empties[1];
    //  recursive descent
    if (main.debug) {
        main.log.debug('Enemy has 2 lives left: ' + e1 + ' and ' + e2);
    }
    return (this.evalMove(e1.i, e1.j, level + 1) > 0 || this.evalMove(e2.i, e2.j, level + 1) > 0);
};


},{"../Stone":17,"../main":32,"./Heuristic":24,"util":4}],26:[function(require,module,exports){
//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Stone = require('../Stone');
var main = require('../main');
// Should recognize when our move is foolish...
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);
    this.enemyHunter = new Hunter(player, true);
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;

NoEasyPrisoner.prototype.initColor = function () {
    Heuristic.prototype.initColor.call(this);
    return this.enemyHunter.initColor();
};

NoEasyPrisoner.prototype.evalMove = function (i, j) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).
    var stone = Stone.playAt(this.goban, i, j, this.color);
    var g = stone.group;
    var score = 0;
    if (g.lives === 1) {
        score = - this.groupThreat(g);
        if (main.debug) {
            main.log.debug('NoEasyPrisoner says ' + i + ',' + j + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) {
            main.log.debug('NoEasyPrisoner asking Hunter to look at ' + i + ',' + j);
        }
        if (this.enemyHunter.escapingAtariIsCaught(stone)) {
            score = - this.groupThreat(g);
            if (main.debug) {
                main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + i + ',' + j + ' is foolish  (' + score + ')');
            }
        }
    }
    Stone.undo(this.goban);
    return score;
};

},{"../Stone":17,"../main":32,"./Heuristic":24,"./Hunter":25,"util":4}],27:[function(require,module,exports){
//Translated from pusher.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Heuristic = require('./Heuristic');


/** @class
 *  Quite a dumb way of "pushing" our influence further...
 *  For that reason the coeff are rather low.
 *  This should eventually disappear.
 */
function Pusher(player) {
    Heuristic.call(this, player);
    this.allyCoeff = this.getGene('ally-infl', 0.1, 0.01, 4.0);
    this.enemyCoeff = this.getGene('enemy-infl', 0.4, 0.01, 4.0);
}
inherits(Pusher, Heuristic);
module.exports = Pusher;

Pusher.prototype.evalMove = function (i, j) {
    var inf = this.inf.map[j][i];
    var enemyInf = inf[this.enemyColor];
    var allyInf = inf[this.color];
    if (enemyInf === 0 || allyInf === 0) {
        return 0;
    }
    if (!this.canConnect(i, j, this.color)) return 0;

    var fillTer = this.territoryScore(i, j, this.color);
    if (fillTer < 0) fillTer = 0; // Spacer will count <0 scores

    var score = fillTer + 0.33 * (this.enemyCoeff * enemyInf - this.allyCoeff * allyInf);
    if (main.debug) {
        main.log.debug('Pusher heuristic sees influences ' + allyInf + ' - ' + enemyInf + ' at ' + i + ',' + j + ' -> ' + '%.03f'.format(score));
    }
    return score;
};

},{"../main":32,"./Heuristic":24,"util":4}],28:[function(require,module,exports){
//Translated from savior.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Stone = require('../Stone');
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);
    this.enemyHunter = new Hunter(player, true);
}
inherits(Savior, Heuristic);
module.exports = Savior;

Savior.prototype.initColor = function () {
    Heuristic.prototype.initColor.call(this);
    return this.enemyHunter.initColor();
};

//TMP
Savior.prototype.evalBoard = function (stateYx, scoreYx) {
    var self = this;
    this.player.boardIterator(function (i, j) {
        var stone = self.goban.stoneAt(i, j);
        var threat = self._evalEscape(i, j, stone);
        if (main.debug && threat > 0) {
            main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + i + ',' + j);
        }
        return threat;
    });
};

Savior.prototype._evalEscape = function (i, j, stone) {
    var threat, livesAdded;
    threat = livesAdded = 0;
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        var newThreat = null;
        if (g.lives === 1) {
            // NB: if more than 1 group in atari, they merge if we play this "savior" stone
            newThreat = this.groupThreat(g);
        } else if (g.lives === 2) {
            if (main.debug) {
                main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': pre-atari on ' + g);
            }
            newThreat = this.enemyHunter.evalMove(i, j);
        }
        if (!newThreat) {
            livesAdded += g.lives - 1;
        } else {
            threat += newThreat;
        }
    }
    if (threat === 0) { // no threat
        return 0;
    }
    livesAdded += stone.numEmpties();
    // $log.debug("Savior looking at #{i},#{j}: threat is #{threat}, lives_added is #{lives_added}") if $debug
    if (livesAdded < 2) { // nothing we can do here
        return 0;
    }
    if (livesAdded === 2) {
        // when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
        if (main.debug) {
            main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': threat=' + threat + ', lives_added=' + livesAdded);
        }
        Stone.playAt(this.goban, i, j, this.color);
        var isCaught = this.enemyHunter.escapingAtariIsCaught(stone);
        Stone.undo(this.goban);
        if (isCaught) {
            if (main.debug) main.log.debug('Savior giving up on threat of ' + threat + ' in ' + i + ',' + j);
            return 0;
        }
    }
    return threat;
};

},{"../Stone":17,"../main":32,"./Heuristic":24,"./Hunter":25,"util":4}],29:[function(require,module,exports){
'use strict';

var inherits = require('util').inherits;
//var main = require('../main');
var Heuristic = require('./Heuristic');


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);
    //this.allyCoeff = this.getGene('ally-infl', 0.1, 0.01, 4.0);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;

Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    var allGroups = this.boan.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[ndx], gi = g._info;
        if (gi.isDead || gi.eyeCount !== 1 || gi.band || gi.deadEnemies.length) continue;
        var eye = gi.getSingleEye();
        var coords = [];
        var alive = Shaper.getEyeMakerMove(this.goban, eye.i, eye.j, eye.vcount, coords);
        if (alive !== 1) continue;
        scoreYx[coords[1]][coords[0]] += this.groupThreat(g);
    }
};

// Decides if a "void" is good to make 2 eyes.
//   i,j is one free vertex of the void
//   vcount is the number of empties in the void
// Returns:
//   0 => cannot make 2 eyes
//   1 => can make 2 eyes if we play now (coords will receive [i,j])
//   2 => can make 2 eyes even if opponent plays first
Shaper.getEyeMakerMove = function (goban, i, j, vcount, coords) {
    if (vcount <= 2) return 0;
    if (vcount >= 7) return 2;

    var s1 = goban.stoneAt(i, j);
    var empties = s1.empties();
    if (vcount === 3) {
        var center = empties.length === 1 ? empties[0] : s1;
        coords[0] = center.i; coords[1] = center.j;
        return 1;
    }
    if (vcount === 4) {
        // verify the 4 empties are not a "square" shape (anything else works)
        if (empties.length === 3) { // "T" shape - s1 is at center
            coords[0] = s1.i; coords[1] = s1.j;
            return 1;
        }
        if (empties.length === 1) {
            if (empties[0].numEmpties() === 3) { // "T" shape - s1 is one extremity
                coords[0] = empties[0].i; coords[1] = empties[0].j;
                return 1;
            }
            return 2; // "Z" shape - s1 is one extremity
        }
        // s1 has 2 empty neighbors
        if (empties[0].numEmpties() === 2 && empties[1].numEmpties() === 2) {
            return 0; // square shape - each empty has 2 neighbors
        }
        return 2; // "Z" shape - s1 is one of the 2 at "center"
    }
    if (vcount === 5) {
        // FIXME: use a new method to get all empties and sort them by # neighbors
        // 4-1-1-1-1 if one has 4 neighbors this is a "+" shape and center is must-play now (1)
        // 2-2-2-1-1 if none has 3 this is a "line" = (2)
        // 3-2-2-2-1 if one has 3 and only 1 has 1, then 3 is must-play (1)
        // pick the only one with 3 neighbors
        return 2;
    }
    // vcount === 6
    // FIXME
    // 3-3-2-2-2-2 (1) aim at one of the 3
    // anything else is (2)
    return 2;
};

},{"./Heuristic":24,"util":4}],30:[function(require,module,exports){
//Translated from spacer.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Grid = require('../Grid');
var Heuristic = require('./Heuristic');

/** @class Tries to occupy empty space + counts when filling up territory */
function Spacer(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 2, 1, 4);
    this.borderCoeff = this.getGene('border', 1, 0, 2);
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype.evalMove = function (i, j) {
    var enemyInf = 0, allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var inf = this.inf.map[j][i];
    enemyInf += inf[this.enemyColor];
    allyInf += inf[this.color];
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== main.EMPTY) return 0;
        inf = this.inf.map[s.j][s.i];
        enemyInf += inf[this.enemyColor];
        allyInf += inf[this.color];
    }
    var totalInf = enemyInf + allyInf - 3;
    if (totalInf < 0) totalInf = 0;

    var dbX = this.distanceFromBorder(i);
    var dbY = this.distanceFromBorder(j);
    var rowCoeff = [0, 0.1, 0.8, 1, 0.95, 0.8];
    var border = rowCoeff.length - 1;
    if (dbX > border) dbX = border;
    if (dbY > border) dbY = border;
    var db = rowCoeff[dbX] * rowCoeff[dbY];
    
    // remove points only if we fill up our own territory
    var fillTer = this.territoryScore(i, j, this.color);
    if (fillTer > 0) fillTer = 0; // Pusher will count >0 scores
    return fillTer + 10 * db * this.borderCoeff / (1 + totalInf * this.inflCoeff);
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};

},{"../Grid":9,"../main":32,"./Heuristic":24,"util":4}],31:[function(require,module,exports){
'use strict';

var main = require('./main');
window.main = main;

require('./StoneConstants');
require('./rb');

main.GameLogic = require('./GameLogic');
main.Grid = require('./Grid');
main.Ai1Player = require('./ai/Ai1Player');
main.ScoreAnalyser = require('./ScoreAnalyser');

//main.Ui = require('./Ui');

main.debug = false;

},{"./GameLogic":6,"./Grid":9,"./ScoreAnalyser":15,"./StoneConstants":18,"./ai/Ai1Player":20,"./main":32,"./rb":33}],32:[function(require,module,exports){
//main class for babyruby2js
'use strict';

/** @class */
function main() {
}
module.exports = main;

//--- Misc

/** main.isA(Vehicule, myCar) -> TRUE
 *  main.isA(Car, myCar) -> true
 *  klass can be a string for Ruby types that have no exact equivalent in JS
 */
main.isA = function (klass, obj) {
  if (typeof klass === 'string') {
    if (klass === 'Fixnum') return (typeof obj === 'number' || obj instanceof Number) && ~~obj == obj;
    if (klass === 'Float')  return (typeof obj === 'number' || obj instanceof Number); // loose equivalence...
    throw new Error('Invalid parameter for isA: ' + klass);
  }
  if (obj instanceof klass) return true;
  if (obj === null || obj === undefined) return false;
  if (obj.constructor.name === klass.name) return true; // for String and Number
  return false;
};

/** main.isA(Vehicule, myCar) -> FALSE
 *  main.isA(Car, myCar) -> true
 */
main.instanceOf = function (klass, obj) {
  return obj.constructor.name === klass.name;
};

/** Shallow clone helper.
 *  Usual caution applies - please do some reading about the pitfalls if needed.
 */
main.clone = function (obj) {
  if (obj === null || obj === undefined) return obj;
  var clone;
  if (main.isA(Array, obj)) {
    clone = [];
    for (var i = 0, len = obj.length; i < len; i++) clone[i] = obj[i];
  } else if (typeof obj === 'object') {
    if (typeof obj.clone === 'function') return obj.clone(); // object knows better
    clone = {};
    for (var k in obj) {
      var val = obj[k];
      if (typeof val !== 'function') clone[k] = val;
    }
  } else throw new Error('main.clone called on ' + typeof obj);
  return clone;
};


//--- Tests

var FAILED_ASSERTION_MSG = 'Failed assertion: ';

/** @class */
function TestSeries() {
  this.testCases = {};
}

TestSeries.prototype.add = function (klass) {
  this.testCases[klass.name] = klass;
  return klass;
};

TestSeries.prototype.testOneClass = function (Klass) {
  for (var method in Klass.prototype) {
    if (typeof Klass.prototype[method] !== 'function') continue;
    if (method.substr(0,4) !== 'test') continue;
    this.testCount++;
    var test = new Klass(Klass.name + '#' + method);
    try {
      test[method].call(test);
    } catch(e) {
      var header = 'Test failed';
      if (e.message.startWith(FAILED_ASSERTION_MSG)) {
        this.failedCount++;
      } else {
        header += ' with exception';
        this.errorCount++;
      }
      main.log.error(header + ': ' + test.name + ':\n' + e.stack + '\n');
    }
  }
};

TestSeries.prototype.run = function (logfunc, specificClass) {
  main.log.setLogFunc(logfunc);
  main.assertCount = main.count = 0;
  var startTime = Date.now();
  var classCount = 0;
  this.testCount = this.failedCount = this.errorCount = 0;
  for (var t in this.testCases) {
    if (specificClass && t !== specificClass) continue;
    classCount++;
    var Klass = this.testCases[t];
    this.testOneClass(Klass);
  }
  var duration = ((Date.now() - startTime) / 1000).toFixed(2);
  var report = 'Completed tests. (' + classCount + ' classes, ' + this.testCount + ' tests, ' +
    main.assertCount + ' assertions in ' + duration + 's)' +
    ', failed: ' + this.failedCount + ', exceptions: ' + this.errorCount;
  if (main.count) report += ', generic count: ' + main.count;
  main.log.info(report);
  return report;
};


/** @class */
function TestCase(name) {
  this.name = name;
}

function _fail(msg, comment) {
  comment = comment ? comment + ': ' : '';
  throw new Error(FAILED_ASSERTION_MSG + comment + msg);
}

function _valueCompareHint(expected, val) {
  if (typeof expected !== 'string' || typeof val !== 'string') return '';
  // for short strings or strings that start differently, no need for this hint
  if (expected.length <= 15 || expected[0] !== val[0]) return '';

  for (var i = 0; i < expected.length; i++) {
    if (expected[i] !== val[i]) {
      return '(first discrepancy at position ' + i + ': "' +
        expected.substr(i, 10) + '..." / "' + val.substr(i, 10) + '...")';
    }
  }
  return '';
}

main.compareValue = function (expected, val) {
  if (main.isA(Array, expected)) {
    if (!main.isA(Array, val)) return 'Expected Array but got ' + val;
    if (val.length !== expected.length) {
      return 'Expected Array of size ' + expected.length + ' but got size ' + val.length;
    }
    for (var i = 0; i < expected.length; i++) {
      var msg = main.compareValue(expected[i], val[i]);
      if (msg) return msg;
    }
    return ''; // equal
  }
  if (val === expected) return '';
  return 'Expected:\n' + expected + '\nbut got:\n' + val + '\n' + _valueCompareHint(expected, val) + '\n';
};

main.assertEqual = function (expected, val, comment) {
  main.assertCount++;
  var msg = main.compareValue(expected, val);
  if (msg === '') return;
  console.warn(msg);
  _fail(msg, comment);
};

main.assertInDelta = function (val, expected, delta, comment) {
  main.assertCount++;
  if (Math.abs(val - expected) <= delta) return;
  _fail(val + ' is not in +/-' + delta + ' delta around ' + expected, comment);
};

main.tests = new TestSeries();
main.TestCase = TestCase;

//--- Logger

/** @class */
function Logger() {
  this.level = Logger.ERROR;

  Logger.prototype.debug = this._newLogFn(Logger.DEBUG, console.debug);
  Logger.prototype.info = this._newLogFn(Logger.INFO, console.info);
  Logger.prototype.warn = this._newLogFn(Logger.WARN, console.warn);
  Logger.prototype.error = this._newLogFn(Logger.ERROR, console.error);
  Logger.prototype.fatal = this._newLogFn(Logger.FATAL, console.error);
}

Logger.FATAL = 4;
Logger.ERROR = 3;
Logger.WARN = 2;
Logger.INFO = 1;
Logger.DEBUG = 0;

Logger.prototype.setLogFunc = function (fn) {
  this.logfunc = fn;
};

Logger.prototype._newLogFn = function (lvl, consoleFn) {
  var self = this;
  return function (msg) {
    if (self.level > lvl) return;
    if (self.logfunc && !self.logfunc(lvl, msg)) return;
    consoleFn.call(console, msg);
  };
};

main.log = new Logger();
main.Logger = Logger;

},{}],33:[function(require,module,exports){
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
  case 'd': case 'x': //'%2d'
    var padChar = ' ';
    if (fmt[pos] === '0') { pos++; padChar = '0'; }
    var len = parseInt(fmt.substr(pos));
    res = num.toString(code === 'x' ? 16 : 10);
    for (var i = len - res.length; i > 0; i--) { res = padChar + res; }
    return res;
  case 'f': //'%.02f'
    var sign = '';
    if (fmt[pos] === '+') { pos++; if (num > 0) sign = '+'; }
    if (fmt[pos++] !== '.') break;
    var prec = parseInt(fmt.substr(pos));
    return sign + num.toFixed(prec);
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

/** Push onto this array the items from array2 that are not yet in it.
 *  Returns the count of items added. */
Array.prototype.pushUnique = function (array2) {
  var len0 = this.length;
  for (var i = 0; i < array2.length; i++) {
    var e = array2[i];
    if (this.indexOf(e) === -1) this.push(e);
  }
  return this.length - len0;
};

Array.prototype.find = function (e) {
  if (typeof e !== 'function') {
    var ndx = this.indexOf(e);
    return ndx === -1 ? undefined : this[ndx];
  }
  for (var i = 0; i < this.length; i++) {
    if (e(this[i])) return this[i];
  }
  return undefined;
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

},{}]},{},[31]);

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
//Translated from ai1_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Heuristic = require('./ai/Heuristic');
var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
// TODO: 
// - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
// - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
// - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
// - an eye shape constructor
var Player = require('./Player');
var Goban = require('./Goban');
var InfluenceMap = require('./InfluenceMap');
var PotentialTerritory = require('./PotentialTerritory');
var AllHeuristics = require('./ai/AllHeuristics');
var TimeKeeper = require('./TimeKeeper');
var Genes = require('./Genes');

/** @class public read-only attribute: goban, inf, ter, enemyColor, genes, lastMoveScore
 */
function Ai1Player(goban, color, genes) {
    if (genes === undefined) genes = null;
    Player.call(this, false, goban);
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.gsize = this.goban.gsize;
    this.genes = (( genes ? genes : new Genes() ));
    this.minimumScore = this.getGene('smaller-move', 0.033, 0.02, 0.066);
    this.heuristics = [];
    this.negativeHeuristics = [];
    for (var cl, cl_array = Heuristic.allHeuristics(), cl_ndx = 0; cl=cl_array[cl_ndx], cl_ndx < cl_array.length; cl_ndx++) {
        var h = new cl(this);
        if (!h.negative) {
            this.heuristics.push(h);
        } else {
            this.negativeHeuristics.push(h);
        }
    }
    this.setColor(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    return this.prepareGame(this.genes); // @timer = TimeKeeper.new // @timer.calibrate(0.7)
}
inherits(Ai1Player, Player);
module.exports = Ai1Player;

Ai1Player.prototype.prepareGame = function (genes) {
    this.genes = genes;
    this.numMoves = 0;
};

Ai1Player.prototype.setColor = function (color) {
    Player.prototype.setColor.call(this, color);
    this.enemyColor = 1 - color;
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.initColor();
    }
    for (h, h_array = this.negativeHeuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.initColor();
    }
};

Ai1Player.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

// Returns the move chosen (e.g. c4 or pass)
// One can check last_move_score to see the score of the move returned
Ai1Player.prototype.getMove = function () {
    var bestScore, secondBest, bestI, bestJ;
    // @timer.start("AI move",0.5,3)
    this.numMoves += 1;
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
    this.prepareEval();
    bestScore = secondBest = this.minimumScore;
    bestI = bestJ = -1;
    var bestNumTwin = 0; // number of occurrence of the current best score (so we can randomly pick any of them)
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var score = this.evalMove(i, j, bestScore);
            // Keep the best move
            if (score > bestScore) {
                secondBest = bestScore;
                if (main.debug) {
                    main.log.debug('=> ' + Grid.moveAsString(i, j) + ' becomes the best move with ' + score + ' (2nd best is ' + Grid.moveAsString(bestI, bestJ) + ' with ' + bestScore + ')');
                }
                bestScore = score;
                bestI = i;
                bestJ = j;
                bestNumTwin = 1;
            } else if (score === bestScore) {
                bestNumTwin += 1;
                if (~~(Math.random()*~~(bestNumTwin)) === 0) {
                    if (main.debug) {
                        main.log.debug('=> ' + Grid.moveAsString(i, j) + ' replaces equivalent best move with ' + score + ' (equivalent best was ' + Grid.moveAsString(bestI, bestJ) + ')');
                    }
                    bestScore = score;
                    bestI = i;
                    bestJ = j;
                }
            } else if (score >= secondBest) {
                if (main.debug) {
                    main.log.debug('=> ' + Grid.moveAsString(i, j) + ' is second best move with ' + score + ' (best is ' + Grid.moveAsString(bestI, bestJ) + ' with ' + bestScore + ')');
                }
                secondBest = score;
            }
        }
    }
    this.lastMoveScore = bestScore;
    // @timer.stop(false) # false: no exception if it takes longer but an error in the log
    if (bestScore > this.minimumScore) {
        return Grid.moveAsString(bestI, bestJ);
    }
    if (main.debug) {
        main.log.debug('AI is passing...');
    }
    return 'pass';
};

Ai1Player.prototype.prepareEval = function () {
    this.inf.buildMap();
    return this.ter.guessTerritories();
};

Ai1Player.prototype.evalMove = function (i, j, bestScore) {
    if (bestScore === undefined) bestScore = this.minimumScore;
    if (!Stone.validMove(this.goban, i, j, this.color)) {
        return 0.0;
    }
    var score = 0.0;
    // run all positive heuristics
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        score += h.evalMove(i, j);
    }
    // we run negative heuristics only if this move was a potential candidate
    if (score >= bestScore) {
        for (h, h_array = this.negativeHeuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
            score += h.evalMove(i, j);
            if (score < bestScore) {
                break;
            }
        }
    }
    return score;
};

},{"./Genes":8,"./Goban":9,"./Grid":10,"./InfluenceMap":13,"./Player":14,"./PotentialTerritory":15,"./Stone":17,"./TimeKeeper":19,"./ai/AllHeuristics":21,"./ai/Heuristic":24,"./main":31,"util":4}],6:[function(require,module,exports){
//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
//require 'set';
var Goban = require('./Goban');
var ZoneFiller = require('./ZoneFiller');

/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, eyeColor, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(analyser, code, i, j, vcount, neighbors) {
    this.analyzer = analyser;
    this.goban = analyser.goban;
    this.code = code;
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.eyeColor = null; // stays nil if not an eye
    this.owner = null;
}
module.exports = Void;

// Call it once. Populates @eye_color
// @eye_color stays nil if there is more than 1 color around (not an eye) or full board empty
Void.prototype.eyeCheck = function () {
    var hasBlack = this.groups[main.BLACK].length > 0;
    var hasWhite = this.groups[main.WHITE].length > 0;
    var oneColor = null;
    if (hasBlack) {
        if (!hasWhite) {
            oneColor = main.BLACK;
        }
    } else if (hasWhite) {
        oneColor = main.WHITE;
    }
    this.eyeColor = oneColor;
    // Now tell the groups about this void
    if (oneColor !== null) {
        this.setOwner(oneColor);
        for (var n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.addVoid(this, true);
            }
        }
        if (main.debug) {
            return main.log.debug('Color ' + oneColor + ' surrounds ' + this + ' (eye)');
        }
    } else {
        for (n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.addVoid(this);
            }
        }
        if (main.debug) {
            return main.log.debug(this + ' has to be sorted out...');
        }
    }
};

Void.prototype.setOwner = function (color) {
    this.owner = color;
};

Void.prototype.toString = function () {
    var s = 'void ' + this.code + ' (' + Grid.colorToChar(this.code) + '/' + this.i + ',' + this.j + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.COLOR_NAMES[color] + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    console.log(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        console.log('    Color ' + color + ' (' + Grid.colorToChar(color) + '):');
        for (var neighbor, neighbor_array = this.groups[color], neighbor_ndx = 0; neighbor=neighbor_array[neighbor_ndx], neighbor_ndx < neighbor_array.length; neighbor_ndx++) {
            console.log(' #' + neighbor.ndx);
        }
    }
    console.log('\n');
};


/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.goban = null;
    this.voids = [];
    this.allGroups = new Set();
}
module.exports = BoardAnalyser;

// Calling this method updates the goban to show the detected result.
BoardAnalyser.prototype.countScore = function (goban, grid) {
    if (grid === undefined) grid = null;
    if (main.debug) {
        main.log.debug('Counting score...');
    }
    this.goban = goban;
    this.scores = [0, 0];
    this.prisoners = Group.prisoners(this.goban);
    this.filler = new ZoneFiller(this.goban, grid);
    this.findVoids();
    this.findEyes();
    this.findStrongerOwners();
    this.findDyingGroups();
    this.findDameVoids();
    this.colorVoids();
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.owner !== null) {
            this.scores[v.owner] += v.vcount;
        }
    }
    if (main.debug) {
        return this.debugDump();
    }
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    console.log(this.filler.grid.toText(function (c) {
        return Grid.colorToChar(c);
    }));
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.debugDump();
    }
    if (this.scores) {
        console.log('\nGroups with 2 eyes or more: ');
        this.allGroups.forEach(function (g) {
            if (g.eyes.length >= 2) {
                console.log(g.ndx + ',');
            }
        });
        console.log('\nGroups with 1 eye: ');
        this.allGroups.forEach(function (g) {
            if (g.eyes.length === 1) {
                console.log(g.ndx + ',');
            }
        });
        console.log('\nGroups with no eye: ');
        this.allGroups.forEach(function (g) {
            if (g.eyes.length === 0) {
                console.log(g.ndx + ',');
            }
        });
        console.log('\nScore:\n');
        for (var i = 0; i < this.scores.length; i++) {
            console.log('Player ' + i + ': ' + this.scores[i] + ' points');
        }
    }
};

//private;
BoardAnalyser.prototype.findVoids = function () {
    if (main.debug) {
        main.log.debug('Find voids...');
    }
    var voidCode = Grid.ZONE_CODE;
    this.allGroups.forEach(function (g) {
        g.resetAnalysis();
    });
    this.allGroups.clear();
    this.voids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount;
            if ((vcount = this.filler.fillWithColor(i, j, main.EMPTY, voidCode, neighbors)) > 0) {
                this.voids.push(new Void(this, voidCode, i, j, vcount, neighbors));
                voidCode += 1;
                // keep all the groups
                for (var n, n_array = neighbors, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
                    for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                        this.allGroups.add(g);
                    }
                }
                neighbors = [[], []];
            }
        }
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype.findEyes = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.eyeCheck();
    }
};

// Decides who owns a void by comparing the "liveness" of each side
BoardAnalyser.prototype.findStrongerOwners = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor !== null) {
            continue;
        }
        var lives = [0, 0];
        for (var c = 0; c < 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                lives[c] += g.lives;
            }
        }
        var moreLives = Math.max.apply(Math, lives);
        if (lives.count(function (l) {
            return l === moreLives;
        }) === 1) { // make sure we have a winner, not a tie
            c = lives.indexOf(moreLives);
            v.setOwner(c);
            if (main.debug) {
                main.log.debug('It looks like color ' + c + ', with ' + moreLives + ' lives, owns ' + v + ' (this might change once we identify dead groups)');
            }
        }
    }
};

// Reviews the groups and declare "dead" the ones who do not own any void
BoardAnalyser.prototype.findDyingGroups = function () {
    var self = this;
    this.allGroups.forEach(function (g) {
        var ownedVoids, vcount;
        if (g.eyes.length >= 2) {
            return;
        }
        if (g.eyes.length === 1 && g.eyes[0].vcount + g.extraLives >= 3) { // actually not enough if gote but well...
            return;
        }
        var color = g.color;
        if (g.eyes.length === 1 && g.eyes[0].groups[color].length > 1) { // connected by eye
            return;
        }
        // we need to look at voids around (fake eyes, etc.)
        ownedVoids = vcount = 0;
        var myVoid = null;
        var oneOwner = false;
        for (var v, v_array = g.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
            if (v.owner !== null) {
                oneOwner = true;
                if (v.owner === color) {
                    myVoid = v;
                    ownedVoids += 1;
                    vcount += v.vcount;
                }
            }
        }
        if (g.eyes.length === 1 && ownedVoids >= 1) { // TODO: this is too lenient
            return;
        }
        if (ownedVoids >= 2) { // TODO later: here is the horror we read about on the web
            return;
        }
        if (ownedVoids === 1 && vcount + g.extraLives >= 3) {
            return;
        }
        if (ownedVoids === 1 && myVoid.groups[color].length > 1) { // TODO: check also lives of ally
            return;
        }
        // find if the only void around is owned (e.g. lost stones inside big territory)
        // if we don't know who owns the voids around g, leave g as alive (unfinished game)
        if (g.voids.length !== 0 && !oneOwner) {
            return;
        }
        // g is dead!
        var stone = g.stones[0];
        var taken = self.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        self.prisoners[color] += taken;
        self.scores[1 - color] += taken;
        g.countAsDead();
        if (main.debug) {
            main.log.debug('Hence ' + g + ' is considered dead (' + taken + ' prisoners; 1st stone ' + stone + ')');
        }
        if (main.debug) {
            main.log.debug('eyes:' + g.eyes.length + ' owned_voids:' + ownedVoids + ' vcount-voids:' + vcount);
        }
    });
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype.findDameVoids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor !== null) {
            continue;
        }
        var aliveColors = [];
        for (var c = 0; c < 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (this.groupLiveliness(g) >= 1) {
                    aliveColors.push(c);
                    break;
                }
            }
        }
        if (aliveColors.length >= 2) {
            v.setOwner(null);
            if (main.debug) {
                main.log.debug('Void ' + v + ' is considered neutral ("dame")');
            }
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype.colorVoids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        var c = (( v.owner !== null ? Grid.TERRITORY_COLOR + v.owner : Grid.DAME_COLOR ));
        this.filler.fillWithColor(v.i, v.j, v.code, c);
    }
};

// Returns a number telling how "alive" a group is. TODO: review this
// Really basic logic for now.
// (instead we should determine if the shape of a single eye is right to make 2 eyes)
// - eyes and owned voids count for 1 point each
// - non-owned voids (undetermined owner or enemy-owned void) count for 0
// NB: for end-game counting, this logic is enough because undetermined situations
// have usually all been resolved (or this means both players cannot see it...)
BoardAnalyser.prototype.groupLiveliness = function (g) {
    return g.eyes.length + g.voids.count(function (z) {
        return z.owner === g.color;
    });
};

// W02: unknown class supposed to be attached to main: Set
// E02: unknown method: add(...)
// E02: unknown method: find_index(...)
},{"./Goban":9,"./Grid":10,"./Group":11,"./ZoneFiller":20,"./main":31}],7:[function(require,module,exports){
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
    if (gsize === undefined) gsize = null;
    if (handicap === undefined) handicap = 0;
    if (komi === undefined) komi = null;
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.curColor = main.BLACK;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = null;
    if (!this.goban || (gsize && gsize !== this.goban.gsize)) {
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
GameLogic.prototype.acceptEnding = function (accept) {
    if (!this.gameEnding) {
        return this.errorMsg('The game is not ending yet');
    }
    if (!accept) {
        this.gameEnding = false; // exit ending mode; we will play some more...
    } else {
        this.gameEnded = true; // ending accepted. Game is finished.
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
    return (( this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '' )) + this.history.join(',') + ' (' + this.history.length + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.prisoners = function () {
    return Group.prisoners(this.goban);
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
    this.curColor = (this.curColor + 1) % 2;
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
GameLogic.prototype.requestUndo = function () {
    if (this.history.length < 2) {
        return this.errorMsg('Nothing to undo');
    }
    for (var _i = 0; _i < 2; _i++) {
        if (!this.history[this.history.length-1].endWith('pass')) { // no stone to remove for a pass
            Stone.undo(this.goban);
        }
        this.history.pop();
    }
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

},{"./Goban":9,"./Grid":10,"./Group":11,"./HandicapSetter":12,"./SgfReader":16,"./Stone":17,"./main":31}],8:[function(require,module,exports){
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
},{"./main":31}],9:[function(require,module,exports){
//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

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
    for (var j = 1; j <= gsize; j++) {
        for (var i = 1; i <= gsize; i++) {
            this.ban[j][i] = new Stone(this, i, j, main.EMPTY);
        }
    }
    for (j = 1; j <= gsize; j++) {
        for (i = 1; i <= gsize; i++) {
            this.ban[j][i].findNeighbors();
        }
    }
    // sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, main.EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel]; // so that we can always do @killed_groups.last.color, etc.
    this.mergedGroups = [Goban.sentinel];
    this.garbageGroups = [];
    this.numGroups = 0;
    this.history = [];
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
    this.killedGroups.push(Goban.sentinel);
    this.mergedGroups.clear();
    this.mergedGroups.push(Goban.sentinel);
    this.numGroups = 0;
    return this.history.clear();
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
Goban.prototype.consoleDisplay = function () {
    console.log(this.grid.toText(function (s) {
        return Grid.colorToChar(s.color);
    }));
};

// Basic validation only: coordinates and checks the intersection is empty
// See Stone class for evolved version of this (calling this one)
Goban.prototype.validMove = function (i, j) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) {
        return false;
    }
    return this.ban[j][i].empty();
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.color = function (i, j) {
    var stone = this.ban[j][i];
    if (stone) { // works because BORDER == nil
        return stone.color;
    }
    return main.BORDER;
};

// No validity test here
Goban.prototype.empty = function (i, j) {
    return this.ban[j][i].empty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

// Plays a stone and stores it in history
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.playAt = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== main.EMPTY) {
        throw new Error('Tried to play on existing stone in ' + stone);
    }
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.undo = function () {
    return this.history.pop();
};

Goban.prototype.previousStone = function () {
    return this.history[this.history.length-1];
};

// E02: unknown method: concat(...)
},{"./Grid":10,"./Group":11,"./Stone":17,"./main":31}],10:[function(require,module,exports){
//Translated from grid.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class A generic grid - a Goban owns a grid
 *  public read-only attribute: gsize, yx
 */
function Grid(gsize) {
    if (gsize === undefined) gsize = 19;
    this.gsize = gsize;
    // TODO: use only 1 extra "nil" cell (0..gsize instead of 0..gsize+1)
    // Idea is to avoid to have to check i,j against gsize in many places.
    // In case of bug, e.g. for @yx[5][-1], Ruby returns you @yx[5][@yx.size] (looping back)
    // so having a real item (BORDER) on the way helps to detect a bug.
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

// Converts from goban grid (stones) to simple grid (colors) REVIEWME
Grid.prototype.convert = function (sourceGrid) {
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
    var maxlen = 1;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            var val = block(this.yx[j][i]);
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
    return [i, parseInt(move.substr(1, 2))];
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

},{"./main":31}],11:[function(require,module,exports){
//Translated from group.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');

/** @class Always require goban instead of stone
 *  A group keeps the list of its stones, the updated number of "lives" (empty intersections around),
 *  and whatever status information we need to decide what happens to a group (e.g. when a
 *  group is killed or merged with another group, etc.).
 *  Note that most of the work here is to keep this status information up to date.
 *  public read-only attribute: goban, stones, lives, color
 *  public read-only attribute: mergedWith, mergedBy, killedBy, ndx
 *  public write attribute: mergedWith, mergedBy, extraLives  *  only used in this file
 *  public read-only attribute: eyes, voids, extraLives  *  for analyser
 *  Create a new group. Always with a single stone.
 *  Do not call this using Group.new but Goban#new_group instead.
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
    this.voids = []; // for analyser: empty zones next to a group
    this.eyes = []; // for analyser: eyes (i.e. void surrounded by a group)
    this.extraLives = 0; // for analyser: lives granted by dying enemy nearby
    this._allEnemies = [];
    this._allLives = []; // $log.debug("New group created #{self}") if $debug_group
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = this.mergedBy = this.killedBy = null;
    this.voids.clear();
    this.eyes.clear();
    this._allEnemies.clear();
    this._allLives.clear();
    // $log.debug("Use (new) recycled group #{self}") if $debug_group
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

// This also resets the eyes
Group.prototype.resetAnalysis = function () {
    this.extraLives = 0;
    this.voids.clear();
    return this.eyes.clear();
};

// Adds a void or an eye
Group.prototype.addVoid = function (v, isEye) {
    if (isEye === undefined) isEye = false;
    if (isEye) {
        return this.eyes.push(v);
    } else {
        return this.voids.push(v);
    }
};

// For analyser  
Group.prototype.countAsDead = function () {
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.extraLives += 1;
        }
    }
};

// Builds a list of all lives of the group
Group.prototype.allLives = function () {
    this._allLives.clear(); // TODO: try if set is more efficient
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== main.EMPTY) {
                continue;
            }
            if (!this._allLives.contains(life)) {
                this._allLives.push(life);
            }
        }
    }
    return this._allLives;
};

// Builds a list of all enemies of the group
Group.prototype.allEnemies = function () {
    this._allEnemies.clear();
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color === main.EMPTY || en.color === this.color) {
                continue;
            }
            if (!this._allEnemies.contains(en.group)) {
                this._allEnemies.push(en.group);
            }
        }
    }
    if (main.debugGroup) {
        main.log.debug(this + ' has ' + this._allEnemies.length + ' enemies');
    }
    return this._allEnemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
Group.prototype.livesAddedByStone = function (stone) {
    var lives = 0;
    for (var life, life_array = stone.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
        if (life.color !== main.EMPTY) {
            continue;
        }
        var res = false;
        for (var s, s_array = life.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === this && s !== stone) {
                res = true;
                break;
            }
        }
        if (!res) {
            lives += 1;
        }
    }
    if (main.debugGroup) {
        main.log.debug(lives + ' lives added by ' + stone + ' for group ' + this);
    }
    return lives;
};

// Connect a new stone or a merged stone to this group
Group.prototype.connectStone = function (stone, onMerge) {
    if (onMerge === undefined) onMerge = false;
    if (main.debugGroup) {
        main.log.debug('Connecting ' + stone + ' to group ' + this + ' (on_merge=' + onMerge + ')');
    }
    this.stones.push(stone);
    this.lives += this.livesAddedByStone(stone);
    if (!onMerge) { // minus one since the connection itself removes 1
        this.lives -= 1;
    }
    if (this.lives < 0) { // can be 0 if suicide-kill
        throw new Error('Unexpected error (lives<0 on connect)');
    }
    if (main.debugGroup) {
        return main.log.debug('Final group: ' + this);
    }
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
        return this.dieFrom(stone);
    }
};

// When a group of stones reappears because we undo
// NB: it can never kill anything
Group.prototype.attackedByResuscitated = function (stone) {
    this.lives -= 1;
    if (main.debugGroup) {
        main.log.debug(this + ' attacked by resuscitated ' + stone);
    }
    if (this.lives < 1) {
        throw new Error('Unexpected error (lives<1 on attack by resucitated)');
    }
};

// Stone parameter is just for debug for now
Group.prototype.notAttackedAnymore = function (stone) {
    this.lives += 1;
    if (main.debugGroup) {
        return main.log.debug(this + ' not attacked anymore by ' + stone);
    }
};

// Merges a subgroup with this group
Group.prototype.merge = function (subgroup, byStone) {
    if (subgroup.mergedWith === this || subgroup === this || this.color !== subgroup.color) {
        throw new Error('Invalid merge');
    }
    if (main.debugGroup) {
        main.log.debug('Merging subgroup:' + subgroup + ' to main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.setGroupOnMerge(this);
        this.connectStone(s, true);
    }
    subgroup.mergedWith=(this);
    subgroup.mergedBy=(byStone);
    this.goban.mergedGroups.push(subgroup);
    if (main.debugGroup) {
        return main.log.debug('After merge: subgroup:' + subgroup + ' main:' + this);
    }
};

// Reverse of merge
Group.prototype.unmerge = function (subgroup) {
    if (main.debugGroup) {
        main.log.debug('Unmerging subgroup:' + subgroup + ' from main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = s_array.length - 1; s=s_array[s_ndx], s_ndx >= 0; s_ndx--) {
        this.disconnectStone(s, true);
        s.setGroupOnMerge(subgroup);
    }
    subgroup.mergedBy=(subgroup.mergedWith=(null));
    if (main.debugGroup) {
        return main.log.debug('After unmerge: subgroup:' + subgroup + ' main:' + this);
    }
};

// This must be called on the main group (stone.group)
Group.prototype.unmergeFrom = function (stone) {
    var subgroup;
    while ((subgroup = this.goban.mergedGroups[this.goban.mergedGroups.length-1]).mergedBy === stone && subgroup.mergedWith === this) {
        this.unmerge(this.goban.mergedGroups.pop());
    }
};

// Called when the group has no more life left
Group.prototype.dieFrom = function (killerStone) {
    if (main.debugGroup) {
        main.log.debug('Group dying: ' + this);
    }
    if (this.lives < 0) {
        throw new Error('Unexpected error (lives<0)');
    }
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.notAttackedAnymore(stone);
        }
        stone.die();
    }
    this.killedBy = killerStone;
    this.goban.killedGroups.push(this);
    if (main.debugGroup) {
        return main.log.debug('Group dead: ' + this);
    }
};

// Called when "undo" operation removes the killer stone of this group
Group.prototype.resuscitate = function () {
    this.killedBy = null;
    this.lives = 1; // always comes back with a single life
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        stone.resuscitateIn(this);
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.attackedByResuscitated(stone);
        }
    }
};

Group.resuscitateFrom = function (killerStone, goban) {
    while (goban.killedGroups[goban.killedGroups.length-1].killedBy === killerStone) {
        var group = goban.killedGroups.pop();
        if (main.debugGroup) {
            main.log.debug('taking back ' + killerStone + ' so we resuscitate ' + group.debugDump());
        }
        group.resuscitate();
    }
};

// Returns prisoners grouped by color of dead stones  
Group.prisoners = function (goban) {
    var prisoners = [0, 0];
    for (var i = 1; i <= goban.killedGroups.length - 1; i++) {
        var g = goban.killedGroups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

// E02: unknown method: map(...)
// E02: unknown method: find_index(...)
// E02: unknown method: merged_with=(...)
// E02: unknown method: merged_by=(...)

},{"./Grid":10,"./main":31}],12:[function(require,module,exports){
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

},{"./Grid":10,"./HandicapSetter":12,"./Stone":17,"./main":31}],13:[function(require,module,exports){
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
    for (var c = 0; c < 2; c++) {
        console.log('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            console.log('' + '%2d'.format(j));
            for (var i = 1; i <= this.gsize; i++) {
                console.log('%2d'.format(this.map[j][i][c]) + '|');
            }
            console.log('\n');
        }
        console.log('  ');
        for (i = 1; i <= this.gsize; i++) {
            console.log(' ' + Grid.xLabel(i) + ' ');
        }
        console.log('\n');
    }
};

},{"./Grid":10,"./main":31}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
//Translated from potential_territory.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
var Stone = require('./Stone');
var BoardAnalyser = require('./BoardAnalyser');

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
}
module.exports = PotentialTerritory;

// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype.guessTerritories = function () {
    // update real grid to current goban
    this.realGrid.convert(this.goban.grid);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    for (var first = 0; first < 2; first++) {
        this.foresee(this.grids[first], first, 1 - first);
    }
    if (main.debug) {
        main.log.debug('\nBLACK first:\n' + this.grids[0] + 'WHITE first:\n' + this.grids[1]);
    }
    // now merge the result
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var owner = 0;
            for (first = 0; first < 2; first++) {
                var terrColor = this.grids[first].yx[j][i] - Grid.TERRITORY_COLOR;
                if (terrColor === main.WHITE) {
                    owner += 1;
                }
                if (terrColor === main.BLACK) {
                    owner -= 1;
                }
            }
            this.territory.yx[j][i] = owner / 2.0;
        }
    }
    if (main.debug) {
        main.log.debug('\n+1=white, -1=black, 0=no one\n' + this.territory.toText(function (v) {
            if (v === 0) {
                return '    0';
            } else {
                return '' + '%+.1f'.format(v);
            }
        }));
    }
    return this.territory.yx;
};

PotentialTerritory.prototype.potential = function () {
    return this.territory;
};

// For unit tests
PotentialTerritory.prototype._grid = function (first) {
    return this.grids[first];
};

//private;
// TODO: add live/dead groups? Maybe not here
PotentialTerritory.prototype.foresee = function (grid, first, second) {
    this.tmp = this.territory; // safe to use it as temp grid here
    this.reducedYx = null;
    var moveCount = this.goban.moveNumber();
    // enlarging starts with real grid
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connectToBorders(grid.yx);
    if (main.debug) {
        main.log.debug('after 1st enlarge:\n' + grid);
    }
    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) {
        main.log.debug('after reduce:\n' + this.reducedGrid);
    }
    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, this.tmp.copy(this.realGrid), first, second);
    this.enlarge(this.tmp, grid.copy(this.tmp), second, first);
    this.connectToBorders(grid.yx);
    if (main.debug) {
        main.log.debug('after 2nd enlarge:');
    }
    if (main.debug) {
        this.goban.debugDisplay();
    }
    // passed grid will receive the result (scoring grid)
    this.boan.countScore(this.goban, grid.convert(this.goban.grid));
    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    for (var _i = 0; _i < moveCount; _i++) {
        Stone.undo(this.goban);
    }
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, first, second) {
    if (main.debug) {
        main.log.debug('enlarge ' + first + ',' + second);
    }
    var inYx = inGrid.yx;
    var outYx = outGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (inYx[j][i] !== main.EMPTY) {
                continue;
            }
            this.enlargeAt(inYx, outYx, i, j, first, second);
        }
    }
};

// Reduces given grid using the real grid as reference.
PotentialTerritory.prototype.reduce = function (grid) {
    var yx = grid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (this.realYx[j][i] !== main.EMPTY) { // cannot reduce a real stone
                continue;
            }
            var color = yx[j][i];
            if (color === main.EMPTY) { // we did not enlarge here, no need to reduce
                continue;
            }
            var enemies = this.inContact(yx, i, j, 1 - color);
            // we can safely reduce if no enemy was around at the end of the enlarging steps
            if (enemies === 0) {
                yx[j][i] = main.EMPTY;
            }
        }
    }
};

// "enlarge" around a given spot
// Note we read and write on separate grids
PotentialTerritory.prototype.enlargeAt = function (inYx, outYx, i, j, first, second) {
    var ss = this.inContact(inYx, i, j, first);
    if (ss > 0) {
        if (ss >= 3) { // if 3 or 4 no need to fill the void
            return;
        }
    } else if (!this.diagonalMoveOk(inYx, i, j, first, second)) {
        return;
    }
    return this.addStone(outYx, i, j, first);
};

// Add a stone on given grid.
// When the reduced grid is known, use it and play moves on goban too.
PotentialTerritory.prototype.addStone = function (yx, i, j, color) {
    if (this.reducedYx) {
        // skip if useless move (it was reduced)
        if (this.reducedYx[j][i] === main.EMPTY) {
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
    for (var vect, vect_array = Stone.XY_AROUND, vect_ndx = 0; vect=vect_array[vect_ndx], vect_ndx < vect_array.length; vect_ndx++) {
        if (yx[j + vect[1]][i + vect[0]] === color) {
            num += 1;
        }
    }
    return num;
};

// Authorises a diagonal move if first color is on a diagonal stone from i,j
// AND if second color is not next to this diagonal stone
PotentialTerritory.prototype.diagonalMoveOk = function (yx, i, j, first, second) {
    for (var vect, vect_array = Stone.XY_DIAGONAL, vect_ndx = 0; vect=vect_array[vect_ndx], vect_ndx < vect_array.length; vect_ndx++) {
        if (yx[j + vect[1]][i + vect[0]] !== first) {
            continue;
        }
        if (yx[j + vect[1]][i] === second || yx[j][i + vect[0]] === second) {
            continue;
        }
        if (main.debug && i === 1 && j === 9) {
            main.log.debug('diagonal_move_ok: ' + i + ',' + j + ' for ' + first);
        }
        return true;
    }
    return false;
};

PotentialTerritory.AROUND = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 0, -1, 0], [-1, 0, 1, 0]]; // TODO replace this by pre-computed coords
// connect stones close to borders to the border
PotentialTerritory.prototype.connectToBorders = function (yx) {
    for (var n = 2; n <= this.gsize - 1; n++) {
        for (var c, c_array = PotentialTerritory.AROUND, c_ndx = 0; c=c_array[c_ndx], c_ndx < c_array.length; c_ndx++) {
            var i = (( c[0] < 0 ? this.gsize : c[0] * n )) + c[1]; // n,1,n,gsize
            var j = (( c[2] < 0 ? this.gsize : c[2] * n )) + c[3]; // 1,n,gsize,n
            if (yx[j][i] === main.EMPTY) {
                var i2 = (( c[0] < 0 ? this.gsize - 1 : c[0] * n )) + c[1] * 2; // n,2,n,gsize-1
                var j2 = (( c[2] < 0 ? this.gsize - 1 : c[2] * n )) + c[3] * 2; // 2,n,gsize-1,n
                var i3 = (( c[0] < 0 ? this.gsize : c[0] * (n + 1) )) + c[1]; // n+1,1,n+1,gsize
                var j3 = (( c[2] < 0 ? this.gsize : c[2] * (n + 1) )) + c[3]; // 1,n+1,gsize,n+1
                var i4 = (( c[0] < 0 ? this.gsize : c[0] * (n - 1) )) + c[1]; // n-1,1,n-1,gsize
                var j4 = (( c[2] < 0 ? this.gsize : c[2] * (n - 1) )) + c[3]; // 1,n-1,gsize,n-1
                var next2border = yx[j2][i2];
                if (next2border !== main.EMPTY && yx[j3][i3] === main.EMPTY && yx[j4][i4] === main.EMPTY) {
                    this.addStone(yx, i, j, next2border);
                }
            }
        }
    }
};

},{"./BoardAnalyser":6,"./Grid":10,"./Stone":17,"./main":31}],16:[function(require,module,exports){
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
},{"./main":31}],17:[function(require,module,exports){
//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');

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
    // @neighbors contains the neighboring stones (empty or not); no need to compute coordinates anymore
    this.neighbors = new Array(4);
    // @allies and @enemies are used as buffers for corresponding methods (unique_allies, unique_enemies etc.)
    this.allies = new Array(4);
    this.enemies = new Array(4);
}
module.exports = Stone;

Stone.XY_AROUND = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // top, right, bottom, left
Stone.XY_DIAGONAL = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top-right, bottom-right, bottom-left, top-left
Stone.prototype.clear = function () {
    this.color = main.EMPTY;
    this.group = null;
};

// Computes each stone's neighbors (called for each stone after init)
// NB: Stones next to side have only 3 neighbors, and the corner stones have 2
Stone.prototype.findNeighbors = function () {
    this.neighbors.clear();
    for (var coordChange, coordChange_array = Stone.XY_AROUND, coordChange_ndx = 0; coordChange=coordChange_array[coordChange_ndx], coordChange_ndx < coordChange_array.length; coordChange_ndx++) {
        var stone = this.goban.stoneAt(this.i + coordChange[0], this.j + coordChange[1]);
        if (stone !== main.BORDER) {
            this.neighbors.push(stone);
        }
    }
};

Stone.prototype.toString = function () {
    if (this.color === main.EMPTY) {
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

// Returns the empty points around this stone
Stone.prototype.empties = function () {
    return this.neighbors.select(function (s) {
        return s.color === main.EMPTY;
    });
};

// Number of empty points around this stone
Stone.prototype.numEmpties = function () {
    var count = 0;
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === main.EMPTY) {
            count += 1;
        }
    }
    return count;
};

// Returns a string with the list of empty points, sorted (debug only)
Stone.prototype.emptiesDump = function () {
    return this.empties().map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

Stone.prototype.empty = function () {
    return this.color === main.EMPTY;
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
    if (stone.moveIsKo(color)) {
        return false;
    }
    return true;
};

// Is a move a suicide?
// not a suicide if 1 free life around
// or if one enemy group will be killed
// or if the result of the merge of ally groups will have more than 0 life
Stone.prototype.moveIsSuicide = function (color) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === main.EMPTY) {
            return false;
        }
        if (s.color !== color) {
            if (s.group.lives === 1) {
                return false;
            }
        } else if (s.group.lives > 1) {
            return false;
        }
    }
    // $log.debug("move #{@i}, #{@j}, color:#{color} would be a suicide") if $debug
    return true;
};

// Is a move a ko?
// if the move would kill with stone i,j a single stone A (and nothing else!)
// and the previous move killed with stone A a single stone B in same position i,j
// then it is a ko
Stone.prototype.moveIsKo = function (color) {
    // Must kill a single group
    var groupA = null;
    var res = true;
    this.eachEnemy(color, function (enemy) {
        if (enemy.lives !== 1) {
            return;
        }
        if (groupA) {
            res = false;
            return;
        }
        groupA = enemy;
    });
    if (!res || !groupA) {
        return false;
    }
    // This killed group must be a single stone A
    if (groupA.stones.length !== 1) {
        return false;
    }
    var stoneA = groupA.stones[0];
    // Stone A was played just now
    if (this.goban.previousStone() !== stoneA) {
        return false;
    }
    // Stone B was killed by A in same position we are looking at
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
    // $log.debug("ko in #{@i}, #{@j}, color:#{color} cannot be played now") if $debug
    return true;
};

Stone.playAt = function (goban, i, j, color) {
    var stone = goban.playAt(i, j);
    stone.putDown(color);
    return stone;
};

Stone.prototype.die = function () {
    // update_around_before_die
    this.color = main.EMPTY;
    this.group = null;
};

Stone.prototype.resuscitateIn = function (group) {
    this.group = group;
    this.color = group.color; // update_around_on_new
};

// Called to undo a single stone (the main undo feature relies on this)  
Stone.undo = function (goban) {
    var stone = goban.undo();
    if (!stone) {
        return;
    }
    if (main.debug) {
        main.log.debug('Stone.undo ' + stone);
    }
    return stone.takeBack();
};

// Iterate through enemy groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// Example: +@@+
//          +@O+ <- for stone O, the @ group will be selected 2 times
//          ++++
Stone.prototype.eachEnemy = function (allyColor, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== allyColor) {
            cb(s.group);
        }
    }
};

Stone.prototype.uniqueEnemies = function (allyColor) {
    this.enemies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== allyColor && !this.enemies.contains(s.group)) {
            this.enemies.push(s.group);
        }
    }
    return this.enemies;
};

// Iterate through our groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// See also each_enemy
Stone.prototype.eachAlly = function (allyColor, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === allyColor) {
            cb(s.group);
        }
    }
};

Stone.prototype.uniqueAllies = function (color) {
    this.allies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === color && !this.allies.contains(s.group)) {
            this.allies.push(s.group);
        }
    }
    return this.allies;
};

// Called for each new stone played
Stone.prototype.putDown = function (color) {
    this.color = color;
    if (main.debug) {
        main.log.debug('put_down: ' + this.toString());
    }
    var allies = this.uniqueAllies(color); // note we would not need unique if group#merge ignores dupes
    if (allies.length === 0) {
        var lives = 0;
        for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.color === main.EMPTY) {
                lives += 1;
            }
        }
        this.group = this.goban.newGroup(this, lives);
    } else {
        this.group = allies[0];
        this.group.connectStone(this);
    }
    // kill before merging to get the right live-count in merged subgroups
    for (var g, g_array = this.uniqueEnemies(color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.attackedBy(this);
    }
    for (var a = 1; a <= allies.length - 1; a++) {
        this.group.merge(allies[a], this);
    } // update_around_on_new
};

Stone.prototype.takeBack = function () {
    if (main.debugGroup) {
        main.log.debug('take_back: ' + this.toString() + ' from group ' + this.group);
    }
    this.group.unmergeFrom(this);
    this.group.disconnectStone(this);
    for (var g, g_array = this.uniqueEnemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.notAttackedAnymore(this);
    }
    // update_around_before_die
    if (main.debugGroup) {
        var logGroup = this.group;
    }
    this.group = null;
    this.color = main.EMPTY;
    Group.resuscitateFrom(this, this.goban);
    if (main.debugGroup) {
        return main.log.debug('take_back: end; main group: ' + logGroup.debugDump());
    }
};

Stone.prototype.setGroupOnMerge = function (newGroup) {
    this.group = newGroup;
};
 // Not used anymore but could become handy again later // def update_around_on_new //   $log.debug("update_around_on_new #{self.debug_dump}") if $debug // end // Not used anymore but could become handy again later // def update_around_before_die //   $log.debug("update_around_before_die #{self.debug_dump}") if $debug // end
// E02: unknown method: select(...)
// E02: unknown method: map(...)
// E02: unknown method: find_index(...)

},{"./Grid":10,"./Group":11,"./main":31}],18:[function(require,module,exports){
//Translated from stone_constants.rb using babyruby2js
'use strict';

var main = require('./main');
// Special stone values in goban
main.BORDER = null;
// Colors
main.EMPTY = -1;
main.BLACK = 0;
main.WHITE = 1;
},{"./main":31}],19:[function(require,module,exports){
//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class tolerance allows you to ignore a bad performance to some extent. E.g 1.05 gives you 5% tolerance up
 *  ratio allows you to adapt to slower or faster system. E.g 1.0 if your system is as slow as mine :(
 */
function TimeKeeper(tolerance, ratio) {
    if (tolerance === undefined) tolerance = 1.15;
    if (ratio === undefined) ratio = 1.0;
    this.tolerance = tolerance;
    this.ratio = ratio;
    this.log = main.log;
}
module.exports = TimeKeeper;

TimeKeeper.prototype.setGcTolerance = function () {};

// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype.calibrate = function (expected) {
    var t0 = Date.now();
    for (var _i = 0; _i < 2000; _i++) {
        var m = {};
        for (var n = 0; n < 100; n++) {
            m[n.toString()] = n;
        }
        for (n = 0; n < 1000; n++) {
            m[(n % 100).toString()] += 1;
        }
    }
    var duration = (Date.now() - t0) / 1000;
    this.ratio = duration / expected;

    // TODO: re-estimate decent numbers for JS. The lines above are MUCH faster in JS/Chrome
    // than Ruby used to be (on same machine). But the speed tests we have are not always that 
    // much faster, hence if we accept the ratio we computed here we would fail many of them.
    // In the meantime we use a conservative 0.5 ratio.
    this.ratio = 0.5;

    this.log.info('TimeKeeper calibrated at ratio=' + '%.02f'.format(this.ratio) + ' ' + '(ran calibration in ' + '%.03f'.format(duration) + ' instead of ' + expected + ')');
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec, expectedGc) {
    this.taskName = taskName;
    this.expectedTime = expectedInSec * this.ratio;
    this.log.info('Started "' + taskName + '"...'); // (expected time #{'%.02f' % @expected_time}s)..."
    this.t0 = Date.now();
};

// Stops timing, displays the report and raises exception if we went over limit
// Unless raise_if_overlimit is false, in which case we would simply log and return the error message
TimeKeeper.prototype.stop = function (raiseIfOverlimit) {
    if (raiseIfOverlimit === undefined) raiseIfOverlimit = true;
    this.duration = (Date.now() - this.t0) / 1000;
    this.log.info(' => ' + this.resultReport());
    return this.checkLimits(raiseIfOverlimit);
};

TimeKeeper.prototype.resultReport = function () {
    var s = '';
    s += 'Measuring "' + this.taskName + '":';
    s += ' time: ' + '%.02f'.format(this.duration) + 's (expected ' +
        '%.02f'.format(this.expectedTime) + ' hence ' +
        '%.02f'.format((this.duration / this.expectedTime * 100)) + '%)';
    return s;
};

//private;
TimeKeeper.prototype.checkLimits = function (raiseIfOverlimit) {
    if (this.duration > this.expectedTime * this.tolerance) {
        var msg1 = 'Duration over limit: ' + this.duration;
        if (raiseIfOverlimit) {
            throw new Error(msg1);
        }
        return msg1;
    }
    return '';
};

},{"./main":31}],20:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class public read-only attribute: grid
 *  if a grid is given, it is used as starting point; 
 *  otherwise, the goban scoring_grid is used.
 */
function ZoneFiller(goban, grid) {
    if (grid === undefined) grid = null;
    if (!grid) {
        grid = goban.scoringGrid.convert(goban.grid);
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
    if (neighbors === undefined) neighbors = null;
    // $log.debug("fill #{start_i} #{start_j}; replace #{to_replace} with #{color}") if $debug
    if (this.yx[startJ][startI] !== toReplace) {
        return 0;
    }
    var vcount = 0;
    this.toReplace = toReplace;
    this.groups = neighbors;
    var gaps = [[startI, startJ, startJ]];
    var gap, i, j0, j1;
    while ((gap = gaps.pop())) {
        // $log.debug("About to do gap: #{gap} (left #{gaps.size})") if $debug
        var _m = gap;
        i = _m[0];
        j0 = _m[1];
        j1 = _m[2];
        
        if (this.yx[j0][i] !== toReplace) { // gap already done by another path
            continue;
        }
        while (this._check(i, j0 - 1)) {
            j0 -= 1;
        }
        while (this._check(i, j1 + 1)) {
            j1 += 1;
        }
        vcount += j1 - j0 + 1;
        // $log.debug("Doing column #{i} from #{j0}-#{j1}") if $debug
        for (var ix = (i - 1); ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                // $log.debug("=>coloring #{i},#{j}") if $debug and ix<i
                if (ix < i) {
                    this.yx[j][i] = color;
                }
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
            }
            // upto j
            // $log.debug("--- pushing gap [#{ix},#{curgap},#{j1}]") if $debug and curgap
            if (curgap) { // last gap
                gaps.push([ix, curgap, j1]);
            }
        } // each ix
    }
    // while gap
    return vcount;
};

//private;
// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === main.BORDER) {
        return false;
    }
    if (color === this.toReplace) {
        return true;
    }
    if (this.groups && color < 2) {
        var group = this.goban.stoneAt(i, j).group;
        if (group && this.groups[color].indexOf(group) < 0) {
            this.groups[color].push(group);
        }
    }
    return false;
};

// E02: unknown method: find_index(...)
},{"./main":31}],21:[function(require,module,exports){
//Translated from all_heuristics.rb using babyruby2js
'use strict';

var Heuristic = require('./Heuristic');
// When creating a new heuristic, remember to add it here.
var Spacer = require('./Spacer');
var Executioner = require('./Executioner');
var Savior = require('./Savior');
var Hunter = require('./Hunter');
var Connector = require('./Connector');
var Pusher = require('./Pusher');
var NoEasyPrisoner = require('./NoEasyPrisoner');
Heuristic.allHeuristics = function () {
    return [Spacer, Executioner, Savior, Hunter, Connector, Pusher, NoEasyPrisoner];
};

},{"./Connector":22,"./Executioner":23,"./Heuristic":24,"./Hunter":25,"./NoEasyPrisoner":26,"./Pusher":27,"./Savior":28,"./Spacer":29}],22:[function(require,module,exports){
//Translated from connector.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Basic: a move that connects 2 of our groups is good.
// TODO: this could threaten our potential for keeping eyes, review this.
var Heuristic = require('./Heuristic');

/** @class */
function Connector(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);
    this.allyCoeff1 = this.getGene('ally-1enemy', 0.33, 0.01, 1.0);
    this.allyCoeff2 = this.getGene('ally-more-enemies', 1.66, 0.01, 3.0);
}
inherits(Connector, Heuristic);
module.exports = Connector;

Connector.prototype.evalMove = function (i, j) {
    // we care a lot if the enemy is able to cut us,
    // and even more if by connecting we cut them...
    // TODO: the opposite heuristic - a cutter; and make both more clever.
    var stone = this.goban.stoneAt(i, j);
    var enemies = stone.uniqueEnemies(this.color);
    var numEnemies = enemies.length;
    var allies = stone.uniqueAllies(this.color);
    var numAllies = allies.length;
    if (numAllies < 2) { // nothing to connect here
        return 0;
    }
    if (numAllies === 3 && numEnemies === 0) { // in this case we never want to connect unless enemy comes by
        return 0;
    }
    if (numAllies === 4) {
        return 0;
    }
    if (numAllies === 2) {
        var s1, s2;
        s1 = s2 = null;
        var nonUniqueCount = 0;
        for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === allies[0]) {
                s1 = s;
            }
            if (s.group === allies[1]) {
                s2 = s;
            }
            if (s.color === this.color) {
                nonUniqueCount += 1;
            }
        }
        if (nonUniqueCount === 3 && numEnemies === 0) {
            return 0;
        }
        // Case of diagonal (strong) stones (TODO: handle the case with a 3rd stone in same group than 1 or 2)
        if (nonUniqueCount === 2 && s1.i !== s2.i && s1.j !== s2.j) {
            // No need to connect if both connection points are free
            if (this.goban.empty(s1.i, s2.j) && this.goban.empty(s2.i, s1.j)) {
                return 0;
            }
        }
    }
    switch (numEnemies) {
    case 0:
        var _eval = this.inflCoeff / this.inf.map[j][i][this.color];
        break;
    case 1:
        _eval = this.allyCoeff1 * numAllies;
        break;
    default: 
        _eval = this.allyCoeff2 * numAllies;
    }
    if (main.debug) {
        main.log.debug('Connector gives ' + '%.2f'.format(_eval) + ' to ' + i + ',' + j + ' (allies:' + numAllies + ' enemies: ' + numEnemies + ')');
    }
    return _eval;
};

},{"../main":31,"./Heuristic":24,"util":4}],23:[function(require,module,exports){
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

Executioner.prototype.evalMove = function (i, j) {
    var threat, saving;
    var stone = this.goban.stoneAt(i, j);
    threat = saving = 0;
    for (var g, g_array = stone.uniqueEnemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives > 1) { // NB: more than 1 is a job for hunter
            continue;
        }
        threat += g.stones.length;
        for (var ally, ally_array = g.allEnemies(), ally_ndx = 0; ally=ally_array[ally_ndx], ally_ndx < ally_array.length; ally_ndx++) {
            if (ally.lives > 1) {
                continue;
            }
            saving += ally.stones.length;
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

},{"../main":31,"./Heuristic":24,"util":4}],24:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 *  public read-only attribute: negative
 */
function Heuristic(player, consultant) {
    if (consultant === undefined) consultant = false;
    this.player = player;
    this.consultant = consultant;
    this.negative = false;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;
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

// A "negative" heuristic is one that can only give a negative score (or 0.0) to a move.
// We use this difference to spare some CPU work when a move is not good enough 
// (after running the "positive" heuristics) to beat the current candidate.
Heuristic.prototype.setAsNegative = function () {
    this.negative = true;
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.player.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

},{}],25:[function(require,module,exports){
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
    var eg1, eg2, eg3;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var allies = stone.uniqueAllies(this.color);
    eg1 = eg2 = eg3 = null;
    var snapback = false;
    for (var eg, eg_array = stone.uniqueEnemies(this.color), eg_ndx = 0; eg=eg_array[eg_ndx], eg_ndx < eg_array.length; eg_ndx++) {
        if (eg.lives !== 2) { // NB if 1 this is a case for Executioner
            continue;
        }
        // if even a single of our groups around is in atari this will not work (enemy will kill our group and escape)
        if (eg.allEnemies().find(function (ag) {
            return ag.lives < 2;
        })) {
            continue;
        }
        if (empties.length === 1 && allies.length === 0) {
            // unless this is a snapback, this is a dumb move
            var empty = stone.neighbors.find(function (n) {
                return n.color === main.EMPTY;
            });
            // it is a snapback if the last empty point (where the enemy will have to play) 
            // would not make the enemy group connect to another enemy group
            // (equivalent to: the empty point has no other enemy group as neighbor)
            var enemiesAroundEmpty = empty.uniqueAllies(eg.color);
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
        if (!eg1) {
            eg1 = eg;
        } else if (!eg2) {
            eg2 = eg;
        } else {
            eg3 = eg;
        }
    }
    // each eg
    if (!eg1) {
        return 0;
    }
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
    // keep the max of both attacks (if both are succeeding)
    var taken = ( this.atariIsCaught(eg1, level) ? eg1.stones.length : 0 );
    var taken2 = ( eg2 && this.atariIsCaught(eg2, level) ? eg2.stones.length : 0 );
    var taken3 = ( eg3 && this.atariIsCaught(eg3, level) ? eg3.stones.length : 0 );
    if (taken < taken2) {
        taken = taken2;
    }
    if (taken < taken3) {
        taken = taken3;
    }
    Stone.undo(this.goban);
    if (main.debug && taken > 0) {
        main.log.debug('Hunter found a threat of ' + taken + ' at ' + i + ',' + j);
    }
    return taken;
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


},{"../Stone":17,"../main":31,"./Heuristic":24,"util":4}],26:[function(require,module,exports){
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
    this.setAsNegative();
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
        score = -g.stones.length;
        if (main.debug) {
            main.log.debug('NoEasyPrisoner says ' + i + ',' + j + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) {
            main.log.debug('NoEasyPrisoner asking Hunter to look at ' + i + ',' + j);
        }
        if (this.enemyHunter.escapingAtariIsCaught(stone)) {
            score = -g.stones.length;
            if (main.debug) {
                main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + i + ',' + j + ' is foolish  (' + score + ')');
            }
        }
    }
    Stone.undo(this.goban);
    return score;
};

},{"../Stone":17,"../main":31,"./Heuristic":24,"./Hunter":25,"util":4}],27:[function(require,module,exports){
//Translated from pusher.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Quite a dumb way of "pushing" our influence further...
// For that reason the coeff are rather low.
// This should eventually disappear.
var Heuristic = require('./Heuristic');

/** @class */
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
    var score = 0.33 * (this.enemyCoeff * enemyInf - this.allyCoeff * allyInf);
    if (main.debug) {
        main.log.debug('Pusher heuristic sees influences ' + allyInf + ' - ' + enemyInf + ' at ' + i + ',' + j + ' -> ' + '%.03f'.format(score));
    }
    return score;
};

},{"../main":31,"./Heuristic":24,"util":4}],28:[function(require,module,exports){
//Translated from savior.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Stone = require('../Stone');
// Saviors rescue ally groups in atari
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class */
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

Savior.prototype.evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    var threat = this.evalEscape(i, j, stone);
    if (main.debug && threat > 0) {
        main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + i + ',' + j);
    }
    return threat;
};

//private;
Savior.prototype.evalEscape = function (i, j, stone) {
    var threat, livesAdded;
    threat = livesAdded = 0;
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        var newThreat = null;
        if (g.lives === 1) {
            // NB: if more than 1 group in atari, they merge if we play this "savior" stone
            newThreat = g.stones.length;
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
            if (main.debug) {
                main.log.debug('Savior giving up on threat of ' + threat + ' in ' + i + ',' + j);
            }
            return 0;
        }
    }
    return threat;
};

},{"../Stone":17,"../main":31,"./Heuristic":24,"./Hunter":25,"util":4}],29:[function(require,module,exports){
//Translated from spacer.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
// Vague idea that playing where we already have influence is moot.
var Heuristic = require('./Heuristic');

/** @class */
function Spacer(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 2.0, 0.0, 8.0);
    this.cornerCoeff = this.getGene('corner', 2.0, 0.0, 8.0);
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype.evalMove = function (i, j) {
    var enemyInf, allyInf;
    enemyInf = allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var inf = this.inf.map[j][i];
    enemyInf += inf[this.enemyColor];
    allyInf += inf[this.color];
    for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        inf = this.inf.map[s.j][s.i];
        enemyInf += inf[this.enemyColor];
        allyInf += inf[this.color];
    }
    var totalInf = enemyInf + allyInf;
    var corner = 3;
    var dbX = this.distanceFromBorder(i);
    var dbY = this.distanceFromBorder(j);
    var dcX = 1 + Math.abs((dbX - corner));
    var dcY = 1 + Math.abs((dbY - corner));
    var dc = dcX + dcY;
    // hacky: why play on border if no one is around?
    if (dbX < 2) {
        totalInf += (20 * (2 - dbX)) / (totalInf + 1);
    }
    if (dbY < 2) {
        totalInf += (20 * (2 - dbY)) / (totalInf + 1);
    }
    // TESTME
    // remove points only if we fill up our own territory
    var ter = this.ter.potential().yx;
    var fillOwnTer = ( this.color === main.BLACK ? ter[j][i] : -ter[j][i] );
    if (fillOwnTer > 0) { // filling up enemy's space is not looked at here
        fillOwnTer = 0;
    }
    if (main.debug && fillOwnTer !== 0) {
        main.log.debug('Spacer sees potential territory score ' + fillOwnTer + ' in ' + i + ',' + j);
    }
    return fillOwnTer + 1.33 / (totalInf * this.inflCoeff + dc * this.cornerCoeff + 1);
};

Spacer.prototype.distanceFromBorder = function (n) {
    if (n - 1 < this.gsize - n) {
        return n - 1;
    } else {
        return this.gsize - n;
    }
};

},{"../main":31,"./Heuristic":24,"util":4}],30:[function(require,module,exports){
'use strict';

var main = require('./main');
window.main = main;

require('./StoneConstants');
require('./rb');

main.GameLogic = require('./GameLogic');
main.Grid = require('./Grid');
main.Ai1Player = require('./Ai1Player');

//main.Ui = require('./Ui');

main.debug = false;

},{"./Ai1Player":5,"./GameLogic":7,"./Grid":10,"./StoneConstants":18,"./main":31,"./rb":32}],31:[function(require,module,exports){
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

TestSeries.prototype.run = function (logfunc) {
  main.log.setLogFunc(logfunc);
  main.log.level = Logger.INFO;

  main.assertCount = 0;
  var startTime = Date.now();
  var classCount = 0, testCount = 0, failedCount = 0, errorCount = 0;
  for (var t in this.testCases) {
    classCount++;
    var Klass = this.testCases[t];
    for (var method in Klass.prototype) {
      if (typeof Klass.prototype[method] !== 'function') continue;
      if (method.substr(0,4) !== 'test') continue;
      testCount++;
      var obj = new Klass(Klass.name + '#' + method);
      try {
        obj[method].call(obj);
      } catch(e) {
        var header = 'Test failed';
        if (e.message.startWith(FAILED_ASSERTION_MSG)) {
          failedCount++;
        } else {
          header += ' with exception';
          errorCount++;
        }
        main.log.error(header + ': ' + obj.testName + ': ' + e.message + '\n' + e.stack);
      }
    }
  }
  var duration = ((Date.now() - startTime) / 1000).toFixed(2);
  var report = 'Completed tests. (' + classCount + ' classes, ' + testCount + ' tests, ' +
    main.assertCount + ' assertions in ' + duration + 's)' +
    ', failed: ' + failedCount + ', exceptions: ' + errorCount;
  main.log.info(report);
  return report;
};


/** @class */
function TestCase(testName) {
  this.testName = testName;
}

function _fail(msg, comment) {
  comment = comment ? comment + ': ' : '';
  throw new Error(FAILED_ASSERTION_MSG + comment + msg);
}

function _checkValue(expected, val, comment) {
  if (expected instanceof Array) {
    if (!val instanceof Array)
      _fail('expected Array but got ' + val, comment);
    if (val.length !== expected.length) {
      console.warn('Expected:\n', expected, 'Value:\n', val)
      _fail('expected Array of size ' + expected.length + ' but got size ' + val.length, comment);
    }

    for (var i = 0; i < expected.length; i++) {
      _checkValue(expected[i], val[i], comment);
    }
    return;
  }
  if (val === expected) return;
  _fail('expected [' + expected + '] but got [' + val + ']', comment);
}

main.assertEqual = function (expected, val, comment) {
  main.assertCount++;
  _checkValue(expected, val, comment);
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
}

main.log = new Logger();
main.Logger = Logger;

},{}],32:[function(require,module,exports){
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

},{}]},{},[30]);

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

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

},{}],5:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],6:[function(require,module,exports){
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
},{"./support/isBuffer":5,"_process":4,"inherits":3}],7:[function(require,module,exports){
module.exports={
    ".cgos": {
        "useAreaScoring": true,
        "usePositionalSuperko": true
    },
    ".chinese": {
        "useAreaScoring": true,
        "usePositionalSuperko": true
    },
    ".japanese": {}
}

},{}],8:[function(require,module,exports){
'use strict';

var CONST = require('./constants');
var main = require('./main');
var Genes = require('./Genes');
var Grid = require('./Grid');
var TimeKeeper = require('./test/TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;

var MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
var WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
var TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game


/** @class */
function Breeder(gameSize, komi) {
    this.gsize = gameSize;
    this.komi = komi;
    this.timer = new TimeKeeper();
    this.game = new GameLogic();
    this.game.setRules(CONST.JP_RULES);
    this.game.setLogLevel('all=0');
    this.game.newGame(this.gsize);
    this.goban = this.game.goban;
    this.scorer = new ScoreAnalyser(this.game);
    this.genSize = 26; // default; must be even number
    this.seenGames = {};
    this.skipDupeEndings = false;

    this.controlGenes = null;
    this.players = [];
    this.generation = this.newGeneration = this.scoreDiff = null;
}
module.exports = Breeder;


function getAiName(Ai) { return Ai.publicName + '-' + Ai.publicVersion; }

Breeder.prototype.initPlayers = function (BlackAi, WhiteAi) {
    for (var color = BLACK; color <= WHITE; color++) {
        var Ai = (color === BLACK ? BlackAi : WhiteAi) || main.defaultAi;
        this.players[color] = new Ai(this.game, color);
        this.game.setPlayer(color, getAiName(Ai));
    }
};

Breeder.prototype.initFirstGeneration = function () {
    this.controlGenes = this.players[WHITE].genes.clone('control');
    this.generation = [];
    this.newGeneration = [];
    for (var i = 0; i < this.genSize; i++) {
        this.generation.push(this.players[WHITE].genes.clone('g1#' + i).mutateAll());
        this.newGeneration.push(new Genes(null, null, 'g2#' + i));
    }
    this.scoreDiff = [];
};

Breeder.prototype.showInUi = function (title, msg) {
    if (main.testUi) main.testUi.showTestGame(title, msg, this.game);
};

// Returns true if this game ending was not seen before
Breeder.prototype.playUntilGameEnds = function () {
    var game = this.game, moveNum = 0, maxMoveNum = 2 * this.gsize * this.gsize;
    while (!game.gameEnding) {
        var curPlayer = this.players[game.curColor];
        var move = curPlayer.getMove();
        game.playOneMove(move);
        if (++moveNum === maxMoveNum) break;
    }
    var numTimesSeen = this._countAlreadySeenGames();
    if (moveNum === maxMoveNum) {
        if (numTimesSeen === 1) this.showInUi('Never stopping game');
        main.log.error('Never stopping game. Times seen: ' + numTimesSeen);
    }
    return numTimesSeen === 1;
};

// Returns the number of times we saw this game ending
Breeder.prototype._countAlreadySeenGames = function () {
    var img = this.goban.image(), seenGames = this.seenGames;

    if (seenGames[img])
        return ++seenGames[img];
    
    var flippedImg = Grid.flipImage(img);
    if (seenGames[flippedImg])
        return ++seenGames[flippedImg];

    var mirroredImg = Grid.mirrorImage(img);
    if (seenGames[mirroredImg])
        return ++seenGames[mirroredImg];

    var mfImg = Grid.flipAndMirrorImage(img);
    if (seenGames[mfImg])
        return ++seenGames[mfImg];

    seenGames[img] = 1;
    return 1;
};

// Plays a game and returns the score difference in points (>0 if black wins)
// @param {Genes} [genes1] - AI will use its default genes otherwise
// @param {Genes} [genes2]
// @param {string} [initMoves] - e.g. "e5,d4"
Breeder.prototype.playGame = function (genes1, genes2, initMoves) {
    var komi = initMoves && initMoves[0] === 'W' ? - this.komi : this.komi; // reverse komi if W starts

    this.game.newGame(this.gsize, 0, komi);
    this.game.loadMoves(initMoves);
    this.players[BLACK].prepareGame(genes1);
    this.players[WHITE].prepareGame(genes2);
    var scoreDiff;
    try {
        if (!this.playUntilGameEnds() && this.skipDupeEndings) return 0;
        scoreDiff = this.scorer.computeScoreDiff(this.game);
    } catch (err) {
        main.log.error('Exception occurred during a breeding game: ' + err);
        main.log.error(this.game.historyString());
        this.showInUi('Exception in breeding game', err);
        throw err;
    }
    if (main.debugBreed) {
        main.log.debug('\n' + genes1.name + '\nagainst\n' + genes2.name);
        main.log.debug('Distance: ' + genes1.distance(genes2).toFixed(2));
        main.log.debug('Score: ' + scoreDiff);
        main.log.debug('Moves: ' + this.game.historyString());
        main.log.debug(this.goban.toString());
    }
    return scoreDiff;
};

// NB: we only update score for black so komi unbalance does not matter.
// Sadly this costs us a lot: we need to play twice more games to get score data...
Breeder.prototype.oneTournament = function (numMatchPerAi) {
    if (main.debugBreed) main.log.debug('One tournament starts for ' + this.generation.length + ' AIs');

    for (var p1 = 0; p1 < this.genSize; p1++) {
        this.scoreDiff[p1] = 0;
    }
    for (var i = 0; i < numMatchPerAi; i++) {
        for (p1 = 0; p1 < this.genSize; p1++) {
            var p2 = ~~(Math.random()*~~(this.genSize - 1));
            if (p2 === p1) {
                p2 = this.genSize - 1;
            }
            var diff = this.playGame(this.generation[p1], this.generation[p2]);
            if (Math.abs(diff) < TOO_SMALL_SCORE_DIFF) {
                diff = 0;
            } else {
                diff = Math.abs(diff) / diff; // Math.sign later
            }
            // diff is now -1, 0 or +1
            this.scoreDiff[p1] += diff;
            if (main.debugBreed) main.log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' +
                p1 + ':' + this.scoreDiff[p1] + ', #' + p2 + ':' + this.scoreDiff[p2]);
        }
    }
};

Breeder.prototype.reproduction = function () {
    if (main.debugBreed) main.log.debug('=== Reproduction time for ' + this.generation.length + ' AI');

    this.picked = main.newArray(this.genSize, 0);
    this.maxScore = Math.max.apply(Math, this.scoreDiff);
    this.winner = this.generation[this.scoreDiff.indexOf(this.maxScore)];
    this.pickIndex = 0;
    for (var i = 0; i <= this.genSize - 1; i += 2) {
        var parent1 = this.pickParent();
        var parent2 = this.pickParent();
        parent1.mate(parent2, this.newGeneration[i], this.newGeneration[i + 1], MUTATION_RATE, WIDE_MUTATION_RATE);
    }
    if (main.debugBreed) {
        for (i = 0; i < this.genSize; i++) {
            main.log.debug('#' + i + ', score ' + this.scoreDiff[i] + ', picked ' + this.picked[i] + ' times');
        }
    }
    // swap new generation to replace old one
    var swap = this.generation;
    this.generation = this.newGeneration;
    this.newGeneration = swap;
    this.generation[0] = this.winner; // TODO review this; we force the winner (a parent) to stay alive
};

Breeder.prototype.pickParent = function () {
    var i = this.pickIndex;
    for (;;) {
        i = (i + 1) % this.genSize;
        if (Math.random() < this.scoreDiff[i] / this.maxScore) break;
    }
    this.picked[i]++;
    this.pickIndex = i;
    return this.generation[i];
};

Breeder.prototype.control = function (numGames) {
    var totalScore, numWins, numWinsW;
    var previous = main.debugBreed;
    main.debugBreed = false; // never want debug during control games

    main.log.info('Playing ' + numGames * 2 + ' games to measure the current winner against our control AI...');
    totalScore = numWins = numWinsW = 0;
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame(this.controlGenes, this.winner);
        var scoreW = this.playGame(this.winner, this.controlGenes);
        if (score > 0) numWins++;
        if (scoreW < 0) numWinsW++;
        totalScore += score - scoreW;
    }
    main.log.info('Average score: ' + totalScore / numGames +
        '\nWinner genes:\n' + this.winner +
        '\nControl genes:\n' + this.controlGenes +
        '\nDistance between control and current winner: ' + this.controlGenes.distance(this.winner).toFixed(2) +
        '\nTotal score of control against current winner: ' + totalScore +
        ' (out of ' + numGames * 2 + ' games, control won ' +
        numWins + ' as black and ' + numWinsW + ' as white)');
    main.debugBreed = previous;
};

// Play many games AI VS AI
// Returns the ratio of games won by White, e.g. 0.6 for 60% won
Breeder.prototype.aiVsAi = function (numGames, numGamesShowed, initMoves) {
    var BlackAi, WhiteAi = main.latestAi;
    switch (main.defaultAi) {
    case main.latestAi: BlackAi = main.previousAi; break;
    case main.previousAi: BlackAi = main.olderAi; WhiteAi = main.previousAi; break;
    case main.olderAi: BlackAi = main.defaultAi; break;
    }
    this.initPlayers(BlackAi, WhiteAi);

    var blackName = this.game.playerNames[BLACK], whiteName = this.game.playerNames[WHITE];
    var gsize = this.gsize;
    var descMoves = initMoves ? ' [' + initMoves + ']' : '';
    var desc = numGames + ' games on ' + gsize + 'x' + gsize + ', komi=' + this.komi + ', ' +
        whiteName + ' VS ' + blackName + '(B)' + descMoves;
    var expectedDuration = numGames * 0.05 * gsize * gsize / 81;

    this.timer.start(desc, expectedDuration);
    this.skipDupeEndings = true;
    var totalScore = 0, numDupes = 0, numCloseMatch = 0, numMoves = 0, numRandom = 0;
    var won = [0, 0];
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame(null, null, initMoves);
        numMoves += this.game.history.length;
        numRandom += this.players[WHITE].numRandomPicks;
        if (score === 0) { numDupes++; continue; }

        var winner = score > 0 ? BLACK : WHITE;
        if (++won[winner] <= numGamesShowed) this.showInUi('Breeding game #' + won[winner] +
            ' won by ' + Grid.colorName(winner), this.game.historyString());
        if (Math.abs(score) < 3) numCloseMatch++;
        totalScore += score;
    }
    this.timer.stop(/*lenientIfSlow=*/true);

    var uniqGames = numGames - numDupes;
    var winRatio = won[WHITE] / uniqGames;
    main.log.info('Unique games: ' + uniqGames + ' (' + ~~(uniqGames  / numGames * 100) + '%)');
    main.log.info('Average score difference: ' + (-totalScore / uniqGames).toFixed(1));
    main.log.info('Close match (score diff < 3 pts): ' + ~~(numCloseMatch / uniqGames * 100) + '%');
    main.log.info('Average number of moves: ' + ~~(numMoves / numGames));
    main.log.info('Average number of times White picked at random between equivalent moves: ' + (numRandom / numGames).toFixed(1));
    main.log.info('Average time per move: ' + (this.timer.duration * 1000 / numMoves).toFixed(1) + 'ms');
    main.log.info('Won games for White-' + whiteName +
        ' VS Black-' + blackName + descMoves + ': ' + (winRatio * 100).toFixed(1) + '%');

    return winRatio; // White's victory ratio
};

/** genSize must be an even number (e.g. 26) */
Breeder.prototype.run = function (genSize, numTournaments, numMatchPerAi) {
    this.genSize = genSize;
    this.initPlayers();
    this.initFirstGeneration();
    var gsize = this.gsize;
    var expectedDuration = genSize * numTournaments * numMatchPerAi * 0.05 * gsize * gsize / 81;

    for (var i = 1; i <= numTournaments; i++) { // TODO: Find a way to appreciate the progress
        var tournamentDesc = 'Breeding tournament ' + i + '/' + numTournaments +
            ': each of ' + this.genSize + ' AIs plays ' + numMatchPerAi + ' games';
        this.timer.start(tournamentDesc, expectedDuration);
        this.oneTournament(numMatchPerAi);
        this.timer.stop(/*lenientIfSlow=*/true);
        this.reproduction();
        this.control(numMatchPerAi);
    }
};

},{"./GameLogic":9,"./Genes":10,"./Grid":12,"./ScoreAnalyser":16,"./constants":72,"./main":73,"./test/TimeKeeper":93}],9:[function(require,module,exports){
'use strict';

var CONST = require('./constants');
var main = require('./main');
var Goban = require('./Goban');
var Grid = require('./Grid');
var HandicapSetter = require('./HandicapSetter');
var SgfReader = require('./SgfReader');
var ruleConfig = require('../config/rules.json');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;

var DEFAULT_RULES = CONST.JP_RULES;


/** @class GameLogic enforces the game logic.
 * NB: it makes sense for GameLogic to keep the komi, e.g. in case AI want to evaluate 
 * the score in mid-game.
 * public read-only attribute: goban, komi, curColor, gameEnded, gameEnding, whoResigned
 */
function GameLogic(src) {
    this.history = [];
    this.errors = [];
    this.infos = {};
    this.playerNames = [];
    this.setRules(DEFAULT_RULES);

    this.goban = null;
    this.handicap = this.komi = this.numPass = 0;
    this.curColor = this.whoStarts = BLACK;
    this.gameEnding = this.gameEnded = null;
    this.whoResigned = this.resignReason = null;

    if (src) this.copy(src);
}
module.exports = GameLogic;


// Note that player info remains until this method is called again (i.e. for several games)
GameLogic.prototype.setPlayer = function (color, name) {
    this.playerNames[color] = name;
};

GameLogic.prototype.setRules = function (rulesName, okIfUnknown) {
    rulesName = rulesName || 'unspecified';
    this.rulesName = rulesName;
    var rules = ruleConfig['.' + rulesName.toLowerCase()];
    if (!rules) {
        if (!okIfUnknown) throw new Error('Invalid rules: ' + rulesName +
            '\nValid values: ' + Object.keys(ruleConfig).map(function (s) { return s.substr(1); }).join(', '));
        rules = ruleConfig['.' + DEFAULT_RULES.toLowerCase()];
    }
    this.usePositionalSuperko = rules.usePositionalSuperko || false;
    this.useAreaScoring = rules.useAreaScoring || false;
};

GameLogic.prototype.copy = function (src) {
    this.setWhoStarts(src.whoStarts);
    this.setPlayer(BLACK, src.playerNames[BLACK]);
    this.setPlayer(WHITE, src.playerNames[WHITE]);
    this.setRules(src.rulesName, /*okIfUnknown=*/true);

    this.newGame(src.goban.gsize, src.handicap, src.komi);

    this.loadMoves(src.history.join(','));
};

// Handicap and komi are optional.
// Returns true if size and handicap could be set to given values.
// NB: setRules must be called before this, unless rules did not change.
GameLogic.prototype.newGame = function (gsize, handicap, komi) {
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = this.resignReason = null;

    if (!this.goban || gsize !== this.goban.gsize) {
        this.goban = new Goban(gsize);
    } else {
        this.goban.clear();
    }
    this.goban.setPositionalSuperko(this.usePositionalSuperko);

    handicap = handicap !== undefined ? handicap : 0;
    this.setHandicapAndWhoStarts(handicap);

    this.komi = komi !== undefined ? komi : (handicap ? 0.5 : 6.5);

    if (this.goban.gsize !== gsize) return this._errorMsg('Size could not be set: ' + gsize);
    if (this.handicap !== handicap) return this._errorMsg('Handicap could not be set: ' + handicap);
    return true;
};

GameLogic.prototype.setWhoStarts = function (color) {
    this.curColor = this.whoStarts = color;
};

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
GameLogic.prototype.setHandicapAndWhoStarts = function (h) {
    if (this.history.length > 0) {
        throw new Error('Handicap cannot be changed during a game');
    }
    this.handicap = HandicapSetter.setHandicap(this.goban, h);

    // White first when handicap > 0
    this.setWhoStarts(this.handicap > 0 ? WHITE : BLACK);
    return true;
};

GameLogic.prototype._failLoad = function (msg, errors) {
    main.log.error(msg);
    if (!errors) throw new Error(msg);
    errors.push(msg);
    return false;
};

// @param {string} game - moves, e.g. "c2,b2,pass,b4,b3,undo,b4,pass,b3"
// @param {string[]} [errors] - errors will be added to this or thrown
GameLogic.prototype.loadMoves = function (game, errors) {
    if (!game) return true;
    var moves = game.split(',');
    for (var i = 0; i < moves.length; i++) {
        if (!this.playOneMove(moves[i])) {
            return this._failLoad('Failed playing loaded move #' + (i + 1) + ':\n' +
                this.getErrors().join(', '), errors);
        }
    }
    return true;
};

/**
 + Loads an SGF format game
 * @param {string} game - SGF game text
 * @param {string[]} [errors] - errors will be added to this or thrown
 * @param {number} [upToMoveNumber] - loads moves up to the position before this - SGF only
 * @return {boolean} - true if succeeded
 */
GameLogic.prototype.loadSgf = function (game, errors, upToMoveNumber) {
    var reader = new SgfReader(), infos;
    try {
        this.infos = infos = reader.readGame(game, upToMoveNumber);
    } catch (err) {
        return this._failLoad('Failed loading SGF moves:\n' + err, errors);
    }

    this.newGame(infos.boardSize, 0, infos.komi); // handicap, if any, will be in move list
    this.setPlayer(BLACK, infos.playerBlack);
    this.setPlayer(WHITE, infos.playerWhite);
    this.setRules(infos.rules, /*okIfUnknown=*/true);

    return this.loadMoves(reader.toMoveList(), errors);
};

// Call this when the format of game to load is unknown
GameLogic.prototype.loadAnyGame = function (game, errors) {
    if (SgfReader.isSgf(game)) {
        return this.loadSgf(game, errors);
    } else {
        return this.loadMoves(game, errors);
    }
}; 

function getMoveColor(move) {
    switch (move[0]) {
    case 'B': return BLACK;
    case 'W': return WHITE;
    default: return undefined;
    }
}

GameLogic.prototype.stripMoveColor = function (move) {
    if (move[0] !== 'B' && move[0] !== 'W') return move;
    if (move[1] !== '-') return move.substr(1);
    return move.substr(2);
};

function addMoveColor(move, color) {
    return (color === BLACK ? 'B-' : 'W-') + move;
}

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) return this._errorMsg('Game already ended');

    if (/^[B|W]?-?[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playOneStone(move);
    }
    var cmd = this.stripMoveColor(move);
    if (cmd.startsWith('pass')) {
        return this.passOneMove();
    } else if (cmd.startsWith('resi')) {
        return this.resign(getMoveColor(move));
    } else if (cmd === 'undo') {
        return this._requestUndo();
    } else if (cmd === 'half_undo') {
        return this._requestUndo(true);
    } else if (cmd.startsWith('hand')) {
        return this.setHandicapAndWhoStarts(cmd.split(':')[1]);
    } else if (cmd.startsWith('load:')) {
        return this.loadMoves(cmd.slice(5));
    } else if (cmd.startsWith('log')) {
        return this.setLogLevel(cmd.split(':')[1]);
    } else {
        return this._errorMsg('Invalid command: ' + cmd);
    }
};

// Handles a new stone move (not special commands like "pass")
// e.g. "c3" or "Bc3" or "Wc3"
GameLogic.prototype.playOneStone = function (move) {
    var coords = this.oneMove2xy(move);
    if (coords.length === 3) this.curColor = coords[2];
    var i = coords[0], j = coords[1];
    if (!this.goban.isValidMove(i, j, this.curColor)) {
        return this._errorMsg('Invalid move: ' + move);
    }
    this.goban.playAt(i, j, this.curColor);
    this._storeMoveInHistory(move);
    this._nextPlayer();
    this.numPass = 0;
    return true;
};

// Parses a move like "c12" into [3,12]; OR "Bc1" into [3,1,0]
// Returns null if move is "pass" or "resi(gn)"; throws if move is illegal
GameLogic.prototype.oneMove2xy = function (move) {
    var color = getMoveColor(move);
    if (color !== undefined) move = this.stripMoveColor(move);

    var coords = Grid.move2xy(move, /*dontThrow=*/true);
    if (!coords) {
        if (move === 'pass' || move.startsWith('resi')) return null;
        throw new Error('Illegal move parsed: ' + move);
    }
    if (color !== undefined) return coords.concat(color);
    return coords;
};

// One player resigns.
GameLogic.prototype.resign = function (color, reason) {
    color = color !== undefined ? color : this.curColor;
    this.whoResigned = color;
    this.resignReason = reason;
    var move = addMoveColor('resign', color) + (reason ? '-' + reason : '');
    this._storeMoveInHistory(move);
    this.gameEnded = true;
    this.gameEnding = false;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.passOneMove = function () {
    this._storeMoveInHistory(addMoveColor('pass', this.curColor));
    this.numPass++;
    if (this.numPass >= 2) {
        this.gameEnding = true;
    }
    this._nextPlayer();
    return true;
};

// Call this each time GameLogic#game_ending goes to true (ending mode).
// The score should be counted and proposed to players.
// "accept" parameter should be true if all players accept the proposed ending (score count).
// Only after this call will the game be really finished.
// If accept=false, this means a player refuses to end here
// => the game should continue until the next time all players pass.
GameLogic.prototype.acceptEnding = function (accept, whoRefused) {
    if (!this.gameEnding) return this._errorMsg('The game is not ending yet');
    this.gameEnding = false;
    if (accept) {
        this.gameEnded = true; // ending accepted. Game is finished.
        return true;
    }
    // Score refused (in dispute)
    // if the player who refused just played, we give the turn back to him
    if (whoRefused !== this.curColor) {
        this.history.pop(); // remove last "pass"
        this._nextPlayer();
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
    var hand = this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '';
    var h = this.history;
    var color1 = h.length && h[0].length === 2 ? addMoveColor('', this.whoStarts) : '';
    return hand + color1 + h.join(',');
};

// Stores a new error message
// Always returns false.
GameLogic.prototype._errorMsg = function (msg) {
    this.errors.push(msg);
    return false;
};

// Returns the error messages noticed until now and clears the list.
GameLogic.prototype.getErrors = function () {
    var errors = this.errors;
    this.errors = [];
    return errors;
};

GameLogic.prototype.setLogLevel = function (cmd) {
    var args = cmd.split('=');
    var flag = parseInt(args[1]) !== 0;
    switch (args[0]) {
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
        return this._errorMsg('Invalid log command: ' + cmd);
    }
    return true;
};

GameLogic.prototype._nextPlayer = function () {
    this.curColor = 1 - this.curColor;
};

GameLogic.prototype._storeMoveInHistory = function (move) {
    return this.history.push(move);
};

// undo one full game turn (e.g. one black move and one white)
GameLogic.prototype._requestUndo = function (halfMove) {
    var count = halfMove ? 1 : 2;
    if (this.history.length < count) {
        return this._errorMsg('Nothing to undo');
    }
    for (var i = count; i >= 1; i--) {
        var move = this.history.pop();
        if (!move.endsWith('pass')) this.goban.undo();
    }
    if (halfMove) this._nextPlayer();
    this.numPass = 0;
    return true;
};

},{"../config/rules.json":7,"./Goban":11,"./Grid":12,"./HandicapSetter":14,"./SgfReader":17,"./constants":72,"./main":73}],10:[function(require,module,exports){
'use strict';

var main = require('./main');

var idGen = 1;


/** @class
 */
function Genes(map, limits, name) {
    this._map = map || {};
    this._limits = limits || {};
    this.name = name || '#' + idGen++;
}
module.exports = Genes;

var SMALL_MUTATION = 0.05; // e.g. 0.05 -> plus or minus 5%

// Each limit is an array of 2 numbers: LOW and HIGH:
var LOW = 0, HIGH = 1;


Genes.prototype.clone = function (newName) {
    return new Genes(main.clone(this._map), main.clone(this._limits), newName);
};

Genes.prototype.setLimits = function (limits) {
    this._limits = limits;
};

Genes.prototype.toString = function () {
    var s = '{' + this.name + ' - ';
    for (var k in this._map) {
        s += k + ':' + this._map[k].toFixed(2) + ', ';
    }
    return s.chomp(', ') + '}';
};

// Returns a distance between 2 sets of genes
Genes.prototype.distance = function (gene2) {
    var dist = 0.0;
    for (var k in this._map) {
        var m = this._map[k];
        var n = gene2._map[k];
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
        var d;
        if (n === 0.0) {
            d = m > 1.0 ? 1.0 : m;
        } else if (m === 0.0) {
            d = n > 1.0 ? 1.0 : n;
        } else {
            // finally we can do a ratio
            d = 1.0 - ( n >= m ? m / n : n / m );
        }
        dist += d;
    }
    return dist;
};

// If limits are given, they will be respected during mutation.
// The mutated value will remain >=low and <=high.
// So if you want to remain strictly >0 you have to set a low limit as 0.0001 or alike.
Genes.prototype.get = function (name, defValue, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    var val = this._map[name];
    if (val)
        return val;

    this._map[name] = defValue;

    if (lowLimit || highLimit) this._limits[name] = [lowLimit, highLimit];
    if (lowLimit && highLimit && lowLimit > highLimit) {
        throw new Error('Limits are invalid: ' + lowLimit + ' > ' + highLimit);
    }
    return defValue;
};

Genes.prototype.serialize = function () {
    return JSON.stringify(this);
};

Genes.unserialize = function (text) {
    var j = JSON.parse(text);
    this._map = j._map;
    this._limits = j._limits;
};

// mutation_rate: 0.05 for 5% mutation on each gene
// wide_mutation_rate: 0.20 for 20% chances to pick any value in limit range
// if wide mutation is not picked, a value near to the old value is picked
Genes.prototype.mate = function (parent2, kid1, kid2, mutationRate, wideMutationRate) {
    var p1 = this._map;
    var p2 = parent2._map;
    kid1.setLimits(this._limits);
    kid2.setLimits(this._limits);
    var k1 = kid1._map;
    var k2 = kid2._map;
    var crossPoint2 = ~~(Math.random() * p1.length);
    var crossPoint = ~~(Math.random() * crossPoint2);
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
        pos++;
    }
};

Genes.prototype.mutation1 = function (name, oldVal, wideMutationRate) {
    var limits = this._limits[name];
    var val;
    if (limits) {
        var low = limits[LOW];
        var high = limits[HIGH];
        if (Math.random() < wideMutationRate) {
            val = low + Math.random() * (high - low);
        } else {
            var variation = 1 + (Math.random() * 2 * SMALL_MUTATION) - SMALL_MUTATION;
            val = oldVal * variation;
            if (low && val < low) val = low;
            if (high && val > high) val = high;
        }
    } else {
        // not used yet; it seems we will always have limits for valid values
        // add or remove up to 5
        val = oldVal + (Math.random() - 0.5) * 10;
    }
    return val;
};

Genes.prototype.mutateAll = function () {
    for (var key in this._map) {
        this._map[key] = this.mutation1(key, this._map[key], 1.0);
    }
    return this;
};

},{"./main":73}],11:[function(require,module,exports){
'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;


/** @class Stores what we have on the board (stones & groups).
 *  Goban remembers the stones played - undo feature is provided.
 *  public RO attributes: gsize, grid
 *  public RW attributes: mergedGroups, killedGroups
 */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    if (gsize !== ~~gsize || gsize < 3) throw new Error('Invalid goban size: ' + gsize);
    this.gsize = gsize;
    this.grid = new Grid(gsize, BORDER);
    this.scoringGrid = new Grid(gsize, GRID_BORDER); // TODO delete this when droopy & frankie are gone

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
    // Sentinel for group stacks
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel];
    this.mergedGroups = [Goban.sentinel];

    this.garbageGroups = [];
    this.numGroups = 0;

    this.history = [];
    this.setPositionalSuperko(false);

    // this._moveIdStack = [];
    // this._moveIdGen = this.moveId = 0; // moveId is unique per tried move
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
    // Collect all the groups and put them into garbageGroups
    // NB: V8 does slightly faster when we keep the sentinel instead of clearing to []
    this.killedGroups.shift(); // removes sentinel
    this.mergedGroups.shift(); // removes sentinel
    this.garbageGroups.concat(this.killedGroups);
    this.garbageGroups.concat(this.mergedGroups);
    this.killedGroups.clear();
    this.mergedGroups.clear();
    this.killedGroups.push(Goban.sentinel);
    this.mergedGroups.push(Goban.sentinel);
    this.numGroups = 0;

    this.history.clear();
    this.setPositionalSuperko(false);

    // this._moveIdStack.clear();
    // this._moveIdGen = this.moveId = 0;
};

// Allocate a new group or recycles one from garbage list.
// Should be the only place we call new Group()
Goban.prototype.newGroup = function (stone, lives) {
    var ndx = ++this.numGroups;
    var group = this.garbageGroups.pop();
    if (group) {
        group.recycle(stone, lives, ndx);
    } else {
        group = new Group(this, stone, lives, ndx);
    }
    return group;
};

Goban.prototype.deleteGroup = function (group) {
    // When undoing a move, we usually can decrement group ID generator too
    if (group.ndx === this.numGroups) this.numGroups--;
    this.garbageGroups.push(group);
};

Goban.prototype.image = function () {
    return this.grid.toLine();
};

// For tests; can load a game image (without the move history)
Goban.prototype.loadImage = function (image) {
    this.scoringGrid.loadImage(image);
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            var color = this.scoringGrid.yx[j][i];
            if (color !== EMPTY) this.playAt(i, j, color);
        }
    }
};

Goban.prototype.getAllGroups = function () {
    var groups = {}; //TODO return an array instead
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var group = this.ban[j][i].group;
            if (group) groups[group.ndx] = group;
        }
    }
    return groups;
};

// For debugging only
Goban.prototype.debugDump = function () {
    var res = 'Board:\n' + this.toString() +
        '\nGroups:\n' +
        this.grid.toText(function (s) { return s.group ? '' + s.group.ndx : '.'; }) +
        '\nStones in groups:\n';
    var groups = {};
    for (var row, row_array = this.grid.yx, row_ndx = 0; row=row_array[row_ndx], row_ndx < row_array.length; row_ndx++) {
        for (var s, s_array = row, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s && s.group) groups[s.group.ndx] = s.group;
        }
    }
    for (var ndx = 1; ndx <= this.numGroups; ndx++) {
        if (groups[ndx]) res += groups[ndx].debugDump() + '\n';
    }
    return res;
};

// This display is for debugging and text-only game
Goban.prototype.toString = function () {
    return this.grid.toText();
};

Goban.prototype.isValidMove = function (i, j, color) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) return false;

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) return false;

    if (stone.moveIsSuicide(color)) {
        return false;
    }

    if (this.useSuperko) {
        // Check this is not a superko (already seen position)
        if (this.allSeenPositions[this.nextMoveImage(i, j, color)]) {
            return false;
        }
    } else if (stone.moveIsKo(color)) {
        return false;
    }

    return true;
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.colorAt = function (i, j) {
    var stone = this.ban[j][i];
    return stone ? stone.color : BORDER;
};

// No validity test here
Goban.prototype.isEmpty = function (i, j) {
    return this.ban[j][i].isEmpty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

Goban.prototype.playAt = function (i, j, color) {
    this._updatePositionSignature(i, j, color);

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) throw new Error('Tried to play on existing stone in ' + stone);
    return this.tryAt(i, j, color);
};

// Called to undo a single stone (the main undo feature relies on this)  
Goban.prototype.undo = function () {
    if (!this.history.length) throw new Error('Extra undo');
    this.history.pop().takeBack();

    this._updatePositionSignature();
};

Goban.prototype.tryAt = function (i, j, color) {
    var stone = this.ban[j][i];
    this.history.push(stone);
    stone.putDown(color);
    return stone;
};

Goban.prototype.untry = function () {
    this.history.pop().takeBack();
};

// Returns undefined if no group was killed yet
Goban.prototype.previousKilledGroup = function () {
    return this.killedGroups[this.killedGroups.length - 1];
};

// If inc > 0 (e.g. +1), increments the move ID
// otherwise, unstack (pop) the previous move ID (we are doing a "undo")
// Goban.prototype.updateMoveId = function (inc) {
//     if (inc > 0) {
//         this._moveIdGen++;
//         this._moveIdStack.push(this.moveId);
//         this.moveId = this._moveIdGen;
//     } else {
//         this.moveId = this._moveIdStack.pop();
//     }
// };

Goban.prototype.previousStone = function () {
    return this.history[this.history.length - 1];
};

// Updates an array with the prisoner count per color
// e.g. [+3,+5] means 3 black stones are prisoners, 5 white stones
Goban.prototype.countPrisoners = function (prisoners) {
    prisoners = prisoners || [0, 0];
    for (var i = this.killedGroups.length - 1; i >= 0; i--) {
        var g = this.killedGroups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

Goban.prototype.setPositionalSuperko = function (isRuleOn) {
    if (this.history.length > 0) throw new Error('Superko rule changed during game');
    this.useSuperko = isRuleOn;
    if (isRuleOn) {
        this.currentPosition = this.buildCompressedImage();
        this.positionHistory = [];
        this.allSeenPositions = {};
    } else {
        this.currentPosition = null;
        this.positionHistory = this.allSeenPositions = null;
    }
};

Goban.prototype._updatePositionSignature = function (i, j, color) {
    if (this.useSuperko) {
        if (i) { // play
            this.positionHistory.push(this.currentPosition);
            this.allSeenPositions[this.currentPosition] = this.history.length;
            this.currentPosition = this.nextMoveImage(i, j, color);
        } else { // undo
            this.currentPosition = this.positionHistory.pop();
            this.allSeenPositions[this.currentPosition] = null;
        }
    } else {
        this.currentPosition = null;
    }
};

Goban.prototype.nextMoveImage = function (i, j, color) {
    var img = this._modifyCompressedImage(this.currentPosition, i, j, color);

    // Remove all dead stones from image
    var enemies = this.stoneAt(i, j).uniqueAllies(1 - color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        if (enemies[e].lives > 1) continue;
        var stones = enemies[e].stones;
        for (var n = stones.length - 1; n >= 0; n--) {
            var s = stones[n];
            img = this._modifyCompressedImage(img, s.i, s.j, EMPTY);
        }
    }
    return img;
};

Goban.prototype.getPositionSignature = function () {
    if (this.useSuperko) {
        return this.currentPosition;
    } else {
        if (!this.currentPosition) this.currentPosition = this.image();
        return this.currentPosition;
    }
};

var COMPRESS_CHAR0 = 33; // 33 is "!" - we avoid 32/space on purpose
var ZERO = '0'.charCodeAt();

/** Returns a string which describes a unique game position.
 * 4 stones (0: empty, 1: black, 2: white) are coded into a single character.
 * Resulting character has ascii code COMPRESS_CHAR0 + n, with n in 0..80
 */
Goban.prototype.buildCompressedImage = function () {
    var buf = '', img = '';
    var gsize = this.gsize;
    for (var j = 1; j <= gsize; j++) {
        var yxj = this.ban[j];
        for (var i = 1; i <= gsize; i++) {
            buf += String.fromCharCode(ZERO + yxj[i].color + 1);
            if (buf.length === 4) {
                img += String.fromCharCode(parseInt(buf, 3) + COMPRESS_CHAR0);
                buf = '';
            }
        }
    }
    if (buf.length) {
        buf = (buf + '000').substr(0, 4);
        img += String.fromCharCode(parseInt(buf, 3) + COMPRESS_CHAR0);
    }
    return img;
};

Goban.prototype._modifyCompressedImage = function (img, i, j, color) {
    var stoneNum = (j - 1) * this.gsize + (i - 1);
    var ndx = ~~(stoneNum / 4), subNdx = stoneNum % 4;
    var newChar;
    if (color === EMPTY) {
        var asStr = ('000' + (img.charCodeAt(ndx) - COMPRESS_CHAR0).toString(3)).slice(-4);
        var newStr = asStr.substr(0, subNdx) + '0' + asStr.substr(subNdx + 1);
        newChar = parseInt(newStr, 3) + COMPRESS_CHAR0;
    } else {
        newChar = img.charCodeAt(ndx) + (1 << color) * Math.pow(3, 3 - subNdx);
    }
    return img.substr(0, ndx) + String.fromCharCode(newChar) + img.substr(ndx + 1);
};

},{"./Grid":12,"./Group":13,"./Stone":18,"./constants":72,"./main":73}],12:[function(require,module,exports){
'use strict';

var main = require('./main');
var CONST = require('./constants');

var GRID_BORDER = CONST.GRID_BORDER;


/** @class A generic grid.
 *  NB: We keep extra "border" cells around the real board.
 *      Idea is to avoid checking i,j against gsize in many places.
 *  public read-only attribute: gsize
 *  public RW attribute: yx
 */
function Grid(gsize, initValue, borderValue) {
    if (initValue === undefined) throw new Error('Grid init value must be defined');
    this.gsize = gsize;
    if (borderValue === undefined) {
        this.yx = main.newArray2(gsize + 2, gsize + 2, initValue);
    } else {
        this.yx = main.newArray2(gsize + 2, gsize + 2, borderValue);
        this.init(initValue);
    }
}
module.exports = Grid;

Grid.COLOR_NAMES = ['black', 'white'];
Grid.EMPTY_CHAR = '+';
Grid.DAME_CHAR = '?';
Grid.STONE_CHARS = '@O';
Grid.DEAD_CHARS = '&#';
Grid.TERRITORY_CHARS = '-:';
Grid.COLOR_CHARS = Grid.STONE_CHARS + Grid.DEAD_CHARS + Grid.TERRITORY_CHARS + Grid.DAME_CHAR + Grid.EMPTY_CHAR;
Grid.CIRCULAR_COLOR_CHARS = Grid.DAME_CHAR + Grid.EMPTY_CHAR + Grid.COLOR_CHARS;
Grid.ZONE_CODE = 100; // used for zones (100, 101, etc.); must be > COLOR_CHARS.length

// Possible values of a color (beside BLACK & WHITE)
Grid.EMPTY_COLOR = -1; // this is same as EMPTY, conveniently
Grid.DAME_COLOR = -2; // index of ? in above string; 2 from the end of the string
Grid.DEAD_COLOR = 2; // 2 and 3
Grid.TERRITORY_COLOR = 4; // 4 and 5

// Converts a "territory" character into an owner score (-1= black, +1= white)
// dame,empty, liveB,liveW deadB,deadW, terrB,terrW
Grid.territory2owner = [0,0, -1,+1, +1,-1, -1,+1];
// Converts potential territory number to a char (-1, -0.5, 0, +0.5, +1) -> char
Grid.territory2char = '-\'?.:';


Grid.prototype.init = function (initValue) {
    if (initValue === undefined) throw new Error('Grid init value must be defined');
    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = initValue;
        }
    }
};

Grid.prototype.copy = function (sourceGrid) {
    if (sourceGrid.gsize !== this.gsize) throw new Error('Cannot copy between different sized grids');

    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j], srcYxj = sourceGrid.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = srcYxj[i];
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
    if (sourceGrid.gsize !== this.gsize) throw new Error('Cannot copy between different sized grids');

    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j], srcYxj = sourceGrid.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = srcYxj[i].color;
        }
    }
    return this;
};

// Returns the "character" used to represent a stone in text style
function colorToChar(color) {
    if (color === GRID_BORDER) return '(BORDER)';
    if (color >= Grid.ZONE_CODE) {
        return String.fromCharCode(('A'.charCodeAt() + color - Grid.ZONE_CODE));
    }
    if (color < Grid.DAME_COLOR || color >= Grid.COLOR_CHARS.length) {
        throw new Error('Invalid color ' + color);
    }
    if (color < 0) color += Grid.COLOR_CHARS.length;
    return Grid.COLOR_CHARS[color];
}

// Returns the name of the color/player (e.g. "black")
Grid.colorName = function (color) { // TODO remove me or?
    return Grid.COLOR_NAMES[color];
};

Grid.charToColor = function (char) {
    return Grid.CIRCULAR_COLOR_CHARS.indexOf(char) + Grid.DAME_COLOR;
};

function cell2char(c) {
    return colorToChar(typeof c === 'number' ? c : c.color);
}

Grid.prototype.toText = function (block) {
    return this.toTextExt(true, '\n', block || cell2char);
};

Grid.prototype.toLine = function (block) {
    return this.toTextExt(false, ',', block || cell2char);
};

// Receives a block of code and calls it for each vertex.
// The block should return a string representation.
// This method returns the concatenated string showing the grid.
Grid.prototype.toTextExt = function (withLabels, endOfRow, block) {
    var outYx = new Grid(this.gsize, '').yx;
    var maxlen = 1, i, j, val;
    for (j = this.gsize; j >= 1; j--) {
        for (i = 1; i <= this.gsize; i++) {
            val = block(this.yx[j][i]);
            if (val === null) continue;
            outYx[j][i] = val;
            maxlen = Math.max(maxlen, val.length);
        }
    }
    var numChar = maxlen;
    var white = '          ';
    var s = '';
    for (j = this.gsize; j >= 1; j--) {
        if (withLabels) s += '%2d'.format(j) + ' ';
        for (i = 1; i <= this.gsize; i++) {
            val = outYx[j][i];
            if (val.length < numChar) val = white.substr(1, numChar - val.length) + val;
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
    if (endOfRow !== '\n') s = s.chop(); // remove last endOfRow unless it is \n
    return s;
};

Grid.prototype.toString = function () {
    var s = '';
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            s += colorToChar(this.yx[j][i]);
        }
        s += '\n';
    }
    return s;
};

// Returns a text "image" of the grid. See also copy? method.
// Image is upside-down to help compare with a copy paste from console log.
// So last row (j==gsize) comes first in image
Grid.prototype.image = function () {
    if (typeof this.yx[1][1] === 'object') {
        return this.toLine(function (s) {
            return colorToChar(s.color);
        });
    } else {
        return this.toLine(function (c) {
            return colorToChar(c);
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
        if (row.length !== this.gsize) throw new Error('Invalid image: row ' + row);
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = Grid.charToColor(row[i - 1]);
        }
    }
};

function reverseStr(s) {
    var res = '';
    for (var i = s.length - 1; i >= 0; i--) { res += s[i]; }
    return res;
}

Grid.flipImage = function (image) {
    return image.split(',').reverse().join();
};

Grid.mirrorImage = function (image) {
    return image.split(',').map(reverseStr).join();
};

Grid.flipAndMirrorImage = function (image) {
    return reverseStr(image);
};


var COLUMNS = 'abcdefghjklmnopqrstuvwxyz'; // NB: "i" is skipped

// Parses a move like "c12" into 3,12
// Throws OR returns null if move is not a vertex or illegal
Grid.move2xy = function (move, dontThrow) {
    var i = COLUMNS.indexOf(move[0]) + 1;
    var j = parseInt(move.substr(1, 2));
    if (!i || isNaN(j)) {
        if (dontThrow) return null;
        throw new Error('Illegal move parsed: ' + move);
    }
    return [i, j];
};

// Builds a string representation of a move (3,12->"c12")  
Grid.xy2move = function (i, j) {
    return COLUMNS[i - 1] + j;
};

// Converts a numeric X coordinate in a letter (e.g 3->c)
Grid.xLabel = function (i) {
    return COLUMNS[i - 1];
};

},{"./constants":72,"./main":73}],13:[function(require,module,exports){
'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');

var EMPTY = CONST.EMPTY;


/** @class
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

    // populated by analysis:
    this._info = null;
    this.xAlive = this.xDead = 0;
    this.xInRaceWith = null;
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives, ndx) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = this.mergedBy = this.killedBy = null;
    this.ndx = ndx;

    this.xAlive = this.xDead = 0;
    this.xInRaceWith = null;
};

Group.prototype.clear = function () {
    for (var i = this.stones.length - 1; i >= 0; i--) {
        this.stones[i].clear();
    }
    this.goban.deleteGroup(this);
};

Group.prototype.toString = function (detail) {
    if (detail === 0) return '#' + this.ndx;
    if (detail === 1) return this.stones[0] + 'x' + this.stones.length + '#' + this.ndx;

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

Group.prototype.isValid = function () {
    return this.stones.length && this.stones[0].group === this;
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
    var lives = [];
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== EMPTY) continue;

            if (lives.indexOf(life) < 0) lives.push(life);
        }
    }
    if (lives.length !== this.lives) throw new Error('Wrong life count for group');
    return lives;
};

// Builds a list of all enemies of the group
// Costly!
Group.prototype.allEnemies = function () {
    var enemies = [];
    var enemyColor = 1 - this.color;
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color !== enemyColor) continue;

            if (enemies.indexOf(en.group) < 0) enemies.push(en.group);
        }
    }
    if (main.debugGroup) main.log.debug(this + ' has ' + enemies.length + ' enemies');
    return enemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
// NB: presupposes that stone.isNextTo(this) is true
Group.prototype.livesAddedByStone = function (stone) {
    var lives = -1; // -1 since the connection itself removes 1
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

// Connects a new stone or a merged stone to this group
Group.prototype.connectStone = function (stone) {
    if (main.debugGroup) main.log.debug('Connecting ' + stone + ' to group ' + this);

    this.stones.push(stone);
    this.lives += this.livesAddedByStone(stone);

    if (this.lives < 0) { // can be 0 if suicide-kill
        throw new Error('Unexpected error (lives<0 on connect)');
    }
    if (main.debugGroup) main.log.debug('Final group: ' + this);
};

// Disconnects a stone
Group.prototype.disconnectStone = function (stone) {
    if (main.debugGroup) main.log.debug('Disconnecting ' + stone + ' from group ' + this);

    if (this.stones.length > 1) {
        this.lives -= this.livesAddedByStone(stone);
        if (this.lives < 0) throw new Error('Lives<0 on disconnect'); // =0 if suicide-kill
    } else { // groups of 1 stone become empty groups (->garbage)
        this.goban.deleteGroup(this);
        if (main.debugGroup) main.log.debug('Group going to recycle bin: ' + this);
    }
    // we always remove them in the reverse order they came
    if (this.stones.pop() !== stone) throw new Error('Unexpected error (disconnect order)');
};

// When a new stone appears next to this group
Group.prototype.attackedBy = function (stone) {
    this.lives--;
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

    this.lives += subgroup.stones.length;
    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.setGroupOnMerge(this);
        this.connectStone(s);
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
        this.disconnectStone(s);
        s.setGroupOnMerge(subgroup);
    }
    this.lives -= subgroup.stones.length;
    subgroup.mergedBy = subgroup.mergedWith = null;
    if (main.debugGroup) main.log.debug('After _unmerge: subgroup:' + subgroup + ' main:' + this);
};

Group.prototype.unmergeFrom = function (stone) {
    var mergedGroups = this.goban.mergedGroups;
    for (var last = mergedGroups.length - 1; last >= 0; last--) {
        var subgroup = mergedGroups[last];
        if (subgroup.mergedBy !== stone || subgroup.mergedWith !== this) break;
        this._unmerge(subgroup);
        mergedGroups.pop();
    }
};

// Called when the group has no more life left
Group.prototype._dieFrom = function (killerStone) {
    if (main.debugGroup) main.log.debug('Group dying: ' + this);
    if (this.lives < 0) throw new Error('Unexpected error (lives<0)');

    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueAllies(1 - this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
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
        for (var enemy, enemy_array = stone.uniqueAllies(1 - this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy._attackedByResuscitated(stone);
        }
    }
};

Group.resuscitateGroupsFrom = function (killerStone) {
    var killedGroups = killerStone.goban.killedGroups;
    for (var last = killedGroups.length - 1; last >= 0; last--) {
        var group = killedGroups[last];
        if (group.killedBy !== killerStone) break;
        killedGroups.pop();
        if (main.debugGroup) main.log.debug('taking back ' + killerStone + ' so we resuscitate ' + group);
        group._resuscitate();
    }
};

},{"./Grid":12,"./constants":72,"./main":73}],14:[function(require,module,exports){
//Translated from handicap_setter.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class Used for setting handicap stones,
 * and for setting a position "by hand", which is exactly the same. */
function HandicapSetter() {
}
module.exports = HandicapSetter;

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "B=d4-p16-p4" or "W=d4-p16-p4"
// Returns the handicap actual count
HandicapSetter.setHandicap = function (goban, h) {
    if (h === 0 || h === '0') return 0;
    
    // Standard handicap if simple number - no "=..."
    if (typeof h === 'number' || h.indexOf('=') < 0) {
        return HandicapSetter.setStandardHandicap(goban, ~~h);
    }

    var color;
    switch (h[0]) {
    case 'B': color = BLACK; break;
    case 'W': color = WHITE; break;
    default: throw new Error('Invalid "hand" command: ' + h);
    }
    
    var posEqual = h.indexOf('=');
    var moves = h.substring(posEqual + 1).split('-');
    for (var move, move_array = moves, move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
        var coords = Grid.move2xy(move);
        goban.playAt(coords[0], coords[1], color);
    }
    return moves.length;
};

// Places the standard (star points) handicap
//   count: requested handicap
// NB: a handicap of 1 stone does not make sense but we don't really need to care.
// Returns the handicap actual count (if board is too small it can be smaller than count)
HandicapSetter.setStandardHandicap = function (goban, count) {
    var gsize = goban.gsize;
    // no middle point if size is an even number or size<9
    if (count > 4 && (gsize < 9 || gsize % 2 === 0)) count = 4;
    // no handicap on smaller than 5 boards
    if (gsize <= 5) return 0;

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
        goban.playAt(x, y, main.BLACK);
    }
    return count;
};

},{"./Grid":12,"./main":73}],15:[function(require,module,exports){
'use strict';

var systemConsole = console;


/** @class */
function Logger() {
    this.level = Logger.INFO;
    this.logfunc = null;

    Logger.prototype.debug = this._newLogFn(Logger.DEBUG, systemConsole.debug);
    Logger.prototype.info = this._newLogFn(Logger.INFO, systemConsole.info);
    Logger.prototype.warn = this._newLogFn(Logger.WARN, systemConsole.warn);
    Logger.prototype.error = this._newLogFn(Logger.ERROR, systemConsole.error);
    Logger.prototype.fatal = this._newLogFn(Logger.FATAL, systemConsole.error);
}
module.exports = Logger;

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
        consoleFn.call(systemConsole, msg);
    };
};

},{}],16:[function(require,module,exports){
'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class */
function ScoreAnalyser(game) {
    this.game = game;
    this.analyser = new main.defaultAi.BoardAnalyser(game);
}
module.exports = ScoreAnalyser;


// Computes score and returns it as a number >0 if black won
ScoreAnalyser.prototype.computeScoreDiff = function () {
    var totals = this._computeScore()[0];
    return totals[BLACK] - totals[WHITE];
};

// Computes score and returns it as an array of human-readable strings
 ScoreAnalyser.prototype.computeScoreAsTexts = function () {
    return this._scoreInfoToS(this._computeScore());
};

ScoreAnalyser.prototype.computeScoreInfo = function () {
    return this._computeScore();
};

// Retrives the scoring grid once the score has been computed
ScoreAnalyser.prototype.getScoringGrid = function () {
    return this.analyser.getScoringGrid();
};

ScoreAnalyser.prototype._computeScore = function () {
    var game = this.game;
    var goban = game.goban;
    var komi = game.komi;

    if (game.whoResigned !== null) {
        return ['resi', 1 - game.whoResigned, game.resignReason];
    }

    this.analyser.countScore(goban);

    var scores = this.analyser.scores;
    var prisoners = this.analyser.prisoners;

    var totals = [
        scores[BLACK] + prisoners[WHITE],
        scores[WHITE] + prisoners[BLACK] + komi];
    var details = [
        [scores[BLACK], prisoners[WHITE], 0],
        [scores[WHITE], prisoners[BLACK], komi]];

    return [totals, details];
};

function pointsToString(n) {
    return ( n !== 1 ? n + ' points' : '1 point' );
}

ScoreAnalyser.prototype._scoreInfoToS = function (info) {
    if (info[0] === 'resi') {
        var winner = Grid.COLOR_NAMES[info[1]], loser = Grid.COLOR_NAMES[1 - info[1]];
        var reason;
        switch (info[2]) {
        case 'time': reason = loser + ' ran out of time'; break;
        case null: case undefined: reason = loser + ' resigned'; break;
        default: reason = loser + ' disqualified: ' + info[2];
        }
        return [winner + ' won (' + reason + ')'];
    }
    if (!info || info.length !== 2) throw new Error('Invalid score info: ' + info);
    var totals = info[0];
    var details = info[1];
    if (totals.length !== details.length) throw new Error('Invalid score info');

    var s = [];
    var diff = totals[BLACK] - totals[WHITE];
    s.push(this._scoreDiffToS(diff));

    for (var c = BLACK; c <= WHITE; c++) {
        var detail = details[c];
        var score = detail[0], pris = detail[1], komi = detail[2];
        var prisoners = pris !== 0 ? ' ' + ( pris < 0 ? '-' : '+' ) + ' ' + Math.abs(pris) + ' prisoners' : '';
        var komiStr = (( komi > 0 ? ' + ' + komi + ' komi' : '' ));
        var detailStr = pris || komi ? ' (' + score + prisoners + komiStr + ')' : '';
        s.push(Grid.colorName(c) + ': ' + pointsToString(totals[c]) + detailStr);
    }
    return s;
};

ScoreAnalyser.prototype._scoreDiffToS = function (diff) {
    if (diff === 0) return 'Tie game';
    var win = ( diff > 0 ? BLACK : WHITE );
    return Grid.colorName(win) + ' wins by ' + pointsToString(Math.abs(diff));
};

},{"./Grid":12,"./constants":72,"./main":73}],17:[function(require,module,exports){
//Translated from sgf_reader.rb using babyruby2js
'use strict';

var main = require('./main');

var BLACK = main.BLACK, WHITE = main.WHITE;
var colorName = ['B', 'W'];
var defaultBoardSize = 19;

// Example:
// (;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]
// SO[http://www.littlegolem.com];B[pd];W[pp];
// B[ce];W[dc]...;B[tt];W[tt];B[tt];W[aq])

var infoTags = {
    GM: ['int', null], // 1: Go - other values are considered invalid
    FF: ['int', 'fileFormat'],
    SZ: ['int', 'boardSize'], // NB: necessary for 'move' type conversions
    AB: ['move', null], // add a move (or handicap) for Black
    AW: ['move', null], // add a move for White
    HA: ['int', 'handicap'],
    KM: ['real', 'komi'],
    RU: ['text', 'rules'], // Manadatory names: AGA, GOE, Japanese, NZ
    RE: ['text', 'result'],
    PB: ['text', 'playerBlack'],
    PW: ['text', 'playerWhite'],
    BS: ['int', 'blackSpecies'], // 0: human, >0: computer
    WS: ['int', 'whiteSpecies'],
    LT: ['flag', 'enforceLosingOnTime'],
    SO: ['text', 'source'],
    ID: ['text', 'gameId'],
    AP: ['text', 'application'], // used to create the SGF file
    BR: ['text', 'blackRank'],
    WR: ['text', 'whiteRank'],
    BT: ['text', 'blackTeam'], // Black's Team
    WT: ['text', 'whiteTeam'], // White's Team
    TM: ['text', 'timeLimit'], // per player
    OT: ['text', 'overtimeMethod'],
    EV: ['text', 'event'], // e.g. tournament name
    RO: ['text', 'round'],
    DT: ['text', 'date'],
    PC: ['text', 'place'],
    GN: ['text', 'gameName'],
    ON: ['text', 'openingPlayed'],
    GC: ['text', 'gameComment'],
    C:  ['text', 'comment'],
    N:  ['text', 'nodeName'],
    US: ['text', 'userName'], // user who entered the game
    AN: ['text', 'analyseAuthor'],
    CP: ['text', 'copyright'],
    CA: ['text', 'characterSet'], // e.g. UTF-8
    ST: ['text', null] // method used to display variations
};

var gameTags = {
    B: 'move',
    W: 'move',
    AB: 'move',
    AW: 'move',
    BL: null, // Black's time Left
    WL: null, // White's time Left
    C:  null, // comments
    CR: null, // circle
    BM: null, // bad move
    N:  null  // node name
};



/** @class */
function SgfReader() {
    this.text = null;
    this.nodes = null;
    this.boardSize = 0;
    this.handMoves = null;
    this.infos = null;
    this.curColor = BLACK;
    this.moves = null;
    this.moveNumber = 0;
}
module.exports = SgfReader;


SgfReader.isSgf = function (game) {
    return game.trim().startsWith('(;');
};

// Raises an exception if we could not convert the format
SgfReader.prototype.readGame = function (sgf, upToMoveNumber) {
    if (!SgfReader.isSgf(sgf)) throw new Error('Not an SGF file');
    this.text = sgf;
    this.nodes = [];
    this.handMoves = [[], []];
    this._parseGameTree(sgf);
    this._processGameInfo();
    this._processMoves(upToMoveNumber);
    return this.infos;
};

SgfReader.prototype.toMoveList = function () {
    return this.moves;
};

function letterToCoord(c) {
    if (c.between('a', 'z')) return c.charCodeAt() - 97; // - 'a'
    if (c.between('A', 'Z')) return c.charCodeAt() - 65; // - 'A'
    throw new Error('Invalid coordinate value: ' + c);
}

var COLUMNS = 'abcdefghjklmnopqrstuvwxyz'; // NB: "i" is skipped + not handling > z

// this.boardSize (tag SZ) must be known before we can convert moves
// If SZ is unknown while we start generating moves, we suppose size as default.
// Once boardSize is set, changing it throws an exception.
SgfReader.prototype._setBoardSize = function (size) {
    if (this.boardSize) throw new Error('Size (SZ) set twice or after the first move');
    this.boardSize = size;
};

SgfReader.prototype._convertMove = function (sgfMove) {
    if (!this.boardSize) this._setBoardSize(defaultBoardSize);

    if (sgfMove === '' || (sgfMove === 'tt' && this.boardSize <= 19)) {
        return 'pass';
    }
    var i = COLUMNS[letterToCoord(sgfMove[0])];
    var j = this.boardSize - letterToCoord(sgfMove[1]);
    return i + j;
};

SgfReader.prototype._addMove = function (color, move, isHand) {
    // Keep count of "real" moves (not handicap or "added" moves)
    if (!isHand) this.moveNumber++;
    
    // Add color info to the move if this was not the expected color
    var colorStr = color === this.curColor ? '' : colorName[color];
    // If real game started...
    if (this.moveNumber) {
        this.curColor = 1 - color;
        this.moves.push(colorStr + move);
    } else {
        this.handMoves[color].push(move);
    }
};

SgfReader.prototype._convertValue = function (rawVal, valType) {
    switch (valType) {
    case 'text': return rawVal;
    case 'int': return parseInt(rawVal);
    case 'real': return parseFloat(rawVal);
    case 'flag': return true;
    case 'move': return this._convertMove(rawVal);
    default: throw new Error('Invalid tag type: ' + valType);
    }
};

SgfReader.prototype._processGameTag = function (name, rawVal) {
    var valType = gameTags[name];
    if (valType === undefined) {
        return main.log.warn('Unknown property ' + name + '[' + rawVal + '] ignored');
    }
    if (!valType) return; // fine to ignore

    var value = this._convertValue(rawVal, valType);

    switch (name) {
    case 'B': return this._addMove(BLACK, value);
    case 'W': return this._addMove(WHITE, value);
    case 'AB': return this._addMove(BLACK, value, /*isHand=*/true);
    case 'AW': return this._addMove(WHITE, value, /*isHand=*/true);
    }
};

SgfReader.prototype._genHandMoves = function (color) {
    var moves = this.handMoves[color];
    if (!moves.length) return '';

    return 'hand:' + colorName[color] + '=' + moves.join('-') + ',';
};

SgfReader.prototype._processMoves = function (upToMoveNumber) {
    this.moves = [];
    this.moveNumber = 0;
    this.curColor = null;

    for (var i = 1; i < this.nodes.length; i++) {
        var node = this.nodes[i];
        for (var n = 0; n < node.length; n += 2) {
            var name = node[n] || name;
            var rawVal = node[n + 1];
            this._processGameTag(name, rawVal);
        }
    }
    var beforeMove = upToMoveNumber ? upToMoveNumber - 1 : this.moves.length;
    this.moves = (this._genHandMoves(BLACK) + this._genHandMoves(WHITE) +
        this.moves.slice(0, beforeMove).join(',')).chomp(',');
};

SgfReader.prototype._storeInfoTag = function (name, rawVal) {
    var tag = infoTags[name];
    if (tag === undefined) {
        this.infos[name] = rawVal;
        return main.log.info('Unknown property in SGF header: ' + name + '[' + rawVal + ']');
    }
    var infoType = tag[0], infoName = tag[1];

    var value = this._convertValue(rawVal, infoType);
    if (infoName) this.infos[infoName] = value;
    return value;
};

SgfReader.prototype._processGameInfo = function () {
    this.boardSize = null;
    this.infos = { boardSize: defaultBoardSize, komi: 0, handicap: 0 };
    var header = this.nodes[0];
    for (var p = 0; p <= header.length - 1; p += 2) {
        var name = header[p];
        var rawVal = header[p + 1];

        var value = this._storeInfoTag(name, rawVal);

        switch (name) {
        case 'GM':
            if (value !== 1) throw new Error('SGF game is not a GO game');
            break;
        case 'FF': // FileFormat
            if (value < 3 || value > 4) {
                main.log.warn('SGF format ' + value + '. Not sure we handle it well.');
            }
            break;
        case 'SZ': this._setBoardSize(value); break;
        case 'AB': this._addMove(BLACK, value, /*isHand=*/true); break;
        case 'AW': this._addMove(WHITE, value, /*isHand=*/true); break;
        }
    }
};

SgfReader.prototype._parseGameTree = function (t) {
    t = this._skip(t);
    t = this._get('(', t);
    t = this._parseNode(t);
    this.finished = false;
    while (!this.finished) {
        t = this._parseNode(t);
    }
    return this._get(')', t);
};

function indexOfClosingBrace(t) {
    var pos = 0;
    for (;;) {
        var brace = t.indexOf(']', pos);
        if (brace === -1) return -1;
        if (t[brace - 1] !== '\\') return brace;
        pos = brace + 1;
    }
}

SgfReader.prototype._parseNode = function (t) {
    t = this._skip(t);
    if (t[0] !== ';') {
        this.finished = true;
        return t;
    }
    t = this._get(';', t);
    var node = [];
    for (;;) {
        var i = 0;
        while (t[i] && t[i].between('A', 'Z')) { i++; }
        var propIdent = t.substr(0, i);
        if (propIdent === '') this._error('Property name expected', t);
        node.push(propIdent);
        t = this._get(propIdent, t);
        for (;;) {
            t = this._get('[', t);
            var brace = indexOfClosingBrace(t);
            if (brace < 0) this._error('Missing \']\'', t);

            var val = t.substr(0, brace);
            node.push(val);
            t = this._get(val + ']', t);
            if (t[0] !== '[') break;
            node.push(null); // multiple values, we use nil as name for 2nd, 3rd, etc.
        }
        if (!t[0] || !t[0].between('A', 'Z')) break;
    }
    this.nodes.push(node);
    return t;
};

SgfReader.prototype._skip = function (t) {
    return t.trim();
};

SgfReader.prototype._get = function (lex, t) {
    if (!t.startsWith(lex)) this._error(lex + ' expected', t);
    return t.replace(lex, '').trim();
};

SgfReader.prototype._error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t.substr(0, 20) + '...');
};

},{"./main":73}],18:[function(require,module,exports){
//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');

var EMPTY = main.EMPTY, BORDER = main.BORDER;
var DIR0 = main.DIR0, DIR3 = main.DIR3;


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
    this.neighbors = []; // direct neighbors (top, right, bottom, left)
    this.allNeighbors = []; // including diagonals - top, top-right, right, bottom-right, etc.
}
module.exports = Stone;

var XY_AROUND = Stone.XY_AROUND = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // top, right, bottom, left
var XY_DIAGONAL = Stone.XY_DIAGONAL = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top-right, bottom-right, bottom-left, top-left

Stone.prototype.clear = function () {
    this.color = EMPTY;
    this.group = null;
};

// Computes each stone's neighbors (called for each stone after init)
// NB: Stones next to side have only 3 neighbors, and the corner stones have 2
Stone.prototype.findNeighbors = function () {
    var yx = this.goban.ban;
    // NB: order in which we push neighbors should be irrelevant but is not fully
    // because TestGroup looks at group merging numbers etc. (no worry here)
    for (var n = DIR3; n >= DIR0; n--) {
        var stone = yx[this.j + XY_AROUND[n][1]][this.i + XY_AROUND[n][0]];
        if (stone !== BORDER) this.neighbors.push(stone);

        this.allNeighbors.push(stone);
        stone = yx[this.j + XY_DIAGONAL[n][1]][this.i + XY_DIAGONAL[n][0]];
        this.allNeighbors.push(stone);
    }
};

Stone.prototype.toString = function () {
    if (this.color === EMPTY) {
        return this.asMove();
    } else {
        return (this.color ? 'W' : 'B') + '-' + this.asMove();
    }
};

// Returns "c3" for a stone in 3,3
Stone.prototype.asMove = function () {
    return Grid.xy2move(this.i, this.j);
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

Stone.prototype.isCorner = function () {
    return this.neighbors.length === 2;
};

Stone.prototype.getSubCorner = function () {
    var goban = this.goban, size1 = goban.gsize - 1;
    return goban.stoneAt(this.i === 1 ? 2 : size1, this.j === 1 ? 2 : size1);
};

Stone.prototype.isBorder = function () {
    return this.neighbors.length <= 3; // NB: corners are borders too
};

Stone.prototype.distanceFromBorder = function () {
    var gsize = this.goban.gsize;
    var i = this.i, j = this.j;
    return Math.min(Math.min(i - 1, gsize - i), Math.min(j - 1, gsize - j));
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
    return true; // move would be a suicide
};

// Is a move a ko?
// if the move would kill with stone i,j a single stone A (and nothing else!)
// and the previous move killed with stone A a single stone B in same position i,j
// then it is a ko
Stone.prototype.moveIsKo = function (color) {
    // 1) Must kill a single group
    // NB: we don't need to iterate on unique groups because on condition #2 below
    var groupA = null;
    for (var n = this.neighbors.length - 1; n >= 0; n--) {
        var enemy = this.neighbors[n].group;
        if (!enemy || enemy.color !== 1 - color) continue;
        if (enemy.lives !== 1) continue;
        if (groupA) return false;
        groupA = enemy;
    }
    if (!groupA) return false;

    // 2) This killed group must be a single stone A
    if (groupA.stones.length !== 1) return false;
    var stoneA = groupA.stones[0];

    // 3) Stone A was played just now
    if (this.goban.previousStone() !== stoneA) return false;

    // 4) Stone B was killed by A in same position we are looking at
    var groupB = this.goban.previousKilledGroup();
    if (!groupB || groupB.killedBy !== stoneA || groupB.stones.length !== 1) return false;
    var stoneB = groupB.stones[0];
    if (stoneB.i !== this.i || stoneB.j !== this.j) return false;

    return true; // move is a ko
};

Stone.prototype.die = function () {
    this.color = EMPTY;
    this.group = null;
};

Stone.prototype.resuscitateIn = function (group) {
    this.group = group;
    this.color = group.color;
};

// Called by goban only
Stone.prototype.putDown = function (color) {
    this.color = color;

    var allies = this.uniqueAllies(color); // note we would not need unique if group#merge ignores dupes
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
};

// Called by goban only
Stone.prototype.takeBack = function () {
    this.group.unmergeFrom(this);
    this.group.disconnectStone(this);
    var enemies = this.uniqueAllies(1 - this.color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        enemies[e].notAttackedAnymore(this);
    }
    this.group = null;
    this.color = EMPTY;
    Group.resuscitateGroupsFrom(this);
};

Stone.prototype.setGroupOnMerge = function (newGroup) {
    this.group = newGroup;
};

Stone.prototype.uniqueAllies = function (color) {
    var allies = [];
    var neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === color && allies.indexOf(s.group) < 0) {
            allies.push(s.group);
        }
    }
    return allies;
};

// Returns the empty points around this stone
Stone.prototype.empties = function () {
    var empties = [], neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === EMPTY) empties.push(s);
    }
    return empties;
};

// Number of empty points around this stone
Stone.prototype.numEmpties = function () {
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

Stone.prototype.isNextTo = function (group) {
    var neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].group === group) return true;
    }
    return false;
};

},{"./Grid":12,"./Group":13,"./main":73}],19:[function(require,module,exports){
//Translated from connector.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, BORDER = main.BORDER;
var ALWAYS = main.ALWAYS, NEVER = main.NEVER;

/*
TODO:
- Fix under-evaluation in cases we could handle better:
  # When we see a group is "SOMETIMES" dead, we consider the connection/cut as
    a 0.5 win; in case where the connection/cut is precisely the saving/killing stone,
    we should count a full win instead.
  # See test TestAi#testConnect: the connection is actually deciding life/death of more
    than the 2 groups we look at: the 2 stones group is a brother of another group 
    which will be saved/dead too depending on this connection.
- Merge "direct" and "diagonal" algos to do it right
- One other way to connect 2 groups is to "protect" the cutting point; handle this here
- When we try to "cut" (enemy color), eval should give 0 if another way of connecting exists
*/

/** @class A move that connects 2 of our groups is good.
 */
function Connector(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
    this.hunter = player.heuristic.Hunter;
}
inherits(Connector, Heuristic);
module.exports = Connector;


Connector.prototype._evalMove = function (i, j, color) {
    // If our stone would simply be captured, no luck
    var stone = this.goban.stoneAt(i, j);
    if (this.noEasyPrisonerYx[j][i] < 0 && !this.hunter.isSnapback(stone)) {
        if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' skips ' + stone + ' (trusting NoEasyPrisoner)');
        return 0;
    }
    // Score for connecting our groups + cutting enemies
    return this._connectsMyGroups(stone, color) +
           this._connectsMyGroups(stone, 1 - color);
};

Connector.prototype._connectsMyGroups = function (stone, color) {
    var score = this._directConnect(stone, color);
    if (score) return score;
    return this._diagonalConnect(stone, color);
};

Connector.prototype._diagonalConnect = function (stone, color) {
    var diag = true, grp1 = null, grp2 = null, nonDiagGrp1 = null;
    var isDiagCon = false;
    var numEnemies = 0;
    for (var n = 0; n < 8; n++) {
        var s = stone.allNeighbors[n];
        diag = !diag;
        if (s === BORDER) continue;
        switch (s.color) {
        case EMPTY: continue;
        case color:
            if (s.group.xDead === ALWAYS) continue;
            if (!grp1) {
                grp1 = s.group;
                if (!diag) nonDiagGrp1 = s.group;
                isDiagCon = diag;
            } else {
                if (s.group === grp1) continue; // ignore if other stone of same group
                if (!diag && nonDiagGrp1 && s.group !== nonDiagGrp1) return 0; // decline direct connections
                if (!diag && !nonDiagGrp1) nonDiagGrp1 = s.group;
                grp2 = s.group;
                isDiagCon = isDiagCon || diag;
            }
            break;
        default:
            if (s.group.xDead === ALWAYS) continue;
            if (s.group.lives < 2) continue;
            numEnemies++;
        }
    }
    if (!grp2) return 0;
    if (!isDiagCon)
        return 0;
    if (numEnemies >= 3)
        return 0; //TODO improve this
    return this._computeScore(stone, color, [grp1, grp2]/*REVIEW THIS*/, numEnemies, 'diagonal');
};

Connector.prototype._directConnect = function (stone, color) {
    var s1, s1b, s2, s2b, s3;
    var numStones = 0, numEnemies = 0;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY: continue;
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
        default:
            numEnemies++;
        }
    }
    
    if (!s2) return 0; // nothing to connect here
    if (numStones === 4) return 0; // 1 empty between 4 stones; never connect unless forced to

    var numGroups = s3 ? 3 : 2;
    var groups = s3 ? [s1.group, s2.group, s3.group] : [s1.group, s2.group];

    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3) {
        if (numEnemies === 0 && s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) {
            return this.player.areaScoring ? this.minimumScore : 0;
        }
        return this._computeScore(stone, color, groups, numEnemies, 'direct3');
    }

    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this._distanceBetweenStones(s1, s2, color) === 0) {
            if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' sees no hurry to connect ' + s1 + ' and ' + s2);
            if (!this.player.areaScoring) return 0;
            if (s1.group._info.needsToConnect() !== NEVER ||
                s2.group._info.needsToConnect() !== NEVER)
                return this.minimumScore;
            return 0;
        }
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    return this._computeScore(stone, color, groups, numEnemies, 'direct');
};

Connector.prototype._computeScore = function (stone, color, groups, numEnemies, desc) {
    var score = 0;
    if (numEnemies === 0) {
        //if (this.canConnect(stone, 1 - color)) this.mi.cutThreat(groups, stone, 1 - color);
        score = this.inflCoeff / this.infl[color][stone.j][stone.i];
    } else {
        this.mi.cutThreat(groups, stone, 1 - color);
    }
    if (main.debug) main.log.debug('Connector ' + desc + ' for ' + Grid.colorName(color) + ' gives ' +
        score.toFixed(3) + ' to ' + stone + ' (allies:' + groups.length + ' enemies: ' + numEnemies + ')');
    return score;
};

Connector.prototype._diagonalStones = function (s1, s2) {
    return [this.goban.stoneAt(s1.i, s2.j), this.goban.stoneAt(s2.i, s1.j)];
};

Connector.prototype._distanceBetweenStones = function (s1, s2, color) {
    var dx = Math.abs(s2.i - s1.i), dy = Math.abs(s2.j - s1.j);
    if (dx + dy === 1) return 0; // already connected
    var enemy = 1 - color;
    var numEnemies = 0, between;
    if (dx === 1 && dy === 1) { // hane
        var diags = this._diagonalStones(s1, s2), c1 = diags[0], c2 = diags[1];
        if (c1.color === color || c2.color === color) return 0; // already connected
        if (c1.color === enemy) numEnemies++;
        if (c2.color === enemy) numEnemies++;
        if (numEnemies === 0) return 0; // safe hane
        if (numEnemies === 2) return 99; // cut!
        var whichIsEnemy = c1.color === enemy ? 0 : 1;
        var enemyStone = diags[whichIsEnemy], connPoint = diags[1 - whichIsEnemy];
        if (s1.isBorder() || s2.isBorder()) {
            // if enemy cut-stone on border, we have a sente connect by doing atari
            if (connPoint.distanceFromBorder() === 1)
                return enemyStone.group.lives > 2 ? 1 : 0;
            if (connPoint.allyStones(enemy) !== 0) return 1; // other enemy next to conn point
            return 0;
        } else if (connPoint.distanceFromBorder() === 1) {
            if (connPoint.allyStones(enemy) !== 0) return 1;
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
        if (s1.isBorder() && s2.isBorder()) {
            return 0; // along border with 0 enemy around is safe
        }
        return 0.5; // REVIEW ME
    }
    if (dx + dy === 3 && s1.isBorder() && s2.isBorder()) {
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
 *  Basically this is to make sure stone is not alone (and not to see if stone is a connector!) */
// +@+
// O+O
// @*@ <-- TODO review this case; looks like white here cannot connect
Connector.prototype.canConnect = function (stone, color) {
    // first look around for empties and allies (a single ally means we connect!)
    var empties = [];
    for (var nNdx = stone.neighbors.length - 1; nNdx >= 0; nNdx--) {
        var n = stone.neighbors[nNdx];
        switch (n.color) {
        case EMPTY:
            empties.push(n);
            break;
        case color:
            if (n.group.lives > 1 && n.group.xDead < ALWAYS) return n;
            break;
        default: // if we kill an enemy group here, consider this a connection
            if (n.group.lives === 1) return n.group.allEnemies()[0].stones[0];
        }
    }
    // look around each empty for allies
    var moveNeeded = 2;
    for(var eNdx = empties.length - 1; eNdx >= 0; eNdx--) {
        var empty = empties[eNdx];
        for (var n2Ndx = empty.neighbors.length - 1; n2Ndx >= 0; n2Ndx--) {
            var en = empty.neighbors[n2Ndx];
            if (en === stone) continue; // same stone
            if (en.color !== color) continue; // empty or enemy
            if (en.group.xDead === ALWAYS) continue; // TODO: look better at group's health
            var dist = this._distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":22,"util":6}],20:[function(require,module,exports){
'use strict';

var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function GroupAnalyser(player) {
    Heuristic.call(this, player);
}
inherits(GroupAnalyser, Heuristic);
module.exports = GroupAnalyser;


GroupAnalyser.prototype.evalBoard = function () {
    this.player.boan.continueMoveAnalysis();

    this._updateGroupState();
};

GroupAnalyser.prototype._updateGroupState = function () {
    var allGroups = this.player.boan.allGroupInfos;
    for (var ndx in allGroups) {
        var gndx = ~~ndx;
        var gi = allGroups[gndx], g = gi.group;

        g.xInRaceWith = gi.inRaceWith && gi.inRaceWith.group;
    }
};

},{"./Heuristic":22,"util":6}],21:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;


/** @class */
function GroupsAndVoids(player) {
    Heuristic.call(this, player);

    this.grid = new Grid(this.gsize, GRID_BORDER);

    this.moveInfo = player.heuristic.MoveInfo;
}
inherits(GroupsAndVoids, Heuristic);
module.exports = GroupsAndVoids;


GroupsAndVoids.prototype.evalBoard = function () {
    var goban = this.goban;
    this.player.boan.startMoveAnalysis(goban, this.grid);

    this._updateGroupState();
};

GroupsAndVoids.prototype._updateGroupState = function () {
    var pot = this.pot, aliveOdds = pot.aliveOdds, deadOdds = pot.deadOdds;
    var allGroups = this.player.boan.allGroupInfos;
    for (var ndx in allGroups) {
        var gndx = ~~ndx;
        var gi = allGroups[gndx], g = gi.group;

        g.xAlive = aliveOdds[gndx];
        g.xDead = deadOdds[gndx];
        // g.xInRaceWith will be updated in GroupAnalyser

        for (var i = gi.fakeSpots.length - 1; i >= 0; i--) {
            var fakeSpot = gi.fakeSpots[i];
            if (!fakeSpot.mustBePlayed) continue;
            this.moveInfo.setAsFakeEye(fakeSpot.stone, g.color);
        }
    }
};

},{"../../Grid":12,"../../constants":72,"./Heuristic":22,"util":6}],22:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY;
var sOK = CONST.sOK, sDEBUG = CONST.sDEBUG;
var ALWAYS = CONST.ALWAYS;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player) {
    this.player = player;
    this._setName();
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);
    this.minimumScore = player.minimumScore;

    this.color = this.enemyColor = null;
    this.updateCrossRef(); // just for creating entries on "this"; will be called again by player
}
module.exports = Heuristic;


Heuristic.prototype._setName = function () {
    var constr = this.constructor;
    this.name = constr.name || main.funcName(constr);
    // Mangled constructor name has file-scope so we may have dupes; we add the unique ID for that
    if (this.name.length < 5) this.name += this.player.heuristics.length;
};

Heuristic.prototype.updateCrossRef = function () {
    var heurMap = this.player.heuristic;
    this.co = heurMap.Connector;
    this.mi = heurMap.MoveInfo;
    this.pot = heurMap.PotentialTerritory;
    this.infl = heurMap.Influence ? heurMap.Influence.infl : null;
};

Heuristic.prototype.initColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
};

// For heuristics which do not handle evalBoard (but _evalMove)
// NB: _evalMove is "private": only called from here (base class), and from inside a heuristic
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var prevDebug = main.debug;
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true; // set your breakpoint on this line if needed

            var score = myScoreYx[j][i] = this._evalMove(i, j, color);
            scoreYx[j][i] += score;

            if (state === sDEBUG) main.debug = prevDebug;
        }
    }
};

Heuristic.prototype.getMoveSurvey = function (i, j, survey) {
    var s = this.scoreGrid.yx[j][i];
    if (s) survey[this.name] = s;
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

},{"../../Grid":12,"../../constants":72,"../../main":73}],23:[function(require,module,exports){
//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player) {
    Heuristic.call(this, player);

    this.snapbacks = null;
    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Hunter, Heuristic);
module.exports = Hunter;


/** Returns true if group g could get at least minLives by killing one of the
 *  enemy groups around in atari
 */
Hunter.prototype._gotLivesFromKillingAround = function (g, minLives) {
    var enemies = g.allEnemies();
    for (var n = enemies.length - 1; n >= 0; n--) {
        var eg = enemies[n];
        if (eg.lives > 1) continue;
        // found 1 enemy group in atari; killing it would give us its size in new lives
        var addedLives = eg.stones.length;
        if (addedLives >= minLives) return true;
        // this is not enough, so count lives we would get by connecting with our groups around eg
        var allies = eg.allEnemies();
        for (var a = allies.length - 1; a >= 0; a--) {
            addedLives += allies[a].lives - 1;
            if (addedLives >= minLives) return true;
        }
    }
    return false;
};


var KO_KILL_SCORE = 1;
var RACE_KILL_SCORE = 1.1; // just need to be enough to let the move happen (score comes from pressure eval)

/** Returns a score to measure what kind of kill a move is.
 *  Any number < 1.01 is sign of a "not so good" kill.
 *  E.g. in this board, black c5 has a bad "kill score" of 1.0001
 *  5 O@+OO
 *  4 O@O@+
 *  3 OO@@+
 *  2 ++@++
 *  1 ++@++
 *    abcde
 *  NB: kill score of a KO is 1 (KO_KILL_SCORE)
 */
Hunter.prototype._killScore = function (empty, color) {
    var numAllies = 0, numKill = 0, life = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            life += 0.01;
            break;
        case color: // ally
            life += (n.group.lives - 1) * 0.01;
            if (n.group.xAlive === ALWAYS) life += 2;
            numAllies += 0.0001;
            break;
        default: // enemy
            if (n.group.xInRaceWith) return RACE_KILL_SCORE;
            if (n.group.lives > 1) break; // not a kill
            numKill += n.group.stones.length;
        }
    }
    return numKill + life + numAllies;
};

Hunter.prototype._countAtariThreat = function (killerStone, enemies, level) {
    var minimumScore = false, isKill = false;

    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        var eg = enemies[egNdx];
        if (eg.lives !== 1) continue;
        // if we can take eg anytime later, no need to take it now
        //TODO also verify no group in "enemies" is strong
        if (!level && this._isAtariGroupCaught(eg, level) && !this._gotLivesFromKillingAround(eg, 1)) {
            if (this.player.areaScoring) minimumScore = true;
            // TODO: instead, mark group's death goal as pointless (min score)
            continue;
        }
        isKill = true;
        if (!level) this.mi.killThreat(eg, killerStone);
    }
    if (minimumScore) this.mi.giveMinimumScore(killerStone);
    return isKill;
};

// It is a snapback if the last empty point is where the enemy will have to play
// AND would not make the enemy group connect to a stronger enemy group.
Hunter.prototype._isSnapback = function (killerStone, lastEmpty, eg) {
    if (!lastEmpty.isNextTo(eg)) return false;
    var enemiesAroundEmpty = lastEmpty.uniqueAllies(eg.color);
    for (var e = enemiesAroundEmpty.length - 1; e >= 0; e--) {
        var enemy = enemiesAroundEmpty[e];
        if (enemy.lives > 2) return false;
        if (!killerStone.isNextTo(enemy)) return false;
    }
    return true;
};

Hunter.prototype._countPreAtariThreat = function (stone, enemies, empties, color, level, egroups) {
    var isSnapback = false, eg;
    var allies = stone.uniqueAllies(color);
    // now look for groups with 2 lives
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 2) continue;
        // no good if enemy can escape by killing one of our weak groups around
        if (this._gotLivesFromKillingAround(eg, 2)) continue; // >=2 because killing 1 stone is not enough to escape
        // same but for the group of our new stone; if should not become atari either
        if (empties.length === 0 && allies.length === 1 && allies[0].lives === 2) continue;
        // If no ally & our new stone is atari
        if (empties.length === 1 && allies.length === 0) {
            // Unless a snapback, this is a dumb move
            if (!this._isSnapback(stone, empties[0], eg)) continue;
            isSnapback = true;
            if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + ' sees a snapback in ' + stone);
        }
        if (!level && eg._info.isInsideEnemy()) continue; // avoid chasing inside our groups - eyes are #1 goal
        egroups.push(eg);
    }
    return isSnapback;
};

// Presupposes that stone.isNextTo(enemy) is true
Hunter.prototype._isValidRaceMove = function (stone, enemy, ally) {
    if (!ally || enemy.lives !== ally.lives) return false;
    if (!ally.isValid()) return false;
    if (stone.isNextTo(ally) && ally.livesAddedByStone(stone) < 1) return false; // playing stone would not help us
    // TODO check all lives; if one of them is a better move than stone, then return false
    // var added = enemy.livesAddedByStone(stone);
    // var lives = enemy.allLives();
    // for (var n = lives.length - 1; n >= 0; n--) {
    //     if (enemy.livesAddedByStone(lives[n]) > added) return false;
    // }
    return true;
};

Hunter.prototype._countPressureAndRace = function (stone, enemies, level, isEasyPrisoner) {
    var isKill = false;
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        var enemy = enemies[egNdx];
        var egl = enemy.lives, allyInRace = enemy.xInRaceWith;
        if (egl > 2 && this._isValidRaceMove(stone, enemy, allyInRace)) {
            if (!level) this.mi.raceThreat(enemy, stone);
            isKill = true;
        } else if (egl >= 2 && level === 0 && !isEasyPrisoner) {
            if (!level) this.mi.addPressure(enemy, stone); // see TestAi#testSemiAndEndGame h1 & b8 for examples
        }
    }
    return isKill;
};

Hunter.prototype._beforeEvalBoard = function () {
    this.snapbacks = [];
};

Hunter.prototype._evalMove = function (i, j, color) {
    this._isKill(i, j, color, 0);
    return 0; // never rating directly; MoveInfo will do it
};

Hunter.prototype._isKill = function (i, j, color, level) {
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var enemies = stone.uniqueAllies(1 - color);

    // now look for groups with 2 lives
    var egroups = [];
    var isSnapback = this._countPreAtariThreat(stone, enemies, empties, color, level, egroups);
    if (level === 0 && isSnapback) {
        this.snapbacks.push(stone); // for other heuristics to look at...
    }
    // unless snapback, make sure our new stone's group can survive
    if (!isSnapback && empties.length <= 1) {
        var killScore = this._killScore(stone, color); //TODO: make this easier!
        if (killScore !== KO_KILL_SCORE &&
            (killScore < 0.02 || (killScore > 1 && killScore < 1.01))) {
            return false;
        }
    }
    // count groups already in atari
    var isAtariKill = this._countAtariThreat(stone, enemies, level);
    // count some profit in removing enemy lives
    var isEasyPrisoner = !isSnapback && this.noEasyPrisonerYx[j][i] < 0;
    var isRaceKill = this._countPressureAndRace(stone, enemies, level, isEasyPrisoner);

    if (!egroups.length) return isAtariKill || isRaceKill;

    this.goban.tryAt(i, j, color); // our attack takes one of the 2 last lives (the one in i,j)

    // see attacks that fail
    var canEscape = [false, false, false];
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + '(level ' + level + ') looking at threat ' + stone + ' on ' + egroups[g]);
        if (this._isAtariGroupCaught(egroups[g], level)) continue;
        if (egroups.length === 1) { egroups.pop(); break; }
        canEscape[g] = true;
    }

    this.goban.untry(); // important to undo before, so we compute threat right

    var isChaseKill = this._countMultipleChaseThreat(stone, egroups, canEscape, level);

    if (main.debug && (isAtariKill || isRaceKill || isChaseKill)) main.log.debug('Hunter ' + Grid.colorName(color) +
        ' found a kill at ' + Grid.xy2move(i, j) +
        (isAtariKill ? ' #atari' : '') + (isRaceKill ? ' #race' : '') + (isChaseKill ? ' #chase' : ''));
    return isAtariKill || isRaceKill || isChaseKill;
};

/** Returns the maximum threat we can hope for when several groups can be chased.
 *  Some of these chases might fail, but even so, the enemy can only defend one.
 *  Rule of thumb:
 *  - if 0 can escape => we capture the bigger one
 *  - if 1 or more can escape => we capture nothing if only 1, or the 2nd bigger if the 1st can escape
 */
Hunter.prototype._countMultipleChaseThreat = function (stone, egroups, canEscape, level) {
    switch (egroups.length) {
    case 0: return false;
    case 1:
        if (canEscape[0]) return false;
        if (!level) this.mi.killThreat(egroups[0], stone);
        return true;
    case 3: //TODO
    case 2:
        if (!level) {
            if (canEscape[1]) {
                this.mi.killThreat(egroups[0], stone);
            } else {
                this.mi.killThreat(egroups[1], stone);
            }
        }
        // if (!canEscape[0] && !canEscape[1]) return Math.max(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        // if ( canEscape[0] &&  canEscape[1]) return Math.min(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        // return canEscape[0] ? this.groupThreat(egroups[1]) : this.groupThreat(egroups[0]);
        return true;
    //function basicSort(a, b) { return a - b; }
    // case 3:
    //     var threats = [this.groupThreat(egroups[0]), this.groupThreat(egroups[1]), this.groupThreat(egroups[2])];
    //     if (!canEscape[0] && !canEscape[1] && !canEscape[2]) return Math.max(threats[0], threats[1], threats[2]);
    //     var sortedThreats = threats.concat().sort(basicSort);
    //     var bigger = threats.indexOf(sortedThreats[0]);
    //     if (!canEscape[bigger]) return threats[bigger];
    //     var secondBigger = threats.indexOf(sortedThreats[1]);
    //     return threats[secondBigger];
    default: throw new Error('Unexpected in Hunter#getMultipleChaseThreat');
    }
};

/** Evaluates if group g in atari (1 last escape move) can escape */
Hunter.prototype._isAtariGroupCaught = function (g, level) {
    var allLives = g.allLives();
    if (allLives.length !== 1) throw new Error('Unexpected: hunter #1: ' + allLives.length);

    var lastLife = allLives[0];
    var stone = this.goban.tryAt(lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this._isEscapingAtariCaught(stone, level);
    this.goban.untry();
    if (main.debug) main.log.debug('Hunter: group with last life ' + lastLife + ' would ' + (isCaught ? 'be caught: ' : 'escape: ') + g);
    return isCaught;
};

/** Checks if played stone has put a nearby enemy group in atari
 * Returns 0 if no atari
 *         1 if atari will help us escape (forces enemy to escape too)
 *        -1 if atari's reply is attacking us (so move was blunder)
 */
Hunter.prototype._atariOnEnemy = function (stone) {
    var enemyColor = 1 - stone.color;
    var neighbors = stone.neighbors;
    for (var n = neighbors.length - 1; n >= 0; n--) {
        var s = neighbors[n];
        if (s.color !== enemyColor) continue;
        var enemy = s.group;
        if (enemy.lives !== 1) continue;
        var escape = enemy.allLives()[0];
        if (!escape.isNextTo(stone.group)) return 1; // atari's escape is not attacking us back    
        if (this._isAtariGroupCaught(enemy, 1)) return 1; // enemy would die
        return -1; // bad move for us
    }
    return 0;
};

/** @param stone is the enemy group's escape move (just been played)
 *  @param [level] - just to keep track for logging purposes
 *  @return true if caught
 */
Hunter.prototype._isEscapingAtariCaught = function (stone, level) {
    var g = stone.group;
    if (g.lives <= 1) return true; // caught
    if (g.lives > 2) {
        return false; //TODO look better
    }
    // g.lives is 2

    // if escape move just put one of our groups in atari the chase fails
    var atari = this._atariOnEnemy(stone);
    if (atari !== 0) return atari < 0; // < 0 if counter atari fails

    // get 2 possible escape moves
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) throw new Error('Unexpected: hunter #2');
    var e1 = empties[0], e2 = empties[1];
    if (main.debug) main.log.debug('Hunter: group has 2 lives left: ' + e1 + ' and ' + e2);

    // try blocking the 2 moves (recursive descent)
    var color = 1 - g.color;
    return this._isKill(e1.i, e1.j, color, level + 1) ||
           this._isKill(e2.i, e2.j, color, level + 1);
};

/** @param stone is the enemy group's escape move (just been played)
 *  @return true if the group gets captured
 */
Hunter.prototype.isEscapingAtariCaught = function (stone) {
    return this._isEscapingAtariCaught(stone, 1);
};

Hunter.prototype.isKill = function (i, j, color) {
    return this._isKill(i, j, color, 1);
};

/** Called by other heuristics to know if a stone is a snapback for current move.
 * By snapback here we mean the 1st move = attacking (good) move of a snapback */
Hunter.prototype.isSnapback = function (stone) {
    return this.snapbacks.indexOf(stone) !== -1;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":22,"util":6}],24:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;

// Influence depending on distance to a stone
var INF_AT_1 = 2, INF_AT_2 = 1; // NB: making them genes does not seem to make sense


/** @class
 *  public read-only attribute: infl
 */
function Influence(player) {
    Heuristic.call(this, player);

    this.grids = [
        new Grid(this.gsize, GRID_BORDER),
        new Grid(this.gsize, GRID_BORDER)
    ];

    this.infl = [this.grids[BLACK].yx, this.grids[WHITE].yx];
}
inherits(Influence, Heuristic);
module.exports = Influence;


Influence.prototype.evalBoard = function () {
    this.grids[BLACK].init(0);
    this.grids[WHITE].init(0);

    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color === EMPTY) continue;
            var yx = this.infl[color];

            // Then we propagate it decreasingly with distance
            for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                if (n1.color !== EMPTY) continue;

                yx[n1.j][n1.i] += INF_AT_1; // 2nd level

                for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                    if (n2.color !== EMPTY) continue;
                    if (n2 === stone) continue; // we are looking again at initial stone; skip it

                    yx[n2.j][n2.i] += INF_AT_2; // 3rd level
                }
            }
        }
    }
};

},{"../../Grid":12,"../../constants":72,"./Heuristic":22,"util":6}],25:[function(require,module,exports){
'use strict';

var main = require('../../main');
var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = CONST.ALWAYS;

var MIN_FACTOR = 0.1; // REVIEW ME; under this factor we ignore threats for now


/** @class */
function MoveInfo(player) {
    Heuristic.call(this, player);

    this.debug = false;
    this.grid = new Grid(this.gsize, null);
    this.groupDeath = [];
    this.what = '';

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);
    this.pressureCoeff = this.getGene('pressure', 1, 0.01, 2);
    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);
    this.wideSpaceToEyeCoeff = this.getGene('wideSpaceToEye', 0.5, 0.01, 1);
    this.potEyeCoeff2 = this.getGene('potEyeCoeff2', 0.78, 0.75, 0.85);
}
inherits(MoveInfo, Heuristic);
module.exports = MoveInfo;


MoveInfo.prototype.evalBoard = function () {
    this.debug = this.player.debugMode;
    this.grid.init(null);
    this.groupDeath.length = 0;
};

MoveInfo.prototype.collectScores = function (stateYx, scoreYx) {
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx); // calls _evalMove below
};

MoveInfo.prototype._evalMove = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (!cell) return 0;
    return cell.computeScore();
};

// Redefines Heuristic#getMoveSurvey
MoveInfo.prototype.getMoveSurvey = function (i, j, survey) {
    var cell = this.grid.yx[j][i];
    if (cell) cell.computeScore(survey, this.name);
};

function CellInfo() {
    this.fakeEyeForColor = null;
    this.score = 0;
    this.goals = [];
    this.goalFactors = [];
    this.goalNumMoves = [];
}

CellInfo.prototype.computeScore = function (survey, hName) {
    var score = this.score;
    if (survey && score) survey[hName + '-base'] = score;
    var goals = this.goals;
    if (!goals.length) return score;

    for (var n = goals.length - 1; n >= 0; n--) {
        var goal = goals[n];
        var goalScore = goal.score * this.goalFactors[n];
        score += goalScore;

        if (survey) {
            var f = this.goalFactors[n], factorStr = f !== 1 ? ' factor:' + f.toFixed(2) : '';
            survey[hName + '-' + goal + factorStr] = goalScore;
        }
    }
    return score;
};

MoveInfo.prototype.getCellInfo = function (i, j) {
    return this.grid.yx[j][i]; // can be null
};

MoveInfo.prototype._getCell = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (cell) return cell;

    this.grid.yx[j][i] = cell = new CellInfo();
    return cell;
};

MoveInfo.prototype.setAsFakeEye = function (stone, color) {
    this._getCell(stone.i, stone.j).fakeEyeForColor = color;
};

MoveInfo.prototype.isFakeEye = function (stone, color) {
    var cell = this.getCellInfo(stone.i, stone.j);
    return cell && cell.fakeEyeForColor === color;
};


//---

function Goal(name, score, g) {
    this.name = name;
    this.score = score;
    this.group = g;
    this.minMoves = Infinity;
}

Goal.prototype.toString = function () {
    return this.name +
        (this.minMoves !== Infinity ? ' minMoves:' + this.minMoves : '') +
        ' score:' + this.score.toFixed(2);
};

//---

MoveInfo.prototype._enter = function (name, g, stone) {
    this.what = name + ' on ' + g.toString(1);

    if (stone.i === this.player.testI && stone.j === this.player.testJ) {
        main.debug = true; // set your breakpoint here if needed
        main.log.debug('MoveInfo scoring ' + stone + ': ' + this.what);
    } else {
        main.debug = false;
    }
};

MoveInfo.prototype._groupDeathGoal = function (g) {
    var goal = this.groupDeath[g.ndx];
    if (goal) return goal;

    var cost = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners
    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties(); // TODO: count only empties not in "lives"
    }
    cost += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot

    this.groupDeath[g.ndx] = goal = new Goal('death of ' + g.toString(1), cost, g);
    return goal;
};

MoveInfo.prototype._goalReachedByMove = function (goal, stone, factor, numMoves) {
    if (!stone)  throw new Error('Unexpected'); //return goal;
    factor = factor || 1;
    numMoves = numMoves || 1;
    if (main.debug) main.log.debug('Goal reached by ' + stone + ': ' + goal +
        (factor ? ' factor:' + factor.toFixed(2) : '') + (numMoves ? ' numMoves:' + numMoves : ''));

    var cell = this._getCell(stone.i, stone.j);
    var goals = cell.goals, goalFactors = cell.goalFactors, goalNumMoves = cell.goalNumMoves;
    var n = goals.indexOf(goal);
    if (n < 0) {
        goals.push(goal);
        goalFactors.push(factor);
        goalNumMoves.push(numMoves);
    } else {
        goalFactors[n] = Math.max(goalFactors[n], factor);
        goalNumMoves[n] = Math.min(goalNumMoves[n], numMoves);
    }
    goal.minMoves = Math.min(goal.minMoves, numMoves);
    return goal;
};

MoveInfo.prototype._countWideSpace = function (g) {
    var count = 0, color = g.color;
    var enemyInf = this.infl[1 - color];
    var lives = g.allLives();
    for (var i = lives.length - 1; i >= 0; i--) {
        var s = lives[i];
        if (enemyInf[s.j][s.i] > 0) continue;
        var v = this.player.boan.getVoidAt(s);
        if (v.owner && v.owner.group.color === color) continue;
        count++;
    }
    return count;
};

MoveInfo.prototype._twoEyeChance = function (potEyeCount) {
    if (potEyeCount >= 2.5) return 1;
    if (potEyeCount < 1.5) return 0;
    if (potEyeCount < 2) return 0.5;
    return this.potEyeCoeff2;
};

MoveInfo.prototype.groupChance = function (gi) {
    var band = gi.band;
    return this._bandChance(band ? band.brothers : [gi]);
};

// @return {number} between 0=dead and 1=lives always
MoveInfo.prototype._bandChance = function (ginfos, addedEyes) {
    if (ginfos.length === 1) { // REVIEW ME maybe even if > 1
        var g = ginfos[0].group;
        if (g.xAlive === ALWAYS) return 1;
        if (g.xDEAD === ALWAYS) return 0;
    }
    var potEyeCount = addedEyes || 0;
    for (var n = ginfos.length - 1; n >= 0; n--) {
        potEyeCount += ginfos[n].countPotEyes();
    }
    var twoEyeCh = this._twoEyeChance(potEyeCount);
    if (twoEyeCh === 1) {
        if (main.debug) main.log.debug('MoveInfo: ' + potEyeCount + ' pot eyes for band of ' + ginfos[0]);
        return 1;
    }

    var wideSpace = 0;
    for (n = ginfos.length - 1; n >= 0; n--) {
        wideSpace += this._countWideSpace(ginfos[n].group);
    }
    wideSpace *= this.wideSpaceToEyeCoeff;
    return this._twoEyeChance(potEyeCount + wideSpace);
};

MoveInfo.prototype._bandThreat = function (ginfos, stone, saving, factor, numMoves, addedEyes) {
    factor = factor || 1;
    var chance = this._bandChance(ginfos, addedEyes);
    factor *= (1 - chance);
    if (factor < MIN_FACTOR) {
        if (main.debug) main.log.debug('MoveInfo: juging safe the band of ' + ginfos[0].group.toString(1));
        return;
    }
    //REVIEW this; line below is wrong, but we should make the difference between
    //- having 0 chance to save the band once "addedEyes" are removed
    //- ...and having 0 chance anyway (band is dead for good and should not be helped)
    //if (saving && factor === 1) return;

    var lives = numMoves || 0;
    for (var n = ginfos.length - 1; n >= 0; n--) {
        lives += ginfos[n].group.lives;
    }

    for (n = ginfos.length - 1; n >= 0; n--) {
        this._groupCost(ginfos[n].group, stone, saving, factor, lives);
    }
};

MoveInfo.prototype._groupCost = function (g, stone, saving, factor, numMoves) {
    if (factor < MIN_FACTOR) return;

    var goal = this._groupDeathGoal(g);

    if (!saving) this._countSavedAllies(g, stone, factor, numMoves);

    return this._goalReachedByMove(goal, stone, factor, numMoves);
};

// Count indirectly saved groups
MoveInfo.prototype._countSavedAllies = function (killedEnemy, stone, factor, numMoves) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemy.stones.length === 1 && killedEnemy.stones[0].isCorner()) {
        return;
    }
    if (stone.numEmpties() === 0 && killedEnemy.stones.length < 3) return;
    numMoves = numMoves || 1;
    var allies = killedEnemy.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        var ally = allies[a];
        if (ally.xAlive === ALWAYS) continue;
        if (ally.lives !== numMoves) continue;
        if (ally.lives === 1) this._groupCost(ally, stone, /*saving=*/true, factor, numMoves);
        this._bandThreatIfKilled(ally, stone, factor, numMoves);
    }
};

// Counts threats saved on g's band if g is saved
MoveInfo.prototype._bandThreatIfKilled = function (g, stone, factor, numMoves) {
    var bands = g._info.getSubBandsIfKilled(stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/true, factor, numMoves);
    }
};

MoveInfo.prototype.addPressure = function (g, stone) {
    var pressure = 1 / (g.lives + 1) * this.pressureCoeff;
    if (g.xDead === ALWAYS) {
        if (!this.player.areaScoring) return 0;
        pressure = this.minimumScore;
    }
    this._getCell(stone.i, stone.j).score += pressure;
    if (this.debug && stone.i === this.player.testI && stone.j === this.player.testJ) {
        main.log.debug('MoveInfo ' + Grid.colorName(1 - g.color) + ' - pressure at ' + stone + ': ' + pressure.toFixed(2));
    }
};

MoveInfo.prototype.giveMinimumScore = function (stone) {
    this._getCell(stone.i, stone.j).score += this.minimumScore;
};

MoveInfo.prototype.raceThreat = function (g, stone) {
    if (this.debug) this._enter('race', g, stone);
    var gi = g._info;
    var ginfos = gi.band ? gi.band.brothers : [gi];
    this._bandThreat(ginfos, stone, false);
};

MoveInfo.prototype.eyeThreat = function (g, stone, color, numEyes) {
    if (this.debug) this._enter('eye threat', g, stone);
    var gi = g._info;
    var ginfos = gi.band ? gi.band.brothers : [gi];

    this._bandThreat(ginfos, stone, color === g.color, undefined, undefined, -numEyes);
    return true;
};

MoveInfo.prototype.cutThreat = function (groups, stone, color) {
    var g = groups[0];
    if (this.debug) this._enter('cut', g, stone);
    var saving = color === g.color;

    var bands = g._info.getSubBandsIfCut(groups, stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        // NB: numMoves=1 since cut is needed first
        this._bandThreat(bands[i], stone, saving, undefined, /*numMoves=*/1);
    }
};

MoveInfo.prototype.killThreat = function (g, stone) {
    if (this.debug) this._enter('kill', g, stone);
    var bands = g._info.getSubBandsIfKilled(stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/false);
    }
    this._groupCost(g, stone, false, 1, g.lives);
};

MoveInfo.prototype.rescueGroup = function (g, stone) {
    if (this.debug) this._enter('rescue', g, stone);
    this._bandThreatIfKilled(g, stone);
    this._groupCost(g, stone, true);
};

},{"../../Grid":12,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],26:[function(require,module,exports){
//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype._beforeEvalBoard = function () {
    // We have to delay getting the hunter since it is created after us
    if (!this.hunter) this.hunter = this.player.heuristic.Hunter;
};

NoEasyPrisoner.prototype._evalMove = function (i, j, color) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).

    // Skip places where nothing happens around
    // NB: if dead allies (without influence), avoid adding more stones here
    if (this.infl[1 - color][j][i] < 2 && this.infl[color][j][i] < 2 &&
        this.goban.stoneAt(i, j).allyStones(color) === 0) return 0;

    var stone = this.goban.tryAt(i, j, color);
    var g = stone.group;
    var score = 0, move;
    if (main.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (main.debug) main.log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score -= g.stones.length * 2;
            if (main.debug) main.log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) main.log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score -= g.stones.length * 2;
            if (main.debug) main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":22,"util":6}],27:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


function PotentialEyes(player) {
    Heuristic.call(this, player);

    this.potEyeGrids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];

    this.moveInfo = player.heuristic.MoveInfo;
}
inherits(PotentialEyes, Heuristic);
module.exports = PotentialEyes;


PotentialEyes.prototype.evalBoard = function () {
    this._findPotentialEyes();
};

PotentialEyes.prototype._findPotentialEyes = function () {
    this.potEyeGrids[EVEN].init(EMPTY);
    this.potEyeGrids[ODD].init(EMPTY);

    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var eye = this.goban.stoneAt(i, j);
            if (eye.color !== EMPTY) continue;

            var color = this._eyePotential(i, j, eye);
            if (color === null) continue;

            var v = this.player.boan.getVoidAt(eye);
            if (v.owner) continue;
            if (this.moveInfo.isFakeEye(eye, color)) continue;

            var neighbors = eye.neighbors;
            var ally = null, enemyInfl = this.infl[1 - color], count = 1;
            for (var n = neighbors.length - 1; n >= 0; n--) {
                var s = neighbors[n];
                if (s.color === color) ally = s.group;
                if (count === 1 && !s.isBorder() &&
                    enemyInfl[s.j][s.i] === 0 && s.numEmpties() === s.neighbors.length) {
                    count = 2;
                }
            }
            if (!ally) {
                if (!eye.isCorner()) continue;
                // corner eye with no direct neighbor => take diagonal stone, must be our ally
                ally = eye.getSubCorner().group;
                if (!ally) continue; // see testWrongAttack2 in a7; not great square 2x2 for eye anyway
            }

            var oddOrEven = (i + j) % 2;
            var potEyeYx = this.potEyeGrids[oddOrEven].yx;
            potEyeYx[j][i] = color;
            ally._info.addPotentialEye(oddOrEven, count);
            if (main.debug) main.log.debug('Potential eye in ' + eye);
        }
    }
};

/** @return {color|null} - null if no chance to make an eye here */
PotentialEyes.prototype._eyePotential = function (i, j, eye) {
    var infB = this.infl[BLACK][j][i];
    var infW = this.infl[WHITE][j][i];
    var color = infB > infW ? BLACK : WHITE;
    var allyInf = Math.max(infB, infW), enemyInf = Math.min(infB, infW);
    if (enemyInf > 1) return null; // enemy stone closer than 2 vertexes
    var borderPoint = 0, gsize = this.gsize;

    if (enemyInf === 1) {
        if (this.co.canConnect(eye, 1 - color) && eye.numEmpties() > 1) return null; // enemy can play on eye => no good
        if (eye.isCorner() && eye.getSubCorner().color === EMPTY) borderPoint++; // a1 in testEyeMaking_shape5safe
    }

    if (i === 1 || i === gsize || j === 1 || j === gsize) borderPoint++;
    if (allyInf + borderPoint - 3 - enemyInf < 0) return null;
    return color;
};

},{"../../Grid":12,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],28:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var NEVER = CONST.NEVER;
var UP = CONST.UP, RIGHT = CONST.RIGHT, DOWN = CONST.DOWN, LEFT = CONST.LEFT;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;

var POT2CHAR = Grid.territory2char;
var POT2OWNER = Grid.territory2owner;

var XY_AROUND = Stone.XY_AROUND;
var XY_DIAGONAL = Stone.XY_DIAGONAL;


/** @class */
function PotentialTerritory(player) {
    Heuristic.call(this, player);

    this.realGrid = new Grid(this.gsize, GRID_BORDER);
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    this.reducedGrid = new Grid(this.gsize, GRID_BORDER);

    // Result of evaluation: this.grids[first2play] (Black or White)
    this.grids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];

    // Sum of B-first + W-first as a number between -1=always Black and +1=always White
    this.territory = new Grid(this.gsize, GRID_BORDER);

    this._computeBorderConnectConstants();

    this.allGroups = null;
    this.aliveOdds = [];
    this.deadOdds = [];
}
inherits(PotentialTerritory, Heuristic);
module.exports = PotentialTerritory;


PotentialTerritory.prototype.evalBoard = function () {
    this._initGroupState();
    // update real grid to current goban
    this.realGrid.initFromGoban(this.goban);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    this._foresee(BLACK);
    this._foresee(WHITE);
    this._mergeTerritoryResults();
};

PotentialTerritory.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();

    this.aliveOdds.length = 0;
    this.deadOdds.length = 0;
    for (var ndx in this.allGroups) {
        var gndx = ~~ndx;
        this.aliveOdds[gndx] = this.deadOdds[gndx] = NEVER;
    }
};

PotentialTerritory.prototype._collectGroupState = function () {
    for (var ndx in this.allGroups) {
        var g0 = this.allGroups[~~ndx], gn = g0;
        // follow merge history to get final group g0 ended up into
        while (gn.mergedWith) gn = gn.mergedWith;
        // collect state of final group
        if (gn.killedBy || gn._info.isDead) {
            this.deadOdds[g0.ndx]++;
        } else if (gn._info.isAlive) {
            this.aliveOdds[g0.ndx]++;
        }
    }
};

/** @return {number} - NEVER, SOMETIMES, ALWAYS */
PotentialTerritory.prototype.isOwned = function (i, j, color) {
    var myColor = color === BLACK ? -1 : +1;
    var score = NEVER;
    if (Grid.territory2owner[2 + this.grids[BLACK].yx[j][i]] === myColor) score++;
    if (Grid.territory2owner[2 + this.grids[WHITE].yx[j][i]] === myColor) score++;
    return score;
};

PotentialTerritory.prototype.territoryScore = function (i, j, color) {
    return this.territory.yx[j][i] * (color === BLACK ? 1 : -1);
};

//TODO review this - why 1-color and not both grids?
PotentialTerritory.prototype.enemyTerritoryScore = function (i, j, color) {
    var score = Grid.territory2owner[2 + this.grids[1 - color].yx[j][i]];
    return score * (color === BLACK ? 1 : -1);
};

PotentialTerritory.prototype.toString = function () {
    return '\n+1=white, -1=black, 0=no one or both\n' +
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

PotentialTerritory.prototype._foresee = function (color) {
    var moveCount = this.goban.moveNumber();

    var grid = this.grids[color];
    this._connectThings(grid, color); //goban is updated with connecting moves
    this.player.boan.analyseTerritory(this.goban, grid, color);
    this._collectGroupState();

    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    while (moveCount-- > 0) this.goban.untry();
};

PotentialTerritory.prototype._mergeTerritoryResults = function () {
    var blackYx = this.grids[BLACK].yx;
    var whiteYx = this.grids[WHITE].yx;
    var terrYx = this.territory.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            terrYx[j][i] = (POT2OWNER[2 + blackYx[j][i]] + POT2OWNER[2 + whiteYx[j][i]]) / 2;
        }
    }
    if (main.debug) main.log.debug('Guessing territory for:\n' + this.realGrid +
        '\nBLACK first:\n' + this.grids[BLACK] + 'WHITE first:\n' + this.grids[WHITE] + this);
};

PotentialTerritory.prototype._connectThings = function (grid, color) {
    this.reducedYx = null;
    // enlarging starts with real grid
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);

    if (main.debug) main.log.debug('after 1st enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx, color);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);

    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) main.log.debug('after reduce:\n' + this.reducedGrid);

    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);
    if (main.debug) main.log.debug('after 2nd enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx, color);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, color) {
    if (main.debug) main.log.debug('---enlarge ' + Grid.colorName(color));
    var inYx = inGrid.yx, outYx = outGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        var inYxj = inYx[j];
        for (var i = this.gsize; i >= 1; i--) {
            if (inYxj[i] !== EMPTY) continue;
            this.enlargeAt(inYx, outYx, i, j, color, 1 - color);
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
        this.goban.tryAt(i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.inContact = function (yx, i, j, color) {
    var num = 0;
    for (var dir = DIR0; dir <= DIR3; dir++) {
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
    for (var v = DIR0; v <= DIR3; v++) {
        var vect = XY_DIAGONAL[v];
        if (yx[j + vect[1]][i + vect[0]] !== first) continue;
//        if (yx[j + vect[1]][i] === second || yx[j][i + vect[0]] === second) continue;
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

// Done only once
PotentialTerritory.prototype._computeBorderConnectConstants = function () {
    var points = [];
    for (var dir = DIR0; dir <= DIR3; dir++) {
        var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
        for (var n = this.gsize - 1; n >= 2; n--) {
            var p = borderPos(dir, n, this.gsize);
            points.push([p[0], p[1], dx, dy]);
        }
    }
    this.borderPoints = points;
};

/** Makes "obvious" connections to border. Note we must avoid splitting eyes.
 Example for left border: (direction = RIGHT)
 G=GOAL, S=SPOT, L=LEFT, R=RIGHT (left & right could be switched, it does not matter)
 LL0
 L0 L1 L2
 G  S1 S2 S3
 R0 R1 R2
 RR0
 */
PotentialTerritory.prototype.connectToBorders = function (yx, first) {
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
            if (color !== first) continue;
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 === color && l1 !== 1 - color) continue;
            if (r0 === color && r1 !== 1 - color) continue;
            //if (l0 === EMPTY && r0 === EMPTY && l1 === color && r1 === color) continue;
            //var ll0 = yx[gj-2*dx][gi-2*dy], rr0 = yx[gj+2*dx][gi+2*dy];
            //if (ll0 === color || rr0 === color) continue;
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s2i = s1i + dx, s2j = s1j + dy;
        color = yx[s2j][s2i];
        if (color !== EMPTY) {
            if (color !== first) continue;
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 !== 1 - color && l1 === color) continue;
            if (r0 !== 1 - color && r1 === color) continue;
            this.addStone(yx, s1i, s1j, color, true);
            if (l0 === color || r0 === color) continue; // no need for goal if s0 or r0
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s3i = s2i + dx, s3j = s2j + dy;
        color = yx[s3j][s3i];
        if (color !== EMPTY) {
            if (color !== first) continue;
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

},{"../../Grid":12,"../../Stone":18,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],29:[function(require,module,exports){
//Translated from pusher.rb using babyruby2js
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;


/** @class
 *  Way of "pushing" our influence further...
 *  Still very naive; for that reason the coeff are rather low.
 */
function Pusher(player) {
    Heuristic.call(this, player);

    this.enemyAttacks = [];

    this.allyCoeff = this.getGene('allyInfl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemyInfl', 0.13, 0.01, 1.0);

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Pusher, Heuristic);
module.exports = Pusher;


Pusher.prototype.evalBoard = function (stateYx, scoreYx) {
    var enemyAttacks = this.enemyAttacks;
    enemyAttacks.length = 0;

    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    for (var i = enemyAttacks.length - 1; i >= 0; i--) {
        this._blockPush(enemyAttacks[i], scoreYx);
    }
};

Pusher.prototype._evalMove = function (i, j, color) {
    this._attackPush(i, j, 1 - color, /*isEnemy=*/true);

    return this._attackPush(i, j, color);
};

Pusher.prototype._checkBlock = function (cut, pushStone, backupStone, score, scoreYx) {
    if (this.noEasyPrisonerYx[cut.j][cut.i] < 0) return; // we cannot play in cut anyway
    var color = 1 - backupStone.group.color;
    var cutBackupStone = this.co.canConnect(cut, color);
    if (!cutBackupStone) return;
    if (this.mi.groupChance(cutBackupStone.group._info) < 0.5) return;

    if (main.debug) main.log.debug('Pusher sees ' + cut + ' as blocking ' +
        Grid.colorName(1 - color) + ' push in ' + pushStone + ', score: ' + score.toFixed(2));
    scoreYx[cut.j][cut.i] += score;
    this.scoreGrid.yx[cut.j][cut.i] += score; // not needed beside for UI to show
};

Pusher.prototype._blockPush = function (attack, scoreYx) {
    var pushStone = attack[0], backupStone = attack[1], score = attack[2];
    var group = backupStone.group;
    for (var n = 0; n < 8; n++) {
        var s = pushStone.allNeighbors[n];
        if (s === BORDER || s.color !== EMPTY) continue;

        if (!s.isNextTo(group)) continue;
        this._checkBlock(s, pushStone, backupStone, score, scoreYx);
    }
    this._checkBlock(pushStone, pushStone, backupStone, score, scoreYx);

    // if (!cut && main.debug) main.log.debug('Pusher found no way to block ' + pushStone);
};

Pusher.prototype._attackPush = function (i, j, color, isEnemy) {
    var enemyInf = this.infl[1 - color][j][i];
    if (enemyInf === 0) return 0;
    var allyInf = this.infl[color][j][i];

    if (!isEnemy && this.noEasyPrisonerYx[j][i] < 0) return 0;

    // Stones that would "fill a blank" are not for Pusher to evaluate
    var pushStone = this.goban.stoneAt(i, j);
    if (pushStone.numEmpties() === 0) return 0;
    // Only push where we can connect to
    var backupStone = this.co.canConnect(pushStone, color);
    if (!backupStone) return 0;
    if (!isEnemy && !this.co.canConnect(pushStone, 1 - color)) return 0;

    var invasion = this.invasionCost(i, j, color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    score *= this.mi.groupChance(backupStone.group._info);

    if (isEnemy) {
        if (main.debug) main.log.debug('Pusher notes enemy invasion at ' + Grid.xy2move(i, j) + ' (for ' + score.toFixed(2) + ')');
        return this.enemyAttacks.push([pushStone, backupStone, score]);
    }
    if (main.debug) main.log.debug('Pusher ' + Grid.colorName(color) + ' sees push at ' + Grid.xy2move(i, j) + ' -> ' + score.toFixed(2));
    return score;
};

Pusher.prototype._invasionCost = function (i, j, dir, color, level) {
    var s = this.goban.stoneAt(i, j);
    if (s === BORDER || s.color !== EMPTY) return 0;
    var cost = this.pot.enemyTerritoryScore(i, j, color);
    if (s.isBorder()) cost /= 2;
    if (cost <= 0) return 0;
    if (--level === 0) return cost;

    var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
    var spread = XY_AROUND[(dir + 3) % 4];
    var vx = spread[0], vy = spread[1];

    cost += this._invasionCost(i + dx + vx, j + dy + vy, dir, color, level);
    cost += this._invasionCost(i + dx - vx, j + dy - vy, dir, color, level);
    return cost;
};

var INVASION_DEEPNESS = 1; // TODO: better algo for this

Pusher.prototype.invasionCost = function (i, j, color) {
    var cost = Math.max(0, this.pot.enemyTerritoryScore(i, j, color));
    for (var dir = DIR0; dir <= DIR3; dir++) {
        cost += this._invasionCost(i + XY_AROUND[dir][0], j + XY_AROUND[dir][1], dir, color, INVASION_DEEPNESS);
    }
    var s = this.goban.stoneAt(i, j);
    if (s.isCorner()) cost = Math.max(cost - 1, 0);
    else if (s.isBorder()) cost = Math.max(cost - 0.85, 0);
    return cost;
};

},{"../../Grid":12,"../../Stone":18,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],30:[function(require,module,exports){
//Translated from savior.rb using babyruby2js
'use strict';

var main = require('../../main');

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = CONST.ALWAYS;
var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(Savior, Heuristic);
module.exports = Savior;


Savior.prototype._beforeEvalBoard = function () {
    if (!this.hunter) this.hunter = this.player.heuristic.Hunter;
};

Savior.prototype._evalMove = function (i, j) {
    var stone = this.goban.stoneAt(i, j);
    this._evalEscape(i, j, stone);
    return 0;
};

// i,j / stone is the stone we are proposing to play to help one of nearby groups to escape
Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var groups = [], livesAdded = 0, n;

    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            groups.push(g);
        } else if (g.lives === 2) {
            groups.push(g);
        } else if (g.xDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (!groups.length) return false; // no threat we handle here
    livesAdded += stone.numEmpties();

    // Not really intuitive: we check if enemy could chase us starting in i,j
    if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) +
        ' asking hunter to look at ' + stone + ' pre-atari on ' + groups[0] +
        (groups.length > 1 ? ' AND ' + (groups.length - 1) + ' other groups' : ''));
    if (!this.hunter.isKill(i, j, this.enemyColor)) return false;

    if (livesAdded === 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    var canSave = livesAdded > 2;
    if (livesAdded === 2) {
        // we get 2 lives from the new stone - first check special case of border
        if (groups.length === 1 && stone.isBorder()) {
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) +
                ' checks an escape along border in ' + Grid.xy2move(i, j));
            var savior = this._canEscapeAlongBorder(groups[0], i, j);
            if (savior !== undefined) canSave = !!savior;
        }
        if (!canSave) {
            // get our hunter to evaluate if we can escape
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) +
                ' asking hunter to look at ' + Grid.xy2move(i, j) + ', lives_added=' + livesAdded);
            this.goban.tryAt(i, j, this.color);
            canSave = !this.hunter.isEscapingAtariCaught(stone);
            this.goban.untry();
        }
    }
    if (!canSave) {
        if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' giving up on threat in ' + Grid.xy2move(i, j));
        return false; // nothing we can do to help
    }

    for (n = groups.length - 1; n >= 0; n--) {
        g = groups[n];
        this.mi.rescueGroup(g, stone);
        if (main.debug) main.log.debug('=> Savior thinks we can save a threat in ' + stone + ' against ' + g);
    }
    return true;
};

/**
 * Checks if an escape along border can succeed.
 * group escapes toward i,j, the proposed 1st escape move
 * @return {Group|null|undefined} - group we connect to, null if fails, undefined if we cannot say
 */
Savior.prototype._canEscapeAlongBorder = function (group, i, j) {
    // decide direction
    var dx = 0, dy = 0, gsize = this.gsize;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else throw new Error('not along border');

    // get direction to second row (next to the border we run on)
    var secondRowDx = dy, secondRowDy = dx;
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy) === BORDER) {
        secondRowDx = -secondRowDx; secondRowDy = -secondRowDy;
    }
    // don't handle case of group running toward the border here
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy).group === group) {
        return undefined;
    }
    // check 1 stone to see if we should run the other way
    var color = group.color;
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s !== BORDER && s.group === group) {
        dx = -dx; dy = -dy;
    }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) {
            return null;
        }
        switch (s.color) {
        case color:
            if (s.group.lives > 2) return s.group;
            return null;
        case EMPTY:
            var secondRow = this.goban.stoneAt(i + secondRowDx, j + secondRowDy);
            if (secondRow.color === EMPTY) continue;
            if (secondRow.color === 1 - color) {
                return null;
            }
            if (secondRow.group.lives > 2) return secondRow.group;
            return null;
        default: //enemy
            return null;
        }
    }
};

},{"../../Grid":12,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],31:[function(require,module,exports){
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = CONST.EMPTY;
var NEVER = CONST.NEVER, SOMETIMES = CONST.SOMETIMES, ALWAYS = CONST.ALWAYS;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);

    this.potEyeGrids = player.heuristic.PotentialEyes.potEyeGrids;

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    var allGroups = this.pot.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[~~ndx];
        if (g.xDead === ALWAYS || g.xAlive === ALWAYS) continue;

        this._evalSingleEyeSplit(scoreYx, g);
    }
};

Shaper.prototype._evalSingleEyeSplit = function (scoreYx, g) {
    var coords = [];
    var alive = g._info.getEyeMakerMove(coords);
    if (alive !== SOMETIMES) return;
    var stone = this.goban.stoneAt(coords[0], coords[1]);
    var numEyes = stone.numEmpties();

    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' + stone);
    this.mi.eyeThreat(g, stone, this.color, numEyes);
};

Shaper.prototype._evalMove = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    this._eyeCloser(stone, color); // we can save 1 eye for us
    this._eyeCloser(stone, 1 - color); // we can attack 1 eye from enemy
    return 0;
};

Shaper.prototype._eyeCloser = function (stone, color) {
    // Below optim is "risky" since we give up making 2 eyes without trying when
    // our PotentialTerritory eval thinks we are dead. And we know PotentialTerritory is loose.
    if (this.pot.isOwned(stone.i, stone.j, color) === NEVER) return;

    // If enemy cannot connect there is no worry
    if (!this.co.canConnect(stone, 1 - color)) return;

    var v = this.player.boan.getVoidAt(stone);
    if (v.owner && v.owner.group.color === color) {
        this._realEyeCloser(stone, color, v);
    } else {
        this._potEyeCloser(stone, color);
    }
};

// stone can close a real eye if it captures an ally around it AND eye is "small enough" (TBD)
Shaper.prototype._realEyeCloser = function (stone, color, v) {
    if (v.vcount > 2) return; //TODO review this; must be much more complex

    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color === color && s.group.lives === 1) {
            if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees threat on real eye ' + v);
            this.mi.eyeThreat(s.group, stone, color, 1);
            break;
        }
    }
};

Shaper.prototype._potEyeCloser = function (stone, color) {
    var potEyeEvenYx = this.potEyeGrids[EVEN].yx;
    var potEyeOddYx = this.potEyeGrids[ODD].yx;
    var potEye = null, g = null, numEyes = 0;

    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY:
            if (potEyeEvenYx[s.j][s.i] === color || potEyeOddYx[s.j][s.i] === color) {
                potEye = s;
                numEyes++;
            }
            break;
        case color:
            if (!g) g = s.group;
        }
    }
    if (!potEye) return;
    if (!g) {
        // Case where eye-closing stone is not connected to our group (see testEyeMaking_shape5safe)
        if (this.noEasyPrisonerYx[stone.j][stone.i] < 0) return;
        g = this.player.boan.getVoidAt(potEye).groups[color][0]; // any of our groups around should be OK
    }
    if (g.xAlive === ALWAYS || g.xDead === ALWAYS) return;

    this.mi.eyeThreat(g, stone, color, numEyes);
};

},{"../../Grid":12,"../../constants":72,"../../main":73,"./Heuristic":22,"util":6}],32:[function(require,module,exports){
//Translated from spacer.rb using babyruby2js
'use strict';

var main = require('../../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Tries to occupy empty space + counts when filling up territory */
function Spacer(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);
    this.borderCoeff = this.getGene('border', 10, 0, 20);

    this.rowCoeff = this.gsize <= 9 ?
        [0, 0.2, 0.8, 0.95, 1] :
        [0, 0.2, 0.8, 1, 0.95, 0.8];
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype._evalMove = function (i, j) {
    var enemyInf = 0, allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var eInf = this.infl[this.enemyColor], aInf = this.infl[this.color];
    enemyInf += eInf[j][i];
    allyInf += aInf[j][i];
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== main.EMPTY) return 0;
        enemyInf += eInf[s.j][s.i];
        allyInf += aInf[s.j][s.i];
    }
    var totalInf = 1 + this.inflCoeff * Math.max(enemyInf + allyInf - 3, 0) * (this.gsize / 9);

    var maxDist = this.rowCoeff.length - 1;
    var distH = Math.min(this.distanceFromBorder(i), maxDist);
    var distV = Math.min(this.distanceFromBorder(j), maxDist);
    var db = this.rowCoeff[distH] * this.rowCoeff[distV] * this.borderCoeff;
    
    // remove points only if we fill up our own territory
    var fillTer = 0;
    if (!this.player.areaScoring) {
        fillTer = this.pot.territoryScore(i, j, this.color);
        if (fillTer > 0) fillTer = 0; // Pusher will count >0 scores
    }
    return fillTer + db / totalInf;
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};

},{"../../main":73,"./Heuristic":22,"util":6}],33:[function(require,module,exports){
'use strict';

var main = require('../../../main');


/** @class One list of "brother" groups = groups which share eyes.
 *  @param {GroupInfo} gi0 - first group in band */
function Band(gi0) {
    this.bandId = gi0.group.ndx; // unique enough
    this.brothers = [gi0]; // array of GroupInfo
    gi0.band = this;
}
module.exports = Band;


function giNdx(gi) { return '#' + gi.group.ndx; }

Band.prototype.toString = function () {
    return this.brothers.map(giNdx).toString();
};

Band.prototype._add1 = function (gi) {
    if (!gi.band) {
        if (main.debug) main.log.debug('BROTHERS: ' + gi + ' joins band: ' + this.toString());
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    if (main.debug) main.log.debug('BROTHERS: band merge: ' + gi.band.toString() + ' merge with ' + this.toString());
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
    if (main.debug) main.log.debug('un-BROTHERS: ' + gi + ' left band: ' + this.toString());
};

// groups contains the groups in the band
Band.gather = function (groups) {
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

},{"../../../main":73}],34:[function(require,module,exports){
'use strict';

var CONST = require('../../../constants');
var main = require('../../../main');
var Grid = require('../../../Grid');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = CONST.EMPTY, GRID_BORDER = CONST.GRID_BORDER;
var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES, UNDECIDED = GroupInfo.UNDECIDED;

// Analyse modes:
var SCORE = 0, TERRITORY = 1, MOVE = 2;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser(game) {
    this.game = game;
    this.version = 'chuckie';
    this.mode = null;
    this.areaScoring = false; // true if we count area; false if we count territory & prisoners
    this.goban = null;
    this.analyseGrid = null;
    this.scoreGrid = null;
    this.allVoids = [];
    this.allGroupInfos = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners[BLACK] = this.prisoners[WHITE] = 0;
    if (!this.scoreGrid || this.scoreGrid.gsize !== goban.gsize) {
        this.scoreGrid = new Grid(goban.gsize, GRID_BORDER);
    }

    if (!this._initAnalysis(SCORE, goban, this.scoreGrid)) return;
    this._runAnalysis();

    if (!this.areaScoring) goban.countPrisoners(this.prisoners);
};

BoardAnalyser.prototype.getScoringGrid = function () {
    return this.scoreGrid;
};

BoardAnalyser.prototype.getVoidAt = function (stone) {
    return this.analyseGrid.yx[stone.j][stone.i];
};

BoardAnalyser.prototype.startMoveAnalysis = function (goban, grid) {
    this._initAnalysis(MOVE, goban, grid);
};

BoardAnalyser.prototype.continueMoveAnalysis = function () {
    this._runAnalysis();
};

BoardAnalyser.prototype.analyseTerritory = function (goban, grid, first2play) {
    if (!this._initAnalysis(TERRITORY, goban, grid)) return;
    this._runAnalysis(first2play);
};

BoardAnalyser.prototype.image = function () {
    return this.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' + this.analyseGrid.toText() + 'Voids:\n';
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        res += v.toString() + '\n';
    }
    res += 'Groups:\n';
    for (var ndx in this.allGroupInfos) {
        res += this.allGroupInfos[~~ndx].toString() + '\n';
    }
    if (this.scores) {
        res += 'Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        });
    }
    return res;
};

BoardAnalyser.prototype._initAnalysis = function (mode, goban, grid) {
    this.mode = mode;
    this.areaScoring = this.game.useAreaScoring && mode === SCORE;
    this.goban = goban;
    this.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    grid.initFromGoban(goban);
    this._initVoidsAndGroups();
    this._findBrothers();
    this._findEyeOwners();
    return true;
};

BoardAnalyser.prototype._runAnalysis = function (first2play) {
    if (this.mode === MOVE) {
        this._lifeOrDeathLoop();
    } else {
        this._findBattleWinners();
        this._lifeOrDeathLoop(first2play);
        this._findDameVoids();
        this._finalColoring();
    }
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroupInfos[g.ndx];
    if (!gi) {
        if (!g._info || g._info.boan !== this) {
            g._info = new GroupInfo(g, this);
        } else {
            g._info.resetAnalysis();
        }
        gi = this.allGroupInfos[g.ndx] = g._info;
    }
    gi.nearVoids.push(v);
};

/** Create the list of voids and groups.
 * Voids know which groups are around them, but groups do not own any void yet.
 */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroupInfos = {};
    this.allVoids.clear();
    var n, groups, goban = this.goban;
    var v = new Void(goban, voidCode++);
    for (var j = 1; j <= goban.gsize; j++) {
        for (var i = 1; i <= goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, v);
            if (vcount === 0) continue;

            // 1 new void created
            this.allVoids.push(v);
            // keep all the groups
            for (var color = BLACK; color <= WHITE; color++) {
                groups = v.groups[color];
                for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);
            }

            v = new Void(goban, voidCode++);
        }
    }
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroupInfos) {
        this.allGroupInfos[~~ndx].findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    var allVoids = this.allVoids, count = allVoids.length;
    for (var n = count - 1; n >= 0; n--) {
        allVoids[n].findOwner();
    }
    var changed;
    for (;;) {
        changed = false;
        for (n = count - 1; n >= 0; n--) {
            if (allVoids[n].checkFakeEye()) changed = true;
        }
        if (!changed) break;
    }
    for (n = count - 1; n >= 0; n--) {
        allVoids[n].finalizeFakeEye();
    }
};

function normalizeLiveliness(life) {
    // Remove 1 if we have only 1 eye - a single-eye group is not more "resistant"
    if (life > 1 && life < 2) {
        return life - 1;
    }
    return life;
}

function compareLiveliness(life) {
    // make sure we have a winner, not a tie
    if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
        return undefined;
    }
    life[BLACK] = normalizeLiveliness(life[BLACK]);
    life[WHITE] = normalizeLiveliness(life[WHITE]);
    return life[BLACK] > life[WHITE] ? BLACK : WHITE;
}

BoardAnalyser.prototype._findBattleWinners = function () {
    if (this.areaScoring) return;
    var goban = this.goban;
    if (goban.moveNumber() < 2 * goban.gsize) return; // no battle before enough moves were played
    var life = [0, 0], size = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.color !== undefined) continue;
            if (v.vcount > 2 * goban.gsize) continue; // no battle for big voids
            life[BLACK] = life[WHITE] = size[BLACK] = size[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                // NB: we don't check for brothers' liveliness counted twice.
                // No issue noticed so far - see testUnconnectedBrothers / b4
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness();
                    size[color] += gi.countBandSize();
                }
            }
            // no battle if 2 big groups around
            if (size[BLACK] > 4 && size[WHITE] > 4) continue;

            var winner = compareLiveliness(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED VOID in dispute: ' + v + ' with ' + life[0]);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED VOID: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(4) + ' VS ' + life[1 - winner].toFixed(4));
            v.setVoidOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

// Review which groups are dead after a "liveliness" check
function killWeakest(check, fails) {
    // For all groups that failed the test, filter out these that have a weaker neighbor
    for (var i = 0; i < fails.length; i++) {
        var fail = fails[i];
        if (main.debug) main.log.debug('FAIL-' + check.name + ': group #' + fail.group.ndx);
        if (fail.checkAgainstEnemies() !== FAILS)
            fails[i] = null;
    }
    var count = 0;
    for (i = 0; i < fails.length; i++) {
        if (!fails[i]) continue;
        fails[i].considerDead(check.name + ': liveliness=' + fails[i]._liveliness.toFixed(4));
        count++;
    }
    return count;
}

function killAllFails(check, fails) {
    for (var i = 0; i < fails.length; i++) {
        fails[i].considerDead(check.name);
    }
    return fails.length;
}

function killNone() {
    return 0;
}

var brotherCheck =   { name: 'brothers', run: GroupInfo.prototype.checkBrothers };
var singleEyeCheck = { name: 'singleEye', run: GroupInfo.prototype.checkSingleEye, kill: killWeakest };
var raceCheck = { name: 'race', run: GroupInfo.prototype.checkAgainstEnemies, kill: killNone };
var killAtaris = { name: 'atari', run: function () { return this.group.lives <= 1 ? FAILS : UNDECIDED; } };
var finalCheck = { name: 'final', run: function () { return this.checkLiveliness(2); } };

var lifeChecks = [];
lifeChecks[SCORE] = [
    brotherCheck,
    killAtaris,
    singleEyeCheck,
    finalCheck
];
lifeChecks[TERRITORY] = [
    brotherCheck,
    singleEyeCheck
];
lifeChecks[MOVE] = [
    brotherCheck,
    singleEyeCheck,
    raceCheck
];

// NB: order of group should not matter; we must remember this especially when killing some of them
BoardAnalyser.prototype._reviewGroups = function (check, first2play) {
    if (main.debug) main.log.debug('---REVIEWING groups for "' + check.name + '" checks');
    var count = 0, reviewedCount = 0, fails = [];
    for (var ndx in this.allGroupInfos) {
        var gi = this.allGroupInfos[~~ndx];
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;

        switch (check.run.call(gi, first2play)) {
        case FAILS:
            fails.push(gi);
            break;
        case LIVES:
            count++;
            break;
        }
    }
    if (fails.length) {
        // if no dedicated method is given, simply kill them all
        count += check.kill ? check.kill(check, fails) : killAllFails(check, fails);
    }
    if (main.debug && count) main.log.debug('==> "' + check.name + '" checks found ' +
        count + '/' + reviewedCount + ' groups alive/dead');
    if (count === reviewedCount) return 0; // really finished
    if (count === 0) return reviewedCount; // remaining count
    return -count; // processed count
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first2play) {
    if (this.areaScoring) return;
    var checks = lifeChecks[this.mode];
    var stepNum = 0, count;
    while (stepNum < checks.length) {
        count = this._reviewGroups(checks[stepNum++], first2play);
        if (count === 0) {
            this._findEyeOwners();
            return;
        }
        if (count < 0) {
            // we found dead/alive groups => rerun all the checks from start
            stepNum = 0;
            this._findEyeOwners();
            continue;
        }
    }
    if (main.debug && count > 0) main.log.debug('*** UNDECIDED groups after _lifeOrDeathLoop:' + count);
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (this.areaScoring || g._info.liveliness() >= 2) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.setAsDame();
        } else if (this.areaScoring) {
            v.color = aliveColors[BLACK] ? BLACK : WHITE;
        }
    }
};

BoardAnalyser.prototype._finalColoring = function () {
    this._countGroupArea();
    this._colorAndCountDeadGroups();
    this._colorAndCountVoids();
};

BoardAnalyser.prototype._countGroupArea = function () {
    if (!this.areaScoring) return;
    for (var ndx in this.allGroupInfos) {
        var group = this.allGroupInfos[~~ndx].group;
        this.scores[group.color] += group.stones.length;
    }
};

BoardAnalyser.prototype._colorAndCountDeadGroups = function () {
    if (this.areaScoring) return;
    for (var ndx in this.allGroupInfos) {
        var gi = this.allGroupInfos[~~ndx];
        if (!gi.isDead) continue;

        // At least 1 enemy around must be alive otherwise this group is not really dead
        var reallyDead = false;
        for (var n = gi.killers.length - 1; n >= 0; n--) {
            if (!gi.killers[n]._info.isDead) { reallyDead = true; break; }
        }
        // If not really dead we own the voids around
        var color = gi.group.color;
        if (gi.killers.length && !reallyDead) {
            for (var i = gi.nearVoids.length - 1; i >= 0; i--) {
                gi.nearVoids[i].setVoidOwner(color);
            }
            continue;
        }

        var stone = gi.group.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype._colorAndCountVoids = function () {
    var gridYx = this.analyseGrid.yx;
    var fakes = [];

    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        var score = v.getScore(this.areaScoring ? null : fakes);
        if (score) {
            // Get real score added by void (not counting fakes)
            this.scores[v.color] += score - fakes.length;
            // Fill the void with its color
            this.filler.fillWithColor(v.i, v.j, v, Grid.TERRITORY_COLOR + v.color);
            // Mark fakes as DAME, one by one
            for (var n = fakes.length - 1; n >= 0; n--) {
                var s = fakes[n];
                gridYx[s.j][s.i] = Grid.DAME_COLOR;
            }
        } else {
            // This whole void is DAME (between 2 alive groups)
            this.filler.fillWithColor(v.i, v.j, v, Grid.DAME_COLOR);
        }
    }
};

},{"../../../Grid":12,"../../../constants":72,"../../../main":73,"./GroupInfo":36,"./Void":37,"./ZoneFiller":38}],35:[function(require,module,exports){
'use strict';


function FakeSpot(stone, groups) {
    this.stone = stone;
    this.groups = [];
    this.color = groups[0].color;
    this.mustBePlayed = false; // true if connection at fake spot is mandatory

    this.addGroups(groups);
}
module.exports = FakeSpot;


FakeSpot.prototype.addGroups = function (groups) {
    var list = this.groups;
    for (var i = groups.length - 1; i >= 0; i--) {
        var g = groups[i];
        if (list.indexOf(g) < 0) list.push(g);
    }
};

},{}],36:[function(require,module,exports){
'use strict';

var CONST = require('../../../constants');
var main = require('../../../main');
var Band = require('./Band');

var EMPTY = CONST.EMPTY;
var NEVER = CONST.NEVER, SOMETIMES = CONST.SOMETIMES, ALWAYS = CONST.ALWAYS;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group, boan) {
    this.boan = boan;
    this.voids = []; // voids owned by the group
    this.nearVoids = []; // voids around, owned or not
    this.deadEnemies = [];
    this.killers = [];
    this.potentialEyeCounts = [0, 0];
    this.fakeSpots = []; // single connection points with brothers
    this.fakeBrothers = []; // brothers for which connection is a fake spot
    this.closeBrothers = [];

    this.group = group;
    this.resetAnalysis();
}
module.exports = GroupInfo;

// Result of a check on a group:
var FAILS = GroupInfo.FAILS = -1;
var LIVES = GroupInfo.LIVES = +1;
var UNDECIDED = GroupInfo.UNDECIDED = 0;

var ALIVE = GroupInfo.ALIVE = 1000; // any big enough liveliness to mean "alive for good"


// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function () {
    this.eyeCount = this._liveliness = 0;
    this.voids.length = 0;
    this.nearVoids.length = 0;
    this.band = null;
    this.isAlive = this.isDead = false;
    this.inRaceWith = null;
    this.deadEnemies.length = 0;
    this.killers.length = 0;
    this.potentialEyeCounts[EVEN] = this.potentialEyeCounts[ODD] = 0;
    this.fakeSpots.length = 0;
    this.fakeBrothers.length = 0;
    this.closeBrothers.length = 0;
    this.splitEyeCount = 0;
};

// For debug only
function when2str(when) {
    return when > NEVER ? (when > SOMETIMES ? 'ALWAYS' : 'SOMETIMES') : 'NEVER';
}

GroupInfo.giNdx = function (gi) { return '#' + gi.group.ndx; };

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ' voids:' +
        this.voids.length + ' brothers:[' +
        brothers + '] deadEnemies:[' + this.deadEnemies.map(GroupInfo.giNdx) + '])';
};

/** Adds a void to an owner-group + makes groups sharing the void brothers.
 * @param {Void} v
 * @param {Array} [groups] - array of co-owner groups (they become brothers)
 * @return {GroupInfo} - "this"
 */
GroupInfo.prototype.addVoid = function (v, groups) {
    if (main.debug) main.log.debug('OWNED: ' + v + ' owned by ' + this);
    this.voids.push(v);
    this.eyeCount++;

    // an eye between several groups makes them brothers
    // REVIEW THIS; disable because far away groups were ending up brothers before mid-game...
    // No noticeable impact on win rate.
    // if (groups && groups.length > 1) Band.gather(groups);
    return this;
};

/** Removes a void from an owner-group */
GroupInfo.prototype.removeVoid = function (v) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) throw new Error('remove unknown void');
    if (main.debug) main.log.debug('LOST: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    this.eyeCount--;
};

// NB: if we had another way to get the contact points info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group, color = g.color;
    // find allies 1 stone away
    var allies = [], isUnique = [], contactPoints = [];
    var empties = g.allLives();

    for (var e = empties.length - 1; e >= 0; e--) {
        var empty = empties[e];
        var neighbors = empty.neighbors;
        var ally = null;
        for (var n = neighbors.length - 1; n >= 0; n--) {
            var s = neighbors[n];
            if (s.color !== color || s.group === g) continue;
            ally = s.group;
            var ndx = allies.indexOf(ally);
            if (ndx >= 0) {
                if (contactPoints[ndx] !== empty)
                    isUnique[ndx] = false;
                continue;
            }
            allies.push(ally);
            isUnique.push(true);
            contactPoints.push(empty);
        }
    }
    if (!allies.length) return;

    for (var i = allies.length - 1; i >= 0; i--) {
        if (!isUnique[i]) {
            this.closeBrothers.push(allies[i]);
            continue;
        }
        var stone = contactPoints[i];
        var fakeSpot = this.boan.getVoidAt(stone).getFakeSpot(stone, [g, allies[i]]);
        this.fakeSpots.push(fakeSpot);
        this.fakeBrothers.push(allies[i]);
    }
    allies.push(g);
    Band.gather(allies);
};

function findAndMerge(subBands, groups, subNdx) {
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        for (var n = subBands.length - 1; n >= 0; n--) {
            if (subBands[n].indexOf(gi) < 0) continue;
            if (subNdx !== -1 && subNdx !== n) {
                subBands[subNdx] = subBands[subNdx].concat(subBands[n]);
                subBands.splice(n, 1);
                if (n < subNdx) subNdx--;
            } else {
                subNdx = n;
            }
            break;
        }
    }
    return subNdx;
}

// Insert newGroup into one of the subbands; groups1 & groups2 are brothers of newGroup
// Subbands are merged whenever needed (when brotherhood shows 2 subbands are the same)
function mergeSubBands(subBands, newGroup, groups1, groups2) {
    var subNdx = -1;
    subNdx = findAndMerge(subBands, groups1, subNdx);
    subNdx = findAndMerge(subBands, groups2, subNdx);
    if (subNdx < 0) {
        subBands.push([newGroup]);
    } else {
        subBands[subNdx].push(newGroup);
    }
}

// Returns the list of fake brothers not separated from "this" by a cut in "stone"
GroupInfo.prototype._getFakeBrothersIfCut = function (stone) {
    var res = [] ;
    for (var i = this.fakeBrothers.length - 1; i >= 0; i--) {
        if (this.fakeSpots[i].stone === stone) continue;
        res.push(this.fakeBrothers[i]);
    }
    return res;
};

GroupInfo.prototype.getSubBandsIfCut = function (groups, stone) {
    var subBands = [];
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi0 = groups[n]._info;
        var band = gi0.band;
        if (band) {
            for (var i = band.brothers.length - 1; i >= 0; i--) {
                var gi = band.brothers[i];
                mergeSubBands(subBands, gi, gi.closeBrothers, gi._getFakeBrothersIfCut(stone));
            }
        } else {
            subBands.push([gi0]);
        }
    }
    return subBands;
};

GroupInfo.prototype.getSubBandsIfKilled = function (stone) {
    var band = this.band;
    if (!band) return [];
    var subBands = [];
    for (var i = band.brothers.length - 1; i >= 0; i--) {
        var gi = band.brothers[i];
        if (gi === this) continue;
        mergeSubBands(subBands, gi, gi.closeBrothers, gi._getFakeBrothersIfCut(stone));
    }
    return subBands;
};

GroupInfo.prototype.needsToConnect = function () {
    if (this.eyeCount >= 2) return NEVER;
    var numPotEyes = this.countPotEyes();
    if (numPotEyes >= 3) return NEVER;
    if (numPotEyes === 0) return ALWAYS;
    return SOMETIMES;
};

GroupInfo.prototype.needsBrothers = function () {
    if (this.needsToConnect() === NEVER) return false;
    if (this.closeBrothers.length) return false;

    var color = this.group.color, numAllyVoids = 0, extraLife = 0;
    for (var i = this.nearVoids.length - 1; i >= 0; i--) {
        var nearVoid = this.nearVoids[i];
        if (nearVoid.color !== color || nearVoid.realCount === 0) continue;
        numAllyVoids++;
        if (nearVoid.realCount >= 3) extraLife++;
        if (this.deadEnemies.length) extraLife++;
    }
    if (numAllyVoids + extraLife >= 2) return false;
    return true;
};

GroupInfo.prototype.considerDead = function (reason) {
    this.isDead = true;

    var enemies = this.killers = this.group.allEnemies();
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i]._info.deadEnemies.push(this);
    }
    // All enemies are now "connected" via this dead group
    // REVIEW: this seemed to make sense but decreases our win rate by ~7% against droopy
    // if (enemies.length > 1) Band.gather(enemies);

    if (main.debug) main.log.debug('DEAD-' + reason + ': ' + this);
};

/** Returns a number telling how "alive" a group is.
 *  If >2 this should mean "alive for good" */
GroupInfo.prototype.liveliness = function (strict, shallow) {
    if (this.isAlive || this.eyeCount >= 2) {
        return ALIVE;
    }

    var n, racePoints = 0, color = this.group.color, lives = this.group.lives;
    for (var i = this.nearVoids.length - 1; i >= 0; i--) {
        var v = this.nearVoids[i];
        var points = Math.min(lives, v.vcount);
        if (v.owner) {
            if (v.owner === this) racePoints += points;
        } else {
            var allies = v.groups[color]; // NB: we don't care about enemies
            if (allies.length === 1) {
                racePoints += points;
            } else {
                var myNdx = this.group.ndx, minNdx = myNdx;
                for (n = allies.length - 1; n >= 0; n--) {
                    minNdx = Math.min(allies[n].ndx, minNdx);
                }
                if (myNdx === minNdx) racePoints += points;
            }
        }
    }
    racePoints /= 100;
    if (!shallow) racePoints += lives / 10000; // is this still necessary?

    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow && this.band) {
        var brothers = this.band.brothers;
        for (n = brothers.length - 1; n >= 0; n--) {
            if (brothers[n] === this) continue;
            familyPoints += brothers[n].liveliness(strict, true);
        }
    }
    //TODO: get rid of this "strict" idea
    var numDeadEnemies = strict ? this.countEyesFromDeadEnemy() : this.deadEnemies.length;
    return this.eyeCount + numDeadEnemies + familyPoints + racePoints;
};

// Finds next recommended move to make 2 eyes
// Returns:
//   NEVER => cannot make 2 eyes
//   SOMETIMES => can make 2 eyes if we play now; coords will receive [i,j]
//   ALWAYS => can make 2 eyes even if opponent plays first
// 5 shapes:
//   4-1-1-1-1 "+" shape => center is must-play now
//   2-2-2-1-1 "line" => safe
//   3-2-2-2-1 "d" shape => 3 is must-play now
//   3-2-1-1-1 "t" shape => safe
// 6 shapes:
//   3-3-2-2-2-2 "6 domino" shape => one of the 3 is must-play now
//   anything else is safe
GroupInfo.prototype.getEyeMakerMove = function (coords) {
    // TODO: if depending group is on a side of eye, 1 vertex will be lost
    if (this.eyeCount > 1) return ALWAYS;
    if (this.eyeCount === 0) return NEVER;
    var singleEye = this.voids[0], vcount = singleEye.vcount;
    if (vcount > 6) return ALWAYS;
    if (main.debug) main.log.debug('getEyeMakerMove checking ' + this + ' with single eye: ' + singleEye);

    var g = this.group, color = g.color;
    var best = null, bestLives = 0, bestEnemies = 0, numMoves = 0;
    var enemy1 = null, enemy2 = null, numVertexAwayFromEnemy = 0, vertexAwayFromEnemy;
    var empties = singleEye.vertexes, oneMoveIsCorner = false, lives = [0, 0, 0, 0, 0];

    for (var n = 0; n < vcount; n++) {
        var s = empties[n];
        var numEnemies = 0, numAllies = 0, numLives = 0;

        for (var m = s.neighbors.length - 1; m >= 0; m--) {
            var s2 = s.neighbors[m];
            switch (s2.color) {
            case EMPTY:
                numLives++;
                break;
            case color: numAllies++; break;
            default:
                if (s2.group.lives === 1) {
                    numLives++; // playing here kills enemy
                    numVertexAwayFromEnemy += 2;
                    break;
                }
                numEnemies++;
                if (!enemy1) enemy1 = s2.group;
                else if (s2.group !== enemy1) enemy2 = s2.group;
            }
        }
        if (numEnemies) {
            if (numLives + (numAllies ? 1 : 0) < 2) continue;
        } else {
            numVertexAwayFromEnemy++;
            vertexAwayFromEnemy = s;
            if (numLives < 2) continue;
            lives[numLives]++;
        }
        if (main.debug) main.log.debug('getEyeMakerMove sees ' + numLives + (numEnemies < 1 ? '' : (numEnemies > 1 ? 'e' + numEnemies : 'E')) + ' in ' + s);

        numMoves++; // count successful moves; if more than 1 => ALWAYS good
        if (s.isCorner()) oneMoveIsCorner = true;

        // If we already have a best move, compare with new move
        if (best && !best.isCorner()) { // corner (2L,0E) is "less good" than any other good move
            if (numEnemies < bestEnemies) continue;
            if (numLives + numEnemies <= bestLives + bestEnemies) continue;
        }
        best = s;
        bestEnemies = numEnemies;
        bestLives = numLives;
    }
    if (oneMoveIsCorner && numMoves > 1) numMoves--;
    if (main.debug) main.log.debug('getEyeMakerMove result: ' + best + ' - ' + (best ? (numMoves > 1 ? 'ALWAYS' : 'SOMETIMES') : 'NEVER'));

    if (!best) return NEVER;
    if (numVertexAwayFromEnemy === 1 && !enemy2 && enemy1 && enemy1.stones.length < 3) {
        if (this._enemyCanReach(enemy1, vertexAwayFromEnemy, best))
            return NEVER; // see testEyeMaking_3withPrisoners
    }
    if (numMoves >= 2) {
        // except for shape "5" with 1 forced move, we are good if 2 moves or more
        var isWeak5 = vcount === 5 && bestEnemies === 0 && lives[3] === 1 && lives[2] === 3;
        var isWeak6 = vcount === 6 && bestEnemies === 0 && lives[3] === 2 && lives[2] === 4;
        if (!isWeak5 && !isWeak6) return ALWAYS;
    }
    coords[0] = best.i; coords[1] = best.j;
    return SOMETIMES;
};

GroupInfo.prototype._enemyCanReach = function (enemy, vertex, best) {
    for (var i = vertex.neighbors.length - 1; i >= 0; i--) {
        var s = vertex.neighbors[i];
        if (s.color !== EMPTY || s === best) continue;
        if (s.isNextTo(enemy)) return true;
    }
    return false;
};

// TODO better algo
// We would not need this if we connected as "brothers" 2 of our groups separated by 
// a dead enemy. This is probably a better way to stop counting dead enemies to make up
// for unaccounted eyes. See TestBoardAnalyser#testBigGame2 in h12 for an example.
GroupInfo.prototype.countEyesFromDeadEnemy = function () {
    var count = this.deadEnemies.length;
    for(var n = count - 1; n >= 0; n--) {
        var voids = this.deadEnemies[n].nearVoids;
        // if a void next to this enemy belongs to us already, then dead enemy adds nothing
        for (var m = voids.length - 1; m >= 0; m--) {
            if (voids[m].owner === this) { // if remark above is coded, it becomes voids[m].color === color
                count--;
                break;
            }
        }
    }
    return count;
};

// This checks if a group can survive together with his brothers
GroupInfo.prototype.checkBrothers = function () {
    if (!this.band) return UNDECIDED;
    var brothers = this.band.brothers;
    var numEyes = 0, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        var gi = brothers[n];
        if (gi === this) continue;
        if (oneIsAlive || gi.isAlive) {
            oneIsAlive = gi.isAlive = true;
        } else {
            // gather the commonly owned eyes (2 one-eyed brothers are alive for good)
            numEyes += gi.eyeCount;
            if (numEyes >= 2) {
                oneIsAlive = gi.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return UNDECIDED;
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this, ' numEyes: ' + numEyes);
    this.isAlive = true;
    return LIVES;
};

GroupInfo.prototype._isLostInEnemyZone = function () {
    if (this.band) return false;
    if (this.nearVoids[0].color === this.group.color) return false;
    if (this.group.stones.length >= 6) return false;
    return true;
};

// This checks if a group can make 2 eyes from a single one
GroupInfo.prototype.checkSingleEye = function (first2play) {
    if (this.eyeCount >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
        return LIVES;
    }
    if (this._isLostInEnemyZone()) return FAILS;

    var coords = [];
    var canMakeTwoEyes = this.getEyeMakerMove(coords);
    // if it depends which player plays first
    if (canMakeTwoEyes === SOMETIMES) {
        this.splitEyeCount = 0.5;
        if (first2play === undefined) return UNDECIDED; // no idea who wins here
        if (first2play !== this.group.color) {
            canMakeTwoEyes = NEVER;
        }
    }
    if (canMakeTwoEyes === NEVER) {
        this.splitEyeCount = 0;
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.deadEnemies.length) return UNDECIDED;
        if (this.countBandPotentialEyes() >= 1.5)
            return UNDECIDED;
        this._liveliness = this.liveliness();
        return FAILS;
    }
    // canMakeTwoEyes === ALWAYS or SOMETIMES & it is our turn to play
    this.isAlive = true;
    this.splitEyeCount = 1;
    if (main.debug) main.log.debug('ALIVE-canMakeTwoEyes-' + when2str(canMakeTwoEyes) + ': ' + this);
    return LIVES;
};

// Check for races & weaker groups around
GroupInfo.prototype.checkAgainstEnemies = function () {
    var liveliness = this._liveliness || this.liveliness();
    var enemies = this.group.allEnemies();
    var inRaceWith = null;

    for (var e = 0; e < enemies.length; e++) {
        var enemy = enemies[e]._info;
        var cmp = liveliness - enemy.liveliness();
        if (main.debug) main.log.debug('comparing group #' + this.group.ndx + ' with ' +
            liveliness.toFixed(4) + ' against ' + (liveliness - cmp).toFixed(4) +
            ' for enemy group #' + enemy.group.ndx);
        if (cmp > 0) {
            if (main.debug) main.log.debug(this + ' is stronger than ' + enemy);
            return UNDECIDED;
        } else if (cmp === 0) {
            if (main.debug) main.log.debug('RACE between ' + this.group + ' and ' + enemy.group);
            inRaceWith = enemy; // we continue looping: not a race if a weaker is found
        }
    }
    if (inRaceWith) {
        this.inRaceWith = inRaceWith; // TODO race between more than 2 groups
        inRaceWith.inRaceWith = this;
        return UNDECIDED;
    }
    return FAILS;
};

// This checks if a group has a minimum liveliness
GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this._liveliness = this.liveliness(true);
    if (life >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return LIVES;
    }
    if (life < minLife) {
        this._liveliness = life;
        return FAILS;
    }
    return UNDECIDED;
};

GroupInfo.prototype.callOnBand = function (method, param) {
    if (this.band) {
        var brothers = this.band.brothers, count = 0;
        for (var n = brothers.length - 1; n >= 0; n--) {
            count += method.call(brothers[n], param);
        }
        return count;
    } else {
        return method.call(this, param);
    }
};

GroupInfo.prototype.addPotentialEye = function (oddOrEven, count) {
    this.potentialEyeCounts[oddOrEven] += count;
};

GroupInfo.prototype.isInsideEnemy = function () {
    var enemyColor = 1 - this.group.color;
    for (var n = this.nearVoids.length - 1; n >= 0; n--) {
        var v = this.nearVoids[n];
        if (v.color !== enemyColor) return false;
    }
    return true;
};

// When an enemy is undead but inside our group, it can be counted as eye
// NB: difference with isInsideEnemy is that we skip voids that are already eyes
GroupInfo.prototype._countEyesAroundPrisoner = function () {
    //TODO: see why 3 tests broken by this & fix this algo; note 3 others are fixed...
    // testLadder1, testBigConnectScore, testBlockAndConnect
    var color = this.group.color;
    for (var n = this.nearVoids.length - 1; n >= 0; n--) {
        var v = this.nearVoids[n];
        if (v.color !== undefined) continue;
        var enemies = v.groups[1 - color];
        var canBeEye = true;
        for (var m = enemies.length - 1; m >= 0; m--) {
            var enemy = enemies[m];
            if (enemy.stones.length >= 6 || enemies.xAlive === ALWAYS) {
                canBeEye = false;
                break;
            }
        }
        if (canBeEye) return 1;
    }
    return 0;
};

GroupInfo.prototype.countPotEyes = function () {
    // TODO: potential eyes odd/even could be counted differently; e.g. use a min/max param or first2play
    return this.eyeCount + this.splitEyeCount + this._countEyesAroundPrisoner() +
        (this.potentialEyeCounts[EVEN] + this.potentialEyeCounts[ODD]) / 2;
};

GroupInfo.prototype.countBandPotentialEyes = function () {
    return this.callOnBand(this.countPotEyes);
};

GroupInfo.prototype._countSize = function () {
    return this.group.stones.length;
};

GroupInfo.prototype.countBandSize = function () {
    return this.callOnBand(this._countSize);
};

},{"../../../constants":72,"../../../main":73,"./Band":33}],37:[function(require,module,exports){
'use strict';

var CONST = require('../../../constants');
var main = require('../../../main');
var FakeSpot = require('./FakeSpot');
var Grid = require('../../../Grid');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;

var vEYE = 1, vFAKE = 2, vDAME = 3;
var VTYPES = ['void', 'eye', 'fake', 'dame'];


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(goban, code) {
    this.goban = goban;
    this.code = code;
    this.i = this.j = 0;
    this.vcount = 0;
    this.groups = null; // neighboring groups (array of arrays; 1st index is color)
    this.vertexes = null;
    this.vtype = undefined; // see vXXX contants below
    this.color = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.owner = undefined; // GroupInfo or undefined; NB: fake eyes don't have owner
    this.isInDeadGroup = false; // true when all groups around an eye are dead (e.g. one-eyed dead group)
    this.hasFakeSpots = false;
    this.realCount = -1;
    this.fakeSpots = null;
    this.isSingleColor = false;
}
module.exports = Void;

/** @return {array[]} - groups[BLACK] & groups[WHITE] to receive groups around zone */
Void.prototype.prepare = function (i, j) {
    this.i = i;
    this.j = j;
    this.fakeSpots = [];
    this.groups = [[], []];
    this.vertexes = [];
    return this.groups;
};

Void.prototype.addVertex = function (i, j) {
    this.vcount++;
    this.vertexes.push(this.goban.stoneAt(i, j));
};

function vtype2str(vtype) {
    return vtype ? VTYPES[vtype] : VTYPES[0];
}

function areGroupsAllDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return false;
    }
    return true;
}

Void.prototype.getFakeSpot = function (stone, groups) {
    if (main.debug) main.log.debug('FAKE SPOT in ' + this + ' at ' + stone + ' for ' + groups.map(function (g) { return g.ndx; }));
    this.hasFakeSpots = true;
    var index = this.vertexes.indexOf(stone);
    var fakeSpot = this.fakeSpots[index];
    if (!fakeSpot) fakeSpot = this.fakeSpots[index] = new FakeSpot(stone, groups);
    else fakeSpot.addGroups(groups);
    return fakeSpot;
};

Void.prototype.findOwner = function () {
    var blackGroups = this.groups[BLACK], whiteGroups = this.groups[WHITE];
    // see which color has yet-alive groups around this void
    var allBlackDead = areGroupsAllDead(blackGroups);
    var allWhiteDead = areGroupsAllDead(whiteGroups);

    // every group around now dead = eye belongs to the killers
    if (allBlackDead && allWhiteDead) {
        if (this.isInDeadGroup || this.color === undefined) return false;
        return this._setAsDeadGroupEye();
    }
    if (this.vtype === vEYE) return false; // eyes don't change owner unless in a dead group
    if (!allBlackDead && !allWhiteDead) return false; // still undefined owner

    var color = allBlackDead ? WHITE : BLACK;
    this.isSingleColor = !blackGroups.length || !whiteGroups.length;

    if (this.hasFakeSpots) return this._initFakeEye(color);

    this.realCount = this.vcount;
    return this._setOwner(color);
};

Void.prototype._initFakeEye = function (color) {
    this.vtype = vFAKE;
    this.color = color;

    if (this.owner) {
        this.owner.removeVoid(this); this.owner = null;
    }

    for (var n = this.fakeSpots.length - 1; n >= 0; n--) {
        var fakeSpot = this.fakeSpots[n];
        if (fakeSpot) fakeSpot.mustBePlayed = false;
    }
    return true;
};

Void.prototype.checkFakeEye = function () {
    if (this.vtype !== vFAKE) return false;

    var prevCount = this.realCount;
    var realCount = this.realCount = this.vcount - this._getMustPlayStones();
    if (main.debug) main.log.debug('Real vcount: ' + realCount + ' for ' + this);

    return realCount !== prevCount;
};

Void.prototype._getMustPlayStones = function (stones) {
    if (!stones) stones = [];

    for (var n = this.fakeSpots.length - 1; n >= 0; n--) {
        var fakeSpot = this.fakeSpots[n];
        if (!fakeSpot || fakeSpot.color !== this.color) continue;
        var groups = fakeSpot.groups;
        for (var i = groups.length - 1; i >= 0; i--) {
            if (groups[i]._info.needsBrothers()) {
                if (main.debug && !fakeSpot.mustBePlayed) main.log.debug('Must be played: ' + fakeSpot.stone);
                fakeSpot.mustBePlayed = true;
                stones.push(fakeSpot.stone);
                break;
            }
        }    
    }
    return stones.length;
};

Void.prototype.finalizeFakeEye = function () {
    if (this.vtype !== vFAKE) return;

    if (this.realCount === 0) {
        if (this.owner) throw new Error('NEVER HAPPENS');
        if (main.debug) main.log.debug('FAKE EYE remains fake: ' + this);
        return;
    }

    if (main.debug) main.log.debug('FAKE SPOTS disregarded for: ' + this);
    var color = this.color;
    this.color = this.vtype = undefined;
    return this._setOwner(color);
};

Void.prototype._setOwner = function (color) {
    if (this.isSingleColor) {
        return this._setAsEye(color);
    } else {
        return this.setVoidOwner(color);
    }
};

Void.prototype._setAsEye = function (color) {
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.color = color;
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
    return true;
};

/** Sets the "stronger color" that will probably own a void - vtype == undefined */
Void.prototype.setVoidOwner = function (color) {
    if (color === this.color) return false;
    if (main.debug) main.log.debug('VOID: ' + Grid.colorName(color) + ' owns ' + this);

    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.color = color;
 
    // Given void can be seen as an eye if no other eye is around its "dead" enemies
    // i.e. no dead enemy ever "connects" 2 eyes (this would be a single eye)
    var enemies = this.groups[1 - color];
    for (var e = enemies.length - 1; e >= 0; e--) {
        var evoids = enemies[e]._info.nearVoids;
        for (var n = evoids.length - 1; n >= 0; n--) {
            if (evoids[n] === this) continue;
            if (evoids[n].color === color) return true;
        }
    }
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
    return true;
};

// Called during final steps for voids that have both B&W groups alive close-by
Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vDAME;
    this.color = undefined;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype._setAsDeadGroupEye = function () {
    if (main.debug) main.log.debug('EYE-IN-DEAD-GROUP: ' + this);
    var color = this.color;
    if (color === undefined) throw new Error('dead group\'s eye of undefined owner');

    this.isInDeadGroup = true;
    this.hasFakeSpots = false; // fakes become regular space if the group is dead
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.color = 1 - color;

    // give it to any of the killers
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.killers.length) {
            this.owner = gi.killers[0]._info.addVoid(this);
            return true;
        }
    }
    // Found no killer; happens for eye inside dead group lost inside enemy zone.
    // We should leave the eye inside its possibly dead group. See TestBoardAnalyser#testDoomedGivesEye2
    return true;
};

Void.prototype.getScore = function (fakes) {
    if (this.color === undefined) return 0;
    if (fakes) {
        fakes.length = 0;
        if (this.hasFakeSpots) this._getMustPlayStones(fakes);
    }
    return this.vcount;
};

Void.prototype.isTouching = function (gi) {
    var g = gi.group;
    return this.groups[g.color].indexOf(g) > -1;
};

function grpNdx(g) { return '#' + g.ndx; }

Void.prototype.toString = function () {
    return '{' + vtype2str(this.vtype) + '-' + Grid.xy2move(this.i, this.j) + ' vcount:' + this.vcount +
        ' black:' + (this.groups[BLACK].map(grpNdx).toString() || '-') +
        ' white:' + (this.groups[WHITE].map(grpNdx).toString() || '-') + '}';
};

},{"../../../Grid":12,"../../../constants":72,"../../../main":73,"./FakeSpot":35}],38:[function(require,module,exports){
'use strict';

var main = require('../../../main');

var GRID_BORDER = main.GRID_BORDER;
var BORDER = main.BORDER;


/** @class Fills & collect info about zones.
 */
function ZoneFiller(goban, grid) {
    this.goban = goban;
    this.yx = grid.yx;

    this.groups = null;
    this.toReplace = null;
}
module.exports = ZoneFiller;


/**
 * "Colors" a goban zone.
 * @param {number} toReplace - EMPTY, BLACK, WHITE or a zone code
 * @param {number|Void} byColor - if a Void, it will be updated too
 */
ZoneFiller.prototype.fillWithColor = function (i0, j0, toReplace, byColor) {
    if (this.yx[j0][i0] !== toReplace) return 0;
    this.toReplace = toReplace;
    var theVoid = typeof byColor !== 'number' ? byColor : null;
    this.groups = theVoid && theVoid.prepare(i0, j0);
    var vcount = 0, yx = this.yx;
    var gap, gaps = [[i0, j0, j0]], i, j1;

    while ((gap = gaps.pop())) {
        i = gap[0]; j0 = gap[1]; j1 = gap[2];
        
        if (yx[j0][i] !== toReplace) continue; // gap already done by another path

        while (this._check(i, j0 - 1)) j0--;
        while (this._check(i, j1 + 1)) j1++;

        vcount += j1 - j0 + 1;
        // Doing column i from j0 to j1
        for (var ix = i - 1; ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                if (ix < i) {
                    yx[j][i] = byColor; // fill with color
                    if (theVoid) theVoid.addVertex(i, j);
                }
                if (this._check(ix, j)) {
                    if (!curgap) {
                        // New gap in ix starts at j
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            }
            if (curgap) gaps.push([ix, curgap, j1]); // last gap
        }
    }
    return vcount;
};

// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === GRID_BORDER || color === BORDER) return false;
    if (color === this.toReplace) {
        return true;
    }

    if (!this.groups) return false; // we don't want the groups surrounding zones
    if (typeof color !== 'number') return false; // i,j is part of a void

    // keep new neighbors
    var group = this.goban.stoneAt(i, j).group;
    if (!group) throw new Error('Unexpected: ZoneFiller replacing a group'); // (since i,j is EMPTY)
    var groups = this.groups[color];
    if (groups.indexOf(group) === -1) groups.push(group);

    return false;
};

},{"../../../main":73}],39:[function(require,module,exports){
'use strict';

var main = require('../../main');

var BoardAnalyser = require('./boan/BoardAnalyser');
var CONST = require('../../constants');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var ZoneFiller = require('./boan/ZoneFiller');

// All heuristics
var Connector = require('./Connector');
var GroupAnalyser = require('./GroupAnalyser');
var GroupsAndVoids = require('./GroupsAndVoids');
var Hunter = require('./Hunter');
var Influence = require('./Influence');
var MoveInfo = require('./MoveInfo');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var PotentialEyes = require('./PotentialEyes');
var PotentialTerritory = require('./PotentialTerritory');
var Pusher = require('./Pusher');
var Savior = require('./Savior');
var Shaper = require('./Shaper');
var Spacer = require('./Spacer');

var GRID_BORDER = CONST.GRID_BORDER;
var sOK = CONST.sOK, sINVALID = CONST.sINVALID, sDEBUG = CONST.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class */
function Chuckie(game, color, genes) {
    this.name = 'Chuckie';
    this.game = game;
    this.goban = game.goban;
    this.boan = new BoardAnalyser(game); // several heuristics can share this boan
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.areaScoring = game.useAreaScoring;
    this.stateGrid = new Grid(this.gsize, GRID_BORDER);
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Chuckie;

Chuckie.publicName = 'Chuckie';
Chuckie.publicVersion = '0.1';

// Used only by tests
Chuckie.BoardAnalyser = BoardAnalyser;
Chuckie.ZoneFiller = ZoneFiller;


Chuckie.prototype._newHeuristic = function (Constr) {
    var h = new Constr(this);
    this.heuristics.push(h);
    return h;
};

Chuckie.prototype._createHeuristics = function () {
    var heuristic = this.heuristic = {};
    this.heuristics = [];

    heuristic.MoveInfo = this._newHeuristic(MoveInfo);
    heuristic.PotentialTerritory = this._newHeuristic(PotentialTerritory);
    heuristic.GroupsAndVoids = this._newHeuristic(GroupsAndVoids);
    heuristic.Influence = this._newHeuristic(Influence);
    heuristic.PotentialEyes = this._newHeuristic(PotentialEyes);
    heuristic.GroupAnalyser = this._newHeuristic(GroupAnalyser);
    heuristic.NoEasyPrisoner = this._newHeuristic(NoEasyPrisoner);
    heuristic.Savior = this._newHeuristic(Savior);
    heuristic.Hunter = this._newHeuristic(Hunter);
    heuristic.Connector = this._newHeuristic(Connector);
    heuristic.Spacer = this._newHeuristic(Spacer);
    heuristic.Pusher = this._newHeuristic(Pusher);
    heuristic.Shaper = this._newHeuristic(Shaper);

    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].updateCrossRef();
    }
};

Chuckie.prototype.setColor = function (color) {
    this.color = color;
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].initColor(color);
    }
};

/** Can be called from Breeder with different genes */
Chuckie.prototype.prepareGame = function (genes) {
    if (genes) this.genes = genes;
    this.numMoves = this.numRandomPicks = 0;

    this.bestScore = this.bestI = this.bestJ = 0;
    this.usedRandom = false;
    this.testI = this.testJ = NO_MOVE;
    this.debugHeuristic = null;
};

/** Get a heuristic from its human name - for UI and tests */
Chuckie.prototype.getHeuristic = function (heuristicName) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    return null;
};

Chuckie.prototype.getGene = function (geneName, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.name + '-' + geneName, defVal, lowLimit, highLimit);
};

Chuckie.prototype._foundBestMove = function(i, j, score) {
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
    this.usedRandom = this.numBestTwins !== 1;
};

Chuckie.prototype._keepBestMove = function(i, j, score) {
    if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score);
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score);
    }
};

// Returns the move chosen (e.g. c4 or pass)
Chuckie.prototype.getMove = function () {
    this.numMoves++;
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;

    this._prepareEval();
    this._initScoringGrid(stateYx, scoreYx);
    this._runHeuristics(stateYx, scoreYx);
    var move = this._collectBestMove(stateYx, scoreYx);

    main.debug = this.debugMode;
    return move;
};

Chuckie.prototype._prepareEval = function () {
    this.bestScore = this.minimumScore - 0.001;
    this.bestI = NO_MOVE;

    this.debugMode = main.debug;
    main.debug = false;
};

/** Init grids (and mark invalid moves) */
Chuckie.prototype._initScoringGrid = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (!this.goban.isValidMove(i, j, this.color)) {
                stateYx[j][i] = sINVALID;
                continue;
            }
            stateYx[j][i] = sOK;
            scoreYx[j][i] = 0;
        }
    }
    if (this.testI !== NO_MOVE) {
        if (stateYx[this.testJ][this.testI] === sINVALID)
            throw new Error('Invalid test move: ' + this.testI + ',' + this.testJ);
        stateYx[this.testJ][this.testI] = sDEBUG;
    }
};

/** Do eval using each heuristic (NB: order is important) */
Chuckie.prototype._runHeuristics = function (stateYx, scoreYx) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        main.debug = this.debugMode && this.debugHeuristic === h.name;
        var t0 = Date.now();

        if (h._beforeEvalBoard) h._beforeEvalBoard();
        h.evalBoard(stateYx, scoreYx);

        var time = Date.now() - t0;
        if (time >= 3 && !main.isCoverTest) {
            main.log.warn('Slowness: ' + h.name + ' took ' + time + 'ms');
        }
    }
    this.heuristic.MoveInfo.collectScores(stateYx, scoreYx);
};

/** Returns the move which got the best score */
Chuckie.prototype._collectBestMove = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK || scoreYx[j][i] < this.bestScore) continue;
            this._keepBestMove(i, j, scoreYx[j][i]);
        }
    }
    if (this.bestScore < this.minimumScore) return 'pass';
    if (this.usedRandom) this.numRandomPicks++;
    return Grid.xy2move(this.bestI, this.bestJ);
};

// Called by UI only
Chuckie.prototype.guessTerritories = function () {
    var pot = this.heuristic.PotentialTerritory;
    pot.evalBoard();
    return pot.territory.yx;
};

Chuckie.prototype._getMoveForTest = function (i, j) {
    this.testI = i;
    this.testJ = j;

    this.getMove();

    this.testI = NO_MOVE;
};

Chuckie.prototype._getMoveSurvey = function (i, j) {
    var survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].getMoveSurvey(i, j, survey);
    }
    return survey;
};

/** For tests */
Chuckie.prototype.testMoveEval = function (i, j) {
    this._getMoveForTest(i, j);
    return this.scoreGrid.yx[j][i];
};

/** For tests */
Chuckie.prototype.testHeuristic = function (i, j, heuristicName) {
    this._getMoveForTest(i, j);
    var h = this.getHeuristic(heuristicName);
    return h.scoreGrid.yx[j][i];
};

/** For tests */
Chuckie.prototype.setDebugHeuristic = function (heuristicName) {
    this.debugHeuristic = heuristicName;
};

function surveySort(h1, h2) { return h2[1] - h1[1]; }

Chuckie.prototype.getMoveSurveyText = function (move, isTest) {
    var coords = this.game.oneMove2xy(move);
    if (!coords) return '';
    var i = coords[0], j = coords[1];
    if (isTest) {
        if (!this.goban.isValidMove(i, j, this.game.curColor)) return 'Invalid move: ' + move;
        this._getMoveForTest(i, j);
    }
    var survey = this._getMoveSurvey(i, j);
    var score = this.scoreGrid.yx[j][i];

    var sortedSurvey = [];
    for (var h in survey) {
        if (survey[h] === 0) continue;
        sortedSurvey.push([h, survey[h]]);
    }
    sortedSurvey.sort(surveySort);

    var txt = move + ' (' + score.toFixed(2) + ')\n';
    for (var n = 0; n < sortedSurvey.length; n++) {
        txt += '- ' + sortedSurvey[n][0] + ': ' + sortedSurvey[n][1].toFixed(2) + '\n';
    }
    return txt;
};


},{"../../Genes":10,"../../Grid":12,"../../constants":72,"../../main":73,"./Connector":19,"./GroupAnalyser":20,"./GroupsAndVoids":21,"./Hunter":23,"./Influence":24,"./MoveInfo":25,"./NoEasyPrisoner":26,"./PotentialEyes":27,"./PotentialTerritory":28,"./Pusher":29,"./Savior":30,"./Shaper":31,"./Spacer":32,"./boan/BoardAnalyser":34,"./boan/ZoneFiller":38}],40:[function(require,module,exports){
'use strict';

var Connector = require('./Connector');
var GroupAnalyser = require('./GroupAnalyser');
var Hunter = require('./Hunter');
var Influence = require('./Influence');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var PotentialTerritory = require('./PotentialTerritory');
var Pusher = require('./Pusher');
var Savior = require('./Savior');
var Shaper = require('./Shaper');
var Spacer = require('./Spacer');


var allHeuristics = function () {
    return [
        PotentialTerritory,
        GroupAnalyser,
        Influence,
        NoEasyPrisoner,
        Hunter,
        Savior,
        Connector,
        Spacer,
        Pusher,
        Shaper
    ];
};
module.exports = allHeuristics;

},{"./Connector":41,"./GroupAnalyser":42,"./Hunter":44,"./Influence":45,"./NoEasyPrisoner":46,"./PotentialTerritory":47,"./Pusher":48,"./Savior":49,"./Shaper":50,"./Spacer":51}],41:[function(require,module,exports){
//Translated from connector.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, BORDER = main.BORDER;
var ALWAYS = main.ALWAYS, NEVER = main.NEVER;

/*
TODO:
- Fix under-evaluation in cases we could handle better:
  # When we see a group is "SOMETIMES" dead, we consider the connection/cut as
    a 0.5 win; in case where the connection/cut is precisely the saving/killing stone,
    we should count a full win instead.
  # See test TestAi#testConnect: the connection is actually deciding life/death of more
    than the 2 groups we look at: the 2 stones group is a brother of another group 
    which will be saved/dead too depending on this connection.
- Merge "direct" and "diagonal" algos to do it right
- One other way to connect 2 groups is to "protect" the cutting point; handle this here
- When we try to "cut" (enemy color), eval should give 0 if another way of connecting exists
*/

/** @class A move that connects 2 of our groups is good.
 */
function Connector(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);
    this.riskCoeff = this.getGene('risk', 1, 0.1, 4.0);

    this.noEasyPrisonerYx = player.getHeuristic('NoEasyPrisoner').scoreGrid.yx;
    this.hunter = player.getHeuristic('Hunter');
}
inherits(Connector, Heuristic);
module.exports = Connector;


Connector.prototype._evalMove = function (i, j, color) {
    // If our stone would simply be captured, no luck
    var stone = this.goban.stoneAt(i, j);
    if (this.noEasyPrisonerYx[j][i] < 0 && !this.hunter.isSnapback(stone)) {
        if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' skips ' + stone + ' (trusting NoEasyPrisoner)');
        return 0;
    }
    // Score for connecting our groups + cutting enemies
    return this._connectsMyGroups(stone, color) +
           this._connectsMyGroups(stone, 1 - color);
};

function groupNeedsToConnect(g) {
    var gi = g._info;
    return gi.eyeCount === 0 && gi.numContactPoints === 1;
}

Connector.prototype._diagonalConnect = function (stone, color) {
    var diag = true, grp1 = null, grp2 = null, nonDiagGrp1 = null;
    var isDiagCon = false;
    var numEnemies = 0;
    for (var n = 0; n < 8; n++) {
        var s = stone.allNeighbors[n];
        diag = !diag;
        if (s === BORDER) continue;
        switch (s.color) {
        case EMPTY: continue;
        case color:
            if (!grp1) {
                grp1 = s.group;
                if (!diag) nonDiagGrp1 = s.group;
                isDiagCon = diag;
            } else {
                if (s.group === grp1) continue; // ignore if other stone of same group
                if (!diag && nonDiagGrp1 && s.group !== nonDiagGrp1) return 0; // decline direct connections
                if (!diag && !nonDiagGrp1) nonDiagGrp1 = s.group;
                grp2 = s.group;
                isDiagCon = isDiagCon || diag;
            }
            break;
        default: numEnemies++;
        }
    }
    if (!grp2) return 0;
    if (!isDiagCon)
        return 0;
    if (numEnemies >= 3)
        return 0; //TODO improve this
    return this._computeScore(stone, color, [grp1, grp2]/*REVIEW THIS*/, numEnemies, 'diagonal');
};

Connector.prototype._directConnect = function (stone, color) {
    var s1, s1b, s2, s2b, s3;
    var numStones = 0, numEnemies = 0;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY: continue;
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
    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3 && numEnemies === 0 &&
        s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) {
        return 0;
    }

    var numGroups = s3 ? 3 : 2;
    var groups = s3 ? [s1.group, s2.group, s3.group] : [s1.group, s2.group];
    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this.distanceBetweenStones(s1, s2, color) === 0) {
            if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' sees no hurry to connect ' + s1 + ' and ' + s2);
            if (groupNeedsToConnect(s1.group) || groupNeedsToConnect(s2.group))
                return this.minimumScore;
            return 0;
        }
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    return this._computeScore(stone, color, groups, numEnemies, 'direct');
};

Connector.prototype._computeScore = function (stone, color, groups, numEnemies, desc) {
    var score = 0;
    if (numEnemies === 0) {
        score = this.inflCoeff / this.infl[stone.j][stone.i][color];
    } else {
        var someAlive = false, g;
        for (var n = groups.length - 1; n >= 0; n--) {
            g = groups[n];
            // lives 1 or 2 are counted by Hunter/Savior; TODO: centralize how this is counted
            if (g.lives <= 2 && g.xAlive < ALWAYS) return 0;
            if (g.xDead < ALWAYS || g.xAlive > NEVER) {
                someAlive = true;
                break;
            }
        }
        if (!someAlive) return 0; // don't try to connect dead groups

        for (n = groups.length - 1; n >= 0; n--) {
            g = groups[n];
            if (g.xDead === NEVER) continue;
            score += (2 - g.xAlive) / 2 * this.groupThreat(g, /*saved=*/true); // !saved would not work so well I think
        }
        score *= this.riskCoeff;
    }
    if (main.debug) main.log.debug('Connector ' + desc + ' for ' + Grid.colorName(color) + ' gives ' +
        score.toFixed(3) + ' to ' + stone + ' (allies:' + groups.length + ' enemies: ' + numEnemies + ')');
    return score;
};

Connector.prototype._connectsMyGroups = function (stone, color) {
    var score = this._directConnect(stone, color);
    if (score) return score;
    return this._diagonalConnect(stone, color);
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],42:[function(require,module,exports){
'use strict';

var BoardAnalyser = require('./boan/BoardAnalyser');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function GroupAnalyser(player) {
    Heuristic.call(this, player);

    this.boan = new BoardAnalyser();

    // Share the info with others at player level - TODO: find better place
    player.boan = this.boan;
}
inherits(GroupAnalyser, Heuristic);
module.exports = GroupAnalyser;


GroupAnalyser.prototype.evalBoard = function () {
    this._initGroupState();
    // get "raw" group info
    var goban = this.goban;
    this.boan.analyse(goban, goban.scoringGrid.initFromGoban(goban));
};

GroupAnalyser.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();
    for (var ndx in this.allGroups) {
        var g = this.allGroups[~~ndx];
        g.xInRaceWith = null;
    }
};

},{"./Heuristic":43,"./boan/BoardAnalyser":53,"util":6}],43:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

var GRID_BORDER = main.GRID_BORDER;
var BLACK = main.BLACK, WHITE = main.WHITE, EMPTY = main.EMPTY, BORDER = main.BORDER;
var sOK = main.sOK, sDEBUG = main.sDEBUG;
var ALWAYS = main.ALWAYS, NEVER = main.NEVER;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = main.DIR0, DIR3 = main.DIR3;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player) {
    this.player = player;
    this.name = this.constructor.name || main.funcName(this.constructor);
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.infl = player.infl;
    this.pot = player.pot;
    this.boan = player.boan;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);
    this.minimumScore = player.minimumScore;

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);

    this.color = this.enemyColor = null;
}
module.exports = Heuristic;


Heuristic.prototype.initColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
};

// For heuristics which do not handle evalBoard (but _evalMove)
// NB: _evalMove is "private": only called from here (base class), and from inside a heuristic
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true;

            var score = myScoreYx[j][i] = this._evalMove(i, j, color);
            scoreYx[j][i] += score;

            if (state === sDEBUG) main.debug = false;
        }
    }
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

Heuristic.prototype.territoryScore = function (i, j, color) {
    return this.pot.territory.yx[j][i] * (color === main.BLACK ? 1 : -1);
};

/** @return {number} - NEVER, SOMETIMES, ALWAYS */
Heuristic.prototype.isOwned = function (i, j, color) {
    var myColor = color === main.BLACK ? -1 : +1;
    var score = NEVER;
    if (Grid.territory2owner[2 + this.pot.grids[BLACK].yx[j][i]] === myColor) score++;
    if (Grid.territory2owner[2 + this.pot.grids[WHITE].yx[j][i]] === myColor) score++;
    return score;
};

/** @return {color|null} - null if no chance to make an eye here */
Heuristic.prototype.eyePotential = function (i, j) {
    var infl = this.infl[j][i];
    var color = infl[BLACK] > infl[WHITE] ? BLACK : WHITE;
    var allyInf = infl[color], enemyInf = infl[1 - color];

    if (enemyInf > 1) return null; // enemy stone closer than 2 vertexes
    var cornerPoints = 0, gsize = this.gsize;
    if (i === 1 || i === gsize || j === 1 || j === gsize) cornerPoints++;
    if (allyInf + cornerPoints - 3 - enemyInf < 0) return null;
    return color;
};

//TODO review this - why 1-color and not both grids?
Heuristic.prototype.enemyTerritoryScore = function (i, j, color) {
    var score = Grid.territory2owner[2 + this.pot.grids[1 - color].yx[j][i]];
    return score * (color === main.BLACK ? 1 : -1);
};

/** Pass saved as true if g is an ally group (we evaluate how much we save) */
Heuristic.prototype.groupThreat = function (g, saved) {
    var threat = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners

    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties();
    }
    threat += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot

    if (saved) return threat;
    return threat + this._countSavedAllies(g);
};

// Count indirectly saved groups
Heuristic.prototype._countSavedAllies = function (killedEnemyGroup) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemyGroup.stones.length === 1 &&
        killedEnemyGroup.stones[0].isCorner()) {
        return 0;
    }
    var saving = 0;
    var allies = killedEnemyGroup.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        if (allies[a].lives > 1) continue;
        saving += this.groupThreat(allies[a], /*saved=*/true);
    }
    return saving;
};

Heuristic.prototype._invasionCost = function (i, j, dir, color, level) {
    var s = this.goban.stoneAt(i, j);
    if (s === BORDER || s.color !== EMPTY) return 0;
    var cost = this.enemyTerritoryScore(i, j, color);
    if (s.isBorder()) cost /= 2;
    if (cost <= 0) return 0;
    if (--level === 0) return cost;

    var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
    var spread = XY_AROUND[(dir + 3) % 4];
    var vx = spread[0], vy = spread[1];

    cost += this._invasionCost(i + dx + vx, j + dy + vy, dir, color, level);
    cost += this._invasionCost(i + dx - vx, j + dy - vy, dir, color, level);
    return cost;
};

var INVASION_DEEPNESS = 1; // TODO: better algo for this

Heuristic.prototype.invasionCost = function (i, j, color) {
    var cost = Math.max(0, this.enemyTerritoryScore(i, j, color));
    for (var dir = DIR0; dir <= DIR3; dir++) {
        cost += this._invasionCost(i + XY_AROUND[dir][0], j + XY_AROUND[dir][1], dir, color, INVASION_DEEPNESS);
    }
    var s = this.goban.stoneAt(i, j);
    if (s.isCorner()) cost = Math.max(cost - 1, 0);
    else if (s.isBorder()) cost = Math.max(cost - 0.85, 0);
    return cost;
};

Heuristic.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.player.markMoveAsBlunder(i, j, this.name + ':' + reason);
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
        var diags = this.diagonalStones(s1, s2), c1 = diags[0], c2 = diags[1];
        if (c1.color === color || c2.color === color) return 0; // already connected
        if (c1.color === enemy) numEnemies++;
        if (c2.color === enemy) numEnemies++;
        if (numEnemies === 0) return 0; // safe hane
        if (numEnemies === 2) return 99; // cut!
        var connPoint = c1.color === enemy ? c2 : c1;
        if (s1.distanceFromBorder() === 0 || s2.distanceFromBorder() === 0) {
            if (connPoint.distanceFromBorder() === 1) return 1; // enemy cut-stone on border
            if (connPoint.allyStones(enemy) !== 0) return 1; // other enemy next to conn point
            return 0;
        } else if (connPoint.distanceFromBorder() === 1) {
            if (connPoint.allyStones(enemy) !== 0) return 1;
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
        if (s1.distanceFromBorder() + s2.distanceFromBorder() === 0) {
            return 0; // along border with 0 enemy around is safe
        }
        return 0.5; // REVIEW ME
    }
    var d1 = s1.distanceFromBorder(), d2 = s2.distanceFromBorder();
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
        if (n.color === color && n.group.xDead < ALWAYS) return n;
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
            if (en.group.xDead === ALWAYS) continue; // TODO: look better at group's health
            var dist = this.distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

/**
 * Checks if an escape along border can succeed.
 * group escapes toward i,j, the proposed 1st escape move
 * @return {Group|null|undefined} - group we connect to, null if fails, undefined if we cannot say
 */
Heuristic.prototype.canEscapeAlongBorder = function (group, i, j) {
    // decide direction
    var dx = 0, dy = 0, gsize = this.gsize;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else throw new Error('not along border');

    // get direction to second row (next to the border we run on)
    var secondRowDx = dy, secondRowDy = dx;
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy) === BORDER) {
        secondRowDx = -secondRowDx; secondRowDy = -secondRowDy;
    }
    // don't handle case of group running toward the border here
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy).group === group) {
        return undefined;
    }
    // check 1 stone to see if we should run the other way
    var color = group.color;
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s !== BORDER && s.group === group) {
        dx = -dx; dy = -dy;
    }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) {
            return null;
        }
        switch (s.color) {
        case color:
            if (s.group.lives > 2) return s.group;
            return null;
        case EMPTY:
            var secondRow = this.goban.stoneAt(i + secondRowDx, j + secondRowDy);
            if (secondRow.color === EMPTY) continue;
            if (secondRow.color === 1 - color) {
                return null;
            }
            if (secondRow.group.lives > 2) return secondRow.group;
            return null;
        default: //enemy
            return null;
        }
    }
};

},{"../../Grid":12,"../../Stone":18,"../../main":73}],44:[function(require,module,exports){
//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player) {
    Heuristic.call(this, player);

    this.pressureCoeff = this.getGene('pressure', 1, 0.01, 2);

    this.snapbacks = null;
    this.noEasyPrisonerYx = player.getHeuristic('NoEasyPrisoner').scoreGrid.yx;
}
inherits(Hunter, Heuristic);
module.exports = Hunter;


/** Returns true if group g could get at least minLives by killing one of the
 *  enemy groups around in atari
 */
Hunter.prototype._gotLivesFromKillingAround = function (g, minLives) {
    var enemies = g.allEnemies();
    for (var n = enemies.length - 1; n >= 0; n--) {
        var eg = enemies[n];
        if (eg.lives > 1) continue;
        // found 1 enemy group in atari; killing it would give us its size in new lives
        var addedLives = eg.stones.length;
        if (addedLives >= minLives) return true;
        // this is not enough, so count lives we would get by connecting with our groups around eg
        var allies = eg.allEnemies();
        for (var a = allies.length - 1; a >= 0; a--) {
            addedLives += allies[a].lives - 1;
            if (addedLives >= minLives) return true;
        }
    }
    return false;
};


var KO_KILL_SCORE = 1;
var RACE_KILL_SCORE = 1.1; // just need to be enough to let the move happen (score comes from pressure eval)

/** Returns a score to measure what kind of kill a move is.
 *  Any number < 1.01 is sign of a "not so good" kill.
 *  E.g. in this board, black c5 has a bad "kill score" of 1.0001
 *  5 O@+OO
 *  4 O@O@+
 *  3 OO@@+
 *  2 ++@++
 *  1 ++@++
 *    abcde
 *  NB: kill score of a KO is 1 (KO_KILL_SCORE)
 */
Hunter.prototype._killScore = function (empty, color) {
    var numAllies = 0, numKill = 0, life = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            life += 0.01;
            break;
        case color: // ally
            life += (n.group.lives - 1) * 0.01;
            if (n.group.xAlive === ALWAYS) life += 2;
            numAllies += 0.0001;
            break;
        default: // enemy
            if (n.group.xInRaceWith) return RACE_KILL_SCORE;
            if (n.group.lives > 1) break; // not a kill
            numKill += n.group.stones.length;
        }
    }
    return numKill + life + numAllies;
};

Hunter.prototype._countAtariThreat = function (enemies, level) {
    var atariThreat = 0, eg;
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 1) continue;
        // if we can take eg anytime later, no need to take it now
        //TODO also verify no group in "enemies" is strong
        if (!level && this._isAtariGroupCaught(eg, level) && !this._gotLivesFromKillingAround(eg, 1)) {
            continue;
        }
        atariThreat += this.groupThreat(eg);
    }
    return atariThreat;
};

Hunter.prototype._countPreAtariThreat = function (stone, enemies, empties, color, level, egroups) {
    var isSnapback = false, eg;
    var allies = stone.uniqueAllies(color);
    // now look for groups with 2 lives
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 2) continue;
        // no good if enemy can escape by killing one of our weak groups around
        if (this._gotLivesFromKillingAround(eg, 2)) continue; // >=2 because killing 1 stone is not enough to escape
        // same but for the group of our new stone; if should not become atari either
        if (empties.length === 0 && allies.length === 1 && allies[0].lives === 2) continue;
        
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
            isSnapback = true;
            if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + ' sees a snapback in ' + stone);
        }
        if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + '(level ' + level + ') looking at threat ' + stone + ' on ' + eg);
        egroups.push(eg);
    }
    return isSnapback;
};

// Presupposes that stone.isNextTo(enemy) is true
Hunter.prototype._isValidRaceMove = function (stone, enemy, ally) {
    if (!ally || enemy.lives !== ally.lives) return false;
    if (!ally.isValid()) return false;
    if (stone.isNextTo(ally) && ally.livesAddedByStone(stone) < 1) return false; // playing stone would not help us
    // TODO check all lives; if one of them is a better move than stone, then return false
    // var added = enemy.livesAddedByStone(stone);
    // var lives = enemy.allLives();
    // for (var n = lives.length - 1; n >= 0; n--) {
    //     if (enemy.livesAddedByStone(lives[n]) > added) return false;
    // }
    return true;
};

Hunter.prototype._countPressureAndRace = function (stone, enemies, level, isEasyPrisoner) {
    var threat = 0, raceThreat = 0;
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        var enemy = enemies[egNdx];
        var egl = enemy.lives, allyInRace = enemy.xInRaceWith;
        if (this._isValidRaceMove(stone, enemy, allyInRace)) {
            raceThreat += this.groupThreat(enemy, true);
            raceThreat += this.groupThreat(allyInRace, /*saved=*/true);
        } else if (egl >= 2 && level === 0 && !isEasyPrisoner) {
            threat += 1 / (egl + 1); // see TestAi#testSemiAndEndGame h1 & b8 for examples
        }
    }
    return threat * this.pressureCoeff + raceThreat;
};

Hunter.prototype._beforeEvalBoard = function () {
    this.snapbacks = [];
};

Hunter.prototype._evalMove = function (i, j, color, level) {
    level = level || 0;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var enemies = stone.uniqueAllies(1 - color);

    // count groups already in atari
    var threat1 = this._countAtariThreat(enemies, level);
    
    // now look for groups with 2 lives
    var egroups = [];
    var isSnapback = this._countPreAtariThreat(stone, enemies, empties, color, level, egroups);
    if (level === 0 && isSnapback) {
        this.snapbacks.push(stone); // for other heuristics to look at...
    }
    // unless snapback, make sure our new stone's group can survive
    if (!isSnapback && empties.length <= 1) {
        var killScore = this._killScore(stone, color); //TODO: make this easier!
        if (killScore !== KO_KILL_SCORE &&
            (killScore < 0.02 || (killScore > 1 && killScore < 1.01))) {
            return 0; // REVIEW ME: we ignore threat1 to penalize more snapback creation
        }
    }
    // count some profit in removing enemy lives
    var isEasyPrisoner = !isSnapback && this.noEasyPrisonerYx[j][i] < 0;
    threat1 += this._countPressureAndRace(stone, enemies, level, isEasyPrisoner);

    if (!egroups.length) return threat1;

    this.goban.tryAt(i, j, color); // our attack takes one of the 2 last lives (the one in i,j)

    // see attacks that fail
    var canEscape = [false, false, false];
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (this._isAtariGroupCaught(egroups[g], level)) continue;
        if (egroups.length === 1) { egroups.pop(); break; }
        canEscape[g] = true;
    }

    this.goban.untry(); // important to undo before, so we compute threat right

    var threat2 = this._getMultipleChaseThreat(egroups, canEscape);

    if (main.debug && (threat1 || threat2)) main.log.debug('Hunter ' + Grid.colorName(color) +
        ' found a threat of ' + threat1.toFixed(2) + ' + ' + threat2 + ' at ' + Grid.xy2move(i, j));
    return threat1 + threat2;
};

function basicSort(a, b) { return a - b; }

/** Returns the maximum threat we can hope for when several groups can be chased.
 *  Some of these chases might fail, but even so, the enemy can only defend one.
 *  Rule of thumb:
 *  - if 0 can escape => we capture the bigger one
 *  - if 1 or more can escape => we capture nothing if only 1, or the 2nd bigger if the 1st can escape
 */
Hunter.prototype._getMultipleChaseThreat = function (egroups, canEscape) {
    switch (egroups.length) {
    case 0: return 0;
    case 1: return canEscape[0] ? 0 : this.groupThreat(egroups[0]);
    case 2: 
        if (!canEscape[0] && !canEscape[1]) return Math.max(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        if ( canEscape[0] &&  canEscape[1]) return Math.min(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        return canEscape[0] ? this.groupThreat(egroups[1]) : this.groupThreat(egroups[0]);
    case 3:
        var threats = [this.groupThreat(egroups[0]), this.groupThreat(egroups[1]), this.groupThreat(egroups[2])];
        if (!canEscape[0] && !canEscape[1] && !canEscape[2]) return Math.max(threats[0], threats[1], threats[2]);
        var sortedThreats = threats.concat().sort(basicSort);
        var bigger = threats.indexOf(sortedThreats[0]);
        if (!canEscape[bigger]) return threats[bigger];
        var secondBigger = threats.indexOf(sortedThreats[1]);
        return threats[secondBigger];
    default: throw new Error('Unexpected in Hunter#getMultipleChaseThreat');
    }
};

/** Evaluates if group g in atari (1 last escape move) can escape */
Hunter.prototype._isAtariGroupCaught = function (g, level) {
    var allLives = g.allLives();
    if (allLives.length !== 1) throw new Error('Unexpected: hunter #1: ' + allLives.length);

    var lastLife = allLives[0];
    var stone = this.goban.tryAt(lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this._escapingAtariThreat(stone, level) > 0;
    this.goban.untry();
    if (main.debug) main.log.debug('Hunter: group with last life ' + lastLife + ' would ' + (isCaught ? 'be caught: ' : 'escape: ') + g);
    return isCaught;
};

/** Returns true if played stone has put a nearby enemy group in atari */
Hunter.prototype._isStoneCreatingAtari = function (stone) {
    var enemyColor = 1 - stone.color;
    var neighbors = stone.neighbors;
    for (var n = neighbors.length - 1; n >= 0; n--) {
        if (neighbors[n].color !== enemyColor) continue;
        if (neighbors[n].group.lives === 1) {
            return true;
        }
    }
    return false;
};

/** @param stone is the enemy group's escape move (just been played)
 *  @param [level] - just to keep track for logging purposes
 *  @return the best score possible by chasing stone's group (could be the killing of a bystander though)
 */
Hunter.prototype._escapingAtariThreat = function (stone, level) {
    var g = stone.group;
    if (g.lives <= 1) return this.groupThreat(g); // caught
    if (g.lives > 2) {
        return 0; //TODO look better
    }
    // g.lives is 2

    // if escape move just put one of our groups in atari the chase fails
    if (this._isStoneCreatingAtari(stone)) return 0;

    // get 2 possible escape moves
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) throw new Error('Unexpected: hunter #2');
    var e1 = empties[0];
    var e2 = empties[1];
    if (main.debug) main.log.debug('Hunter: group has 2 lives left: ' + e1 + ' and ' + e2);

    // try blocking the 2 moves (recursive descent)
    var color = 1 - g.color;
    level = (level || 0) + 1;
    return Math.max(this._evalMove(e1.i, e1.j, color, level), this._evalMove(e2.i, e2.j, color, level));
};

/** @param stone is the enemy group's escape move (just been played)
 *  @return true if the group gets captured
 */
Hunter.prototype.isEscapingAtariCaught = function (stone) {
    return this._escapingAtariThreat(stone, 1);
};

Hunter.prototype.catchThreat = function (i, j, color) {
    return this._evalMove(i, j, color, 1);
};

/** Called by other heuristics to know if a stone is a snapback for current move */
Hunter.prototype.isSnapback = function (stone) {
    return this.snapbacks.indexOf(stone) !== -1;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],45:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALWAYS = main.ALWAYS;


/** @class public read-only attribute: map
 */
function Influence(player) {
    Heuristic.call(this, player);

    this.deadFactor = this.getGene('deadFactor', 0.23, 0.01, 1);

    var size = this.gsize + 1;
    this.map = Array.new(size, function () {
        return Array.new(size, function () {
            return [0, 0];
        });
    });
    // Share the map with others at player level - TODO: find better place
    player.infl = this.map;
}
inherits(Influence, Heuristic);
module.exports = Influence;


Influence.prototype._clear = function () {
    for (var j = this.gsize; j >= 1; j--) {
        var mapj = this.map[j];
        for (var i = this.gsize; i >= 1; i--) {
            var mapji = mapj[i];
            mapji[BLACK] = mapji[WHITE] = 0;
        }
    }
};

Influence.prototype.evalBoard = function () {
    this._clear();
    var influence = [4, 2, 1];
    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color === EMPTY) continue;
            // a dying group must have a much small influence (but maybe not 0)
            var deadFactor = stone.group.xDead === ALWAYS ? this.deadFactor : 1;

            this.map[j][i][color] += influence[0] * deadFactor; // on the stone itself

            // Then we propagate it decreasingly with distance
            for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                if (n1.color !== EMPTY) continue;

                this.map[n1.j][n1.i][color] += influence[1] * deadFactor; // 2nd level

                for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                    if (n2.color !== EMPTY) continue;
                    if (n2 === stone) continue; // we are looking again at initial stone; skip it

                    this.map[n2.j][n2.i][color] += influence[2] * deadFactor; // 3rd level
                }
            }
        }
    }
    if (main.debug) this.debugDump();
};

Influence.prototype.debugDump = function () {
    var c;
    function inf2str(inf) {
        return ('     ' + inf[c].toFixed(2).chomp('0').chomp('0').chomp('.')).slice(-6);
    }

    for (c = BLACK; c <= WHITE; c++) {
        main.log.debug('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            main.log.debug('%2d'.format(j) + ' ' +
                this.map[j].slice(1, this.gsize + 1).map(inf2str).join('|'));
        }
        var cols = '   ';
        for (var i = 1; i <= this.gsize; i++) { cols += '     ' + Grid.xLabel(i) + ' '; }
        main.log.debug(cols);
    }
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],46:[function(require,module,exports){
//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype._beforeEvalBoard = function () {
    // We have to delay getting the hunter since it is created after us
    if (!this.hunter) this.hunter = this.player.getHeuristic('Hunter');
};

NoEasyPrisoner.prototype._evalMove = function (i, j, color) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).

    // Skip places where nothing happens around
    // NB: if dead allies (without influence), avoid adding more stones here
    if (this.infl[j][i][1 - color] < 2 && this.infl[j][i][color] < 2 &&
        this.goban.stoneAt(i, j).allyStones(color) === 0) return 0;

    var stone = this.goban.tryAt(i, j, color);
    var g = stone.group;
    var score = 0, move;
    if (main.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (main.debug) main.log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) main.log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],47:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var NEVER = main.NEVER;
var UP = main.UP, RIGHT = main.RIGHT, DOWN = main.DOWN, LEFT = main.LEFT;
var DIR0 = main.DIR0, DIR3 = main.DIR3;

var POT2CHAR = Grid.territory2char;
var POT2OWNER = Grid.territory2owner;

var XY_AROUND = Stone.XY_AROUND;
var XY_DIAGONAL = Stone.XY_DIAGONAL;


/** @class */
function PotentialTerritory(player) {
    Heuristic.call(this, player);

    this.realGrid = this.goban.scoringGrid; // we can reuse the already allocated grid
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];
    this.reducedGrid = new Grid(this.gsize, GRID_BORDER);
    this.territory = new Grid(this.gsize, GRID_BORDER); // result of evaluation
    this._computeBorderConnectConstants();

    // Share the info with others at player level - TODO: find better place
    player.pot = this;

    this.allGroups = null;
}
inherits(PotentialTerritory, Heuristic);
module.exports = PotentialTerritory;


PotentialTerritory.prototype.evalBoard = function () {
    this._guessTerritories();
};

// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype._guessTerritories = function () {
    this._initGroupState();
    // update real grid to current goban
    this.realGrid.initFromGoban(this.goban);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    this._foresee(BLACK);
    this._foresee(WHITE);
    this._mergeResults();
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

PotentialTerritory.prototype._foresee = function (color) {
    var moveCount = this.goban.moveNumber();

    // grid will receive the result (scoring grid)
    var grid = this.grids[color];
    this._connectThings(grid, color);
    this.player.boan.analyse(this.goban, grid.initFromGoban(this.goban), color);
    this._collectGroupState();

    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    while (moveCount-- > 0) this.goban.untry();
};

PotentialTerritory.prototype._mergeResults = function () {
    var blackYx = this.grids[BLACK].yx;
    var whiteYx = this.grids[WHITE].yx;
    var terrYx = this.territory.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            terrYx[j][i] = (POT2OWNER[2 + blackYx[j][i]] + POT2OWNER[2 + whiteYx[j][i]]) / 2;
        }
    }
    if (main.debug) main.log.debug('Guessing territory for:\n' + this.realGrid +
        '\nBLACK first:\n' + this.grids[BLACK] + 'WHITE first:\n' + this.grids[WHITE] + this);
};

PotentialTerritory.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();
    for (var ndx in this.allGroups) {
        var g = this.allGroups[~~ndx];
        g.xAlive = g.xDead = NEVER;
    }
};

PotentialTerritory.prototype._collectGroupState = function () {
    for (var ndx in this.allGroups) {
        var g0 = this.allGroups[ndx], gn = g0;
        // follow merge history to get final group g0 ended up into
        while (gn.mergedWith) gn = gn.mergedWith;
        // collect state of final group
        if (gn.killedBy || gn._info.isDead) {
            g0.xDead++;
        } else if (gn._info.isAlive) {
            g0.xAlive++;
        }
    }
};

PotentialTerritory.prototype._connectThings = function (grid, color) {
    this.reducedYx = null;
    // enlarging starts with real grid
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);

    if (main.debug) main.log.debug('after 1st enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);

    // for reducing we start from the enlarged grid
    this.reduce(this.reducedGrid.copy(grid));
    this.reducedYx = this.reducedGrid.yx;
    if (main.debug) main.log.debug('after reduce:\n' + this.reducedGrid);

    // now we have the reduced goban, play the enlarge moves again minus the extra
    this.enlarge(this.realGrid, grid.copy(this.realGrid), color);
    if (main.debug) main.log.debug('after 2nd enlarge (before connectToBorders):\n' + grid);
    this.connectToBorders(grid.yx);
    if (main.debug) main.log.debug('after connectToBorders:\n' + grid);
};

PotentialTerritory.prototype.enlarge = function (inGrid, outGrid, color) {
    if (main.debug) main.log.debug('---enlarge ' + Grid.colorName(color));
    var inYx = inGrid.yx, outYx = outGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        var inYxj = inYx[j];
        for (var i = this.gsize; i >= 1; i--) {
            if (inYxj[i] !== EMPTY) continue;
            this.enlargeAt(inYx, outYx, i, j, color, 1 - color);
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
        this.goban.tryAt(i, j, color);
    }
    yx[j][i] = color;
};

// Returns the number of times we find "color" in contact with i,j
PotentialTerritory.prototype.inContact = function (yx, i, j, color) {
    var num = 0;
    for (var dir = DIR0; dir <= DIR3; dir++) {
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
    for (var v = DIR0; v <= DIR3; v++) {
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

// Done only once
PotentialTerritory.prototype._computeBorderConnectConstants = function () {
    var points = [];
    for (var dir = DIR0; dir <= DIR3; dir++) {
        var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
        for (var n = this.gsize - 1; n >= 2; n--) {
            var p = borderPos(dir, n, this.gsize);
            points.push([p[0], p[1], dx, dy]);
        }
    }
    this.borderPoints = points;
};

/** Makes "obvious" connections to border. Note we must avoid splitting eyes.
 Example for left border: (direction = RIGHT)
 G=GOAL, S=SPOT, L=LEFT, R=RIGHT (left & right could be switched, it does not matter)
 LL0
 L0 L1 L2
 G  S1 S2 S3
 R0 R1 R2
 RR0
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
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 === EMPTY && r0 === EMPTY && l1 === color && r1 === color) continue;
            var ll0 = yx[gj-2*dx][gi-2*dy], rr0 = yx[gj+2*dx][gi+2*dy];
            if (ll0 === color || rr0 === color) continue;
            this.addStone(yx, gi, gj, color, true);
            continue;
        }
        var s2i = s1i + dx, s2j = s1j + dy;
        color = yx[s2j][s2i];
        if (color !== EMPTY) {
            l0 = yx[gj-dx][gi-dy]; r0 = yx[gj+dx][gi+dy];
            l1 = yx[s1j-dx][s1i-dy]; r1 = yx[s1j+dx][s1i+dy];
            if (l0 !== 1 - color && l1 === color) continue;
            if (r0 !== 1 - color && r1 === color) continue;
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

},{"../../Grid":12,"../../Stone":18,"../../main":73,"./Heuristic":43,"util":6}],48:[function(require,module,exports){
//Translated from pusher.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class
 *  Way of "pushing" our influence further...
 *  Still very naive; for that reason the coeff are rather low.
 */
function Pusher(player) {
    Heuristic.call(this, player);

    this.allyCoeff = this.getGene('allyInfl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemyInfl', 0.13, 0.01, 1.0);

    this.noEasyPrisonerYx = player.getHeuristic('NoEasyPrisoner').scoreGrid.yx;
}
inherits(Pusher, Heuristic);
module.exports = Pusher;


Pusher.prototype._evalMove = function (i, j, color) {
    var inf = this.infl[j][i];
    var enemyInf = inf[this.enemyColor];
    var allyInf = inf[color];
    if (enemyInf === 0 || allyInf === 0) {
        return 0;
    }
    if (this.noEasyPrisonerYx[j][i] < 0) {
        return 0;
    }
    // Only push where we can connect to
    if (!this.canConnect(i, j, color)) return 0;
    // Stones that would "fill a blank" are not for Pusher to evaluate
    if (this.goban.stoneAt(i, j).numEmpties() === 0) return 0;

    var invasion = this.invasionCost(i, j, color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    if (main.debug) main.log.debug('Pusher heuristic sees invasion:' + invasion +
        ', influences:' + allyInf + ' - ' + enemyInf + ' at ' + Grid.xy2move(i, j) +
        ' -> ' + '%.03f'.format(score));
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],49:[function(require,module,exports){
//Translated from savior.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var sOK = main.sOK, sDEBUG = main.sDEBUG, ALWAYS = main.ALWAYS;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);

    this.hunter = player.getHeuristic('Hunter');
}
inherits(Savior, Heuristic);
module.exports = Savior;


Savior.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true;

            var stone = this.goban.stoneAt(i, j);
            var threat = this._evalEscape(i, j, stone);
            if (threat === 0) continue;
            if (main.debug) main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + stone);
            var score = myScoreYx[j][i] = threat;
            scoreYx[j][i] += score;
        }
    }
};

// i,j / stone is the stone we are proposing to play to help one of nearby groups to escape
Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var savedThreat = 0, groups = [], livesAdded = 0;
    var hunterThreat = null; // we only get once the eval from hunter in i,j
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            if (hunterThreat === 0) continue;
            groups.push(g);
            if (hunterThreat !== null) continue;
            savedThreat += this.groupThreat(g, true);
        } else if (g.lives === 2) {
            if (hunterThreat === 0) continue;
            groups.push(g);
            if (hunterThreat !== null) continue;
            // Not really intuitive: we check if enemy could chase us starting in i,j
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' +
                stone + ' pre-atari on ' + g);
            hunterThreat = this.hunter.catchThreat(i, j, this.enemyColor);
            if (hunterThreat) savedThreat = hunterThreat; // hunter computes total threat in i,j
        } else if (g.xDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (savedThreat === 0) return 0; // no threat

    livesAdded += stone.numEmpties();
    if (livesAdded > 2) return savedThreat; // we can save the threat
    if (livesAdded === 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (var n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    if (livesAdded === 2) {
        // we get 2 lives from the new stone - first check special case of border
        if (groups.length === 1 && stone.isBorder()) {
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' checks an escape along border in ' + Grid.xy2move(i, j));
            var savior = this.canEscapeAlongBorder(groups[0], i, j);
            if (savior !== undefined) return savior ? savedThreat : 0;
        }
        // get our hunter to evaluate if we can escape
        if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' + Grid.xy2move(i, j) + ': threat=' + savedThreat + ', lives_added=' + livesAdded);
        this.goban.tryAt(i, j, this.color);
        var isCaught = this.hunter.isEscapingAtariCaught(stone);
        this.goban.untry();
        if (!isCaught) {
            return savedThreat;
        }
    }
    if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' giving up on threat of ' + savedThreat + ' in ' + Grid.xy2move(i, j));
    return 0; // nothing we can do to help
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],50:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY, sOK = main.sOK;
var SOMETIMES = main.SOMETIMES, ALWAYS = main.ALWAYS;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);

    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);

    this.potEyeGrid = new Grid(this.gsize, GRID_BORDER);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    this._findPotentialEyes(stateYx);

    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    var allGroups = this.pot.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[~~ndx];
        if (g.xDead === ALWAYS || g.xAlive === ALWAYS) continue;

        this._evalSingleEyeSplit(scoreYx, g);
    }
};

Shaper.prototype._findPotentialEyes = function (stateYx) {
    this.potEyeGrid.init(EMPTY);
    var potEyeYx = this.potEyeGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var state = stateYx[j][i];
            if (state < sOK) continue;

            var color = this.eyePotential(i, j);
            if (color === null) continue;

            var stone = this.goban.stoneAt(i, j), neighbors = stone.neighbors;
            var closeToAnotherEye = false, ally = null;
            for (var n = neighbors.length - 1; n >= 0; n--) {
                var s = neighbors[n];
                if (potEyeYx[s.j][s.i] === color) {
                    closeToAnotherEye = true;
                    break;
                }
                if (s.color === color) ally = s.group;
            }
            if (closeToAnotherEye || !ally) continue;

            potEyeYx[j][i] = color;
            ally._info.addPotentialEye(stone);
        }
    }
};

Shaper.prototype._evalSingleEyeSplit = function (scoreYx, g) {
    var coords = [];
    var alive = g._info.getEyeMakerMove(coords);
    if (alive !== SOMETIMES) return;
    var i = coords[0], j = coords[1];
    var score = this.groupThreat(g, this.color === g.color);
    var potEyeCount = g._info.countPotentialEyes();
    score = score / Math.max(1, potEyeCount - 1);
    this.scoreGrid.yx[j][i] += score;
    scoreYx[j][i] += score;
    if (main.debug) main.log.debug('Shaper ' + Grid.colorName(this.color) + ' sees single eye split at ' +
        i + ',' + j + ' score: ' + score);
};

Shaper.prototype._evalMove = function (i, j, color) {
    return this.eyeCloserCoeff * (this._eyeCloser(i, j, color) + this._eyeCloser(i, j, 1 - color));
};

Shaper.prototype._eyeCloser = function (i, j, color) {
    var stone = this.goban.stoneAt(i, j);
    if (this.isOwned(i, j, color) !== SOMETIMES) return 0;

    var potEye = null, eyeThreatened = false, allyNeedsEye = false;
    var g = null, threat = 0;
    var potEyeYx = this.potEyeGrid.yx;

    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY:
            if (potEyeYx[s.j][s.i] === color) potEye = s;
            break;
        case color:
            if (s.group.xAlive !== SOMETIMES) continue;
            allyNeedsEye = true;
            if (g !== null) threat += this.groupThreat(g, /*saved=*/true); //TODO review this approximation
            g = s.group;
            break;
        default: // enemy
            // NB: dead enemies have less influence so we sometimes can see more than 1 around
            if (s.group.xDead === ALWAYS) continue;
            eyeThreatened = true;
            break;
        }
    }
    if (potEye && eyeThreatened && allyNeedsEye) {
        threat += this.groupThreat(g, /*saved=*/true);
        var potEyeCount = g._info.countPotentialEyes();
        if (main.debug) main.log.debug('Shaper ' + Grid.colorName(color) + ' sees potential threat ' +
            threat + ' on eye ' + potEye + ' with ' + potEyeCount + ' potential eyes');
        return threat / Math.max(1, potEyeCount - 1);
    }
    return 0;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":43,"util":6}],51:[function(require,module,exports){
//Translated from spacer.rb using babyruby2js
'use strict';

var main = require('../../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Tries to occupy empty space + counts when filling up territory */
function Spacer(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 1, 0.5, 3);
    this.borderCoeff = this.getGene('border', 10, 0, 20);
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype._evalMove = function (i, j) {
    var enemyInf = 0, allyInf = 0;
    var stone = this.goban.stoneAt(i, j);
    var inf = this.infl[j][i];
    enemyInf += inf[this.enemyColor];
    allyInf += inf[this.color];
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        if (s.color !== main.EMPTY) return 0;
        inf = this.infl[s.j][s.i];
        enemyInf += inf[this.enemyColor];
        allyInf += inf[this.color];
    }
    var totalInf = 1 + this.inflCoeff * Math.max(enemyInf + allyInf - 3, 0) * (this.gsize / 9);

    var dbX = this.distanceFromBorder(i);
    var dbY = this.distanceFromBorder(j);
    var rowCoeff = [0, 0.2, 0.8, 1, 0.95, 0.8];
    var border = rowCoeff.length - 1;
    if (dbX > border) dbX = border;
    if (dbY > border) dbY = border;
    var db = rowCoeff[dbX] * rowCoeff[dbY] * this.borderCoeff;
    
    // remove points only if we fill up our own territory
    var fillTer = this.territoryScore(i, j, this.color);
    if (fillTer > 0) fillTer = 0; // Pusher will count >0 scores

    return fillTer + db / totalInf;
};

Spacer.prototype.distanceFromBorder = function (n) {
    return Math.min(n - 1, this.gsize - n);
};

},{"../../main":73,"./Heuristic":43,"util":6}],52:[function(require,module,exports){
'use strict';

var main = require('../../../main');


/** @class One list of "brother" groups = groups which share eyes.
 *  @param {GroupInfo} gi0 - first group in band */
function Band(gi0) {
    this.bandId = gi0.group.ndx; // unique enough
    this.brothers = [gi0]; // array of GroupInfo
    gi0.band = this;
    gi0.dependsOn.clear(); // does not depend on parents anymore
}
module.exports = Band;


function giNdx(gi) { return '#' + gi.group.ndx; }

Band.prototype.toString = function () {
    return this.brothers.map(giNdx);
};

Band.prototype._add1 = function (gi) {
    gi.dependsOn.clear(); // does not depend on parents anymore

    if (!gi.band) {
        if (main.debug) main.log.debug('BROTHERS: ' + gi + ' joins band: ' + this.toString());
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    if (main.debug) main.log.debug('BROTHERS: band merge: ' + gi.band.toString() + ' merge with ' + this.toString());
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
    if (main.debug) main.log.debug('un-BROTHERS: ' + gi + ' left band: ' + this.toString());
};

// groups contains the groups in the band
Band.gather = function (groups) {
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

},{"../../../main":73}],53:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser() {
    this.version = 'droopy';
    this.mode = null;
    this.goban = null;
    this.analyseGrid = null;
    this.allVoids = [];
    this.allGroups = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = goban.countPrisoners();
    var grid = goban.scoringGrid.initFromGoban(goban);

    if (!this._initAnalysis('SCORE', goban, grid)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(grid.toText());
};

BoardAnalyser.prototype.getScoringGrid = function () {
    return this.goban.scoringGrid;
};

BoardAnalyser.prototype.analyse = function (goban, grid, first2play) {
    var mode = first2play === undefined ? 'MOVE' : 'TERRITORY';
    if (!this._initAnalysis(mode, goban, grid)) return;
    this._runAnalysis(first2play);
    if (mode === 'TERRITORY') this._finalColoring();
};

BoardAnalyser.prototype.image = function () {
    return this.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' + this.analyseGrid.toText() + 'Voids:\n';
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        res += v.toString() + '\n';
    }
    res += 'Groups:\n';
    for (var ndx in this.allGroups) {
        res += this.allGroups[~~ndx].toString() + '\n';
    }
    if (this.scores) {
        res += 'Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        });
    }
    return res;
};

BoardAnalyser.prototype._initAnalysis = function (mode, goban, grid) {
    this.mode = mode;
    this.goban = goban;
    this.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroups[g.ndx];
    if (!gi) {
        if (!g._info || g._info.boan !== this) {
            g._info = new GroupInfo(g, this);
        } else {
            g._info.resetAnalysis(g);
        }
        gi = this.allGroups[g.ndx] = g._info;
    }
    gi.nearVoids.push(v);
};

/** Create the list of voids and groups.
 * Voids know which groups are around them, but groups do not own any void yet.
 */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []], n, groups;
    var v = new Void(voidCode++);
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, v, neighbors);
            if (vcount === 0) continue;

            // 1 new void created
            v.init(i, j, vcount, neighbors);
            this.allVoids.push(v);

            // keep all the groups
            groups = neighbors[BLACK];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);
            groups = neighbors[WHITE];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);

            neighbors = [[], []];
            v = new Void(voidCode++);
        }
    }
};

BoardAnalyser.prototype._runAnalysis = function (first2play) {
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();
    this._lifeOrDeathLoop(first2play);
    this._findDameVoids();
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroups) {
        this.allGroups[~~ndx].findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    for (var n = this.allVoids.length - 1; n >= 0; n--) {
        this.allVoids[n].findOwner();
    }
};

function normalizeLiveliness(life) {
    // Remove 1 if we have only 1 eye - a single-eye group is not more "resistant"
    if (life > 1 && life < 2) {
        return life - 1;
    }
    return life;
}

function compareLiveliness(life) {
    // make sure we have a winner, not a tie
    if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
        return undefined;
    }
    life[BLACK] = normalizeLiveliness(life[BLACK]);
    life[WHITE] = normalizeLiveliness(life[WHITE]);
    return life[BLACK] > life[WHITE] ? BLACK : WHITE;
}

BoardAnalyser.prototype._findBattleWinners = function () {
    var life = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.color !== undefined) continue;
            life[BLACK] = life[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                // NB: we don't check for brothers' liveliness counted twice.
                // No issue noticed so far - see testUnconnectedBrothers / b4
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness() + gi.group.lives / 10000; // is gi.group.lives still necessary?
                }
            }
            var winner = compareLiveliness(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED VOID in dispute: ' + v + ' with ' + life[0]);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED VOID: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(4) + ' VS ' + life[1 - winner].toFixed(4));
            v.setVoidOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

// Review which groups are dead after a "liveliness" check
function killWeakest(check, fails) {
    // For all groups that failed the test, filter out these that have a weaker neighbor
    for (var i = 0; i < fails.length; i++) {
        var fail = fails[i];
        var enemies = fail.group.allEnemies();
        for (var e = 0; e < enemies.length; e++) {
            var enemy = enemies[e]._info;
            var cmp = fail._liveliness - enemy.liveliness();
            if (main.debug) main.log.debug('FAIL: group #' + fail.group.ndx + ' with ' +
                fail._liveliness + ' against ' + (fail._liveliness - cmp) + ' for enemy group #' + enemy.group.ndx);
            if (cmp > 0) {
                if (main.debug) main.log.debug(check.name + ' would fail ' + fail +
                    ' BUT keept alive since it is stronger than ' + enemy);
                fails[i] = null;
                break;
            } else if (cmp === 0) {
                if (main.debug) main.log.debug('RACE between ' + fail.group + ' and ' + enemy.group);
                fail.group.xInRaceWith = enemy.group;
                enemy.group.xInRaceWith = fail.group;
                fails[i] = null;
                break;
            }
        }
    }
    var count = 0;
    for (i = 0; i < fails.length; i++) {
        if (!fails[i]) continue;
        fails[i].considerDead(check.name + ': liveliness=' + fails[i]._liveliness.toFixed(4));
        count++;
    }
    return count;
}

function killAllFails(check, fails) {
    for (var i = 0; i < fails.length; i++) {
        fails[i].considerDead(check.name);
    }
    return fails.length;
}

var parentCheck =      { name: 'parents',     run: function (gi) { return gi.checkParents(); } };
var brotherCheck =     { name: 'brothers',    run: function (gi) { return gi.checkBrothers(); } };
var singleEyeCheck = {
    name: 'singleEye',   
    run: function (gi, first) { return gi.checkSingleEye(first); },
    kill: killWeakest
};
var finalCheck = { name: 'final', run: function (gi) { return gi.checkLiveliness(2); } };

var midGameLifeChecks = [
    parentCheck,
    brotherCheck,
    singleEyeCheck
    // We don't expect a final liveliness (2) in mid-game
];
var scoringLifeChecks = [
    parentCheck,
    brotherCheck,
    singleEyeCheck,
    finalCheck
];

// NB: order of group should not matter; we must remember this especially when killing some of them
BoardAnalyser.prototype._reviewGroups = function (check, first2play) {
    if (main.debug) main.log.debug('---REVIEWING groups for "' + check.name + '" checks');
    var count = 0, reviewedCount = 0, fails = [];
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[~~ndx];
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;

        switch (check.run(gi, first2play)) {
        case FAILS:
            fails.push(gi);
            break;
        case LIVES:
            count++;
            break;
        }
    }
    if (fails.length) {
        // if no dedicated method is given, simply kill them all
        count += check.kill ? check.kill(check, fails) : killAllFails(check, fails);
    }
    if (main.debug && count) main.log.debug('==> "' + check.name + '" checks found ' +
        count + '/' + reviewedCount + ' groups alive/dead');
    if (count === reviewedCount) return 0; // really finished
    if (count === 0) return reviewedCount; // remaining count
    return -count; // processed count
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first2play) {
    var checks = this.mode === 'SCORE' ? scoringLifeChecks : midGameLifeChecks;
    var stepNum = 0, count;
    while (stepNum < checks.length) {
        count = this._reviewGroups(checks[stepNum++], first2play);
        if (count === 0) {
            this._findEyeOwners();
            return;
        }
        if (count < 0) {
            // we found dead/alive groups => rerun all the checks from start
            stepNum = 0;
            this._findEyeOwners();
            continue;
        }
    }
    if (main.debug && count > 0) main.log.debug('*** UNDECIDED groups after _lifeOrDeathLoop:' + count);
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (g._info.liveliness() >= 2) {
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

BoardAnalyser.prototype._finalColoring = function () {
    this._colorDeadGroups();
    this._colorVoids();
};

BoardAnalyser.prototype._colorDeadGroups = function () {
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[~~ndx];
        if (!gi.isDead) continue;

        // At least 1 enemy around must be alive 
        var reallyDead = false;
        for (var n = gi.killers.length - 1; n >= 0; n--) {
            if (!gi.killers[n]._info.isDead) reallyDead = true;
        }
        var color = gi.group.color;
        if (gi.killers.length && !reallyDead) {
            for (var i = gi.nearVoids.length - 1; i >= 0; i--) {
                gi.nearVoids[i].setVoidOwner(color);
            }
            continue;
        }

        var stone = gi.group.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype._colorVoids = function () {
    var color;
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        var score = v.finalScore();
        if (score) {
            this.scores[v.color] += score;
            color = Grid.TERRITORY_COLOR + v.color;
        } else {
            color = Grid.DAME_COLOR;
        }
        this.filler.fillWithColor(v.i, v.j, v, color);
    }
};

},{"../../../Grid":12,"../../../main":73,"./GroupInfo":54,"./Void":55,"./ZoneFiller":56}],54:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Band = require('./Band');

var EMPTY = main.EMPTY;
var NEVER = main.NEVER, SOMETIMES = main.SOMETIMES, ALWAYS = main.ALWAYS;


/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group, boan) {
    this.boan = boan;
    this.voids = []; // voids owned by the group
    this.nearVoids = []; // voids around, owned or not
    this.dependsOn = [];
    this.deadEnemies = [];
    this.killers = [];
    this.potentialEyes = [];

    this.resetAnalysis(group);
}
module.exports = GroupInfo;

// Result of a check on a group:
var FAILS = GroupInfo.FAILS = -1;
var LIVES = GroupInfo.LIVES = +1;
var UNDECIDED = GroupInfo.UNDECIDED = 0;

var ALIVE = GroupInfo.ALIVE = 1000; // any big enough liveliness to mean "alive for good"


// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function (group) {
    this.group = group;
    this.eyeCount = this._liveliness = 0;
    this.voids.clear();
    this.nearVoids.clear();
    this.dependsOn.clear();
    this.band = null;
    this.isAlive = this.isDead = false;
    this.deadEnemies.clear();
    this.killers.clear();
    this.potentialEyes.clear();
    this.numContactPoints = 0;
};

// For debug only
function when2str(when) {
    return when > NEVER ? (when > SOMETIMES ? 'ALWAYS' : 'SOMETIMES') : 'NEVER';
}

GroupInfo.giNdx = function (gi) { return '#' + gi.group.ndx; };

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ', ' +
        this.voids.length + ' voids  brothers:[' +
        brothers + '] parents:[' + this.dependsOn.map(GroupInfo.giNdx) +
        '] deadEnemies:[' + this.deadEnemies.map(GroupInfo.giNdx) + '])';
};

/** Adds a void to an owner-group + makes groups sharing the void brothers.
 * @param {Void} v
 * @param {Array} [groups] - array of co-owner groups (they become brothers)
 * @return {GroupInfo} - "this"
 */
GroupInfo.prototype.addVoid = function (v, groups) {
    if (main.debug) main.log.debug('OWNED: ' + v + ' owned by ' + this);
    this.voids.push(v);
    this.eyeCount++;

    // an eye between several groups makes them brothers
    if (groups && groups.length > 1) Band.gather(groups);
    return this;
};

/** Removes a void from an owner-group */
GroupInfo.prototype.removeVoid = function (v) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) throw new Error('remove unknown void');
    if (main.debug) main.log.debug('LOST: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    this.eyeCount--;
};

GroupInfo.prototype.makeDependOn = function (groups) {
    var band = this.band;
    if (band) band.remove(this);
    
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) >= 0) continue; // already depending on this one

        if (main.debug) main.log.debug('DEPENDS: ' + this + ' depends on ' + gi);
        this.dependsOn.push(gi);
    }
};

// NB: if we had another way to get the numContactPoints info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group, color = g.color;
    // find allies 1 stone away
    var allAllies = [];
    var empties = g.allLives();
    var numContactPoints = 0;
    for (var e = empties.length - 1; e >= 0; e--) {
        var neighbors = empties[e].neighbors, isContact = false;
        for (var n = neighbors.length - 1; n >= 0; n--) {
            var s = neighbors[n];
            if (s.color !== color || s.group === g) continue;
            isContact = true;
            if (allAllies.indexOf(s.group) < 0) allAllies.push(s.group);
        }
        if (isContact) numContactPoints++;
    }
    if (!numContactPoints) return;
    this.numContactPoints = numContactPoints;
    allAllies.push(g);
    Band.gather(allAllies);
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
 *  If >2 this should mean "alive for good" */
GroupInfo.prototype.liveliness = function (strict, shallow) {
    if (this.isAlive || this.eyeCount >= 2) {
        return ALIVE;
    }

    var n, racePoints = 0, color = this.group.color, lives = this.group.lives;
    for (var i = this.nearVoids.length - 1; i >= 0; i--) {
        var v = this.nearVoids[i];
        var points = Math.min(lives, v.vcount);
        if (v.owner) {
            if (v.owner === this) racePoints += points;
        } else {
            var allies = v.groups[color]; // NB: we don't care about enemies
            if (allies.length === 1) {
                racePoints += points;
            } else {
                var myNdx = this.group.ndx, minNdx = myNdx;
                for (n = allies.length - 1; n >= 0; n--) {
                    minNdx = Math.min(allies[n].ndx, minNdx);
                }
                if (myNdx === minNdx) racePoints += points;
            }
        }
    }
    racePoints /= 100;

    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow) {
        for (n = this.dependsOn.length - 1; n >= 0; n--) {
            familyPoints += this.dependsOn[n].liveliness(strict, true);
        }
        if (this.band) {
            var brothers = this.band.brothers;
            for (n = brothers.length - 1; n >= 0; n--) {
                if (brothers[n] === this) continue;
                familyPoints += brothers[n].liveliness(strict, true);
            }
        }
    }
    //TODO: get rid of this "strict" idea
    var numDeadEnemies = strict ? this.countEyesFromDeadEnemy() : this.deadEnemies.length;
    return this.eyeCount + numDeadEnemies + familyPoints + racePoints;
};

// Finds next recommended move to make 2 eyes
// Returns:
//   NEVER => cannot make 2 eyes
//   SOMETIMES => can make 2 eyes if we play now (coords will receive [i,j])
//   ALWAYS => can make 2 eyes even if opponent plays first
GroupInfo.prototype.getEyeMakerMove = function (coords) {
    // TODO: if depending group is on a side of eye, 1 vertex will be lost
    if (this.eyeCount > 1) return ALWAYS;
    if (this.eyeCount === 0) return NEVER;
    if (this.voids[0].vcount > 6) return ALWAYS;
    if (main.debug) main.log.debug('getEyeMakerMove checking ' + this);

    var g = this.group, color = g.color;
    var analyseYx = this.boan.analyseGrid.yx;
    var best = null, bestLives = 0, bestEnemies = 0, numMoves = 0;
    var empties = g.allLives(), numEmpties0 = empties.length;

    for (var n = 0; n < empties.length; n++) {
        var s = empties[n];
        var v = analyseYx[s.j][s.i];
        if (!v.owner || v.color !== color) continue;

        var numEnemies = 0, numAllies = 0, numLives = 0;
        for (var m = s.neighbors.length - 1; m >= 0; m--) {
            var s2 = s.neighbors[m];
            switch (s2.color) {
            case EMPTY:
                if (n < numEmpties0 && !s2.isNextTo(g) && empties.indexOf(s2) < 0)
                    empties.push(s2); // add s2 to our list of empties to check
                numLives++;
                break;
            case color: numAllies++; break;
            default:
                if (s2.group.lives > 1) numEnemies++;
                else numLives++;
            }
        }
        if (numEnemies) {
            if (numLives + (numAllies ? 1 : 0) < 2) continue;
        } else {
            if (numLives < 2) continue;
        }
        if (main.debug) main.log.debug('getEyeMakerMove sees ' + numLives + (numEnemies < 1 ? '' : (numEnemies > 1 ? 'e' + numEnemies : 'E')) + ' in ' + s);
        // skip corner if we have better
        if (s.isCorner() && numMoves) continue;

        numMoves++; // we must count only the successful moves
        if (best) {
            if (numEnemies <= bestEnemies) continue;
            if (numLives + numEnemies < bestLives) continue;
            if (best.isCorner()) numMoves--;
        }

        best = s;
        bestEnemies = numEnemies;
        bestLives = numLives;
    }
    if (main.debug) main.log.debug('getEyeMakerMove result: ' + best + ' - ' + (best ? (numMoves > 1 ? 'ALWAYS' : 'SOMETIMES') : 'NEVER'));
    if (!best) return NEVER;
    if (numMoves > 1) return ALWAYS;
    coords[0] = best.i; coords[1] = best.j;
    return SOMETIMES;
};

// TODO better algo
// We would not need this if we connected as "brothers" 2 of our groups separated by 
// a dead enemy. This is probably a better way to stop counting dead enemies to make up
// for unaccounted eyes. See TestBoardAnalyser#testBigGame2 in h12 for an example.
GroupInfo.prototype.countEyesFromDeadEnemy = function () {
    var count = this.deadEnemies.length;
    for(var n = count - 1; n >= 0; n--) {
        var voids = this.deadEnemies[n].nearVoids;
        // if a void next to this enemy belongs to us already, then dead enemy adds nothing
        for (var m = voids.length - 1; m >= 0; m--) {
            if (voids[m].owner === this) { // if remark above is coded, it becomes voids[m].color === color
                count--;
                break;
            }
        }
    }
    return count;
};

// This checks if a group can survive from its parents
GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return UNDECIDED;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var parent = this.dependsOn[n];
        if (parent.isAlive) {
            if (main.debug) main.log.debug('ALIVE-parents: ' + this);
            this.isAlive = true;
            return LIVES;
        }
        if (!parent.isDead) allAreDead = false;
    }
    if (!allAreDead) return UNDECIDED;
    return FAILS;
};

// This checks if a group can survive together with his brothers
GroupInfo.prototype.checkBrothers = function () {
    if (!this.band) return UNDECIDED;
    var brothers = this.band.brothers;
    var numEyes = 0, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        var gi = brothers[n];
        if (gi === this) continue;
        if (oneIsAlive || gi.isAlive) {
            oneIsAlive = gi.isAlive = true;
        } else {
            // gather the commonly owned eyes (2 one-eyed brothers are alive for good)
            numEyes += gi.eyeCount;
            if (numEyes >= 2) {
                oneIsAlive = gi.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return UNDECIDED;
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return LIVES;
};

GroupInfo.prototype._isLostInEnemyZone = function () {
    if (this.band || this.dependsOn.length) return false;
    if (this.nearVoids[0].color === this.group.color) return false;
    if (this.group.stones.length >= 6) return false;
    return true;
};

// This checks if a group can make 2 eyes from a single one
GroupInfo.prototype.checkSingleEye = function (first2play) {
    if (this.eyeCount >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
        return LIVES;
    }
    if (this._isLostInEnemyZone()) return FAILS;

    var coords = [];
    var alive = this.getEyeMakerMove(coords);
    // if it depends which player plays first
    if (alive === SOMETIMES) {
        if (first2play === undefined) return UNDECIDED; // no idea who wins here
        if (first2play !== this.group.color) {
            alive = NEVER;
        }
    }
    if (alive === NEVER) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.dependsOn.length || this.deadEnemies.length) return UNDECIDED;
        this._liveliness = this.liveliness();
        return FAILS;
    }
    // alive === ALWAYS
    this.isAlive = true;
    if (main.debug) main.log.debug('ALIVE-singleEye-' + when2str(alive) + ': ' + this);
    return LIVES;
};

// This checks if a group has a minimum liveliness
GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this._liveliness = this.liveliness(true);
    if (life >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return LIVES;
    }
    if (life < minLife) {
        this._liveliness = life;
        return FAILS;
    }
    return UNDECIDED;
};

GroupInfo.prototype._count = function (method) {
    var count = method.call(this), n;
    if (this.band) {
        var brothers = this.band.brothers;
        for (n = brothers.length - 1; n >= 0; n--) {
            if (brothers[n] === this) continue;
            count += method.call(brothers[n]);
        }
    } else {
        for (n = this.dependsOn.length - 1; n >= 0; n--) {
            count += method.call(this.dependsOn[n]); //TODO do we need to run on brothers of parents?
        }
    }
    return count;
};

GroupInfo.prototype.addPotentialEye = function (stone) {
    this.potentialEyes.push(stone);
};

GroupInfo.prototype._countPotEyes = function () { return this.potentialEyes.length; };

GroupInfo.prototype.countPotentialEyes = function () {
    return this._count(this._countPotEyes);
};

},{"../../../main":73,"./Band":52}],55:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(code) {
    this.code = code;
    this.i = 0;
    this.j = 0;
    this.vcount = 0;
    this.groups = null; // neighboring groups (array of arrays; 1st index is color)
    this.vtype = undefined; // see vXXX contants below
    this.color = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.owner = undefined; // GroupInfo or undefined; NB: fake eyes don't have owner
    this.isInDeadGroup = false; // true when all groups around an eye are dead (e.g. one-eyed dead group)
}
module.exports = Void;

Void.prototype.init = function (i, j, vcount, neighbors) {
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors;
};

var vEYE = Void.vEYE = 1;
var vFAKE_EYE = Void.vFAKE_EYE = 2;
var vDAME = Void.vDAME = 3;


var VTYPES = ['void', 'eye', 'fake-eye', 'dame'];

function vtype2str(vtype) {
    return vtype ? VTYPES[vtype] : VTYPES[0];
}

function areGroupsAllDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return false;
    }
    return true;
}

Void.prototype.findOwner = function () {
    var blackGroups = this.groups[BLACK], whiteGroups = this.groups[WHITE];
    // see which color has yet-alive groups around this void
    var allBlackDead = areGroupsAllDead(blackGroups);
    var allWhiteDead = areGroupsAllDead(whiteGroups);

    // every group around now dead = eye belongs to the killers
    if (allBlackDead && allWhiteDead) {
        if (this.vtype && !this.isInDeadGroup) this.setAsDeadGroupEye();
        return;
    }
    if (this.vtype === vEYE) return; // eyes don't change owner unless in a dead group
    if (!allBlackDead && !allWhiteDead) return; // still undefined owner

    var color = allBlackDead ? WHITE : BLACK;

    if (this.isFakeEye(color)) return;

    if (!blackGroups.length || !whiteGroups.length) {
        return this.setAsEye(color);
    }

    this.setVoidOwner(color);
};

// NB: groups around a fake-eye do not count it as an eye/void
Void.prototype.isFakeEye = function (color) {
    // Potential fake eyes are identified only once (when vtype is still "undefined")
    // after which they can only lose this property
    if (this.vtype && this.vtype !== vFAKE_EYE) return false;

    if (this.vcount > 1) return false;
    var groups = this.groups[color];
    if (groups.length < 2) return false; // not shared

    var isFake = false;
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        // NB: see TestBoardAnalyser#testBigGame1 for why we test deadEnemies below
        // Idea: with a dead enemy around, we are usually not forced to connect.
        if (gi.numContactPoints === 1 && !gi.deadEnemies.length && gi.voids.length === 0) {
            if (main.debug && !isFake) main.log.debug('FAKE EYE: ' + this);
            isFake = true;
            gi.makeDependOn(groups);
        }
    }
    if (!isFake) return false;
    if (this.vtype === undefined) {
        if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
        this.vtype = vFAKE_EYE;
        this.color = color;
    }
    return true;
};

Void.prototype.setAsEye = function (color) {
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.color = color;
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
};

/** Sets the "stronger color" that will probably own a void - vtype == undefined */
Void.prototype.setVoidOwner = function (color) {
    if (color === this.color) return;
    if (main.debug) main.log.debug('VOID: ' + Grid.colorName(color) + ' owns ' + this);

    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.color = color;
 
    // Given void can be seen as an eye if no other eye is around its "dead" enemies
    // i.e. no dead enemy ever "connects" 2 eyes (this would be a single eye)
    var enemies = this.groups[1 - color];
    for (var e = enemies.length - 1; e >= 0; e--) {
        var evoids = enemies[e]._info.nearVoids;
        for (var n = evoids.length - 1; n >= 0; n--) {
            if (evoids[n] === this) continue;
            if (evoids[n].color === color) return;
        }
    }
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
};

// Called during final steps for voids that have both B&W groups alive close-by
Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vDAME;
    this.color = undefined;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype.setAsDeadGroupEye = function () {
    if (main.debug) main.log.debug('EYE-IN-DEAD-GROUP: ' + this);
    var color = this.color;
    if (color === undefined) throw new Error('dead group\'s eye of undefined owner');

    this.isInDeadGroup = true;
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.color = 1 - color;

    // give it to any of the killers
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.killers.length) {
            this.owner = gi.killers[0]._info.addVoid(this);
            return;
        }
    }
    // Found no killer; happens for eye inside dead group lost inside enemy zone.
    // We should leave the eye inside its possibly dead group. See TestBoardAnalyser#testDoomedGivesEye2
};

Void.prototype.finalScore = function () {
    if (this.color === undefined || this.vtype === vFAKE_EYE) {
        return 0;
    }
    return this.vcount;
};

Void.prototype.isTouching = function (gi) {
    var g = gi.group;
    return this.groups[g.color].indexOf(g) > -1;
};

function grpNdx(g) { return '#' + g.ndx; }

Void.prototype.toString = function () {
    return vtype2str(this.vtype) + '-' + Grid.xy2move(this.i, this.j) + ', vcount:' + this.vcount +
        ', black:' + (this.groups[BLACK].map(grpNdx).toString() || '-') +
        ', white:' + (this.groups[WHITE].map(grpNdx).toString() || '-');
};

},{"../../../Grid":12,"../../../main":73}],56:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('../../../main');

var GRID_BORDER = main.GRID_BORDER;
var BORDER = main.BORDER;


/** @class Fills & collect info about zones.
 */
function ZoneFiller(goban, grid) {
    this.goban = goban;
    this.yx = grid.yx;
    this.groups = null;

    this.toReplace = this.groups = null;
}
module.exports = ZoneFiller;


// "Color" a goban zone.
// toReplace can be EMPTY, BLACK, WHITE or a zone code
// neighbors, if given should be an array of n arrays, with n == number of colors
// if neighbors are not given, we do simple "coloring"
ZoneFiller.prototype.fillWithColor = function (startI, startJ, toReplace, byColor, neighbors) {
    if (this.yx[startJ][startI] !== toReplace) return 0;
    var vcount = 0, yx = this.yx;
    this.toReplace = toReplace;
    this.groups = neighbors;
    var gap, gaps = [[startI, startJ, startJ]];

    while ((gap = gaps.pop())) {
        var i = gap[0], j0 = gap[1], j1 = gap[2];
        
        if (yx[j0][i] !== toReplace) continue; // gap already done by another path

        while (this._check(i, j0 - 1)) j0--;
        while (this._check(i, j1 + 1)) j1++;

        vcount += j1 - j0 + 1;
        // Doing column i from j0 to j1
        for (var ix = i - 1; ix <= i + 1; ix += 2) {
            var curgap = null;
            for (var j = j0; j <= j1; j++) {
                if (ix < i) {
                    yx[j][i] = byColor; // fill with color
                }
                if (this._check(ix, j)) {
                    if (!curgap) {
                        // New gap in ix starts at j
                        curgap = j; // gap start
                    }
                } else if (curgap) {
                    gaps.push([ix, curgap, j - 1]);
                    curgap = null;
                }
            }
            if (curgap) gaps.push([ix, curgap, j1]); // last gap
        }
    }
    return vcount;
};

// Returns true if the replacement is needed (=> i,j has a color equal to the replaced one)
ZoneFiller.prototype._check = function (i, j) {
    var color = this.yx[j][i];
    if (color === GRID_BORDER || color === BORDER) return false;
    if (color === this.toReplace) {
        return true;
    }

    if (!this.groups) return false; // we don't want the groups surrounding zones
    if (typeof color !== 'number') return false; // i,j is part of a void

    // keep new neighbors
    var group = this.goban.stoneAt(i, j).group;
    if (!group) throw new Error('Unexpected: ZoneFiller replacing a group'); // (since i,j is EMPTY)
    var groups = this.groups[color];
    if (groups.indexOf(group) === -1) groups.push(group);

    return false;
};

},{"../../../main":73}],57:[function(require,module,exports){
//Translated from ai1_player.rb using babyruby2js
'use strict';

var main = require('../../main');

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var ZoneFiller = require('./boan/ZoneFiller');

var GRID_BORDER = main.GRID_BORDER;
var sOK = main.sOK, sINVALID = main.sINVALID, sBLUNDER = main.sBLUNDER, sDEBUG = main.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class */
function Droopy(game, color, genes) {
    this.name = 'Droopy';
    this.game = game;
    this.goban = game.goban;
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize, GRID_BORDER);
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Droopy;

Droopy.publicName = 'Droopy';
Droopy.publicVersion = '0.1';

// Used only by tests
Droopy.BoardAnalyser = BoardAnalyser;
Droopy.ZoneFiller = ZoneFiller;


Droopy.prototype._createHeuristics = function () {
    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var n = 0; n < heuristics.length; n++) {
        var h = new (heuristics[n])(this);
        this.heuristics.push(h);
    }
};

Droopy.prototype.setColor = function (color) {
    this.color = color;
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].initColor(color);
    }
};

/** Can be called from Breeder with different genes */
Droopy.prototype.prepareGame = function (genes) {
    if (genes) this.genes = genes;
    this.numMoves = 0;

    this.bestScore = this.bestI = this.bestJ = 0;
    this.testI = this.testJ = NO_MOVE;
    this.debugHeuristic = null;
};

Droopy.prototype.getHeuristic = function (heuristicName) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    return null;
};

Droopy.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

Droopy.prototype._foundBestMove = function(i, j, score) {
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
};

Droopy.prototype._keepBestMove = function(i, j, score) {
    if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score);
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score);
    }
};

// Returns the move chosen (e.g. c4 or pass)
Droopy.prototype.getMove = function () {
    this.numMoves++;
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;

    this._prepareEval();
    this._initScoringGrid(stateYx, scoreYx);
    this._runHeuristics(stateYx, scoreYx);
    var move = this._collectBestMove(stateYx, scoreYx);

    main.debug = this.debugMode;
    return move;
};

Droopy.prototype._prepareEval = function () {
    this.bestScore = this.minimumScore - 0.001;
    this.bestI = NO_MOVE;

    this.debugMode = main.debug;
    main.debug = false;
};

/** Init grids (and mark invalid moves) */
Droopy.prototype._initScoringGrid = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (!this.goban.isValidMove(i, j, this.color)) {
                stateYx[j][i] = sINVALID;
                continue;
            }
            stateYx[j][i] = sOK;
            scoreYx[j][i] = 0;
        }
    }
    if (this.testI !== NO_MOVE) {
        stateYx[this.testJ][this.testI] = sDEBUG;
    }
};

/** Do eval using each heuristic (NB: order is important) */
Droopy.prototype._runHeuristics = function (stateYx, scoreYx) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        main.debug = this.debugMode && this.debugHeuristic === h.name;

        if (h._beforeEvalBoard) h._beforeEvalBoard();
        h.evalBoard(stateYx, scoreYx);
    }
};

/** Returns the move which got the best score */
Droopy.prototype._collectBestMove = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK || scoreYx[j][i] < this.bestScore) continue;
            this._keepBestMove(i, j, scoreYx[j][i]);
        }
    }
    if (this.bestScore < this.minimumScore) return 'pass';
    return Grid.xy2move(this.bestI, this.bestJ);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Droopy.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    main.log.debug(Grid.xy2move(i, j) + ' seen as blunder: ' + reason);
};
Droopy.prototype.isBlunderMove = function (i, j) {
    return this.stateGrid.yx[j][i] === sBLUNDER;
};

Droopy.prototype.guessTerritories = function () {
    this.pot.evalBoard();
    return this.pot.territory.yx;
};

Droopy.prototype._getMoveForTest = function (i, j) {
    this.testI = i;
    this.testJ = j;

    this.getMove();

    this.testI = NO_MOVE;
};

Droopy.prototype._getMoveSurvey = function (i, j) {
    var survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        var s = h.scoreGrid.yx[j][i];
        if (s) survey[h.name] = s;
    }
    return survey;
};

/** For tests */
Droopy.prototype.testMoveEval = function (i, j) {
    this._getMoveForTest(i, j);
    return this.scoreGrid.yx[j][i];
};

/** For tests */
Droopy.prototype.testHeuristic = function (i, j, heuristicName) {
    this._getMoveForTest(i, j);
    var h = this.getHeuristic(heuristicName);
    return h.scoreGrid.yx[j][i];
};

/** For tests */
Droopy.prototype.setDebugHeuristic = function (heuristicName) {
    this.debugHeuristic = heuristicName;
};

function surveySort(h1, h2) { return h2[1] - h1[1]; }

Droopy.prototype.getMoveSurveyText = function (move, isTest) {
    var coords = this.game.oneMove2xy(move);
    if (!coords) return '';
    var i = coords[0], j = coords[1];
    if (isTest) this._getMoveForTest(i, j);
    var survey = this._getMoveSurvey(i, j);
    var score = this.scoreGrid.yx[j][i];

    var sortedSurvey = [];
    for (var h in survey) {
        if (survey[h] === 0) continue;
        sortedSurvey.push([h, survey[h]]);
    }
    sortedSurvey.sort(surveySort);

    var txt = move + ' (' + score.toFixed(2) + ')\n';
    for (var n = 0; n < sortedSurvey.length; n++) {
        txt += '- ' + sortedSurvey[n][0] + ': ' + sortedSurvey[n][1].toFixed(2) + '\n';
    }
    return txt;
};


},{"../../Genes":10,"../../Grid":12,"../../main":73,"./AllHeuristics":40,"./boan/BoardAnalyser":53,"./boan/ZoneFiller":56}],58:[function(require,module,exports){
//Translated from all_heuristics.rb using babyruby2js
'use strict';

// When creating a new heuristic, remember to add it here.
var Spacer = require('./Spacer');
var Savior = require('./Savior');
var Hunter = require('./Hunter');
var Connector = require('./Connector');
var Pusher = require('./Pusher');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var Shaper = require('./Shaper');


var allHeuristics = function () {
    return [
        NoEasyPrisoner,
        Savior,
        Hunter,
        Connector,
        Spacer,
        Pusher,
        Shaper
    ];
};
module.exports = allHeuristics;

},{"./Connector":59,"./Hunter":61,"./NoEasyPrisoner":62,"./Pusher":63,"./Savior":64,"./Shaper":65,"./Spacer":66}],59:[function(require,module,exports){
//Translated from connector.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY;


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
        case EMPTY: continue;
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
    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3 && numEnemies === 0 &&
        s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) return 0;

    var numGroups = s3 ? 3 : 2;
    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this.distanceBetweenStones(s1, s2, color) === 0) return 0;
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    var score;
    if (numEnemies === 0) {
        score = this.inflCoeff / this.inf.map[j][i][color];
    } else {
        score = this.allyCoeff1 * numGroups;
    }
    if (main.debug) main.log.debug('Connector for ' + Grid.colorName(color) + ' gives ' + score.toFixed(3) + ' to ' + i + ',' + j +
        ' (allies:' + numGroups + ' enemies: ' + numEnemies + ')');
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":60,"util":6}],60:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

var sOK = main.sOK, ALWAYS = main.ALWAYS;
var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY, BORDER = main.BORDER;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = main.DIR0, DIR3 = main.DIR3;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player, consultant) {
    this.player = player;
    this.name = this.constructor.name || main.funcName(this.constructor);
    this.consultant = !!consultant;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;
    this.boan = player.boan;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

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

// For heuristics which do not handle evalBoard (but evalMove)
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j, color);
            scoreYx[j][i] += score;
        }
    }
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

Heuristic.prototype.territoryScore = function (i, j, color) {
    var ter = this.ter.potential().yx;
    return ter[j][i] * ( color === main.BLACK ? 1 : -1);
};

Heuristic.prototype.enemyTerritoryScore = function (i, j, color) {
    var score = Grid.territory2owner[2 + this.ter.grids[1 - color].yx[j][i]];
    return score * (color === main.BLACK ? 1 : -1);
};

/** Pass saved as true if g is an ally group (we evaluate how much we save) */
Heuristic.prototype.groupThreat = function (g, saved) {
    var threat = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners

    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties();
    }
    threat += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot

    if (saved) return threat;
    return threat + this._countSavedAllies(g);
};

// Count indirectly saved groups
Heuristic.prototype._countSavedAllies = function (killedEnemyGroup) {
    // do not count any saved allies if we gave them a single life along border TODO: improve later
    if (killedEnemyGroup.stones.length === 1 &&
        this.distanceFromStoneToBorder(killedEnemyGroup.stones[0]) === 0) {
        return 0;
    }
    var saving = 0;
    var allies = killedEnemyGroup.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        if (allies[a].lives > 1) continue;
        saving += this.groupThreat(allies[a], /*saved=*/true);
    }
    return saving;
};

Heuristic.prototype._invasionCost = function (i, j, dir, color, level) {
    if (level-- === 0) return 0;
    var s = this.goban.stoneAt(i, j);
    if (s === BORDER || s.color !== EMPTY) return 0;
    var cost = this.enemyTerritoryScore(i, j, color);
    if (cost <= 0) return 0;

    var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
    var spread = XY_AROUND[(dir + 3) % 4];
    var vx = spread[0], vy = spread[1];

    cost += this._invasionCost(i + dx + vx, j + dy + vy, dir, color, level);
    cost += this._invasionCost(i + dx - vx, j + dy - vy, dir, color, level);
    return cost;
};

var INVASION_DEEPNESS = 0; // TODO: better algo for this

Heuristic.prototype.invasionCost = function (i, j, color) {
    var cost = Math.max(0, this.enemyTerritoryScore(i, j, color));
    for (var dir = DIR0; dir <= DIR3; dir++) {
        cost += this._invasionCost(i + XY_AROUND[dir][0], j + XY_AROUND[dir][1], dir, color, INVASION_DEEPNESS);
    }
    return cost;
};

Heuristic.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.player.markMoveAsBlunder(i, j, this.name + ':' + reason);
};

Heuristic.prototype.distanceFromStoneToBorder = function (stone) {
    var gsize = this.gsize;
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
        var diags = this.diagonalStones(s1, s2), c1 = diags[0], c2 = diags[1];
        if (c1.color === color || c2.color === color) return 0; // already connected
        if (c1.color === enemy) numEnemies++;
        if (c2.color === enemy) numEnemies++;
        if (numEnemies === 0) return 0; // safe hane
        if (numEnemies === 2) return 99; // cut!
        var connPoint = c1.color === enemy ? c2 : c1;
        if (this.distanceFromStoneToBorder(s1) === 0 || this.distanceFromStoneToBorder(s2) === 0) {
            if (this.distanceFromStoneToBorder(connPoint) === 1) return 1; // enemy cut-stone on border
            if (connPoint.allyStones(enemy) !== 0) return 1; // other enemy next to conn point
            return 0;
        } else if (this.distanceFromStoneToBorder(connPoint) === 1) {
            if (connPoint.allyStones(enemy) !== 0) return 1;
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
        if (n.color === color && n.group.xDead < ALWAYS) return n;
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
            if (en.group.xDead === ALWAYS) continue; // TODO: look better at group's health
            var dist = this.distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

// Cannot start from corner!
Heuristic.prototype.canConnectAlongBorder = function (i, j, color) {
    // decide direction
    var gsize = this.gsize;
    var dx = 0, dy = 0;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else return null;
    // check 1 stone to see if we should reverse direction
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s === BORDER) return null;
    if (s.color !== EMPTY) { dx = -dx; dy = -dy; }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) return null;
        if (s.color === color && s.group.lives > 2) return s.group;
    }
};

},{"../../Grid":12,"../../Stone":18,"../../main":73}],61:[function(require,module,exports){
//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player) {
    Heuristic.call(this, player);
}
inherits(Hunter, Heuristic);
module.exports = Hunter;


/** Returns true if group g could get at least minLives by killing one of the
 *  enemy groups around in atari
 */
Hunter.prototype._gotLivesFromKillingAround = function (g, minLives) {
    var enemies = g.allEnemies();
    for (var n = enemies.length - 1; n >= 0; n--) {
        var eg = enemies[n];
        if (eg.lives > 1) continue;
        // found 1 enemy group in atari; killing it would give us its size in new lives
        var addedLives = eg.stones.length;
        if (addedLives >= minLives) return true;
        // this is not enough, so count lives we would get by connecting with our groups around eg
        var allies = eg.allEnemies();
        for (var a = allies.length - 1; a >= 0; a--) {
            addedLives += allies[a].lives - 1;
            if (addedLives >= minLives) return true;
        }
    }
    return false;
};


var KO_KILL_SCORE = 1;

/** Returns a score to measure what kind of kill a move is.
 *  Any number < 1.01 is sign of a "not so good" kill.
 *  E.g. in this board, black c5 has a bad "kill score" of 1.0001
 *  5 O@+OO
 *  4 O@O@+
 *  3 OO@@+
 *  2 ++@++
 *  1 ++@++
 *    abcde
 *  NB: kill score of a KO is 1 (KO_KILL_SCORE)
 */
Hunter.prototype._killScore = function (empty, color) {
    var numAllies = 0, numKill = 0, life = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            life += 0.01;
            break;
        case color: // ally
            life += (n.group.lives - 1) * 0.01;
            if (n.group.xAlive === ALWAYS) life += 2;
            numAllies += 0.0001;
            break;
        default: // enemy
            if (n.group.lives > 1) break; // not a kill
            numKill += n.group.stones.length;
        }
    }
    return numKill + life + numAllies;
};

Hunter.prototype.evalMove = function (i, j, color, level) {
    if (level === undefined) level = 1;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var allies = stone.uniqueAllies(color);
    var enemies = stone.uniqueAllies(1 - color);
    var egroups = null, eg;
    var threat1 = 0;
    // first count groups already in atari
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 1) continue;
        // if we can take eg anytime later, no need to take it now
        //TODO also verify no group in "enemies" is strong
        if (this._isAtariGroupCaught(eg) && !this._gotLivesFromKillingAround(eg, 1)) {
            continue;
        }
        threat1 += this.groupThreat(eg);
    }
    var snapback = false;
    // now look for groups with 2 lives
    for (egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 2) continue;
        // no good if enemy can escape by killing one of our weak groups around
        if (this._gotLivesFromKillingAround(eg, 2)) continue; // >=2 because killing 1 stone is not enough to escape
        // same but for the group of our new stone; if should not become atari either
        if (empties.length === 0 && allies.length === 1 && allies[0].lives === 2) continue;
        
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
            if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + ' sees a snapback in ' + stone);
        }
        if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + '(level ' + level + ') looking at ' + Grid.xy2move(i, j) + ' threat on ' + eg);
        if (!egroups) egroups = [eg];
        else egroups.push(eg);
    }
    if (!egroups) return threat1;

    // unless snapback, make sure our new stone's group can survive
    if (!snapback && empties.length <= 1) {
        var killScore = this._killScore(stone, color);
        if (killScore !== KO_KILL_SCORE && killScore < 1.01) {
            return 0; // REVIEW ME: return threat1 does not penalize snapback victim enough
        }
    }

    this.goban.tryAt(i, j, color); // our attack takes one of the 2 last lives (the one in i,j)

    // see attacks that fail
    var canEscape = [false, false, false];
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (this._isAtariGroupCaught(egroups[g], level)) continue;
        if (egroups.length === 1) { egroups.pop(); break; }
        canEscape[g] = true;
    }

    this.goban.untry(); // important to undo before, so we compute threat right

    var threat = this._getMultipleChaseThreat(egroups, canEscape);

    if (main.debug && (threat1 || threat)) main.log.debug('Hunter ' + Grid.colorName(color) +
        ' found a threat of ' + threat1 + ' + ' + threat + ' at ' + Grid.xy2move(i, j));
    return threat + threat1;
};

/** Returns the maximum threat we can hope for when several groups can be chased.
 *  Some of these chases might fail, but even so, the enemy can only defend one.
 *  Rule of thumb:
 *  - if 0 can escape => we capture the bigger one
 *  - if 1 or more can escape => we capture nothing if only 1, or the 2nd bigger if the 1st can escape
 */
Hunter.prototype._getMultipleChaseThreat = function (egroups, canEscape) {
    switch (egroups.length) {
    case 0: return 0;
    case 1: return canEscape[0] ? 0 : this.groupThreat(egroups[0]);
    case 2: 
        if (!canEscape[0] && !canEscape[1]) return Math.max(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        if ( canEscape[0] &&  canEscape[1]) return Math.min(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        return canEscape[0] ? this.groupThreat(egroups[1]) : this.groupThreat(egroups[0]);
    case 3:
        var threats = [this.groupThreat(egroups[0]), this.groupThreat(egroups[1]), this.groupThreat(egroups[2])];
        if (!canEscape[0] && !canEscape[1] && !canEscape[2]) return Math.max(threats[0], threats[1], threats[2]);
        var sortedThreats = threats.concat().sort(function (a,b) { return a<b; });
        var bigger = threats.indexOf(sortedThreats[0]);
        if (!canEscape[bigger]) return threats[bigger];
        var secondBigger = threats.indexOf(sortedThreats[1]);
        return threats[secondBigger];
    default: throw new Error('Unexpected in Hunter#getMultipleChaseThreat');
    }
};

Hunter.prototype._isAtariGroupCaught = function (g, level) {
    var allLives = g.allLives();
    if (allLives.length !== 1) throw new Error('Unexpected: hunter #1: ' + allLives.length);

    var lastLife = allLives[0];
    var stone = this.goban.tryAt(lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this.isEscapingAtariCaught(stone, level);
    this.goban.untry();
    if (main.debug) main.log.debug('Hunter: group with last life ' + lastLife + ' would ' + (isCaught ? 'be caught: ' : 'escape: ') + g);
    return isCaught;
};

/** Returns true if played stone has put a nearby enemy group in atari */
Hunter.prototype._isStoneCreatingAtari = function (stone) {
    var enemyColor = 1 - stone.color;
    var neighbors = stone.neighbors;
    for (var n = neighbors.length - 1; n >= 0; n--) {
        if (neighbors[n].color !== enemyColor) continue;
        if (neighbors[n].group.lives === 1) {
            return true;
        }
    }
    return false;
};

/** @param stone is the enemy group's escape move (played)
 *  @param [level] - just to keep track for logging purposes
 *  @return true if the group gets captured
 */
Hunter.prototype.isEscapingAtariCaught = function (stone, level) {
    var g = stone.group;
    if (g.lives <= 1) return true; // caught
    if (g.lives > 2) {
        return false; //TODO look better
    }
    // g.lives is 2

    // if escape move just put one of our groups in atari the chase fails
    if (this._isStoneCreatingAtari(stone)) return false;

    // get 2 possible escape moves
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) throw new Error('Unexpected: hunter #2');
    var e1 = empties[0];
    var e2 = empties[1];
    if (main.debug) main.log.debug('Hunter: group has 2 lives left: ' + e1 + ' and ' + e2);

    // play the 2 moves (recursive descent)
    var color = 1 - g.color;
    level = (level || 1) + 1;
    return (this.evalMove(e1.i, e1.j, color, level) > 0 || this.evalMove(e2.i, e2.j, color, level) > 0);
};

},{"../../Grid":12,"../../main":73,"./Heuristic":60,"util":6}],62:[function(require,module,exports){
//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var sOK = main.sOK;


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);
    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype.evalBoard = function (stateYx, scoreYx) {
    if (!this.hunter) this.hunter = this.player.getHeuristic('Hunter');
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j);
            if (score === 0) continue;
            scoreYx[j][i] += score;
        }
    }
};

NoEasyPrisoner.prototype.evalMove = function (i, j) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).
    var stone = this.goban.tryAt(i, j, this.color);
    var g = stone.group;
    var score = 0, move;
    if (main.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (main.debug) main.log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) main.log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":60,"util":6}],63:[function(require,module,exports){
//Translated from pusher.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var sOK = main.sOK;


/** @class
 *  Way of "pushing" our influence further...
 *  Still very naive; for that reason the coeff are rather low.
 */
function Pusher(player) {
    Heuristic.call(this, player);
    this.allyCoeff = this.getGene('ally-infl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemy-infl', 0.13, 0.01, 1.0);
}
inherits(Pusher, Heuristic);
module.exports = Pusher;

Pusher.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j);
            scoreYx[j][i] += score;
        }
    }
};

Pusher.prototype.evalMove = function (i, j) {
    var inf = this.inf.map[j][i];
    var enemyInf = inf[this.enemyColor];
    var allyInf = inf[this.color];
    if (enemyInf === 0 || allyInf === 0) {
        return 0;
    }
    if (!this.canConnect(i, j, this.color)) return 0;

    var invasion = this.invasionCost(i, j, this.color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    if (main.debug) main.log.debug('Pusher heuristic sees invasion:' + invasion +
        ', influences:' + allyInf + ' - ' + enemyInf + ' at ' + Grid.xy2move(i, j) +
        ' -> ' + '%.03f'.format(score));
    return score;
};

},{"../../Grid":12,"../../main":73,"./Heuristic":60,"util":6}],64:[function(require,module,exports){
//Translated from savior.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var sOK = main.sOK, ALWAYS = main.ALWAYS;


/** @class Saviors rescue ally groups in atari */
function Savior(player) {
    Heuristic.call(this, player);
    this.hunter = null;
}
inherits(Savior, Heuristic);
module.exports = Savior;


Savior.prototype.evalBoard = function (stateYx, scoreYx) {
    if (!this.hunter) this.hunter = this.player.getHeuristic('Hunter');
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var stone = this.goban.stoneAt(i, j);
            var threat = this._evalEscape(i, j, stone);
            if (threat === 0) continue;
            if (main.debug) main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + stone);
            var score = myScoreYx[j][i] = threat;
            scoreYx[j][i] += score;
        }
    }
};

Savior.prototype._evalEscape = function (i, j, stone) {
    // look around stone for 2 things: threatened allies & strong allies
    var threat = 0, groups = [], livesAdded = 0;
    var hunterThreat = null;
    for (var g, g_array = stone.uniqueAllies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.lives === 1) {
            groups.push(g);
            threat += this.groupThreat(g, true);
        } else if (g.lives === 2) {
            groups.push(g);
            if (hunterThreat !== null) continue;
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' + Grid.xy2move(i, j) + ': pre-atari on ' + g);
            hunterThreat = this.hunter.evalMove(i, j, this.enemyColor);
            threat += hunterThreat;
        } else if (g.xDead < ALWAYS) {
            livesAdded += g.lives - 1;
        }
    }
    if (threat === 0) return 0; // no threat

    livesAdded += stone.numEmpties();
    if (livesAdded > 2) return threat; // we can save the threat
    if (livesAdded === 2) {
        // do not count empties that were already a life of threatened groups
        var empties = stone.empties();
        for (var t = groups.length - 1; t >= 0; t--) {
            g = groups[t];
            for (var n = empties.length - 1; n >= 0; n--) {
                if (empties[n].isNextTo(g)) livesAdded--;
            }
        }
    }
    if (livesAdded === 2) {
        if (this.distanceFromStoneToBorder(stone) === 0) {
            if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' sees an escape along border in ' + Grid.xy2move(i, j));
            return this.canConnectAlongBorder(i, j, this.color) ? threat : 0;
        }
        // when we get 2 lives from the new stone, get our hunter to evaluate if we can escape
        if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' asking hunter to look at ' + Grid.xy2move(i, j) + ': threat=' + threat + ', lives_added=' + livesAdded);
        this.goban.tryAt(i, j, this.color);
        var isCaught = this.hunter.isEscapingAtariCaught(stone);
        this.goban.untry();
        if (!isCaught) {
            return threat;
        }
    }
    if (main.debug) main.log.debug('Savior ' + Grid.colorName(this.color) + ' giving up on threat of ' + threat + ' in ' + Grid.xy2move(i, j));
    return 0; // nothing we can do to help
};

},{"../../Grid":12,"../../main":73,"./Heuristic":60,"util":6}],65:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;

Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    var myScoreYx = this.scoreGrid.yx;
    var allGroups = this.ter.allGroups;
    for (var ndx in allGroups) {
        var g = allGroups[ndx], gi = g._info;
        if (g.xDead === ALWAYS || gi.eyeCount !== 1) continue;
        var eye = gi.getSingleEye();
        if (!eye) continue;
        var coords = [];
        var alive = Shaper.getEyeMakerMove(this.goban, eye.i, eye.j, eye.vcount, coords);
        if (alive !== 1) continue;
        var i = coords[0], j = coords[1];
        var score = myScoreYx[j][i] = this.groupThreat(g, this.color === g.color);
        scoreYx[j][i] += score;
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

},{"../../main":73,"./Heuristic":60,"util":6}],66:[function(require,module,exports){
//Translated from spacer.rb using babyruby2js
'use strict';

var main = require('../../main');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Tries to occupy empty space + counts when filling up territory */
function Spacer(player) {
    Heuristic.call(this, player);
    this.inflCoeff = this.getGene('infl', 1, 0.5, 3);
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

},{"../../main":73,"./Heuristic":60,"util":6}],67:[function(require,module,exports){
//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('../Shaper');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = 1000;

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

// NB: groups around a fake-eye do not count it has an eye/void
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
        if (gi.numContactPoints === 1 && !gi.deadEnemies.length) {
            if (main.debug && !isFake) main.log.debug('FAKE EYE: ' + this);
            isFake = true;
            gi.makeDependOn(groups, this);
        }
    }
    if (!isFake) return false;
    if (!this.vtype) {
        this.vtype = vFAKE_EYE;
        this.owner = color;
    }
    return true;
};

Void.prototype.setEyeOwner = function (color) {
    if (this.vtype === vEYE && color === this.owner) return;
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.owner = color;

    // If more than 1 group and they were not brothers yet, they become brothers
    var groups = this.groups[color];
    if (groups.length > 1) Band.gather(groups);

    // Now tell ONE of the groups about this void
    groups[0]._info.addVoid(this);
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
    var s = vtype2str(this.vtype) + ' ' + this.code + ' (' + Grid.xy2move(this.i, this.j) + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.colorName(color) + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    main.log.debug(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        main.log.debug('    Color ' + color + ': ' +
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
function GroupInfo(group, boan) {
    this.boan = boan;
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

GroupInfo.prototype.giveVoidsTo = function (gi) {
    var v;
    while ((v = this.voids[0])) {
        this.removeVoid(v);
        gi.addVoid(v);
    }
};

GroupInfo.prototype.makeDependOn = function (groups) {
    if (main.debug) main.log.debug('DEPENDING group: ' + this);
    var band = this.band;
    if (band) band.remove(this);
    
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) < 0) {
            if (main.debug) main.log.debug('DEPENDS: ' + this + ' depends on ' + gi);
            this.dependsOn.push(gi);
        }
    }

    this.giveVoidsTo(this.dependsOn[0]);
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
                familyPoints += brothers[n].liveliness(true);
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
    var numEyes = 0, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        var gi = brothers[n];
        if (gi === this) continue;
        if (oneIsAlive || gi.isAlive) {
            oneIsAlive = gi.isAlive = true;
        } else {
            numEyes += gi.eyeCount;
            if (numEyes >= 2) { // checkLiveliness does that too; TODO: remove if useless
                oneIsAlive = gi.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return false;
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return true;
};

GroupInfo.prototype.checkSingleEye = function (first) {
    if (this.eyeCount !== 1) return false;
    var eye = this.getSingleEye();
    var coords = [];
    var alive = Shaper.getEyeMakerMove(this.group.goban, eye.i, eye.j, eye.vcount, coords);
    // if it depends which player plays first
    if (alive === 1) {
        if (first === undefined) return false; // no idea who wins here
        if (first !== this.group.color) {
            alive = 0;
        }
    }
    if (alive === 0) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.deadEnemies.length) return false;
        this.considerDead('singleEyeShape');
        return true;
    }

    this.isAlive = true;
    if (main.debug) main.log.debug('ALIVE-singleEye-' + alive + ': ' + this);
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


//---

/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.version = 'frankie';
    this.goban = null;
    this.allVoids = [];
    this.scores = [0, 0];
    this.prisoners = [0, 0];
}
module.exports = BoardAnalyser;


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = goban.countPrisoners();

    if (!this._initAnalysis(goban)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(this.filler.grid.toText());
};

BoardAnalyser.prototype.getScoringGrid = function () {
    return this.goban.scoringGrid;
};

/** If grid is not given a new one will be created from goban */
BoardAnalyser.prototype.analyse = function (goban, grid, first) {
    if (!this._initAnalysis(goban, grid)) return;
    this._runAnalysis(first);
    this._finalColoring();
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    main.log.debug(this.filler.grid.toText());
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
        main.log.debug('\nGroups with 2 eyes or more: ' + eyes[2].map(grpNdx));
        main.log.debug('Groups with 1 eye: ' + eyes[1].map(grpNdx));
        main.log.debug('Groups with no eye: ' + eyes[0].map(grpNdx));
        main.log.debug('Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        }));
    }
};

BoardAnalyser.prototype._initAnalysis = function (goban, grid) {
    this.goban = goban;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g) {
    if (this.allGroups[g.ndx]) return;
    this.allGroups[g.ndx] = g;
    if (!g._info || g._info.boan !== this) {
        g._info = new GroupInfo(g, this);
    } else {
        g._info.resetAnalysis(g);
    }
};

/** Create the list of voids and groups.
 *  The voids know which groups are around them
 *  but the groups do not own any void yet. */
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

BoardAnalyser.prototype._runAnalysis = function (first) {
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();
    this._lifeOrDeathLoop(first);
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

function normalizeLiveliness(life) {
    if (life > 1 && life < 2) {
        return life - 1 + 0.01; // TODO check in book if this is relevant enough
    }
    return life;
}

function compareLivelines(life) {
    // make sure we have a winner, not a tie
    if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
        return undefined;
    }
    life[BLACK] = normalizeLiveliness(life[BLACK]);
    life[WHITE] = normalizeLiveliness(life[WHITE]);
    return life[BLACK] > life[WHITE] ? BLACK : WHITE;
}

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
            var winner = compareLivelines(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED EYE in dispute: ' + v);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED EYE: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(2) + ' VS ' + life[1 - winner].toFixed(2));
            v.setEyeOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

BoardAnalyser.prototype._reviewGroups = function (fn, stepNum, first) {
    var count = 0, reviewedCount = 0;
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;
        if (fn.call(gi, first)) count++;
    }
    if (main.debug) {
        var msg = 'REVIEWED ' + reviewedCount + ' groups for step ' + stepNum;
        if (count) msg += ' => found ' + count + ' alive/dead groups';
        main.log.debug(msg);
    }
    if (count === reviewedCount) return -1; // really finished
    return count;
};

var midGameLifeChecks = [
    GroupInfo.prototype.checkDoubleEye,
    GroupInfo.prototype.checkParents,
    GroupInfo.prototype.checkBrothers,
    GroupInfo.prototype.checkLiveliness1,
    GroupInfo.prototype.checkSingleEye,
    GroupInfo.prototype.checkLiveliness2 // REVIEW ME: can we really ask a final liveliness (2) in mid-game
];
var scoringLifeChecks = [
    GroupInfo.prototype.checkDoubleEye,
    GroupInfo.prototype.checkParents,
    GroupInfo.prototype.checkBrothers,
    GroupInfo.prototype.checkLiveliness1,
    GroupInfo.prototype.checkSingleEye,
    GroupInfo.prototype.checkLiveliness2
];

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first) {
    var checks = first !== undefined ? midGameLifeChecks : scoringLifeChecks;
    var stepNum = 0;
    while (stepNum < checks.length) {
        var count = this._reviewGroups(checks[stepNum], stepNum, first);
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

BoardAnalyser.prototype._finalColoring = function () {
    this._findDameVoids();
    this._colorVoids();
    this._colorDeadGroups();
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (g._info.liveliness() >= 2) {
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

BoardAnalyser.prototype._colorDeadGroups = function () {
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

},{"../../../Grid":12,"../../../main":73,"../Shaper":65,"./ZoneFiller":70}],68:[function(require,module,exports){
//Translated from influence_map.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');

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
        main.log.debug('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            main.log.debug('' + '%2d'.format(j) +
                this.map[j].slice(1, this.gsize + 1).map(inf2str).join('|'));
        }
        var cols = '  ';
        for (var i = 1; i <= this.gsize; i++) { cols += ' ' + Grid.xLabel(i) + ' '; }
        main.log.debug(cols);
    }
};

},{"../../../Grid":12,"../../../main":73}],69:[function(require,module,exports){
//Translated from potential_territory.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Stone = require('../../../Stone');
var BoardAnalyser = require('./BoardAnalyser');

var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var NEVER = main.NEVER;
var UP = main.UP, RIGHT = main.RIGHT, DOWN = main.DOWN, LEFT = main.LEFT;

var POT2CHAR = Grid.territory2char;
var POT2OWNER = Grid.territory2owner;

var XY_AROUND = Stone.XY_AROUND;
var XY_DIAGONAL = Stone.XY_DIAGONAL;


/** @class */
function PotentialTerritory(goban) {
    this.goban = goban;
    this.gsize = goban.gsize;
    this.boan = new BoardAnalyser();
    this.realGrid = this.goban.scoringGrid; // we can reuse the already allocated grid
    this.realYx = this.realGrid.yx; // simple shortcut to real yx
    // grids below are used in the evaluation process
    this.grids = [new Grid(this.gsize, GRID_BORDER), new Grid(this.gsize, GRID_BORDER)];
    this.reducedGrid = new Grid(this.gsize, GRID_BORDER);
    this.territory = new Grid(this.gsize, GRID_BORDER); // result of evaluation
    this._prepareBorderConnect();
}
module.exports = PotentialTerritory;


// Returns the matrix of potential territory.
// +1: definitely white, -1: definitely black
// Values in between are possible too.
PotentialTerritory.prototype.guessTerritories = function () {
    this._initGroupState();
    // update real grid to current goban
    this.realGrid.initFromGoban(this.goban);
    // evaluate 2 "scenarios" - each player plays everywhere *first*
    this._foresee(this.grids[BLACK], BLACK, WHITE);
    this._foresee(this.grids[WHITE], WHITE, BLACK);
    // now merge the result
    var blackYx = this.grids[BLACK].yx;
    var whiteYx = this.grids[WHITE].yx;
    var resultYx = this.territory.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            resultYx[j][i] = (POT2OWNER[2 + blackYx[j][i]] + POT2OWNER[2 + whiteYx[j][i]]) / 2;
        }
    }
    if (main.debug) main.log.debug('Guessing territory for:\n' + this.realGrid +
        '\nBLACK first:\n' + this.grids[BLACK] + 'WHITE first:\n' + this.grids[WHITE] + this);
    return resultYx;
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
    var moveCount = this.goban.moveNumber();

    // passed grid will receive the result (scoring grid)
    this._connectThings(grid, first, second);
    this.boan.analyse(this.goban, grid.initFromGoban(this.goban), first);
    this._collectGroupState();

    // restore goban
    moveCount = this.goban.moveNumber() - moveCount;
    while (moveCount-- > 0) this.goban.untry();
};

PotentialTerritory.prototype._initGroupState = function () {
    this.allGroups = this.goban.getAllGroups();
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx];
        g.xAlive = g.xDead = NEVER;
    }
};

PotentialTerritory.prototype._collectGroupState = function () {
    for (var ndx in this.allGroups) {
        var g0 = this.allGroups[ndx], gn = g0;
        // follow merge history to get final group g0 ended up into
        while (gn.mergedWith) gn = gn.mergedWith;
        // collect state of final group
        if (gn.killedBy || gn._info.isDead) {
            g0.xDead++;
        } else if (gn._info.isAlive) {
            g0.xAlive++;
        }
    }
};

PotentialTerritory.prototype._connectThings = function (grid, first, second) {
    this.tmp = this.territory; // safe to use it as temp grid here
    this.reducedYx = null;
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
        this.goban.tryAt(i, j, color);
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

},{"../../../Grid":12,"../../../Stone":18,"../../../main":73,"./BoardAnalyser":67}],70:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('../../../main');

var GRID_BORDER = main.GRID_BORDER;
var BORDER = main.BORDER;


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
    if (color === GRID_BORDER || color === BORDER) return false;
    if (color === this.toReplace) return true;

    if (this.groups && color < 2) {
        var group = this.goban.stoneAt(i, j).group;
        if (group && this.groups[color].indexOf(group) < 0) {
            this.groups[color].push(group);
        }
    }
    return false;
};

},{"../../../main":73}],71:[function(require,module,exports){
//Translated from ai1_player.rb using babyruby2js
'use strict';

var main = require('../../main');

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var InfluenceMap = require('./boan/InfluenceMap');
var PotentialTerritory = require('./boan/PotentialTerritory');
var ZoneFiller = require('./boan/ZoneFiller');

var GRID_BORDER = main.GRID_BORDER;
var sOK = main.sOK, sINVALID = main.sINVALID, sBLUNDER = main.sBLUNDER;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class
 *  public read-only attribute: goban, inf, ter, enemyColor, genes
 *  TODO: 
 *  - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
 *  - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
 *  - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
 *  - an eye shape constructor
 */
function Frankie(game, color, genes) {
    this.name = 'Frankie';
    this.goban = game.goban;
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.boan = new BoardAnalyser();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize, GRID_BORDER);
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    this.genes = (( genes ? genes : new Genes() ));
    this.minimumScore = this.getGene('smaller-move', 0.03, 0.01, 0.1);

    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var i = 0; i < heuristics.length; i++) {
        var h = new (heuristics[i])(this);
        this.heuristics.push(h);
    }
    this.setColor(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    this.prepareGame(this.genes);
}
module.exports = Frankie;

Frankie.publicName = 'Frankie';
Frankie.publicVersion = '0.1';

Frankie.BoardAnalyser = BoardAnalyser;
Frankie.PotentialTerritory = PotentialTerritory;
Frankie.ZoneFiller = ZoneFiller;


Frankie.prototype.getHeuristic = function (heuristicName) {
    for (var n = this.heuristics.length - 1; n >= 0; n--) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    throw new Error('Invalid heuristic name: ' + heuristicName);
};

Frankie.prototype.prepareGame = function (genes) {
    this.genes = genes;
    this.numMoves = 0;
};

Frankie.prototype.setColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
    for (var i = 0; i < this.heuristics.length; i++) {
        this.heuristics[i].initColor();
    }
};

Frankie.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

function score2str(i, j, score) {
    return Grid.xy2move(i, j) + ':' + score.toFixed(3);
}

Frankie.prototype._foundSecondBestMove = function(i, j, score) {
    if (main.debug) {
        main.log.debug('=> ' + score2str(i,j,score) + ' becomes 2nd best move');
        if (this.secondBestI !== NO_MOVE) main.log.debug(' (replaces ' + score2str(this.secondBestI, this.secondBestJ, this.secondBestScore) + ')');
    }
    this.secondBestScore = score;
    this.secondBestI = i; this.secondBestJ = j;
};

Frankie.prototype._foundBestMove = function(i, j, score) {
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

Frankie.prototype._keepBestMoves = function(i, j, score) {
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

// Returns the move chosen (e.g. c4 or pass)
// You can also check:
//   player.bestScore to see the score of the move returned
//   player.secondBestScore
Frankie.prototype.getMove = function () {
    this.numMoves++;
    this._prepareEval();

    // init grids (and mark invalid moves)
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    var i,j;
    for (j = 1; j <= this.gsize; j++) {
        for (i = 1; i <= this.gsize; i++) {
            if (!this.goban.isValidMove(i, j, this.color)) {
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
    return Grid.xy2move(this.bestI, this.bestJ);
};

Frankie.prototype.guessTerritories = function () {
    return this.ter.guessTerritories();
};

Frankie.prototype._prepareEval = function () {
    this.currentMove = this.goban.moveNumber();
    this.bestScore = this.secondBestScore = this.minimumScore;
    this.bestI = this.secondBestI = NO_MOVE;
    this.survey = null;

    this.inf.buildMap();
    this.ter.guessTerritories();

    // get "raw" group info
    this.boan.analyse(this.goban, null, this.color);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Frankie.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    main.log.debug(Grid.xy2move(i, j) + ' seen as blunder: ' + reason);
};
Frankie.prototype.isBlunderMove = function (i, j) {
    return this.stateGrid.yx[j][i] === sBLUNDER;
};

/** For tests */
Frankie.prototype._testMoveEval = function (i, j) {
    if (this.currentMove !== this.goban.moveNumber()) this.getMove();
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;
    // to get eval "again", set the state back to OK even if it got marked invalid later
    if (this.goban.isValidMove(i, j, this.color)) stateYx[j][i] = sOK;
    var score = 0, survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        scoreYx[j][i] = 0;
        h.evalBoard(stateYx, scoreYx);
        var s = scoreYx[j][i];
        if (s) survey[h.name] = s;
        score += s;
    }
    this.survey = survey;
    return score;
};

/** For tests */
Frankie.prototype.testMoveEval = function (i, j) {
    var score = this._testMoveEval(i, j);

    this._foundBestMove(i, j, score);
    this.secondBestI = NO_MOVE;
    return score;
};

/** For tests */
Frankie.prototype.testHeuristic = function (i, j, heuristicName) {
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

function surveySort(h1, h2) { return h2[1] - h1[1]; }

Frankie.prototype.getMoveSurveyText = function (move) {
    if (this.bestI === NO_MOVE) return '';
    if (move !== Grid.xy2move(this.bestI, this.bestJ)) return '';

    this._testMoveEval(this.bestI, this.bestJ);
    var survey = this.survey;
    var score = this.bestScore;
    if (!survey) return '';

    var sortedSurvey = [];
    for (var h in survey) {
        if (survey[h] === 0) continue;
        sortedSurvey.push([h, survey[h]]);
    }
    sortedSurvey.sort(surveySort);

    var txt = move + ' (' + score.toFixed(2) + ')\n';
    for (var n = 0; n < sortedSurvey.length; n++) {
        txt += '- ' + sortedSurvey[n][0] + ': ' + sortedSurvey[n][1].toFixed(2) + '\n';
    }
    return txt;
};

},{"../../Genes":10,"../../Grid":12,"../../main":73,"./AllHeuristics":58,"./boan/BoardAnalyser":67,"./boan/InfluenceMap":68,"./boan/PotentialTerritory":69,"./boan/ZoneFiller":70}],72:[function(require,module,exports){
'use strict';


function Constants() {
    this.EVEN = 0;
    this.ODD = 1;

    this.BORDER = null; // border of Goban's grid (Stones)
    this.GRID_BORDER = -99; // border of regular (numeric) grids

    // Colors
    this.EMPTY = -1;
    this.BLACK = 0;
    this.WHITE = 1;

    this.sOK = 0;
    this.sDEBUG = 1;
    this.sINVALID = -1;
    this.sBLUNDER = -2;

    this.NEVER = 0;
    this.SOMETIMES = 1; // e.g. depends who plays first
    this.ALWAYS = 2;

    this.DIR0 = 0;
    this.DIR3 = 3;
    this.UP = 0;
    this.RIGHT = 1;
    this.DOWN = 2;
    this.LEFT = 3;

    this.JP_RULES = 'Japanese';
    this.CH_RULES = 'Chinese';
}
module.exports = new Constants();


Constants.prototype.attachConstants = function (main) { //TODO remove this
    main.BORDER = null; // border of Goban's grid (Stones)
    main.GRID_BORDER = -99; // border of regular (numeric) grids

    // Colors
    main.EMPTY = -1;
    main.BLACK = 0;
    main.WHITE = 1;

    main.sOK = 0;
    main.sDEBUG = 1;
    main.sINVALID = -1;
    main.sBLUNDER = -2;

    main.NEVER = 0;
    main.SOMETIMES = 1; // e.g. depends who plays first
    main.ALWAYS = 2;

    main.DIR0 = 0;
    main.DIR3 = 3;
    main.UP = 0;
    main.RIGHT = 1;
    main.DOWN = 2;
    main.LEFT = 3;
};

},{}],73:[function(require,module,exports){
'use strict';

var pkg = require('../package.json');
var Logger = require('./Logger');
var constants = require('./constants');


function Main() {
    constants.attachConstants(this);

    this.debug = false;
    this.debugGroup = this.debugAi = this.debugBreed = false;

    this.appName = pkg.name;
    this.appVersion = pkg.version;

    this.isCiTest = this.isCoverTest = false;

    // Known AIs and default one
    this.ais = null;
    this.defaultAi = this.latestAi = this.previousAi = this.olderAi = null;

    this.ui = null;
    this.gtp = null;

    this.tests = null;
    this.testUi = null;

    this.log = new Logger();
}

/** Singleton "main" */
var main = new Main();
module.exports = main;


Main.prototype.initAis = function (ais) {
    this.ais = {};
    for (var i = 0; i < ais.length; i++) {
        var ai = ais[i];
        this.ais[ai.name] = ai.constr;
    }
    var latest = ais.length - 1;
    this.defaultAi = this.latestAi = ais[latest].constr;
    this.previousAi = latest >= 1 ? ais[latest - 1].constr : null;
    this.olderAi = latest >= 2 ? ais[latest - 2].constr : null;
};

Main.prototype.initTests = function (TestSeries, addAllTests) {
    this.tests = new TestSeries();
    addAllTests(this.tests);
};

//--- Misc Helpers

/** If function.name is not supported, this function returns this info.
 *  E.g. for this.constructor.name you can do main.funcName(this.constructor)
 */
main.funcName = function (func) {
    return func.name || func.toString().split(/ |\(/, 2)[1];
};

/** Shallow clone helper.
 *  Usual caution applies - please do some reading about the pitfalls if needed.
 */
main.clone = function (obj) {
    if (obj === null || obj === undefined) return obj;
    var clone;
    if (obj instanceof Array) {
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

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (head) {
        return this.substr(0, head.length) === head;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (tail) {
        return this.substr(this.length - tail.length) === tail;
    };
}

// TODO replace using toFixed() for float and ('0'+n).slice(-2) for int
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


//--- Array

main.newArray = function (size, initValue) {
    var a = new Array(size);
    for (var i = size - 1; i >= 0; i--) a[i] = initValue;
    return a;
};

main.newArray2 = function (numRows, numCols, initValue) {
    var yx = new Array(numRows);
    var emptyRow = yx[0] = main.newArray(numCols, initValue);
    for (var j = numRows - 1; j >= 1; j--) yx[j] = emptyRow.concat();
    return yx;
};

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

//TODO replace .clear() by .length = 0
Array.prototype.clear = function () {
    this.length = 0;
};

},{"../package.json":107,"./Logger":15,"./constants":72}],74:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var inherits = require('util').inherits;

var commands = {};

/** @class
 * GTP protocol parser. Speaks to a GtpEngine.
 * - input: gtp.runCommand(cmdline)
 * - output: engine.send(response)
 */
function Gtp() {
    this.engine = null;
    this.cpuTime = 0;
}
inherits(Gtp, EventEmitter);
module.exports = Gtp;

// Stone status
var ALIVE = Gtp.ALIVE = 1;
var SEKI =  Gtp.SEKI =  0;
var DEAD =  Gtp.DEAD = -1;


Gtp.prototype.init = function (engine) {
    this.engine = engine;
};

Gtp.prototype.runCommand = function (line) {
    var cmd = this._parseCommand(line);
    var fn = commands[cmd.command];
    if (!fn) return this.fail('unknown command ' + cmd.command);

    this.cmd = cmd;
    try {
        fn.call(this, cmd);
    } catch (exc) {
        console.error(exc.stack);
        this.fail('exception running ' + line + ': ' + exc);
    }
};

Gtp.prototype._parseRawLine = function (rawline) {
    var line = '';
    for (var i = 0; i < rawline.length; i++) {
        var c = rawline[i];
        if (c === '#') break;
        switch (c) {
        case '\t':
            line += ' ';
            break;
        default:
            if (c < ' ' || c.charCodeAt() === 127) break;
            line += c;
        }
    }
    return line;
};

Gtp.prototype._parseCommand = function (rawline) {
    var cmd = {};
    var w = this._parseRawLine(rawline).split(' ');
    var i = 0;

    if (~~w[i] || w[i][0] === '0') {
        cmd.id = w[i++];
    } else {
        cmd.id = '';
    }
    cmd.command = w[i++];
    cmd.args = w.slice(i);
    return cmd;
};

Gtp.prototype.success = function (response) {
    var msg = '=' + this.cmd.id;
    if (response) msg += ' ' + response;
    msg += '\n\n';
    this.engine.send(msg);
};

Gtp.prototype.fail = function (errorMsg) {
    var id = this.cmd ? this.cmd.id : '';
    var msg = '?' + id + ' ' + errorMsg + '\n\n';
    this.engine.send(msg);
};

function commandHandler(cmdName, fn) {
    commands[cmdName] = fn;
}

commandHandler('protocol_version', function () {
    return this.success('2');
});

commandHandler('name', function () {
    return this.success(this.engine.name());
});

commandHandler('version', function () {
    return this.success(this.engine.version());
});

commandHandler('known_command', function (cmd) {
    return this.success(commands[cmd.args[0]] ? 'true' : 'false');
});

commandHandler('list_commands', function () {
    var cmds = '';
    for (var command in commands) {
        cmds += command + '\n';
    }
    return this.success(cmds.chomp());
});

commandHandler('quit', function () {
    // Doc says full response must be sent/processed before we close the connection
    this.success('');
    this.engine.quit();
    this.emit('quit');
});

commandHandler('boardsize', function (cmd) {
    var size = ~~cmd.args[0];
    if (!this.engine.initBoardSize(size)) return this.fail('unacceptable size');
    return this.success();
});

commandHandler('clear_board', function () {
    this.engine.clearBoard();
    return this.success();
});

commandHandler('komi', function (cmd) {
    var new_komi = parseFloat(cmd.args[0]);
    if (isNaN(new_komi)) return this.fail('syntax error');
    this.engine.setKomi(new_komi);
    return this.success();
});

function parseColor(color) {
    if (typeof color !== 'string') return null;
    switch (color.toLowerCase()) {
    case 'b': case 'black': return 'b';
    case 'w': case 'white': return 'w';
    default: return null;
    }
}

function parseMove(color, vertex) {
    color = parseColor(color);
    if (!color) return null;

    if (typeof vertex !== 'string' || vertex.length < 2) return null;
    vertex = vertex.toLowerCase();
    if (vertex !== 'pass') {
        var col = vertex[0];
        if (col < 'a' || col > 'z' || col === 'i') return null;
        var row = parseInt(vertex.substr(1));
        if (row < 1 || row > 25) return null;
        vertex = col + row;
    }
    return { color: color, vertex: vertex };
}

commandHandler('play', function (cmd) {
    var move = parseMove(cmd.args[0], cmd.args[1]);
    if (!move) return this.fail('syntax error');

    if (!this.engine.playMove(move.color, move.vertex)) {
        return this.fail('illegal move');
    }
    return this.success();
});

commandHandler('undo', function () {
    if (!this.engine.undo()) return this.fail('cannot undo');
    return this.success();
});

commandHandler('genmove', function (cmd) {
    var color = parseColor(cmd.args[0]);
    if (!color) return this.fail('syntax error');

    var vertex = this.engine.genMove(color);
    return this.success(vertex.toUpperCase());
});

// Reg test command
commandHandler('reg_genmove', function (cmd) {
    var color = parseColor(cmd.args[0]);
    if (!color) return this.fail('syntax error');

    var t0 = Date.now();
    var vertex = this.engine.regGenMove(color);
    this.cpuTime += Date.now() - t0;
    return this.success(vertex.toUpperCase());
});

// Reg test command (only in node)
commandHandler('loadsgf', function (cmd) {
    if (typeof window !== 'undefined') return this.fail('loadsgf unavailable here');
    var fname = cmd.args[0];
    var game = fs.readFileSync(fname, { encoding: 'utf8' });
    if (!game) return this.fail('cannot load file ' + fname);

    var upToMoveNumber = cmd.args[1];
    var err = this.engine.loadSgf(game, upToMoveNumber);
    if (err) return this.fail('loadsgf ' + fname + ' failed: ' + err);
    return this.success();
});

// Reg test command
commandHandler('cputime', function () {
    var elapsed = this.cpuTime;
    this.cpuTime = 0;
    return this.success(elapsed / 1000);
});

// Tournament command
commandHandler('final_score', function () {
    var diff = this.engine.computeScore(); // diff is Black - White
    if (diff === null) return this.fail('cannot score');

    var score;
    if (diff === 0) {
        score = '0';
    } else if(diff < 0) {
        score = 'W+' + (-diff);
    } else {
        score = 'B+' + diff;
    }
    return this.success(score); // e.g. W+2.5 or B+31 or 0
});

var stoneStatus = {
    dead: DEAD,
    seki: SEKI,
    alive: ALIVE
};

// Tournament command
commandHandler('final_status_list', function (cmd) {
    var status = stoneStatus[cmd.args[0]]; // dead, alive or seki
    if (status === undefined) return this.fail('syntax error: ' + cmd.args[0]);

    var vertexes = this.engine.getStonesWithStatus(status);
    return this.success(vertexes.join('\n').toUpperCase());
});

},{"events":2,"fs":1,"util":6}],75:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var CONST = require('../constants');
var main = require('../main');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var Gtp = require('./Gtp');
var ScoreAnalyser = require('../ScoreAnalyser');

var WHITE = CONST.WHITE, BLACK = CONST.BLACK, EMPTY = CONST.EMPTY;
var DEAD_COLOR = Grid.DEAD_COLOR;
var DEAD = Gtp.DEAD, ALIVE = Gtp.ALIVE;

var GAME_NOT_STARTED = '00';


/** @class
 * Interface between a game engine and Gtp.
 * @param {GameLogic} game
 */
function GtpEngine(game) {
    this.game = game || new GameLogic();
    this.scorer = new ScoreAnalyser(this.game);
    this.players = [];
    this.scoreComputedAt = null;
    this.AiClass = main.defaultAi;
}
module.exports = GtpEngine;


GtpEngine.prototype.quit = function () {
    console.error('GTP quit command received'); // cannot be on stdout
};

GtpEngine.prototype.send = function (msg) {
    // stdout is default; + we remove 1 \n from the msg since log method will add 1
    console.log(msg.chomp());
};

GtpEngine.prototype.refreshDisplay = function () {
};

GtpEngine.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    player = this.players[color] = new this.AiClass(this.game, color);
    return player;
};

GtpEngine.prototype.name = function () {
    return this.AiClass.publicName;
};

GtpEngine.prototype.version = function () {
    return this.AiClass.publicVersion;
};

/** Must be called BEFORE initBoardSize/clearBoard
 * @param {string} rulesName - e.g. Chinese, Japanese or CGOS
 */
GtpEngine.prototype.setRules = function (rulesName) {
    this.game.setRules(rulesName);
};

GtpEngine.prototype.initBoardSize = function (size) {
    var ok = this.game.newGame(size);
    this._beginGame();
    return ok;
};

GtpEngine.prototype.clearBoard = function () {
    var game = this.game;
    game.newGame(game.goban.gsize, game.handicap, game.komi);
    this._beginGame();
};

GtpEngine.prototype.setKomi = function (komi) {
    this.game.komi = komi;
};

GtpEngine.prototype.loadSgf = function (game, moveNumber) {
    var errors = [];
    if (!this.game.loadSgf(game, errors, moveNumber)) return errors[0];
    this._beginGame();
    return '';
};

GtpEngine.prototype.regGenMove = function (color) {
    if (!this._forceCurPlayer(color)) return GAME_NOT_STARTED;
    return this.players[this.game.curColor].getMove();
};

GtpEngine.prototype.genMove = function (color) {
    if (!this._forceCurPlayer(color)) return GAME_NOT_STARTED;
    return this._letAiPlay();
};

GtpEngine.prototype.playMove = function (color, vertex) {
    if (!this._forceCurPlayer(color)) return false;
    if (!this.game.playOneMove(vertex)) return false;
    this.refreshDisplay();
    return true;
};

GtpEngine.prototype.undo = function () {
    return this.game.playOneMove('half_undo');
};

GtpEngine.prototype.computeScore = function () {
    this.scoreComputedAt = this.game.goban.getPositionSignature();
    return this.scorer.computeScoreDiff(this.game);
};

// status: -1: dead, 0: seki, +1: alive
GtpEngine.prototype.getStonesWithStatus = function (status) {
    var goban = this.game.goban;
    if (goban.getPositionSignature() !== this.scoreComputedAt) {
        this.computeScore();
    }
    var scoringYx = this.scorer.getScoringGrid().yx;
    var stones = [];
    for (var j = goban.gsize; j >= 1; j--) {
        for (var i = goban.gsize; i >= 1; i--) {
            var s = goban.stoneAt(i, j);
            if (s.color === EMPTY) continue;

            switch (scoringYx[j][i]) {
            case DEAD_COLOR + WHITE:
            case DEAD_COLOR + BLACK:
                if (status === DEAD) stones.push(s.asMove());
                break;
            default:
                if (status === ALIVE) stones.push(s.asMove());
            }
            // TODO: handle seki status when we can
        }
    }
    return stones;
};


//--- private

GtpEngine.prototype._beginGame = function () {
    this.refreshDisplay();
    // Initialize both AIs
    this.getAiPlayer(BLACK).prepareGame();
    this.getAiPlayer(WHITE).prepareGame();
};

GtpEngine.prototype._forceCurPlayer = function (color) {
    if (!this.players[BLACK]) return false;
    this.game.curColor = color === 'b' ? BLACK : WHITE;
    return true;
};

GtpEngine.prototype._letAiPlay = function () {
    var move = this.players[this.game.curColor].getMove();
    this.game.playOneMove(move);
    return move;
};

},{"../GameLogic":9,"../Grid":12,"../ScoreAnalyser":16,"../constants":72,"../main":73,"./Gtp":74}],76:[function(require,module,exports){
'use strict';

//var main = require('../main');
var GtpEngine = require('./GtpEngine');
var inherits = require('util').inherits;


/** @class
 * GTP Engine interface for UI (extends GtpEngine)
 */
function UiGtpEngine(ui) {
    GtpEngine.call(this, ui.game);
    this.ui = ui;
}
inherits(UiGtpEngine, GtpEngine);
module.exports = UiGtpEngine;


UiGtpEngine.prototype.quit = function () {
    this.ui.message('GTP quit command received');
};

UiGtpEngine.prototype.send = function (msg) {
    console.log(msg); // TODO UI will probably connect via socket etc.
};

UiGtpEngine.prototype.getAiPlayer = function (color) {
    return this.ui.getAiPlayer(color);
};

UiGtpEngine.prototype.refreshDisplay = function () {
    this.ui.refreshBoard();
};

UiGtpEngine.prototype._letAiPlay = function () {
    return this.ui.letAiPlay();
};

},{"./GtpEngine":75,"util":6}],77:[function(require,module,exports){
'use strict';

var CONST = require('../constants');
var main = require('../main');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var inherits = require('util').inherits;
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestAi(testName) {
    TestCase.call(this, testName);
}
inherits(TestAi, TestCase);
module.exports = TestAi;


TestAi.prototype.initBoard = function (size, handicap, rules) {
    var game = this.game = new GameLogic();
    game.setRules(rules === 'CH' ? CONST.CH_RULES : CONST.JP_RULES);
    game.newGame(size, handicap || 0);
    this.goban = game.goban;
    this.players = [
        new main.defaultAi(game, BLACK),
        new main.defaultAi(game, WHITE)
    ];
    game.setPlayer(BLACK, this.players[BLACK].name);
    game.setPlayer(WHITE, this.players[WHITE].name);
};

TestAi.prototype.logErrorContext = function (player, move) {
    if (this.isBroken) return;
    main.log.error(this.goban.toString());
    main.log.error(player.getMoveSurveyText(move));
};

TestAi.prototype.checkScore = function(player, color, move, score, expScore, heuristic) {
    var range = 0.25 * expScore + 0.5;
    if (this.check(Math.abs(score - expScore) <= range)) return;

    var msg = Grid.colorName(color) + '-' + move +
        ' got ' + score.toFixed(3) + ' instead of ' + expScore +
        (heuristic ? ' for ' + heuristic : '');
    this.logErrorContext(player, move);
    this.fail(msg);
};

// if expEval is null there is not check: value is returned
TestAi.prototype.checkEval = function (move, expEval, heuristic) {
    var coords = Grid.move2xy(move);
    var i = coords[0], j = coords[1];
    
    var color = this.game.curColor;
    var player = this.players[color];
    var score;
    if (heuristic) {
        score = player.testHeuristic(i, j, heuristic);
    } else {
        score = player.testMoveEval(i, j);
    }
    if (expEval !== null && expEval !== undefined) {
        this.checkScore(player, color, move, score, expEval, heuristic);
    }
    return score;
};

TestAi.prototype._parseMove = function (expMove) {
    if (expMove[0] === 'B' || expMove[0] === 'W') {
        this.assertEqual(expMove[0], this.game.curColor === BLACK ? 'B' : 'W');
        expMove = expMove.substr(1);
    }
    return expMove;
};

TestAi.prototype._moveOrValue = function (mv) {
    if (mv[0] > '9') {
        mv = this._parseMove(mv);
        var player = Grid.colorName(this.game.curColor);
        var score = this.checkEval(mv);
        return [score, player + '-' + mv + '/' + score.toFixed(2)];
    } else {
        return [parseFloat(mv), mv];
    }
};

// Checks that move1 is better than move2|value
TestAi.prototype.checkMoveIsBetter = function (move1, move2) {
    var m1 = this._moveOrValue(move1), m2 = this._moveOrValue(move2);
    if (this.check(m2[0] < m1[0])) return;

    var msg = m1[1] + ' should have been greater than ' + m2[1];
    this.fail(msg);
};

/** Lets AI play and verify we got the right move.
 *  We abort the test if the wrong move is played
 * (since we cannot do anything right after this happens).
 */
TestAi.prototype.playAndCheck = function (expMove, expEval, doNotPlay) {
    expMove = this._parseMove(expMove);
    if (doNotPlay && expEval) return this.checkEval(expMove, expEval);
    var color = this.game.curColor;
    var player = this.players[color];

    var move = player.getMove();
    var score = player.bestScore;
    if (move !== expMove) {
        this.logErrorContext(player, move);
        // if expMove got a very close score, our test scenario bumps on twin moves
        if (expMove !== 'pass' && Math.abs(this.checkEval(expMove) - score) < 0.001) {
            main.log.error('CAUTION: ' + expMove + ' and ' + move + 
                ' are twins or very close => consider modifying the test scenario');
        }
        expMove = Grid.colorName(color) + '-' + expMove;
        this.assertEqual(expMove, move); // test aborts here
    }
    if (expEval) this.checkScore(player, color, move, score, expEval);
    else this.check(true); // just counts the check

    if (!doNotPlay) this.game.playOneMove(move);
};

TestAi.prototype.checkMovesAreEquivalent = function (moves) {
    var score0 = this.checkEval(moves[0]).toFixed(3);
    for (var m = 1; m < moves.length; m++) {
        var score = this.checkEval(moves[m]).toFixed(3);
        if (this.check(score0 === score)) continue;

        var color = this.game.curColor;
        this.fail(Grid.colorName(color) + '-' + moves + ' should be equivalent but ' +
            moves[m] + ' got ' + score + ' instead of ' + score0);
    }
    return true;
};

// Verify the move played is one of the given moves.
// This can only be the last check of a series (since we are not sure which move was played)
TestAi.prototype.playAndCheckMoveIsOneOf = function (moves) {
    var color = this.game.curColor;
    var player = this.players[color];
    var move = player.getMove();
    if (this.check(moves.indexOf(move) >= 0)) return; // one of the given moves was played => GOOD

    var score = player.bestScore.toFixed(3);
    this.fail(Grid.colorName(color) + '-' + move + ' got ' + score +
        ' so it was played instead of one of ' + moves);
};

TestAi.prototype.checkMoveIsBad = function (move) {
    var score = this.checkEval(move);
    if (this.check(score <= 0.1)) return;

    var color = this.game.curColor;
    this.fail(Grid.colorName(color) + '-' + move + ' should be a bad move but got ' + score.toFixed(3));
};

function parseBinaryOp(op, check) {
    var moves = check.split(op);
    if (moves.length > 2) throw new Error(op + ' operator on more than 2 moves');
    return moves;
}

// Parses and runs a series of checks
TestAi.prototype.runChecks = function (checkString) {
    var checks = checkString.split(/, |,/), c, moves;
    for (var n = 0; n < checks.length; n++) {
        var check = checks[n];
        var doNotPlay = check[0] === '?';
        if (doNotPlay) check = check.substr(1);

        if (check[0] === '!') {
            this.checkMoveIsBad(check.substr(1));
        } else if (check[0] === '#') {
            this.game.playOneMove(check.substr(1));
        } else if (check.indexOf('>') >= 0) {
            moves = parseBinaryOp('>', check);
            this.checkMoveIsBetter(moves[0], moves[1]);
        } else if (check.indexOf('<') >= 0) {
            moves = parseBinaryOp('<', check);
            this.checkMoveIsBetter(moves[1], moves[0]);
        } else if (check.indexOf('=') >= 0) {
            this.checkMovesAreEquivalent(check.split('='));
        } else if (check.indexOf('|') >= 0) {
            this.playAndCheckMoveIsOneOf(check.split('|'));
        } else if (check.indexOf('~') >= 0) {
            c = check.split('~');
            this.playAndCheck(c[0], parseFloat(c[1]), doNotPlay);
        } else {
            this.playAndCheck(check, null, doNotPlay);
        }
    }
};

TestAi.prototype.checkGame = function (moves, checks, gsize, rules) {
    this.initBoard(gsize || 5, 0, rules);
    this.game.loadMoves(moves);
    this.runChecks(checks);
};

TestAi.prototype.checkGameTODO = function (moves, checks, gsize, rules) {
    this.startBrokenTest();
    this.checkGame(moves, checks, gsize, rules);
};

//--- Tests are below

TestAi.prototype.testAiInternals = function () {
    this.initBoard(5);
    this.assertEqual('c3 (6.40)\n- Spacer: 6.40\n', this.players[BLACK].getMoveSurveyText('c3', true));
};

TestAi.prototype.testEyeMaking1 = function () {
    // ++@@@
    // +@@OO
    // +@OO+
    // +@@O*
    // +@OO+
    this.checkGame('b3,d3,b2,c3,c2,d2,c4,c1,b1,d1,b4,d4,d5,pass,e5,e4,c5', 'e2');
};

TestAi.prototype.testEyeClosing = function () {
    // a4 saves or kills white group
    this.checkGame('a2,b4,b2,c4,c2,d4,d2,e4,e2,b5,a3,c5', 'a4>30, #pass, a4>30, a4');
};

TestAi.prototype.testClosingEyeWouldFail = function () {
    // ++@@+
    // ++@O+
    // ++@O+
    // +@@O+
    // +@OO+
    // e4 would not save W (probably nothing will, actually)
    this.checkGameTODO('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5', 'e4<2');
};

TestAi.prototype.testEyeMaking_3inCorner = function () {
    // OOO+*
    // @@OO+
    // +@@OO
    // ++@@O
    // +++@@
    this.checkGame('b3,d3,c3,d4,c2,c4,d2,e2,b4,b5,d1,a5,a4,c5,e1,e3,pass', 'e5');
};

TestAi.prototype.testEyeMaking_3withPrisoners = function () {
    // only a4 is mandatory to save 1 W eye; a3 is less urgent
    this.checkGame('c4,b4,d4,b3,a2,b5,b2,c5,c2,c3,d2,d3,b1,e3,d1',
        '?e5~1.3, a3<15, #pass, a3, a4>23'); //a3 is best considering NE black is dead
};

TestAi.prototype.testEyeMaking_4inCorner = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1,b4,a4,a5,a3',
        'd5>19,' + // e5 here would work but we don't give it points
        '#pass, !e5, d5>16, d5, #c5, e5'); // W could play e5 or c5 as desperate moves; corner e5 is better
};

TestAi.prototype.testEyeMaking_4attacked1 = function () {
    this.checkGame('Bb5,c5,b4,d5,c4,d4,c3,d3,c2,d2,c1,d1,pass,e1,e4',
        'e3>16');
};

TestAi.prototype.testEyeMaking_4attacked2 = function () {
    this.checkGame('Bb5,c5,b4,d5,c4,d4,c3,d3,c2,d2,c1,d1,pass,e1,e3',
        'e2<1, e4>16');
};

TestAi.prototype.testEyeMaking_4inTshape = function () {
    this.checkGame('a2,a4,b3,b4,a3,c4,c3,d4,c2,d3,d2,e3,d1,e2,e1', 'b1>19, #pass, b1>19');
};

TestAi.prototype.testEyeMaking_4inTshape2 = function () {
    this.checkGame('b1,a4,a2,b4,b3,c4,c3,d4,d3,e4,e2,e3,d1,a3,a1,pass,e1',
        'c2>21, #pass, c2>21'); //TODO c2 should be around 22, not 30 - band cost counts empties 3 times
};

TestAi.prototype.testEyeMaking_4inTshape3 = function () {
    // Similar to above but W is so weak its 2 groups can be killed hence making eyes in c2 become less important
    this.checkGame('b1,a4,a2,b5,b3,c5,c4,d5,d3,e4,b4,e5,e3,pass,e2,pass,d1,pass,e1,pass,a1,pass,c3',
        '?c2~36, #pass, ?c2~36, a3=d4');
};

TestAi.prototype.testEyeMaking_shape5 = function () {
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,e4,c5,b2,a2,pass,a1,b1',
        'e2>21, #pass, e2>21');
};

TestAi.prototype.testEyeMaking_shape5asPlus = function () {
    this.checkGame('b1,a4,a2,b5,b3,c5,c4,d5,d3,e4,b4,e5,e3,pass,e2,pass,d1,pass,e1,pass,a1,f3,d4,a5,a3,f2,f1,g2,g1,f4',
        'c2>35, #pass, c2>35', 7);
};

TestAi.prototype.testEyeMaking_shape5safe = function () {
    // "t" shape of 5; no move needed, group is alive
    // Verify we defend if other AI attacks in b1 or c1
    this.checkGame('a3,a4,b3,b4,a2,c4,c3,d4,c2,d3,d2,e3,e2,pass,e1',
        '#c1, b1>18');
    this.checkGame('a3,a4,b3,b4,a2,c4,c3,d4,c2,d3,d2,e3,e2,pass,e1',
        '!b1, !c1, #b1, c1>18');
};

TestAi.prototype.testEyeMaking_shape6 = function () {
    this.checkGame('c3,b4,c4,b3,d4,b2,c2,b1,c1,b5,e4,c5,e5,d5',
        'd2>21, #pass, d2>21, d2');
};

TestAi.prototype.testEyeMaking_shape6_attacked = function () {
    // Same as above but White attacks first - it should win!
    this.checkGame('c3,b4,c4,b3,d4,b2,c2,b1,c1,b5,e4,c5,e5,pass,d5',
        'd2>21, #pass, d2>21, d2');
};

TestAi.prototype.testEyeMaking_stoneNeedsConnect = function () {
    // Black a5 left as is would be captured, and full black group would die
    // @OOO+
    // +@@O+
    // +@+O+
    // @@+O+
    // +@+O+
    this.checkGame('a2,d3,b2,d4,b1,d2,b3,d1,a5,b5,b4,c5,c4,d5',
        'a4>23, #pass, a4>23');
};

TestAi.prototype.testEyeMaking_stoneNeedsConnect2 = function () {
    // Simple flip of above game
    this.checkGame('a4,d3,b4,d2,b5,d4,b3,d5,a1,b1,b2,c1,c2,d1',
        'a2>23, #pass, a2>23');
};

TestAi.prototype.testEyeMaking_sideEyeMustBeClosed = function () {
    // Same as above but no black stone in a5
    this.checkGame('a2,d3,b2,d4,b1,d2,b3,d1,pass,b5,b4,c5,c4,d5',
        'a4>19, #pass, a4>19'); // TODO: Shaper should find 19 here
};

TestAi.prototype.testRace1 = function () {
    // W loses the race because j1 & g2
    this.checkGameTODO('e5,e3,e4,d6,g6,e6,f7,f5,f6,f4,d4,c5,f3,g4,e2,c3,d3,c4,c2,h5,g3,h4,h3,b2,j4,e7,e8,c1,d7,d2,c7,b6,b7,e1,f1,d1,a6,c6,b5,b4,h6,a5,a7,g1,f2,h2,j2,d5,e3,j5',
        'j6<2,j3>20,j3,!g2,!j1,!h1,#pass,j6', 9);
};

TestAi.prototype.testConnect_misc2 = function () {
    this.checkGameTODO('e5,e3,e4,d6,g6,e6,f7,f5,f6,f4,d4,c5,f3,g4,e2,c3,d3,c4,c2,h5,g3,h4,h3,b2,j4,e7,e8,c1,d7,d2,c7,b6,b7,e1,f1,d1,a6,c6,b5,b4,h6,a5,a7,g1,f2,h2,j2,d5,e3,j5,j3,h1,j6,g8,f8,b8,h7,c8',
        '!d9,d8>15,d8', 9);
};

TestAi.prototype.testPushFromDeadGroup = function () {
    // white group is dead so pusher should not speak up here; a2 is good white threat though
    this.checkGameTODO('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,pass', 'a1<1, a2>15');
};

TestAi.prototype.testWrongSaviorAlongBorder = function () {
    this.checkGameTODO('e1,e2,d2', 'c3');
};

TestAi.prototype.testWrongSaviorInCorner = function () {
    this.checkGame('e1,e2,d2,e3,d3,e4,d4', 'b3'); // d1 would be wrong
};

TestAi.prototype.testWrongSaviorInsteadOfKill = function () {
    this.checkGame('e1,d1,d2,c2,c1,b1,d1', 'd3');
};

TestAi.prototype.testWrongSaviorGoingTowardWall = function () {
    this.checkGame('b2,b3,c2,c3,pass,d2,pass,a2', '!b1,!c1,?d1~0.2,d4~0.2');
};

TestAi.prototype.testBorderLock = function () {
    this.checkGameTODO('d4,c3,c4,d3,e3,e2,e4', 'd2'); //should be c2?
};

TestAi.prototype.testCornerKillIgnored = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++@+++
    //   abcdefghj
    this.checkGame('j8,j9,d7,c5,f4,pass,g6,pass', 'h9<1.4, h8<1.6, c3>5, e3>5, c3|e3', 9);
};

TestAi.prototype.testWrongAttack = function () {
    // 5 +++++++++
    // 4 +@@@@O+++
    // 3 ++O@O@O++
    // 2 ++O@O@+++
    // 1 +++OO++++
    //   abcdefghj
    // f3-f2 cannot be saved in g2
    // c1 and f1 are wrong attacks
    this.checkGameTODO('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1',
        '?d7~8, ?d7=f7, g2',
        9);
};

TestAi.prototype.testWrongAttack2 = function () {
    // white-c6 would be great... if it worked; this is a wrong move here
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b5,d1,pass,g4,pass,g6,pass,g7,pass,f7,pass,e7,pass,d7,c7',
        'g5,c6,pass,pass', 7);
};

TestAi.prototype.testHunter1 = function () {
    // h7 is a wrong "good move"; white can escape with h8
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 +++@++++@
    //   abcdefghj
    this.checkGame('d4,j7,j8,j6,j5,j9,j4,pass,h8,pass',
        '?h6~14.6, ?h7~13.6,' + // h7 is OK too but capturing same 2 stones in a ladder
        '#h6, #h7, g7', // force black in h6 - choice between h6 and h7 may vary due to smaller differences
        9);
};

TestAi.prototype.testHunterChaseFailsBecauseOfAtari = function () {
    // Black b6 is atari before the chase starts in a1; a1 is not worth much
    this.checkGame('d4,f6,c7,d6,g3,e5,e3,c5,b6,b5,d8,f4,f3,g4,e7,h3,c3,f7,f8,g2,b4,g7,g8,h8,f2,h2,g1,g9,e9,a4,h1,b3,b2,c4,d5,a2,c2,j2,b1,a6,a7,c6',
        '?a1~2.3', 9);
};

TestAi.prototype.testHunterCountsSavedGroupsToo = function () {
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,g2',
        'g1>g6, g1', 7);
};

TestAi.prototype.testHunterCountsSavedGroupsToo2 = function () {
    this.checkGame('e5,c6,d3,g4,g3,f7,c4,e4,e3,d5,f3,f4,c5,e6,g5,f5,h4,b5,g6,b4,b3,g7,h7,h8,h6,j7,d4,j6,f6',
        'h5>e5, h5', 9); // killing in h5 saves too
};

TestAi.prototype.testHunterDoubleAttack = function () {
    // Hunter must see double threat: 'b4' not good because white group dies first
    this.checkGameTODO('d4,d6,f5,g7,g5,g3,e5,d2,c3,c5,c2,d3,c4,f4,d5,e7,e6,c6,f6,f7,h6,e4,g4,h4,h5,h3',
        'e3>13, #e3, e2, f3, f2', 9);
};

TestAi.prototype.testLadder1 = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghj
    this.checkGameTODO('j9,j7,j8,j6,j5,a9,j4,pass', 'h7', 9);
    // we force white to run the ladder to verify black tracks to kill
    this.runChecks('!h6, #h6, !h8, g6>20, g6');
    this.runChecks('!h5, #h5, h4>25, h4'); // h4 big because black j4-j5 is now threatened
    this.runChecks('#g5, !h8, f5');
};

TestAi.prototype.testLadderBreaker1 = function () {
    // 9 O++++++++
    // 8 O++++++++
    // 7 O+++O++++
    // 6 +++++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghj
    // Ladder breaker a7 does not work since the whole group dies
    this.checkGameTODO('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5',
        '?b6~0.5, ?c6~14.3, d6', 9);
};

TestAi.prototype.testLadderBreaker2 = function () {
    // 9 O++++++++
    // 8 OOO++++++
    // 7 O+++O++++
    // 6 ++*++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghj
    // Ladder breaker are a7 and e7
    // What is sure is that neither b6 nor c6 works
    this.checkGameTODO('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8',
        'c6<1, b6<1, ?g4~8, ?g4=g6, ?g6=f3, d6', 9); // g4 takes 8 from Spacer
};

TestAi.prototype.testSeeDeadGroup = function () {
    // 9 +@++@@@@O
    // 8 +@@@@@@OO
    // 7 @@+@+@@O+
    // 6 +@+@++@O+
    // 5 +@+@@+@O+
    // 4 @@@+++@OO
    // 3 @OO@@@@O+
    // 2 OO+OOO@OO
    // 1 ++O@@@@O+
    //   abcdefghj
    // Interesting here: SW corner group O (white) is dead. Both sides should see it and play accordingly.
    this.checkGameTODO('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9',
        '!c2, pass, pass', 9); // white SW group is dead
};

TestAi.prototype.testBorderDefense = function () {
    // 7 +++++++
    // 6 +++@@@+
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3',
        '?g5~4,' + // no kill for black in g5 but terr gain; 3 points, I think
        '?b5~8,' + // b6 should be > b5 score: black can save a5 in b6
        'b6',
        7);
};

TestAi.prototype.testBorderAttackAndInvasion = function () {
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO@
    // 4 O@@@O+O
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see attack in b5 with territory invasion
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass',
        'b5<10, b5', 7); // actual cost is 6 points
};

TestAi.prototype.testBorderAttackAndInvasion2 = function () {
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // AI should still choose attack in b5
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6',
        'b5<10, b5', 7);
};

TestAi.prototype.testSaveEyeAndLives1 = function () {
    // B should secure 2 eyes with c7; if B-b7, W kills by throw-in c7
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,B-pass,b5,c6,b6',
        'c7>20, #b7, c7>20', 7);
};

TestAi.prototype.testBorderClosing = function () {
    // 7 +++++++
    // 6 +@+@@@@
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see f4 is dead inside white territory if g5 is played (non trivial)
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g6',
        'g5', 7);
};

TestAi.prototype.testEndMoveTerrGain1 = function () {
    // 7 +++++++
    // 6 +++@@@@
    // 5 @@+@OO+
    // 4 O+@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // g4 is a valid move for black worth 5 pts in sente. Note d2 is dead.
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass',
        'g4~5.2, g3~0.7, g5, e3', 7);
};

TestAi.prototype.testKillingSavesNearbyGroupInAtari = function () {
    // 7 +++++++
    // 6 +@+@@@+
    // 5 @++@OO@
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5',
        '?e3~6, g4~9.5, g6~2, !c7', 7);
};

TestAi.prototype.testKillingSavesToo = function () {
    this.checkGame('e5,c6,d3,g4,g3,f7,c4,e4,e3,d5,f3,f4,c5,e6,g5,f5,h4,b5,g6,b4,b3,g7,h7,h8,h6,j7,d4,j6,f6,e5,h5,h3,h2,j3,j2,j5,j4,h3',
        'j8', 9); // not j3
};

TestAi.prototype.testAiSeesSnapbackAttack1 = function () {
    // 5 O@+O+
    // 4 O@*@@  <-- here
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4', 'c5<0, c4, #c5, c4');
};

TestAi.prototype.testAiSeesSnapbackAttack2 = function () {
    this.checkGameTODO('d4,f6,c7,f4,e3,f3,f2,e5,c5,d6,d8,d7,f8,f7,g3,g4,h4,e8,g8,c8,c6,g5,h5,f9,h7,g7,h8,h6,g9,j7,b8,d9,e9,j6,j8,b9,b7,c3,b4,j5,h3,j4,d2,j3,b2,h2,g2,h1,c2,g1,b3,f1,e2,e1,d3,d1,c1',
        '?j2,#pass,j2', 9);
};

TestAi.prototype.testSnapbackFails = function () {
    // 7 O@+OO++
    // 6 O@+@@++
    // 5 OO@@+++
    // 4 *@@++++  <-- here a4 kills so snapback is irrelevant
    // 3 ++++O++
    //   abcdefg
    // Snapback c6 is bad idea since black-a4 can kill white group
    this.checkGameTODO('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6',
        '!c6, !f7,' + // f7 is bad since d7-e7 are dead
        '!a4', // white NW group cannot escape
        7); 
};

TestAi.prototype.testAiSeesKillingBringSnapback = function () {
    // 5 O@*OO  <-- c5 is bad idea for Black
    // 4 O@O@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // c5 is a blunder (b2 seems OK)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4', '!c5');
};

TestAi.prototype.testSeesAttackNoGood = function () {
    // 5 O@@OO
    // 4 O@+@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // NB: we could use this game to check when AI can see dead groups
    this.checkGameTODO('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5',
        'c4~10, !c5'); // c4 kills 3 and saves 2 + 1 (disputable) space in black territory
};

TestAi.prototype.testPusher1 = function () {
    // 7 ++O++++
    // 6 ++O@+++
    // 5 ++O++++
    // 4 +@@@+++
    // 3 +++++++
    // 2 +++++++
    // 1 +++++++
    //   abcdefg
    this.checkGameTODO('d4,c5,d6,c7,c4,c6,b3,b4,c3,b5,a3',
        '!e7, ?e5~0.5, ?e3~1.3, d5>a4, d5>6, #pass,' + // forces W-pass
        'd5>6, d5',
        // TODO 'a4, a6'
        7);
};

TestAi.prototype.testPusher2 = function () {
    // 7 +++++++++
    // 6 ++OO@+@++
    // 5 ++O@@++++
    // 4 ++@OO++++
    // 3 ++@@O+O++
    // 2 +++@+++++
    // 1 +++++++++
    //   abcdefghj
    this.checkGameTODO('e5,g3,c3,e3,g6,d4,d5,c5,c4,d6,e6,c6,d2,e4,d3',
        'f5<1,' + // f5 connection with e4 is not great
        '?e2~2.4, ?g5~1.3', // FIXME: e2 & g5 should be bigger (invasion blocker's job)
        9);
};

TestAi.prototype.testPusherInC = function () {
    // White has no interest pushing into "C" shape (beside taking 1 life but it can wait)
    this.checkGame('b1,c1,a1,c2,a2,c3,a3,c4,b3', 'b2<0.5, b4>10, b4');
};

TestAi.prototype.testPushOnFakeEye_DyingGroupJp = function () {
    // B is dead; W should not push
    this.checkGame('Bd2,c3,d3,c2,c1,c4,b2,d4,b3,b4,e4,a4,a3,e2,d5,c5,a1,e5,d1,e3',
        'pass,pass');
};

TestAi.prototype.testPushOnFakeEye_DyingGroupCh = function () {
    // Only with Chinese rules W should push; B is dead anyway
    this.checkGameTODO('Bd2,c3,d3,c2,c1,c4,b2,d4,b3,b4,e4,a4,a3,e2,d5,c5,a1,e5,d1,e3',
        'b1,e4,pass,e1,pass,a2', 5, 'CH');
};

TestAi.prototype.testBlockOnBorder1 = function () {
    this.checkGameTODO('b2,b3,c2,c3,d2,d3,e2,e3,a3', 'a4>b4, a4');
};

TestAi.prototype.testBlockOnBorder2 = function () {
    // Similar as above but here Shaper is not involved; mostly Pusher
    this.checkGame('c4,e4,d5,d3,c3,e5,d4,c2,d2,b2,e3,b3,b4,d1,e1,f3,e6,f2,e2,f1,d3,c1,a3,f5,a2,f6,d6,e7,b1,d7',
        'c7>c6', 7);
};

TestAi.prototype.testBlockOnBorder3 = function () {
    // Similar but threat on eye and whole group
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b5,d1,pass,g4,pass,g6,pass,g7,pass,f7',
        '?Be7, #pass, We7, ?Bd7, #pass, Wd7, Bc7', 7);
};

TestAi.prototype.testBlockOnBorder4 = function () {
    this.checkGameTODO('e5,e3,d6,g5,f4,g7,c3,f6,d4,g3,f3,g4,f2,e7,c7,g2,d8,e8,e9', 'f9', 9);
};

TestAi.prototype.testConnectOnBorder = function () {
    this.checkGame('b4,b3,c4,c3,d4,d3,e4,e3,b2,c2,b1,d1', 'a3>6, a3');
};

TestAi.prototype.testConnectOnBorderFails = function () {
    this.checkGameTODO('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1', '!a4,b4,a4,d5');
};

TestAi.prototype.testConnectOnBorderAndEyeMaking = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,e2,d3,d1',
        '?a4~7, b4'); // TODO e3 is "nice" but b4 is white's only way out
};

TestAi.prototype.testConnectIsImportant = function () {
    this.checkGameTODO('d4,f6,c7,d6,g3,e5,e3,c5,b6,b5,d8,f4,f3,g4,e7,h3,c3,f7,f8,g2,b4,g7,g8,h8,f2,h2,g1,g9,e9,a4,h1,b3,b2,c4,d5,e6',
        'c6>15, #pass, c6>15', 9);
};

TestAi.prototype.testThrowStoneToKillEye = function () {
    // B should throw a stone on the fake spot to destroy 2nd eye and kill W
    this.checkGameTODO('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,e2,d3,d1,b4,e3,e4,pass,c5', 'Ba4>15');
};

TestAi.prototype.testConnectOnBorderSaves = function () {
    this.checkGameTODO('d6,f6,d4,g3,f4,e5,g5,e4,e7,f3,g4,e3,c3,b6,g7,g6,f7,h6,d5,d3,c7,c6,e6,f5,h4,h5,h3,j4,h2,g2,d2,e2,c5,c2,b2,d1,h7,b7,j6,j3,b8,j5,j7,h1,a7,b5,a6,b4,b3,b1,c4,c8,d7,d8,a5,b9,a4,e8,f8,b6,b7,h8,c6,j8,e9,g8,d9,a1,a2',
        'c1~4', 9);
};

TestAi.prototype.testBigConnectScore = function () {
    // ideal score is 48 actually because c3 kills or save everyone
    this.checkGameTODO('a4,b2,b4,b3,b5,a3,c4,d4,c2,d3,d2,b1,c1,e3,e2,d5', 'c3>19, c3');
};

TestAi.prototype.testConnect1 = function () {
    this.checkGameTODO('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,g3,f6,f3,e6,e3,d6,d4,d7,b5,f7,d5,c6,a5,c3,a4,c4',
        '?c5, e5>f4, e5>e4, e5>f5, #pass, ?c5', 7);
};

TestAi.prototype.testConnectSavesMore = function () {
    // Not connecting in d8 seems wrong; W loses around 12 pts
    this.checkGameTODO('e5,d7,g6,c4,e3,d3,d2,d5,e6,d6,c3,g3,d4,f2,b4,f4,c5,e8,c6,f7,c7,f5,e2,f6,e4,g8,f1,c8,b8,b9,a8,g1,e1,h6,e7',
        'd8>g5, d8>h7, d8', 9);
};

TestAi.prototype.testUselessConnect = function () {
    this.checkGameTODO('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,f3,f6,f4,e6,g4,d6,b5,d7,b4,f7,a4,d3,e4,d5,c4',
        'd4<1, d4, pass, pass', // see that all the space between live groups is waste
        7);
};

TestAi.prototype.testSemiAndEndGame = function () {
    // 9 +O++++OO@
    // 8 @+O+OOO@@
    // 7 @O+O@@@@@
    // 6 +@O+OOO@+
    // 5 +@OOOO@+@
    // 4 @@@@@O@+@
    // 3 OOOO@@@@+
    // 2 O+OOO@+++
    // 1 @@@+OO@++
    //   abcdefghj
    this.checkGameTODO('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        'd9<b8,' + // d9 is interesting but W has then c7 or d6 to make 2nd eye
        // NB: black b2 is good too but black is in no hurry; testSemi1 covers this.
        'b8~1.7,' + // huge threat but only if white does not answer it
        'c7~22,' + // If not c7 huge damage, see below
        'a6, h1, g2, c9, h2, a9', //FIXME h2 is not needed
        9);
};

TestAi.prototype.testAnotherKillAfterKo = function () {
    // Same game as above but white did not defend -> attack
    this.checkGameTODO('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        '#b8, #c9,' + // right in enemy territory
        'c7~26, #d8,' + // black goes for the kill in c7; too late for white now
        'e9~26', // should be 'd6~20, e9~26', // it seems that real score difference for e9 is 26 indeed :)
        9);
    //TODO One-eye group can survive if e9 + Ko battle
};

TestAi.prototype.testBattledVoidNotSplit = function () {
    // We may see a 3 vertex eye for Black in SW corner, but white stone is next to it
    // so White should not jump on a1
    this.checkGameTODO('d4,d2,c3,d6,e5,c5,e3,c4,d5,b3,c2,c1,b2,b4,a3',
        '!a1, ?a4~1.5, ?e2=e6, ?e2~2.9',
        7);
};

TestAi.prototype.testSemi1 = function () {
    // NB: scoring sees W group dead, which is true
    this.checkGame('a4,a2,b4,a3,c4,b3,d4,c3,a1,c2,b1,d2,c1,e2,d3,e1,e3',
        'pass, !d1, ' + // W cannot play first. Then black d1 would be a blunder
        '#b2,' + // FIXME: should be b2~16 or so; new job for Shaper
        'd1, #b1'); // FIXME: should be b1~20 or more
};

TestAi.prototype.testSemi2 = function () {
    // Same as above but Black plays d1 by mistake
    this.checkGame('a4,a2,b4,a3,c4,b3,d4,c3,a1,c2,b1,d2,c1,e2,d3,e1,e3',
        'pass, #d1,' +
        'b2~24,' +
        '!b1, !c1, #b1' // Black sees there is no way so we force it in b1
        );
        // + ',c1,' + // FIXME Shaper should be c1
        // 'pass, a1~0.2~Pusher'); // FIXME should be pass, not a1
};

TestAi.prototype.testConnNotNeeded1 = function () {
    this.checkGame('d4,f6,f3,c7,g4,e4,e3,e5,g5,f4,g6,b4,c3', 'f5<0.5', 7);
};

TestAi.prototype.testConnNotNeededOnBorder = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4',
        'b1<1, b4, d4, c5, ?d5=d1, #d5, b5, d1, b1, pass, pass');
};

TestAi.prototype.testConnNotNeededOnBorder2 = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4,d1,b4,a4', '!d4');
};

TestAi.prototype.testRaceWinOnKo = function () {
    // if AI thinks black group is dead then a2 looks pointless
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,b5,b2,c5,b4,b1,e2,e3,d2,d1,c5,pass,e4,pass,a1,e1,e2',
        'a2,pass,b5');
};

TestAi.prototype.testKillRace1 = function () {
    // both sides have a group with 1 eye of size 2; who plays first wins
    this.checkGameTODO('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,d2,c1,d3,a1',
        'a2>60, ?a2=b2, #pass, b5>41, ?b5=c5', 9); // a2|b2 also saves our group so big impact
};

TestAi.prototype.testKillRace2 = function () {
    // same as above but W's eye is actually shared by 2 brothers
    this.checkGameTODO('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,c1,a1,d3,d2',
        'a2>53, ?a2=b2, #pass, b5>41, ?b5=c5', 9);
};

TestAi.prototype.testKillGroupWith2Lives = function () {
    // TODO use this board for seki test - just make top-left White group alive => seki in bottom-right
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,e4,c5,b2,a2,pass,a1,b1,e2,d2,e1',
        'b4>12, b5>12'); //TODO bigger than 12 when our band-threat will be done
};

TestAi.prototype.testBlockAndConnect = function () {
    // Blocking in g5 also protects the cut
    this.checkGameTODO('d4,f6,c7,f4,e7,f7,e3,f3,e5,e8,f5', 'g5', 9);
};

TestAi.prototype.testSaferToConnect = function () {
    this.checkGameTODO('d4,f6,g3,d6,c5,c6,b6,e5,e3,f4,h4,g4,h6,g6,c7,d7,d8,h5,j5,f3,f8,f7,h7,e2,d3,g2,h3,d2,h2,e8,g8,c8,b7,e9,b8,d9,g5,c3,b4,b3,g1',
        'f2>f1, f2', 9);
};

TestAi.prototype.testBlockSavesGroup = function () {
    this.checkGameTODO('d4,f6,g3,d6,c5,c6,b6,e5,e3,f4,h4,g4,h6,g6,c7,d7,d8,h5,j5,f3,f8,f7,h7,e2,d3,g2,h3,d2,h2,e8,g8,c8,b7,e9,b8,d9,g5,c3,b4,b3,g1,c2,f2,b9,a3',
        'a2', 9);
};

},{"../GameLogic":9,"../Grid":12,"../constants":72,"../main":73,"./TestCase":81,"util":6}],78:[function(require,module,exports){
'use strict';

function addAllTests(testSeries) {
    testSeries.add(require('./TestAi'));
    testSeries.add(require('./TestBoardAnalyser'));
    testSeries.add(require('./TestBreeder'));
    testSeries.add(require('./TestGameLogic'));
    testSeries.add(require('./TestGoban'));
    testSeries.add(require('./TestGrid'));
    testSeries.add(require('./TestGroup'));
    testSeries.add(require('./TestPotentialTerritory'));
    testSeries.add(require('./TestScoreAnalyser'));
    testSeries.add(require('./TestSgfReader'));
    testSeries.add(require('./TestSpeed'));
    testSeries.add(require('./TestStone'));
    testSeries.add(require('./TestZoneFiller'));
}
module.exports = addAllTests;

},{"./TestAi":77,"./TestBoardAnalyser":79,"./TestBreeder":80,"./TestGameLogic":82,"./TestGoban":83,"./TestGrid":84,"./TestGroup":85,"./TestPotentialTerritory":86,"./TestScoreAnalyser":87,"./TestSgfReader":89,"./TestSpeed":90,"./TestStone":91,"./TestZoneFiller":92}],79:[function(require,module,exports){
'use strict';

var CONST = require('../constants');
var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var GRID_BORDER = CONST.GRID_BORDER;


/** @class Set main.debug to true for details
 */
function TestBoardAnalyser(testName) {
    TestCase.call(this, testName);
}
inherits(TestBoardAnalyser, TestCase);
module.exports = TestBoardAnalyser;


TestBoardAnalyser.prototype.initBoard = function (gsize, handicap) {
    this.game = new GameLogic();
    this.game.newGame(gsize || 5, handicap || 0);
    this.goban = this.game.goban;
    this.grid = new Grid(gsize, GRID_BORDER);
};

TestBoardAnalyser.prototype.checkGame = function (moves, expScore, gsize, finalPos) {
    this.initBoard(gsize || 5);
    if ('+O@'.indexOf(moves[0]) !== -1) {
        this.loadImage(moves); // an image, not the list of moves
    } else {
        this.game.loadAnyGame(moves);
    }
    if (finalPos) this.assertEqual(finalPos, this.goban.image());
    this.boan = new main.defaultAi.BoardAnalyser(this.game);
    this.boan.countScore(this.goban);

    var score = this.boan.getScoringGrid().image();
    if (this.check(!expScore || score === expScore)) return;
    this.fail('Expected scoring grid was:<br>' + expScore + ' but we got:<br>' + score);
};

TestBoardAnalyser.prototype.checkGameTODO = function (moves, expScore, gsize, finalPos) {
    this.startBrokenTest();
    this.checkGame(moves, expScore, gsize, finalPos);
};

TestBoardAnalyser.prototype.loadImage = function (moves) {
    var pos = 0, gsize = this.game.goban.gsize;
    for (var j = gsize; j >= 1; j--) {
        for (var i = 1; i <= gsize; i++) {
            var stone = moves[pos++];
            if (stone === '+') continue;
            var color = stone === 'O' ? 'W' : 'B';
            this.game.playOneStone(color + Grid.xy2move(i, j));
        }
        pos++; // skips the line separator
    }
    this.game.loadMoves('pass,pass');
};

TestBoardAnalyser.prototype.checkScore = function (prisoners, dead, score) {
    this.assertEqual(prisoners, this.goban.countPrisoners());
    var futurePrisoners = this.boan.prisoners;
    this.assertEqual(dead[BLACK], futurePrisoners[BLACK] - prisoners[BLACK], 'BLACK dead');
    this.assertEqual(dead[WHITE], futurePrisoners[WHITE] - prisoners[WHITE], 'WHITE dead');

    this.assertEqual(score, this.boan.scores);
};

//---


// Coverage & base methods
TestBoardAnalyser.prototype.testInternals = function () {
    this.initBoard(5);
    this.game.loadMoves('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1,pass,e3');
    // -##--
    // ###--
    // ----@
    // @@@@-
    // -@-@-
    var ba = this.boan = new main.defaultAi.BoardAnalyser(this.game);
    ba.analyseTerritory(this.goban, this.grid, WHITE);

    // Voids
    var v = ba.allVoids[0];
    var gi = ba.allGroupInfos[1];
    this.assertEqual(true, v.isTouching(gi));
    this.assertEqual(false, v.isTouching(ba.allGroupInfos[2]));
    this.assertEqual('{eye-a1 vcount:1 black:#1 white:-}', v.toString());
    this.assertEqual('{eye-e1 vcount:2 black:#3,#1 white:-}', ba.allVoids[2].toString());
    this.assertEqual('{void-a3 vcount:8 black:#1,#3 white:#2}', ba.allVoids[3].toString());

    //Coverage
    this.assertEqual(true, ba.debugDump().length > 100);
    this.assertEqual('#3,#1', gi.band.toString());
};

TestBoardAnalyser.prototype.testWeirdEmptyBoard = function () {
    // Just makes sure the analyser does not crash on empty boards.
    // Scoring these boards makes no sense so we don't check the result.
    this.checkGame('');
    this.checkGame('c3');
    this.checkGame('c3,d5');
    this.checkGame('c3,d4');
};

TestBoardAnalyser.prototype.testDoomedGivesEye1 = function () {
    // White group is doomed; verify its eye is counted right
    this.checkGame('a2,b4,b2,c4,c2,d4,d2,e4,e2,b5,a3,c5,a4,pass,pass',
        '-##--,@####,@----,@@@@@,-----');
};

TestBoardAnalyser.prototype.testDoomedGivesEye2 = function () {
    // Same as above test but white's dead group does not "touch" black.
    // This triggers a special case in analyser (white is dead without "killer")
    this.checkGame('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1,pass,pass',
        '-##--,' +
        '###--,' +
        '-----,' +
        '@@@@-,' +
        '-@-@-');
};

TestBoardAnalyser.prototype.testDoomedGivesEye3 = function () {
    this.todo('Handle seki'); // add a test in which both should stay alive
    // Both groups have a single eye but B has 2 more lives so he would win the race
    this.checkGame('a2,a4,b2,b4,c2,b5,c3,pass,d3,pass,d4,pass,d5,pass,a1,pass,b1,pass,c1,pass,e3,pass,e4,pass,e5,pass,pass',
        '-#-@@,##-@@,--@@@,@@@--,@@@--');
};

TestBoardAnalyser.prototype.testTwoSingleEyeConnectedByEye = function () {
    // Black SW and center groups survive depending on each other; c4 is a real eye
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,d1,e1,c1,g1,pass,pass',
        ':::::::,' +
        'OOOOOO:,' +
        'O@@@@@O,' +
        'O@-@-@O,' +
        'OO@O@@O,' +
        '@@@OOO:,' +
        '-@@@O:O', 7);
    // and a variation:
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,d1,e1,g1,g2,c1,pass,pass',
        ':::::::,' +
        'OOOOOO:,' +
        'O@@@@@O,' +
        'O@-@-@O,' +
        'OO@O@@O,' +
        '@@@OOOO,' +
        '-@@@O:&', 7);
};

TestBoardAnalyser.prototype.testUnconnectedBrothers = function () {
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,g6,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g4,g3,g5,f4,pass,pass',
        '-------,---@@@@,@@-@OO@,O?@@OO@,OOOO:OO,::O&O::,:::::::', 7);
};

TestBoardAnalyser.prototype.testFightTwoGroupsOfOneEye = function () {
    // Black wins clearly because he can make 2 eyes while white cannot.
    this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,a2,pass,pass',
        '---@@,-@@@#,-@###,@@@#-,-###-');
};

TestBoardAnalyser.prototype.testFightTwoGroupsOfOneEye2 = function () {
    // Same as above but black's a1 stone can be taken
    // TODO: review it; this is actually not obvious - seems W is winning
    // this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,a1,pass,pass',
    //     '---@@,-@@@#,-@###,-@@#-,@###-');
};

TestBoardAnalyser.prototype.testTwoFakeEyesChained = function () {
    // a5 is a fake eye but so is c5 -> W is dead
    this.checkGame('Bc3,c4,b4,d4,d2,e3,e4,b5,b1,a4,b3,d5,d1,e2,c2,a2,a3,d3,pass,e1,pass,pass',
        '-#-#-,#@##@,@@@##,#-@@#,-@-@#');
};

TestBoardAnalyser.prototype.testTwoFakeEyesChained2 = function () {
    // Similar but a4 not in atari and W is alive - b5 needs to connect because a4 needs it
    this.checkGame('c3,c4,b4,e4,d2,e3,pass,b5,b1,a4,b3,d5,d1,e2,c2,d3,a2,e1,pass,pass',
        '?O?O:,O@O:O,?@@OO,@-@@O,-@-@O');
};

TestBoardAnalyser.prototype.testSeeTwoGroupsSharingSingleEyeAreDead = function () {
    // 5 O&:&&
    // 4 O&:&&
    // 3 OO&&&
    // 2 :OOOO
    // 1 :::::
    //   abcde
    this.checkGame('b5,a5,b4,a4,d5,a3,d4,b3,c3,b2,d3,c2,e5,d2,e4,e2,e3,pass,pass',
        'O&:&&,O&:&&,OO&&&,:OOOO,:::::');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_1 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 ####@
    // 1 -@-#@
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e2,d1,e1,pass,e3,pass,b1,pass,pass',
        '-----,-----,@@@@@,####@,-@-#@');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_2 = function () {
    // White group is dead - having a dead kamikaze + an empty spot in NE corner should not change that
    this.checkGame('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5,e4,e2,pass,c5,pass,pass',
        '--@@-,' +
        '--@##,' +
        '--@#-,' +
        '-@@#@,' +
        '-@##-');
};

TestBoardAnalyser.prototype.testNoTwoEyesDeadEnemy = function () {
    // Black group is dead - having a dead kamikaze should not change that
    this.checkGame('c3,c4,b4,d4,c5,d3,d2,c2,b3,e2,b2,d1,d5,b1,e5,e4,b5,a1,a2,a4,c1,d2,a5,b1,pass,pass',
        '&&&&&,' +
        'O&OOO,' +
        ':&&O:,' +
        '&&OOO,' +
        ':O:O:');
};

TestBoardAnalyser.prototype.testTwoEyes5_1 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 OOOOO
    // 1 :&:::
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,b1,pass,pass',
        '-----,-----,@@@@@,OOOOO,:&:::');
};

TestBoardAnalyser.prototype.testNoTwoEyes4_2 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 #####
    // 1 -@@-#
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,c1,pass,b1,e1,pass,pass',
        '-----,-----,@@@@@,#####,-@@-#');
};

// Reversed from the one above, just in case order is important
TestBoardAnalyser.prototype.testNoTwoEyes4_2_UP = function () {
    // 5 :OO:&
    // 4 &&&&&
    // 3 OOOOO
    // 2 :::::
    // 1 :::::
    //   abcde
    this.checkGame('a4,a3,b4,b3,c4,c3,d4,d3,e4,e3,e5,c5,pass,b5,pass,pass',
        ':OO:&,&&&&&,OOOOO,:::::,:::::');
};

// All white groups are soon dead but not yet; black should win easily
TestBoardAnalyser.prototype.testRaceForLife = function () {
    this.checkGame('a3,a4,b3,b4,c4,c5,d4,pass,e4,pass,c3,a2,b2,c2,b1,c1,d2,d1,e2,pass,d3,pass,e3,pass,pass',
        '--#--,##@@@,@@@@@,#@#@@,-@##-');
};

TestBoardAnalyser.prototype.testDeadGroupSharingOneEye = function () {
    // SE-white group is dead
    // 9 ::O@@----
    // 8 :::O@----
    // 7 ::OO@@@@-
    // 6 :::OOOO@@
    // 5 :OO@OO@--
    // 4 :O@@O@@@@
    // 3 OOO@@@##@
    // 2 OO@@##-#@
    // 1 :OO@@##-@
    //   abcdefghj
    this.checkGame('++O@@++++,+++O@++++,++OO@@@@+,+++OOOO@@,+OO@OO@++,+O@@O@@@@,OOO@@@OO@,OO@@OO+O@,+OO@@OO+@',
        '::O@@----,:::O@----,::OO@@@@-,:::OOOO@@,:OO@OO@--,:O@@O@@@@,OOO@@@##@,OO@@##-#@,:OO@@##-@', 9);
};

TestBoardAnalyser.prototype.testOneEyePlusFakeDies = function () {
    this.checkGame('a2,a3,b2,b4,b3,a4,c3,c4,d2,d3,c1,e2,pass,d1,pass,e1,pass,e3,pass,d4,pass,pass',
        ':::::,' +
        'OOOO:,' +
        'O&&OO,' +
        '&&:&O,' +
        '::&OO');
};

TestBoardAnalyser.prototype.testSmallGame1 = function () {
    // 9 ++O@@++++
    // 8 +@OO@++@+
    // 7 OOOO@@@++
    // 6 ++OOOOO@@
    // 5 OO@@O@@@@
    // 4 @@@+OOOO@
    // 3 O@@@@@O+O
    // 2 +++@OOO++
    // 1 +++@@O+++
    //   abcdefghj
    this.checkGame('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5,pass,pass',
        '::O@@----,:&OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@?OOOO@,#@@@@@O:O,---@OOO::,---@@O:::', 9,
        '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++');

    this.checkScore([4, 5], [1, 1], [16, 12]);
};

TestBoardAnalyser.prototype.testSmallGame2 = function () {
    // 9 +@++@@@@O
    // 8 +@@@@@@OO
    // 7 @@+@+@@O+
    // 6 +@+@++@O+
    // 5 +@+@@+@O+
    // 4 @@@+++@OO
    // 3 @OO@@@@O+
    // 2 OO+OOO@OO
    // 1 ++O@@@@O+
    //   abcdefghj
    // SW white group is dead
    this.checkGame('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9,pass,pass',
        '-@--@@@@O,' +
        '-@@@@@@OO,' +
        '@@-@-@@O:,' +
        '-@-@--@O:,' +
        '-@-@@-@O:,' +
        '@@@---@OO,' +
        '@##@@@@O:,' +
        '##-###@OO,' +
        '--#@@@@O:', 9);
};

TestBoardAnalyser.prototype.testSmallGame3 = function () {
    // White S-W group connects through a dead enemy - otherwise it would die
    this.checkGameTODO('f4,f6,d6,c3,d4,e5,g5,e4,e7,d3,g7,d5,c4,b4,g6,c5,f7,b6,c7,f3,e6,f5,g4,g2,g3,h3,c6,h4,b7,h5,a6,h6,b5,h7,h8,j8,a4,g8,b3,b2,c4,f8,a2,c2,e8,h9,f9,b1,e2,e3,f2,h2,d2,f1,d1,c1,pass,g9,e9,d8,d9,c8,b8,pass,c9,pass,d7,pass,pass',
        '--@@@@OO:,' +
        '-@--@OO:O,' +
        '-@@@@@@O:,' +
        '@-@@@O@O:,' +
        '-@OOOO@O:,' +
        '@?@?O@@O:,' +
        '?@OOOO@O:,' +
        '@OO&&&OO:,' +
        '?OO&:O:::',
        9);
};

TestBoardAnalyser.prototype.testBigGame1 = function () {
    // Interesting:
    // - a8 is an unplayed move (not interesting for black nor white)
    //   but white group in b7-b8-b9 is DEAD; black a7 is ALIVE
    // - g4 is the only dame
    // - t15 appear as fake eye until weaker group in s16 is known as dead
    this.checkGame('(;FF[4]EV[go19.mc.2010.mar.1.21]PB[fuego19 bot]PW[Olivier Lombart]KM[0.5]SZ[19]SO[http://www.littlegolem.com]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq];B[fp];W[dq];B[eq];W[er];B[ep];W[cq];B[fr];W[cp];B[cn];W[co];B[dn];W[nq];B[oc];W[fc];B[ql];W[pr];B[cg];W[qq];B[mc];W[pg];B[nh];W[qi];B[dr];W[cr];B[nk];W[qe];B[hc];W[db];B[jc];W[cc];B[qj];W[qc];B[qd];W[rd];B[re];W[rc];B[qf];W[rf];B[pe];W[se];B[rg];W[qe];B[qg];W[jq];B[es];W[fe];B[ci];W[no];B[bn];W[bo];B[cs];W[bs];B[pb];W[ef];B[ao];W[ap];B[ip];W[pn];B[qn];W[qo];B[jp];W[iq];B[kq];W[lq];B[kr];W[kp];B[hq];W[lr];B[ko];W[lp];B[kg];W[hh];B[ir];W[ce];B[pm];W[rn];B[ek];W[an];B[am];W[ao];B[re];W[sk];B[qm];W[rm];B[ro];W[rp];B[qp];W[po];B[oo];W[on];B[om];W[nn];B[ii];W[bm];B[cm];W[bl];B[cl];W[bk];B[gi];W[ll];B[lm];W[km];B[kl];W[jm];B[lk];W[ln];B[hi];W[hf];B[kc];W[hm];B[ml];W[jo];B[io];W[jn];B[in];W[im];B[bf];W[be];B[bj];W[ri];B[rj];W[sj];B[rl];W[sl];B[qb];W[ph];B[pi];W[qh];B[ae];W[ad];B[ck];W[ds];B[gm];W[ik];B[kj];W[of];B[gb];W[hn];B[gl];W[ho];B[hp];W[fo];B[nf];W[ne];B[oe];W[ng];B[mf];W[mg];B[mh];W[lg];B[lh];W[lf];B[me];W[le];B[md];W[kf];B[jg];W[eh];B[af];W[cd];B[ak];W[fn];B[sf];W[gh];B[hk];W[fi];B[nm];W[ih];B[ji];W[jh];B[kh];W[er];B[fs];W[oh];B[ib];W[oi];B[oj];W[ni];B[mi];W[nj];B[jk];W[hl];B[ij];W[em];B[ls];W[ms];B[dh];W[ks];B[jr];W[cf];B[bg];W[fj];B[gj];W[fk];B[gk];W[fb];B[hd];W[gc];B[fa];W[ea];B[ga];W[dg];B[mj];W[dl];B[il];W[ej];B[gd];W[fd];B[el];W[fl];B[dk];W[dm];B[sd];W[dr];B[ge];W[gf];B[id];W[jl];B[ik];W[ig];B[jf];W[ld];B[lc];W[di];B[ei];W[ha];B[hb];W[di];B[ch];W[ei];B[fm];W[en];B[do];W[mn];B[mm];W[je];B[kd];W[go];B[gq];W[js];B[is];W[ls];B[ke];W[og];B[ie];W[sh];B[if];W[so];B[he];W[fg];B[pf];W[si];B[sg];W[kn];B[rh];W[sm];B[rk];W[gn];B[eo];W[tt];B[tt];W[tt];B[tt])',
        '::::O@@#-----------,' +
        ':::O:O@@@------@@--,' +
        '::O::OO@-@@@@-@-##-,' +
        'O:O&:O@@@-@O@--@@#@,' +
        '@OO::O@@@#@O@#@@-@-,' +
        '@@O:O:OO@@OO@@O@@-@,' +
        '-@@O:O::O@@OOOOO@@@,' +
        '--@@O:OOOO@@@@OOO@O,' +
        '--@OOO@@@@--@OO@OOO,' +
        '-@-@OO@-@-@-@O@@@@O,' +
        '@#@@@O@@@@-@-@---@O,' +
        '-#@O@O@O@O@-@---@@O,' +
        '@#@OO@@OOOO@@@@@@OO,' +
        'O@@@OOOO@OOOOOOO@O:,' +
        'OOO@@OOO@O&::O&OO:O,' +
        'O:O@@@?@@@OO:::&&O:,' +
        '::OO@-@@--@O:O::O::,' +
        '::OOO@--@@@O:::O:::,' +
        ':O:O@@--@OOOO::::::', 19);

    this.checkScore([7, 11], [5, 9], [67, 59]);
};

TestBoardAnalyser.prototype.testBigGame2 = function () {
    // Interesting:
    // - 3 prisoners "lost" into white SW territory
    // - white group of 3 in h12 is dead, which saves big black North group otherwise with 1 single eye
    // - t9 is a perfect example of fake eye (white has to play here to save group in t8)
    // - single white n19 is alive in a neutral zone because white can connect in n18
    // NB: game was initially downloaded with an extra illegal move (dupe) at the end (;W[aq])
    this.checkGame('(;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]SO[http://www.littlegolem.com];B[pd];W[pp];B[ce];W[dc];B[dp];W[ee];B[dg];W[cn];B[fq];W[bp];B[cq];W[bq];B[br];W[cp];B[dq];W[dj];B[cc];W[cb];B[bc];W[nc];B[qf];W[pb];B[qc];W[jc];B[qn];W[nq];B[pj];W[ch];B[cg];W[bh];B[bg];W[iq];B[en];W[gr];B[fr];W[ol];B[ql];W[rp];B[ro];W[qo];B[po];W[qp];B[pn];W[no];B[cl];W[dm];B[cj];W[dl];B[di];W[ck];B[ej];W[dk];B[ci];W[bj];B[bi];W[bk];B[ah];W[gc];B[lc];W[ld];B[kd];W[md];B[kc];W[jd];B[ke];W[nf];B[kg];W[oh];B[qh];W[nj];B[hf];W[ff];B[fg];W[gf];B[gg];W[he];B[if];W[ki];B[jp];W[ip];B[jo];W[io];B[jn];W[im];B[in];W[hn];B[jm];W[il];B[jl];W[ik];B[jk];W[jj];B[ho];W[go];B[hm];W[gn];B[ij];W[hj];B[ii];W[gk];B[kj];W[ji];B[lj];W[li];B[mj];W[mi];B[nk];W[ok];B[ni];W[oj];B[nh];W[ng];B[mh];W[lh];B[mg];W[lg];B[nn];W[pi];B[om];W[ml];B[mo];W[mp];B[ln];W[mk];B[qj];W[qi];B[jq];W[ir];B[ar];W[mm];B[oo];W[np];B[mn];W[ri];B[dd];W[ec];B[bb];W[rk];B[pl];W[rg];B[qb];W[pf];B[pe];W[of];B[qg];W[rh];B[ob];W[nb];B[pc];W[sd];B[rc];W[re];B[qe];W[ih];B[hi];W[hh];B[gi];W[hg];B[jh];W[lf];B[kf];W[lp];B[nm];W[kk];B[lr];W[lq];B[kr];W[jr];B[kq];W[mr];B[kb];W[jb];B[ja];W[ia];B[ka];W[hb];B[ie];W[id];B[ed];W[fd];B[db];W[eb];B[ca];W[de];B[cd];W[ek];B[ei];W[em];B[gq];W[gp];B[hr];W[hq];B[gs];W[eo];B[do];W[dn];B[co];W[bo];B[ep];W[fo];B[kl];W[lk];B[lm];W[rm];B[rn];W[rl];B[rj];W[sj];B[rf];W[sf];B[rd];W[se];B[sc];W[sg];B[qm];W[oc];B[pa];W[ko];B[kn];W[ea];B[op];W[oq];B[df];W[fe];B[ef];W[da];B[cb];W[aq];B[gj];W[hk];B[na];W[ma];B[oa];W[mc];B[le];W[me];B[oe];W[nl];B[sp];W[sq];B[so];W[qq];B[ne];W[ls];B[ks];W[aj];B[ms];W[ns];B[ls];W[ai];B[dh];W[fj];B[fi];W[fk];B[je];W[is];B[hs];W[sm];B[sk];W[sl];B[si];W[sh];B[ph];W[oi];B[pg];W[kp];B[og];W[mf];B[kh];W[qk];B[pk];W[si];B[ig];W[fp];B[js];W[hp];B[tt];W[tt];B[tt])',
        '--@OO:::O@@?O@@@---,' +
        '-@@@O::O:O@??O@-@--,' +
        '-@@OO:O::O@@OOO@@@@,' +
        '--@@@O::OO@OO??@-@O,' +
        '--@OOO:O@@@@O@@@@OO,' +
        '---@@OO@@-@OOOOO@@O,' +
        '-@@@-@@#@-@O:O@@@OO,' +
        '@--@---##@@O::O@@OO,' +
        'O@@@@@@@@OOOO:OOOOO,' +
        'OO@O@O@O@O:::OO@@@O,' +
        ':OOOOOOOO@OOO:O@OO?,' +
        '::&O::::O@@?OOO@@OO,' +
        ':::OO::&O@-@O@@-@OO,' +
        '::OO&:OO@@@@@@-@@@?,' +
        ':O@@OOO:O@O?@O@@O@@,' +
        ':OO@@OOOO@OOOO@OOO@,' +
        'OO@@-@@OO@@O:OO:O:O,' +
        '@@---@-@OO@@O::::::,' +
        '------@@O@@@@O:::::', 19);

    this.checkScore([11, 6], [3, 3], [44, 55]);
};

},{"../GameLogic":9,"../Grid":12,"../constants":72,"../main":73,"./TestCase":81,"util":6}],80:[function(require,module,exports){
//Translated from test_breeder.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Breeder = require('../Breeder');
var TestCase = require('./TestCase');


/** @class */
function TestBreeder(testName) {
    TestCase.call(this, testName);
}
inherits(TestBreeder, TestCase);
module.exports = TestBreeder;


// Right now this is just for coverage
TestBreeder.prototype.testBreeding = function () {
    var size = 5, komi = 6.5;
    var genSize = 4;
    var numTournaments = 0;
    var numMatchPerAi = 120;

    if (main.isCoverTest) {
        genSize = 2;
        numTournaments = numMatchPerAi = 1;
    }

    var breeder = new Breeder(size, komi);
    breeder.run(genSize, numTournaments, numMatchPerAi);
};

// Example of observed results:
//  'd4,f6' 73.3%!; 'e5,e3' 57%; 'e5,d4' 75%; 'We5,d4' 97%!; 'We5,e3' <50%
TestBreeder.prototype.testAiVsAi = function () {
    var size = 9, komi = 5.5;
    var initMoves = ['d4,f6', 'Wd4,f6', 'e5,e3', 'We5,e3', 'e5,d4', 'We5,d4'];
    var totalNumGames = 300;
    var numGamesShowed = 1;
    var expectedWinRatio = 0.60; // number going up shows new AI gets stronger compared to default AI
    var tolerance = 0.1; // + or -; the more games you play the lower tolerance you can set

    var numVariations = initMoves.length;
    // For coverage tests no need to run many games
    if (main.isCoverTest) totalNumGames = numVariations = 1;

    var breeder = new Breeder(size, komi);
    var numGamesPerVariation = Math.round(totalNumGames / numVariations);
    var winRatio = 0, winRatios = [];
    for (var i = 0; i < numVariations; i++) {
        var ratio = breeder.aiVsAi(numGamesPerVariation, numGamesShowed, initMoves[i]);
        winRatios.push(ratio);
        winRatio += ratio;
    }
    winRatio /= numVariations;
    for (i = 0; i < numVariations; i++) main.log.info(initMoves[i] + ': ' + (winRatios[i] * 100).toFixed(1) + '%');
    main.log.info('---Average won games for White: ' + (winRatio * 100).toFixed(1) + '%');

    if (!main.isCoverTest) this.assertInDelta(winRatio, expectedWinRatio, tolerance);
};

},{"../Breeder":8,"../main":73,"./TestCase":81,"util":6}],81:[function(require,module,exports){
'use strict';

var main = require('../main');


/** @class */
function TestCase(name) {
    this.name = name;
    this.series = null; // set by TestSeries (to avoid changing existing derived classes)
    this.isBroken = false;
}
module.exports = TestCase;


TestCase.prototype.startBrokenTest = function () {
    this.isBroken = true;
    this.series.startBrokenTest();
};

TestCase.prototype.check = function (result) {
    this.series.checkCount++;
    return result;
};

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

TestCase.prototype.compareValue = function (expected, val) {
    if (expected instanceof Array) {
        if (!val instanceof Array) return 'Expected Array but got ' + val;
        if (val.length !== expected.length) {
            return 'Expected Array of size ' + expected.length + ' but got size ' + val.length;
        }
        for (var i = 0; i < expected.length; i++) {
            var msg = this.compareValue(expected[i], val[i]);
            if (msg) return msg;
        }
        return ''; // equal
    }
    if (val === expected) return '';
    return 'Expected:\n' + expected + '\nbut got:\n' + val + '\n' + _valueCompareHint(expected, val) + '\n';
};

TestCase.prototype.assertEqual = function (expected, val, comment) {
    this.series.checkCount++;
    var msg = this.compareValue(expected, val);
    if (msg === '') return;
    this.series.failTest(msg, comment);
};

TestCase.prototype.assertInDelta = function (val, expected, delta, comment) {
    this.series.checkCount++;
    if (Math.abs(val - expected) <= delta) return;
    this.series.failTest(val + ' is not in +/-' + delta + ' delta around ' + expected, comment);
};

TestCase.prototype.fail = function (comment) {
    this.series.failTest(comment);
};

TestCase.prototype.todo = function (comment) {
    this.series.todoCount++;
    main.log.info('TODO: ' + comment);
};

TestCase.prototype.showInUi = function (msg) {
    if (!main.testUi || !this.game) return;
    if (this.isBroken && !main.debug) return;
    try {
        main.testUi.showTestGame(this.name, msg, this.game);
    } catch (e) {
        main.log.error('Exception loading failed test in UI: ' + e.message);
    }
};

},{"../main":73}],82:[function(require,module,exports){
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');


function TestGameLogic(testName) {
    TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestGameLogic, TestCase);
module.exports = TestGameLogic;


TestGameLogic.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
};

TestGameLogic.prototype.testHandicap = function () {
    // 3 ways to load the same game with handicap...
    var game6 = '(;FF[4]KM[0.5]SZ[19]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq])';
    this.game.loadSgf(game6);
    var img = this.goban.image();
    this.game.newGame(19, 6);
    this.game.loadMoves('f3');
    this.assertEqual(img, this.goban.image());
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual(img, this.goban.image());
};

TestGameLogic.prototype.testMisc = function () {
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual('handicap:6,W-f3', this.game.historyString());
    this.assertEqual([0,0], this.game.goban.countPrisoners());
    this.assertEqual(true, this.game.playOneMove('resign'));
};

TestGameLogic.prototype.testEnding = function () {
    this.game.newGame(19, 0);
    this.game.loadMoves('load:f3,d4');
    this.game.passOneMove();
    this.assertEqual(false, this.game.gameEnding);
    this.assertEqual(false, this.game.gameEnded);
    this.game.passOneMove();
    this.assertEqual(true, this.game.gameEnding);
    this.assertEqual(false, this.game.gameEnded);
    this.assertEqual(true, this.game.acceptEnding(false, main.WHITE));
    this.assertEqual(false, this.game.gameEnding);
    this.game.passOneMove();
    this.assertEqual(true, this.game.gameEnding);
    this.assertEqual(true, this.game.acceptEnding(true));
    this.assertEqual(false, this.game.gameEnding);
    this.assertEqual(true, this.game.gameEnded);
    this.assertEqual(false, this.game.playOneMove('c5'));
    this.assertEqual(['Game already ended'], this.game.getErrors());
};

TestGameLogic.prototype.testGetErrors = function () {
    this.game.newGame(19, 0);
    this.assertEqual([], this.game.getErrors());
    this.assertEqual(false, this.game.acceptEnding(false));
    this.assertEqual(['The game is not ending yet'], this.game.getErrors());
    this.assertEqual([], this.game.getErrors());
};

},{"../GameLogic":9,"../main":73,"./TestCase":81,"util":6}],83:[function(require,module,exports){
// NB Stone & Goban can hardly be tested separately
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var Goban = require('../Goban');
var Grid = require('../Grid');
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestGoban(testName) {
    TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestGoban, TestCase);
module.exports = TestGoban;


// Coverage etc.
TestGoban.prototype.testInternals = function () {
    var goban = this.goban;
    goban.playAt(1, 2, BLACK);
    goban.playAt(2, 2, WHITE);
    this.assertEqual(BLACK, goban.colorAt(1, 2));
    this.assertEqual(WHITE, goban.colorAt(2, 2));
    // Coverage
    this.assertEqual(true, goban.debugDump().length > 100);
    // 2 Grid methods
    this.assertEqual(goban.image(), goban.grid.image()); // these 2 could change, actually
    this.assertEqual('(BORDER)(BORDER)', goban.scoringGrid.toString().substr(0, 16));
};

TestGoban.prototype.testSignature = function () {
    var goban = this.goban;
    goban.setPositionalSuperko(true);
    var moves = 'a5,b5,a4,b4,c5,a3,d4,c4,d3,d5,c3,b3,a2,c2,e4,d2,e2,e1,e5,e3,b1,b2,c1,a1'.split(',');
    var color = BLACK;
    for (var n = 0; n < moves.length; n++) {
        var coord = Grid.move2xy(moves[n]), i = coord[0], j = coord[1];

        var incrementalImg = goban.nextMoveImage(i, j, color);

        goban.playAt(i, j, color);
        color = 1 - color;

        var curImg = goban.getPositionSignature();
        this.assertEqual(curImg, incrementalImg);
        this.assertEqual(goban.buildCompressedImage(), curImg);
    }
};

TestGoban.prototype.testSuicide = function () {
    // a2 b2 b1 a3 pass c1
    var goban = this.goban;
    goban.playAt(1, 2, BLACK);
    goban.playAt(2, 2, WHITE);
    goban.playAt(2, 1, BLACK);
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE)); // suicide invalid
    goban.playAt(1, 3, WHITE);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE)); // now this would be a kill
    this.assertEqual(true, goban.isValidMove(1, 1, BLACK)); // black could a1 too (merge)
    goban.playAt(3, 1, WHITE); // now 2 black stones share a last life
    this.assertEqual(false, goban.isValidMove(1, 1, BLACK)); // so this would be a suicide with merge
};

TestGoban.prototype.testKo = function () {
    // pass b2 a2 a3 b1 a1
    var goban = this.goban;
    goban.playAt(2, 2, WHITE);
    goban.playAt(1, 2, BLACK);
    goban.playAt(1, 3, WHITE);
    goban.playAt(2, 1, BLACK);
    goban.playAt(1, 1, WHITE); // kill!
    this.assertEqual(false, goban.isValidMove(1, 2, BLACK)); // now this is a ko
    goban.playAt(4, 4, BLACK); // play once anywhere else
    goban.playAt(4, 5, WHITE);
    this.assertEqual(true, goban.isValidMove(1, 2, BLACK)); // ko can be taken by black
    goban.playAt(1, 2, BLACK); // black takes the ko
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE)); // white cannot take the ko
    goban.playAt(5, 5, WHITE); // play once anywhere else
    goban.playAt(5, 4, BLACK);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE)); // ko can be taken back by white
    goban.playAt(1, 1, WHITE); // white takes the ko
    this.assertEqual(false, goban.isValidMove(1, 2, BLACK)); // and black cannot take it now
};

TestGoban.prototype.testSuperko = function () {
    this.game = new GameLogic();
    this.game.newGame(5);
    var goban = this.goban = this.game.goban;

    goban.setPositionalSuperko(true);

    this.game.loadMoves('a3,b3,a2,b2,pass,a1,b1,c1,pass,a1,pass,a4,a2,pass,b1,pass,a3');
    // W-a1 now would repeat position we had after W-a4
    if (goban.isValidMove(1, 1, WHITE)) {
        this.showInUi('a1 should be invalid: superko');
        this.assertEqual(true, false);
    }
    // undo, redo and verify superko is still detected
    goban.undo();
    goban.playAt(1, 3, BLACK);
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE));
    // a1 is allowed again after another stone is added anywhere
    goban.playAt(4, 2, BLACK);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE));
};

},{"../GameLogic":9,"../Goban":11,"../Grid":12,"../main":73,"./TestCase":81,"util":6}],84:[function(require,module,exports){
'use strict';

var main = require('../main');
var Grid = require('../Grid');
var inherits = require('util').inherits;
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE, EMPTY = main.EMPTY;


function TestGrid(testName) {
    TestCase.call(this, testName);
}
inherits(TestGrid, TestCase);
module.exports = TestGrid;


function val(v) { return v; }

TestGrid.prototype.testGridToString = function () {
    var g = new Grid(3, BLACK, -1);
    g.yx[1][1] = WHITE;
    g.yx[1][2] = EMPTY;
    this.assertEqual('@@@\n@@@\nO+@\n', g.toString());
    this.assertEqual(' 3 @@@\n 2 @@@\n 1 O+@\n   abc\n', g.toText());
    this.assertEqual('@@@,@@@,O+@', g.toLine());
    this.assertEqual('000,000,1-10', g.toLine(val));
};

function fillGrid(g) {
    var yx = g.yx, n = 1;
    for (var j = 1; j <= g.gsize; j++) {
        for (var i = 1; i <= g.gsize; i++) {
            yx[j][i] = n++;
        }
    }
}

TestGrid.prototype.testFlipAndMirror = function () {
    var g = new Grid(3, -1);
    fillGrid(g);
    var img = '789,456,123';
    this.assertEqual(img, g.toLine(val));

    this.assertEqual('123,456,789', Grid.flipImage(img));
    this.assertEqual('987,654,321', Grid.mirrorImage(img));
    this.assertEqual('321,654,987', Grid.flipAndMirrorImage(img));
};

},{"../Grid":12,"../main":73,"./TestCase":81,"util":6}],85:[function(require,module,exports){
//Translated from test_group.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestGroup(testName) {
    TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestGroup, TestCase);
module.exports = TestGroup;


TestGroup.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
};

TestGroup.prototype.testGroupMerge = function () {
    // check the sentinel
    this.assertEqual(1, this.goban.mergedGroups.length);
    this.assertEqual(-1, this.goban.mergedGroups[0].color);
    this.assertEqual(1, this.goban.killedGroups.length);
    this.assertEqual(-1, this.goban.killedGroups[0].color);
    // single stone
    var s = this.goban.playAt(4, 3, BLACK);
    var g = s.group;
    this.assertEqual(this.goban, g.goban);
    this.assertEqual([s], g.stones);
    this.assertEqual(4, g.lives);
    this.assertEqual(BLACK, g.color);
    this.assertEqual(null, g.mergedBy);
    this.assertEqual(null, g.killedBy);
    // connect a stone to 1 group
    var s2 = this.goban.playAt(4, 2, BLACK);
    this.assertEqual(g, s.group); // not changed
    this.assertEqual([s, s2], g.stones);
    this.assertEqual(6, g.lives);
    this.assertEqual(null, g.mergedBy);
    this.assertEqual(s2.group, g); // same group    
    // connect 2 groups of 1 stone each
    // (s1 on top, s2 2 rows below, and s3 between them)
    var s1 = this.goban.playAt(2, 5, WHITE);
    var g1 = s1.group;
    s2 = this.goban.playAt(2, 3, WHITE);
    var g2 = s2.group;
    var s3 = this.goban.playAt(2, 4, WHITE);
    g = s3.group;
    this.assertEqual(g1, g); // g1 was kept because on top of stone (comes first)
    this.assertEqual(g, s1.group);
    this.assertEqual(g, s2.group);
    this.assertEqual(7, g.lives);
    this.assertEqual([s1, s3, s2], g.stones);
    this.assertEqual(WHITE, g.color);
    this.assertEqual(null, g.mergedBy);
    this.assertEqual(g, g2.mergedWith); // g2 was merged into g/g1
    this.assertEqual(s3, g2.mergedBy);
    this.assertEqual([s2], g2.stones); // g2 still knows s2; will be used for reversing
    // check the list in goban
    this.assertEqual(2, this.goban.mergedGroups.length);
    this.assertEqual(g2, this.goban.mergedGroups[this.goban.mergedGroups.length-1]);
};

TestGroup.prototype.testGroupKill = function () {
    this.goban.playAt(1, 5, WHITE); // a5
    var s = this.goban.playAt(1, 4, WHITE); // a4
    var g = s.group;
    this.assertEqual(3, g.lives);
    var b1 = this.goban.playAt(2, 4, BLACK); // b4
    this.goban.playAt(2, 5, BLACK); // b5
    var bg = b1.group;
    this.assertEqual(1, g.lives); // g in atari
    this.assertEqual(3, bg.lives); // black group has 3 lives because of white group on its left
    s = this.goban.playAt(1, 3, BLACK); // kill!
    this.assertEqual(5, bg.lives); // black group has now 5 lives
    this.assertEqual(0, g.lives); // dead
    this.assertEqual(s, g.killedBy);
    this.assertEqual(true, this.goban.isEmpty(1, 5));
    this.assertEqual(true, this.goban.isEmpty(1, 4));
};

// Shape like  O <- the new stone brings only 2 lives
//            OO    because the one in 3,4 was already owned
TestGroup.prototype.testSharedLivesOnConnect = function () {
    this.goban.playAt(3, 3, WHITE);
    var s = this.goban.playAt(4, 3, WHITE);
    this.assertEqual(6, s.group.lives);
    var s2 = this.goban.playAt(4, 4, WHITE);
    this.assertEqual(7, s2.group.lives);
    this.goban.undo();
    this.assertEqual(6, s.group.lives); // @goban.debug_display
};

// Shape like  OO
//              O <- the new stone brings 1 life but shared lives 
//             OO    are not counted anymore in merged group
TestGroup.prototype.testSharedLivesOnMerge = function () {
    this.goban.playAt(3, 2, WHITE);
    var s1 = this.goban.playAt(4, 2, WHITE);
    this.assertEqual(6, s1.group.lives);
    var s2 = this.goban.playAt(3, 4, WHITE);
    this.assertEqual(4, s2.group.lives);
    this.goban.playAt(4, 4, WHITE);
    this.assertEqual(6, s2.group.lives);
    var s3 = this.goban.playAt(4, 3, WHITE);
    this.assertEqual(10, s3.group.lives);
    this.goban.undo();
    this.assertEqual(6, s1.group.lives);
    this.assertEqual(6, s2.group.lives);
    this.goban.undo();
    this.assertEqual(4, s2.group.lives); // @goban.debug_display
};

// Case of connect + kill at the same time
// Note the quick way to play a few stones for a test
// (methods writen before this one used the old, painful style)
TestGroup.prototype.testCase1 = function () {
    this.game.loadMoves('a2,a1,b2,b1,c2,d1,pass,e1,c1');
    var s = this.goban.stoneAt(1, 2);
    this.assertEqual(6, s.group.lives);
};

// Other case
// OOO
//   O <- new stone
// OOO
TestGroup.prototype.testSharedLives2 = function () {
    this.game.loadMoves('a1,pass,a3,pass,b3,pass,b1,pass,c1,pass,c3,pass,c2');
    var s = this.goban.stoneAt(1, 1);
    this.assertEqual(8, s.group.lives);
    this.goban.undo();
    this.assertEqual(4, s.group.lives);
    this.goban.stoneAt(3, 1);
    this.assertEqual(4, s.group.lives); // @goban.debug_display
};

TestGroup.prototype.checkGroup = function (g, ndx, numStones, color, stones, lives) {
    this.assertEqual(ndx, g.ndx);
    this.assertEqual(numStones, g.stones.length);
    this.assertEqual(color, g.color);
    this.assertEqual(lives, g.lives);
    this.assertEqual(stones, g.stonesDump());
};

TestGroup.prototype.checkStone = function (s, color, move, around) {
    this.assertEqual(color, s.color);
    this.assertEqual(move, s.asMove());
    this.assertEqual(around, s.emptiesDump());
};

// Verifies the around values are updated after merge
// 5 +++++
// 4 ++@++
// 3 OOO++
// 2 @++++
// 1 +++++
//   abcde
TestGroup.prototype.testMergeAndAround = function () {
    var b1 = this.goban.playAt(1, 3, BLACK);
    var bg1 = b1.group;
    var w1 = this.goban.playAt(1, 2, WHITE);
    this.assertEqual(2, w1.group.lives);
    var b2 = this.goban.playAt(3, 3, BLACK);
    var bg2 = b2.group;
    this.assertEqual(true, bg1 !== bg2);
    var w2 = this.goban.playAt(3, 4, WHITE);
    for (var _i = 0; _i < 3; _i++) {
        // ++@
        // O+O
        // @++      
        this.goban.stoneAt(4, 3);
        // now merge black groups:
        var b3 = this.goban.playAt(2, 3, BLACK);
        this.assertEqual(true, (b1.group === b2.group) && (b3.group === b1.group));
        this.assertEqual(3, b1.group.ndx); // and group #3 was used as main (not mandatory but for now it is the case)
        this.assertEqual(5, b1.group.lives);
        // now get back a bit
        this.goban.undo();
        this.checkGroup(bg1, 1, 1, 0, 'a3', 2); // group #1 of 1 black stones [a3], lives:2
        this.checkStone(b1, 0, 'a3', 'a4,b3'); // stoneO:a3 around:  +[a4 b3]
        this.checkGroup(w1.group, 2, 1, 1, 'a2', 2); // group #2 of 1 white stones [a2], lives:2
        this.checkStone(w1, 1, 'a2', 'a1,b2'); // stone@:a2 around:  +[a1 b2]
        this.checkGroup(bg2, 3, 1, 0, 'c3', 3); // group #3 of 1 black stones [c3], lives:3
        this.checkStone(b2, 0, 'c3', 'b3,c2,d3'); // stoneO:c3 around:  +[d3 c2 b3]
        this.checkGroup(w2.group, 4, 1, 1, 'c4', 3); // group #4 of 1 white stones [c4], lives:3 
        this.checkStone(w2, 1, 'c4', 'b4,c5,d4'); // stone@:c4 around:  +[c5 d4 b4]
        // the one below is nasty: we connect with black, then undo and reconnect with white
        this.assertEqual(BLACK, this.game.curColor); // otherwise things are reversed below
        this.game.loadMoves('c2,b2,pass,b4,b3,undo,b4,pass,b3');
        // +++++ 5 +++++
        // +@@++ 4 +@@++
        // OOO++ 3 O@O++
        // @@O++ 2 @@O++
        // +++++ 1 +++++
        // abcde   abcde
        this.checkGroup(bg1, 1, 1, 0, 'a3', 1); // group #1 of 1 black stones [a3], lives:1
        this.checkStone(b1, 0, 'a3', 'a4'); // stoneO:a3 around:  +[a4]
        var wgm = w1.group; // white group after merge
        this.checkGroup(wgm, 4, 5, 1, 'a2,b2,b3,b4,c4', 6);
        this.checkStone(w1, 1, 'a2', 'a1'); // stone@:a2 around:  +[a1]
        this.checkStone(this.goban.stoneAt(2, 2), 1, 'b2', 'b1'); // stone@:b2 around:  +[b1]
        this.checkStone(this.goban.stoneAt(2, 3), 1, 'b3', ''); // stone@:b3 around:  +[]
        this.checkStone(this.goban.stoneAt(2, 4), 1, 'b4', 'a4,b5'); // stone@:b4 around:  +[b5 a4]
        this.checkStone(w2, 1, 'c4', 'c5,d4'); // stone@:c4 around:  +[c5 d4]
        this.checkGroup(bg2, 3, 2, 0, 'c2,c3', 3); // group #3 of 2 black stones [c3,c2], lives:3
        this.checkStone(b2, 0, 'c3', 'd3'); // stoneO:c3 around:  +[d3]
        this.checkStone(this.goban.stoneAt(3, 2), 0, 'c2', 'c1,d2'); // stoneO:c2 around:  +[d2 c1]
        this.game.loadMoves('undo,undo,undo');
        this.assertEqual(0, this.game.moveNumber()); // @goban.debug_display # if any assert shows you might need this to understand what happened...
    }
};

// Fixed bug. This was when undo removes a "kill" and restores a stone 
// ...which attacks (wrongfully) the undone stone
TestGroup.prototype.testKoBug1 = function () {
    this.initBoard(9, 5);
    this.game.loadMoves('e4,e3,f5,f4,g4,f2,f3,d1,f4,undo,d2,c2,f4,d1,f3,undo,c1,d1,f3,g1,f4,undo,undo,f6');
};

// At the same time a stone kills (with 0 lives left) and connects to existing surrounded group,
// killing actually the enemy around. We had wrong raise showing since at a point the group
// we connect to has 0 lives. We simply made the raise test accept 0 lives as legit.
TestGroup.prototype.testKamikazeKillWhileConnect = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('a1,a3,b3,a4,b2,b1,b4,pass,a5,a2,a1,a2,undo,undo');
};

// This was not a bug actually but the test is nice to have.
TestGroup.prototype.testKo2 = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('a3,b3,b4,c2,b2,b1,c3,a2,pass,b3');
    // @game.history.each do |move| puts(move) end
    this.assertEqual(false, this.goban.isValidMove(2, 2, BLACK)); // KO
    this.game.loadMoves('e5,d5');
    this.assertEqual(true, this.goban.isValidMove(2, 2, BLACK)); // KO can be taken again
    this.game.loadMoves('undo');
    this.assertEqual(false, this.goban.isValidMove(2, 2, BLACK)); // since we are back to the ko time because of undo
};

// Fixed. Bug was when undo was picking last group by "merged_with" (implemented merged_by)
TestGroup.prototype.testBug2 = function () {
    this.initBoard(9, 5);
    this.game.loadMoves('j1,d3,j3,d4,j5,d5,j7,d6,undo');
};

// At this moment this corresponds more or less to the speed test case too
TestGroup.prototype.testVarious1 = function () {
    this.initBoard(9, 0);
    this.game.loadMoves('pass,b2,a2,a3,b1,a1,d4,d5,a2,e5,e4,a1,undo,undo,undo,undo,undo,undo');
};

// This test for fixing bug we had if a group is merged then killed and then another stone played
// on same spot as the merging stone, then we undo... We used to only look at merging stone to undo a merge.
// We simply added a check that the merged group is also the same.
TestGroup.prototype.testUndo1 = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('e1,e2,c1,d1,d2,e1,e3,e1,undo,undo,undo,undo');
};

// Makes sure that die & resuscite actions behave well
TestGroup.prototype.testUndo2 = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('a1,b1,c3');
    var ws = this.goban.stoneAt(1, 1);
    var wg = ws.group;
    this.game.loadMoves('a2');
    this.assertEqual(0, wg.lives);
    this.assertEqual(main.EMPTY, ws.color);
    this.assertEqual(true, ws.group === null);
    this.game.loadMoves('undo');
    this.assertEqual(1, wg.lives);
    this.assertEqual(BLACK, ws.color);
    this.game.loadMoves('c3,a2'); // and kill again the same
    this.assertEqual(0, wg.lives);
    this.assertEqual(main.EMPTY, ws.color);
    this.assertEqual(true, ws.group === null);
};

// From another real life situation; kill while merging; black's turn
// 7 OOO
// 6 @@O
// 5 +O@
// 4 @+@
TestGroup.prototype.testUndo3 = function () {
    this.initBoard(5);
    this.game.loadMoves('a2,a5,c2,b3,c3,c4,b4,b5,a4,c5');
    this.assertEqual('OOO++,@@O++,+O@++,@+@++,+++++', this.goban.image());
    this.game.loadMoves('b2,a3,b4,a4');
    this.assertEqual('OOO++,O+O++,OO@++,@@@++,+++++', this.goban.image());
    this.goban.undo();
    this.assertEqual('OOO++,+@O++,OO@++,@@@++,+++++', this.goban.image());
    var w1 = this.goban.stoneAt(1, 5).group;
    var w2 = this.goban.stoneAt(1, 3).group;
    var b1 = this.goban.stoneAt(2, 4).group;
    var b2 = this.goban.stoneAt(1, 2).group;
    this.assertEqual(3, w1.lives);
    this.assertEqual(1, w2.lives);
    this.assertEqual(1, b1.lives);
    this.assertEqual(5, b2.lives);
};

},{"../GameLogic":9,"../main":73,"./TestCase":81,"util":6}],86:[function(require,module,exports){
'use strict';
/* eslint quotes: 0 */
/* jshint quotmark: false */

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');


/** @class NB: for debugging think of using analyser.debug_dump
 */
function TestPotentialTerritory(testName) {
    TestCase.call(this, testName);
}
inherits(TestPotentialTerritory, TestCase);
module.exports = TestPotentialTerritory;


TestPotentialTerritory.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.aiPlayer = new main.defaultAi(this.game, main.BLACK);
    this.pot = this.aiPlayer.getHeuristic('PotentialTerritory');
};

TestPotentialTerritory.prototype.checkGame = function (moves, expected, gsize, finalPos) {
    this.initBoard(gsize || 7);
    this.game.loadMoves(moves);
    if (finalPos) this.assertEqual(finalPos, this.goban.image());

    this.pot.evalBoard();
    var territory = this.pot.image();
    if (this.check(territory === expected)) return;
    this.fail('Expected territory was<br>' + expected + ' but got<br>' + territory);
};

TestPotentialTerritory.prototype.checkGameTODO = function (moves, expected, gsize, finalPos) {
    this.startBrokenTest();
    this.checkGame(moves, expected, gsize, finalPos);
};

//---


TestPotentialTerritory.prototype.testBigEmptySpace = function () {
    /** 
    Black should own the lower board. Top board is disputed... or black too.
    ++O++++
    ++O@+++
    ++O++++
    +@@@+++
    +++++++
    +++++++
    +++++++
    */
    this.checkGameTODO('d4,c5,d6,c7,c4,c6,b4',
        //'-------,-------,-------,-------,-------,-------,-------'); // if White group is seen dead
        '???????,???????,???????,-------,-------,-------,-------'); // if White group is seen in dispute
};

TestPotentialTerritory.prototype.testInMidGame = function () {
    // 9 +++++++++
    // 8 +++O@++++
    // 7 ++O+@+@++
    // 6 ++O++++++
    // 5 +O++O+@@+
    // 4 +O@++++O+
    // 3 +@@+@+O++
    // 2 +++@O++++
    // 1 +++++++++
    //   abcdefghj
    this.checkGameTODO('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3',
        "::::-'---," +
        "::::-'---," +
        ":::?-'---," +
        ":::??''''," +
        "::????---," +
        "::-????::," +
        "?--?-?:::," +
        "----??:::," +
        "----??:::", 9);
};

TestPotentialTerritory.prototype.testOnFinishedGame = function () {
    // 9 ++O@@++++
    // 8 +@OO@++@+
    // 7 OOOO@@@++
    // 6 ++OOOOO@@
    // 5 OO@@O@@@@
    // 4 @@@+OOOO@
    // 3 O@@@@@O+O
    // 2 +++@OOO++
    // 1 +++@@O+++
    //   abcdefghj
    this.checkGameTODO('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5',
        ':::------,::::-----,::::-----,:::::::--,::--:----,---?::::-,------:::,----:::::,-----::::', 9,
        '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++');
};

TestPotentialTerritory.prototype.testMessyBoard = function () {
    // +++O+++
    // +@O+O@+
    // ++OOO@+
    // +O+@+@+
    // +O@@@O+
    // @@OOOO+
    // ++++@@+
    this.checkGameTODO('d4,d2,e3,b4,e1,c5,d6,d5,c3,e5,d3,b3,b2,c2,a2,e2,f1,f2,b6,c6,f6,e6,f4,d7,f5,f3',
        '??.:.??,' +
        '??:::??,' +
        '??:::??,' +
        '???????,' +
        '?????:.,' +
        '??:::::,' +
        '??:::::');
        // FIXME NW BLACK should die even if Black plays first; one reason is strong b4-c5 W connection
        //":::::--,:::::--,:::::--,::???--,::???::,:::::::,:::::::"
};

TestPotentialTerritory.prototype.testConnectBorders = function () {
    // Right side white territory is established; white NW single stone is enough to claim the corner
    // +++++@+++
    // ++++@@O++
    // ++O+@O+++
    // ++++@+O++
    // ++++@+O++
    // +++@+O+++
    // ++@OO++++
    // ++@@OO+++
    // +++++++++
    this.checkGameTODO('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9,c7',
        "????'-?::," +
        "????--:::," +
        "????-::::," +
        "????-?:::," +
        "''''-?:::," +
        "----?::::," +
        "---::::::," +
        "----:::::," +
        "----:::::",
        9, '+++++@+++,++++@@O++,++O+@O+++,++++@+O++,++++@+O++,+++@+O+++,++@OO++++,++@@OO+++,+++++++++');
};

// Same as above but no White NW stone (c7)
// +++++@+++
// ++++@@O++
// ++++@O+++
// ++++@+O++
// ++++@+O++
// +++@+O+++
// ++@OO++++
// ++@@OO+++
// +++++++++
TestPotentialTerritory.prototype.testConnectBordersNoC7 = function () {
    this.checkGameTODO('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9',
        "------?::,------:::,-----::::,-----?:::,-----?:::,----?::::,---::::::,----:::::,----:::::", 9);
};

TestPotentialTerritory.prototype.test5by5withCornerCatch = function () {
    // Black a5 left as is would be captured, and full black group would die
    // @OOO+
    // +@@O+
    // +@+O+
    // @@+O+
    // +@+O+
    this.checkGameTODO('a2,d3,b2,d4,b1,d2,b3,d1,a5,b5,b4,c5,c4,d5',
        "'::::,'''::,''?::,''?::,''?::", 5);
};

TestPotentialTerritory.prototype.test5by5withCornerCatch2 = function () {
    // Simple flip of above game
    this.checkGameTODO('a4,d3,b4,d2,b5,d4,b3,d5,a1,b1,b2,c1,c2,d1',
        "''?::,''?::,''?::,'''::,'::::", 5);
};

},{"../GameLogic":9,"../main":73,"./TestCase":81,"util":6}],87:[function(require,module,exports){
//Translated from test_score_analyser.rb using babyruby2js
'use strict';

var main = require('../main');
var CONST = require('../constants');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class */
function TestScoreAnalyser(testName) {
    TestCase.call(this, testName);
}
inherits(TestScoreAnalyser, TestCase);
module.exports = TestScoreAnalyser;


TestScoreAnalyser.prototype.initGame = function (size, komi) {
    if (size === undefined) size = 5;
    this.game = new GameLogic();
    this.game.newGame(size, 0, komi || 0);
    this.sa = new ScoreAnalyser(this.game);
    // when size is 7 we load an ending game to get real score situation
    if (size === 7) {
        // 7 +++++++
        // 6 +++@@@@
        // 5 @*+@OO@
        // 4 O@@@O+O
        // 3 OOOO+O+
        // 2 ++O+O++
        // 1 +++O+++
        //   abcdefg
        this.game.loadMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass');
    }
};

TestScoreAnalyser.prototype.testComputeScore = function () {
    this.initGame(7, 1.5);
    var s = this.sa.computeScoreAsTexts();
    this.assertEqual('white wins by 6.5 points', s.shift());
    this.assertEqual('black: 12 points', s.shift());
    this.assertEqual('white: 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
    // test message when someone resigns
    this.game.playOneMove('resi'); // it is black's turn
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['white won (black resigned)'], s);
    // NB: GameLogic does not forbid to "resign twice", no big deal
    this.game.resign(WHITE, 'time');
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['black won (white ran out of time)'], s);
    this.game.resign(WHITE, 'illegal move');
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['black won (white disqualified: illegal move)'], s);
};

TestScoreAnalyser.prototype.testComputeScoreDiff = function () {
    this.initGame(7, 3.5);
    this.assertEqual(-8.5, this.sa.computeScoreDiff());
};

TestScoreAnalyser.prototype.testScoreInfo = function () {
    this.initGame(7, 0.5);
    var i = this.sa.computeScoreInfo();
    this.assertEqual([12, 17.5], i.shift());
    this.assertEqual([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.testScoringGrid = function () {
    this.initGame(7, 1.5);
    this.sa.computeScoreDiff();
    var sgridYx = this.sa.getScoringGrid().yx;
    var goban = this.game.goban;
    this.assertEqual(main.EMPTY, goban.stoneAt(1, 1).color); // score analyser leaves the goban untouched
    this.assertEqual(Grid.TERRITORY_COLOR + WHITE, sgridYx[1][1]); // a1
    this.assertEqual(Grid.TERRITORY_COLOR + BLACK, sgridYx[6][2]); // b6
};

},{"../GameLogic":9,"../Grid":12,"../ScoreAnalyser":16,"../constants":72,"../main":73,"./TestCase":81,"util":6}],88:[function(require,module,exports){
'use strict';

var main = require('../main');

var FAILED_ASSERTION_MSG = 'Failed assertion: ';


/** @class */
function TestSeries() {
    this.testCases = {};
    this.testCount = 0;
    this.failedCount = this.errorCount = 0;
    this.failedCount0 = this.errorCount0 = 0;
    this.brokenCount = this.fixedCount = 0;
    this.currentTest = '';
    this.inBrokenTest = false;
}
module.exports = TestSeries;


TestSeries.prototype.add = function (klass) {
    this.testCases[main.funcName(klass)] = klass;
    return klass;
};

TestSeries.prototype.testOneClass = function (Klass, methodPattern) {
    var pattern = methodPattern ? methodPattern.toLowerCase() : '';

    for (var method in Klass.prototype) {
        if (typeof Klass.prototype[method] !== 'function') continue;
        if (method.substr(0,4) !== 'test') continue;
        if (method.toLowerCase().indexOf(pattern) === -1) continue;
        this.testCount++;
        this.currentTest = main.funcName(Klass) + '#' + method;
        var test = new Klass(this.currentTest);
        test.series = this;

        this._testOneMethod(test, test[method], methodPattern);
    }
};

TestSeries.prototype._testOneMethod = function (test, method, methodPattern) {
    try {
        this.inBrokenTest = false;

        method.call(test);

        if (this.inBrokenTest) this._endBrokenTest(/*failed=*/false);
        if (this.testCount === 1 && methodPattern) test.showInUi('First test matching "' + methodPattern + '"');
    } catch(e) {
        if (this.inBrokenTest && !main.debug) {
            return this._endBrokenTest(/*failed=*/true);
        }
        var msg = e.message;
        if (msg.startsWith(FAILED_ASSERTION_MSG)) {
            this.failedCount++;
            msg = msg.substr(FAILED_ASSERTION_MSG.length);
            main.log.error('Test failed: ' + this.currentTest + ': ' + msg + '\n');
        } else {
            this.errorCount++;
            main.log.error('Exception during test: ' + this.currentTest + ':\n' + e.stack + '\n');
        }
        test.showInUi(msg);
    }
};

TestSeries.prototype.failTest = function (msg, comment) {
    comment = comment ? comment + ': ' : '';
    throw new Error(FAILED_ASSERTION_MSG + comment + msg);
};

TestSeries.prototype.startBrokenTest = function () {
    this.inBrokenTest = true;
    this.failedCount0 = this.failedCount;
    this.errorCount0 = this.errorCount;
};

TestSeries.prototype._endBrokenTest = function (failed) {
    if (failed) {
        main.log.info('BROKEN: ' + this.currentTest);
        this.brokenCount++;
    } else {
        main.log.info('FIXED: ' + this.currentTest);
        this.fixedCount++;
    }
    this.failedCount = this.failedCount0;
    this.errorCount = this.errorCount0;
};

/** Runs the registered test cases
 * @param {string} [specificClass] - name of single class to test. E.g. "TestSpeed"
 * @param {string} [methodPattern] - if given, only test names containing this pattern are run
 * @return {number} - number of issues detected (exceptions + errors + warnings); 0 if all fine
 */
TestSeries.prototype.run = function (specificClass, methodPattern) {
    var logLevel = main.log.level;
    var classCount = 0;
    this.testCount = this.checkCount = this.count = 0;
    this.failedCount = this.errorCount = this.todoCount = 0;
    this.brokenCount = this.fixedCount = 0;
    var startTime = Date.now();

    for (var t in this.testCases) {
        if (specificClass && t !== specificClass) continue;
        classCount++;
        var Klass = this.testCases[t];
        this.testOneClass(Klass, methodPattern);
        main.log.level = logLevel; // restored to initial level
    }
    var duration = ((Date.now() - startTime) / 1000).toFixed(2);
    return this._logReport(specificClass, classCount, duration);
};

TestSeries.prototype._logReport = function (specificClass, classCount, duration) {
    var numIssues = this.errorCount + this.failedCount;
    var classes = specificClass ? 'class ' + specificClass : classCount + ' classes';

    var report = 'Completed tests. (' + classes + ', ' + this.testCount + ' tests, ' +
        this.checkCount + ' checks in ' + duration + 's)\n\n';

    if (numIssues === 0) {
        if (this.testCount || this.checkCount) report += 'SUCCESS!';
        else report += '*** 0 TESTS DONE ***  Check your filter?';

        if (this.brokenCount || this.fixedCount) {
            report += ' (known broken: ' + this.brokenCount +
                (this.fixedCount ? ', fixed: ' + this.fixedCount : '') + ')';
        }
        if (this.todoCount) report += '  (Todos: ' + this.todoCount + ')';
        if (this.count) report += '\n(generic count: ' + this.count + ')';
        main.log.info(report);
    } else {
        report += '*** ISSUES: exceptions: ' + this.errorCount +
            ', failed: ' + this.failedCount + ' ***';
        main.log.error(report);
    }
    return numIssues;
};

},{"../main":73}],89:[function(require,module,exports){
//Translated from test_sgf_reader.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var SgfReader = require('../SgfReader');
var TestCase = require('./TestCase');


/** @class */
function TestSgfReader(testName) {
    TestCase.call(this, testName);
}
inherits(TestSgfReader, TestCase);
module.exports = TestSgfReader;


TestSgfReader.prototype.testSgfNoHandicap = function () {
    // Game from LittleGolem
    var game = '(;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]SO[http://www.littlegolem.com];B[pd];W[pp];B[ce];W[dc];B[dp];W[ee];B[dg];W[cn];B[fq];W[bp];B[cq];W[bq];B[br];W[cp];B[dq];W[dj];B[cc];W[cb];B[bc];W[nc];B[qf];W[pb];B[qc];W[jc];B[qn];W[nq];B[pj];W[ch];B[cg];W[bh];B[bg];W[iq];B[en];W[gr];B[fr];W[ol];B[ql];W[rp];B[ro];W[qo];B[po];W[qp];B[pn];W[no];B[cl];W[dm];B[cj];W[dl];B[di];W[ck];B[ej];W[dk];B[ci];W[bj];B[bi];W[bk];B[ah];W[gc];B[lc];W[ld];B[kd];W[md];B[kc];W[jd];B[ke];W[nf];B[kg];W[oh];B[qh];W[nj];B[hf];W[ff];B[fg];W[gf];B[gg];W[he];B[if];W[ki];B[jp];W[ip];B[jo];W[io];B[jn];W[im];B[in];W[hn];B[jm];W[il];B[jl];W[ik];B[jk];W[jj];B[ho];W[go];B[hm];W[gn];B[ij];W[hj];B[ii];W[gk];B[kj];W[ji];B[lj];W[li];B[mj];W[mi];B[nk];W[ok];B[ni];W[oj];B[nh];W[ng];B[mh];W[lh];B[mg];W[lg];B[nn];W[pi];B[om];W[ml];B[mo];W[mp];B[ln];W[mk];B[qj];W[qi];B[jq];W[ir];B[ar];W[mm];B[oo];W[np];B[mn];W[ri];B[dd];W[ec];B[bb];W[rk];B[pl];W[rg];B[qb];W[pf];B[pe];W[of];B[qg];W[rh];B[ob];W[nb];B[pc];W[sd];B[rc];W[re];B[qe];W[ih];B[hi];W[hh];B[gi];W[hg];B[jh];W[lf];B[kf];W[lp];B[nm];W[kk];B[lr];W[lq];B[kr];W[jr];B[kq];W[mr];B[kb];W[jb];B[ja];W[ia];B[ka];W[hb];B[ie];W[id];B[ed];W[fd];B[db];W[eb];B[ca];W[de];B[cd];W[ek];B[ei];W[em];B[gq];W[gp];B[hr];W[hq];B[gs];W[eo];B[do];W[dn];B[co];W[bo];B[ep];W[fo];B[kl];W[lk];B[lm];W[rm];B[rn];W[rl];B[rj];W[sj];B[rf];W[sf];B[rd];W[se];B[sc];W[sg];B[qm];W[oc];B[pa];W[ko];B[kn];W[ea];B[op];W[oq];B[df];W[fe];B[ef];W[da];B[cb];W[aq];B[gj];W[hk];B[na];W[ma];B[oa];W[mc];B[le];W[me];B[oe];W[nl];B[sp];W[sq];B[so];W[qq];B[ne];W[ls];B[ks];W[aj];B[ms];W[ns];B[ls];W[ai];B[dh];W[fj];B[fi];W[fk];B[je];W[is];B[hs];W[sm];B[sk];W[sl];B[si];W[sh];B[ph];W[oi];B[pg];W[kp];B[og];W[mf];B[kh];W[qk];B[pk];W[si];B[ig];W[fp];B[js];W[hp];B[tt];W[tt];B[tt])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(19, infos.boardSize);
    this.assertEqual(6.5, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual('Bq16,q4,c15,d17,d4,e15,d13,c6,f3,b4,c3,b3,b2,c4,d3,d10,c17,c18,b17,o17,r14,q18,r17,k17,r6,o3,q10,c12,c13,b12,b13,j3,e6,g2,f2,p8,r8,s4,s5,r5,q5,r4,q6,o5,c8,d7,c10,d8,d11,c9,e10,d9,c11,b10,b11,b9,a12,g17,m17,m16,l16,n16,l17,k16,l15,o14,l13,p12,r12,o10,h14,f14,f13,g14,g13,h15,j14,l11,k4,j4,k5,j5,k6,j7,j6,h6,k7,j8,k8,j9,k9,k10,h5,g5,h7,g6,j10,h10,j11,g9,l10,k11,m10,m11,n10,n11,o9,p9,o11,p10,o12,o13,n12,m12,n13,m13,o6,q11,p7,n8,n5,n4,m6,n9,r10,r11,k3,j2,a2,n7,p5,o4,n6,s11,d16,e17,b18,s9,q8,s13,r18,q14,q15,p14,r13,s12,p18,o18,q17,t16,s17,s15,r15,j12,h11,h12,g11,h13,k12,m14,l14,m4,o7,l9,m2,m3,l2,k2,l3,n2,l18,k18,k19,j19,l19,h18,j15,j16,e16,f16,d18,e18,c19,d15,c16,e9,e11,e7,g3,g4,h2,h3,g1,e5,d5,d6,c5,b5,e4,f5,l8,m9,m7,s7,s6,s8,s10,t10,s14,t14,s16,t15,t17,t13,r7,p17,q19,l5,l6,e19,p4,p3,d14,f15,e14,d19,c18,a3,g10,h9,o19,n19,p19,n17,m15,n15,p15,o8,t4,t3,t5,r3,o15,m1,l1,a10,n1,o1,m1,a11,d12,f10,f11,f9,k15,j1,h1,t7,t9,t8,t11,t12,q12,p11,q13,l4,p13,n14,l12,r9,q9,t11,j13,f4,k1,h4,pass,pass,pass',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgfWithHandicap = function () {
    // Game 2 from LittleGolem - with handicap; +replaced pass moves "tt" by ""
    var game = '(;FF[4]EV[go19.mc.2010.mar.1.21]PB[fuego19 bot]PW[Olivier Lombart]KM[0.5]SZ[19]SO[http://www.littlegolem.com]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq];B[fp];W[dq];B[eq];W[er];B[ep];W[cq];B[fr];W[cp];B[cn];W[co];B[dn];W[nq];B[oc];W[fc];B[ql];W[pr];B[cg];W[qq];B[mc];W[pg];B[nh];W[qi];B[dr];W[cr];B[nk];W[qe];B[hc];W[db];B[jc];W[cc];B[qj];W[qc];B[qd];W[rd];B[re];W[rc];B[qf];W[rf];B[pe];W[se];B[rg];W[qe];B[qg];W[jq];B[es];W[fe];B[ci];W[no];B[bn];W[bo];B[cs];W[bs];B[pb];W[ef];B[ao];W[ap];B[ip];W[pn];B[qn];W[qo];B[jp];W[iq];B[kq];W[lq];B[kr];W[kp];B[hq];W[lr];B[ko];W[lp];B[kg];W[hh];B[ir];W[ce];B[pm];W[rn];B[ek];W[an];B[am];W[ao];B[re];W[sk];B[qm];W[rm];B[ro];W[rp];B[qp];W[po];B[oo];W[on];B[om];W[nn];B[ii];W[bm];B[cm];W[bl];B[cl];W[bk];B[gi];W[ll];B[lm];W[km];B[kl];W[jm];B[lk];W[ln];B[hi];W[hf];B[kc];W[hm];B[ml];W[jo];B[io];W[jn];B[in];W[im];B[bf];W[be];B[bj];W[ri];B[rj];W[sj];B[rl];W[sl];B[qb];W[ph];B[pi];W[qh];B[ae];W[ad];B[ck];W[ds];B[gm];W[ik];B[kj];W[of];B[gb];W[hn];B[gl];W[ho];B[hp];W[fo];B[nf];W[ne];B[oe];W[ng];B[mf];W[mg];B[mh];W[lg];B[lh];W[lf];B[me];W[le];B[md];W[kf];B[jg];W[eh];B[af];W[cd];B[ak];W[fn];B[sf];W[gh];B[hk];W[fi];B[nm];W[ih];B[ji];W[jh];B[kh];W[er];B[fs];W[oh];B[ib];W[oi];B[oj];W[ni];B[mi];W[nj];B[jk];W[hl];B[ij];W[em];B[ls];W[ms];B[dh];W[ks];B[jr];W[cf];B[bg];W[fj];B[gj];W[fk];B[gk];W[fb];B[hd];W[gc];B[fa];W[ea];B[ga];W[dg];B[mj];W[dl];B[il];W[ej];B[gd];W[fd];B[el];W[fl];B[dk];W[dm];B[sd];W[dr];B[ge];W[gf];B[id];W[jl];B[ik];W[ig];B[jf];W[ld];B[lc];W[di];B[ei];W[ha];B[hb];W[di];B[ch];W[ei];B[fm];W[en];B[do];W[mn];B[mm];W[je];B[kd];W[go];B[gq];W[js];B[is];W[ls];B[ke];W[og];B[ie];W[sh];B[if];W[so];B[he];W[fg];B[pf];W[si];B[sg];W[kn];B[rh];W[sm];B[rk];W[gn];B[eo];W[];B[];W[];B[])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(19, infos.boardSize);
    this.assertEqual(0.5, infos.komi);
    this.assertEqual(6, infos.handicap);
    this.assertEqual('hand:B=q16-d4-q4-d16-q10-d10,Wf3,f4,d3,e3,e2,e4,c3,f2,c4,c6,c5,d6,o3,p17,f17,r8,q2,c13,r3,n17,q13,o12,r11,d2,c2,o9,r15,h17,d18,k17,c17,r10,r17,r16,s16,s15,s17,r14,s14,q15,t15,s13,r15,r13,k3,e1,f15,c11,o5,b6,b5,c1,b1,q18,e14,a5,a4,j4,q6,r6,r5,k4,j3,l3,m3,l2,l4,h3,m2,l5,m4,l13,h12,j2,c15,q7,s6,e9,a6,a7,a5,s15,t9,r7,s7,s5,s4,r4,q5,p5,p6,p7,o6,j11,b7,c7,b8,c8,b9,g11,m8,m7,l7,l8,k7,m9,m6,h11,h14,l17,h7,n8,k5,j5,k6,j6,j7,b14,b15,b10,s11,s10,t10,s8,t8,r18,q12,q11,r12,a15,a16,c9,d1,g7,j9,l10,p14,g18,h6,g8,h5,h4,f5,o14,o15,p15,o13,n14,n13,n12,m13,m12,m14,n15,m15,n16,l14,k13,e12,a14,c16,a9,f6,t14,g12,h9,f11,o7,j12,k11,k12,l12,e2,f1,p12,j18,p11,p10,o11,n11,o10,k9,h8,j10,e7,m1,n1,d12,l1,k2,c14,b13,f10,g10,f9,g9,f18,h16,g17,f19,e19,g19,d13,n10,d8,j8,e10,g16,f16,e8,f8,d9,d7,t16,d2,g15,g14,j16,k8,j9,j13,k14,m16,m17,d11,e11,h19,h18,d11,c12,e11,f7,e6,d5,n6,n7,k15,l16,g5,g3,k1,j1,m1,l15,p13,j15,t12,j14,t5,h15,f13,q14,t11,t13,l6,s12,t7,s9,g6,e5,pass,pass,pass,pass',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgfWithCommentsAndEscapedChars = function () {
    // Game from KGS Bot tournament (contains "\]")
    var game = '(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2] RU[Chinese]SZ[13]KM[7.50]TM[540]OT[10/30 Canadian] PW[AyaMC]PB[abakus]WR[3d]BR[5d]DT[2015-12-06]PC[The KGS Go Server at http://www.gokgs.com/]C[abakus [5d\\]: GTP Engine for abakus (black): Abakus version 20151124. Have a nice game! AyaMC [3d\\]: GTP Engine for AyaMC (white): Aya version 7.85x ]RE[B+Resign] ;B[kd]BL[538.796] ;W[dd]WL[534.304] ;B[dj]BL[533.672] ;W[jk]WL[528.911] ;B[cc]BL[528.49] ;W[jg]WL[518.219] ;B[hd]BL[523.244] ;W[dc]WL[506.076] ;B[kk]BL[517.912] ;W[jj]WL[497.504] ;B[kj]BL[512.541] ;W[ji]WL[487.283] ;B[kh]BL[506.973] ;W[ci]WL[476.303] ;B[cf]BL[501.478] ;W[di]WL[465.306] ;B[cd]BL[495.775] ;W[de]WL[457.758] ;B[cj]BL[490.122] ;W[ej]WL[450.304] ;B[ek]BL[484.394] ;W[bj]WL[439.151] ;B[bk]BL[478.509] ;W[fk]WL[431.785] ;B[ei]BL[472.607] ;W[fj]WL[425.918] ;B[bi]BL[466.64] ;W[bh]WL[418.984] ;B[aj]BL[460.592] ;W[ce]WL[418.079] ;B[ch]BL[454.562] ;W[dh]WL[412.067] ;B[cg]BL[448.411] ;W[jc]WL[403.129] ;B[jd]BL[442.046]C[HYamashita [?\\]: Aya thinks 54% for w. ] ;W[ic]WL[392.818] ;B[hc]BL[435.676] ;W[id]WL[382.391] ;B[ie]BL[429.243] ;W[he]WL[374.706] ;B[kc]BL[422.684] ;W[be]WL[366.623] ;B[fd]BL[415.99] ;W[fc]WL[355.717] ;B[fb]BL[409.184] ;W[hf]WL[344.867] ;B[ib]BL[402.253] ;W[ki]WL[338.787] ;B[eh]BL[395.166] ;W[li]WL[333.51] ;B[hl]BL[387.955]C[HYamashita [?\\]: hmm... similar shape. ] ;W[il]WL[327.9] ;B[gi]BL[380.558] ;W[el]WL[318.677]C[gogonuts [3d\\]: abakus seems to be playing those 3-3 invasions too early ] ;B[db]BL[373.018]C[HYamashita [?\\]: D7 is ladder? ] ;W[eb]WL[313.967] ;B[ea]BL[365.31] ;W[cb]WL[313.305] ;B[ec]BL[357.407] ;W[bb]WL[312.599] ;B[hh]BL[349.515]C[gogonuts [3d\\]: y ] ;W[ed]WL[303.707]C[HYamashita [?\\]: thx. 52% for w. ] ;B[hk]BL[341.303] ;W[hj]WL[302.873] ;B[gj]BL[332.984] ;W[dg]WL[302.008]C[gogonuts [3d\\]: not anymore HYamashita [?\\]: oh ] ;B[gk]BL[324.465]C[gogonuts [3d\\]: e10 broke it ] ;W[dk]WL[292.138] ;B[fl]BL[315.67] ;W[ck]WL[289.354] ;B[bj]BL[306.853] ;W[if]WL[280.722] ;B[fi]BL[298.178] ;W[je]WL[271.173]C[HYamashita [?\\]: big furikawari gogonuts [3d\\]: bots play rough on 13*13 :-) ] ;B[jb]BL[289.728] ;W[fg]WL[269.17]C[HYamashita [?\\]: I like rough play :-) ] ;B[gc]BL[281.567]C[gogonuts [3d\\]: lol ] ;W[bg]WL[263.706] ;B[lf]BL[273.64]C[HYamashita [?\\]: oops 41% for w. ] ;W[lg]WL[254.75] ;B[kg]BL[265.924] ;W[le]WL[254.081] ;B[ke]BL[258.429] ;W[kf]WL[253.414]C[gogonuts [3d\\]: nasty ko ] ;B[jf]BL[251.058] ;W[fm]WL[250.004] ;B[ek]BL[243.875] ;W[kf]WL[249.152]C[HYamashita [?\\]: 39% for w. ] ;B[jl]BL[236.855] ;W[kl]WL[243.202] ;B[jf]BL[230.089] ;W[hm]WL[241.051] ;B[ie]BL[223.604] ;W[mf]WL[233.697] ;B[kf]BL[217.374] ;W[eg]WL[232.283]C[gogonuts [3d\\]: ko wasnt really playable ] ;B[dl]BL[211.285]C[gogonuts [3d\\]: the last hurah ] ;W[lh]WL[225.674] ;B[gm]BL[205.35]C[HYamashita [?\\]: 18% resign soon HYamashita [?\\]: thx for the game. farg [7k\\]: thx ])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(13, infos.boardSize);
    this.assertEqual(7.5, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual('Bl10,d10,d4,k3,c11,k7,h10,d11,l3,k4,l4,k5,l6,c5,c8,d5,c10,d9,c4,e4,e3,b4,b3,f3,e5,f4,b5,b6,a4,c9,c6,d6,c7,k11,k10,j11,h11,j10,j9,h9,l11,b9,f10,f11,f12,h8,j12,l5,e6,m5,h2,j2,g5,e2,d12,e12,e13,c12,e11,b12,h6,e10,h3,h4,g4,d7,g3,d3,f2,c3,b4,j8,f5,k9,k12,f7,g11,b7,m8,m7,l7,m9,l9,l8,k8,f1,e3,l8,k2,l2,k8,h1,j9,n8,l8,e7,d2,m6,g1',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgf3AndPartialLoad = function () {
    // From Computer Go Test Collection; Format FF[3]
    // + stones set by hand before a single move + marked vertex using BM, CR, etc.
    var game = '(;GM[1]FF[3]SZ[19]AP[Explorer:0]N[Territory]ID[Territory]BS[0]WS[0];AB[oc][pd][qf][op][qp][lq]AW[dd][cj][co][dq][iq]CR[jc][jd];W[ch]BM[1]CR[fc][ic][id][jd][jc])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(0, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual(19, infos.boardSize);

    this.assertEqual('hand:B=p17-q16-r14-p4-r4-m3,hand:W=d16-c10-c5-d3-j3,Wc12',
        reader.toMoveList());
    // and this time stopping *before* move #1
    infos = reader.readGame(game, 1);
    this.assertEqual('hand:B=p17-q16-r14-p4-r4-m3,hand:W=d16-c10-c5-d3-j3',
        reader.toMoveList());
};

},{"../SgfReader":17,"./TestCase":81,"util":6}],90:[function(require,module,exports){
//Translated from test_speed.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var Goban = require('../Goban');
var TestCase = require('./TestCase');
var TimeKeeper = require('./TimeKeeper');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestSpeed(testName) {
    TestCase.call(this, testName);
    main.debug = false; // if true it takes forever...
    this.initBoard();
}
inherits(TestSpeed, TestCase);
module.exports = TestSpeed;

TestSpeed.CM_UNDO = 0;
TestSpeed.CM_CLEAR = 1;
TestSpeed.CM_NEW = 2;


TestSpeed.prototype.initBoard = function (size) {
    this.goban = new Goban(size || 9);
    this.goban.setPositionalSuperko(false);
};

TestSpeed.prototype.testSpeedBasic = function () {
    var t = new TimeKeeper();
    // Basic test
    var count = main.isCoverTest ? 1 : 50000;
    t.start('Basic (no move validation) ' + 10 * count + ' stones and undo', 0.3);
    for (var i = count; i >=0; i--) {
        this.play10Stones();
    }
    t.stop();
};

TestSpeed.prototype.testSpeed35moves = function () {
    var t = new TimeKeeper();
    // prepare games so we isolate the GC caused by that 
    // (in real AI thinking there will be many other things but...)
    // 35 moves, final position:
    // 9 +++@@O+++
    // 8 +O@@OO+++
    // 7 +@+@@O+++
    // 6 ++@OO++++
    // 5 ++@@O++++
    // 4 ++@+@O+++
    // 3 ++@+@O+++
    // 2 ++O@@O+O+
    // 1 ++++@@O++
    //   abcdefghj
    var game1 = 'c3,f3,d7,e5,c5,f7,e2,e8,d8,f2,f1,g1,e1,h2,e3,d4,e4,f4,d5,d3,d2,c2,c4,d6,e7,e6,c6,f8,e9,f9,d9,c7,c8,b8,b7';
    var game1MovesIj = this.movesIj(game1);
    var count = main.isCoverTest ? 1 : 2000;
    t.start('35 move game, ' + count + ' times and undo', 0.05);
    for (var i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
    // The idea here is to verify that undoing things is cheaper than throwing it all to GC
    // In a tree exploration strategy the undo should be the only way (otherwise we quickly hog all memory)
    t.start('35 move game, ' + count + ' times new board each time', 0.16);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_NEW);
    }
    t.stop();
    // And here we see that the "clear" is the faster way to restart a game 
    // (and that it does not "leak" anything to GC)
    t.start('35 move game, ' + count + ' times, clear board each time', 0.04);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_CLEAR);
    }
    t.stop();
};

TestSpeed.prototype.testSpeed63movesAndUndo = function () {
    var t = new TimeKeeper();
    // 9 ++O@@++++
    // 8 +@OO@++@+
    // 7 OOOO@@@++
    // 6 ++OOOOO@@
    // 5 OO@@O@@@@
    // 4 @@@+OOOO@
    // 3 O@@@@@O+O
    // 2 +++@OOO++
    // 1 +++@@O+++
    //   abcdefghj
    var game2 = 'c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5';
    var game2MovesIj = this.movesIj(game2);

    // validate the game once
    this.playMoves(game2MovesIj);
    var finalPos = '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++';
    this.assertEqual(finalPos, this.goban.image());

    this.initBoard();
    var count = main.isCoverTest ? 1 : 2000;
    t.start('63 move game, ' + count + ' times and undo', 0.1);
    for (var i = 0; i < count; i++) {
        this.playGameAndClean(game2MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();

    t.start('63 move game, ' + count + ' times and undo, using superko rule', 0.4);
    this.goban.setPositionalSuperko(true);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game2MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
};

// Converts "a1,b2" in [1,1,2,2]
TestSpeed.prototype.movesIj = function (game) {
    var movesIj = [];
    for (var m, m_array = game.split(','), m_ndx = 0; m=m_array[m_ndx], m_ndx < m_array.length; m_ndx++) {
        var ij = Grid.move2xy(m);
        movesIj.push(ij[0]);
        movesIj.push(ij[1]);
    }
    return movesIj;
};

TestSpeed.prototype.playMoves = function (movesIj) {
    var moveCount = 0;
    var curColor = BLACK;
    for (var n = 0; n <= movesIj.length - 2; n += 2) {
        var i = movesIj[n];
        var j = movesIj[n + 1];
        if (!this.goban.isValidMove(i, j, curColor)) {
            throw new Error('Invalid move: ' + i + ',' + j);
        }
        this.goban.playAt(i, j, curColor);
        moveCount += 1;
        curColor = (curColor + 1) % 2;
    }
    return moveCount;
};

TestSpeed.prototype.playGameAndClean = function (movesIj, cleanMode) {
    var numMoves = movesIj.length / 2;
    if (main.debug) main.log.debug('About to play a game of ' + numMoves + ' moves');
    this.assertEqual(numMoves, this.playMoves(movesIj));
    switch (cleanMode) {
    case TestSpeed.CM_UNDO:
        for (var i = 0; i < numMoves; i++) {
            this.goban.undo();
        }
        break;
    case TestSpeed.CM_CLEAR:
        this.goban.clear();
        break;
    case TestSpeed.CM_NEW:
        this.initBoard();
        break;
    default: 
        throw new Error('Invalid clean mode');
    }
    this.assertEqual(true, !this.goban.previousStone());
};

// Our first, basic test
TestSpeed.prototype.play10Stones = function () {
    this.goban.tryAt(2, 2, WHITE);
    this.goban.tryAt(1, 2, BLACK);
    this.goban.tryAt(1, 3, WHITE);
    this.goban.tryAt(2, 1, BLACK);
    this.goban.tryAt(1, 1, WHITE);
    this.goban.tryAt(4, 4, BLACK);
    this.goban.tryAt(4, 5, WHITE);
    this.goban.tryAt(1, 2, BLACK);
    this.goban.tryAt(5, 5, WHITE);
    this.goban.tryAt(5, 4, BLACK);
    for (var i = 0; i < 10; i++) {
        this.goban.untry();
    }
};

},{"../Goban":11,"../Grid":12,"../main":73,"./TestCase":81,"./TimeKeeper":93,"util":6}],91:[function(require,module,exports){
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Goban = require('../Goban');
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestStone(testName) {
    TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestStone, TestCase);
module.exports = TestStone;


TestStone.prototype.testStoneInternals = function () {
    var s = this.goban.playAt(5, 4, BLACK);
    this.assertEqual('B-e4', s.toString());
    this.assertEqual('e3', this.goban.stoneAt(5,3).toString());
};

TestStone.prototype.howManyLives = function (i, j) {
    var s = this.goban.stoneAt(i, j);
    var livesBefore = s.empties().length;
    // we test the play/undo too
    s = this.goban.playAt(i, j, WHITE);
    var lives = s.empties().length;
    this.assertEqual(livesBefore, lives);
    this.goban.undo();
    var livesAfter = s.empties().length;
    this.assertEqual(livesAfter, lives);
    return lives;
};

// Not very useful anymore for stones
TestStone.prototype.testHowManyLives = function () {
    this.assertEqual(2, this.howManyLives(1, 1));
    this.assertEqual(2, this.howManyLives(this.goban.gsize, this.goban.gsize));
    this.assertEqual(2, this.howManyLives(1, this.goban.gsize));
    this.assertEqual(2, this.howManyLives(this.goban.gsize, 1));
    this.assertEqual(4, this.howManyLives(2, 2));
    this.assertEqual(4, this.howManyLives(this.goban.gsize - 1, this.goban.gsize - 1));
    var s = this.goban.playAt(2, 2, BLACK); // we will try white stones around this one
    var g = s.group;
    this.assertEqual(2, this.howManyLives(1, 1));
    this.assertEqual(4, g.lives);
    this.assertEqual(2, this.howManyLives(1, 2));
    this.assertEqual(4, g.lives); // verify the live count did not change
    this.assertEqual(2, this.howManyLives(2, 1));
    this.assertEqual(3, this.howManyLives(2, 3));
    this.assertEqual(3, this.howManyLives(3, 2));
    this.assertEqual(4, this.howManyLives(3, 3));
};

TestStone.prototype.testPlayAt = function () {
    // single stone
    var s = this.goban.playAt(5, 4, BLACK);
    this.assertEqual(s, this.goban.stoneAt(5, 4));
    this.assertEqual(this.goban, s.goban);
    this.assertEqual(BLACK, s.color);
    this.assertEqual(5, s.i);
    this.assertEqual(4, s.j);
};

},{"../Goban":11,"../main":73,"./TestCase":81,"util":6}],92:[function(require,module,exports){
//Translated from test_zone_filler.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');

var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY;

var CODE_X = 123; // we use this color for replacements - should be rendered as "X"


/** @class NB: for debugging think of using analyser.debug_dump
 *  TODO: add tests for group detection while filling
 */
function TestZoneFiller(testName) {
    TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestZoneFiller, TestCase);
module.exports = TestZoneFiller;


TestZoneFiller.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.grid = new Grid(size, 0, GRID_BORDER);
    this.filler = new main.defaultAi.ZoneFiller(this.goban, this.grid);
};

TestZoneFiller.prototype.testFill1 = function () {
    // 5 +O+++
    // 4 +@+O+
    // 3 +O+@+
    // 2 +@+O+
    // 1 +++@+
    //   abcde
    this.grid.loadImage('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fillWithColor(3, 1, EMPTY, CODE_X);
    this.assertEqual('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
    this.grid.loadImage('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fillWithColor(1, 3, EMPTY, CODE_X);
    this.assertEqual('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
};

TestZoneFiller.prototype.testFill2 = function () {
    // 5 +++++
    // 4 +OOO+
    // 3 +O+O+
    // 2 +++O+
    // 1 +OOO+
    //   abcde
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(3, 3, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(1, 1, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(5, 3, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
};

TestZoneFiller.prototype.testFill3 = function () {
    // 5 +++O+
    // 4 +++OO
    // 3 +O+++
    // 2 ++OO+
    // 1 +O+O+
    //   abcde
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(2, 4, EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(2, 2, EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(3, 1, EMPTY, CODE_X);
    this.assertEqual('+++O+,+++OO,+O+++,++OO+,+OXO+', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(5, 5, EMPTY, CODE_X);
    this.assertEqual('+++OX,+++OO,+O+++,++OO+,+O+O+', this.grid.image());
};

},{"../GameLogic":9,"../Grid":12,"../main":73,"./TestCase":81,"util":6}],93:[function(require,module,exports){
//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('../main');

var DELAY_THRESHOLD = 5; // we tolerate delays under this value
var systemPerf = null;


/** @class
 * @param {number} tolerance - allows to ignore bad performance. E.g 1.05 gives you 5% tolerance up
 */
function TimeKeeper(tolerance) {
    this.tolerance = tolerance || 1.15;
    this.log = main.log;

    this.ratio = this.duration = this.taskName = this.expectedTime = this.t0 = undefined;
}
module.exports = TimeKeeper;


// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype._calibrate = function (expected) {
    var count1 = 10000, count2 = 1000;
    if (main.isCoverTest) { count1 = 1; count2 = 100; }

    var t0 = Date.now();

    for (var i = count1; i>= 0; i--) {
        var ar = {}, mapNum = {}, mapAlpha = {};
        var m = { v1: 10, v2: 20, ar1: [], ar2: [] };

        // Seldom used operations
        for (var n = count2 / 100 - 1; n >= 0; n--) {
            mapAlpha['key' + n] = [n, n+1];
            mapNum[n] = n;
        }
        for (var key in mapAlpha) {
            mapAlpha[key].sort();
        }
        for (n in mapNum) {
            mapNum[~~n] = mapNum[~~n] + 99;
        }
        // Often used operations
        for (n = count2 / 10 - 1; n >= 0; n--) {
            ar[n] = 'value' + n;
            mapNum[ndx]= n + mapNum[n % 10];
            m.ar1[n] = new TimeKeeper(n);
            m.ar2.push(m.v1 + (m.v2 === 0 ? 1 : 2));
        }
        // Very often used operations
        for (n = count2 - 1; n >= 0; n--) {
            var ndx = n % (count2 / 10);
            if (ar[ndx].length < 5) ar[ndx] += 'X';
            var obj = m.ar1[ndx];
            obj._calibrateTest(obj.tolerance, 2);
        }
    }

    var duration = (Date.now() - t0) / 1000;
    systemPerf = duration / expected;

    if (!main.isCoverTest) this.log.info('TimeKeeper calibrated at ratio=' + systemPerf.toFixed(2) +
        ' (ran calibration in ' + duration.toFixed(2) + ' instead of ' + expected + ')');
    return systemPerf;
};

TimeKeeper.prototype._calibrateTest = function (tolerance, n) {
    if (n > 0) this._calibrateTest(tolerance, n - 1);
    tolerance = this.tolerance ;
    if (this.ratio === this.ratio) this.tolerance = Math.max(-100, tolerance);
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec) {
    this.ratio = systemPerf || this._calibrate(0.42);

    this.taskName = taskName;
    this.expectedTime = expectedInSec ? expectedInSec * this.ratio : undefined;
    this.log.info('Started "' + taskName + '"...');
    this.t0 = Date.now();
};

// Stops timing, displays the report and logs a warning if we went over limit.
// If lenientIfSlow is true, the warning is not counted (still displayed)
TimeKeeper.prototype.stop = function (lenientIfSlow) {
    this.duration = (Date.now() - this.t0) / 1000;
    if (!main.isCoverTest) this.log.info(' => ' + this.resultReport());
    return this._checkLimits(lenientIfSlow);
};

TimeKeeper.prototype.resultReport = function () {
    var report = 'Measuring "' + this.taskName + '": time: ' + this.duration.toFixed(2) + 's';
    if (this.expectedTime) {
        report += ' (expected ' + this.expectedTime.toFixed(2) + ' hence ' +
            (this.duration / this.expectedTime * 100).toFixed(2) + '%)';
    }
    return report;
};

TimeKeeper.prototype._checkLimits = function (lenientIfSlow) {
    if (!this.expectedTime || main.isCoverTest) return '';
    var diff = this.duration - this.expectedTime * this.tolerance;
    if (diff <= 0) return '';

    var msg = this.taskName + ': duration over limit: ' + this.duration.toFixed(2) +
        ' instead of ' + this.expectedTime.toFixed(2);

    if (!lenientIfSlow && !main.isCiTest && diff > DELAY_THRESHOLD) {
        main.tests.failTest(msg);
    }
    this.log.warn(msg);
    return msg;
};

},{"../main":73}],94:[function(require,module,exports){
// Browser application

'use strict';

// First we define "main" on which global things attach
var main = require('../main');
window.main = main; // just for helping console debugging

var TestSeries = require('./TestSeries');
var addAllTests = require('./TestAll');

var ais = [
    { name: 'Frankie', constr: require('../ai/frankie') },
    { name: 'Droopy',  constr: require('../ai/droopy') },
    { name: 'Chuckie', constr: require('../ai/chuckie') }
];

main.initAis(ais);

//--- Main UI in dev mode or Tests UI

require('../ui/style.less');
require('../ui/Ui-dev');

var ui;
if (window.testApp) {
    main.initTests(TestSeries, addAllTests);

    var TestUi = require('../ui/TestUi');
    ui = new TestUi();
} else {
    var Ui = require('../ui/Ui');
    ui = new Ui();
}
main.ui = ui;

ui.createUi();

},{"../ai/chuckie":39,"../ai/droopy":57,"../ai/frankie":71,"../main":73,"../ui/TestUi":99,"../ui/Ui":101,"../ui/Ui-dev":100,"../ui/style.less":102,"./TestAll":78,"./TestSeries":88}],95:[function(require,module,exports){
'use strict';

var main = require('../main');

var Grid = require('../Grid');
var touchManager = require('./touchManager.js');

var WGo = window.WGo;

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;

var pixelRatio = window.devicePixelRatio || 1;

// Color codes conversions from WGo
var fromWgoColor = {};
fromWgoColor[WGo.B] = BLACK;
fromWgoColor[WGo.W] = WHITE;
// Color codes conversions to WGo
var toWgoColor = {};
toWgoColor[EMPTY] = null;
toWgoColor[BLACK] = WGo.B;
toWgoColor[WHITE] = WGo.W;


function Board() {
    this.board = null;
    this.tapHandlerFn = null;
    this.goban = null;
    this.gsize = 0;
    this.displayType = null;
    this.cursor = { type: 'CR', x: 0, y: 0 };
    this.isCursorOn = false;
    this.highlight = { type: null, x: 0, y: 0 };
}
module.exports = Board;


Board.prototype.create = function (parent, width, goban, options) {
    var gsize = goban.gsize;
    this.goban = goban;
    if (this.board && this.gsize === gsize) return; // already have the right board
    this.gsize = gsize;
    options = options || {};
    var margin = options.noCoords ? 0 : -0.23;
    var config = {
        size: gsize,
        width: width,
        section: { top: margin, left: margin, right: margin, bottom: margin },
        coordFontSize: 0.6
    };
    switch (options.background) {
    case 'wood': config.background = (window.rootDir || '.') + '/lib/wood1.jpg'; break;
    default: config.background = '#c75';
    }

    parent.clear();
    this.board = new WGo.Board(parent.getDomElt(), config);
    this.distCursorFromFinger = 60 + this.board.stoneRadius;

    if (!options.noCoords) this.board.addCustomObject(WGo.Board.coordinates);
    this.setEventListeners();
};

Board.prototype.setEventListeners = function () {
    var self = this;
    touchManager.listenOn(this.board.element, function (evName, x, y) {
        if (evName === 'dragCancel') return self.moveCursor(-1, -1);
        if (evName.substr(0, 4) === 'drag') {
            y -= self.distCursorFromFinger;
        }
        var vertex = self.canvas2grid(x, y);
        x = vertex[0]; y = vertex[1];
  
        switch (evName) {
        case 'dragStart':
            return self.moveCursor(x, y);
        case 'drag':
            return self.moveCursor(x, y);
        case 'dragEnd':
            self.moveCursor(-1, -1);
            return self.onTap(x, y);
        case 'tap':
            return self.onTap(x, y);
        }
    });
};

Board.prototype.setCurrentColor = function (color) {
    this.cursorColor = toWgoColor[color];
};

Board.prototype.moveCursor = function (x, y) {
    var isValid = this.isValidCoords(x, y);
    if (this.isCursorOn) {
        if (x === this.cursor.x && y === this.cursor.y) return;
        this.board.removeObject(this.cursor);
    }
    this.isCursorOn = isValid;
    if (!isValid) return;
    this.cursor.x = x; this.cursor.y = y;
    if (this.board.obj_arr[x][y][0]) {
        this.cursor.type = 'CR';
        this.cursor.c = undefined;
    } else {
        this.cursor.type = undefined;
        this.cursor.c = this.cursorColor;
    }
    this.board.addObject(this.cursor);
};

Board.prototype.highlightStone = function (type, i, j) {
    if (this.highlight.type) this.board.removeObject(this.highlight);
    this.highlight.type = type;
    if (!type) return;
    this.highlight.x = i - 1;
    this.highlight.y = this.gsize - j;
    this.board.addObject(this.highlight);
};

Board.prototype.isValidCoords = function (x, y) {
    return x >= 0 && y >= 0 && x < this.gsize && y < this.gsize;
};

// x & y are WGo coordinates (origin 0,0 in top-left corner)
Board.prototype.onTap = function (x, y) {
    // convert to goban coordinates (origin 1,1 in bottom-left corner)
    var i = x + 1;
    var j = this.gsize - y;
    // for invalid taps, send some info anyway but starting with "!"
    if (!this.isValidCoords(x, y)) {
        return this.tapHandlerFn('!' + (i >= 1 && i <= this.gsize ? Grid.xLabel(i) : j));
    }

    if (this.goban.colorAt(i, j) !== EMPTY) return;
    var move = Grid.xy2move(i, j);
    this.tapHandlerFn(move);
};

Board.prototype.setTapHandler = function (fn) {
    this.tapHandlerFn = fn;
};

// Converts canvas to WGo coordinates
Board.prototype.canvas2grid = function(x, y) {
    var board = this.board;
    x = Math.round((x * pixelRatio - board.left) / board.fieldWidth);
    y = Math.round((y * pixelRatio - board.top) / board.fieldHeight);
    return [x,y];
};

Board.prototype.refresh = function () {
    var restore = false; // most of the time only stones have been added/removed
    if (this.displayType !== 'regular') {
        this.displayType = 'regular';
        restore = true;
    }
    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var color = this.goban.colorAt(i + 1, this.gsize - j);
            var wgoColor = toWgoColor[color];

            var obj = this.board.obj_arr[i][j][0];
            if (restore) { obj = null; this.board.removeObjectsAt(i,j); }

            if (wgoColor === null) {
                if (obj) this.board.removeObjectsAt(i,j);
            } else if (!obj || obj.c !== wgoColor) {
                this.board.addObject({ x: i, y: j, c: wgoColor });
            }
        }
    }
};

Board.prototype.show = function (displayType, yx, fn) {
    this.refresh(); // the base is the up-to-date board
    this.displayType = displayType;

    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var obj = fn(yx[this.gsize - j][i + 1]);
            if (!obj) continue;
            obj.x = i; obj.y = j;
            this.board.addObject(obj);
        }
    }
};

function territoryDisplay(cell) {
    switch (cell) {
    case -1:   return { type: 'mini', c: WGo.B };
    case -0.5: return { type: 'outline', c: WGo.B };
    case  0:   return null;
    case +0.5: return { type: 'outline', c: WGo.W };
    case +1:   return { type: 'mini', c: WGo.W };
    default:   return null;
    }
}

function scoringDisplay(cell) {
    switch (cell) {
    case Grid.TERRITORY_COLOR + BLACK:
    case Grid.DEAD_COLOR + WHITE:
        return { type: 'mini', c: WGo.B };
    case Grid.TERRITORY_COLOR + WHITE:
    case Grid.DEAD_COLOR + BLACK:
        return { type: 'mini', c: WGo.W };
    case Grid.DAME_COLOR:
        return { type: 'SL', c: 'grey' };
    default:
        return null;
    }
}

var valueFormatMinDec, valueFormatMaxDec, valueFormatNeutralVal;

// Usually for debug/test
Board.prototype.setValueFormat = function (minDecimals, maxDecimals, neutralValue) {
    valueFormatMinDec = minDecimals;
    valueFormatMaxDec = maxDecimals;
    valueFormatNeutralVal = neutralValue;
};

function valueDisplay(cell) {
    if (cell === null) return null;
    var scale = 1;

    var minDec = 0, maxDec = 2, neutral = 0;
    if (valueFormatMinDec !== undefined) minDec = valueFormatMinDec;
    if (valueFormatMaxDec !== undefined) maxDec = valueFormatMaxDec;
    if (valueFormatNeutralVal !== undefined) neutral = valueFormatNeutralVal;
    if (cell === neutral) return null;

    var val = cell.toFixed(maxDec);
    for (var i = minDec; i < maxDec; i++) val = val.chomp('0');
    val = val.chomp('.');
    if (val.substr(0, 2) === '0.') val = val.slice(1);
    if (neutral === 0) {
        if (val === '0' || val === '.0') return null;
        scale = (cell < 1 ? 0.6 : 1);
    }
    return { type: 'LB', text: val, scale: scale };
}

var displayFunctions = {
    territory: territoryDisplay,
    scoring: scoringDisplay,
    value: valueDisplay
};

Board.prototype.showSpecial = function (displayType, yx) {
    var fn = displayFunctions[displayType];
    if (!fn) { return main.log.error('invalid display type:', displayType); }
    this.show(displayType, yx, fn);
};

Board.prototype.showScoring = function (yx) {
    this.show('scoring', yx, scoringDisplay);
};

},{"../Grid":12,"../main":73,"./touchManager.js":103}],96:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var curGroup = null;
var uniqueId = 1;


/**
 * @param {Dome|DOM} parent
 * @param {string} type - e.g. "div" or "button"
 * @param {className} className - class name for CSS; e.g. "mainDiv" or "logBox outputBox"
 * @param {string} name - "nameBox" or "#nameBox"; if starts with "#" element is added to current DomeGroup
 */
function Dome(parent, type, className, name) {
    this.type = type;
    if (parent instanceof Dome) parent = parent.elt;
    var elt = this.elt = parent.appendChild(document.createElement(type));
    if (name && name[0] === '#') {
        curGroup.add(name.substr(1), this);
        // Some class names are built from name so "#" could be in className too
        if (className[0] === '#') className = className.substr(1);
    }
    if (className) elt.className = className;
}
module.exports = Dome;


// Setters

Dome.prototype.setText = function (text) { this.elt.textContent = text; return this; };
Dome.prototype.setHtml = function (html) { this.elt.innerHTML = html; return this; };
Dome.prototype.setAttribute = function (name, val) { this.elt.setAttribute(name, val); return this; };
Dome.prototype.setStyle = function (prop, value) { this.elt.style[prop] = value; return this; };

Dome.prototype.setVisible = function (show) {
    this.elt.style.display = show ? '' : 'none';
    return this;
};

Dome.prototype.setEnabled = function (enable) {
    this.elt.disabled = !enable;
    this.toggleClass('disabled', !enable);
    return this;
};

// Getters

Dome.prototype.text = function () { return this.elt.textContent; };
Dome.prototype.html = function () { return this.elt.innerHTML; };
Dome.prototype.value = function () { return this.elt.value; };
Dome.prototype.isChecked = function () { return this.elt.checked; }; // for checkboxes
Dome.prototype.getDomElt = function () { return this.elt; };

Dome.prototype.clear = function () { this.elt.innerHTML = ''; };

Dome.prototype.on = function (eventName, fn) {
    var self = this;
    this.elt.addEventListener(eventName, function (ev) { fn.call(self, ev); });
};

Dome.prototype.toggleClass = function (className, enable) {
    var elt = this.elt;
    var classes = elt.className.split(' ');
    var ndx = classes.indexOf(className);
    if (enable) {
        if (ndx >= 0) return;
        elt.className += ' ' + className;
    } else {
        if (ndx < 0) return;
        classes.splice(ndx, 1);
        elt.className = classes.join(' ');
    }
};

Dome.prototype.scrollToBottom = function () {
    this.elt.scrollTop = this.elt.scrollHeight;
};

Dome.newDiv = function (parent, className, name) {
    return new Dome(parent, 'div', className, name || className);
};
Dome.prototype.newDiv = function (className, name) {
    return new Dome(this, 'div', className, name || className);
};

Dome.removeChild = function (parent, dome) {
    if (parent instanceof Dome) parent = parent.elt;
    parent.removeChild(dome.elt);
};
Dome.prototype.removeChild = function (child) { this.elt.removeChild(child.elt); };

Dome.newButton = function (parent, name, label, action) {
    var button = new Dome(parent, 'button', name + 'Button', name);
    button.elt.innerText = label;
    button.on('click', action);
    return button;
};

Dome.newLink = function (parent, name, label, url) {
    var link = new Dome(parent, 'a', name + 'Link', name);
    link.setAttribute('href', url);
    link.setText(label);
    return link;
};

/** A label is a span = helps to write text on the left of an element */
Dome.newLabel = function (parent, name, label) {
    return new Dome(parent, 'span', name, name).setText(label);
};

Dome.newInput = function (parent, name, label, init) {
    var labelName = name + 'Label';
    Dome.newLabel(parent, labelName + ' inputLbl', label, labelName);
    var input = new Dome(parent, 'input', name + 'Input inputBox', name);
    if (init !== undefined) input.elt.value = init;
    return input;
};

/** var myCheckbox = Dome.newCheckbox(testDiv, 'debug', 'Debug', null, true);
 *  ...
 *  if (myCheckbox.isChecked()) ...
 */
Dome.newCheckbox = function (parent, name, label, value, init) {
    var div = new Dome(parent, 'div', name + 'Div chkBoxDiv');
    var input = new Dome(div, 'input', name + 'ChkBox chkBox', name);
    var inp = input.elt;
    inp.type = 'checkbox';
    inp.name = name;
    if (value !== undefined) inp.value = value;
    inp.id = name + 'ChkBox' + (value !== undefined ? value : uniqueId++);
    if (init) inp.checked = true;

    new Dome(div, 'label', name + 'ChkLabel chkLbl', name)
        .setText(label)
        .setAttribute('for', inp.id);
    return input;
};

/** var myOptions = Dome.newRadio(parent, 'stoneColor', ['white', 'black'], null, 'white');
 *  ...
 *  var result = Dome.getRadioValue(myOptions);
 */
Dome.newRadio = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var input = opts[i] = new Dome(parent, 'input', name + 'RadioBtn radioBtn', name);
        var inp = input.elt;
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;

        new Dome(parent, 'label', name + 'RadioLabel radioLbl', name)
            .setText(labels[i])
            .setAttribute('for', inp.id);
    }
    return opts;
};

/** @param {array} opts - the array of options returned when you created the radio buttons with newRadio */
Dome.getRadioValue = function (opts) {
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].elt.checked) return opts[i].elt.value;
    }
};

/** var mySelect = Dome.newDropdown(parent, 'stoneColor', ['white', 'black'], null, 'white')
 *  ...
 *  var result = mySelect.value()
 */
Dome.newDropdown = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var select = new Dome(parent, 'select', name + 'DropDwn dropDwn', name);
    select.values = values;
    var cur = 0;
    for (var i = 0; i < labels.length; i++) {
        var opt = new Dome(select, 'option').elt;
        opt.value = values[i];
        opt.textContent = labels[i];
        if (values[i] === init) cur = i;
    }
    select.elt.selectedIndex = cur;
    return select;
};

Dome.prototype.select = function (value) {
    var ndx = this.values.indexOf(value);
    if (ndx !== -1) this.elt.selectedIndex = ndx;
};

//---Group helpers

function DomeGroup() {
    this.ctrl = {};
}

Dome.newGroup = function () {
    curGroup = new DomeGroup();
    return curGroup;
};

DomeGroup.prototype.add = function (name, dome) { this.ctrl[name] = dome; };
DomeGroup.prototype.get = function (name) { return this.ctrl[name]; };

DomeGroup.prototype.setEnabled = function (names, enabled, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setEnabled(enabled);
    }
};

DomeGroup.prototype.setVisible = function (names, show, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var elt = this.ctrl[names[i]];
        if (!elt) { console.error('Invalid control name:', names[i]); continue; }
        elt.setVisible(show);
    }
};

//---Misc

Dome.setPageTitle = function (title) {
    document.head.getElementsByTagName('title')[0].textContent = title;
};

// Return the selected text if any - null if there is none
Dome.getSelectedText = function () {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    var text = range.startContainer.data;
    if (!text) return null;

    return text.substring(range.startOffset, range.endOffset);
};

},{}],97:[function(require,module,exports){
'use strict';

var main = require('../main');
var Dome = require('./Dome');


function NewGameDlg(options, validateFn) {
    var dialog = Dome.newDiv(document.body, 'newGameBackground');
    var frame = dialog.newDiv('newGameDialog dialog');
    frame.newDiv('dialogTitle').setText('Start a new game');
    var form = new Dome(frame, 'form').setAttribute('action',' ');

    var sizeBox = form.newDiv();
    Dome.newLabel(sizeBox, 'inputLbl', 'Size:');
    var sizeElt = Dome.newRadio(sizeBox, 'size', [5,7,9,13,19], null, options.gsize);

    Dome.newLabel(form, 'inputLbl', 'Handicap:');
    var handicap = Dome.newDropdown(form, 'handicap', [0,2,3,4,5,6,7,8,9], null, options.handicap);

    var aiColorBox = form.newDiv();
    Dome.newLabel(aiColorBox, 'inputLbl', 'AI plays:');
    var aiColor = Dome.newRadio(aiColorBox, 'aiColor', ['white', 'black', 'both', 'none'], null, options.aiPlays);

    var moves = Dome.newInput(form, 'moves', 'Moves to load:', options.moves);

    var defAiDiv = form.newDiv();
    Dome.newLabel(defAiDiv, 'inputLbl', 'Black AI:');
    var defaultAi = Dome.newDropdown(defAiDiv, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    Dome.newLabel(defAiDiv, 'defAiInfo', '(White AI always uses latest AI version)');

    Dome.newLabel(form, 'inputLbl', 'Rules:');
    var rules = Dome.newDropdown(form, 'rules', ['Japanese', 'Chinese'], ['jp', 'ch'], options.rules);

    var okBtn = Dome.newButton(form.newDiv('btnDiv'), 'start', 'Play', function (ev) {
        ev.preventDefault();
        options.gsize = ~~Dome.getRadioValue(sizeElt);
        options.handicap = ~~handicap.value();
        options.aiPlays = Dome.getRadioValue(aiColor);
        options.moves = moves.value();
        main.defaultAi = main.ais[defaultAi.value()];
        options.rules = rules.value();
        if (validateFn(options)) return Dome.removeChild(document.body, dialog);
    });
    okBtn.setAttribute('type','submit');
}
module.exports = NewGameDlg;

},{"../main":73,"./Dome":96}],98:[function(require,module,exports){
'use strict';

var Dome = require('./Dome');


function action() {
    // "this" is the button
    var dlg = this.dlg;
    if (dlg.options) dlg.options.choice = this.id;
    Dome.removeChild(dlg.parent, dlg.dialogRoot);
    if (dlg.validateFn) dlg.validateFn(dlg.options);
}

function newButton(div, dlg, label, id) {
    var btn = Dome.newButton(div, 'popupDlg', label, action);
    btn.dlg = dlg;
    btn.id = id;
}

function PopupDlg(parent, msg, title, options, validateFn) {
    this.parent = parent || document.body;
    this.options = options;
    this.validateFn = validateFn;

    this.dialogRoot = Dome.newDiv(this.parent, 'popupBackground');

    var parentElt = this.dialogRoot.elt.parentElement;
    this.dialogRoot.setStyle('left', parentElt.offsetLeft + 'px');
    this.dialogRoot.setStyle('top', parentElt.offsetTop + 'px');
    this.dialogRoot.setStyle('width', parentElt.scrollWidth + 'px');
    this.dialogRoot.setStyle('height', parentElt.scrollHeight + 'px');

    var dialog = this.dialogRoot.newDiv('popupDlg dialog');
    dialog.newDiv('dialogTitle').setText(title || 'Problem');

    var content = dialog.newDiv('content');
    Dome.newLabel(content, 'message', msg);

    var btns = (options && options.buttons) || ['OK'];
    var btnDiv = dialog.newDiv('btnDiv');
    for (var i = 0; i < btns.length; i++) {
        newButton(btnDiv, this, btns[i], i);
    }
}
module.exports = PopupDlg;

},{"./Dome":96}],99:[function(require,module,exports){
'use strict';

var main = require('../main');
var Dome = require('./Dome');
var Logger = require('../Logger');
var Ui = require('./Ui');
var userPref = require('../userPreferences');


function TestUi() {
    main.debug = false;
    main.log.level = Logger.INFO;
    main.testUi = this;
}
module.exports = TestUi;


TestUi.prototype.enableButtons = function (enabled) {
    for (var name in this.ctrl) { this.ctrl[name].disabled = !enabled; }
};

TestUi.prototype.runTest = function (name, pattern) {
    main.defaultAi = main.ais[this.defaultAi.value()];

    main.debug = this.debug.isChecked();
    // Remove debug flag for ALL and Speed test
    if (name === 'ALL' || name === 'TestSpeed') main.debug = false;

    var specificClass = name;
    if (name === 'ALL' || name === 'FILTER') specificClass = undefined;

    main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    main.log.setLogFunc(this.logfn.bind(this));

    var numIssues = main.tests.run(specificClass, pattern);
    if (numIssues) this.logfn(Logger.INFO, '\n*** ' + numIssues + ' ISSUE' + (numIssues !== 1 ? 'S' : '') + ' - See below ***');

    this.output.scrollToBottom();
    this.errors.scrollToBottom();
    this.controls.setEnabled('ALL', true);
};

TestUi.prototype.initTest = function (name) {
    var pattern = name === 'FILTER' ? this.namePattern.value() : undefined;
    var desc = pattern ? '*' + pattern + '*' : name;

    this.output.setHtml('Running "' + desc + '"...<br>');
    this.errors.setText('');
    this.gameDiv.clear();
    this.controls.setEnabled('ALL', false);
    var self = this;
    window.setTimeout(function () { self.runTest(name, pattern); }, 50);
};

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= Logger.WARN) this.errors.setHtml(this.errors.html() + msg);
    else if (lvl > Logger.DEBUG) this.output.setHtml(this.output.html() + msg);
    return true; // also log in console
};

TestUi.prototype.newButton = function (parent, name, label) {
    Dome.newButton(parent, '#' + name, label, this.initTest.bind(this, name));
};

TestUi.prototype.createControls = function (parentDiv) {
    this.controls = Dome.newGroup();
    var div = parentDiv.newDiv('controls');
    this.newButton(div, 'ALL', 'Test All');
    this.newButton(div, 'TestSpeed', 'Speed');
    this.newButton(div, 'TestBreeder', 'Breeder');
    this.newButton(div, 'TestBoardAnalyser', 'Scoring');
    this.newButton(div, 'TestPotentialTerritory', 'Territory');
    this.newButton(div, 'TestAi', 'AI');
};

TestUi.prototype.createUi = function () {
    window.addEventListener('beforeunload', this.beforeUnload.bind(this));

    var title = main.appName + ' - Tests';
    Dome.setPageTitle(title);
    var testDiv = Dome.newDiv(document.body, 'testUi');
    this.gameDiv = Dome.newDiv(document.body, 'gameDiv');
    testDiv.newDiv('pageTitle').setText(title);
    this.createControls(testDiv);

    var div1 = testDiv.newDiv();
    Dome.newLabel(div1, 'inputLbl', 'Default AI:');
    this.defaultAi = Dome.newDropdown(div1, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    this.debug = Dome.newCheckbox(div1, 'debug', 'Debug');

    var div2 = testDiv.newDiv('patternDiv');
    this.namePattern = Dome.newInput(div2, 'namePattern', 'Filter:', userPref.getValue('testNamePattern'));
    this.newButton(div2, 'FILTER', 'Run');
    
    testDiv.newDiv('subTitle').setText('Result');
    this.output = testDiv.newDiv('logBox testOutputBox');
    testDiv.newDiv('subTitle').setText('Errors');
    this.errors = testDiv.newDiv('logBox testErrorBox');
};

TestUi.prototype.saveTestPreferences = function () {
    userPref.setValue('testNamePattern', this.namePattern.value());
};

TestUi.prototype.beforeUnload = function () {
    this.saveTestPreferences();
    userPref.close();
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.inDevMode = true;
    ui.loadFromTest(this.gameDiv, title, msg);
};

},{"../Logger":15,"../main":73,"../userPreferences":104,"./Dome":96,"./Ui":101}],100:[function(require,module,exports){
'use strict';

var Ui = require('./Ui'); // we add methods to Ui class here

var CONST = require('../constants');
var main = require('../main');

var Dome = require('./Dome');
var Gtp = require('../net/Gtp');
var Logger = require('../Logger');
var UiGtpEngine = require('../net/UiGtpEngine');
var userPref = require('../userPreferences');

var WHITE = CONST.WHITE, BLACK = CONST.BLACK, EMPTY = CONST.EMPTY;
var sOK = CONST.sOK, ODD = CONST.ODD, EVEN = CONST.EVEN;

var NO_HEURISTIC = '(heuristic)';


Ui.prototype.initDev = function () {
    this.inDevMode = userPref.getValue('devMode', false);
    this.debugHeuristic = null;
    this.inEvalMode = false;
    this.devKeys = '';
};

Ui.prototype.onDevKey = function (key) {
    this.devKeys = this.devKeys.slice(-9) + key;
    if (this.devKeys.slice(-2) === 'db') {
        this.inDevMode = !this.inDevMode;
        userPref.setValue('devMode', this.inDevMode);
        return this.toggleControls();
    }
    if (this.devKeys.slice(-2) === '0g') {
        // TODO: WIP
        var gtp = main.gtp = new Gtp();
        return gtp.init(new UiGtpEngine(this));
    }
};

Ui.prototype.devMessage = function (html, append) {
    if (append) html = this.devOutput.html() + html;
    this.devOutput.setHtml(html);
};

Ui.prototype.showDevData = function (move, aiPlayer, isTest) {
    aiPlayer = aiPlayer || this.getAiPlayer(this.game.curColor);
    var txt = aiPlayer.getMoveSurveyText(move, isTest);
    txt = txt.replace(/\n/g, '<br>');
    if (aiPlayer.numRandomPicks - this.prevNumRandomPicks === 1) txt = '#RANDOM ' + txt;
    this.devMessage(txt);

    this._updateGameLink();
};

Ui.prototype.afterReplay = function (move) {
    this.game.playOneMove('half_undo');
    this.showDevData(move, null, true);
    this.game.playOneMove(move);
};

Ui.prototype.scoreTest = function () {
    this.computeScore();
    this.longMessage(this.scoreMsg);
    this.board.showSpecial('scoring', this.scorer.getScoringGrid().yx);
};

Ui.prototype.territoryTest = function (aiPlayer) {
    this.board.showSpecial('territory', aiPlayer.guessTerritories());
};

Ui.prototype.influenceTest = function (aiPlayer, color) {
    var infl = aiPlayer.getHeuristic('Influence').infl;
    this.board.setValueFormat(0, 1);
    this.board.showSpecial('value', infl[color]);
};

Ui.prototype.eyesTest = function (aiPlayer, oddOrEven) {
    var shaper = aiPlayer.getHeuristic('Shaper');
    var yx = shaper.potEyeGrids[oddOrEven].yx;
    this.board.setValueFormat(0, 1, EMPTY);
    this.board.showSpecial('value', yx);
};

Ui.prototype.totalEvalTest = function (aiPlayer) {
    var score = aiPlayer.scoreGrid.yx;
    this.board.setValueFormat(1, 1);
    this.board.showSpecial('value', score);
};

var heuristics = [
    NO_HEURISTIC,
    'GroupAnalyser',
    'NoEasyPrisoner',
    'Savior',
    'Hunter',
    'Connector',
    'Spacer',
    'Pusher',
    'Shaper',
    'MoveInfo'
];

var evalTests = [
    ['(other eval)', Ui.prototype.refreshBoard],
    ['Score', Ui.prototype.scoreTest],
    ['Territory', Ui.prototype.territoryTest],
    ['Influence B', function (aiColor) { this.influenceTest(aiColor, BLACK); }],
    ['Influence W', function (aiColor) { this.influenceTest(aiColor, WHITE); }],
    ['Potential eyes EVEN', function (aiColor) { this.eyesTest(aiColor, EVEN); }],
    ['Potential eyes ODD', function (aiColor) { this.eyesTest(aiColor, ODD); }],
    ['Total', Ui.prototype.totalEvalTest]
];

Ui.prototype.evalTestHandler = function (name) {
    var evalTest = evalTests[name];
    this.statusMessage('Showing "' + evalTest[0] + '"');
    var ai = this.getAiPlayer(this.game.curColor);
    ai.getMove();
    evalTest[1].call(this, ai);
    this.board.highlightStone(null);
    this.evalTestDropdown.select(0);
};

Ui.prototype.heuristicTestHandler = function (name) {
    this.debugHeuristic = name === NO_HEURISTIC ? null : name;

    this.getAiPlayer(BLACK).setDebugHeuristic(this.debugHeuristic);
    this.getAiPlayer(WHITE).setDebugHeuristic(this.debugHeuristic);

    this.board.setValueFormat(1, 1);
    this.refreshBoard();
};

Ui.prototype.devDisplay = function () {
    this.evalTestDropdown.select(0);
    if (!this.debugHeuristic || !this.lastAiPlayer) return;
    var heuristic = this.lastAiPlayer.getHeuristic(this.debugHeuristic);
    // Erase previous values (heuristics don't care about old values)
    // This could be AiPlayer's job to return us a grid ready for display
    var stateYx = this.lastAiPlayer.stateGrid.yx, scoreYx = heuristic.scoreGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            if (stateYx[j][i] < sOK) scoreYx[j][i] = 0;
        }
    }
    this.board.showSpecial('value', scoreYx);
};

Ui.prototype._updateGameLink = function () {
    this.devGameLink.setAttribute('href', 'mailto:kubicle@yahoo.com?subject=' + main.appName + '%20game' +
        '&body=' + this.game.historyString());
};

Ui.prototype.createDevControls = function () {
    var self = this;
    var devDiv = this.gameDiv.newDiv('#devDiv');

    var devCtrls = devDiv.newDiv('devControls');
    Dome.newButton(devCtrls, '#evalMode', 'Eval mode', function () { self.setEvalMode(!self.inEvalMode); });
    Dome.newButton(devCtrls, '#aiPass', 'Force pass', function () { self.playerMove('pass'); });
    Dome.newButton(devCtrls, '#aiUndo', 'AI undo', function () { self.playUndo(); });
    Dome.newButton(devCtrls, '#aiResi', 'AI resign', function () { self.playerResigns(); });

    var options = devDiv.newDiv('options');
    Dome.newCheckbox(options, 'debug', 'Debug').on('change', function () {
        main.debug = this.isChecked();
        main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    });

    this.devGameLink = Dome.newLink(options, 'emailGame', 'Game link');
    this._updateGameLink();

    Dome.newDropdown(options, '#heuristicTest', heuristics, null, '').on('change', function () {
        self.heuristicTestHandler(this.value());
    });

    var tests = [], values = [];
    for (var i = 0; i < evalTests.length; i++) { tests.push(evalTests[i][0]); values.push(i); }
    this.evalTestDropdown = Dome.newDropdown(options, '#evalTest', tests, values, '');
    this.evalTestDropdown.on('change', function () {
        self.evalTestHandler(this.value());
    });

    this.devOutput = devDiv.newDiv('logBox devLogBox');
};

Ui.prototype.toggleDevControls = function (inGame, inReview, auto) {
    if (this.inEvalMode && !inGame) this.setEvalMode(false);
    this.controls.setVisible(['devDiv'], this.inDevMode && (inGame || inReview));
    this.controls.setVisible(['aiUndo', 'aiPass', 'aiResi'], inGame && auto);
};

Ui.prototype.setEvalMode = function (enabled) {
    if (enabled === this.inEvalMode) return;
    this.inEvalMode = enabled;
    this.controls.setEnabled('ALL', !this.inEvalMode, ['evalMode','undo','next','pass', 'aiUndo', 'aiPass', 'heuristicTest']);
    this.controls.get('evalMode').toggleClass('toggled', enabled);
};

},{"../Logger":15,"../constants":72,"../main":73,"../net/Gtp":74,"../net/UiGtpEngine":76,"../userPreferences":104,"./Dome":96,"./Ui":101}],101:[function(require,module,exports){
'use strict';

var CONST = require('../constants');
var main = require('../main');

var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var NewGameDlg = require('./NewGameDlg');
var PopupDlg = require('./PopupDlg');
var ScoreAnalyser = require('../ScoreAnalyser');
var userPref = require('../userPreferences');

var WHITE = CONST.WHITE, BLACK = CONST.BLACK;

var viewportWidth = document.documentElement.clientWidth;


function Ui(game) {
    this.gsize = this.handicap = 0;
    this.aiPlays = '';
    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser(this.game);
    this.board = null;

    if (this.initDev) {
        this.initDev();
    } else {
        this.isProd = true;
    }
}
module.exports = Ui;


/** This is the entry point for starting the app UI */
Ui.prototype.createUi = function () {
    window.addEventListener('beforeunload', this.beforeUnload.bind(this));

    this.gsize = userPref.getValue('lastGameSize', 9);
    this.handicap = userPref.getValue('lastGameHandicap', 0);
    this.aiPlays = userPref.getValue('lastGameAiPlays', 'white');
    this.rules = userPref.getValue('lastGameRules', 'jp');
    var lastGame = userPref.getValue('lastGameHistory');

    this.newGameDialog(lastGame);
};

Ui.prototype.saveGamePreferences = function () {
    userPref.setValue('lastGameSize', this.gsize);
    userPref.setValue('lastGameHandicap', this.handicap);
    userPref.setValue('lastGameAiPlays', this.aiPlays);
    userPref.setValue('lastGameRules', this.rules);
    userPref.setValue('lastGameHistory', this.game.history);
};

Ui.prototype.beforeUnload = function () {
    this.saveGamePreferences();
    userPref.close();
};

Ui.prototype.refreshBoard = function () {
    this.board.refresh();
    if (this.inDevMode) this.devDisplay();
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    if (this.game.gameEnding) this.proposeScore();
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    var isCompact = this.isCompactLayout = layout === 'compact';
    var gameDiv = this.gameDiv = Dome.newDiv(parent, 'gameUi');

    if (title) gameDiv.newDiv(isCompact ? 'testTitle' : 'pageTitle').setText(title);
    this.boardElt = gameDiv.newDiv('board');
    if (descr) this.boardDesc = gameDiv.newDiv('boardDesc').setHtml(descr);
    this.createStatusBar(gameDiv);
    this.createControls(gameDiv);
    if (!this.isProd) this.createDevControls();

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60 + 10, viewportWidth - 15);

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (move[0] === '!') return !self.isProd && self.onDevKey(move.substr(1));
        if (self.inEvalMode || self.inReview) return self.showDevData(move, null, true);
        self.playerMove(move);
    });
};

Ui.prototype.resetUi = function () {
    if (!this.gameDiv) return;
    Dome.removeChild(document.body, this.gameDiv);
    this.gameDiv = null;
    this.board = null;
};

Ui.prototype.newGameDialog = function (lastGameHistory) {
    Dome.setPageTitle(main.appName);
    this.resetUi();
    var options = {
        gsize: this.gsize,
        handicap: this.handicap,
        aiPlays: this.aiPlays,
        moves: lastGameHistory,
        rules: this.rules
    };
    var self = this;
    new NewGameDlg(options, function validate(options) {
        self.gsize = options.gsize;
        self.handicap = options.handicap;
        self.aiPlays = options.aiPlays;
        self.rules = options.rules;
        self.game.setRules(self.rules === 'jp' ? CONST.JP_RULES : CONST.CH_RULES);
        return self.startGame(options.moves);
    });
};

function MoveElt(parent, className, label) {
    var elt = this.elt = parent.newDiv('oneMove ' + className);
    elt.newDiv('label').setText(label);
    var icon = elt.newDiv('icon');
    this.text = icon.newDiv('text');
}

MoveElt.prototype.setMove = function (move, color) {
    this.elt.setVisible(move !== null);
    this.elt.toggleClass('black', color === BLACK);
    this.elt.toggleClass('white', color === WHITE);
    this.text.setText(move);
};

Ui.prototype.createStatusBar = function (gameDiv) {
    var statusBar = this.statusBar = gameDiv.newDiv('statusBar');
    this.lastMoveElt = new MoveElt(statusBar, 'lastMove', 'Last:');
    this.gameInfoElt = statusBar.newDiv('gameInfo');
    this.shortMessage = statusBar.newDiv('message');
    this.nextPlayerElt = new MoveElt(statusBar, 'nextPlayer', 'Next:');
};

Ui.prototype.showGameInfo = function () {
    var gameInfo = this.game.playerNames[WHITE] + ' VS ' + this.game.playerNames[BLACK] + ' (B)';
    gameInfo += ', komi: ' + this.game.komi;
    if (this.handicap) gameInfo += ', hand: ' + this.handicap;
    if (this.game.rulesName) gameInfo += ', rules: ' + this.game.rulesName;
    this.gameInfoElt.setText(gameInfo);
};

Ui.prototype.showLastMove = function () {
    var moves = this.game.history;
    if (moves.length) {
        var move = this.game.stripMoveColor(moves[moves.length - 1]);
        this.lastMoveElt.setMove(move, 1 - this.game.curColor);
        var pos = this.game.oneMove2xy(move);
        if (pos) this.board.highlightStone('CR', pos[0], pos[1]);
        else this.board.highlightStone(null);
    } else {
        this.lastMoveElt.setMove(null);
    }
    this.showNextPlayer();
    this.shortMessage.setText('');
};

Ui.prototype.showNextPlayer = function (move) {
    if (move === null) return this.nextPlayerElt.setMove(null);
    move = this.game.stripMoveColor(move || '');
    this.nextPlayerElt.setMove(move, this.game.curColor);
};

Ui.prototype.statusMessage = function (msg) {
    this.shortMessage.setText(msg);
    this.showNextPlayer();
    this.longTextElt.setVisible(false);
};

Ui.prototype.longMessage = function (html) {
    this.longTextElt.setHtml(html);
    this.longTextElt.setVisible(true);
};

Ui.prototype.createControls = function (gameDiv) {
    var mainDiv = gameDiv.newDiv('mainControls');
    var self = this;
    this.reviewControls = Dome.newGroup();
    Dome.newButton(mainDiv, '#review', 'Review', function () { self.toggleReview(); });
    Dome.newButton(mainDiv, '#back10', '<<', function () { self.replay(-10); });
    Dome.newButton(mainDiv, '#back1', '<', function () { self.replay(-1); });
    Dome.newButton(mainDiv, '#forw1', '>', function () { self.replay(1); });
    Dome.newButton(mainDiv, '#forw10', '>>', function () { self.replay(10); });

    this.controls = Dome.newGroup();
    Dome.newButton(mainDiv, '#pass', 'Pass', function () { self.playerMove('pass'); });
    Dome.newButton(mainDiv, '#next', 'Next', function () { self.automaticAiPlay(1); });
    Dome.newButton(mainDiv, '#next10', 'Next 10', function () { self.automaticAiPlay(10); });
    Dome.newButton(mainDiv, '#nextAll', 'Finish', function () { self.automaticAiPlay(); });
    Dome.newButton(mainDiv, '#undo', 'Undo', function () { self.playUndo(); });
    Dome.newButton(mainDiv, '#accept', 'Accept', function () { self.acceptScore(true); });
    Dome.newButton(mainDiv, '#refuse', 'Refuse', function () { self.acceptScore(false); });
    Dome.newButton(mainDiv, '#newg', 'New game', function () { self.newGameDialog(); });
    this.longTextElt = mainDiv.newDiv('logBox outputBox').setVisible(false);
    Dome.newButton(mainDiv, '#resi', 'Resign', function () { self.playerResigns(); });

    this.aiVsAiFlags = mainDiv.newDiv('#aiVsAiFlags');
    this.animated = Dome.newCheckbox(this.aiVsAiFlags, 'animated', 'Animated');
};

Ui.prototype.toggleReview = function () {
    this.inReview = !this.inReview;
    this.reviewControls.get('review').toggleClass('toggled', this.inReview);
    this.toggleControls();
    if (this.inReview) {
        this.reviewMoves = this.game.history.concat();
        this.reviewCursor = this.reviewMoves.length;
        this.replay(0); // init buttons' state
    } else {
        this.replay(this.reviewMoves.length - this.reviewCursor);
        this.showNextPlayer();
    }
};

Ui.prototype.toggleControls = function () {
    var inReview = this.inReview, ended = this.game.gameEnded, ending = this.game.gameEnding;
    var inGame = !(ended || ending) && !inReview;
    var auto = this.aiPlays === 'both';

    this.statusBar.setVisible(!ended);
    this.reviewControls.setVisible(['review'], inGame || inReview);
    this.reviewControls.setVisible(['back1', 'back10', 'forw1', 'forw10'], inReview);
    this.controls.setVisible(['accept', 'refuse'], ending);
    this.controls.setVisible(['undo', 'pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll', 'aiVsAiFlags'], inGame && auto);
    this.controls.setVisible(['newg'], ended && !this.isCompactLayout);

    // Dev controls
    if (!this.isProd) this.toggleDevControls(inGame, inReview, auto);
};


//--- GAME LOGIC

Ui.prototype.createPlayers = function (isGameLoaded) {
    this.players = [];
    this.playerIsAi = [false, false];
    for (var color = BLACK; color <= WHITE; color++) {
        if (this.aiPlays === Grid.COLOR_NAMES[color] || this.aiPlays === 'both') {
            var Ai = this.getAiPlayer(color).constructor;
            this.playerIsAi[color] = true;
            if (!isGameLoaded) this.game.setPlayer(color, Ai.publicName + '-' + Ai.publicVersion);
        } else {
            if (!isGameLoaded) this.game.setPlayer(color, 'human');
        }
    }
};

Ui.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    var Ai = color === BLACK ? main.defaultAi : main.latestAi;
    player = this.players[color] = new Ai(this.game, color);
    return player;
};

Ui.prototype.initDisplay = function () {
    this.showGameInfo();
    this.showLastMove();
    this.showNextPlayer();
    this.toggleControls();
    this.refreshBoard();
};

Ui.prototype.loadMoves = function (moves) {
    var errors = [];
    if (!this.game.loadAnyGame(moves, errors)) {
        new PopupDlg(this.gameDiv, errors.join('\n'));
        return false;
    }
    return true;
};

Ui.prototype.startGame = function (firstMoves, isLoaded) {
    var game = this.game;
    if (!isLoaded) game.newGame(this.gsize, this.handicap);
    this.createPlayers(isLoaded);

    if (firstMoves && !this.loadMoves(firstMoves)) return false;

    // read values from game to make sure they are valid and match loaded game
    this.gsize = game.goban.gsize;
    this.handicap = game.handicap;

    if (!this.isProd) this.initDev();

    if (!this.gameDiv) this.createGameUi('main', document.body);

    var options = this.isCompactLayout ? undefined : { background: 'wood' };

    this.board.create(this.boardElt, this.boardWidth, game.goban, options);
    this.initDisplay();

    if (!isLoaded && !firstMoves) this.statusMessage('Game started. Your turn...'); // erased if a move is played below
    if (!this.checkEnd()) this.letNextPlayerPlay();

    return true;
};

/** @return false if game goes on normally; true if special ending action was done */
Ui.prototype.checkEnd = function () {
    if (this.game.gameEnding) {
        this.proposeScore();
        return true;
    }
    if (this.game.gameEnded) { // NB: we only pass here when one resigned
        this.computeScore();
        this.showEnd();
        return true;
    }
    return false;
};

Ui.prototype.computeScore = function () {
    var msgs = this.scorer.computeScoreAsTexts();
    this.scoreMsg = msgs.join('<br>');
};

Ui.prototype.proposeScore = function () {
    this.computeScore();
    this.statusMessage('Do you accept this score?');
    this.longMessage(this.scoreMsg);
    this.toggleControls();
    this.board.showScoring(this.scorer.getScoringGrid().yx);
};

Ui.prototype.acceptScore = function (acceptEnd) {
    // who actually refused? Current player unless this is a human VS AI match (in which case always human)
    var whoRefused = this.game.curColor;
    if (this.playerIsAi[whoRefused] && !this.playerIsAi[1 - whoRefused]) whoRefused = 1 - whoRefused;

    this.game.acceptEnding(acceptEnd, whoRefused);
    if (acceptEnd) return this.showEnd();

    this.statusMessage('Score in dispute. Continue playing...');
    this.toggleControls();
    this.refreshBoard();
    // In AI VS AI move we don't ask AI to play again otherwise it simply passes again
    if (this.aiPlays !== 'both') this.letNextPlayerPlay();
};

Ui.prototype.showEnd = function () {
    this.longMessage(this.scoreMsg + '<br><br>' + this.game.historyString());
    this.toggleControls();
};

Ui.prototype.letAiPlay = function (skipRefresh) {
    var aiPlayer = this.lastAiPlayer = this.players[this.game.curColor];
    this.prevNumRandomPicks = aiPlayer.numRandomPicks;

    var move = aiPlayer.getMove();
    this.game.playOneMove(move);
    if (!skipRefresh) {
        this.showLastMove();
        if (this.inDevMode) this.showDevData(move, aiPlayer, false);
    }

    // AI resigned or double-passed?
    if (this.checkEnd()) return move;

    if (!skipRefresh) this.refreshBoard();
    return move;
};

Ui.prototype.playerMove = function (move) {
    if (!this.game.playOneMove(move)) {
        return this.statusMessage(this.game.getErrors().join('. '));
    }
    if (this.checkEnd()) return;

    this.refreshBoard();
    this.showLastMove();

    this.letNextPlayerPlay();
};

Ui.prototype.playerResigns = function () {
    var self = this;
    var options = { buttons: ['YES', 'NO'] };
    new PopupDlg(this.gameDiv, 'Do you really want to resign?', 'Confirm', options, function (options) {
        if (options.choice !== 0) return;
        self.game.playOneMove('resi');
        self.checkEnd();
    });
};

Ui.prototype.playUndo = function () {
    var command = 'undo';
    if (this.aiPlays === 'none' || this.aiPlays === 'both' || this.inEvalMode) {
        command = 'half_undo';
    }

    if (!this.game.playOneMove(command)) {
        return this.statusMessage(this.game.getErrors().join('. '));
    }
    this.refreshBoard();
    this.showLastMove();
    this.statusMessage('Performed "' + command + '"');
};

Ui.prototype.whoPlaysNow = function () {
    this.board.setCurrentColor(this.game.curColor);
    var playerName = Grid.colorName(this.game.curColor);
    return '(' + playerName + '\'s turn)';
};

Ui.prototype.letNextPlayerPlay = function (skipRefresh) {
    if (this.playerIsAi[this.game.curColor]) {
        this.letAiPlay(skipRefresh);
    } else {
        if (!skipRefresh) this.showNextPlayer();
    }
};

Ui.prototype.automaticAiPlay = function (turns) {
    var isLastTurn = turns === 1;
    var animated = this.animated.isChecked();
    // we refresh for last move OR if animated
    var skipRefresh = !isLastTurn && !animated;

    this.letNextPlayerPlay(skipRefresh);
    if (isLastTurn) return;
    if (this.game.gameEnding) return; // scoring board is displayed

    // play next move
    var self = this;
    window.setTimeout(function () {
        self.automaticAiPlay(turns - 1);
    }, animated ? 100 : 0);
};

Ui.prototype.replay = function (numMoves) {
    var moves = this.reviewMoves, cur = this.reviewCursor;
    // Play or "unplay" the moves
    for (var i = 0; i < numMoves; i++) {
        if (cur === moves.length) break;
        this.game.playOneMove(moves[cur]);
        cur++;
    }
    for (i = 0; i > numMoves; i--) {
        if (cur === 0) break;
        this.game.playOneMove('half_undo');
        cur--;
    }
    this.reviewCursor = cur;

    // Now refresh UI
    this.refreshBoard();
    this.reviewControls.setEnabled(['forw1', 'forw10'], cur !== moves.length);
    this.reviewControls.setEnabled(['back1', 'back10'], cur !== 0);
    this.showLastMove();
    if (cur < moves.length) {
        this.showNextPlayer(moves[cur]);
    } else {
        this.showNextPlayer(null);
    }

    // In eval mode, replay last move to get dev data
    if (this.inEvalMode) {
        var move = cur > 0 ? moves[cur - 1] : null;
        if (move && move.length <= 3) this.afterReplay(move);
    }
};

},{"../GameLogic":9,"../Grid":12,"../ScoreAnalyser":16,"../constants":72,"../main":73,"../userPreferences":104,"./Board":95,"./Dome":96,"./NewGameDlg":97,"./PopupDlg":98}],102:[function(require,module,exports){
var css = "body {\n  background-color: #AB8274;\n  font-family: \"Arial\";\n  margin: 0px;\n}\n::-webkit-scrollbar {\n  -webkit-appearance: none;\n  width: 7px;\n  height: 7px;\n}\n::-webkit-scrollbar-track {\n  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.2);\n  -webkit-border-radius: 10px;\n  border-radius: 7px;\n  margin: 1px;\n}\n::-webkit-scrollbar-thumb {\n  border-radius: 7px;\n  background-color: rgba(0, 0, 0, 0.5);\n  -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);\n}\n.pageTitle {\n  margin-top: 7px;\n  margin-bottom: 7px;\n  font-size: 40px;\n  font-weight: bold;\n}\n.subTitle {\n  font-size: 30px;\n  margin-top: 0.5em;\n  margin-bottom: 5px;\n}\n.logBox {\n  font-size: 28px;\n  font-family: \"Arial\";\n  background-color: white;\n  border: solid #cca 1px;\n  border-radius: 8px;\n  padding: 5px;\n  overflow-y: auto;\n  word-wrap: break-word;\n}\n.inputLbl {\n  margin-left: 10px;\n  font-size: 28px;\n}\n.inputBox {\n  margin: 17px 13px 17px 13px;\n  min-height: 1cm;\n  text-align: left;\n  font-size: 42px;\n}\nbutton {\n  margin-right: 10px;\n  margin-bottom: 10px;\n  border-radius: 13px;\n  width: 160px;\n  height: 80px;\n  font-size: 28px;\n  border-color: #987;\n  background-color: #765;\n  color: #fed;\n}\nbutton.toggled {\n  background-color: #AD4343;\n}\nbutton.disabled {\n  color: #888;\n  opacity: 0.6;\n}\n.chkBoxDiv {\n  display: inline-block;\n  margin-right: 10px;\n}\n.chkBox {\n  margin: 5px 3px 14px 2px;\n  width: 29px;\n  height: 1.5em;\n}\n.chkLbl {\n  font-size: 28px;\n}\n.dropDwn {\n  font-size: 42px;\n  margin: 17px 13px 17px 13px;\n}\n.radioBtn {\n  margin: 17px 0px 17px 13px;\n  width: 29px;\n  height: 1.5em;\n}\n.radioLbl {\n  margin-right: 13px;\n}\n.dialog {\n  z-index: 1000;\n  position: relative;\n  margin: 0 auto;\n  top: 200px;\n  width: 45%;\n  padding: 10px;\n  background-color: #ffe;\n  border: solid #cca 1px;\n  border-radius: 10px;\n  font-family: Arial;\n  font-size: 42px;\n}\n.dialogTitle {\n  font-size: 50px;\n  background-color: #ffebce;\n  border: solid 1px rgba(195, 50, 50, 0.2);\n  border-radius: 10px;\n  margin: -6px;\n  margin-bottom: 15px;\n  padding: 10px 0px 10px 12px;\n}\n.popupBackground {\n  z-index: 2000;\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n}\n.popupDlg {\n  position: relative;\n  top: 150px;\n  margin: 0 auto;\n  width: 50%;\n}\n.popupDlg .content {\n  padding: 20px;\n  white-space: pre-wrap;\n}\n.popupDlg .btnDiv {\n  width: 100%;\n  display: inline-block;\n}\n.popupDlg .btnDiv .popupDlgButton {\n  min-width: 220px;\n  height: 100%;\n  min-height: 80px;\n  font-size: 30px;\n  float: right;\n  margin-right: 0;\n  margin-left: 10px;\n}\n.gameUi {\n  padding: 2px;\n}\n.gameUi .board {\n  background-color: #402F23;\n  border-radius: 7px;\n}\n.gameUi .board .wgo-board {\n  margin: 0 auto;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n  /* disables grey shade on long-tap for Safari */\n  /* Below avoid issues when tap-hold on Android */\n  -webkit-user-select: none;\n  -webkit-touch-callout: none;\n}\n.gameUi .boardDesc {\n  margin-top: 3px;\n  font-weight: bold;\n  font-style: italic;\n}\n.gameUi button {\n  min-width: 160px;\n  height: 80px;\n}\n.gameUi a {\n  color: #a63;\n}\n.gameUi .statusBar {\n  position: relative;\n  box-sizing: border-box;\n  margin-top: 7px;\n  background-color: #B9A698;\n  border: rgba(0, 0, 0, 0.35) 1px solid;\n  border-radius: 5px;\n}\n.gameUi .statusBar .gameInfo {\n  display: inline-block;\n  box-sizing: border-box;\n  margin: 4px 5px 0 10px;\n  padding: 1px 3px;\n  width: 280px;\n  height: 44px;\n  overflow-y: auto;\n  font-size: 16px;\n  font-family: tahoma;\n  background-color: #EDDDCE;\n  border-radius: 7px;\n  border: rgba(0, 0, 0, 0.35) 1px solid;\n}\n.gameUi .statusBar .message {\n  display: inline-block;\n  position: relative;\n  top: 4px;\n  vertical-align: top;\n  width: calc(100% - 495px);\n  overflow-y: auto;\n  font-size: 20px;\n}\n.gameUi .statusBar .oneMove {\n  height: 44px;\n}\n.gameUi .statusBar .oneMove .icon .text {\n  color: #C12A04;\n}\n.gameUi .statusBar .oneMove.black .icon {\n  background-image: url(\"js/ui/stoneBlack.png\");\n}\n.gameUi .statusBar .oneMove.black .text {\n  color: white;\n}\n.gameUi .statusBar .oneMove.white .icon {\n  background-image: url(\"js/ui/stoneWhite.png\");\n}\n.gameUi .statusBar .oneMove.white .text {\n  color: black;\n}\n.gameUi .statusBar .oneMove .label {\n  display: inline-block;\n  position: relative;\n  top: -12px;\n  font-size: 20px;\n  margin-right: 2px;\n}\n.gameUi .statusBar .oneMove .icon {\n  display: inline-block;\n  position: relative;\n  top: 3px;\n  background-repeat: no-repeat;\n  background-size: 100%;\n  width: 42px;\n  height: 42px;\n}\n.gameUi .statusBar .oneMove .icon .text {\n  position: absolute;\n  width: 100%;\n  text-align: center;\n  top: 8px;\n  font-size: 20px;\n  font-weight: bold;\n}\n.gameUi .statusBar .lastMove {\n  display: inline-block;\n  position: relative;\n  top: -1px;\n  padding-left: 3px;\n}\n.gameUi .statusBar .nextPlayer {\n  position: absolute;\n  right: 10px;\n  top: 3px;\n}\n.gameUi .mainControls {\n  margin-top: 10px;\n}\n.gameUi .mainControls .outputBox {\n  width: 410px;\n  min-width: 200px;\n  font-size: 22px;\n  font-weight: bold;\n  margin-right: 10px;\n  margin-bottom: 10px;\n}\n.gameUi .devDiv {\n  min-width: 600px;\n  border: #755;\n  border-width: 1px 2px 2px 1px;\n  border-style: solid;\n  border-radius: 10px;\n  background-color: #FAEBD7;\n  padding: 7px;\n}\n.gameUi .devDiv .devControls {\n  height: 90px;\n  font-size: 24px;\n}\n.gameUi .devDiv .options {\n  display: inline-block;\n  vertical-align: top;\n  max-width: 252px;\n  margin-right: 5px;\n}\n.gameUi .devDiv .options .emailGameLink {\n  display: inline-block;\n  margin-right: 10px;\n}\n.gameUi .devDiv .options .dropDwn {\n  font-size: 24px;\n  margin: 0px 10px 5px 0px;\n}\n.gameUi .devDiv .devLogBox {\n  display: inline-block;\n  height: 102px;\n  width: 460px;\n  font-size: 20px;\n  font-weight: bold;\n}\n.testTitle {\n  margin-top: 40px;\n  margin-bottom: 10px;\n  font-size: 20px;\n  font-weight: bold;\n}\n.debugDiv {\n  margin-left: 20px;\n}\n.patternDiv {\n  display: flex;\n}\n.patternDiv .namePatternLabel {\n  position: relative;\n  top: 30px;\n}\n.patternDiv .namePatternInput {\n  flex: 1;\n  min-width: 100px;\n  max-width: 600px;\n}\n.testOutputBox {\n  height: 160px;\n  font-size: 14px;\n}\n.testErrorBox {\n  word-wrap: break-word;\n  height: 250px;\n  font-size: 14px;\n  font-family: 'Courier';\n}\n.boardDesc {\n  font-family: 'Courier';\n}\n.newGameBackground {\n  background-image: url(\"js/ui/photo.jpg\");\n  background-repeat: repeat-y;\n  background-size: cover;\n  height: 1500px;\n}\n.newGameDialog {\n  min-width: 800px;\n}\n.newGameDialog .handicapInput {\n  width: 20px;\n  text-align: center;\n}\n.newGameDialog .movesInput {\n  width: 50%;\n}\n.newGameDialog .defAiInfo {\n  font-size: 50%;\n  font-style: italic;\n  width: 400px;\n  display: inline-block;\n}\n.newGameDialog .btnDiv {\n  width: 100%;\n  height: 100px;\n}\n.newGameDialog .btnDiv .startButton {\n  width: 240px;\n  height: 100%;\n  font-size: 30px;\n  float: right;\n  margin-right: 0;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":106}],103:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var DISTANCE_THRESHOLD = 10; // px
var MIN_MOVE_DELAY = 50; // ms, how often do we emit a drag event
var HOLD_TIME_THRESHOLD = 300; // how long you must hold before dragging

/**
 * How long you must drag to be a real drag.
 * Under this, the move is considered a slow, undecided tap.
 * This is to prevent mistap when holding & releasing on same spot just long enough to start a drag.
 */
var MIN_DRAG_TIME = 500;

var MOUSE_BTN_MAIN = 0;


function TouchManager() {
    this.startX = this.startY = 0;
    this.holding = this.dragging = false;
    this.target = null;
    this.touchCount = this.startTime = this.lastMoveTime = 0;
}

var tm = module.exports = new TouchManager();


function touchstartHandler(ev) {
    var target = ev.currentTarget;
    tm.touchCount += ev.changedTouches.length;
    if (tm.touchCount > 1) {
        return tm._cancelDrag(target);
    }
    tm._onTouchStart(ev.changedTouches[0], target);
}

function touchendHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    if (tm.touchCount > 0) return console.warn('Extra touchend count?', ev);

    if (tm._onTouchEnd(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchmoveHandler(ev) {
    if (ev.changedTouches.length > 1) return tm._cancelDrag(tm.target);

    if (tm._onTouchMove(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchcancelHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    tm._cancelDrag(tm.target);
}

function mousedownHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    tm._onTouchStart(ev, ev.currentTarget);
}

function mouseupHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    if (tm._onTouchEnd(ev, tm.target)) {
        ev.preventDefault();
    }
}

function mousemoveHandler(ev) {
    if (tm._onTouchMove(ev, tm.target)) {
        ev.preventDefault();
    }
}

TouchManager.prototype._listen = function (target, on) {
    if (on) {
        if (this.target !== null) console.error('Forgot to stop listening on', this.target);
        this.holding = true;
        this.target = target;
        target.addEventListener('touchmove', touchmoveHandler);
        target.addEventListener('touchend', touchendHandler);
        target.addEventListener('touchcancel', touchcancelHandler);
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
    } else {
        if (this.target === null) return console.warn('Not listening anyway');
        this.holding = false;
        this.target = null;
        target.removeEventListener('touchmove', touchmoveHandler);
        target.removeEventListener('touchend', touchendHandler);
        target.removeEventListener('touchcancel', touchcancelHandler);
        document.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
    }
};

TouchManager.prototype._onTouchStart = function (ev, target) {
    this._listen(target, true);
    this.holding = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startTime = Date.now();
    var self = this;
    if (this.holdTimeout) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = window.setTimeout(function () {
        self.holdTimeout = null;
        if (self.holding && !self.dragging) self._startDrag(ev, target);
    }, HOLD_TIME_THRESHOLD);
};

TouchManager.prototype._startDrag = function (ev, target) {
    this.dragging = true;
    this.startTime = Date.now();
    target.touchHandlerFn('dragStart', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
};

TouchManager.prototype._cancelDrag = function (target) {
    this.touchCount = 0;
    this._listen(target, false);
    if (this.dragging) {
        this.dragging = false;
        target.touchHandlerFn('dragCancel');
    }
    return true;
};

TouchManager.prototype._onTouchMove = function (ev, target) {
    var now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_DELAY) return true;
    this.lastMoveTime = now;

    if (!this.dragging) {
        if (Math.abs(ev.clientX - this.startX) + Math.abs(ev.clientY - this.startY) < DISTANCE_THRESHOLD) {
            return false;
        }
        if (now - this.startTime < HOLD_TIME_THRESHOLD) {
            this._listen(target, false);
            return false;
        }
        return this._startDrag(ev, target);
    }
    target.touchHandlerFn('drag', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    return true;
};

TouchManager.prototype._onTouchEnd = function (ev, target) {
    // Did we drag long enough?
    if (this.dragging && Date.now() - this.startTime < MIN_DRAG_TIME) {
        return this._cancelDrag(target);
    }

    var eventName = this.dragging ? 'dragEnd' : 'tap';
    target.touchHandlerFn(eventName, ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    this._listen(target, false);
    this.dragging = false;
    return true;
};

/** Starts to listen on given element.
 * @param {dom} elt
 * @param {func} handlerFn - handlerFn(eventName, x, y)
 *    With eventName in: tap, dragStart, drag, dragEnd, dragCancel
 */
TouchManager.prototype.listenOn = function (elt, handlerFn) {
    elt.touchHandlerFn = handlerFn;

    elt.addEventListener('touchstart', touchstartHandler);
    elt.addEventListener('mousedown', mousedownHandler);
};

},{}],104:[function(require,module,exports){
'use strict';

var main = require('./main');

var PREF_NAME = main.appName;
var DEFAULT_SAVE_DELAY = 180; //in seconds
var ALL_USERS_KEY = 'all'; //prefix for global "all users" keys


/** @class */
function UserPreferences() {
    this.autosave = null;
    this.nextSaveTime = 0;
    this.accountName = null;
    this.prefs = {};
    this._load();
}

/** Call "close" if your app is terminating now. This will make sure latest data changes are saved. */
UserPreferences.prototype.close = function () {
    this.setAccount(null);
};

/** Sets the "scope" of stored values with the current account name
 *  @param {string|null} accountName - the account name or null to "exit" previous account scope */
UserPreferences.prototype.setAccount = function (accountName) {
    if (this.autosave) {
        this._save();
    }
    this.accountName = accountName;
};

/** @private */
UserPreferences.prototype._load = function () {
    try {
        var content = window.localStorage.getItem(PREF_NAME);
        if (content) {
            this.prefs = JSON.parse(content);
        }
    } catch (err) {
        main.log.warn('Failed to load user preferences: ' + err);
    }
};

/** Schedules the next autosave
 *  @private
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier */
UserPreferences.prototype._scheduleNextSave = function (saveAfter) {
    var self = this;
    if (!saveAfter) {
        //NB: we refuse "0" as delay, sign of someone ignoring the API doc
        saveAfter = DEFAULT_SAVE_DELAY;
    }
    var nextSaveTime = Date.now() + saveAfter * 1000;

    //if already scheduled and for a time coming before the current request, we are fine just doing nothing
    if (this.autosave && this.nextSaveTime <= nextSaveTime) {
        return;
    }

    //we need to schedule (or reschedule) the next save
    if (this.autosave) {
        window.clearTimeout(this.autosave);
    }
    this.nextSaveTime = nextSaveTime;
    this.autosave = window.setTimeout(function () {
        self.autosave = null;
        self._save();
    }, saveAfter * 1000);
};

/** Saves all modified values right now.
 *  @private */
UserPreferences.prototype._save = function () {
    try {
        if (this.autosave) {
            //cancel the current scheduling since we have been called "by force"
            window.clearTimeout(this.autosave);
            this.autosave = null;
        }
        window.localStorage.setItem(PREF_NAME, JSON.stringify(this.prefs));
    } catch (err) {
        main.log.warn('Failed to save user preferences: ' + err);
    }
};

/** Gets a value from user preferences
 *  @param {string} key - key name
 *  @param {any} defValue - value to be returned as default if no previous value was set
 *  @param {boolean} [global] - pass true to read a global (all accounts) value; false is default
 *  @return {any} the value (any type) */
UserPreferences.prototype.getValue = function (key, defValue, global) {
    key = (this.accountName && !global ? this.accountName : ALL_USERS_KEY) + '#' + key;
    var value = this.prefs[key];
    if (value === undefined) {
        return defValue;
    }
    return value;
};

/** Sets a value into user preferences
 *  @param {string} key - key name
 *  @param {any} value - value to be set, any type
 *  @param {int} [saveAfter] - maximum delay before next autosave (in second); NB: could be saved earlier */
UserPreferences.prototype.setValue = function (key, value, saveAfter) {
    key = (this.accountName ? this.accountName : ALL_USERS_KEY) + '#' + key;
    this.prefs[key] = value;

    this._scheduleNextSave(saveAfter);
};

var prefs = new UserPreferences();
module.exports = prefs;

},{"./main":73}],105:[function(require,module,exports){
module.exports = function (css, customDocument) {
  var doc = customDocument || document;
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css;
    return sheet.ownerNode;
  } else {
    var head = doc.getElementsByTagName('head')[0],
        style = doc.createElement('style');

    style.type = 'text/css';

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(doc.createTextNode(css));
    }

    head.appendChild(style);
    return style;
  }
};

module.exports.byUrl = function(url) {
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode;
  } else {
    var head = document.getElementsByTagName('head')[0],
        link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = url;

    head.appendChild(link);
    return link;
  }
};

},{}],106:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":105}],107:[function(require,module,exports){
module.exports={
  "name": "rubigolo",
  "version": "0.2.0",
  "description": "",
  "author": "Olivier Lombart (kubicle)",
  "license": "MIT",
  "scripts": {
    "build": "browserify js/app.js -t lessify | uglifyjs -o build/bld.js -m --mangle-props --reserved-file build/reserved.json --reserve-domprops --mangle-regex=\"/^[^.]/\" -c pure_funcs=['main.log.debug','main.log.warn']",
    "dev-build": "watchify js/test/testApp.js -o build/devBuild.js -t lessify -v",
    "test": "node js/test/ciTestMain.js --ci"
  },
  "main": "js/app.js",
  "repository": {
    "type": "git",
    "url": "https://github.com/kubicle/rubigolo"
  },
  "bugs": {
    "url": "https://github.com/kubicle/rubigolo/issues"
  },
  "keywords": [
    "baduk",
    "go",
    "igo",
    "weiqi"
  ],
  "dependencies": {
    "socket.io-client": "=1.2.1"
  },
  "devDependencies": {
    "istanbul": "~0.3.22",
    "codeclimate-test-reporter": "~0.1.1",
    "browserify": "~10.2.4",
    "lessify": "~1.0.1",
    "watchify": "~3.2.2",
    "uglify-js": "~2.6.2"
  }
}

},{}]},{},[94]);

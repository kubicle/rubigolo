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
//Translated from breeder.rb using babyruby2js
'use strict';

var main = require('./main');
var Genes = require('./Genes');
var TimeKeeper = require('./test/TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');

var BLACK = main.BLACK, WHITE = main.WHITE;

main.debugBreed = false; // TODO move me somewhere else?


/** @class */
function Breeder(gameSize) {
    this.gsize = gameSize;
    this.timer = new TimeKeeper();
    this.game = new GameLogic();
    this.game.switchConsoleMode(true);
    this.game.setLogLevel('all=0');
    this.game.newGame(this.gsize);
    this.goban = this.game.goban;
    this.players = [
        new main.ais.Droopy(this.goban, BLACK),
        new main.defaultAi(this.goban, WHITE)
    ];
    this.scorer = new ScoreAnalyser();
    this.genSize = Breeder.GENERATION_SIZE;
    this.firstGeneration();
    this.seenGames = {};
}
module.exports = Breeder;

Breeder.GENERATION_SIZE = 26; // must be even number
Breeder.MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
Breeder.WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
Breeder.KOMI = 1.5;
Breeder.TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game


Breeder.prototype.firstGeneration = function () {
    this.controlGenes = this.players[0].genes.clone();
    this.generation = [];
    this.newGeneration = [];
    for (var i = 0; i < this.genSize; i++) {
        this.generation.push(this.players[0].genes.clone().mutateAll());
        this.newGeneration.push(new Genes());
    }
    this.scoreDiff = [];
};

Breeder.prototype.showInUi = function (title, msg) {
    if (main.testUi) main.testUi.showTestGame(title, msg, this.game);
};

Breeder.prototype.playUntilGameEnds = function () {
    var game = this.game;
    while (!game.gameEnding) {
        var curPlayer = this.players[game.curColor];
        var move = curPlayer.getMove();
        game.playOneMove(move);
    }
    // Keep track of games we already saw
    var img = game.goban.buildCompressedImage();
    if (!this.seenGames[img]) this.seenGames[img] = 1;
    else this.seenGames[img]++;
};

// Plays a game and returns the score difference in points
Breeder.prototype.playGame = function (name1, name2, p1, p2) {
    this.game.newGame(this.gsize, 0, Breeder.KOMI);
    this.players[0].prepareGame(p1);
    this.players[1].prepareGame(p2);
    var scoreDiff;
    try {
        this.playUntilGameEnds();
        scoreDiff = this.scorer.computeScoreDiff(this.goban, Breeder.KOMI);
    } catch (err) {
        main.log.error('Exception occurred during a breeding game: ' + err);
        main.log.error(this.game.historyString());
        this.showInUi('Exception in breeding game', err);
        throw err;
    }
    if (main.debugBreed) {
        main.log.debug('\n#' + name1 + ':' + p1 + '\nagainst\n#' + name2 + ':' + p2);
        main.log.debug('Distance: ' + '%.02f'.format(p1.distance(p2)));
        main.log.debug('Score: ' + scoreDiff);
        main.log.debug('Moves: ' + this.game.historyString());
        main.log.debug(this.goban.toString());
    }
    return scoreDiff;
};

Breeder.prototype.run = function (numTournaments, numMatchPerAi) {
    for (var i = 1; i <= numTournaments; i++) { // TODO: Find a way to appreciate the progress
        var tournamentDesc = 'Breeding tournament ' + i + '/' + numTournaments +
            ': each of ' + this.genSize + ' AIs plays ' + numMatchPerAi + ' games';
        this.timer.start(tournamentDesc, 5.5);
        this.oneTournament(numMatchPerAi);
        this.timer.stop(/*lenientIfSlow=*/true);
        this.reproduction();
        this.control();
    }
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
            var diff = this.playGame(p1.toString(), p2.toString(), this.generation[p1], this.generation[p2]);
            if (Math.abs(diff) < Breeder.TOO_SMALL_SCORE_DIFF) {
                diff = 0;
            } else {
                diff = Math.abs(diff) / diff; // get sign of diff only -> -1,+1
            }
            // diff is now -1, 0 or +1
            this.scoreDiff[p1] += diff;
            if (main.debugBreed) main.log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' +
                p1 + ':' + this.scoreDiff[p1] + ', #' + p2 + ':' + this.scoreDiff[p2]);
        }
    }
    return this.rank;
};

Breeder.prototype.reproduction = function () {
    if (main.debugBreed) main.log.debug('=== Reproduction time for ' + this.generation.length + ' AI');

    this.picked = Array.new(this.genSize, 0);
    this.maxScore = Math.max.apply(Math, this.scoreDiff);
    this.winner = this.generation[this.scoreDiff.indexOf(this.maxScore)];
    this.pickIndex = 0;
    for (var i = 0; i <= this.genSize - 1; i += 2) {
        var parent1 = this.pickParent();
        var parent2 = this.pickParent();
        parent1.mate(parent2, this.newGeneration[i], this.newGeneration[i + 1], Breeder.MUTATION_RATE, Breeder.WIDE_MUTATION_RATE);
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
    for (;;) {
        var i = this.pickIndex;
        this.pickIndex = (this.pickIndex + 1) % this.genSize;
        if (Math.random() < this.scoreDiff[i] / this.maxScore) {
            this.picked[i]++;
            // $log.debug("Picked parent #{i} (score #{@score_diff[i]})") if $debug_breed
            return this.generation[i];
        }
    }
};

Breeder.prototype.control = function () {
    var totalScore, numWins, numWinsW;
    var previous = main.debugBreed;
    main.debugBreed = false;
    var numControlGames = 30;
    main.log.debug('Playing ' + numControlGames * 2 + ' games to measure the current winner against our control AI...');
    totalScore = numWins = numWinsW = 0;
    for (var i = 0; i < numControlGames; i++) {
        var score = this.playGame('control', 'winner', this.controlGenes, this.winner);
        var scoreW = this.playGame('winner', 'control', this.winner, this.controlGenes);
        if (score > 0) numWins++;
        if (scoreW < 0) numWinsW++;
        totalScore += score - scoreW;
    }
    if (main.debug) main.log.debug('Average score: ' + totalScore / numControlGames +
        '\nWinner genes: ' + this.winner +
        '\nDistance between control and current winner: ' + this.controlGenes.distance(this.winner).toFixed(2) +
        '\nTotal score of control against current winner: ' + totalScore +
        ' (out of ' + numControlGames * 2 + ' games, control won ' +
        numWins + ' as black and ' + numWinsW + ' as white)');
    main.debugBreed = previous;
};

// Play many games AI VS AI to verify black/white balance
// Returns the number of games won by White
Breeder.prototype.bwBalanceCheck = function (numGames, gsize, numLostGamesShowed) {
    var blackAi = this.players[BLACK].version, whiteAi = this.players[WHITE].version;
    var desc = numGames + ' games on ' + gsize + 'x' + gsize + ', komi=' + Breeder.KOMI + ', ' +
        blackAi + ' VS ' + whiteAi;
    var expectedDuration = gsize === 9 ? numGames * 0.05 : undefined;
    this.timer.start(desc, expectedDuration);

    var totalScore = 0, numWins = 0;
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame('control', 'control', this.controlGenes, this.controlGenes);
        if (score === 0) throw new Error('Unexpected tie game');
        if (score > 0) {
            numWins++; // Black won
            if (numWins <= numLostGamesShowed)
                this.showInUi('Lost breeding game #' + numWins, this.game.historyString());
        }
        totalScore += score;
    }

    this.timer.stop(/*lenientIfSlow=*/true);
    main.log.info('Average score difference for Black (points per game): ' + totalScore / numGames);
    main.log.info('Out of ' + numGames + ' games, White-' + whiteAi +
        ' won ' + (numGames - numWins) + ' times, and Black-' + blackAi + ' won ' + numWins + ' times');

    var dupes = 0;
    for (i in this.seenGames) {
        dupes += this.seenGames[i] - 1;
    }
    main.log.info('Number of dupe games: ' + dupes);

    return numGames - numWins; // number of White's victory
};

},{"./GameLogic":8,"./Genes":9,"./ScoreAnalyser":15,"./main":70,"./test/TimeKeeper":90}],8:[function(require,module,exports){
//Translated from game_logic.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
var Goban = require('./Goban');
var SgfReader = require('./SgfReader');
var HandicapSetter = require('./HandicapSetter');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class GameLogic enforces the game logic.
 *  public read-only attribute: goban, komi, curColor, gameEnded, gameEnding, whoResigned
 */
function GameLogic(src) {
    this.inConsole = false;
    this.history = [];
    this.errors = [];

    this.goban = null;
    this.handicap = this.komi = this.numPass = this.curColor = 0;
    this.whoResigned = this.gameEnding = this.gameEnded = null;

    if (src) this.copy(src);
}
module.exports = GameLogic;


GameLogic.prototype.copy = function (src) {
    this.newGame(src.goban.gsize, src.handicap, src.komi);

    // TODO: general settings should probably be at GameLogic level
    if (src.goban.useSuperko) this.goban.setRules({ positionalSuperko: true });

    this.loadMoves(src.history.join(','));
};

// handicap and komi are optional (default is 0)
// Returns true if size and handicap could be set to given values
GameLogic.prototype.newGame = function (gsize, handicap, komi) {
    this.history.clear();
    this.errors.clear();
    this.numPass = 0;
    this.curColor = main.BLACK;
    this.gameEnded = this.gameEnding = false;
    this.whoResigned = null;

    if (!this.goban || gsize !== this.goban.gsize) {
        this.goban = new Goban(gsize);
    } else {
        this.goban.clear();
    }

    handicap = handicap !== undefined ? handicap : 0;
    this.setHandicap(handicap);

    this.komi = komi !== undefined ? komi : (handicap ? 0.5 : 6.5);

    return this.goban.gsize === gsize && this.handicap === handicap;
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
    if (SgfReader.isSgf(game)) {
        game = this._sgfToGame(game, errors);
        if (!game) return false;
    }

    var moves = game.split(',');
    for (var i = 0; i < moves.length; i++) {
        if (!this.playOneMove(moves[i])) {
            return this._failLoad('Failed playing loaded move #' + (i + 1) + ':\n' + this.getErrors(), errors);
        }
    }
    return true;
};

// @param {string} game - SGF game text
// @param {string[]} [errors] - errors will be added to this or thrown
// @param {number} [upToMoveNumber] - loads moves up to the position before this - SGF only
GameLogic.prototype.loadSgf = function (game, errors, upToMoveNumber) {
    game = this._sgfToGame(game, errors, upToMoveNumber);
    if (!game) return false;
    return this.loadMoves(game, errors);
};

// Handles a regular move + the special commands (pass, resign, undo, load, hand, log)
// Returns false if a problem occured. In this case the error message is available.
GameLogic.prototype.playOneMove = function (move) {
    if (this.gameEnded) return this._errorMsg('Game already ended');

    if (/^[B|W]?[a-z][1-2]?[0-9]$/.test(move)) {
        return this.playAStone(move);
    } else if (move === 'undo') {
        return this._requestUndo();
    } else if (move === 'half_undo') {
        return this._requestUndo(true);
    } else if (move.startWith('resi')) {
        return this.resign();
    } else if (move === 'pass') {
        return this.passOneMove();
    } else if (move.startWith('hand')) {
        return this.setHandicap(move.split(':')[1]);
    } else if (move.startWith('load:')) {
        return this.loadMoves(move.slice(5));
    } else if (move.startWith('log')) {
        return this.setLogLevel(move.split(':')[1]);
    } else {
        return this._errorMsg('Invalid command: ' + move);
    }
};

// Handles a new stone move (not special commands like "pass")
// e.g. "c3" or "Bc3" or "Wc3"
GameLogic.prototype.playAStone = function (move) {
    // Parse [B|W]vertex
    var vertex = move.substr(1);
    switch (move[0]) {
    case 'B': this.curColor = BLACK; break;
    case 'W': this.curColor = WHITE; break;
    default: vertex = move;
    }

    var coords = Grid.move2xy(vertex);
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

// One player resigns.
GameLogic.prototype.resign = function () {
    this._storeMoveInHistory('resign');
    this.whoResigned = this.curColor;
    this.gameEnded = true;
    return true;
};

// Call this when the current player wants to pass.
// If all (remaining) players pass, we go into "ending mode".
// Caller is responsible of checking the GameLogic#game_ending flag:
// If the flag goes to true, the method accept_ending (below) should be called next.
GameLogic.prototype.passOneMove = function () {
    this._storeMoveInHistory('pass');
    this.numPass += 1;
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
    return (( this.handicap > 0 ? 'handicap:' + this.handicap + ',' : '' )) +
        this.history.join(',') +
        ' (' + this.history.length + ' moves)';
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
GameLogic.prototype.prisoners = function () {
    return Group.countPrisoners(this.goban);
};

// If not called, getErrors() has to be called to retrieve recent errors.
// If called with on=true (or no param), error messages will logged directly.
GameLogic.prototype.switchConsoleMode = function (on) {
    if (on === undefined) on = true;
    this.inConsole = on;
};

// Stores or log a new error message (see also switchConsoleMode).
// Always returns false.
GameLogic.prototype._errorMsg = function (msg) {
    if (this.inConsole) {
        main.log.error(msg);
    } else {
        this.errors.push(msg);
    }
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
        if (!this.history[this.history.length-1].endWith('pass')) { // no stone to remove for a pass
            this.goban.undo();
        }
        this.history.pop();
    }
    if (halfMove) this._nextPlayer();
    this.numPass = 0;
    return true;
};

// Converts a game (list of moves) from SGF format to our internal format.
// Returns the game unchanged if it is not an SGF one.
GameLogic.prototype._sgfToGame = function (game, errors, upToMoveNumber) {
    var reader, infos;
    try {
        reader = new SgfReader();
        infos = reader.readGame(game, upToMoveNumber);
    } catch (err) {
        this._failLoad('Failed loading SGF moves:\n' + err, errors);
        return null;
    }
    this.newGame(infos.boardSize);
    this.komi = infos.komi;
    return reader.toMoveList();
};

},{"./Goban":10,"./Grid":11,"./Group":12,"./HandicapSetter":13,"./SgfReader":16,"./main":70}],9:[function(require,module,exports){
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
},{"./main":70}],10:[function(require,module,exports){
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
 *  public attribute: scoringGrid
 *  public read-only attribute: gsize, grid, mergedGroups, killedGroups, garbageGroups
 */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    if (gsize !== ~~gsize || gsize < 3) throw new Error('Invalid goban size: ' + gsize);
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
    this._initSuperko(false);

    // this._moveIdStack = [];
    // this._moveIdGen = this.moveId = 0; // moveId is unique per tried move

    this.analyseGrid = null;
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
    this._initSuperko(false);

    // this._moveIdStack.clear();
    // this._moveIdGen = this.moveId = 0;
};

Goban.prototype.setRules = function (rules) {
    for (var rule in rules) {
        var setting = rules[rule];
        switch (rule) {
        case 'positionalSuperko': this._initSuperko(setting); break;
        default: main.log.warn('Ignoring unsupported rule: ' + rule + ': ' + setting);
        }
    }
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.newGroup = function (stone, lives) {
    this.numGroups++;
    var group = this.garbageGroups.pop();
    if (group) {
        return group.recycle(stone, lives, this.numGroups);
    } else {
        return new Group(this, stone, lives, this.numGroups);
    }
};

Goban.prototype.deleteGroup = function (group) {
    // When undoing a move, we usually can decrement group ID generator too
    if (group.ndx === this.numGroups) this.numGroups--;
    this.garbageGroups.push(group);
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
            if (color !== EMPTY) this.playAt(i, j, color);
        }
    }
};

Goban.prototype.getAllGroups = function () {
    var groups = {};
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
    return this.grid.toText(function (s) {
        return Grid.colorToChar(s.color);
    });
};

Goban.prototype.isValidMove = function (i, j, color) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) return false;

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) return false;

    if (stone.moveIsSuicide(color)) {
        return false;
    }
    if (stone.moveIsKo(color)) {
        return false;
    }
    if (this.useSuperko) {
        // Check this is not a superko (already seen position)
        if (this.allSeenPositions[this.nextMoveImage(i, j, color)]) {
            return false;
        }
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
    var stone = this._putDown(i, j);
    stone.putDown(color);
    return stone;
};

// Called to undo a single stone (the main undo feature relies on this)  
Goban.prototype.undo = function () {
    var stone = this._takeBack();
    if (!stone) throw new Error('Extra undo');
    stone.takeBack();
    this._updatePositionSignature();
};

Goban.prototype.tryAt = function (i, j, color) {
    var stone = this._putDown(i, j);
    if (main.debug) main.log.debug('try ' + stone);
    stone.putDown(color);
    return stone;
};

Goban.prototype.untry = function () {
    var stone = this._takeBack();
    if (main.debug) main.log.debug('untry ' + stone);
    stone.takeBack();
};

// Plays a stone and stores it in history
// Returns the existing stone and the caller (Stone class) will update it
Goban.prototype._putDown = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) {
        throw new Error('Tried to play on existing stone in ' + stone);
    }
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Returns the existing stone for the caller to update it
Goban.prototype._takeBack = function () {
    return this.history.pop();
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

Goban.prototype._initSuperko = function (isRuleOn) {
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

},{"./Grid":11,"./Group":12,"./Stone":17,"./main":70}],11:[function(require,module,exports){
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
    if (initValue === undefined) initValue = main.EMPTY;
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
    if (typeof this.yx[1][1] === 'object') {
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
        if (row.length !== this.gsize) throw new Error('Invalid image: row ' + row);
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = Grid.charToColor(row[i - 1]);
        }
    }
};

var COLUMNS = 'abcdefghjklmnopqrstuvwxyz'; // NB: "i" is skipped

// Parses a move like "c12" into 3,12
Grid.move2xy = function (move) {
    var i = COLUMNS.indexOf(move[0]) + 1;
    var j = parseInt(move.substr(1, 2));
    if (!i || isNaN(j)) throw new Error('Illegal move parsed: ' + move);
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

},{"./main":70}],12:[function(require,module,exports){
//Translated from group.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');

var EMPTY = main.EMPTY;

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
    return this;
};

Group.prototype.clear = function () {
    for (var i = this.stones.length - 1; i >= 0; i--) {
        this.stones[i].clear();
    }
    this.goban.deleteGroup(this);
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

Group.prototype.isValid = function () {
    return this.stones[0].group === this;
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

},{"./Grid":11,"./main":70}],13:[function(require,module,exports){
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

},{"./Grid":11,"./main":70}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
//Translated from score_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function ScoreAnalyser() {
    this.goban = null;
    this.analyser = new main.defaultAi.BoardAnalyser();
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

    var totals = [
        scores[BLACK] + prisoners[WHITE],
        scores[WHITE] + prisoners[BLACK] + komi];
    var details = [
        [scores[BLACK], prisoners[WHITE], 0],
        [scores[WHITE], prisoners[BLACK], komi]];

    this.scoreInfo = [totals, details];
    return this.scoreInfo;
};

ScoreAnalyser.prototype.getScore = function () {
    return this.scoreInfoToS(this.scoreInfo);
};

ScoreAnalyser.prototype.getScoringGrid = function () {
    return this.analyser.getScoringGrid();
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
    var diff = totals[BLACK] - totals[WHITE];
    s.push(this.scoreDiffToS(diff));

    for (var c = BLACK; c <= WHITE; c++) {
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
        s.push(Grid.colorName(c) + ': ' +
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

},{"./Grid":11,"./main":70}],16:[function(require,module,exports){
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
    RU: ['text', 'rules'],
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
    return game.trimLeft().startWith('(;');
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
    return t.trimLeft();
};

SgfReader.prototype._get = function (lex, t) {
    if (!t.startWith(lex)) this._error(lex + ' expected', t);
    return t.replace(lex, '').trimLeft();
};

SgfReader.prototype._error = function (reason, t) {
    throw new Error('Syntax error: \'' + reason + '\' at ...' + t.substr(0, 20) + '...');
};

},{"./main":70}],17:[function(require,module,exports){
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
    if (main.debugGroup) main.log.debug('takeBack: ' + this.toString() + ' from group ' + this.group);

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
    if (main.debugGroup) main.log.debug('takeBack: end; main group: ' + logGroup.debugDump());
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

},{"./Grid":11,"./Group":12,"./main":70}],18:[function(require,module,exports){
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

},{"./Connector":19,"./GroupAnalyser":20,"./Hunter":22,"./Influence":23,"./NoEasyPrisoner":24,"./PotentialTerritory":25,"./Pusher":26,"./Savior":27,"./Shaper":28,"./Spacer":29}],19:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],20:[function(require,module,exports){
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

},{"./Heuristic":21,"./boan/BoardAnalyser":31,"util":6}],21:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

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
    this.name = this.constructor.name;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.infl = player.infl;
    this.pot = player.pot;
    this.boan = player.boan;
    this.scoreGrid = new Grid(this.gsize);
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
                main.debug = true; // set your breakpoint on this line if needed

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

},{"../../Grid":11,"../../Stone":17,"../../main":70}],22:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],23:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],24:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],25:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

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
    this.grids = [new Grid(this.gsize), new Grid(this.gsize)];
    this.reducedGrid = new Grid(this.gsize);
    this.territory = new Grid(this.gsize); // result of evaluation
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

},{"../../Grid":11,"../../Stone":17,"../../main":70,"./Heuristic":21,"util":6}],26:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],27:[function(require,module,exports){
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
                main.debug = true; // set your breakpoint on this line if needed

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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],28:[function(require,module,exports){
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, sOK = main.sOK;
var SOMETIMES = main.SOMETIMES, ALWAYS = main.ALWAYS;


/** @class Cares about good shapes
 */
function Shaper(player) {
    Heuristic.call(this, player);

    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);

    this.potEyeGrid = new Grid(this.gsize);
}
inherits(Shaper, Heuristic);
module.exports = Shaper;


Shaper.prototype.evalBoard = function (stateYx, scoreYx) {
    this.potEyeGrid.init();
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

},{"../../Grid":11,"../../main":70,"./Heuristic":21,"util":6}],29:[function(require,module,exports){
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

},{"../../main":70,"./Heuristic":21,"util":6}],30:[function(require,module,exports){
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

},{"../../../main":70}],31:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Group = require('../../../Group');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser() {
    this.version = BoardAnalyser.VERSION;
    this.mode = null;
    this.goban = null;
    this.allVoids = [];
    this.allGroups = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


var BOAN_VERSION = BoardAnalyser.VERSION = 'chuckie';


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = Group.countPrisoners(goban);

    var grid = goban.scoringGrid.initFromGoban(goban);
    if (!this._initAnalysis('SCORE', goban, grid)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(grid.toText(function (c) { return Grid.colorToChar(c); }));
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
    return this.goban.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' +
        this.goban.analyseGrid.toText(function (c) { return Grid.colorToChar(c); }) +
        'Voids:\n';
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
    goban.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroups[g.ndx];
    if (!gi) {
        if (!g._info || g._info.version !== BOAN_VERSION) {
            g._info = new GroupInfo(g, BOAN_VERSION);
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

},{"../../../Grid":11,"../../../Group":12,"../../../main":70,"./GroupInfo":32,"./Void":33,"./ZoneFiller":34}],32:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Band = require('./Band');

var EMPTY = main.EMPTY;
var NEVER = main.NEVER, SOMETIMES = main.SOMETIMES, ALWAYS = main.ALWAYS;


/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group, version) {
    this.version = version;
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
    var analyseYx = g.goban.analyseGrid.yx;
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

},{"../../../main":70,"./Band":30}],33:[function(require,module,exports){
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

},{"../../../Grid":11,"../../../main":70}],34:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('../../../main');

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
    if (color === BORDER) return false;
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

},{"../../../main":70}],35:[function(require,module,exports){
'use strict';

var main = require('../../main');

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var ZoneFiller = require('./boan/ZoneFiller');

var sOK = main.sOK, sINVALID = main.sINVALID, sBLUNDER = main.sBLUNDER, sDEBUG = main.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class */
function Chuckie(goban, color, genes) {
    this.version = 'Chuckie-1.0';
    this.goban = goban;
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize);
    this.scoreGrid = new Grid(this.gsize);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Chuckie;

// Used only by tests
Chuckie.BoardAnalyser = BoardAnalyser;
Chuckie.ZoneFiller = ZoneFiller;


Chuckie.prototype._createHeuristics = function () {
    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var n = 0; n < heuristics.length; n++) {
        var h = new (heuristics[n])(this);
        this.heuristics.push(h);
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
    this.numMoves = 0;

    this.bestScore = this.bestI = this.bestJ = 0;
    this.testI = this.testJ = NO_MOVE;
    this.debugHeuristic = null;
};

Chuckie.prototype.getHeuristic = function (heuristicName) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    return null;
};

Chuckie.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
};

Chuckie.prototype._foundBestMove = function(i, j, score) {
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
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
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
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
        if (time > 1 && !main.isCoverTest) {
            main.log.warn('Slowness: ' + h.name + ' took ' + time + 'ms');
        }
    }
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
    return Grid.xy2move(this.bestI, this.bestJ);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Chuckie.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    main.log.debug(Grid.xy2move(i, j) + ' seen as blunder: ' + reason);
};
Chuckie.prototype.isBlunderMove = function (i, j) {
    return this.stateGrid.yx[j][i] === sBLUNDER;
};

Chuckie.prototype.guessTerritories = function () {
    this.pot.evalBoard();
    return this.pot.territory.yx;
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
        var h = this.heuristics[n];
        var s = h.scoreGrid.yx[j][i];
        if (s) survey[h.name] = s; // s can be 0 or null too
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
    if (move[1] > '9') return '';
    var coords = Grid.move2xy(move), i = coords[0], j = coords[1];
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


},{"../../Genes":9,"../../Grid":11,"../../main":70,"./AllHeuristics":18,"./boan/BoardAnalyser":31,"./boan/ZoneFiller":34}],36:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./Connector":37,"./GroupAnalyser":38,"./Hunter":40,"./Influence":41,"./NoEasyPrisoner":42,"./PotentialTerritory":43,"./Pusher":44,"./Savior":45,"./Shaper":46,"./Spacer":47,"dup":18}],37:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":19,"util":6}],38:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./Heuristic":39,"./boan/BoardAnalyser":49,"dup":20,"util":6}],39:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"../../Grid":11,"../../Stone":17,"../../main":70,"dup":21}],40:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":22,"util":6}],41:[function(require,module,exports){
arguments[4][23][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":23,"util":6}],42:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":24,"util":6}],43:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"../../Grid":11,"../../Stone":17,"../../main":70,"./Heuristic":39,"dup":25,"util":6}],44:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":26,"util":6}],45:[function(require,module,exports){
arguments[4][27][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":27,"util":6}],46:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"../../Grid":11,"../../main":70,"./Heuristic":39,"dup":28,"util":6}],47:[function(require,module,exports){
arguments[4][29][0].apply(exports,arguments)
},{"../../main":70,"./Heuristic":39,"dup":29,"util":6}],48:[function(require,module,exports){
arguments[4][30][0].apply(exports,arguments)
},{"../../../main":70,"dup":30}],49:[function(require,module,exports){
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Group = require('../../../Group');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser() {
    this.version = BoardAnalyser.VERSION;
    this.mode = null;
    this.goban = null;
    this.allVoids = [];
    this.allGroups = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


var BOAN_VERSION = BoardAnalyser.VERSION = 'droopy';


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = Group.countPrisoners(goban);

    var grid = goban.scoringGrid.initFromGoban(goban);
    if (!this._initAnalysis('SCORE', goban, grid)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(grid.toText(function (c) { return Grid.colorToChar(c); }));
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
    return this.goban.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' +
        this.goban.analyseGrid.toText(function (c) { return Grid.colorToChar(c); }) +
        'Voids:\n';
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
    goban.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroups[g.ndx];
    if (!gi) {
        if (!g._info || g._info.version !== BOAN_VERSION) {
            g._info = new GroupInfo(g, BOAN_VERSION);
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

},{"../../../Grid":11,"../../../Group":12,"../../../main":70,"./GroupInfo":50,"./Void":51,"./ZoneFiller":52}],50:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"../../../main":70,"./Band":48,"dup":32}],51:[function(require,module,exports){
arguments[4][33][0].apply(exports,arguments)
},{"../../../Grid":11,"../../../main":70,"dup":33}],52:[function(require,module,exports){
arguments[4][34][0].apply(exports,arguments)
},{"../../../main":70,"dup":34}],53:[function(require,module,exports){
//Translated from ai1_player.rb using babyruby2js
'use strict';

var main = require('../../main');

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var ZoneFiller = require('./boan/ZoneFiller');

var sOK = main.sOK, sINVALID = main.sINVALID, sBLUNDER = main.sBLUNDER, sDEBUG = main.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class */
function Droopy(goban, color, genes) {
    this.version = 'Droopy-1.0';
    this.goban = goban;
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize);
    this.scoreGrid = new Grid(this.gsize);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Droopy;

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
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
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
    if (this.numMoves >= this.gsize * this.gsize) { // force pass after too many moves
        main.log.error('Forcing AI pass since we already played ' + this.numMoves);
        return 'pass';
    }
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
        var t0 = Date.now();

        if (h._beforeEvalBoard) h._beforeEvalBoard();
        h.evalBoard(stateYx, scoreYx);

        var time = Date.now() - t0;
        if (time > 1 && !main.isCoverTest) {
            main.log.warn('Slowness: ' + h.name + ' took ' + time + 'ms');
        }
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
        if (s) survey[h.name] = s; // s can be 0 or null too
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
    if (move[1] > '9') return '';
    var coords = Grid.move2xy(move), i = coords[0], j = coords[1];
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


},{"../../Genes":9,"../../Grid":11,"../../main":70,"./AllHeuristics":36,"./boan/BoardAnalyser":49,"./boan/ZoneFiller":52}],54:[function(require,module,exports){
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

},{"./Connector":55,"./Hunter":57,"./NoEasyPrisoner":58,"./Pusher":59,"./Savior":60,"./Shaper":61,"./Spacer":62}],55:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":56,"util":6}],56:[function(require,module,exports){
//Translated from heuristic.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

var sOK = main.sOK, ALWAYS = main.ALWAYS;
var EMPTY = main.EMPTY, BORDER = main.BORDER;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = main.DIR0, DIR3 = main.DIR3;


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
    this.scoreGrid = new Grid(this.gsize);

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
    return this.player.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
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
    this.player.markMoveAsBlunder(i, j, this.constructor.name + ':' + reason);
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

},{"../../Grid":11,"../../Stone":17,"../../main":70}],57:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":56,"util":6}],58:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":56,"util":6}],59:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":56,"util":6}],60:[function(require,module,exports){
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

},{"../../Grid":11,"../../main":70,"./Heuristic":56,"util":6}],61:[function(require,module,exports){
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

},{"../../main":70,"./Heuristic":56,"util":6}],62:[function(require,module,exports){
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

},{"../../main":70,"./Heuristic":56,"util":6}],63:[function(require,module,exports){
//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Group = require('../../../Group');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('../Shaper');

var BOAN_VERSION = 'frankie';

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
    var s = vtype2str(this.vtype) + ' ' + this.code + '-' + Grid.colorToChar(this.code) + ' (' + Grid.xy2move(this.i, this.j) + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.colorName(color) + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    main.log.debug(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        main.log.debug('    Color ' + color + ' (' + Grid.colorToChar(color) + '): ' +
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
    this.version = BOAN_VERSION;
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
    this.version = BOAN_VERSION;
    this.goban = null;
    this.allVoids = [];
    this.scores = [0, 0];
    this.prisoners = [0, 0];
}
module.exports = BoardAnalyser;


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = Group.countPrisoners(goban);

    if (!this._initAnalysis(goban)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(this.filler.grid.toText(function (c) { return Grid.colorToChar(c); }));
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
    main.log.debug(this.filler.grid.toText(function (c) {
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
    if (!g._info || g._info.version !== BOAN_VERSION) {
        g._info = new GroupInfo(g);
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

},{"../../../Grid":11,"../../../Group":12,"../../../main":70,"../Shaper":61,"./ZoneFiller":66}],64:[function(require,module,exports){
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

},{"../../../Grid":11,"../../../main":70}],65:[function(require,module,exports){
//Translated from potential_territory.rb using babyruby2js
'use strict';

var Grid = require('../../../Grid');
var main = require('../../../main');
var Stone = require('../../../Stone');
var BoardAnalyser = require('./BoardAnalyser');

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

},{"../../../Grid":11,"../../../Stone":17,"../../../main":70,"./BoardAnalyser":63}],66:[function(require,module,exports){
//Translated from zone_filler.rb using babyruby2js
'use strict';

var main = require('../../../main');


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

},{"../../../main":70}],67:[function(require,module,exports){
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
function Frankie(goban, color, genes) {
    if (genes === undefined) genes = null;
    this.version = 'Frankie-1.0';
    this.goban = goban;
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.boan = new BoardAnalyser();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize);
    this.scoreGrid = new Grid(this.gsize);

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

Frankie.BoardAnalyser = BoardAnalyser;
Frankie.PotentialTerritory = PotentialTerritory;
Frankie.ZoneFiller = ZoneFiller;


Frankie.prototype.getHeuristic = function (heuristicName) {
    for (var n = this.heuristics.length - 1; n >= 0; n--) {
        var h = this.heuristics[n];
        if (h.constructor.name === heuristicName) return h;
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
    return this.genes.get(this.constructor.name + '-' + name, defVal, lowLimit, highLimit);
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
        if (s) survey[h.constructor.name] = s;
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

},{"../../Genes":9,"../../Grid":11,"../../main":70,"./AllHeuristics":54,"./boan/BoardAnalyser":63,"./boan/InfluenceMap":64,"./boan/PotentialTerritory":65,"./boan/ZoneFiller":66}],68:[function(require,module,exports){
'use strict';

// First we define "main" on which global things attach
var main = require('./main');

// Get App name and version
var pkg = require('../package.json');
main.appName = pkg.name;
main.appVersion = pkg.version;

// Constants attached to main and extensions of common classes
require('./constants');
require('./rb');

// Require scripts we want in main build
require('./test/TestAll'); // one day this will only be in the testing build

// Known AIs and default one
main.ais = {
    Frankie: require('./ai/frankie'),
    Droopy: require('./ai/droopy'),
    Chuckie: require('./ai/chuckie')
};
main.defaultAi = main.latestAi = main.ais.Chuckie;

if (typeof window !== 'undefined') {
    // In a browser: create the UI
    require('./ui/style.less');
    var Ui = require('./ui/Ui');
    var TestUi = require('./ui/TestUi');
    var ui = main.ui = window.testApp ? new TestUi() : new Ui();
    ui.createUi();

    window.main = main; // just for helping console debugging
}


},{"../package.json":102,"./ai/chuckie":35,"./ai/droopy":53,"./ai/frankie":67,"./constants":69,"./main":70,"./rb":74,"./test/TestAll":76,"./ui/TestUi":95,"./ui/Ui":96,"./ui/style.less":97}],69:[function(require,module,exports){
//Translated from stone_constants.rb using babyruby2js
'use strict';

var main = require('./main');
// Special stone values in goban
main.BORDER = null;
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

},{"./main":70}],70:[function(require,module,exports){
'use strict';

/** Singleton "main" before everything else */
var main = module.exports = {};

var Logger = require('./Logger');
var TestSeries = require('./test/TestSeries');
var TestCase = require('./test/TestCase');

main.debug = false;
main.TestCase = TestCase; // could be refactored - each test can require TestCase now
main.tests = new TestSeries();
main.log = new Logger();


//--- Misc Helpers

/** main.isA(Vehicule, myCar) -> TRUE
 *  main.isA(Car, myCar) -> true
 *  klass can be a string for Ruby types that have no exact equivalent in JS
 */
main.isA = function (klass, obj) {
    if (typeof klass === 'string') {
        if (klass === 'integer') return (typeof obj === 'number' || obj instanceof Number) && ~~obj === obj;
        if (klass === 'float') return (typeof obj === 'number' || obj instanceof Number);
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

},{"./Logger":14,"./test/TestCase":79,"./test/TestSeries":85}],71:[function(require,module,exports){
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
    return this.success(cmds + '\n');
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

},{"events":2,"fs":1,"util":6}],72:[function(require,module,exports){
'use strict';
/* eslint no-console: 0 */

var main = require('../main');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var Gtp = require('./Gtp');
var ScoreAnalyser = require('../ScoreAnalyser');

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;
var DEAD_COLOR = Grid.DEAD_COLOR;
var DEAD = Gtp.DEAD, ALIVE = Gtp.ALIVE;

var GAME_NOT_STARTED = '00';


/** @class
 * Interface between the game engine (GameLogic, etc.) and Gtp.
 */
function GtpEngine(game, scorer) {
    this.game = game || new GameLogic();
    this.scorer = scorer || new ScoreAnalyser();
    this.players = [];
    this.scoreComputedAt = null;
}
module.exports = GtpEngine;


GtpEngine.prototype.quit = function () {
    console.error('GTP quit command received'); // cannot be on stdout
};

GtpEngine.prototype.send = function (msg) {
    console.log(msg); // stdout is default
};

GtpEngine.prototype.refreshDisplay = function () {
};

GtpEngine.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    player = this.players[color] = new main.defaultAi(this.game.goban, color);
    return player;
};

GtpEngine.prototype.name = function () {
    return main.appName;
};

GtpEngine.prototype.version = function () {
    return main.appVersion;
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
    var game = this.game;
    this.scoreComputedAt = game.goban.getPositionSignature();
    return this.scorer.computeScoreDiff(game.goban, game.komi);
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
    // make sure both AI exist
    this.getAiPlayer(BLACK);
    this.getAiPlayer(WHITE);
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

},{"../GameLogic":8,"../Grid":11,"../ScoreAnalyser":15,"../main":70,"./Gtp":71}],73:[function(require,module,exports){
'use strict';

//var main = require('../main');
var GtpEngine = require('./GtpEngine');
var inherits = require('util').inherits;


/** @class
 * GTP Engine interface for UI (extends GtpEngine)
 */
function UiGtpEngine(ui) {
    GtpEngine.call(this, ui.game, ui.scorer);
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

},{"./GtpEngine":72,"util":6}],74:[function(require,module,exports){
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

Array.prototype.clear = function () {
    this.length = 0;
};

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

},{}],75:[function(require,module,exports){
//Translated from test_ai.rb using babyruby2js
'use strict';

var main = require('../main');

var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var inherits = require('util').inherits;

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestAi(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestAi, main.TestCase);
module.exports = main.tests.add(TestAi);

TestAi.prototype.initBoard = function (size, handicap) {
    this.game = new GameLogic();
    this.game.newGame(size, handicap || 0);
    this.goban = this.game.goban;
    this.players = [
        new main.defaultAi(this.goban, BLACK),
        new main.defaultAi(this.goban, WHITE)
    ];
};

TestAi.prototype.logErrorContext = function (player, move) {
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
    this.showInUi(msg);
    main.log.warn('Discrepancy in ' + this.name + ': ' + msg);
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

TestAi.prototype._moveOrValue = function (mv) {
    if (mv[0] > '9') {
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
    main.log.warn(msg);
    this.showInUi(msg);
};

/** Lets AI play and verify we got the right move.
 *  We abort the test if the wrong move is played
 * (since we cannot do anything right after this happens).
 */
TestAi.prototype.playAndCheck = function (expMove, expEval) {
    if (main.debug) main.log.debug('Letting AI play. Expected move is: ' + expMove);
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
        this.showInUi('expected ' + expMove + ' but got ' + move);
        this.assertEqual(expMove, move); // test aborts here
    }
    if (expEval) this.checkScore(player, color, move, score, expEval);
    else this.check(true); // just counts the check

    this.game.playOneMove(move);
};

TestAi.prototype.checkMovesAreEquivalent = function (moves) {
    var score0 = this.checkEval(moves[0]).toFixed(2);
    for (var m = 1; m < moves.length; m++) {
        var score = this.checkEval(moves[m]).toFixed(2);
        if (this.check(score0 === score)) continue;

        var color = this.game.curColor;
        this.showInUi(Grid.colorName(color) + '-' + moves + ' should be equivalent but ' +
            moves[m] + ' got ' + score + ' instead of ' + score0);
        return false; // stop after 1
    }
    return true;
};

// Verify the move played is one of the equivalent moves given.
// This can only be the last check of a series (since we are not sure which move was played)
TestAi.prototype.playAndCheckEquivalentMoves = function (moves) {
    if (!this.checkMovesAreEquivalent(moves)) return;

    var color = this.game.curColor;
    var player = this.players[color];
    var move = player.getMove();
    if (this.check(moves.indexOf(move) >= 0)) return; // one of the given moves was played => GOOD

    var score = player.bestScore.toFixed(3);
    this.showInUi(Grid.colorName(color) + '-' + move + ' got ' + score +
        ' so it was played instead of one of ' + moves);
};

TestAi.prototype.checkMoveIsBad = function (move) {
    var score = this.checkEval(move);
    if (this.check(score <= 0.1)) return;

    var color = this.game.curColor;
    this.showInUi(Grid.colorName(color) + '-' + move + ' should be a bad move but got ' + score);
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
        if (check[0] === '!') {
            this.checkMoveIsBad(check.substring(1));
        } else if (check[0] === '#') {
            this.game.playOneMove(check.substring(1));
        } else if (check.indexOf('>') >= 0) {
            moves = parseBinaryOp('>', check);
            this.checkMoveIsBetter(moves[0], moves[1]);
        } else if (check.indexOf('<') >= 0) {
            moves = parseBinaryOp('<', check);
            this.checkMoveIsBetter(moves[1], moves[0]);
        } else if (check.indexOf('~=') >= 0) {
            c = check.split(/~=|~/);
            this.checkEval(c[0], parseFloat(c[1]), c[2]);
        } else if (check.indexOf('=') >= 0) {
            this.checkMovesAreEquivalent(check.split('='));
        } else if (check.indexOf('|') >= 0) {
            this.playAndCheckEquivalentMoves(check.split('|'));
        } else if (check.indexOf('~') >= 0) {
            c = check.split('~');
            this.playAndCheck(c[0], parseFloat(c[1]));
        } else {
            this.playAndCheck(check);
        }
    }
};

TestAi.prototype.checkGame = function (moves, checks, gsize) {
    this.initBoard(gsize || 5);
    this.game.loadMoves(moves);
    this.runChecks(checks);
};


//--- Tests are below

TestAi.prototype.testAiInternals = function () {
    this.initBoard(5);
    this.assertEqual('c3 (6.40)\n- Spacer: 6.40\n', this.players[BLACK].getMoveSurveyText('c3', true));
};

TestAi.prototype.testEyeMaking = function () {
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

TestAi.prototype.testAiClosesItsTerritory = function () {
    // ++@@+
    // ++@O+
    // ++@O+
    // +@@O+
    // +@OO+
    // e4 might seem to AI like filling up its own space; but it is mandatory here
    this.checkGame('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5', 'e4~1.2'); // e4 will not save W
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
    this.checkGame('c4,b4,d4,b3,a2,b5,b2,c5,c2,c3,d2,d3,b1,e3,d1',
        'e5~=1.3, e4|d5'); //a3 should be better considering NE black is dead
};

TestAi.prototype.testEyeMaking_4inCorner = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1,b4,a4,a5,a3',
        'd5>19,' + // e5 here would work but we don't give it points
        '#pass, !e5, d5>17, d5, c5, e5'); //
};

TestAi.prototype.testEyeMaking_4inTshape = function () {
    this.todo('Improve potential eye detection algo'); // ...using 2 grids
    this.checkGame('a2,a4,b3,b4,a3,c4,c3,d4,c2,d3,d2,e3,d1,e2,e1', 'b1>9, #pass, b1>9');
};

TestAi.prototype.testEyeMaking_5 = function () {
    this.todo('Handle single-eye of size 5 & 6'); // see in Shaper
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,e4,c5,b2,a2,pass,a1,b1',
        'e2~=0'); //TODO e2 > 21
};

TestAi.prototype.testNoPushFromDeadGroup = function () {
    // white group is dead so pusher should not speak up here
    this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,pass', 'pass');
};

TestAi.prototype.testWrongSaviorAlongBorder = function () {
    this.checkGame('e1,e2,d2', 'c3');
};

TestAi.prototype.testWrongSaviorInCorner = function () {
    this.checkGame('e1,e2,d2,e3,d3,e4,d4', 'b3'); // d1 would be wrong
};

TestAi.prototype.testWrongSaviorInsteadOfKill = function () {
    this.checkGame('e1,d1,d2,c2,c1,b1,d1', 'd3');
};

TestAi.prototype.testWrongSaviorGoingTowardWall = function () {
    this.checkGame('b2,b3,c2,c3,pass,d2,pass,a2', 'd1'); // b1 would be wrong
};

TestAi.prototype.testBorderLock = function () {
    this.checkGame('d4,c3,c4,d3,e3,e2,e4', 'd2'); //FIXME: should be c2
};

TestAi.prototype.testCornerKill = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++@+++
    //   abcdefghj
    this.checkGame('j8,j9,d7,c5,f4,pass,g6,pass', '!h9, !h8, c3', 9);
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
    this.checkGame('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1',
        'd7~=8, d7=f7, g2',
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
        'h6=h7, h6~=12.3,' + // h7 is OK too but capturing same 2 stones in a ladder
        '#h6, #h7, g7', // force black in h6 - choice between h6 and h7 may vary due to smaller differences
        9);
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
    this.checkGame('d4,d6,f5,g7,g5,g3,e5,d2,c3,c5,c2,d3,c4,f4,d5,e7,e6,c6,f6,f7,h6,e4,g4,h4,h5,h3',
        'e3<1, #e3, e2, f3, f2', // TODO 'e3>10, pass, e3>10',
        9);
    this.todo('Hunter must see double threat');
};

TestAi.prototype.testLadder = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghj
    this.checkGame('j9,j7,j8,j6,j5,a9,j4,pass', 'h7', 9);
    // we force white to run the ladder to verify black tracks to kill
    this.runChecks('!h6, #h6, h8~=0.6, g6~14');
    this.runChecks('!h5, #h5, h4~=14~Hunter, h4~25'); // h4 big because black j4-j5 is now threatened
    this.runChecks('#g5, h8~=0.6, g7~=8.6, f5~18');
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
    this.checkGame('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5',
        'b6~=0.5, c6~=14.3, d6', 9);
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
    this.checkGame('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8',
        'c6<1, b6<1, g4~=8, g4=g6, g6=f3, d6', 9); // g4 takes 8 from Spacer
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
    this.checkGame('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9',
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
    // Issue: after W:a3 we expect B:b5 or b6 but AI does not see attack in b5; 
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3',
        'g5~=0.85~Pusher,' + // no kill for black in g5 but terr gain
        '!b6,' + // FIXME b6 should be close to b5 score: black can save a5 in b6
        'b5~8.7',
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
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass',
        'b5~8.7', 7);
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
    // AI should see attack in b5 with territory invasion.
    // Actually O in g4 is chosen because pusher gives it 0.33 pts.
    // NB: g4 is actually a valid move for black
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6',
        'b5~8.7', 7);
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
        'g4', 7); // FIXME should be g5 here
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
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass',
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
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5',
        'e3~=6, g4~9.5, g6~2, !c7', 7);
};

TestAi.prototype.testKillingSavesToo = function () {
    this.todo('Count saved stones in one move once'); // on this test 3 heuristics count same saved stones
    this.checkGame('e5,c6,d3,g4,g3,f7,c4,e4,e3,d5,f3,f4,c5,e6,g5,f5,h4,b5,g6,b4,b3,g7,h7,h8,h6,j7,d4,j6,f6,e5,h5,h3,h2,j3,j2,j5,j4,h3',
        'j3', 9); // should be j8
};

TestAi.prototype.testAiSeesSnapbackAttack = function () {
    // 5 O@+O+
    // 4 O@*@@  <-- here
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4', 'c4, #c5, c4');
};

TestAi.prototype.testSnapbackFails = function () {
    // 7 O@+OO++
    // 6 O@+@@++
    // 5 OO@@+++
    // 4 *@@++++  <-- here a4 kills so snapback is irrelevant
    // 3 ++++O++
    //   abcdefg
    // Snapback c6 is bad idea since black-a4 can kill white group
    this.checkGame('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6',
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
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5',
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
    this.checkGame('d4,c5,d6,c7,c4,c6,b3,b4,c3,b5,a3',
        '!e7, e5~=0.5, e3~=1.3, d5>a4, d5>6, #pass,' + // forces W-pass
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
    this.checkGame('e5,g3,c3,e3,g6,d4,d5,c5,c4,d6,e6,c6,d2,e4,d3',
        'f5<1,' + // f5 connection with e4 is not great
        'e2~=2.4, g5~=1.3', // FIXME: e2 & g5 should be bigger (invasion blocker's job)
        9);
};

TestAi.prototype.testPusherInC = function () {
    // White has no interest pushing into "C" shape (beside taking 1 life but it can wait)
    this.checkGame('b1,c1,a1,c2,a2,c3,a3,c4,b3', 'b2<0.5, b4~1');
};

TestAi.prototype.testConnectOnBorder = function () {
    this.checkGame('b4,b3,c4,c3,d4,d3,e4,e3,b2,c2,b1,d1', 'a3>6, a3');
};

TestAi.prototype.testConnectOnBorderFails = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1', '!a4');
};

TestAi.prototype.testConnectOnBorderAndEyeMaking = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,e2,d3,d1',
        'a4~=6~Savior, a4'); // TODO e3 is "nice" but b4 is white's only way out
};

TestAi.prototype.testConnectOnBorderSaves = function () {
    this.checkGame('d6,f6,d4,g3,f4,e5,g5,e4,e7,f3,g4,e3,c3,b6,g7,g6,f7,h6,d5,d3,c7,c6,e6,f5,h4,h5,h3,j4,h2,g2,d2,e2,c5,c2,b2,d1,h7,b7,j6,j3,b8,j5,j7,h1,a7,b5,a6,b4,b3,b1,c4,c8,d7,d8,a5,b9,a4,e8,f8,b6,b7,h8,c6,j8,e9,g8,d9,a1,a2',
        'c1~4', 9);
};

TestAi.prototype.testBigConnectScore = function () {
    // ideal score is 48 actually because c3 kills or save everyone
    this.checkGame('a4,b2,b4,b3,b5,a3,c4,d4,c2,d3,d2,b1,c1,e3,e2,d5', 'c3>19, c3');
};

TestAi.prototype.testConnect = function () {
    this.checkGame('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,g3,f6,f3,e6,e3,d6,d4,d7,b5,f7,d5,c6,a5,c3,a4,c4',
        'c5>7, #pass, c5>7', 7);
    // see comments at top of file:
    this.todo('Better evaluation of connection for brothers + critical stone');
};

TestAi.prototype.testUselessConnect = function () {
    this.checkGame('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,f3,f6,f4,e6,g4,d6,b5,d7,b4,f7,a4,d3,e4,d5,c4',
        'd4<1', // TODO one day: d4, pass, pass - see that all the space between live groups is waste
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
    this.checkGame('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        'd9<b8,' + // d9 is interesting but W has then c7 or d6 to make 2nd eye
        // NB: black b2 is good too but black is in no hurry; testSemi1 covers this.
        'b8~1.7,' + // huge threat but only if white does not answer it
        'c7~22,' + // If not c7 huge damage, see below
        'a6, h1, g2, c9, h2, a9', //FIXME h2 is not needed
        9);
};

TestAi.prototype.testAnotherKillAfterKo = function () {
    // Same game as above but white did not defend -> attack
    this.checkGame('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        '#b8, #c9,' + // right in enemy territory
        'c7~20, #d8,' + // black goes for the kill in c7; too late for white now
        'e9~26', // should be 'd6~20, e9~26', // it seems that real score difference for e9 is 26 indeed :)
        9);
    this.todo('One-eye group can survive if e9 + Ko battle');
};

TestAi.prototype.testBattledVoidNotSplit = function () {
    // We may see a 3 vertex eye for Black in SW corner, but white stone is next to it
    // so White should not jump on a1
    this.checkGame('d4,d2,c3,d6,e5,c5,e3,c4,d5,b3,c2,c1,b2,b4,a3',
        '!a1, a4~=1.5, e2=e6, e2~=2.9',
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
        'b1<1, b4, d4, c5, d5=d1, #d5, b5, d1, b1, pass, pass');
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
    this.checkGame('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,d2,c1,d3,a1',
        'a2>60, a2=b2, #pass, b5>41, b5=c5', 9); // a2|b2 also saves our group so big impact
};

TestAi.prototype.testKillRace2 = function () {
    // same as above but W's eye is actually shared by 2 brothers
    this.checkGame('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,c1,a1,d3,d2',
        'a2>53, a2=b2, #pass, b5>41, b5=c5', 9);
};

},{"../GameLogic":8,"../Grid":11,"../main":70,"util":6}],76:[function(require,module,exports){
'use strict';

require('./TestAi');
require('./TestBoardAnalyser');
require('./TestBreeder');
require('./TestGameLogic');
require('./TestGoban');
require('./TestGroup');
require('./TestPotentialTerritory');
require('./TestScoreAnalyser');
require('./TestSgfReader');
require('./TestSpeed');
require('./TestStone');
require('./TestZoneFiller');

},{"./TestAi":75,"./TestBoardAnalyser":77,"./TestBreeder":78,"./TestGameLogic":80,"./TestGoban":81,"./TestGroup":82,"./TestPotentialTerritory":83,"./TestScoreAnalyser":84,"./TestSgfReader":86,"./TestSpeed":87,"./TestStone":88,"./TestZoneFiller":89}],77:[function(require,module,exports){
//Translated from test_board_analyser.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Group = require('../Group');
var GameLogic = require('../GameLogic');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class Set main.debug to true for details
 */
function TestBoardAnalyser(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestBoardAnalyser, main.TestCase);
module.exports = main.tests.add(TestBoardAnalyser);


TestBoardAnalyser.prototype.initBoard = function (gsize, handicap) {
    this.game = new GameLogic();
    this.game.newGame(gsize || 5, handicap || 0);
    this.goban = this.game.goban;
};

TestBoardAnalyser.prototype.checkGame = function (moves, expScore, gsize, finalPos) {
    this.initBoard(gsize || 5);
    if ('+O@'.indexOf(moves[0]) !== -1) {
        this.goban.loadImage(moves); // an image, not the list of moves
    } else {
        this.game.loadMoves(moves);
    }
    if (finalPos) this.assertEqual(finalPos, this.goban.image());
    this.boan = new main.defaultAi.BoardAnalyser();
    this.boan.countScore(this.goban);

    var score = this.boan.getScoringGrid().image();
    if (score === expScore) return;
    this.showInUi('Expected scoring grid was:<br>' + expScore + ' but we got:<br>' + score);
    this.assertEqual(expScore, score);
};

TestBoardAnalyser.prototype.checkScore = function (prisoners, dead, score) {
    this.assertEqual(prisoners, Group.countPrisoners(this.goban), 'already prisoners');
    
    var futurePrisoners = this.boan.prisoners;
    this.assertEqual(dead[BLACK], futurePrisoners[BLACK] - prisoners[BLACK], 'BLACK dead');
    this.assertEqual(dead[WHITE], futurePrisoners[WHITE] - prisoners[WHITE], 'WHITE dead');

    this.assertEqual(score, this.boan.scores);
};

//---


// Coverage & base methods
TestBoardAnalyser.prototype.testInternals = function () {
    this.initBoard(5);
    // same game as testDoomedGivesEye2 below
    this.game.loadMoves('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1');
    var grid = this.goban.scoringGrid.initFromGoban(this.goban);
    var ba = this.boan = new main.defaultAi.BoardAnalyser();
    ba.analyse(this.goban, grid, WHITE);

    // Voids
    var v = ba.allVoids[0];
    var gi = ba.allGroups[1];
    this.assertEqual(true, v.isTouching(gi));
    this.assertEqual(false, v.isTouching(ba.allGroups[2]));
    this.assertEqual('eye-a1, vcount:1, black:#1, white:-', v.toString());
    this.assertEqual('void-e1, vcount:11, black:#1, white:#2', ba.allVoids[2].toString());

    //Coverage
    this.assertEqual(true, ba.debugDump().length > 100);
};

TestBoardAnalyser.prototype.testWeirdEmptyBoard = function () {
    // Just makes sure the analyser does not crash on empty boards.
    // Note that scoring these boards makes little sense so the 
    // result scoring grid is not really important.
    this.checkGame('', '+++++,+++++,+++++,+++++,+++++');
    this.checkGame('c3', '-----,-----,--@--,-----,-----');
    this.checkGame('c3,d5', '---#-,-----,--@--,-----,-----'); // or ???#?,?????,??&??,?????,?????
    this.checkGame('c3,d4', '?????,???#?,??&??,?????,?????');
};

TestBoardAnalyser.prototype.testDoomedGivesEye1 = function () {
    // White group is doomed; verify its eye is counted right
    this.checkGame('a2,b4,b2,c4,c2,d4,d2,e4,e2,b5,a3,c5,a4',
        '-##--,@####,@----,@@@@@,-----');
};

TestBoardAnalyser.prototype.testDoomedGivesEye2 = function () {
    // Same as above test but white's dead group does not "touch" black.
    // This triggers a special case in analyser (white is dead without "killer")
    this.checkGame('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1',
        '-##--,' +
        '###--,' +
        '-----,' +
        '@@@@-,' +
        '-@-@-');
};

TestBoardAnalyser.prototype.testDoomedGivesEye3 = function () {
    this.todo('Handle seki'); // add a test in which both should stay alive
    // Both groups have a single eye but B has 2 more lives so he would win the race
    this.checkGame('a2,a4,b2,b4,c2,b5,c3,pass,d3,pass,d4,pass,d5,pass,a1,pass,b1,pass,c1,pass,e3,pass,e4,pass,e5',
        '-#-@@,##-@@,--@@@,@@@--,@@@--');
};

TestBoardAnalyser.prototype.testTwoSingleEyeConnectedByEye = function () {
    // Black SW and center groups survive depending on each other; c4 is a real eye
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,d1,e1,c1,g1',
        ':::::::,' +
        'OOOOOO:,' +
        'O@@@@@O,' +
        'O@-@-@O,' +
        'OO@O@@O,' +
        '@@@OOO:,' +
        '-@@@O:O', 7);
    // and a variation that triggered a bug:
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,pass,g2',
        ':::::::,OOOOOO:,O@@@@@O,O@-@-@O,OO@O@@O,@@@OOOO,-@?????', 7);
};

TestBoardAnalyser.prototype.testUnconnectedBrothers = function () {
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass,g4,g3,g5',
        '-------,---@@@@,@@-@OO@,O?@@O@@,OOOO?OO,::O&O::,:::::::', 7);
};

TestBoardAnalyser.prototype.testClearWinWithUnplayedMoves = function () {
    // Black wins clearly because he can make 2 eyes while white cannot.
    this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1',
        '---@@,-@@@#,-@###,-@@#-,-###-');
};

TestBoardAnalyser.prototype.testSeeTwoGroupsSharingSingleEyeAreDead = function () {
    // 5 O&:&&
    // 4 O&:&&
    // 3 OO&&&
    // 2 :OOOO
    // 1 :::::
    //   abcde
    this.checkGame('b5,a5,b4,a4,d5,a3,d4,b3,c3,b2,d3,c2,e5,d2,e4,e2,e3',
        'O&:&&,O&:&&,OO&&&,:OOOO,:::::');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_1 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 ####@
    // 1 -@-#@
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e2,d1,e1,pass,e3,pass,b1',
        '-----,-----,@@@@@,####@,-@-#@');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_2 = function () {
    // White group is dead - having a dead kamikaze + an empty spot in NE corner should not change that
    this.checkGame('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5,e4,e2,pass,c5',
        '--@@-,' +
        '--@##,' +
        '--@#-,' +
        '-@@#@,' +
        '-@##-');
};

TestBoardAnalyser.prototype.testNoTwoEyesDeadEnemy = function () {
    // Black group is dead - having a dead kamikaze should not change that
    this.checkGame('c3,c4,b4,d4,c5,d3,d2,c2,b3,e2,b2,d1,d5,b1,e5,e4,b5,a1,a2,a4,c1,d2,a5,b1',
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
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,b1',
        '-----,-----,@@@@@,OOOOO,:&:::');
};

TestBoardAnalyser.prototype.testNoTwoEyes4_2 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 #####
    // 1 -@@-#
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,c1,pass,b1,e1',
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
    this.checkGame('a4,a3,b4,b3,c4,c3,d4,d3,e4,e3,e5,c5,pass,b5',
        ':OO:&,&&&&&,OOOOO,:::::,:::::');
};

// All white groups are soon dead but not yet; black should win easily
TestBoardAnalyser.prototype.testRaceForLife = function () {
    this.checkGame('a3,a4,b3,b4,c4,c5,d4,pass,e4,pass,c3,a2,b2,c2,b1,c1,d2,d1,e2,pass,d3,pass,e3',
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
    this.checkGame('a2,a3,b2,b4,b3,a4,c3,c4,d2,d3,c1,e2,pass,d1,pass,e1,pass,e3,pass,d4',
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
    this.checkGame('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5',
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
    this.checkGame('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9',
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

//TODO see countEyesFromDeadEnemy for test below to work well
// TestBoardAnalyser.prototype.testSmallGame3 = function () {
//     this.checkGame('f4,f6,d6,c3,d4,e5,g5,e4,e7,d3,g7,d5,c4,b4,g6,c5,f7,b6,c7,f3,e6,f5,g4,g2,g3,h3,c6,h4,b7,h5,a6,h6,b5,h7,h8,j8,a4,g8,b3,b2,c4,f8,a2,c2,e8,h9,f9,b1,e2,e3,f2,h2,d2,f1,d1,c1,pass,g9,e9,d8,d9,c8,b8,pass,c9,pass,d7',
//         '--@@@@OO:,' +
//         '-@--@OO:O,' +
//         '-@@@@@@O:,' +
//         '@-@@@O@O:,' +
//         '-@OOOO@O:,' +
//         '@-@-O@@O:,' +
//         '-@OOOO@O:,' +
//         '@OO&&&OO:,' +
//         '-OO&:O:::',
//         9);
// };

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

},{"../GameLogic":8,"../Group":12,"../main":70,"util":6}],78:[function(require,module,exports){
//Translated from test_breeder.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Breeder = require('../Breeder');


/** @class */
function TestBreeder(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestBreeder, main.TestCase);
module.exports = main.tests.add(TestBreeder);


TestBreeder.prototype.testBwBalance = function () {
    var numGames = 100;
    var numLostGamesShowed = 5;
    var expectedWins = 0.60 * numGames; // number going up shows new AI gets stronger compared to default AI
    var tolerance = numGames * 0.15; // + or -; the more games you play the lower tolerance you can set
    var size = 9;

    // For coverage tests no need to run many games
    if (main.isCoverTest) numGames = 1;

    var breeder = new Breeder(size);
    var numWins = breeder.bwBalanceCheck(numGames, size, numLostGamesShowed);

    if (!main.isCoverTest) this.assertInDelta(numWins, expectedWins, tolerance);
};

},{"../Breeder":7,"../main":70,"util":6}],79:[function(require,module,exports){
'use strict';

var main = require('../main');
var TestSeries = require('./TestSeries');


/** @class */
function TestCase(name) {
    this.name = name;
    this.series = null;
}
module.exports = TestCase;


TestCase.prototype.check = function (result) {
    this.series.checkCount++;
    if (result) return true;
    this.series.warningCount++;
    return false;
};

function _fail(msg, comment) {
    comment = comment ? comment + ': ' : '';
    throw new Error(TestSeries.FAILED_ASSERTION_MSG + comment + msg);
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

TestCase.prototype.compareValue = function (expected, val) {
    if (main.isA(Array, expected)) {
        if (!main.isA(Array, val)) return 'Expected Array but got ' + val;
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
    _fail(msg, comment);
};

TestCase.prototype.assertInDelta = function (val, expected, delta, comment) {
    this.series.checkCount++;
    if (Math.abs(val - expected) <= delta) return;
    _fail(val + ' is not in +/-' + delta + ' delta around ' + expected, comment);
};

TestCase.prototype.todo = function (comment) {
    this.series.todoCount++;
    main.log.info('TODO: ' + comment);
};

TestCase.prototype.showInUi = function (msg) {
    if (main.testUi && this.game) {
        main.testUi.showTestGame(this.name, msg, this.game);
    }
};

},{"../main":70,"./TestSeries":85}],80:[function(require,module,exports){
//Translated from test_game_logic.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');


/** @class TODO: very incomplete test
 */
function TestGameLogic(testName) {
    main.TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestGameLogic, main.TestCase);
module.exports = main.tests.add(TestGameLogic);


TestGameLogic.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
};

// 3 ways to load the same game with handicap...
TestGameLogic.prototype.testHandicap = function () {
    var game6 = '(;FF[4]KM[0.5]SZ[19]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq])';
    this.game.loadMoves(game6);
    var img = this.goban.image();
    this.game.newGame(19, 6);
    this.game.loadMoves('f3');
    this.assertEqual(img, this.goban.image());
    // @game.goban.console_display
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual(img, this.goban.image());
};

TestGameLogic.prototype.testMisc = function () {
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual('handicap:6,f3 (1 moves)', this.game.historyString());
    this.assertEqual([0,0], this.game.prisoners());
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

},{"../GameLogic":8,"../main":70,"util":6}],81:[function(require,module,exports){
// NB Stone & Goban can hardly be tested separately
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var Goban = require('../Goban');
var Grid = require('../Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestGoban(testName) {
    main.TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestGoban, main.TestCase);
module.exports = main.tests.add(TestGoban);


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
    this.assertEqual('undefinedundefined', goban.scoringGrid.toString().substr(0, 18));
};

TestGoban.prototype.testSignature = function () {
    var goban = this.goban;
    goban.setRules({ positionalSuperko: true });
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

    goban.setRules({ positionalSuperko: true });

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

},{"../GameLogic":8,"../Goban":10,"../Grid":11,"../main":70,"util":6}],82:[function(require,module,exports){
//Translated from test_group.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestGroup(testName) {
    main.TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestGroup, main.TestCase);
module.exports = main.tests.add(TestGroup);


TestGroup.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.game.switchConsoleMode(true);
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

},{"../GameLogic":8,"../main":70,"util":6}],83:[function(require,module,exports){
'use strict';
/* eslint quotes: 0 */
/* jshint quotmark: false */

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');


/** @class NB: for debugging think of using analyser.debug_dump
 */
function TestPotentialTerritory(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestPotentialTerritory, main.TestCase);
module.exports = main.tests.add(TestPotentialTerritory);


TestPotentialTerritory.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.aiPlayer = new main.defaultAi(this.goban, main.BLACK);
    this.pot = this.aiPlayer.pot;
};

TestPotentialTerritory.prototype.checkBasicGame = function (moves, expected, gsize, finalPos) {
    this.initBoard(gsize || 7);
    this.game.loadMoves(moves);
    if (finalPos) this.assertEqual(finalPos, this.goban.image());

    this.pot.evalBoard();
    var territory = this.pot.image();
    if (territory === expected) return;
    this.showInUi('Expected territory was<br>' + expected + ' but got<br>' + territory);
    this.assertEqual(expected, territory);
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
    this.checkBasicGame('d4,c5,d6,c7,c4,c6,b4',
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
    this.checkBasicGame('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3',
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
    this.checkBasicGame('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5',
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
    this.checkBasicGame('d4,d2,e3,b4,e1,c5,d6,d5,c3,e5,d3,b3,b2,c2,a2,e2,f1,f2,b6,c6,f6,e6,f4,d7,f5,f3',
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
    this.checkBasicGame('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9,c7',
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
    this.checkBasicGame('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9',
        "------?::,------:::,-----::::,-----?:::,-----?:::,----?::::,---::::::,----:::::,----:::::", 9);
};

},{"../GameLogic":8,"../main":70,"util":6}],84:[function(require,module,exports){
//Translated from test_score_analyser.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');


/** @class */
function TestScoreAnalyser(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestScoreAnalyser, main.TestCase);
module.exports = main.tests.add(TestScoreAnalyser);


TestScoreAnalyser.prototype.initGame = function (size) {
    if (size === undefined) size = 5;
    this.game = new GameLogic();
    this.game.newGame(size, 0);
    this.goban = this.game.goban;
    this.sa = new ScoreAnalyser();
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
    this.initGame(7);
    var whoResigned = null;
    var s = this.sa.computeScore(this.goban, 1.5, whoResigned);
    this.assertEqual('white wins by 6.5 points', s.shift());
    this.assertEqual('black: 12 points (12 + 0 prisoners)', s.shift());
    this.assertEqual('white: 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
    // test message when someone resigns
    s = this.sa.computeScore(this.goban, 1.5, main.BLACK);
    this.assertEqual(['white won (since black resigned)'], s);
    s = this.sa.computeScore(this.goban, 1.5, main.WHITE);
    this.assertEqual(['black won (since white resigned)'], s);
};

TestScoreAnalyser.prototype.testComputeScoreDiff = function () {
    this.initGame(7);
    this.assertEqual(-8.5, this.sa.computeScoreDiff(this.goban, 3.5));
};

TestScoreAnalyser.prototype.testStartScoring = function () {
    this.initGame(7);
    var i = this.sa.startScoring(this.goban, 0.5, null);
    this.assertEqual([12, 17.5], i.shift());
    this.assertEqual([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.testScoringGrid = function () {
    this.initGame(7);
    this.sa.startScoring(this.goban, 1.5, null);
    var sgridYx = this.sa.getScoringGrid().yx;
    this.assertEqual(main.EMPTY, this.goban.stoneAt(1, 1).color); // score analyser leaves the goban untouched
    this.assertEqual(Grid.TERRITORY_COLOR + main.WHITE, sgridYx[1][1]); // a1
    this.assertEqual(Grid.TERRITORY_COLOR + main.BLACK, sgridYx[6][2]); // b6
};

TestScoreAnalyser.prototype.testScoreInfoToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    var info = [[10, 12], [[1, 2, 3], [4, 5, 6]]];
    var s = this.sa.scoreInfoToS(info);
    this.assertEqual('white wins by 2 points', s.shift());
    this.assertEqual('black: 10 points (1 + 2 prisoners + 3 komi)', s.shift());
    this.assertEqual('white: 12 points (4 + 5 prisoners + 6 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
};

TestScoreAnalyser.prototype.testScoreDiffToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    this.assertEqual('white wins by 3 points', this.sa.scoreDiffToS(-3));
    this.assertEqual('black wins by 4 points', this.sa.scoreDiffToS(4));
    this.assertEqual('Tie game', this.sa.scoreDiffToS(0));
};

},{"../GameLogic":8,"../Grid":11,"../ScoreAnalyser":15,"../main":70,"util":6}],85:[function(require,module,exports){
'use strict';

var main = require('../main');


/** @class */
function TestSeries() {
    this.testCases = {};
    this.testCount = this.failedCount = this.errorCount = 0;
    this.warningCount = 0;
}
module.exports = TestSeries;

TestSeries.FAILED_ASSERTION_MSG = 'Failed assertion: ';


TestSeries.prototype.add = function (klass) {
    this.testCases[klass.name] = klass;
    return klass;
};

TestSeries.prototype.testOneClass = function (Klass, methodPattern) {
    for (var method in Klass.prototype) {
        if (typeof Klass.prototype[method] !== 'function') continue;
        if (method.substr(0,4) !== 'test') continue;
        if (methodPattern && method.indexOf(methodPattern) === -1) continue;
        this.testCount++;
        var test = new Klass(Klass.name + '#' + method);
        test.series = this;
        try {
            test[method].call(test);
        } catch(e) {
            if (e.message.startWith(TestSeries.FAILED_ASSERTION_MSG)) {
                this.failedCount++;
                e.message = e.message.substr(TestSeries.FAILED_ASSERTION_MSG.length);
                main.log.error('Test failed: ' + test.name + ': ' + e.message + '\n');
            } else {
                this.errorCount++;
                main.log.error('Exception during test: ' + test.name + ':\n' + e.stack + '\n');
            }
        }
    }
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
    this.failedCount = this.errorCount = this.warningCount = this.todoCount = 0;
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
    var numIssues = this.errorCount + this.failedCount + this.warningCount;
    var classes = specificClass ? 'class ' + specificClass : classCount + ' classes';

    var report = 'Completed tests. (' + classes + ', ' + this.testCount + ' tests, ' +
        this.checkCount + ' checks in ' + duration + 's)\n\n';
    if (numIssues === 0) {
        if (this.testCount || this.checkCount) report += 'SUCCESS!';
        else report += '*** 0 TESTS DONE ***  Check your filter?';
        // Less important test data
        if (this.todoCount) report += '  (Todos: ' + this.todoCount + ')';
        if (this.count) report += '\n(generic count: ' + this.count + ')';
        main.log.info(report);
    } else {
        report += '*** ISSUES: exceptions: ' + this.errorCount +
            ', failed: ' + this.failedCount +
            ', warnings: ' + this.warningCount + ' ***';
        main.log.error(report);
    }
    return numIssues;
};

},{"../main":70}],86:[function(require,module,exports){
//Translated from test_sgf_reader.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var SgfReader = require('../SgfReader');


/** @class */
function TestSgfReader(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestSgfReader, main.TestCase);
module.exports = main.tests.add(TestSgfReader);


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

},{"../SgfReader":16,"../main":70,"util":6}],87:[function(require,module,exports){
//Translated from test_speed.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var Goban = require('../Goban');
var TimeKeeper = require('./TimeKeeper');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestSpeed(testName) {
    main.TestCase.call(this, testName);
    main.debug = false; // if true it takes forever...
    this.initBoard();
}
inherits(TestSpeed, main.TestCase);
module.exports = main.tests.add(TestSpeed);

TestSpeed.CM_UNDO = 0;
TestSpeed.CM_CLEAR = 1;
TestSpeed.CM_NEW = 2;


TestSpeed.prototype.initBoard = function (size) {
    if (size === undefined) size = 9;
    this.goban = new Goban(size);
    this.goban.setRules({ positionalSuperko: false });
};

TestSpeed.prototype.testSpeed1 = function () {
    var t = new TimeKeeper();
    // Basic test
    var count = main.isCoverTest ? 1 : 10000;
    t.start('Basic (no move validation) ' + 10 * count + ' stones and undo', 0.06);
    for (var i = count; i >=0; i--) {
        this.play10Stones();
    }
    t.stop();
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
    count = main.isCoverTest ? 1 : 2000;
    t.start('35 move game, ' + count + ' times and undo', 0.05);
    for (i = 0; i < count; i++) {
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

TestSpeed.prototype.testSpeed2 = function () {
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

},{"../Goban":10,"../Grid":11,"../main":70,"./TimeKeeper":90,"util":6}],88:[function(require,module,exports){
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Goban = require('../Goban');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestStone(testName) {
    main.TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestStone, main.TestCase);
module.exports = main.tests.add(TestStone);


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

},{"../Goban":10,"../main":70,"util":6}],89:[function(require,module,exports){
//Translated from test_zone_filler.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');

var CODE_X = 123; // we use this color for replacements - should be rendered as "X"


/** @class NB: for debugging think of using analyser.debug_dump
 *  TODO: add tests for group detection while filling
 */
function TestZoneFiller(testName) {
    main.TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestZoneFiller, main.TestCase);
module.exports = main.tests.add(TestZoneFiller);


TestZoneFiller.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.grid = new Grid(size);
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
    this.filler.fillWithColor(3, 1, main.EMPTY, CODE_X);
    this.assertEqual('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
    this.grid.loadImage('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fillWithColor(1, 3, main.EMPTY, CODE_X);
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
    this.filler.fillWithColor(3, 3, main.EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(1, 1, main.EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(5, 3, main.EMPTY, CODE_X);
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
    this.filler.fillWithColor(2, 4, main.EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(2, 2, main.EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(3, 1, main.EMPTY, CODE_X);
    this.assertEqual('+++O+,+++OO,+O+++,++OO+,+OXO+', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(5, 5, main.EMPTY, CODE_X);
    this.assertEqual('+++OX,+++OO,+O+++,++OO+,+O+O+', this.grid.image());
};

},{"../GameLogic":8,"../Grid":11,"../main":70,"util":6}],90:[function(require,module,exports){
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

    var msg = 'Duration over limit: ' + this.duration.toFixed(2) +
        ' instead of ' + this.expectedTime.toFixed(2);
    this.log.warn(this.taskName + ': ' + msg);

    if (!lenientIfSlow && !main.isCiTest && diff > DELAY_THRESHOLD) {
        main.tests.warningCount++;
    }
    return msg;
};

},{"../main":70}],91:[function(require,module,exports){
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

var valueFormatMinDec, valueFormatMaxDec;

// Usually for debug/test
Board.prototype.setValueFormat = function (minDecimals, maxDecimals) {
    valueFormatMinDec = minDecimals;
    valueFormatMaxDec = maxDecimals;
};

function valueDisplay(cell) {
    if (cell === null) return null;

    var minDec = 0, maxDec = 2;
    if (valueFormatMinDec !== undefined) minDec = valueFormatMinDec;
    if (valueFormatMaxDec !== undefined) maxDec = valueFormatMaxDec;

    var val = cell.toFixed(maxDec);
    for (var i = minDec; i < maxDec; i++) val = val.chomp('0');
    val = val.chomp('.');
    if (val === '0') return null;
    if (val.substr(0, 2) === '0.') val = val.slice(1);

    return { type: 'LB', text: val };
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

},{"../Grid":11,"../main":70,"./touchManager.js":98}],92:[function(require,module,exports){
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
Dome.prototype.setEnabled = function (enable) { this.elt.disabled = !enable; return this; };
Dome.prototype.setStyle = function (prop, value) { this.elt.style[prop] = value; return this; };

Dome.prototype.setVisible = function (show) {
    if (this.type === 'div') return this.setStyle('display', show ? '' : 'none');
    this.elt.hidden = !show;
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

},{}],93:[function(require,module,exports){
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

    var moves = Dome.newInput(form, 'moves', 'Moves to load:');

    var defAiDiv = form.newDiv();
    Dome.newLabel(defAiDiv, 'inputLbl', 'Black AI:');
    var defaultAi = Dome.newDropdown(defAiDiv, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    Dome.newLabel(defAiDiv, 'defAiInfo', '(White AI always uses latest AI version)');

    var okBtn = Dome.newButton(form.newDiv('btnDiv'), 'start', 'Play', function (ev) {
        ev.preventDefault();
        options.gsize = ~~Dome.getRadioValue(sizeElt);
        options.handicap = ~~handicap.value();
        options.aiPlays = Dome.getRadioValue(aiColor);
        options.moves = moves.value();
        main.defaultAi = main.ais[defaultAi.value()];
        if (validateFn(options)) return Dome.removeChild(document.body, dialog);
    });
    okBtn.setAttribute('type','submit');
}
module.exports = NewGameDlg;

},{"../main":70,"./Dome":92}],94:[function(require,module,exports){
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

},{"./Dome":92}],95:[function(require,module,exports){
'use strict';

var main = require('../main');
var Dome = require('./Dome');
var Logger = require('../Logger');
var Ui = require('./Ui');


function TestUi() {
    main.debug = false;
    main.log.level = Logger.INFO;
    main.testUi = this;
}
module.exports = TestUi;


TestUi.prototype.enableButtons = function (enabled) {
    for (var name in this.ctrl) { this.ctrl[name].disabled = !enabled; }
};

TestUi.prototype.runTest = function (name) {
    main.defaultAi = main.ais[this.defaultAi.value()];
    main.debug = this.debug.isChecked();

    var specificClass = name === 'ALL' ? undefined : name;
    if (name === 'ALL' || name === 'TestSpeed') {
        main.debug = false; // dead slow if debug is ON
    }
    main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    main.log.setLogFunc(this.logfn.bind(this));

    var numIssues = main.tests.run(specificClass, this.namePattern.value());
    if (numIssues) this.logfn(Logger.INFO, '\n*** ' + numIssues + ' ISSUE' + (numIssues !== 1 ? 'S' : '') + ' - See below ***');

    this.output.scrollToBottom();
    this.errors.scrollToBottom();
    this.controls.setEnabled('ALL', true);
};

TestUi.prototype.initTest = function (name) {
    this.output.setHtml('Running "' + name + '"...<br>');
    this.errors.setText('');
    this.gameDiv.clear();
    this.controls.setEnabled('ALL', false);
    var self = this;
    window.setTimeout(function () { self.runTest(name); }, 50);
};

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= Logger.WARN) this.errors.setHtml(this.errors.html() + msg);
    else if (lvl > Logger.DEBUG) this.output.setHtml(this.output.html() + msg);
    return true; // also log in console
};

TestUi.prototype.newButton = function (name, label) {
    var self = this;
    Dome.newButton(this.controlElt, '#' + name, label, function () { self.initTest(name); });
};

TestUi.prototype.createControls = function (parentDiv) {
    this.controls = Dome.newGroup();
    this.controlElt = parentDiv.newDiv('controls');
    this.newButton('ALL', 'Test All');
    this.newButton('TestSpeed', 'Speed');
    this.newButton('TestBreeder', 'Breeder');
    this.newButton('TestBoardAnalyser', 'Scoring');
    this.newButton('TestPotentialTerritory', 'Territory');
    this.newButton('TestAi', 'AI');
};

TestUi.prototype.createUi = function () {
    var title = main.appName + ' - Tests';
    Dome.setPageTitle(title);
    var testDiv = Dome.newDiv(document.body, 'testUi');
    this.gameDiv = Dome.newDiv(document.body, 'gameDiv');
    testDiv.newDiv('pageTitle').setText(title);
    this.createControls(testDiv);

    var defAiDiv = testDiv.newDiv();
    Dome.newLabel(defAiDiv, 'inputLbl', 'Default AI:');
    this.defaultAi = Dome.newDropdown(defAiDiv, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    
    this.namePattern = Dome.newInput(testDiv, 'namePattern', 'Test name pattern:');
    this.debug = Dome.newCheckbox(testDiv, 'debug', 'Debug');
    
    testDiv.newDiv('subTitle').setText('Result');
    this.output = testDiv.newDiv('logBox testOutputBox');
    testDiv.newDiv('subTitle').setText('Errors');
    this.errors = testDiv.newDiv('logBox testErrorBox');
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.inDevMode = true;
    ui.loadFromTest(this.gameDiv, title, msg);
};

},{"../Logger":14,"../main":70,"./Dome":92,"./Ui":96}],96:[function(require,module,exports){
'use strict';

var main = require('../main');

var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var Gtp = require('../net/Gtp');
var Logger = require('../Logger');
var NewGameDlg = require('./NewGameDlg');
var PopupDlg = require('./PopupDlg');
var ScoreAnalyser = require('../ScoreAnalyser');
var UiGtpEngine = require('../net/UiGtpEngine');
var userPref = require('../userPreferences');

var WHITE = main.WHITE, BLACK = main.BLACK;
var sOK = main.sOK;

var viewportWidth = document.documentElement.clientWidth;

var NO_HEURISTIC = '(heuristic)';
var NO_EVAL_TEST = '(other eval)';


function Ui(game) {
    this.gsize = 9;
    this.handicap = 0;
    this.aiPlays = 'white';

    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser();
    this.board = null;

    this.initDev();
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    this.newGameDialog();
};

Ui.prototype.refreshBoard = function () {
    this.board.refresh();
    this.devDisplay();
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    if (this.game.gameEnding) {
        this.proposeScore();
    } else {
        this.message(this.whoPlaysNow());
    }
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    var isCompact = this.isCompactLayout = layout === 'compact';
    var gameDiv = this.gameDiv = Dome.newDiv(parent, 'gameUi');

    if (title) gameDiv.newDiv(isCompact ? 'testTitle' : 'pageTitle').setText(title);
    this.boardElt = gameDiv.newDiv('board');
    if (descr) this.boardDesc = gameDiv.newDiv('boardDesc').setHtml(descr);
    this.createControls(gameDiv);
    this.createDevControls();

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60 + 10, viewportWidth - 15);

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (move[0] === '!') return self.onDevKey(move.substr(1));
        if (self.inEvalMode) return self.evalMove(move);
        self.playerMove(move);
    });
};

Ui.prototype.resetUi = function () {
    if (!this.gameDiv) return;
    Dome.removeChild(document.body, this.gameDiv);
    this.gameDiv = null;
    this.board = null;
};

Ui.prototype.newGameDialog = function () {
    Dome.setPageTitle(main.appName);
    this.resetUi();
    var options = {
        gsize: this.gsize,
        handicap: this.handicap,
        aiPlays: this.aiPlays
    };
    var self = this;
    new NewGameDlg(options, function validate(options) {
        self.gsize = options.gsize;
        self.handicap = options.handicap;
        self.aiPlays = options.aiPlays;
        return self.startGame(options.moves);
    });
};

Ui.prototype.createControls = function (gameDiv) {
    this.controls = Dome.newGroup();
    var mainDiv = gameDiv.newDiv('mainControls');
    var self = this;
    Dome.newButton(mainDiv, '#pass', 'Pass', function () { self.playerMove('pass'); });
    Dome.newButton(mainDiv, '#next', 'Next', function () { self.automaticAiPlay(1); });
    Dome.newButton(mainDiv, '#next10', 'Next 10', function () { self.automaticAiPlay(10); });
    Dome.newButton(mainDiv, '#nextAll', 'Finish', function () { self.automaticAiPlay(); });
    Dome.newButton(mainDiv, '#undo', 'Undo', function () { self.playUndo(); });
    Dome.newButton(mainDiv, '#accept', 'Accept', function () { self.acceptScore(true); });
    Dome.newButton(mainDiv, '#refuse', 'Refuse', function () { self.acceptScore(false); });
    Dome.newButton(mainDiv, '#newg', 'New game', function () { self.newGameDialog(); });
    this.output = mainDiv.newDiv('logBox outputBox');
    Dome.newButton(mainDiv, '#resi', 'Resign', function () { self.playerResigns(); });

    this.aiVsAiFlags = mainDiv.newDiv('#aiVsAiFlags');
    this.animated = Dome.newCheckbox(this.aiVsAiFlags, 'animated', 'Animated');
};

Ui.prototype.toggleControls = function () {
    var inGame = !(this.game.gameEnded || this.game.gameEnding);
    var auto = this.aiPlays === 'both';
    if (!inGame) this.setEvalMode(false);

    this.controls.setVisible(['accept', 'refuse'], this.game.gameEnding);
    this.controls.setVisible(['undo'], inGame);
    this.controls.setVisible(['pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll', 'aiVsAiFlags'], inGame && auto);
    this.controls.setVisible(['newg'], this.game.gameEnded && !this.isCompactLayout);

    // Dev controls
    this.controls.setVisible(['devDiv'], inGame && this.inDevMode);
};

Ui.prototype.message = function (html, append) {
    if (append) html = this.output.html() + html;
    this.output.setHtml(html);
};


//--- GAME LOGIC

Ui.prototype.createPlayers = function () {
    this.players = [];
    this.playerIsAi = [false, false];
    if (this.aiPlays === 'black' || this.aiPlays === 'both') {
        this.getAiPlayer(BLACK);
        this.playerIsAi[BLACK] = true;
    }
    if (this.aiPlays === 'white' || this.aiPlays === 'both') {
        this.getAiPlayer(WHITE);
        this.playerIsAi[WHITE] = true;
    }
};

Ui.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    var Ai = color === BLACK ? main.defaultAi : main.latestAi;
    player = this.players[color] = new Ai(this.game.goban, color);
    return player;
};

Ui.prototype.startGame = function (firstMoves, isLoaded) {
    var game = this.game;
    if (!isLoaded) game.newGame(this.gsize, this.handicap);
    if (firstMoves) {
        var errors = [];
        if (!game.loadMoves(firstMoves, errors)) {
            new PopupDlg(this.gameDiv, errors.join('\n'));
            return false;
        }
    }
    // read values from game to make sure they are valid and match loaded game
    this.gsize = game.goban.gsize;
    this.handicap = game.handicap;

    this.createPlayers();
    this.debugHeuristic = null;

    if (!this.gameDiv) this.createGameUi('main', document.body);
    this.toggleControls();

    this.board.create(this.boardElt, this.boardWidth, this.game.goban);
    this.refreshBoard();

    if (isLoaded) return true;
    if (firstMoves && this.checkEnd()) return true;

    this.message('Game started. Your turn...'); // erased if a move is played below
    this.letNextPlayerPlay();
    return true;
};

/** @return false if game goes on normally; true if special ending action was done */
Ui.prototype.checkEnd = function () {
    if (this.game.gameEnding) {
        this.proposeScore();
        return true;
    }
    if (this.game.gameEnded) {
        this.showEnd(); // one resigned
        return true;
    }
    return false;
};

Ui.prototype.computeScore = function () {
    this.scoreMsg = this.scorer.computeScore(this.game.goban, this.game.komi, this.game.whoResigned).join('<br>');
};

Ui.prototype.proposeScore = function () {
    this.computeScore();
    this.message(this.scoreMsg);
    this.message('<br><br>Do you accept this score?', true);
    this.toggleControls();
    this.board.showScoring(this.scorer.getScoringGrid().yx);
};

Ui.prototype.acceptScore = function (acceptEnd) {
    // who actually refused? Current player unless this is a human VS AI match (in which case always human)
    var whoRefused = this.game.curColor;
    if (this.playerIsAi[whoRefused] && !this.playerIsAi[1 - whoRefused]) whoRefused = 1 - whoRefused;

    this.game.acceptEnding(acceptEnd, whoRefused);
    if (acceptEnd) return this.showEnd();

    this.message('Score in dispute. Continue playing...');
    this.toggleControls();
    this.refreshBoard();
    // In AI VS AI move we don't ask AI to play again otherwise it simply passes again
    if (this.aiPlays !== 'both') this.letNextPlayerPlay();
};

Ui.prototype.showEnd = function () {
    this.message(this.scoreMsg + '<br><br>' + this.game.historyString());
    this.toggleControls();
};

Ui.prototype.showAiMoveData = function (aiPlayer, move, isTest) {
    var playerName = Grid.colorName(aiPlayer.color);
    this.message(playerName + ' (AI ' + aiPlayer.version + '): ' + move);

    var txt = aiPlayer.getMoveSurveyText(move, isTest);
    txt = txt.replace(/\n/g, '<br>');
    this.devMessage(txt);
};

Ui.prototype.letAiPlay = function (skipRefresh) {
    var aiPlayer = this.lastAiPlayer = this.players[this.game.curColor];
    var move = aiPlayer.getMove();
    if (!skipRefresh) this.showAiMoveData(aiPlayer, move);
    this.game.playOneMove(move);

    // AI resigned or double-passed?
    if (this.checkEnd()) return move;

    if (!skipRefresh) this.refreshBoard();
    return move;
};

Ui.prototype.playerMove = function (move) {
    var playerName = Grid.colorName(this.game.curColor);

    if (!this.game.playOneMove(move)) {
        return this.message(this.game.getErrors().join('<br>'));
    }
    if (this.checkEnd()) return;

    this.refreshBoard();
    this.message(playerName + ': ' + move);
    this.letNextPlayerPlay();
};

Ui.prototype.playerResigns = function () {
    var self = this;
    var options = { buttons: ['YES', 'NO'] };
    new PopupDlg(this.gameDiv, 'Do you really want to resign?', 'Confirm', options, function (options) {
        if (options.choice !== 0) return;
        self.game.playOneMove('resi');
        self.computeScore();
        self.checkEnd();
    });
};

Ui.prototype.playUndo = function () {
    var command = 'undo';
    if (this.aiPlays === 'none' || this.aiPlays === 'both' || this.inEvalMode) {
        command = 'half_undo';
    }

    if (!this.game.playOneMove(command)) {
        this.message(this.game.getErrors().join('<br>'));
    } else {
        this.refreshBoard();
        this.message('Undo!');
    }
    this.message(' ' + this.whoPlaysNow(), true);
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
        if (!skipRefresh) this.message(' ' + this.whoPlaysNow(), true);
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

window.addEventListener('beforeunload', function () {
    userPref.close();
});


//--- DEV UI

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

Ui.prototype.setEvalMode = function (enabled) {
    if (enabled === this.inEvalMode) return;
    this.inEvalMode = enabled;
    this.controls.setEnabled('ALL', !this.inEvalMode, ['evalMode','undo','next','pass', 'heuristicTest']);
    this.controls.get('evalMode').toggleClass('toggled', enabled);
};

Ui.prototype.evalMove = function (move) {
    var player = this.getAiPlayer(this.game.curColor);
    this.showAiMoveData(player, move, /*isTest=*/true);
};

Ui.prototype.scoreTest = function () {
    var score = this.scorer.computeScore(this.game.goban, this.game.komi);
    this.message(score);
    this.board.showSpecial('scoring', this.scorer.getScoringGrid().yx);
};

Ui.prototype.territoryTest = function () {
    this.board.showSpecial('territory', this.getAiPlayer(this.game.curColor).guessTerritories());
};

Ui.prototype.heuristicTest = function (name) {
    this.debugHeuristic = name === NO_HEURISTIC ? null : name;

    this.getAiPlayer(BLACK).setDebugHeuristic(this.debugHeuristic);
    this.getAiPlayer(WHITE).setDebugHeuristic(this.debugHeuristic);

    this.refreshBoard();
};

Ui.prototype.influenceTest = function (color) {
    var infl = this.getAiPlayer(1 - this.game.curColor).infl;
    // This could be AiPlayer's job to return us a grid ready for display
    var yx = new Grid(this.gsize).yx; // TODO: covert infl to 2 grids one day?
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            yx[j][i] = infl[j][i][color];
        }
    }
    this.board.showSpecial('value', yx);
};

Ui.prototype.devDisplay = function () {
    this.evalTestDropdown.select(NO_EVAL_TEST);
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

var heuristics = [
    NO_HEURISTIC,
    'NoEasyPrisoner',
    'Hunter',
    'Savior',
    'Connector',
    'Spacer',
    'Pusher',
    'Shaper'
];

var evalTests = [
    NO_EVAL_TEST,
    'Score',
    'Territory',
    'Influence B',
    'Influence W'
];

Ui.prototype.createDevControls = function () {
    var self = this;
    var devDiv = this.gameDiv.newDiv('#devDiv');
    var devCtrls = devDiv.newDiv('devControls');

    Dome.newButton(devCtrls, '#evalMode', 'Eval mode', function () { self.setEvalMode(!self.inEvalMode); });

    var col2 = devCtrls.newDiv('col2');
    Dome.newCheckbox(col2, 'debug', 'Debug').on('change', function () {
        main.debug = this.isChecked();
        main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    });

    Dome.newLink(col2, 'emailGame', 'Email game',
        'mailto:kubicle@yahoo.com?subject=' + main.appName + '%20game' +
        '&body=' + this.game.historyString());

    this.evalTestDropdown = Dome.newDropdown(col2, '#evalTest', evalTests, null, '');
    this.evalTestDropdown.on('change', function () {
        switch (this.value()) {
        case NO_EVAL_TEST: return self.refreshBoard();
        case 'Score': return self.scoreTest();
        case 'Territory': return self.territoryTest();
        case 'Influence B': return self.influenceTest(BLACK);
        case 'Influence W': return self.influenceTest(WHITE);
        }
    });
    Dome.newDropdown(col2, '#heuristicTest', heuristics, null, '').on('change', function () {
        self.heuristicTest(this.value());
    });

    this.devOutput = devDiv.newDiv('logBox devLogBox');
};

},{"../GameLogic":8,"../Grid":11,"../Logger":14,"../ScoreAnalyser":15,"../main":70,"../net/Gtp":71,"../net/UiGtpEngine":73,"../userPreferences":99,"./Board":91,"./Dome":92,"./NewGameDlg":93,"./PopupDlg":94}],97:[function(require,module,exports){
var css = "body {\n  background-color: #AB8274;\n  font-family: \"Arial\";\n  margin: 7px;\n}\n.pageTitle {\n  margin-top: 7px;\n  margin-bottom: 7px;\n  font-size: 40px;\n  font-weight: bold;\n}\n.subTitle {\n  font-size: 30px;\n  margin-top: 0.5em;\n  margin-bottom: 5px;\n}\n.logBox {\n  font-size: 28px;\n  font-family: \"Arial\";\n  background-color: white;\n  border: solid #cca 1px;\n  border-radius: 8px;\n  padding: 5px;\n  overflow-y: auto;\n  word-wrap: break-word;\n}\n.inputLbl {\n  margin-left: 10px;\n  font-size: 28px;\n}\n.inputBox {\n  margin: 17px 13px 17px 13px;\n  min-height: 1cm;\n  text-align: left;\n  font-size: 42px;\n}\nbutton {\n  margin-right: 10px;\n  margin-bottom: 10px;\n  border-radius: 13px;\n  width: 160px;\n  height: 120px;\n  font-size: 28px;\n  border-color: #987;\n  background-color: #765;\n  color: #fed;\n}\nbutton.toggled {\n  background-color: #08d;\n}\n.chkBoxDiv {\n  display: inline-block;\n  margin-right: 10px;\n}\n.chkBox {\n  margin: 5px 3px 14px 2px;\n  width: 29px;\n  height: 1.5em;\n}\n.chkLbl {\n  font-size: 28px;\n}\n.dropDwn {\n  font-size: 42px;\n  margin: 17px 13px 17px 13px;\n}\n.radioBtn {\n  margin: 17px 0px 17px 13px;\n  width: 29px;\n  height: 1.5em;\n}\n.radioLbl {\n  margin-right: 13px;\n}\n.dialog {\n  z-index: 1000;\n  position: relative;\n  margin: 0 auto;\n  top: 200px;\n  width: 45%;\n  padding: 10px;\n  background-color: #ffe;\n  border: solid #cca 1px;\n  border-radius: 10px;\n  font-family: Arial;\n  font-size: 42px;\n}\n.dialogTitle {\n  font-size: 50px;\n  background-color: #ffebce;\n  border: solid 1px rgba(195, 50, 50, 0.2);\n  border-radius: 10px;\n  margin: -6px;\n  margin-bottom: 15px;\n  padding: 10px 0px 10px 12px;\n}\n.popupBackground {\n  z-index: 2000;\n  position: absolute;\n  left: 0;\n  top: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n}\n.popupDlg {\n  position: relative;\n  top: 150px;\n  margin: 0 auto;\n  width: 50%;\n}\n.popupDlg .content {\n  padding: 20px;\n  white-space: pre-wrap;\n}\n.popupDlg .btnDiv {\n  width: 100%;\n  display: inline-block;\n}\n.popupDlg .btnDiv .popupDlgButton {\n  min-width: 220px;\n  height: 100%;\n  min-height: 80px;\n  font-size: 30px;\n  float: right;\n  margin-right: 0;\n  margin-left: 10px;\n}\n.gameUi .board {\n  background-color: #402F23;\n  border-radius: 7px;\n}\n.gameUi .board .wgo-board {\n  margin: 0 auto;\n  /* Below avoid issues when tap-hold on mobile */\n  -webkit-user-select: none;\n  -webkit-touch-callout: none;\n}\n.gameUi .boardDesc {\n  margin-top: 3px;\n  font-weight: bold;\n  font-style: italic;\n}\n.gameUi button {\n  min-width: 160px;\n}\n.gameUi .mainControls {\n  margin-top: 10px;\n  display: flex;\n}\n.gameUi .mainControls .outputBox {\n  width: 410px;\n  min-width: 200px;\n  font-size: 22px;\n  font-weight: bold;\n  margin-right: 10px;\n  margin-bottom: 10px;\n}\n.gameUi .devDiv {\n  display: flex;\n  min-width: 600px;\n  border: #755;\n  border-width: 1px 2px 2px 1px;\n  border-style: solid;\n  border-radius: 10px;\n  background-color: #FAEBD7;\n  padding: 7px;\n}\n.gameUi .devDiv .devControls {\n  display: flex;\n}\n.gameUi .devDiv .devControls .emailGameLink {\n  display: inline-block;\n  margin-right: 10px;\n}\n.gameUi .devDiv .devControls button {\n  height: 90px;\n  font-size: 24px;\n}\n.gameUi .devDiv .devControls .dropDwn {\n  font-size: 24px;\n  margin: 0px 10px 5px 0px;\n}\n.gameUi .devDiv .devLogBox {\n  height: 102px;\n  width: 460px;\n  min-width: 200px;\n  font-size: 20px;\n  font-weight: bold;\n}\n.testTitle {\n  margin-top: 40px;\n  margin-bottom: 10px;\n  font-size: 20px;\n  font-weight: bold;\n}\n.testOutputBox {\n  height: 160px;\n  font-size: 14px;\n}\n.testErrorBox {\n  word-wrap: break-word;\n  height: 250px;\n  font-size: 14px;\n  font-family: 'Courier';\n}\n.boardDesc {\n  font-family: 'Courier';\n}\n.newGameBackground {\n  background-image: url(\"js/ui/photo.jpg\");\n  background-repeat: repeat-y;\n  background-size: cover;\n  height: 1500px;\n}\n.newGameDialog {\n  min-width: 800px;\n}\n.newGameDialog .handicapInput {\n  width: 20px;\n  text-align: center;\n}\n.newGameDialog .movesInput {\n  width: 50%;\n}\n.newGameDialog .defAiInfo {\n  font-size: 50%;\n  font-style: italic;\n  width: 400px;\n  display: inline-block;\n}\n.newGameDialog .btnDiv {\n  width: 100%;\n  height: 100px;\n}\n.newGameDialog .btnDiv .startButton {\n  width: 240px;\n  height: 100%;\n  font-size: 30px;\n  float: right;\n  margin-right: 0;\n}\n";(require('lessify'))(css); module.exports = css;
},{"lessify":101}],98:[function(require,module,exports){
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

},{}],99:[function(require,module,exports){
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

},{"./main":70}],100:[function(require,module,exports){
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

},{}],101:[function(require,module,exports){
module.exports = require('cssify');

},{"cssify":100}],102:[function(require,module,exports){
module.exports={
  "name": "rubigolo",
  "version": "0.1.0",
  "description": "",
  "author": "Olivier Lombart (kubicle)",
  "license": "MIT",
  "scripts": {
    "start": "watchify js/app.js -o js/build.js -t lessify -v",
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
    "watchify": "^3.2.2"
  }
}

},{}]},{},[68]);

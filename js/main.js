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

TestSeries.prototype.testOneClass = function (Klass, methodPattern) {
  for (var method in Klass.prototype) {
    if (typeof Klass.prototype[method] !== 'function') continue;
    if (method.substr(0,4) !== 'test') continue;
    if (methodPattern && method.indexOf(methodPattern) === -1) continue;
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

TestSeries.prototype.run = function (logfunc, specificClass, methodPattern) {
  main.log.setLogFunc(logfunc);
  main.assertCount = main.count = 0;
  var startTime = Date.now();
  var classCount = 0;
  this.testCount = this.failedCount = this.errorCount = 0;
  for (var t in this.testCases) {
    if (specificClass && t !== specificClass) continue;
    classCount++;
    var Klass = this.testCases[t];
    this.testOneClass(Klass, methodPattern);
  }
  var duration = ((Date.now() - startTime) / 1000).toFixed(2);
  var classes = specificClass ? 'class ' + specificClass : classCount + ' classes';
  var report = 'Completed tests. (' + classes + ', ' + this.testCount + ' tests, ' +
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

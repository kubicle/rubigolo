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

function _checkValue(expected, val, comment) {
  if (main.isA(Array, expected)) {
    if (!main.isA(Array, val)) _fail('expected Array but got ' + val, comment);
    if (val.length !== expected.length) {
      console.warn('Expected:\n', expected, '\nbut got:\n', val);
      _fail('Expected Array of size ' + expected.length + ' but got size ' + val.length, comment);
    }
    for (var i = 0; i < expected.length; i++) {
      _checkValue(expected[i], val[i], comment);
    }
    return;
  }
  if (val === expected) return;
  console.warn('Expected:\n', expected, '\nbut got:\n', val);
  _fail('Expected:\n' + expected + '\nbut got:\n' + val + '\n', comment);
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
};

main.log = new Logger();
main.Logger = Logger;

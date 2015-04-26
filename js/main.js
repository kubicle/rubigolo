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

TestSeries.prototype.run = function () {
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
        console.error(header + ': ' + obj.testName + ': ' + e.message + '\n' + e.stack);
      }
    }
  }
  var duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('Completed tests. (' + classCount + ' classes, ' + testCount + ' tests, ' +
    main.assertCount + ' assertions in ' + duration + 's)' +
    ', failed: ' + failedCount + ', exceptions: ' + errorCount);
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
}

Logger.FATAL = 4;
Logger.ERROR = 3;
Logger.WARN = 2;
Logger.INFO = 1;
Logger.DEBUG = 0;

Logger.prototype.debug = function (msg) {
  if (this.level > Logger.DEBUG) return;
  console.log(msg);
};
Logger.prototype.info = function (msg) {
  if (this.level > Logger.INFO) return;
  console.info(msg);
};
Logger.prototype.warn = function (msg) {
  if (this.level > Logger.WARN) return;
  console.warn(msg);
};
Logger.prototype.error = function (msg) {
  console.error(msg);
};
Logger.prototype.fatal = function (msg) {
  console.error(msg);
};

main.log = new Logger();
main.Logger = Logger;

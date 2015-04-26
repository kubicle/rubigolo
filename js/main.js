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


//--- Tests

/** @class */
function TestSeries() {
  this.testCases = {};
}

TestSeries.prototype.add = function (klass) {
  this.testCases[klass.name] = klass;
  return klass;
};

TestSeries.prototype.run = function () {
  main.numAssert = 0;
  var numClass = 0, count = 0, failedCount = 0;
  for (var t in this.testCases) {
    numClass++;
    var countInClass = 0;
    var Klass = this.testCases[t];
    for (var m in Klass.prototype) {
      if (m.substr(0,4) !== 'test') continue;
      count++; countInClass++;
      var obj = new Klass(Klass.name + ' #' + countInClass);
      try {
        obj[m].call(obj);
      } catch(e) {
        console.error('Test failed: ' + obj.testName + ': ' + e.message, e.stack);
        failedCount++;
      }
    }
  }
  var failedMsg = failedCount ? ', failed: ' + failedCount : ''
  console.log('Completed testing of ' + numClass + ' classes. ' + main.numAssert + ' assertionss' + failedMsg);
};


/** @class */
function TestCase(testName) {
  this.testName = testName;
}

function _fail(msg, comment) {
  comment = comment ? comment + ': ' : '';
  throw new Error('Failed assertion: ' + comment + msg);
}

function _checkValue(expected, val, comment) {
  if (expected instanceof Array) {
    if (!val instanceof Array)
      _fail('expected Array but got ' + val, comment);
    if (val.length !== expected.length)
      _fail('expected Array of size ' + expected.length + ' but got size ' + val.length, comment);

    for (var i = 0; i < expected.length; i++) {
      _checkValue(expected[i], val[i], comment);
    }
    return;
  }
  if (val === expected) return;
  _fail('expected [' + expected + '] but got [' + val + ']', comment);
}

main.assertEqual = function (expected, val, comment) {
  main.numAssert++;
  _checkValue(expected, val, comment);
};

main.assertInDelta = function (val, expected, delta, comment) {
  main.numAssert++;
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

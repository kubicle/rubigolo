//main class for babyruby2js
'use strict';

/** @class */
function main() {
}
module.exports = main;

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
  var numClass = 0, count = 0;
  for (var t in this.testCases) {
    numClass++;
    var Klass = this.testCases[t];
    for (var m in Klass.prototype) {
      if (m.substr(0,4) !== 'test') continue;
      count++;
      var obj = new Klass('' + count);
      obj[m].call(obj);
    }
  }
  console.log('Completed testing of ' + numClass + ' classes (' + count + ' tests)');
};


/** @class */
function TestCase(testName) {
  this.testName = testName;
}

main.assertEqual = function (val, expected) {
  if (expected instanceof Array) {
    if (!val instanceof Array) throw new Error('Failed assertion: expected Array but got ' + val);
    if (val.length !== expected.length)
      throw new Error('Failed assertion: expected Array of size ' + expected.length +
        ' but got size ' + val.length);
    for (var i = 0; i < expected.length; i++) {
      main.assertEqual(val[i], expected[i]);
    }
    return;
  }
  if (val === expected) return;
  throw new Error('Failed assertion: expected [' + expected + '] but got [' + val + ']');
};

main.tests = new TestSeries();
main.TestCase = TestCase;

//--- Logger

/** @class */
function Logger() {
}

Logger.prototype.debug = function (msg) {
  console.log(msg);
};
Logger.prototype.error = function (msg) {
  console.error(msg);
};

main.log = new Logger();

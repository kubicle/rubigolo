//main class for babyruby2js
'use strict';

/** @class */
function main() {
}
module.exports = main;

//---Array functions

main.Array = function (size, init) {
  var i, a = [];
  if (typeof init === 'function') {
    for (i = 0; i < size; i++) { a[i] = init(); }
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
  for (var i=this.length; i>0; i--) this.pop();
};

Array.prototype.select = Array.prototype.filter;

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
  for (var t in this.testCases) {
    var Klass = this.testCases[t];
    var obj = new Klass('1');
    obj.run();
  }
};

/** @class */
function TestCase(testName) {
  this.testName = testName;
}

TestCase.prototype.run = function () {
  for (var m in this) {
    var f = this[m];
    if (typeof f === 'function' && m.substr(0,4) === 'test') {
      console.log('Running test ' + this.testName + '::' + m + '...');
      f.call(this);
    }
  }
};

main.assertEqual = function (val, expected) {
    if (val === expected) return;
    throw new Error('Failed assertion: expected [' + expected + '] but got [' + val + ']');
};

main.tests = new TestSeries();
main.TestCase = TestCase;

//---

String.prototype.chop = function (tail) {
  if (!tail) {
    return this.substr(0, this.length - 1);
  }
  var pos = this.length - tail.length;
  if (this.substr(pos) === tail) {
    return this.substr(0, pos);
  }
  return this.toString();
};

String.prototype.startWith = function (head) {
  return this.substr(0, head.length) === head;
};

String.prototype.endWith = function (tail) {
  return this.substr(this.length - tail.length) === tail;
};

main.strFormat = function (fmt) {
  return fmt; //TODO
};

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

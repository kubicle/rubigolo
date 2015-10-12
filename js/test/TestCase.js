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
    console.warn(msg);
    _fail(msg, comment);
};

TestCase.prototype.assertInDelta = function (val, expected, delta, comment) {
    this.series.checkCount++;
    if (Math.abs(val - expected) <= delta) return;
    _fail(val + ' is not in +/-' + delta + ' delta around ' + expected, comment);
};

TestCase.prototype.todo = function (comment) {
    this.series.todoCount++;
    main.log.warn('TODO: ' + comment);
};

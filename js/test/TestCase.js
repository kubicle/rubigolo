'use strict';

var log = require('../log');
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
    log.info('TODO: ' + comment);
};

TestCase.prototype.showInUi = function (msg) {
    if (!main.testUi || !this.game) return;
    if (this.isBroken && !main.debug) return;
    try {
        main.testUi.showTestGame(this.name, msg, this.game);
    } catch (e) {
        log.error('Exception loading failed test in UI: ' + e.message);
    }
};

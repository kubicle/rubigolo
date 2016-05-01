'use strict';

var log = require('../log');
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
        if (method.substr(0,4) !== 'test' && method !== methodPattern) continue;
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
            log.error('Test failed: ' + this.currentTest + ': ' + msg + '\n');
        } else {
            this.errorCount++;
            log.error('Exception during test: ' + this.currentTest + ':\n' + e.stack + '\n');
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
        log.info('BROKEN: ' + this.currentTest);
        this.brokenCount++;
    } else {
        log.info('FIXED: ' + this.currentTest);
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
    var logLevel = log.level;
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
        log.setLevel(logLevel); // restored to initial level
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
        log.info(report);
    } else {
        report += '*** ISSUES: exceptions: ' + this.errorCount +
            ', failed: ' + this.failedCount + ' ***';
        log.error(report);
    }
    return numIssues;
};

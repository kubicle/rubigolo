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
    this.testCases[main.funcName(klass)] = klass;
    return klass;
};

TestSeries.prototype.testOneClass = function (Klass, methodPattern) {
    for (var method in Klass.prototype) {
        if (typeof Klass.prototype[method] !== 'function') continue;
        if (method.substr(0,4) !== 'test') continue;
        if (methodPattern && method.indexOf(methodPattern) === -1) continue;
        this.testCount++;
        var test = new Klass(main.funcName(Klass) + '#' + method);
        test.series = this;
        try {
            test[method].call(test);
        } catch(e) {
            if (e.message.startWith(TestSeries.FAILED_ASSERTION_MSG)) {
                this.failedCount++;
                e.message = e.message.substr(TestSeries.FAILED_ASSERTION_MSG.length);
                main.log.error('Test failed: ' + main.funcName(test) + ': ' + e.message + '\n');
            } else {
                this.errorCount++;
                main.log.error('Exception during test: ' + main.funcName(test) + ':\n' + e.stack + '\n');
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

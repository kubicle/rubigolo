//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('./main');


/** @class tolerance allows you to ignore a bad performance to some extent. E.g 1.05 gives you 5% tolerance up
 *  ratio allows you to adapt to slower or faster system. E.g 1.0 if your system is as slow as mine :(
 */
function TimeKeeper(tolerance, ratio) {
    this.tolerance = tolerance !== undefined ? tolerance : 1.15;
    this.ratio = ratio !== undefined ? ratio : 1.0;
    this.log = main.log;

    this.duration = this.taskName = this.expectedTime = this.t0 = undefined;
}
module.exports = TimeKeeper;


// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype.calibrate = function (expected) {
    var t0 = Date.now();
    for (var i = 0; i < 2000; i++) {
        var m = {};
        for (var n = 0; n < 100; n++) {
            m[n.toString()] = n;
        }
        for (n = 0; n < 1000; n++) {
            m[(n % 100).toString()] += 1;
        }
    }
    var duration = (Date.now() - t0) / 1000;
    this.ratio = duration / expected;

    // TODO: re-estimate decent numbers for JS. The lines above are MUCH faster in JS/Chrome
    // than Ruby used to be (on same machine). But the speed tests we have are not always that 
    // much faster, hence if we accept the ratio we computed here we would fail many of them.

    this.log.info('TimeKeeper calibrated at ratio=' + this.ratio.toFixed(2) +
        ' (ran calibration in ' + duration.toFixed(2) + ' instead of ' + expected + ')');
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec) {
    this.taskName = taskName;
    this.expectedTime = expectedInSec ? expectedInSec * this.ratio : undefined;
    this.log.info('Started "' + taskName + '"...');
    this.t0 = Date.now();
};

// Stops timing, displays the report and logs an error if we went over limit,
// unless lenientIfSlow is true, in which case we would simply log and return the error message
TimeKeeper.prototype.stop = function (lenientIfSlow) {
    this.duration = (Date.now() - this.t0) / 1000;
    this.log.info(' => ' + this.resultReport());
    return this._checkLimits(lenientIfSlow);
};

TimeKeeper.prototype.resultReport = function () {
    var report = 'Measuring "' + this.taskName + '": time: ' + this.duration.toFixed(2) + 's';
    if (this.expectedTime) {
        report += ' (expected ' + this.expectedTime.toFixed(2) + ' hence ' +
            (this.duration / this.expectedTime * 100).toFixed(2) + '%)';
    }
    return report;
};

TimeKeeper.prototype._checkLimits = function (lenientIfSlow) {
    if (!this.expectedTime) return '';
    if (this.duration <= this.expectedTime * this.tolerance) return '';

    var msg = 'Duration over limit: ' + this.duration.toFixed(2) +
        ' instead of ' + this.expectedTime.toFixed(2);
    if (!lenientIfSlow) {
        main.tests.warningCount++;
        this.log.error(this.taskName + ': ' + msg);
    }
    return msg;
};

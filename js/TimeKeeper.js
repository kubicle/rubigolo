//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('./main');

var systemPerf = null;


/** @class
 * @param {number} tolerance - allows to ignore bad performance. E.g 1.05 gives you 5% tolerance up
 */
function TimeKeeper(tolerance) {
    this.tolerance = tolerance || 1.15;
    this.log = main.log;

    this.ratio = this.duration = this.taskName = this.expectedTime = this.t0 = undefined;
}
module.exports = TimeKeeper;


// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype._calibrate = function (expected) {
    var count1 = 10000, count2 = 1000;
    if (main.isCoverTest) count1 = count2 = 1;

    var t0 = Date.now();

    for (var i = count1; i>= 0; i--) {
        var ar = {}, mapNum = {}, mapAlpha = {};
        var m = { v1: 10, v2: 20, ar1: [], ar2: [] };

        // Seldom used operations
        for (var n = count2 / 100 - 1; n >= 0; n--) {
            mapAlpha['key' + n] = [n, n+1];
            mapNum[n] = n;
        }
        for (var key in mapAlpha) {
            mapAlpha[key].sort();
        }
        for (n in mapNum) {
            mapNum[~~n] = mapNum[~~n] + 99;
        }
        // Often used operations
        for (n = count2 / 10 - 1; n >= 0; n--) {
            ar[n] = 'value' + n;
            mapNum[ndx]= n + mapNum[n % 10];
            m.ar1[n] = new TimeKeeper(n);
            m.ar2.push(m.v1 + (m.v2 === 0 ? 1 : 2));
        }
        // Very often used operations
        for (n = count2 - 1; n >= 0; n--) {
            var ndx = n % (count2 / 10);
            if (ar[ndx].length < 5) ar[ndx] += 'X';
            var obj = m.ar1[ndx];
            obj._calibrateTest(obj.tolerance, 2);
        }
    }

    var duration = (Date.now() - t0) / 1000;
    systemPerf = duration / expected;

    this.log.info('TimeKeeper calibrated at ratio=' + systemPerf.toFixed(2) +
        ' (ran calibration in ' + duration.toFixed(2) + ' instead of ' + expected + ')');
    return systemPerf;
};

TimeKeeper.prototype._calibrateTest = function (tolerance, n) {
    if (n > 0) this._calibrateTest(tolerance, n - 1);
    tolerance = this.tolerance ;
    if (this.ratio === this.ratio) this.tolerance = Math.max(-100, tolerance);
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec) {
    this.ratio = systemPerf || this._calibrate(0.42);

    this.taskName = taskName;
    this.expectedTime = expectedInSec ? expectedInSec * this.ratio : undefined;
    this.log.info('Started "' + taskName + '"...');
    this.t0 = Date.now();
};

// Stops timing, displays the report and logs a warning if we went over limit.
// If lenientIfSlow is true, the warning is not counted (still displayed)
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
    if (!this.expectedTime || main.isCoverTest) return '';
    if (this.duration <= this.expectedTime * this.tolerance) return '';

    var msg = 'Duration over limit: ' + this.duration.toFixed(2) +
        ' instead of ' + this.expectedTime.toFixed(2);
    this.log.warn(this.taskName + ': ' + msg);

    if (!lenientIfSlow) main.tests.warningCount++;
    return msg;
};

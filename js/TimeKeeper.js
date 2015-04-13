//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('./main');

/** @class tolerance allows you to ignore a bad performance to some extent. E.g 1.05 gives you 5% tolerance up
 *  ratio allows you to adapt to slower or faster system. E.g 1.0 if your system is as slow as mine :(
 */
function TimeKeeper(tolerance, ratio) {
    if (tolerance === undefined) tolerance = 1.15;
    if (ratio === undefined) ratio = 1.0;
    this.tolerance = tolerance;
    this.ratio = ratio;
    return this.setGcTolerance(); // in number of times over the expected number or runs
}
module.exports = TimeKeeper;

// Sets the GC runs tolerance
// I.e. how many times over the expected number of GC run can we tolerate.
// Note this number is increased using the general tolerance percentage give at init.
TimeKeeper.prototype.setGcTolerance = function (numRuns) {
    if (numRuns === undefined) numRuns = 10;
    this.gcTolerance = numRuns * this.tolerance;
};

// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype.calibrate = function (expected) {
    var t0 = Date.now();
    for (var i = 1; i <= 2000; i++) {
        var m = {};
        for (var n = 1; n <= 100; n++) {
            m[n.toString()] = n;
        }
        for (var n = 1; n <= 1000; n++) {
            m[(n % 100).toString()] += 1;
        }
    }
    var duration = Date.now() - t0;
    this.ratio = duration / expected;
    console.log('TimeKeeper calibrated at ratio=' + '%.02f'.format(this.ratio) + ' ' + '(ran calibration in ' + '%.03f'.format(duration) + ' instead of ' + expected + ')');
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec, expectedGc) {
    this.taskName = taskName;
    this.expectedTime = expectedInSec * this.ratio;
    this.expectedGc = Math.round(expectedGc);
    console.log('Started "' + taskName + '"...'); // (expected time #{'%.02f' % @expected_time}s)..."
    this.gc0 = main.GC.count();
    this.t0 = Date.now();
};

// Stops timing, displays the report and raises exception if we went over limit
// Unless raise_if_overlimit is false, in which case we would simply log and return the error message
TimeKeeper.prototype.stop = function (raiseIfOverlimit) {
    if (raiseIfOverlimit === undefined) raiseIfOverlimit = true;
    this.duration = Date.now() - this.t0;
    this.numGc = main.GC.count() - this.gc0;
    console.log(' => ' + this.resultReport());
    return this.checkLimits(raiseIfOverlimit);
};

TimeKeeper.prototype.resultReport = function () {
    var s = '';
    s += 'Measuring "' + this.taskName + '":';
    s += ' time: ' + '%.02f'.format(this.duration) + 's (expected ' + '%.02f'.format(this.expectedTime) + ' hence ' + '%.02f'.format((this.duration / this.expectedTime * 100)) + '%)';
    s += ' GC runs: ' + this.numGc + ' (' + this.expectedGc + ')';
};

//private;
TimeKeeper.prototype.checkLimits = function (raiseIfOverlimit) {
    if (this.duration > this.expectedTime * this.tolerance) {
        var msg1 = 'Duration over limit: ' + this.duration;
        if (raiseIfOverlimit) {
            throw new Error(msg1);
        }
        return msg1;
    }
    if (this.numGc > this.expectedGc + this.gcTolerance) {
        var msg2 = 'GC run number over limit: ' + this.numGc;
        if (raiseIfOverlimit) {
            throw new Error(msg2);
        }
        return msg2;
    }
    return '';
};

// W02: Unknown constant supposed to be attached to main: GC
// W02: Unknown constant supposed to be attached to main: GC
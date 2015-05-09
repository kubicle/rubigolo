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
    this.log = main.log;
}
module.exports = TimeKeeper;

TimeKeeper.prototype.setGcTolerance = function () {};

// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype.calibrate = function (expected) {
    var t0 = Date.now();
    for (var _i = 0; _i < 2000; _i++) {
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
    // In the meantime we use a conservative 0.5 ratio.
    this.ratio = 0.5;

    this.log.info('TimeKeeper calibrated at ratio=' + '%.02f'.format(this.ratio) + ' ' + '(ran calibration in ' + '%.03f'.format(duration) + ' instead of ' + expected + ')');
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (taskName, expectedInSec, expectedGc) {
    this.taskName = taskName;
    this.expectedTime = expectedInSec * this.ratio;
    this.log.info('Started "' + taskName + '"...'); // (expected time #{'%.02f' % @expected_time}s)..."
    this.t0 = Date.now();
};

// Stops timing, displays the report and raises exception if we went over limit
// Unless raise_if_overlimit is false, in which case we would simply log and return the error message
TimeKeeper.prototype.stop = function (raiseIfOverlimit) {
    if (raiseIfOverlimit === undefined) raiseIfOverlimit = true;
    this.duration = (Date.now() - this.t0) / 1000;
    this.log.info(' => ' + this.resultReport());
    return this.checkLimits(raiseIfOverlimit);
};

TimeKeeper.prototype.resultReport = function () {
    var s = '';
    s += 'Measuring "' + this.taskName + '":';
    s += ' time: ' + '%.02f'.format(this.duration) + 's (expected ' +
        '%.02f'.format(this.expectedTime) + ' hence ' +
        '%.02f'.format((this.duration / this.expectedTime * 100)) + '%)';
    return s;
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
    return '';
};

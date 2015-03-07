//Translated from time_keeper.rb using babyruby2js
'use strict';

var main = require('./main');
// tolerance allows you to ignore a bad performance to some extent. E.g 1.05 gives you 5% tolerance up
// ratio allows you to adapt to slower or faster system. E.g 1.0 if your system is as slow as mine :(

/** @class */
function TimeKeeper(tolerance, ratio) {
    if (tolerance === undefined) tolerance = 1.15;
    if (ratio === undefined) ratio = 1.0;
    this.tolerance = tolerance;
    this.ratio = ratio;
    return this.set_gc_tolerance(); // in number of times over the expected number or runs
}
module.exports = TimeKeeper;

// Sets the GC runs tolerance
// I.e. how many times over the expected number of GC run can we tolerate.
// Note this number is increased using the general tolerance percentage give at init.
TimeKeeper.prototype.set_gc_tolerance = function (num_runs) {
    if (num_runs === undefined) num_runs = 10;
    this.gc_tolerance = num_runs * this.tolerance;
};

// Call this before start() if you want to compute the ratio automatically
// NB: measures will always vary a bit unless we find the perfect calibration code (utopia)
TimeKeeper.prototype.calibrate = function (expected) {
    var t0 = Date.now();
    for (var i = 1; i <= 2000; i++) {
        var m = {};
        for (var n = 1; n <= 100; n++) {
            m[n.to_s()] = n;
        }
        for (var n = 1; n <= 1000; n++) {
            m[n.modulo(100).to_s()] += 1;
        }
    }
    var duration = Date.now() - t0;
    this.ratio = duration / expected;
    console.log('TimeKeeper calibrated at ratio=' + main.strFormat('%.02f', this.ratio) + ' ' + '(ran calibration in ' + main.strFormat('%.03f', duration) + ' instead of ' + expected + ')');
};

// Starts timing
// the expected time given will be adjusted according to the current calibration
TimeKeeper.prototype.start = function (task_name, expected_in_sec, expected_gc) {
    this.task_name = task_name;
    this.expected_time = expected_in_sec * this.ratio;
    this.expected_gc = Math.round(expected_gc);
    console.log('Started "' + task_name + '"...'); // (expected time #{'%.02f' % @expected_time}s)..."
    this.gc0 = main.GC.count();
    this.t0 = Date.now();
};

// Stops timing, displays the report and raises exception if we went over limit
// Unless raise_if_overlimit is false, in which case we would simply log and return the error message
TimeKeeper.prototype.stop = function (raise_if_overlimit) {
    if (raise_if_overlimit === undefined) raise_if_overlimit = true;
    this.duration = Date.now() - this.t0;
    this.num_gc = main.GC.count() - this.gc0;
    console.log(' => ' + this.result_report());
    return this.check_limits(raise_if_overlimit);
};

TimeKeeper.prototype.result_report = function () {
    var s = '';
    s += 'Measuring "' + this.task_name + '":';
    s += ' time: ' + main.strFormat('%.02f', this.duration) + 's (expected ' + main.strFormat('%.02f', this.expected_time) + ' hence ' + main.strFormat('%.02f', (this.duration / this.expected_time * 100)) + '%)';
    s += ' GC runs: ' + this.num_gc + ' (' + this.expected_gc + ')';
};

//private;
TimeKeeper.prototype.check_limits = function (raise_if_overlimit) {
    if (this.duration > this.expected_time * this.tolerance) {
        var msg1 = 'Duration over limit: ' + this.duration;
        if (raise_if_overlimit) {
            throw new Error(msg1);
        }
        return msg1;
    }
    if (this.num_gc > this.expected_gc + this.gc_tolerance) {
        var msg2 = 'GC run number over limit: ' + this.num_gc;
        if (raise_if_overlimit) {
            throw new Error(msg2);
        }
        return msg2;
    }
    return '';
};

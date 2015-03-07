//Translated from test_breeder.rb using babyruby2js
'use strict';

var main = require('./main');
var inherits = require('util').inherits;
var assert_equal = main.assert_equal;
main.test = true;
var Breeder = require('../Breeder');

/** @class */
function TestBreeder(test_name) {
    return main.TestCase.call(this, test_name);
}
inherits(TestBreeder, main.TestCase);
module.exports = TestBreeder;

TestBreeder.prototype.test_bw_balance = function () {
    var num_games = 200;
    var size = 9;
    var tolerance = 0.15; // 0.10=>10% (+ or -); the more games you play the lower tolerance you can set (but it takes more time...)
    var b = new Breeder(size);
    var num_wins = b.bw_balance_check(num_games, size);
    return assert_in_epsilon(num_wins, num_games / 2, tolerance);
};

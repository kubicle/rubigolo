//Translated from test_breeder.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
main.test = true;
var Breeder = require('../Breeder');

/** @class */
function TestBreeder(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestBreeder, main.TestCase);
module.exports = main.tests.add(TestBreeder);

TestBreeder.prototype.testBwBalance = function () {
    var numGames = 200;
    var size = 9;
    var tolerance = 0.15; // 0.10=>10% (+ or -); the more games you play the lower tolerance you can set (but it takes more time...)
    var b = new Breeder(size);
    var numWins = b.bwBalanceCheck(numGames, size);
    return main.assertInDelta(Math.abs(numWins / (numGames / 2)), 1, tolerance);
};

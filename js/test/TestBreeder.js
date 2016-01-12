//Translated from test_breeder.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Breeder = require('../Breeder');
var TestCase = require('./TestCase');


/** @class */
function TestBreeder(testName) {
    TestCase.call(this, testName);
}
inherits(TestBreeder, TestCase);
module.exports = TestBreeder;


// Right now this is just for coverage
TestBreeder.prototype.testBreeding = function () {
    var breeder = new Breeder(5, /*komi=*/0.5);
    breeder.run(2, 1, 1);
};

TestBreeder.prototype.testBwBalance = function () {
    var numGames = 100;
    var numLostGamesShowed = 5;
    var expectedWins = 0.60 * numGames; // number going up shows new AI gets stronger compared to default AI
    var tolerance = numGames * 0.15; // + or -; the more games you play the lower tolerance you can set
    var size = 9, komi = 3.5;

    // For coverage tests no need to run many games
    if (main.isCoverTest) numGames = 1;

    var breeder = new Breeder(size, komi);
    var numWins = breeder.bwBalanceCheck(numGames, size, numLostGamesShowed);

    if (!main.isCoverTest) this.assertInDelta(numWins, expectedWins, tolerance);
};

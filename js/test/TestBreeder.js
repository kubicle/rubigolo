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
    var size = 5, komi = 6.5;
    var genSize = 4;
    var numTournaments = 0;
    var numMatchPerAi = 120;

    if (main.isCoverTest) {
        genSize = 2;
        numTournaments = numMatchPerAi = 1;
    }

    var breeder = new Breeder(size, komi);
    breeder.run(genSize, numTournaments, numMatchPerAi);
};

TestBreeder.prototype.testAiVsAi = function () {
    var size = 9, komi = 3.5;
    var initMoves = 'd4,f6'; //'d4,f6' 73.3%!; 'e5,e3' 57%; 'e5,d4' 75%; 'We5,d4' 97%!; 'We5,e3' <50%
    var numGames = 100;
    var numGamesShowed = 2;
    var expectedWinRatio = 0.60; // number going up shows new AI gets stronger compared to default AI
    var tolerance = 0.15; // + or -; the more games you play the lower tolerance you can set

    // For coverage tests no need to run many games
    if (main.isCoverTest) numGames = 1;

    var breeder = new Breeder(size, komi);
    var winRatio = breeder.aiVsAi(numGames, numGamesShowed, initMoves);

    if (!main.isCoverTest) this.assertInDelta(winRatio, expectedWinRatio, tolerance);
};

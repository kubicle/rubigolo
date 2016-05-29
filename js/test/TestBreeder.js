'use strict';

var inherits = require('util').inherits;
var Breeder = require('./Breeder');
var log = require('../log');
var main = require('../main');
var RefGame = require('./RefGame');
var refGameData = require('./refGames.json');
var TestCase = require('./TestCase');


/** @class */
function TestBreeder(testName) {
    TestCase.call(this, testName);
    log.setLevel(log.INFO); // log.DEBUG is too slow for sure
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
    var size = 9, komi = 5.5;
    var initMoves = ['d4,f6', 'Wd4,f6', 'e5,e3', 'We5,e3', 'e5,d4', 'We5,d4'];
    var totalNumGames = 300;
    var numGamesShowed = 1;
    var expectedWinRatio = 0.60; // number going up shows new AI gets stronger compared to default AI
    var tolerance = 0.1; // + or -; the more games you play the lower tolerance you can set

    var numVariations = initMoves.length;
    // For coverage tests no need to run many games
    if (main.isCoverTest) totalNumGames = numVariations = 1;

    var breeder = new Breeder(size, komi);
    var numGamesPerVariation = Math.round(totalNumGames / numVariations);
    var winRatio = 0, winRatios = [];
    for (var i = 0; i < numVariations; i++) {
        var ratio = breeder.aiVsAi(numGamesPerVariation, numGamesShowed, initMoves[i]);
        winRatios.push(ratio);
        winRatio += ratio;
    }
    winRatio /= numVariations;
    if (log.info) for (i = 0; i < numVariations; i++) log.info(initMoves[i] + ': ' + (winRatios[i] * 100).toFixed(1) + '%');
    if (log.info) log.info('---Average won games for White: ' + (winRatio * 100).toFixed(1) + '%');

    if (!main.isCoverTest) this.assertInDelta(winRatio, expectedWinRatio, tolerance);
};

TestBreeder.prototype.testPlayRefGames = function () {
    var breeder = new Breeder(9, 5.5);
    var numChanges = breeder.playRefGames(refGameData, 10);
    if (log.info) log.info('Played ' + refGameData.length + ' reference games. Differences found: ' + numChanges);
    this.assertEqual(0, numChanges, 'Differences in ref games');
};

TestBreeder.prototype.collectRefGames = function () {
    var gsize = 9, komi = 5.5;
    var initMoves = ['d4,f6', 'Wd4,f6', 'e5,e3', 'We5,e3', 'e5,d4', 'We5,d4'];
    var totalNumGames = 100;

    var numVariations = initMoves.length;
    // For coverage tests no need to run many games
    if (main.isCoverTest) totalNumGames = numVariations = 1;

    var breeder = new Breeder(gsize, komi);
    var updatedGames = [];
    breeder.initRefGameCollection(refGameData, updatedGames);

    var numGamesPerVariation = Math.round(totalNumGames / numVariations);
    for (var i = 0; i < numVariations; i++) {
        breeder.collectRefGames(updatedGames, numGamesPerVariation, gsize, komi, initMoves[i]);
    }

    RefGame.updateRefGames(updatedGames);
};

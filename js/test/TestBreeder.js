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
    var numGames = 100;
    var numLostGamesShowed = 5;
    var expectedWins = 0.85 * numGames; // number going up shows new AI gets stronger compared to default AI
    var tolerance = numGames / 10; // + or -; the more games you play the lower tolerance you can set
    var size = 9;

    // For coverage tests no need to run many games
    if (main.isCoverTest) numGames = 1;

    var breeder = new Breeder(size);
    var numWins = breeder.bwBalanceCheck(numGames, size, numLostGamesShowed);

    if (!main.isCoverTest) this.assertInDelta(numWins, expectedWins, tolerance);
};

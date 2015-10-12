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
    var expectedWins = 81; // number going up shows new AI gets stronger compared to default AI
    var tolerance = 10; // + or -; the more games you play the lower tolerance you can set
    var size = 9;

    var breeder = new Breeder(size);
    var numWins = breeder.bwBalanceCheck(numGames, size);
    this.assertInDelta(numWins, expectedWins, tolerance);
};

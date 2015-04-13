//Translated from test_game_logic.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var assertEqual = main.assertEqual;
var GameLogic = require('../GameLogic');

/** @class TODO: very incomplete test
 */
function TestGameLogic(testName) {
    main.TestCase.call(this, testName);
    return this.initBoard();
}
inherits(TestGameLogic, main.TestCase);
module.exports = main.tests.add(TestGameLogic);

TestGameLogic.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
};

// 3 ways to load the same game with handicap...
TestGameLogic.prototype.testHandicap = function () {
    var game6 = '(;FF[4]KM[0.5]SZ[19]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq])';
    this.game.loadMoves(game6);
    var img = this.goban.image();
    this.game.newGame(19, 6);
    this.game.loadMoves('f3');
    assertEqual(img, this.goban.image());
    // @game.goban.console_display
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    return assertEqual(img, this.goban.image());
};

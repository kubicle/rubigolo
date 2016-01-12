//Translated from test_game_logic.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');


/** @class TODO: very incomplete test
 */
function TestGameLogic(testName) {
    TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestGameLogic, TestCase);
module.exports = TestGameLogic;


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
    this.assertEqual(img, this.goban.image());
    // @game.goban.console_display
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual(img, this.goban.image());
};

TestGameLogic.prototype.testMisc = function () {
    this.game.newGame(19, 0);
    this.game.loadMoves('hand:6,f3');
    this.assertEqual('handicap:6,Wf3 (1 moves)', this.game.historyString());
    this.assertEqual([0,0], this.game.countPrisoners());
    this.assertEqual(true, this.game.playOneMove('resign'));
};

TestGameLogic.prototype.testEnding = function () {
    this.game.newGame(19, 0);
    this.game.loadMoves('load:f3,d4');
    this.game.passOneMove();
    this.assertEqual(false, this.game.gameEnding);
    this.assertEqual(false, this.game.gameEnded);
    this.game.passOneMove();
    this.assertEqual(true, this.game.gameEnding);
    this.assertEqual(false, this.game.gameEnded);
    this.assertEqual(true, this.game.acceptEnding(false, main.WHITE));
    this.assertEqual(false, this.game.gameEnding);
    this.game.passOneMove();
    this.assertEqual(true, this.game.gameEnding);
    this.assertEqual(true, this.game.acceptEnding(true));
    this.assertEqual(false, this.game.gameEnding);
    this.assertEqual(true, this.game.gameEnded);
    this.assertEqual(false, this.game.playOneMove('c5'));
    this.assertEqual(['Game already ended'], this.game.getErrors());
};

TestGameLogic.prototype.testGetErrors = function () {
    this.game.newGame(19, 0);
    this.assertEqual([], this.game.getErrors());
    this.assertEqual(false, this.game.acceptEnding(false));
    this.assertEqual(['The game is not ending yet'], this.game.getErrors());
    this.assertEqual([], this.game.getErrors());
};

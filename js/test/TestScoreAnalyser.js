'use strict';

var CONST = require('../constants');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var EMPTY = CONST.EMPTY;


/** @class */
function TestScoreAnalyser(testName) {
    TestCase.call(this, testName);
}
inherits(TestScoreAnalyser, TestCase);
module.exports = TestScoreAnalyser;


TestScoreAnalyser.prototype.initGame = function (size, komi) {
    if (size === undefined) size = 5;
    this.game = new GameLogic();
    this.game.newGame(size, 0, komi || 0);
    this.sa = new ScoreAnalyser(this.game);
    // when size is 7 we load an ending game to get real score situation
    if (size === 7) {
        // 7 +++++++
        // 6 +++@@@@
        // 5 @*+@OO@
        // 4 O@@@O+O
        // 3 OOOO+O+
        // 2 ++O+O++
        // 1 +++O+++
        //   abcdefg
        this.game.loadMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass');
    }
};

TestScoreAnalyser.prototype.testComputeScore = function () {
    this.initGame(7, 1.5);
    var s = this.sa.computeScoreAsTexts();
    this.assertEqual('white wins by 6.5 points', s.shift());
    this.assertEqual('black: 12 points', s.shift());
    this.assertEqual('white: 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
    // test message when someone resigns
    this.game.playOneMove('resi'); // it is black's turn
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['white won (black resigned)'], s);
    // NB: GameLogic does not forbid to "resign twice", no big deal
    this.game.resign(WHITE, 'time');
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['black won (white ran out of time)'], s);
    this.game.resign(WHITE, 'illegal move');
    s = this.sa.computeScoreAsTexts();
    this.assertEqual(['black won (white disqualified: illegal move)'], s);
};

TestScoreAnalyser.prototype.testComputeScoreDiff = function () {
    this.initGame(7, 3.5);
    this.assertEqual(-8.5, this.sa.computeScoreDiff());
};

TestScoreAnalyser.prototype.testScoreInfo = function () {
    this.initGame(7, 0.5);
    var i = this.sa.computeScoreInfo();
    this.assertEqual([12, 17.5], i.shift());
    this.assertEqual([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.testScoringGrid = function () {
    this.initGame(7, 1.5);
    this.sa.computeScoreDiff();
    var sgridYx = this.sa.getScoringGrid().yx;
    var goban = this.game.goban;
    this.assertEqual(EMPTY, goban.stoneAt(1, 1).color); // score analyser leaves the goban untouched
    this.assertEqual(Grid.TERRITORY_COLOR + WHITE, sgridYx[1][1]); // a1
    this.assertEqual(Grid.TERRITORY_COLOR + BLACK, sgridYx[6][2]); // b6
};

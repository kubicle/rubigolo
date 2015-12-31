//Translated from test_score_analyser.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');


/** @class */
function TestScoreAnalyser(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestScoreAnalyser, main.TestCase);
module.exports = main.tests.add(TestScoreAnalyser);


TestScoreAnalyser.prototype.initGame = function (size) {
    if (size === undefined) size = 5;
    this.game = new GameLogic();
    this.game.newGame(size, 0);
    this.goban = this.game.goban;
    this.sa = new ScoreAnalyser();
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
    this.initGame(7);
    var whoResigned = null;
    var s = this.sa.computeScore(this.goban, 1.5, whoResigned);
    this.assertEqual('white wins by 6.5 points', s.shift());
    this.assertEqual('black: 12 points (12 + 0 prisoners)', s.shift());
    this.assertEqual('white: 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
    // test message when someone resigns
    s = this.sa.computeScore(this.goban, 1.5, main.BLACK);
    this.assertEqual(['white won (since black resigned)'], s);
    s = this.sa.computeScore(this.goban, 1.5, main.WHITE);
    this.assertEqual(['black won (since white resigned)'], s);
};

TestScoreAnalyser.prototype.testComputeScoreDiff = function () {
    this.initGame(7);
    this.assertEqual(-8.5, this.sa.computeScoreDiff(this.goban, 3.5));
};

TestScoreAnalyser.prototype.testStartScoring = function () {
    this.initGame(7);
    var i = this.sa.startScoring(this.goban, 0.5, null);
    this.assertEqual([12, 17.5], i.shift());
    this.assertEqual([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.testScoringGrid = function () {
    this.initGame(7);
    this.sa.startScoring(this.goban, 1.5, null);
    var sgridYx = this.sa.getScoringGrid().yx;
    this.assertEqual(main.EMPTY, this.goban.stoneAt(1, 1).color); // score analyser leaves the goban untouched
    this.assertEqual(Grid.TERRITORY_COLOR + main.WHITE, sgridYx[1][1]); // a1
    this.assertEqual(Grid.TERRITORY_COLOR + main.BLACK, sgridYx[6][2]); // b6
};

TestScoreAnalyser.prototype.testScoreInfoToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    var info = [[10, 12], [[1, 2, 3], [4, 5, 6]]];
    var s = this.sa.scoreInfoToS(info);
    this.assertEqual('white wins by 2 points', s.shift());
    this.assertEqual('black: 10 points (1 + 2 prisoners + 3 komi)', s.shift());
    this.assertEqual('white: 12 points (4 + 5 prisoners + 6 komi)', s.shift());
    this.assertEqual(undefined, s.shift());
};

TestScoreAnalyser.prototype.testScoreDiffToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    this.assertEqual('white wins by 3 points', this.sa.scoreDiffToS(-3));
    this.assertEqual('black wins by 4 points', this.sa.scoreDiffToS(4));
    this.assertEqual('Tie game', this.sa.scoreDiffToS(0));
};

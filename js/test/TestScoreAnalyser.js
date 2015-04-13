//Translated from test_score_analyser.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var assertEqual = main.assertEqual;
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');

/** @class */
function TestScoreAnalyser(testName) {
    return main.TestCase.call(this, testName);
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
        return this.game.loadMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass');
    }
};

TestScoreAnalyser.prototype.testComputeScore = function () {
    this.initGame(7);
    var whoResigned = null;
    var s = this.sa.computeScore(this.goban, 1.5, whoResigned);
    assertEqual('white wins by 6.5 points', s.shift());
    assertEqual('black (@): 12 points (12 + 0 prisoners)', s.shift());
    assertEqual('white (O): 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    assertEqual(null, s.shift());
    // test message when someone resigns
    s = this.sa.computeScore(this.goban, 1.5, main.BLACK);
    assertEqual(['white won (since black resigned)'], s);
    s = this.sa.computeScore(this.goban, 1.5, main.WHITE);
    return assertEqual(['black won (since white resigned)'], s);
};

TestScoreAnalyser.prototype.testComputeScoreDiff = function () {
    this.initGame(7);
    return assertEqual(-8.5, this.sa.computeScoreDiff(this.goban, 3.5));
};

TestScoreAnalyser.prototype.testStartScoring = function () {
    this.initGame(7);
    var i = this.sa.startScoring(this.goban, 0.5, null);
    assertEqual([12, 17.5], i.shift());
    return assertEqual([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.testScoringGrid = function () {
    this.initGame(7);
    this.sa.startScoring(this.goban, 1.5, null);
    assertEqual(main.EMPTY, this.goban.stoneAt(1, 1).color); // score analyser leaves the goban untouched
    assertEqual(Grid.TERRITORY_COLOR + main.WHITE, this.goban.scoringGrid.yx[1][1]); // a1
    return assertEqual(Grid.TERRITORY_COLOR + main.BLACK, this.goban.scoringGrid.yx[6][2]); // b6
};

TestScoreAnalyser.prototype.testScoreInfoToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    var info = [[10, 12], [[1, 2, 3], [4, 5, 6]]];
    var s = this.sa.scoreInfoToS(info);
    assertEqual('white wins by 2 points', s.shift());
    assertEqual('black (@): 10 points (1 + 2 prisoners + 3 komi)', s.shift());
    assertEqual('white (O): 12 points (4 + 5 prisoners + 6 komi)', s.shift());
    return assertEqual(null, s.shift());
};

TestScoreAnalyser.prototype.testScoreDiffToS = function () {
    this.initGame();
    this.sa.computeScore(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    assertEqual('white wins by 3 points', this.sa.scoreDiffToS(-3));
    assertEqual('black wins by 4 points', this.sa.scoreDiffToS(4));
    return assertEqual('Tie game', this.sa.scoreDiffToS(0));
};

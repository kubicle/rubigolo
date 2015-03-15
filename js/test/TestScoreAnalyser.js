//Translated from test_score_analyser.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Grid = require('../Grid');
var assert_equal = main.assert_equal;

var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');

/** @class */
function TestScoreAnalyser(test_name) {
    return main.TestCase.call(this, test_name);
}
inherits(TestScoreAnalyser, main.TestCase);
module.exports = TestScoreAnalyser;

TestScoreAnalyser.prototype.init_game = function (size) {
    if (size === undefined) size = 5;
    this.game = new GameLogic();
    this.game.new_game(size, 0);
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
        return this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass,pass');
    }
};

TestScoreAnalyser.prototype.test_compute_score = function () {
    this.init_game(7);
    var who_resigned = null;
    var s = this.sa.compute_score(this.goban, 1.5, who_resigned);
    assert_equal('white wins by 6.5 points', s.shift());
    assert_equal('black (@): 12 points (12 + 0 prisoners)', s.shift());
    assert_equal('white (O): 18.5 points (14 + 3 prisoners + 1.5 komi)', s.shift());
    assert_equal(null, s.shift());
    // test message when someone resigns
    s = this.sa.compute_score(this.goban, 1.5, main.BLACK);
    assert_equal(['white won (since black resigned)'], s);
    s = this.sa.compute_score(this.goban, 1.5, main.WHITE);
    return assert_equal(['black won (since white resigned)'], s);
};

TestScoreAnalyser.prototype.test_compute_score_diff = function () {
    this.init_game(7);
    return assert_equal(-8.5, this.sa.compute_score_diff(this.goban, 3.5));
};

TestScoreAnalyser.prototype.test_start_scoring = function () {
    this.init_game(7);
    var i = this.sa.start_scoring(this.goban, 0.5, null);
    assert_equal([12, 17.5], i.shift());
    return assert_equal([[12, 0, 0], [14, 3, 0.5]], i.shift());
};

TestScoreAnalyser.prototype.test_scoring_grid = function () {
    this.init_game(7);
    this.sa.start_scoring(this.goban, 1.5, null);
    assert_equal(main.EMPTY, this.goban.stone_at(1, 1).color); // score analyser leaves the goban untouched
    assert_equal(Grid.TERRITORY_COLOR + main.WHITE, this.goban.scoring_grid.yx[1][1]); // a1
    return assert_equal(Grid.TERRITORY_COLOR + main.BLACK, this.goban.scoring_grid.yx[6][2]); // b6
};

TestScoreAnalyser.prototype.test_score_info_to_s = function () {
    this.init_game();
    this.sa.compute_score(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    var info = [[10, 12], [[1, 2, 3], [4, 5, 6]]];
    var s = this.sa.score_info_to_s(info);
    assert_equal('white wins by 2 points', s.shift());
    assert_equal('black (@): 10 points (1 + 2 prisoners + 3 komi)', s.shift());
    assert_equal('white (O): 12 points (4 + 5 prisoners + 6 komi)', s.shift());
    return assert_equal(null, s.shift());
};

TestScoreAnalyser.prototype.test_score_diff_to_s = function () {
    this.init_game();
    this.sa.compute_score(this.goban, 1.5, null); // just to make the test succeed (these methods could be private, actually)
    assert_equal('white wins by 3 points', this.sa.score_diff_to_s(-3));
    assert_equal('black wins by 4 points', this.sa.score_diff_to_s(4));
    return assert_equal('Tie game', this.sa.score_diff_to_s(0));
};

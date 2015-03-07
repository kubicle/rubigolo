//Translated from  using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Logging = require('../Logging');
var GameLogic = require('../GameLogic');
var assert_equal = main.assert_equal;

// TODO: very incomplete test
TestGameLogic.prototype.init_board = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.goban = this.game.goban;
};


/** @class */
function TestGameLogic(test_name) {
    main.Test.Unit.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestGameLogic, main.Test.Unit.TestCase);
module.exports = TestGameLogic;

// 3 ways to load the same game with handicap...
TestGameLogic.prototype.test_handicap = function () {
    var game6 = '(;FF[4]KM[0.5]SZ[19]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq])';
    this.game.load_moves(game6);
    var img = this.goban.image();
    this.game.new_game(19, 6);
    this.game.load_moves('f3');
    assert_equal(img, this.goban.image());
    // @game.goban.console_display
    this.game.new_game(19, 0);
    this.game.load_moves('hand:6,f3');
    return assert_equal(img, this.goban.image());
};

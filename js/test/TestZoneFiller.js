//Translated from test_zone_filler.rb using babyruby2js
'use strict';

var Grid = require('../Grid');
var inherits = require('util').inherits;
var main = require('../main');
var assert_equal = main.assert_equal;
var GameLogic = require('../GameLogic');

var ZoneFiller = require('../ZoneFiller');
// NB: for debugging think of using analyser.debug_dump
// TODO: add tests for group detection while filling
TestZoneFiller.x = 123; // we use this color for replacements - should be rendered as "X"
TestZoneFiller.prototype.init_board = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.goban = this.game.goban;
    this.grid = new Grid(size);
    this.filler = new ZoneFiller(this.goban, this.grid);
};


/** @class */
function TestZoneFiller(test_name) {
    main.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestZoneFiller, main.TestCase);
module.exports = TestZoneFiller;

TestZoneFiller.prototype.test_fill1 = function () {
    // 5 +O+++
    // 4 +@+O+
    // 3 +O+@+
    // 2 +@+O+
    // 1 +++@+
    //   abcde
    this.grid.load_image('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fill_with_color(3, 1, main.EMPTY, TestZoneFiller.x);
    assert_equal('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
    this.grid.load_image('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fill_with_color(1, 3, main.EMPTY, TestZoneFiller.x);
    return assert_equal('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
};

TestZoneFiller.prototype.test_fill2 = function () {
    // 5 +++++
    // 4 +OOO+
    // 3 +O+O+
    // 2 +++O+
    // 1 +OOO+
    //   abcde
    this.grid.load_image('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fill_with_color(3, 3, main.EMPTY, TestZoneFiller.x);
    assert_equal('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.load_image('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fill_with_color(1, 1, main.EMPTY, TestZoneFiller.x);
    assert_equal('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.load_image('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fill_with_color(5, 3, main.EMPTY, TestZoneFiller.x);
    return assert_equal('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
};

TestZoneFiller.prototype.test_fill3 = function () {
    // 5 +++O+
    // 4 +++OO
    // 3 +O+++
    // 2 ++OO+
    // 1 +O+O+
    //   abcde
    this.grid.load_image('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fill_with_color(2, 4, main.EMPTY, TestZoneFiller.x);
    assert_equal('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.load_image('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fill_with_color(2, 2, main.EMPTY, TestZoneFiller.x);
    assert_equal('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.load_image('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fill_with_color(3, 1, main.EMPTY, TestZoneFiller.x);
    assert_equal('+++O+,+++OO,+O+++,++OO+,+OXO+', this.grid.image());
    this.grid.load_image('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fill_with_color(5, 5, main.EMPTY, TestZoneFiller.x);
    return assert_equal('+++OX,+++OO,+O+++,++OO+,+O+O+', this.grid.image());
};

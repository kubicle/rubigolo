'use strict';

var CONST = require('../constants');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var GameLogic = require('../GameLogic');
var main = require('../main');
var TestCase = require('./TestCase');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY;

var CODE_X = 123; // we use this color for replacements - should be rendered as "X"


/** @class NB: for debugging think of using analyser.debug_dump
 *  TODO: add tests for group detection while filling
 */
function TestZoneFiller(testName) {
    TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestZoneFiller, TestCase);
module.exports = TestZoneFiller;


TestZoneFiller.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.grid = new Grid(size, 0, GRID_BORDER);
    this.filler = new main.defaultAi.ZoneFiller(this.goban, this.grid);
};

TestZoneFiller.prototype.testFill1 = function () {
    // 5 +O+++
    // 4 +@+O+
    // 3 +O+@+
    // 2 +@+O+
    // 1 +++@+
    //   abcde
    this.grid.loadImage('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fillWithColor(3, 1, EMPTY, CODE_X);
    this.assertEqual('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
    this.grid.loadImage('+O+++,+@+O+,+O+@+,+@+O+,+++@+');
    this.filler.fillWithColor(1, 3, EMPTY, CODE_X);
    this.assertEqual('XOXXX,X@XOX,XOX@X,X@XOX,XXX@X', this.grid.image());
};

TestZoneFiller.prototype.testFill2 = function () {
    // 5 +++++
    // 4 +OOO+
    // 3 +O+O+
    // 2 +++O+
    // 1 +OOO+
    //   abcde
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(3, 3, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(1, 1, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
    this.grid.loadImage('+++++,+OOO+,+O+O+,+++O+,+OOO+');
    this.filler.fillWithColor(5, 3, EMPTY, CODE_X);
    this.assertEqual('XXXXX,XOOOX,XOXOX,XXXOX,XOOOX', this.grid.image());
};

TestZoneFiller.prototype.testFill3 = function () {
    // 5 +++O+
    // 4 +++OO
    // 3 +O+++
    // 2 ++OO+
    // 1 +O+O+
    //   abcde
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(2, 4, EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(2, 2, EMPTY, CODE_X);
    this.assertEqual('XXXO+,XXXOO,XOXXX,XXOOX,XO+OX', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(3, 1, EMPTY, CODE_X);
    this.assertEqual('+++O+,+++OO,+O+++,++OO+,+OXO+', this.grid.image());
    this.grid.loadImage('+++O+,+++OO,+O+++,++OO+,+O+O+');
    this.filler.fillWithColor(5, 5, EMPTY, CODE_X);
    this.assertEqual('+++OX,+++OO,+O+++,++OO+,+O+O+', this.grid.image());
};

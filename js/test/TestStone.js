'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Goban = require('../Goban');
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestStone(testName) {
    TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestStone, TestCase);
module.exports = TestStone;


TestStone.prototype.testStoneInternals = function () {
    var s = this.goban.playAt(5, 4, BLACK);
    this.assertEqual('B-e4', s.toString());
    this.assertEqual('e3', this.goban.stoneAt(5,3).toString());
};

TestStone.prototype.howManyLives = function (i, j) {
    var s = this.goban.stoneAt(i, j);
    var livesBefore = s.empties().length;
    // we test the play/undo too
    s = this.goban.playAt(i, j, WHITE);
    var lives = s.empties().length;
    this.assertEqual(livesBefore, lives);
    this.goban.undo();
    var livesAfter = s.empties().length;
    this.assertEqual(livesAfter, lives);
    return lives;
};

// Not very useful anymore for stones
TestStone.prototype.testHowManyLives = function () {
    this.assertEqual(2, this.howManyLives(1, 1));
    this.assertEqual(2, this.howManyLives(this.goban.gsize, this.goban.gsize));
    this.assertEqual(2, this.howManyLives(1, this.goban.gsize));
    this.assertEqual(2, this.howManyLives(this.goban.gsize, 1));
    this.assertEqual(4, this.howManyLives(2, 2));
    this.assertEqual(4, this.howManyLives(this.goban.gsize - 1, this.goban.gsize - 1));
    var s = this.goban.playAt(2, 2, BLACK); // we will try white stones around this one
    var g = s.group;
    this.assertEqual(2, this.howManyLives(1, 1));
    this.assertEqual(4, g.lives);
    this.assertEqual(2, this.howManyLives(1, 2));
    this.assertEqual(4, g.lives); // verify the live count did not change
    this.assertEqual(2, this.howManyLives(2, 1));
    this.assertEqual(3, this.howManyLives(2, 3));
    this.assertEqual(3, this.howManyLives(3, 2));
    this.assertEqual(4, this.howManyLives(3, 3));
};

TestStone.prototype.testPlayAt = function () {
    // single stone
    var s = this.goban.playAt(5, 4, BLACK);
    this.assertEqual(s, this.goban.stoneAt(5, 4));
    this.assertEqual(this.goban, s.goban);
    this.assertEqual(BLACK, s.color);
    this.assertEqual(5, s.i);
    this.assertEqual(4, s.j);
};

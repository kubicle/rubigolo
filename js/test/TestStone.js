//Translated from test_stone.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Stone = require('../Stone');
var Goban = require('../Goban');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestStone(testName) {
    main.TestCase.call(this, testName);
    this.initBoard();
}
inherits(TestStone, main.TestCase);
module.exports = main.tests.add(TestStone);


TestStone.prototype.initBoard = function () {
    this.goban = new Goban(5);
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

TestStone.prototype.testSuicide = function () {
    // a2 b2 b1 a3 pass c1
    this.goban.playAt(1, 2, BLACK);
    this.goban.playAt(2, 2, WHITE);
    this.goban.playAt(2, 1, BLACK);
    this.assertEqual(false, this.goban.isValidMove(1, 1, WHITE)); // suicide invalid
    this.goban.playAt(1, 3, WHITE);
    this.assertEqual(true, this.goban.isValidMove(1, 1, WHITE)); // now this would be a kill
    this.assertEqual(true, this.goban.isValidMove(1, 1, BLACK)); // black could a1 too (merge)
    this.goban.playAt(3, 1, WHITE); // now 2 black stones share a last life
    this.assertEqual(false, this.goban.isValidMove(1, 1, BLACK)); // so this would be a suicide with merge
};

TestStone.prototype.testKo = function () {
    // pass b2 a2 a3 b1 a1
    this.goban.playAt(2, 2, WHITE);
    this.goban.playAt(1, 2, BLACK);
    this.goban.playAt(1, 3, WHITE);
    this.goban.playAt(2, 1, BLACK);
    this.goban.playAt(1, 1, WHITE); // kill!
    this.assertEqual(false, this.goban.isValidMove(1, 2, BLACK)); // now this is a ko
    this.goban.playAt(4, 4, BLACK); // play once anywhere else
    this.goban.playAt(4, 5, WHITE);
    this.assertEqual(true, this.goban.isValidMove(1, 2, BLACK)); // ko can be taken by black
    this.goban.playAt(1, 2, BLACK); // black takes the ko
    this.assertEqual(false, this.goban.isValidMove(1, 1, WHITE)); // white cannot take the ko
    this.goban.playAt(5, 5, WHITE); // play once anywhere else
    this.goban.playAt(5, 4, BLACK);
    this.assertEqual(true, this.goban.isValidMove(1, 1, WHITE)); // ko can be taken back by white
    this.goban.playAt(1, 1, WHITE); // white takes the ko
    this.assertEqual(false, this.goban.isValidMove(1, 2, BLACK)); // and black cannot take it now
};

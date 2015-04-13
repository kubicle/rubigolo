//Translated from test_stone.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Stone = require('../Stone');
var assertEqual = main.assertEqual;
var Goban = require('../Goban');

/** @class NB: for debugging think of using @goban.console_display
 */
function TestStone(testName) {
    main.TestCase.call(this, testName);
    return this.initBoard();
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
    s = Stone.playAt(this.goban, i, j, main.WHITE);
    var lives = s.empties().length;
    assertEqual(livesBefore, lives);
    Stone.undo(this.goban);
    var livesAfter = s.empties().length;
    assertEqual(livesAfter, lives);
    return lives;
};

// Not very useful anymore for stones
TestStone.prototype.testHowManyLives = function () {
    assertEqual(2, this.howManyLives(1, 1));
    assertEqual(2, this.howManyLives(this.goban.gsize, this.goban.gsize));
    assertEqual(2, this.howManyLives(1, this.goban.gsize));
    assertEqual(2, this.howManyLives(this.goban.gsize, 1));
    assertEqual(4, this.howManyLives(2, 2));
    assertEqual(4, this.howManyLives(this.goban.gsize - 1, this.goban.gsize - 1));
    var s = Stone.playAt(this.goban, 2, 2, main.BLACK); // we will try white stones around this one
    var g = s.group;
    assertEqual(2, this.howManyLives(1, 1));
    assertEqual(4, g.lives);
    assertEqual(2, this.howManyLives(1, 2));
    assertEqual(4, g.lives); // verify the live count did not change
    assertEqual(2, this.howManyLives(2, 1));
    assertEqual(3, this.howManyLives(2, 3));
    assertEqual(3, this.howManyLives(3, 2));
    return assertEqual(4, this.howManyLives(3, 3));
};

TestStone.prototype.testPlayAt = function () {
    // single stone
    var s = Stone.playAt(this.goban, 5, 4, main.BLACK);
    assertEqual(s, this.goban.stoneAt(5, 4));
    assertEqual(this.goban, s.goban);
    assertEqual(main.BLACK, s.color);
    assertEqual(5, s.i);
    return assertEqual(4, s.j);
};

TestStone.prototype.testSuicide = function () {
    // a2 b2 b1 a3 pass c1
    Stone.playAt(this.goban, 1, 2, main.BLACK);
    Stone.playAt(this.goban, 2, 2, main.WHITE);
    Stone.playAt(this.goban, 2, 1, main.BLACK);
    assertEqual(false, Stone.validMove(this.goban, 1, 1, main.WHITE)); // suicide invalid
    Stone.playAt(this.goban, 1, 3, main.WHITE);
    assertEqual(true, Stone.validMove(this.goban, 1, 1, main.WHITE)); // now this would be a kill
    assertEqual(true, Stone.validMove(this.goban, 1, 1, main.BLACK)); // black could a1 too (merge)
    Stone.playAt(this.goban, 3, 1, main.WHITE); // now 2 black stones share a last life
    return assertEqual(false, Stone.validMove(this.goban, 1, 1, main.BLACK)); // so this would be a suicide with merge
};

TestStone.prototype.testKo = function () {
    // pass b2 a2 a3 b1 a1
    Stone.playAt(this.goban, 2, 2, main.WHITE);
    Stone.playAt(this.goban, 1, 2, main.BLACK);
    Stone.playAt(this.goban, 1, 3, main.WHITE);
    Stone.playAt(this.goban, 2, 1, main.BLACK);
    Stone.playAt(this.goban, 1, 1, main.WHITE); // kill!
    assertEqual(false, Stone.validMove(this.goban, 1, 2, main.BLACK)); // now this is a ko
    Stone.playAt(this.goban, 4, 4, main.BLACK); // play once anywhere else
    Stone.playAt(this.goban, 4, 5, main.WHITE);
    assertEqual(true, Stone.validMove(this.goban, 1, 2, main.BLACK)); // ko can be taken by black
    Stone.playAt(this.goban, 1, 2, main.BLACK); // black takes the ko
    assertEqual(false, Stone.validMove(this.goban, 1, 1, main.WHITE)); // white cannot take the ko
    Stone.playAt(this.goban, 5, 5, main.WHITE); // play once anywhere else
    Stone.playAt(this.goban, 5, 4, main.BLACK);
    assertEqual(true, Stone.validMove(this.goban, 1, 1, main.WHITE)); // ko can be taken back by white
    Stone.playAt(this.goban, 1, 1, main.WHITE); // white takes the ko
    return assertEqual(false, Stone.validMove(this.goban, 1, 2, main.BLACK)); // and black cannot take it now
};

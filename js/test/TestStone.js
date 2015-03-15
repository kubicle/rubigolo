//Translated from test_stone.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Stone = require('../Stone');
var main = require('../main');
var assertEqual = main.assertEqual;

var Goban = require('../Goban');


/** @class */
function TestStone(test_name) {
    main.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestStone, main.TestCase);
module.exports = main.tests.add(TestStone);

// NB: for debugging think of using @goban.console_display
TestStone.prototype.init_board = function () {
    this.goban = new Goban(5);
};

TestStone.prototype.how_many_lives = function (i, j) {
    var s = this.goban.stone_at(i, j);
    var lives_before = s.empties().size;
    // we test the play/undo too
    s = Stone.play_at(this.goban, i, j, main.WHITE);
    var lives = s.empties().size;
    assertEqual(lives_before, lives);
    Stone.undo(this.goban);
    var lives_after = s.empties().size;
    assertEqual(lives_after, lives);
    return lives;
};

// Not very useful anymore for stones
TestStone.prototype.test_how_many_lives = function () {
    assertEqual(2, this.how_many_lives(1, 1));
    assertEqual(2, this.how_many_lives(this.goban.size, this.goban.size));
    assertEqual(2, this.how_many_lives(1, this.goban.size));
    assertEqual(2, this.how_many_lives(this.goban.size, 1));
    assertEqual(4, this.how_many_lives(2, 2));
    assertEqual(4, this.how_many_lives(this.goban.size - 1, this.goban.size - 1));
    var s = Stone.play_at(this.goban, 2, 2, main.BLACK); // we will try white stones around this one
    var g = s.group;
    assertEqual(2, this.how_many_lives(1, 1));
    assertEqual(4, g.lives);
    assertEqual(2, this.how_many_lives(1, 2));
    assertEqual(4, g.lives); // verify the live count did not change
    assertEqual(2, this.how_many_lives(2, 1));
    assertEqual(3, this.how_many_lives(2, 3));
    assertEqual(3, this.how_many_lives(3, 2));
    return assertEqual(4, this.how_many_lives(3, 3));
};

TestStone.prototype.test_play_at = function () {
    // single stone
    var s = Stone.play_at(this.goban, 5, 4, main.BLACK);
    assertEqual(s, this.goban.stone_at(5, 4));
    assertEqual(this.goban, s.goban);
    assertEqual(main.BLACK, s.color);
    assertEqual(5, s.i);
    return assertEqual(4, s.j);
};

TestStone.prototype.test_suicide = function () {
    // a2 b2 b1 a3 pass c1
    Stone.play_at(this.goban, 1, 2, main.BLACK);
    Stone.play_at(this.goban, 2, 2, main.WHITE);
    Stone.play_at(this.goban, 2, 1, main.BLACK);
    assertEqual(false, Stone.valid_move(this.goban, 1, 1, main.WHITE)); // suicide invalid
    Stone.play_at(this.goban, 1, 3, main.WHITE);
    assertEqual(true, Stone.valid_move(this.goban, 1, 1, main.WHITE)); // now this would be a kill
    assertEqual(true, Stone.valid_move(this.goban, 1, 1, main.BLACK)); // black could a1 too (merge)
    Stone.play_at(this.goban, 3, 1, main.WHITE); // now 2 black stones share a last life
    return assertEqual(false, Stone.valid_move(this.goban, 1, 1, main.BLACK)); // so this would be a suicide with merge
};

TestStone.prototype.test_ko = function () {
    // pass b2 a2 a3 b1 a1
    Stone.play_at(this.goban, 2, 2, main.WHITE);
    Stone.play_at(this.goban, 1, 2, main.BLACK);
    Stone.play_at(this.goban, 1, 3, main.WHITE);
    Stone.play_at(this.goban, 2, 1, main.BLACK);
    Stone.play_at(this.goban, 1, 1, main.WHITE); // kill!
    assertEqual(false, Stone.valid_move(this.goban, 1, 2, main.BLACK)); // now this is a ko
    Stone.play_at(this.goban, 4, 4, main.BLACK); // play once anywhere else
    Stone.play_at(this.goban, 4, 5, main.WHITE);
    assertEqual(true, Stone.valid_move(this.goban, 1, 2, main.BLACK)); // ko can be taken by black
    Stone.play_at(this.goban, 1, 2, main.BLACK); // black takes the ko
    assertEqual(false, Stone.valid_move(this.goban, 1, 1, main.WHITE)); // white cannot take the ko
    Stone.play_at(this.goban, 5, 5, main.WHITE); // play once anywhere else
    Stone.play_at(this.goban, 5, 4, main.BLACK);
    assertEqual(true, Stone.valid_move(this.goban, 1, 1, main.WHITE)); // ko can be taken back by white
    Stone.play_at(this.goban, 1, 1, main.WHITE); // white takes the ko
    return assertEqual(false, Stone.valid_move(this.goban, 1, 2, main.BLACK)); // and black cannot take it now
};

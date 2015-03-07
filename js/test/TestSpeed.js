//Translated from test_speed.rb using babyruby2js
'use strict';

var main = require('./main');
var Logger = require('./Logger');
var inherits = require('util').inherits;
var Grid = require('./Grid');
var Stone = require('./Stone');
var Goban = require('../Goban');
var TimeKeeper = require('../TimeKeeper');
var assert_equal = main.assert_equal;

main.debug = false; // if true it takes forever...
main.log.level=(Logger.ERROR);
main.count = 0;

/** @class */
function TestSpeed(test_name) {
    main.Test.Unit.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestSpeed, main.Test.Unit.TestCase);
module.exports = TestSpeed;


TestSpeed.prototype.init_board = function (size) {
    if (size === undefined) size = 9;
    this.goban = new Goban(size);
};

TestSpeed.CM_UNDO = [0, TestSpeed.CM_CLEAR = 1, TestSpeed.CM_NEW = 2];

// Not very fancy: add the line $count += 1 wherever you want to count.
// Need some time to try a good profiler soon...
TestSpeed.prototype.show_count = function () {
    if (main.count !== 0) {
        console.log('Code called ' + main.count + ' times');
        main.count = 0;
    }
};

TestSpeed.prototype.test_speed1 = function () {
    var tolerance = 1.2;
    var t = new TimeKeeper(tolerance);
    t.calibrate(3.2);
    if (main.test_all) {
        console.log('Ignore the GC numbers below.');
        console.log('Reason: when we run other tests before the speed test the GC has some catch-up to do.');
        t.set_gc_tolerance(20);
    }
    // Basic test
    t.start('Basic (no move validation) 100,000 stones and undo', 2.8, 0);
    for (var i = 1; i <= 10000; i++) {
        this.play_10_stones();
    }
    t.stop();
    this.show_count();
    // prepare games so we isolate the GC caused by that 
    // (in real AI thinking there will be many other things but...)
    // 35 moves, final position:
    // 9 +++@@O+++
    // 8 +O@@OO+++
    // 7 +@+@@O+++
    // 6 ++@OO++++
    // 5 ++@@O++++
    // 4 ++@+@O+++
    // 3 ++@+@O+++
    // 2 ++O@@O+O+
    // 1 ++++@@O++
    //   abcdefghi
    var game1 = 'c3,f3,d7,e5,c5,f7,e2,e8,d8,f2,f1,g1,e1,h2,e3,d4,e4,f4,d5,d3,d2,c2,c4,d6,e7,e6,c6,f8,e9,f9,d9,c7,c8,b8,b7';
    var game1_moves_ij = this.moves_ij(game1);
    t.start('35 move game, 2000 times and undo', 3.4, 1);
    for (i = 1; i <= 2000; i++) {
        this.play_game_and_clean(game1_moves_ij, TestSpeed.CM_UNDO);
    }
    t.stop();
    this.show_count();
    // The idea here is to verify that undoing things is cheaper than throwing it all to GC
    // In a tree exploration strategy the undo should be the only way (otherwise we quickly hog all memory)
    t.start('35 move game, 2000 times new board each time', 4.87, 15);
    for (i = 1; i <= 2000; i++) {
        this.play_game_and_clean(game1_moves_ij, TestSpeed.CM_NEW);
    }
    t.stop();
    this.show_count();
    // And here we see that the "clear" is the faster way to restart a game 
    // (and that it does not "leak" anything to GC)
    t.start('35 move game, 2000 times, clear board each time', 2.5, 1);
    for (i = 1; i <= 2000; i++) {
        this.play_game_and_clean(game1_moves_ij, TestSpeed.CM_CLEAR);
    }
    t.stop();
    return this.show_count();
};

TestSpeed.prototype.test_speed2 = function () {
    var tolerance = 1.1;
    var t = new TimeKeeper(tolerance);
    t.calibrate(0.7);
    // 9 ++O@@++++
    // 8 +@OO@++@+
    // 7 OOOO@@@++
    // 6 ++OOOOO@@
    // 5 OO@@O@@@@
    // 4 @@@+OOOO@
    // 3 O@@@@@O+O
    // 2 +++@OOO++
    // 1 +++@@O+++
    //   abcdefghi
    var game2 = 'c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,i5,i6,e4,i4,i3,h8,c8,d3,i5,f3,g2,i4,b5,b4,a5,i5';
    var game2_moves_ij = this.moves_ij(game2);
    // validate the game once
    this.play_moves(game2_moves_ij);
    var final_pos = '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++';
    assert_equal(final_pos, this.goban.image());
    this.init_board();
    t.start('63 move game, 2000 times and undo', 1.56, 3);
    for (var i = 1; i <= 2000; i++) {
        this.play_game_and_clean(game2_moves_ij, TestSpeed.CM_UNDO);
    }
    t.stop();
    return this.show_count();
};

// Converts "a1,b2" in [1,1,2,2]
TestSpeed.prototype.moves_ij = function (game) {
    return game.split(',').collect_concat(function (m) {
        return Grid.parse_move(m);
    });
};

TestSpeed.prototype.play_moves = function (moves_ij) {
    var move_count = 0;
    var cur_color = main.BLACK;
    for (var n = 0; n <= moves_ij.size - 2; n += 2) {
        var i = moves_ij[n];
        var j = moves_ij[n + 1];
        if (!Stone.valid_move(this.goban, i, j, cur_color)) {
            throw new Error('Invalid move: ' + i + ',' + j);
        }
        Stone.play_at(this.goban, i, j, cur_color);
        move_count += 1;
        cur_color = (cur_color + 1) % 2;
    }
    return move_count;
};

TestSpeed.prototype.play_game_and_clean = function (moves_ij, clean_mode) {
    var num_moves = moves_ij.size / 2;
    if (main.debug) {
        main.log.debug('About to play a game of ' + num_moves + ' moves');
    }
    assert_equal(num_moves, this.play_moves(moves_ij));
    switch (clean_mode) {
    case TestSpeed.CM_UNDO:
        for (var i = 1; i <= num_moves; i++) {
            Stone.undo(this.goban);
        }
        break;
    case TestSpeed.CM_CLEAR:
        this.goban.clear();
        break;
    case TestSpeed.CM_NEW:
        this.init_board();
        break;
    default: 
        throw('Invalid clean mode');
    }
    return assert_equal(null, this.goban.previous_stone());
};

// Our first, basic test
TestSpeed.prototype.play_10_stones = function () {
    Stone.play_at(this.goban, 2, 2, main.WHITE);
    Stone.play_at(this.goban, 1, 2, main.BLACK);
    Stone.play_at(this.goban, 1, 3, main.WHITE);
    Stone.play_at(this.goban, 2, 1, main.BLACK);
    Stone.play_at(this.goban, 1, 1, main.WHITE);
    Stone.play_at(this.goban, 4, 4, main.BLACK);
    Stone.play_at(this.goban, 4, 5, main.WHITE);
    Stone.play_at(this.goban, 1, 2, main.BLACK);
    Stone.play_at(this.goban, 5, 5, main.WHITE);
    Stone.play_at(this.goban, 5, 4, main.BLACK);
    for (var i = 1; i <= 10; i++) {
        Stone.undo(this.goban);
    }
};

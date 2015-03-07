//Translated from test_group.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Stone = require('./Stone');
var main = require('./main');
var Logging = require('../Logging');
var GameLogic = require('../GameLogic');
var assert_equal = main.assert_equal;

// NB: for debugging think of using @goban.debug_display
TestGroup.prototype.init_board = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.game.messages_to_console();
    this.goban = this.game.goban;
};


/** @class */
function TestGroup(test_name) {
    main.Test.Unit.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestGroup, main.Test.Unit.TestCase);
module.exports = TestGroup;

TestGroup.prototype.test_group_merge = function () {
    // check the sentinel
    assert_equal(1, this.goban.merged_groups.size);
    assert_equal(-1, this.goban.merged_groups[0].color);
    assert_equal(1, this.goban.killed_groups.size);
    assert_equal(-1, this.goban.killed_groups[0].color);
    // single stone
    var s = Stone.play_at(this.goban, 4, 3, main.BLACK);
    var g = s.group;
    assert_equal(this.goban, g.goban);
    assert_equal([s], g.stones);
    assert_equal(4, g.lives);
    assert_equal(main.BLACK, g.color);
    assert_equal(null, g.merged_by);
    assert_equal(null, g.killed_by);
    // connect a stone to 1 group
    var s2 = Stone.play_at(this.goban, 4, 2, main.BLACK);
    assert_equal(g, s.group); // not changed
    assert_equal([s, s2], g.stones);
    assert_equal(6, g.lives);
    assert_equal(null, g.merged_by);
    assert_equal(s2.group, g); // same group    
    // connect 2 groups of 1 stone each
    // (s1 on top, s2 2 rows below, and s3 between them)
    var s1 = Stone.play_at(this.goban, 2, 5, main.WHITE);
    var g1 = s1.group;
    s2 = Stone.play_at(this.goban, 2, 3, main.WHITE);
    var g2 = s2.group;
    var s3 = Stone.play_at(this.goban, 2, 4, main.WHITE);
    g = s3.group;
    assert_equal(g1, g); // g1 was kept because on top of stone (comes first)
    assert_equal(g, s1.group);
    assert_equal(g, s2.group);
    assert_equal(7, g.lives);
    assert_equal([s1, s3, s2], g.stones);
    assert_equal(main.WHITE, g.color);
    assert_equal(null, g.merged_by);
    assert_equal(g, g2.merged_with); // g2 was merged into g/g1
    assert_equal(s3, g2.merged_by);
    assert_equal([s2], g2.stones); // g2 still knows s2; will be used for reversing
    // check the list in goban
    assert_equal(2, this.goban.merged_groups.size);
    return assert_equal(g2, this.goban.merged_groups[this.goban.merged_groups.length-1]);
};

TestGroup.prototype.test_group_kill = function () {
    Stone.play_at(this.goban, 1, 5, main.WHITE); // a5
    var s = Stone.play_at(this.goban, 1, 4, main.WHITE); // a4
    var g = s.group;
    assert_equal(3, g.lives);
    var b1 = Stone.play_at(this.goban, 2, 4, main.BLACK); // b4
    Stone.play_at(this.goban, 2, 5, main.BLACK); // b5
    var bg = b1.group;
    assert_equal(1, g.lives); // g in atari
    assert_equal(3, bg.lives); // black group has 3 lives because of white group on its left
    s = Stone.play_at(this.goban, 1, 3, main.BLACK); // kill!
    assert_equal(5, bg.lives); // black group has now 5 lives
    assert_equal(0, g.lives); // dead
    assert_equal(s, g.killed_by);
    assert_equal(true, this.goban.stone_at(1, 5).empty());
    return assert_equal(true, this.goban.stone_at(1, 4).empty());
};

// Shape like  O <- the new stone brings only 2 lives
//            OO    because the one in 3,4 was already owned
TestGroup.prototype.test_shared_lives_on_connect = function () {
    Stone.play_at(this.goban, 3, 3, main.WHITE);
    var s = Stone.play_at(this.goban, 4, 3, main.WHITE);
    assert_equal(6, s.group.lives);
    var s2 = Stone.play_at(this.goban, 4, 4, main.WHITE);
    assert_equal(7, s2.group.lives);
    Stone.undo(this.goban);
    return assert_equal(6, s.group.lives); // @goban.debug_display
};

// Shape like  OO
//              O <- the new stone brings 1 life but shared lives 
//             OO    are not counted anymore in merged group
TestGroup.prototype.test_shared_lives_on_merge = function () {
    Stone.play_at(this.goban, 3, 2, main.WHITE);
    var s1 = Stone.play_at(this.goban, 4, 2, main.WHITE);
    assert_equal(6, s1.group.lives);
    var s2 = Stone.play_at(this.goban, 3, 4, main.WHITE);
    assert_equal(4, s2.group.lives);
    Stone.play_at(this.goban, 4, 4, main.WHITE);
    assert_equal(6, s2.group.lives);
    var s3 = Stone.play_at(this.goban, 4, 3, main.WHITE);
    assert_equal(10, s3.group.lives);
    Stone.undo(this.goban);
    assert_equal(6, s1.group.lives);
    assert_equal(6, s2.group.lives);
    Stone.undo(this.goban);
    return assert_equal(4, s2.group.lives); // @goban.debug_display
};

// Case of connect + kill at the same time
// Note the quick way to play a few stones for a test
// (methods writen before this one used the old, painful style)
TestGroup.prototype.test_case_1 = function () {
    this.game.load_moves('a2,a1,b2,b1,c2,d1,pass,e1,c1');
    var s = this.goban.stone_at(1, 2);
    return assert_equal(6, s.group.lives);
};

// Other case
// OOO
//   O <- new stone
// OOO
TestGroup.prototype.test_shared_lives2 = function () {
    this.game.load_moves('a1,pass,a3,pass,b3,pass,b1,pass,c1,pass,c3,pass,c2');
    var s = this.goban.stone_at(1, 1);
    assert_equal(8, s.group.lives);
    Stone.undo(this.goban);
    assert_equal(4, s.group.lives);
    this.goban.stone_at(3, 1);
    return assert_equal(4, s.group.lives); // @goban.debug_display
};

TestGroup.prototype.check_group = function (g, ndx, num_stones, color, stones, lives) {
    assert_equal(ndx, g.ndx);
    assert_equal(num_stones, g.stones.size);
    assert_equal(color, g.color);
    assert_equal(lives, g.lives);
    return assert_equal(stones, g.stones_dump());
};

TestGroup.prototype.check_stone = function (s, color, move, around) {
    assert_equal(color, s.color);
    assert_equal(move, s.as_move());
    return assert_equal(around, s.empties_dump());
};

// Verifies the around values are updated after merge
// 5 +++++
// 4 ++@++
// 3 OOO++
// 2 @++++
// 1 +++++
//   abcde
TestGroup.prototype.test_merge_and_around = function () {
    var b1 = Stone.play_at(this.goban, 1, 3, main.BLACK);
    var bg1 = b1.group;
    var w1 = Stone.play_at(this.goban, 1, 2, main.WHITE);
    assert_equal(2, w1.group.lives);
    var b2 = Stone.play_at(this.goban, 3, 3, main.BLACK);
    var bg2 = b2.group;
    assert_equal(true, bg1 !== bg2);
    var w2 = Stone.play_at(this.goban, 3, 4, main.WHITE);
    for (var i = 1; i <= 3; i++) {
        // ++@
        // O+O
        // @++      
        this.goban.stone_at(4, 3);
        // now merge black groups:
        var b3 = Stone.play_at(this.goban, 2, 3, main.BLACK);
        assert_equal(true, (b1.group === b2.group) && (b3.group === b1.group));
        assert_equal(3, b1.group.ndx); // and group #3 was used as main (not mandatory but for now it is the case)
        assert_equal(5, b1.group.lives);
        // now get back a bit
        Stone.undo(this.goban);
        this.check_group(bg1, 1, 1, 0, 'a3', 2); // group #1 of 1 black stones [a3], lives:2
        this.check_stone(b1, 0, 'a3', 'a4,b3'); // stoneO:a3 around:  +[a4 b3]
        this.check_group(w1.group, 2, 1, 1, 'a2', 2); // group #2 of 1 white stones [a2], lives:2
        this.check_stone(w1, 1, 'a2', 'a1,b2'); // stone@:a2 around:  +[a1 b2]
        this.check_group(bg2, 3, 1, 0, 'c3', 3); // group #3 of 1 black stones [c3], lives:3
        this.check_stone(b2, 0, 'c3', 'b3,c2,d3'); // stoneO:c3 around:  +[d3 c2 b3]
        this.check_group(w2.group, 4, 1, 1, 'c4', 3); // group #4 of 1 white stones [c4], lives:3 
        this.check_stone(w2, 1, 'c4', 'b4,c5,d4'); // stone@:c4 around:  +[c5 d4 b4]
        // the one below is nasty: we connect with black, then undo and reconnect with white
        assert_equal(main.BLACK, this.game.cur_color); // otherwise things are reversed below
        this.game.load_moves('c2,b2,pass,b4,b3,undo,b4,pass,b3');
        // +++++ 5 +++++
        // +@@++ 4 +@@++
        // OOO++ 3 O@O++
        // @@O++ 2 @@O++
        // +++++ 1 +++++
        // abcde   abcde
        this.check_group(bg1, 1, 1, 0, 'a3', 1); // group #1 of 1 black stones [a3], lives:1
        this.check_stone(b1, 0, 'a3', 'a4'); // stoneO:a3 around:  +[a4]
        var wgm = w1.group; // white group after merge
        this.check_group(wgm, 4, 5, 1, 'a2,b2,b3,b4,c4', 6);
        this.check_stone(w1, 1, 'a2', 'a1'); // stone@:a2 around:  +[a1]
        this.check_stone(this.goban.stone_at(2, 2), 1, 'b2', 'b1'); // stone@:b2 around:  +[b1]
        this.check_stone(this.goban.stone_at(2, 3), 1, 'b3', ''); // stone@:b3 around:  +[]
        this.check_stone(this.goban.stone_at(2, 4), 1, 'b4', 'a4,b5'); // stone@:b4 around:  +[b5 a4]
        this.check_stone(w2, 1, 'c4', 'c5,d4'); // stone@:c4 around:  +[c5 d4]
        this.check_group(bg2, 3, 2, 0, 'c2,c3', 3); // group #3 of 2 black stones [c3,c2], lives:3
        this.check_stone(b2, 0, 'c3', 'd3'); // stoneO:c3 around:  +[d3]
        this.check_stone(this.goban.stone_at(3, 2), 0, 'c2', 'c1,d2'); // stoneO:c2 around:  +[d2 c1]
        this.game.load_moves('undo,undo,undo');
        assert_equal(0, this.game.move_number()); // @goban.debug_display # if any assert shows you might need this to understand what happened...
    }
};

// Fixed bug. This was when undo removes a "kill" and restores a stone 
// ...which attacks (wrongfully) the undone stone
TestGroup.prototype.test_ko_bug1 = function () {
    this.init_board(9, 5);
    return this.game.load_moves('e4,e3,f5,f4,g4,f2,f3,d1,f4,undo,d2,c2,f4,d1,f3,undo,c1,d1,f3,g1,f4,undo,undo,f6');
};

// At the same time a stone kills (with 0 lives left) and connects to existing surrounded group,
// killing actually the enemy around. We had wrong raise showing since at a point the group
// we connect to has 0 lives. We simply made the raise test accept 0 lives as legit.
TestGroup.prototype.test_kamikaze_kill_while_connect = function () {
    this.init_board(5, 0);
    return this.game.load_moves('a1,a3,b3,a4,b2,b1,b4,pass,a5,a2,a1,a2,undo,undo');
};

// This was not a bug actually but the test is nice to have.
TestGroup.prototype.test_ko_2 = function () {
    this.init_board(5, 0);
    this.game.load_moves('a3,b3,b4,c2,b2,b1,c3,a2,pass,b3');
    // @game.history.each do |move| puts(move) end
    assert_equal(false, Stone.valid_move(this.goban, 2, 2, main.BLACK)); // KO
    this.game.load_moves('e5,d5');
    assert_equal(true, Stone.valid_move(this.goban, 2, 2, main.BLACK)); // KO can be taken again
    this.game.load_moves('undo');
    return assert_equal(false, Stone.valid_move(this.goban, 2, 2, main.BLACK)); // since we are back to the ko time because of undo
};

// Fixed. Bug was when undo was picking last group by "merged_with" (implemented merged_by)
TestGroup.prototype.test_bug2 = function () {
    this.init_board(9, 5);
    return this.game.load_moves('i1,d3,i3,d4,i5,d5,i7,d6,undo');
};

// At this moment this corresponds more or less to the speed test case too
TestGroup.prototype.test_various1 = function () {
    this.init_board(9, 0);
    return this.game.load_moves('pass,b2,a2,a3,b1,a1,d4,d5,a2,e5,e4,a1,undo,undo,undo,undo,undo,undo');
};

// This test for fixing bug we had if a group is merged then killed and then another stone played
// on same spot as the merging stone, then we undo... We used to only look at merging stone to undo a merge.
// We simply added a check that the merged group is also the same.
TestGroup.prototype.test_undo_1 = function () {
    this.init_board(5, 0);
    return this.game.load_moves('e1,e2,c1,d1,d2,e1,e3,e1,undo,undo,undo,undo');
};

// Makes sure that die & resuscite actions behave well
TestGroup.prototype.test_undo_2 = function () {
    this.init_board(5, 0);
    this.game.load_moves('a1,b1,c3');
    var ws = this.goban.stone_at(1, 1);
    var wg = ws.group;
    this.game.load_moves('a2');
    assert_equal(0, wg.lives);
    assert_equal(main.EMPTY, ws.color);
    assert_equal(true, ws.group === null);
    this.game.load_moves('undo');
    assert_equal(1, wg.lives);
    assert_equal(main.BLACK, ws.color);
    this.game.load_moves('c3,a2'); // and kill again the same
    assert_equal(0, wg.lives);
    assert_equal(main.EMPTY, ws.color);
    return assert_equal(true, ws.group === null);
};

// From another real life situation; kill while merging; black's turn
// 7 OOO
// 6 @@O
// 5 +O@
// 4 @+@
TestGroup.prototype.test_undo_3 = function () {
    this.init_board(5);
    this.game.load_moves('a2,a5,c2,b3,c3,c4,b4,b5,a4,c5');
    assert_equal('OOO++,@@O++,+O@++,@+@++,+++++', this.goban.image());
    this.game.load_moves('b2,a3,b4,a4');
    assert_equal('OOO++,O+O++,OO@++,@@@++,+++++', this.goban.image());
    Stone.undo(this.goban);
    assert_equal('OOO++,+@O++,OO@++,@@@++,+++++', this.goban.image());
    var w1 = this.goban.stone_at(1, 5).group;
    var w2 = this.goban.stone_at(1, 3).group;
    var b1 = this.goban.stone_at(2, 4).group;
    var b2 = this.goban.stone_at(1, 2).group;
    assert_equal(3, w1.lives);
    assert_equal(1, w2.lives);
    assert_equal(1, b1.lives);
    return assert_equal(5, b2.lives);
};

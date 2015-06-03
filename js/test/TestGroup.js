//Translated from test_group.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Stone = require('../Stone');
var assertEqual = main.assertEqual;
var GameLogic = require('../GameLogic');

/** @class NB: for debugging think of using @goban.debug_display
 */
function TestGroup(testName) {
    main.TestCase.call(this, testName);
    return this.initBoard();
}
inherits(TestGroup, main.TestCase);
module.exports = main.tests.add(TestGroup);

TestGroup.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.game.messagesToConsole();
    this.goban = this.game.goban;
};

TestGroup.prototype.testGroupMerge = function () {
    // check the sentinel
    assertEqual(1, this.goban.mergedGroups.length);
    assertEqual(-1, this.goban.mergedGroups[0].color);
    assertEqual(1, this.goban.killedGroups.length);
    assertEqual(-1, this.goban.killedGroups[0].color);
    // single stone
    var s = Stone.playAt(this.goban, 4, 3, main.BLACK);
    var g = s.group;
    assertEqual(this.goban, g.goban);
    assertEqual([s], g.stones);
    assertEqual(4, g.lives);
    assertEqual(main.BLACK, g.color);
    assertEqual(null, g.mergedBy);
    assertEqual(null, g.killedBy);
    // connect a stone to 1 group
    var s2 = Stone.playAt(this.goban, 4, 2, main.BLACK);
    assertEqual(g, s.group); // not changed
    assertEqual([s, s2], g.stones);
    assertEqual(6, g.lives);
    assertEqual(null, g.mergedBy);
    assertEqual(s2.group, g); // same group    
    // connect 2 groups of 1 stone each
    // (s1 on top, s2 2 rows below, and s3 between them)
    var s1 = Stone.playAt(this.goban, 2, 5, main.WHITE);
    var g1 = s1.group;
    s2 = Stone.playAt(this.goban, 2, 3, main.WHITE);
    var g2 = s2.group;
    var s3 = Stone.playAt(this.goban, 2, 4, main.WHITE);
    g = s3.group;
    assertEqual(g1, g); // g1 was kept because on top of stone (comes first)
    assertEqual(g, s1.group);
    assertEqual(g, s2.group);
    assertEqual(7, g.lives);
    assertEqual([s1, s3, s2], g.stones);
    assertEqual(main.WHITE, g.color);
    assertEqual(null, g.mergedBy);
    assertEqual(g, g2.mergedWith); // g2 was merged into g/g1
    assertEqual(s3, g2.mergedBy);
    assertEqual([s2], g2.stones); // g2 still knows s2; will be used for reversing
    // check the list in goban
    assertEqual(2, this.goban.mergedGroups.length);
    return assertEqual(g2, this.goban.mergedGroups[this.goban.mergedGroups.length-1]);
};

TestGroup.prototype.testGroupKill = function () {
    Stone.playAt(this.goban, 1, 5, main.WHITE); // a5
    var s = Stone.playAt(this.goban, 1, 4, main.WHITE); // a4
    var g = s.group;
    assertEqual(3, g.lives);
    var b1 = Stone.playAt(this.goban, 2, 4, main.BLACK); // b4
    Stone.playAt(this.goban, 2, 5, main.BLACK); // b5
    var bg = b1.group;
    assertEqual(1, g.lives); // g in atari
    assertEqual(3, bg.lives); // black group has 3 lives because of white group on its left
    s = Stone.playAt(this.goban, 1, 3, main.BLACK); // kill!
    assertEqual(5, bg.lives); // black group has now 5 lives
    assertEqual(0, g.lives); // dead
    assertEqual(s, g.killedBy);
    assertEqual(true, this.goban.stoneAt(1, 5).isEmpty());
    return assertEqual(true, this.goban.stoneAt(1, 4).isEmpty());
};

// Shape like  O <- the new stone brings only 2 lives
//            OO    because the one in 3,4 was already owned
TestGroup.prototype.testSharedLivesOnConnect = function () {
    Stone.playAt(this.goban, 3, 3, main.WHITE);
    var s = Stone.playAt(this.goban, 4, 3, main.WHITE);
    assertEqual(6, s.group.lives);
    var s2 = Stone.playAt(this.goban, 4, 4, main.WHITE);
    assertEqual(7, s2.group.lives);
    Stone.undo(this.goban);
    return assertEqual(6, s.group.lives); // @goban.debug_display
};

// Shape like  OO
//              O <- the new stone brings 1 life but shared lives 
//             OO    are not counted anymore in merged group
TestGroup.prototype.testSharedLivesOnMerge = function () {
    Stone.playAt(this.goban, 3, 2, main.WHITE);
    var s1 = Stone.playAt(this.goban, 4, 2, main.WHITE);
    assertEqual(6, s1.group.lives);
    var s2 = Stone.playAt(this.goban, 3, 4, main.WHITE);
    assertEqual(4, s2.group.lives);
    Stone.playAt(this.goban, 4, 4, main.WHITE);
    assertEqual(6, s2.group.lives);
    var s3 = Stone.playAt(this.goban, 4, 3, main.WHITE);
    assertEqual(10, s3.group.lives);
    Stone.undo(this.goban);
    assertEqual(6, s1.group.lives);
    assertEqual(6, s2.group.lives);
    Stone.undo(this.goban);
    return assertEqual(4, s2.group.lives); // @goban.debug_display
};

// Case of connect + kill at the same time
// Note the quick way to play a few stones for a test
// (methods writen before this one used the old, painful style)
TestGroup.prototype.testCase1 = function () {
    this.game.loadMoves('a2,a1,b2,b1,c2,d1,pass,e1,c1');
    var s = this.goban.stoneAt(1, 2);
    return assertEqual(6, s.group.lives);
};

// Other case
// OOO
//   O <- new stone
// OOO
TestGroup.prototype.testSharedLives2 = function () {
    this.game.loadMoves('a1,pass,a3,pass,b3,pass,b1,pass,c1,pass,c3,pass,c2');
    var s = this.goban.stoneAt(1, 1);
    assertEqual(8, s.group.lives);
    Stone.undo(this.goban);
    assertEqual(4, s.group.lives);
    this.goban.stoneAt(3, 1);
    return assertEqual(4, s.group.lives); // @goban.debug_display
};

TestGroup.prototype.checkGroup = function (g, ndx, numStones, color, stones, lives) {
    assertEqual(ndx, g.ndx);
    assertEqual(numStones, g.stones.length);
    assertEqual(color, g.color);
    assertEqual(lives, g.lives);
    return assertEqual(stones, g.stonesDump());
};

TestGroup.prototype.checkStone = function (s, color, move, around) {
    assertEqual(color, s.color);
    assertEqual(move, s.asMove());
    return assertEqual(around, s.emptiesDump());
};

// Verifies the around values are updated after merge
// 5 +++++
// 4 ++@++
// 3 OOO++
// 2 @++++
// 1 +++++
//   abcde
TestGroup.prototype.testMergeAndAround = function () {
    var b1 = Stone.playAt(this.goban, 1, 3, main.BLACK);
    var bg1 = b1.group;
    var w1 = Stone.playAt(this.goban, 1, 2, main.WHITE);
    assertEqual(2, w1.group.lives);
    var b2 = Stone.playAt(this.goban, 3, 3, main.BLACK);
    var bg2 = b2.group;
    assertEqual(true, bg1 !== bg2);
    var w2 = Stone.playAt(this.goban, 3, 4, main.WHITE);
    for (var _i = 0; _i < 3; _i++) {
        // ++@
        // O+O
        // @++      
        this.goban.stoneAt(4, 3);
        // now merge black groups:
        var b3 = Stone.playAt(this.goban, 2, 3, main.BLACK);
        assertEqual(true, (b1.group === b2.group) && (b3.group === b1.group));
        assertEqual(3, b1.group.ndx); // and group #3 was used as main (not mandatory but for now it is the case)
        assertEqual(5, b1.group.lives);
        // now get back a bit
        Stone.undo(this.goban);
        this.checkGroup(bg1, 1, 1, 0, 'a3', 2); // group #1 of 1 black stones [a3], lives:2
        this.checkStone(b1, 0, 'a3', 'a4,b3'); // stoneO:a3 around:  +[a4 b3]
        this.checkGroup(w1.group, 2, 1, 1, 'a2', 2); // group #2 of 1 white stones [a2], lives:2
        this.checkStone(w1, 1, 'a2', 'a1,b2'); // stone@:a2 around:  +[a1 b2]
        this.checkGroup(bg2, 3, 1, 0, 'c3', 3); // group #3 of 1 black stones [c3], lives:3
        this.checkStone(b2, 0, 'c3', 'b3,c2,d3'); // stoneO:c3 around:  +[d3 c2 b3]
        this.checkGroup(w2.group, 4, 1, 1, 'c4', 3); // group #4 of 1 white stones [c4], lives:3 
        this.checkStone(w2, 1, 'c4', 'b4,c5,d4'); // stone@:c4 around:  +[c5 d4 b4]
        // the one below is nasty: we connect with black, then undo and reconnect with white
        assertEqual(main.BLACK, this.game.curColor); // otherwise things are reversed below
        this.game.loadMoves('c2,b2,pass,b4,b3,undo,b4,pass,b3');
        // +++++ 5 +++++
        // +@@++ 4 +@@++
        // OOO++ 3 O@O++
        // @@O++ 2 @@O++
        // +++++ 1 +++++
        // abcde   abcde
        this.checkGroup(bg1, 1, 1, 0, 'a3', 1); // group #1 of 1 black stones [a3], lives:1
        this.checkStone(b1, 0, 'a3', 'a4'); // stoneO:a3 around:  +[a4]
        var wgm = w1.group; // white group after merge
        this.checkGroup(wgm, 4, 5, 1, 'a2,b2,b3,b4,c4', 6);
        this.checkStone(w1, 1, 'a2', 'a1'); // stone@:a2 around:  +[a1]
        this.checkStone(this.goban.stoneAt(2, 2), 1, 'b2', 'b1'); // stone@:b2 around:  +[b1]
        this.checkStone(this.goban.stoneAt(2, 3), 1, 'b3', ''); // stone@:b3 around:  +[]
        this.checkStone(this.goban.stoneAt(2, 4), 1, 'b4', 'a4,b5'); // stone@:b4 around:  +[b5 a4]
        this.checkStone(w2, 1, 'c4', 'c5,d4'); // stone@:c4 around:  +[c5 d4]
        this.checkGroup(bg2, 3, 2, 0, 'c2,c3', 3); // group #3 of 2 black stones [c3,c2], lives:3
        this.checkStone(b2, 0, 'c3', 'd3'); // stoneO:c3 around:  +[d3]
        this.checkStone(this.goban.stoneAt(3, 2), 0, 'c2', 'c1,d2'); // stoneO:c2 around:  +[d2 c1]
        this.game.loadMoves('undo,undo,undo');
        assertEqual(0, this.game.moveNumber()); // @goban.debug_display # if any assert shows you might need this to understand what happened...
    }
};

// Fixed bug. This was when undo removes a "kill" and restores a stone 
// ...which attacks (wrongfully) the undone stone
TestGroup.prototype.testKoBug1 = function () {
    this.initBoard(9, 5);
    return this.game.loadMoves('e4,e3,f5,f4,g4,f2,f3,d1,f4,undo,d2,c2,f4,d1,f3,undo,c1,d1,f3,g1,f4,undo,undo,f6');
};

// At the same time a stone kills (with 0 lives left) and connects to existing surrounded group,
// killing actually the enemy around. We had wrong raise showing since at a point the group
// we connect to has 0 lives. We simply made the raise test accept 0 lives as legit.
TestGroup.prototype.testKamikazeKillWhileConnect = function () {
    this.initBoard(5, 0);
    return this.game.loadMoves('a1,a3,b3,a4,b2,b1,b4,pass,a5,a2,a1,a2,undo,undo');
};

// This was not a bug actually but the test is nice to have.
TestGroup.prototype.testKo2 = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('a3,b3,b4,c2,b2,b1,c3,a2,pass,b3');
    // @game.history.each do |move| puts(move) end
    assertEqual(false, Stone.validMove(this.goban, 2, 2, main.BLACK)); // KO
    this.game.loadMoves('e5,d5');
    assertEqual(true, Stone.validMove(this.goban, 2, 2, main.BLACK)); // KO can be taken again
    this.game.loadMoves('undo');
    return assertEqual(false, Stone.validMove(this.goban, 2, 2, main.BLACK)); // since we are back to the ko time because of undo
};

// Fixed. Bug was when undo was picking last group by "merged_with" (implemented merged_by)
TestGroup.prototype.testBug2 = function () {
    this.initBoard(9, 5);
    return this.game.loadMoves('i1,d3,i3,d4,i5,d5,i7,d6,undo');
};

// At this moment this corresponds more or less to the speed test case too
TestGroup.prototype.testVarious1 = function () {
    this.initBoard(9, 0);
    return this.game.loadMoves('pass,b2,a2,a3,b1,a1,d4,d5,a2,e5,e4,a1,undo,undo,undo,undo,undo,undo');
};

// This test for fixing bug we had if a group is merged then killed and then another stone played
// on same spot as the merging stone, then we undo... We used to only look at merging stone to undo a merge.
// We simply added a check that the merged group is also the same.
TestGroup.prototype.testUndo1 = function () {
    this.initBoard(5, 0);
    return this.game.loadMoves('e1,e2,c1,d1,d2,e1,e3,e1,undo,undo,undo,undo');
};

// Makes sure that die & resuscite actions behave well
TestGroup.prototype.testUndo2 = function () {
    this.initBoard(5, 0);
    this.game.loadMoves('a1,b1,c3');
    var ws = this.goban.stoneAt(1, 1);
    var wg = ws.group;
    this.game.loadMoves('a2');
    assertEqual(0, wg.lives);
    assertEqual(main.EMPTY, ws.color);
    assertEqual(true, ws.group === null);
    this.game.loadMoves('undo');
    assertEqual(1, wg.lives);
    assertEqual(main.BLACK, ws.color);
    this.game.loadMoves('c3,a2'); // and kill again the same
    assertEqual(0, wg.lives);
    assertEqual(main.EMPTY, ws.color);
    return assertEqual(true, ws.group === null);
};

// From another real life situation; kill while merging; black's turn
// 7 OOO
// 6 @@O
// 5 +O@
// 4 @+@
TestGroup.prototype.testUndo3 = function () {
    this.initBoard(5);
    this.game.loadMoves('a2,a5,c2,b3,c3,c4,b4,b5,a4,c5');
    assertEqual('OOO++,@@O++,+O@++,@+@++,+++++', this.goban.image());
    this.game.loadMoves('b2,a3,b4,a4');
    assertEqual('OOO++,O+O++,OO@++,@@@++,+++++', this.goban.image());
    Stone.undo(this.goban);
    assertEqual('OOO++,+@O++,OO@++,@@@++,+++++', this.goban.image());
    var w1 = this.goban.stoneAt(1, 5).group;
    var w2 = this.goban.stoneAt(1, 3).group;
    var b1 = this.goban.stoneAt(2, 4).group;
    var b2 = this.goban.stoneAt(1, 2).group;
    assertEqual(3, w1.lives);
    assertEqual(1, w2.lives);
    assertEqual(1, b1.lives);
    return assertEqual(5, b2.lives);
};

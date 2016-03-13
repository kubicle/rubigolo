//Translated from test_speed.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var Goban = require('../Goban');
var TestCase = require('./TestCase');
var TimeKeeper = require('./TimeKeeper');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestSpeed(testName) {
    TestCase.call(this, testName);
    main.debug = false; // if true it takes forever...
    this.initBoard();
}
inherits(TestSpeed, TestCase);
module.exports = TestSpeed;

TestSpeed.CM_UNDO = 0;
TestSpeed.CM_CLEAR = 1;
TestSpeed.CM_NEW = 2;


TestSpeed.prototype.initBoard = function (size) {
    this.goban = new Goban(size || 9);
    this.goban.setPositionalSuperko(false);
};

TestSpeed.prototype.testSpeedBasic = function () {
    var t = new TimeKeeper();
    // Basic test
    var count = main.isCoverTest ? 1 : 50000;
    t.start('Basic (no move validation) ' + 10 * count + ' stones and undo', 0.3);
    for (var i = count; i >=0; i--) {
        this.play10Stones();
    }
    t.stop();
};

TestSpeed.prototype.testSpeed35moves = function () {
    var t = new TimeKeeper();
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
    //   abcdefghj
    var game1 = 'c3,f3,d7,e5,c5,f7,e2,e8,d8,f2,f1,g1,e1,h2,e3,d4,e4,f4,d5,d3,d2,c2,c4,d6,e7,e6,c6,f8,e9,f9,d9,c7,c8,b8,b7';
    var game1MovesIj = this.movesIj(game1);
    var count = main.isCoverTest ? 1 : 2000;
    t.start('35 move game, ' + count + ' times and undo', 0.05);
    for (var i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
    // The idea here is to verify that undoing things is cheaper than throwing it all to GC
    // In a tree exploration strategy the undo should be the only way (otherwise we quickly hog all memory)
    t.start('35 move game, ' + count + ' times new board each time', 0.16);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_NEW);
    }
    t.stop();
    // And here we see that the "clear" is the faster way to restart a game 
    // (and that it does not "leak" anything to GC)
    t.start('35 move game, ' + count + ' times, clear board each time', 0.04);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_CLEAR);
    }
    t.stop();
};

TestSpeed.prototype.testSpeed63movesAndUndo = function () {
    var t = new TimeKeeper();
    // 9 ++O@@++++
    // 8 +@OO@++@+
    // 7 OOOO@@@++
    // 6 ++OOOOO@@
    // 5 OO@@O@@@@
    // 4 @@@+OOOO@
    // 3 O@@@@@O+O
    // 2 +++@OOO++
    // 1 +++@@O+++
    //   abcdefghj
    var game2 = 'c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5';
    var game2MovesIj = this.movesIj(game2);

    // validate the game once
    this.playMoves(game2MovesIj);
    var finalPos = '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++';
    this.assertEqual(finalPos, this.goban.image());

    this.initBoard();
    var count = main.isCoverTest ? 1 : 2000;
    t.start('63 move game, ' + count + ' times and undo', 0.1);
    for (var i = 0; i < count; i++) {
        this.playGameAndClean(game2MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();

    t.start('63 move game, ' + count + ' times and undo, using superko rule', 0.4);
    this.goban.setPositionalSuperko(true);
    for (i = 0; i < count; i++) {
        this.playGameAndClean(game2MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
};

// Converts "a1,b2" in [1,1,2,2]
TestSpeed.prototype.movesIj = function (game) {
    var movesIj = [];
    for (var m, m_array = game.split(','), m_ndx = 0; m=m_array[m_ndx], m_ndx < m_array.length; m_ndx++) {
        var ij = Grid.move2xy(m);
        movesIj.push(ij[0]);
        movesIj.push(ij[1]);
    }
    return movesIj;
};

TestSpeed.prototype.playMoves = function (movesIj) {
    var moveCount = 0;
    var curColor = BLACK;
    for (var n = 0; n <= movesIj.length - 2; n += 2) {
        var i = movesIj[n];
        var j = movesIj[n + 1];
        if (!this.goban.isValidMove(i, j, curColor)) {
            throw new Error('Invalid move: ' + i + ',' + j);
        }
        this.goban.playAt(i, j, curColor);
        moveCount += 1;
        curColor = (curColor + 1) % 2;
    }
    return moveCount;
};

TestSpeed.prototype.playGameAndClean = function (movesIj, cleanMode) {
    var numMoves = movesIj.length / 2;
    if (main.debug) main.log.debug('About to play a game of ' + numMoves + ' moves');
    this.assertEqual(numMoves, this.playMoves(movesIj));
    switch (cleanMode) {
    case TestSpeed.CM_UNDO:
        for (var i = 0; i < numMoves; i++) {
            this.goban.undo();
        }
        break;
    case TestSpeed.CM_CLEAR:
        this.goban.clear();
        break;
    case TestSpeed.CM_NEW:
        this.initBoard();
        break;
    default: 
        throw new Error('Invalid clean mode');
    }
    this.assertEqual(true, !this.goban.previousStone());
};

// Our first, basic test
TestSpeed.prototype.play10Stones = function () {
    this.goban.tryAt(2, 2, WHITE);
    this.goban.tryAt(1, 2, BLACK);
    this.goban.tryAt(1, 3, WHITE);
    this.goban.tryAt(2, 1, BLACK);
    this.goban.tryAt(1, 1, WHITE);
    this.goban.tryAt(4, 4, BLACK);
    this.goban.tryAt(4, 5, WHITE);
    this.goban.tryAt(1, 2, BLACK);
    this.goban.tryAt(5, 5, WHITE);
    this.goban.tryAt(5, 4, BLACK);
    for (var i = 0; i < 10; i++) {
        this.goban.untry();
    }
};

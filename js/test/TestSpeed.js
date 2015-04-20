//Translated from test_speed.rb using babyruby2js
'use strict';

var main = require('../main');
var Logger = require('../Logger');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var Stone = require('../Stone');
var assertEqual = main.assertEqual;
var Goban = require('../Goban');
var TimeKeeper = require('../TimeKeeper');
main.debug = false; // if true it takes forever...
main.log.level=(Logger.ERROR);
main.count = 0;

/** @class */
function TestSpeed(testName) {
    main.TestCase.call(this, testName);
    return this.initBoard();
}
inherits(TestSpeed, main.TestCase);
module.exports = main.tests.add(TestSpeed);

TestSpeed.CM_UNDO = [0, TestSpeed.CM_CLEAR = 1, TestSpeed.CM_NEW = 2];
TestSpeed.prototype.initBoard = function (size) {
    if (size === undefined) size = 9;
    this.goban = new Goban(size);
};

// Not very fancy: add the line $count += 1 wherever you want to count.
// Need some time to try a good profiler soon...
TestSpeed.prototype.showCount = function () {
    if (main.count !== 0) {
        console.log('Code called ' + main.count + ' times');
        main.count = 0;
    }
};

TestSpeed.prototype.testSpeed1 = function () {
    var tolerance = 1.2;
    var t = new TimeKeeper(tolerance);
    t.calibrate(3.2);
    if (main.testAll) {
        console.log('Ignore the GC numbers below.');
        console.log('Reason: when we run other tests before the speed test the GC has some catch-up to do.');
        t.setGcTolerance(20);
    }
    // Basic test
    t.start('Basic (no move validation) 100,000 stones and undo', 2.8, 0);
    for (var _i = 1; _i <= 10000; _i++) {
        this.play10Stones();
    }
    t.stop();
    this.showCount();
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
    var game1MovesIj = this.movesIj(game1);
    t.start('35 move game, 2000 times and undo', 3.4, 1);
    for (_i = 1; _i <= 2000; _i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
    this.showCount();
    // The idea here is to verify that undoing things is cheaper than throwing it all to GC
    // In a tree exploration strategy the undo should be the only way (otherwise we quickly hog all memory)
    t.start('35 move game, 2000 times new board each time', 4.87, 15);
    for (_i = 1; _i <= 2000; _i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_NEW);
    }
    t.stop();
    this.showCount();
    // And here we see that the "clear" is the faster way to restart a game 
    // (and that it does not "leak" anything to GC)
    t.start('35 move game, 2000 times, clear board each time', 2.5, 1);
    for (_i = 1; _i <= 2000; _i++) {
        this.playGameAndClean(game1MovesIj, TestSpeed.CM_CLEAR);
    }
    t.stop();
    return this.showCount();
};

TestSpeed.prototype.testSpeed2 = function () {
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
    var game2MovesIj = this.movesIj(game2);
    // validate the game once
    this.playMoves(game2MovesIj);
    var finalPos = '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++';
    assertEqual(finalPos, this.goban.image());
    this.initBoard();
    t.start('63 move game, 2000 times and undo', 1.56, 3);
    for (var _i = 1; _i <= 2000; _i++) {
        this.playGameAndClean(game2MovesIj, TestSpeed.CM_UNDO);
    }
    t.stop();
    return this.showCount();
};

// Converts "a1,b2" in [1,1,2,2]
TestSpeed.prototype.movesIj = function (game) {
    return game.split(',').collectConcat(function (m) {
        return Grid.parseMove(m);
    });
};

TestSpeed.prototype.playMoves = function (movesIj) {
    var moveCount = 0;
    var curColor = main.BLACK;
    for (var n = 0; n <= movesIj.length - 2; n += 2) {
        var i = movesIj[n];
        var j = movesIj[n + 1];
        if (!Stone.validMove(this.goban, i, j, curColor)) {
            throw new Error('Invalid move: ' + i + ',' + j);
        }
        Stone.playAt(this.goban, i, j, curColor);
        moveCount += 1;
        curColor = (curColor + 1) % 2;
    }
    return moveCount;
};

TestSpeed.prototype.playGameAndClean = function (movesIj, cleanMode) {
    var numMoves = movesIj.length / 2;
    if (main.debug) {
        main.log.debug('About to play a game of ' + numMoves + ' moves');
    }
    assertEqual(numMoves, this.playMoves(movesIj));
    switch (cleanMode) {
    case TestSpeed.CM_UNDO:
        for (var _i = 1; _i <= numMoves; _i++) {
            Stone.undo(this.goban);
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
    return assertEqual(null, this.goban.previousStone());
};

// Our first, basic test
TestSpeed.prototype.play10Stones = function () {
    Stone.playAt(this.goban, 2, 2, main.WHITE);
    Stone.playAt(this.goban, 1, 2, main.BLACK);
    Stone.playAt(this.goban, 1, 3, main.WHITE);
    Stone.playAt(this.goban, 2, 1, main.BLACK);
    Stone.playAt(this.goban, 1, 1, main.WHITE);
    Stone.playAt(this.goban, 4, 4, main.BLACK);
    Stone.playAt(this.goban, 4, 5, main.WHITE);
    Stone.playAt(this.goban, 1, 2, main.BLACK);
    Stone.playAt(this.goban, 5, 5, main.WHITE);
    Stone.playAt(this.goban, 5, 4, main.BLACK);
    for (var _i = 1; _i <= 10; _i++) {
        Stone.undo(this.goban);
    }
};

// E02: unknown method level=(...)
// E02: unknown method collect_concat(...)
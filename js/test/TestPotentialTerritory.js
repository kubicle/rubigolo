'use strict';
/* eslint quotes: 0 */
/* jshint quotmark: false */

var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var TestCase = require('./TestCase');


/** @class NB: for debugging think of using analyser.debug_dump
 */
function TestPotentialTerritory(testName) {
    TestCase.call(this, testName);
}
inherits(TestPotentialTerritory, TestCase);
module.exports = TestPotentialTerritory;


TestPotentialTerritory.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.aiPlayer = new main.defaultAi(this.game, main.BLACK);
    this.pot = this.aiPlayer.getHeuristic('PotentialTerritory');
};

TestPotentialTerritory.prototype.checkGame = function (moves, expected, gsize, finalPos) {
    this.initBoard(gsize || 7);
    this.game.loadMoves(moves);
    if (finalPos) this.assertEqual(finalPos, this.goban.image());

    this.pot.evalBoard();
    var territory = this.pot.image();
    if (this.check(territory === expected)) return;
    this.fail('Expected territory was<br>' + expected + ' but got<br>' + territory);
};

TestPotentialTerritory.prototype.checkGameTODO = function (moves, expected, gsize, finalPos) {
    this.startBrokenTest();
    this.checkGame(moves, expected, gsize, finalPos);
};

//---


TestPotentialTerritory.prototype.testBigEmptySpace = function () {
    /** 
    Black should own the lower board. Top board is disputed... or black too.
    ++O++++
    ++O@+++
    ++O++++
    +@@@+++
    +++++++
    +++++++
    +++++++
    */
    this.checkGameTODO('d4,c5,d6,c7,c4,c6,b4',
        //'-------,-------,-------,-------,-------,-------,-------'); // if White group is seen dead
        '???????,???????,???????,-------,-------,-------,-------'); // if White group is seen in dispute
};

TestPotentialTerritory.prototype.testInMidGame = function () {
    // 9 +++++++++
    // 8 +++O@++++
    // 7 ++O+@+@++
    // 6 ++O++++++
    // 5 +O++O+@@+
    // 4 +O@++++O+
    // 3 +@@+@+O++
    // 2 +++@O++++
    // 1 +++++++++
    //   abcdefghj
    this.checkGameTODO('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3',
        "::::-'---," +
        "::::-'---," +
        ":::?-'---," +
        ":::??''''," +
        "::????---," +
        "::-????::," +
        "?--?-?:::," +
        "----??:::," +
        "----??:::", 9);
};

TestPotentialTerritory.prototype.testOnFinishedGame = function () {
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
    this.checkGameTODO('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5',
        ':::------,::::-----,::::-----,:::::::--,::--:----,---?::::-,------:::,----:::::,-----::::', 9,
        '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++');
};

TestPotentialTerritory.prototype.testMessyBoard = function () {
    // +++O+++
    // +@O+O@+
    // ++OOO@+
    // +O+@+@+
    // +O@@@O+
    // @@OOOO+
    // ++++@@+
    this.checkGameTODO('d4,d2,e3,b4,e1,c5,d6,d5,c3,e5,d3,b3,b2,c2,a2,e2,f1,f2,b6,c6,f6,e6,f4,d7,f5,f3',
        '??.:.??,' +
        '??:::??,' +
        '??:::??,' +
        '???????,' +
        '?????:.,' +
        '??:::::,' +
        '??:::::');
        // FIXME NW BLACK should die even if Black plays first; one reason is strong b4-c5 W connection
        //":::::--,:::::--,:::::--,::???--,::???::,:::::::,:::::::"
};

TestPotentialTerritory.prototype.testConnectBorders = function () {
    // Right side white territory is established; white NW single stone is enough to claim the corner
    // +++++@+++
    // ++++@@O++
    // ++O+@O+++
    // ++++@+O++
    // ++++@+O++
    // +++@+O+++
    // ++@OO++++
    // ++@@OO+++
    // +++++++++
    this.checkGameTODO('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9,c7',
        "????'-?::," +
        "????--:::," +
        "????-::::," +
        "????-?:::," +
        "''''-?:::," +
        "----?::::," +
        "---::::::," +
        "----:::::," +
        "----:::::",
        9, '+++++@+++,++++@@O++,++O+@O+++,++++@+O++,++++@+O++,+++@+O+++,++@OO++++,++@@OO+++,+++++++++');
};

// Same as above but no White NW stone (c7)
// +++++@+++
// ++++@@O++
// ++++@O+++
// ++++@+O++
// ++++@+O++
// +++@+O+++
// ++@OO++++
// ++@@OO+++
// +++++++++
TestPotentialTerritory.prototype.testConnectBordersNoC7 = function () {
    this.checkGameTODO('d4,f4,e6,g6,d2,f7,e7,f2,e8,e3,e5,d3,c3,e2,c2,g5,f8,g8,f9',
        "------?::,------:::,-----::::,-----?:::,-----?:::,----?::::,---::::::,----:::::,----:::::", 9);
};

TestPotentialTerritory.prototype.test5by5withCornerCatch = function () {
    // Black a5 left as is would be captured, and full black group would die
    // @OOO+
    // +@@O+
    // +@+O+
    // @@+O+
    // +@+O+
    this.checkGameTODO('a2,d3,b2,d4,b1,d2,b3,d1,a5,b5,b4,c5,c4,d5',
        "'::::,'''::,''?::,''?::,''?::", 5);
};

TestPotentialTerritory.prototype.test5by5withCornerCatch2 = function () {
    // Simple flip of above game
    this.checkGameTODO('a4,d3,b4,d2,b5,d4,b3,d5,a1,b1,b2,c1,c2,d1',
        "''?::,''?::,''?::,'''::,'::::", 5);
};

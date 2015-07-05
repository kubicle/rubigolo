//Translated from test_ai.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var assertEqual = main.assertEqual;
var GameLogic = require('../GameLogic');
var Ai1Player = require('../ai/Ai1Player');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestAi(testName) {
    main.TestCase.call(this, testName);
    return this.initBoard();
}
inherits(TestAi, main.TestCase);
module.exports = main.tests.add(TestAi);

TestAi.prototype.initBoard = function (size, handicap) {
    if (size === undefined) size = 9;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.newGame(size, handicap);
    this.goban = this.game.goban;
    this.players = [new Ai1Player(this.goban, BLACK), new Ai1Player(this.goban, WHITE)];
};

TestAi.prototype.playMoves = function (moves) {
    this.game.loadMoves(moves);
};

TestAi.prototype.checkTurn = function (expColor) {
    assertEqual(Grid.colorName(expColor), Grid.colorName(this.game.curColor), 'Wrong player turn');
};

TestAi.prototype.logErrorContext = function (player) {
    main.log.error(this.goban.toString());
    main.log.error(player.getMoveSurveyText(1));
    main.log.error(player.getMoveSurveyText(2));
};

TestAi.prototype.checkScore = function(player, color, move, score, expScore, heuristic) {
    var range = Math.abs(expScore) > 2 ? 0.5 : Math.abs(expScore) / 5 + 0.1;
    if (Math.abs(score - expScore) > range) {
        main.log.error('Discrepancy in ' + this.name + ': ' + Grid.colorName(color) + ' ' + move +
            ' got ' + score.toFixed(3) + ' instead of ' + expScore +
            (heuristic ? ' for ' + heuristic : ''));
        this.logErrorContext(player);
    }
};

// if expEval is null there is not check: value is returned
TestAi.prototype.checkEval = function (move, expEval, heuristic) {
    var coords = Grid.parseMove(move);
    var i = coords[0], j = coords[1];
    
    var color = this.game.curColor;
    var player = this.players[color];
    var score;
    if (heuristic) {
        score = player.testHeuristic(i, j, heuristic);
    } else {
        score = player.testMoveEval(i, j);
    }
    if (expEval !== null && expEval !== undefined) {
        this.checkScore(player, color, move, score, expEval, heuristic);
    }
    return score;
};

// Checks that move1 is better than move2
TestAi.prototype.checkMoveBetter = function (move1, move2) {
    var s1 = this.checkEval(move1), s2 = this.checkEval(move2);
    if (s2 < s1) return;
    main.log.error(move1 + ' ranked lower than ' + move2 + '(' + s1 + ' <= ' + s2 + ')');
    this.checkEval(move1, 100);
    this.checkEval(move2, -100);
};

TestAi.prototype.playAndCheck = function (expMove, expEval) {
    if (expEval === undefined) expEval = null;
    if (main.debug) {
        main.log.debug('Letting AI play...');
    }
    var color = this.game.curColor;
    var player = this.players[color];

    var move = player.getMove();
    var score = player.bestScore;
    if (move !== expMove) {
        this.logErrorContext(player);
        var expMoveScore = this.checkEval(expMove, expEval); // see how much the expMove got
        if (Math.abs(expMoveScore - score) < 0.001) {
            main.log.error('CAUTION: ' + expMove + ' and ' + move + 
                ' are twins or very close => consider modifying the test scenario');
        }
        assertEqual(expMove, move, Grid.colorName(color));
    } else if (expEval) {
        this.checkScore(player, color, move, player.bestScore, expEval);
    }
    this.game.playOneMove(move);
};

TestAi.prototype.checkBasicGame = function (moves, expMove, gsize) {
    this.initBoard(gsize || 5);
    this.playMoves(moves);
    this.playAndCheck(expMove);
};


//--- Tests are below

TestAi.prototype.testEyeMaking = function () {
    // ++@@@
    // +@@OO
    // +@OO+
    // +@@O*
    // +@OO+
    this.checkBasicGame('b3,d3,b2,c3,c2,d2,c4,c1,b1,d1,b4,d4,d5,pass,e5,e4,c5', 'e2');
};

TestAi.prototype.testCornerEyeMaking = function () {
    // OOO+*
    // @@OO+
    // +@@OO
    // ++@@O
    // +++@@
    this.checkBasicGame('b3,d3,c3,d4,c2,c4,d2,e2,b4,b5,d1,a5,a4,c5,e1,e3,pass', 'e5');
};

TestAi.prototype.testCornering = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++@+++
    //   abcdefghj
    this.playMoves('j8,j9,d7,c5,f4,pass,g6,pass');
    this.checkTurn(BLACK);
    this.checkMoveBetter('c3', 'h9');
    //this.checkMoveBetter('h8', 'h9'); // FIXME: h8 is better than killing in h9 (non trivial)
};

TestAi.prototype.testPreAtari = function () {
    // 5 +++++++++
    // 4 +@@@@O+++
    // 3 ++O@O@O++
    // 2 ++O@O@+++
    // 1 +++OO++++
    //   abcdefghj
    // f3-f2 can be saved in g2
    // Hunter should not attack in c1 since c1 would be in atari
    this.playMoves('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1');
    this.checkTurn(BLACK);
    this.checkEval('c1', -5.3);
    this.playAndCheck('g2', 10);
};

TestAi.prototype.testHunter1 = function () {
    // h7 is a wrong "good move"; white can escape with h8
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 +++@++++@
    //   abcdefghj
    this.playMoves('d4,j7,j8,j6,j5,j9,j4,pass,h8,pass');
    this.checkTurn(BLACK);
    this.checkEval('h7', 14.3);
    this.checkEval('h6', 14.3);
    // h7 ladder was OK too here but capturing same 2 stones in a ladder
    // the choice between h6 and h7 is decided by smaller differences
    this.playMoves('h6,h7'); // WHITE moves in h7
    this.playAndCheck('g7', 12.2);
};

TestAi.prototype.testLadder = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghj
    this.playMoves('j9,j7,j8,j6,j5,a9,j4,pass');
    this.checkTurn(BLACK);
    this.playAndCheck('h7', 16);
    this.playMoves('h6');

    // h8 is chosen because Hunter does not count the saved back group h8+h9
    // Heuristics should collaborate more so this would become easy to see
    this.checkEval('g6', 16);
    this.checkEval('h8', 24.6); // Savior gives 24

    this.playMoves('g6,h5');
    this.checkEval('h4', 16, 'Hunter');
    this.playAndCheck('h4', 28); // big because i4-i5 black group is now also threatened
    this.playMoves('g5');

    // FIXME: Savior boosts saving h8+h9 again
    this.checkEval('h8', 24.6);
    this.checkEval('g7', 20.6);
    //this should be: this.playAndCheck('f5', 20);
};

TestAi.prototype.testLadderBreaker1 = function () {
    // 9 O++++++++
    // 8 O++++++++
    // 7 O+++O++++
    // 6 +++++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghj
    // Ladder breaker a7 does not work since the whole group dies
    this.playMoves('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5');
    this.checkTurn(BLACK);
    this.checkEval('b6', 0);
    this.playAndCheck('c6', 16.5);
};

TestAi.prototype.testLadderBreaker2 = function () {
    // 9 O++++++++
    // 8 OOO++++++
    // 7 O+++O++++
    // 6 ++*++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghj
    // Ladder breaker are a7 and e7
    // What is sure is that neither b6 nor c6 works
    this.playMoves('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8');
    this.checkTurn(BLACK);
    this.checkEval('c6', 0);
    this.checkEval('b6', 0);
    this.checkEval('g4', 8); // from Spacer
};

TestAi.prototype.testSeeDeadGroup = function () {
    // 9 +@++@@@@O
    // 8 +@@@@@@OO
    // 7 @@+@+@@O+
    // 6 +@+@++@O+
    // 5 +@+@@+@O+
    // 4 @@@+++@OO
    // 3 @OO@@@@O+
    // 2 OO+OOO@OO
    // 1 ++O@@@@O+
    //   abcdefghj
    // Interesting here: SW corner group O (white) is dead. Both sides should see it and play accordingly.
    this.playMoves('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9');
    this.checkTurn(WHITE);
    this.playAndCheck('pass');
    this.playAndCheck('c2', 2); // FIXME: BoardAnalyser should see O group is dead
    this.playAndCheck('d2', 4); // same here, d2 is wasted
    this.playAndCheck('e2', 4);
    this.playAndCheck('pass');
    this.playAndCheck('pass');
};

TestAi.prototype.testBorderDefense = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +++@@@+
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // Issue: after W:a3 we expect B:b5 or b6 but AI does not see attack in b5; 
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3');
    this.checkTurn(BLACK);
    this.checkEval('g5', 1.2, 'Pusher'); // no kill for black in g5 but terr gain
    this.checkEval('b6', -1); // FIXME should be close to b5 score: black can save a5 in b6
    this.playAndCheck('b5', 10.6);
};

TestAi.prototype.testBorderAttackAndInvasion = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO@
    // 4 O@@@O+O
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see attack in b5 with territory invasion
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass');
    this.checkTurn(WHITE);
    this.playAndCheck('b5', 10.6);
};

TestAi.prototype.testBorderAttackAndInvasion2 = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // AI should see attack in b5 with territory invasion.
    // Actually O in g4 is chosen because pusher gives it 0.33 pts.
    // NB: g4 is actually a valid move for black
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6');
    this.checkTurn(WHITE);
    this.playAndCheck('b5', 10.6);
};

TestAi.prototype.testBorderClosing = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +@+@@@@
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see f4 is dead inside white territory if g5 is played (non trivial)
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g6');
    this.checkTurn(WHITE);
    this.checkEval('g5', 0.3);
    this.playAndCheck('g4', 6); // FIXME white (O) move should be g5 here
};

TestAi.prototype.testSaviorHunter = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +++@@@@
    // 5 @@+@OO+
    // 4 O+@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // g4 is actually a valid move for black
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass');
    this.checkTurn(BLACK);
    this.playAndCheck('g4', 6.5); // NB: d2 is already dead
    this.checkEval('g3', 0.3);
};

TestAi.prototype.testKillingSavesNearbyGroupInAtari = function () {
    this.initBoard(7);
    // 7 +++++++
    // 6 +@+@@@+
    // 5 @++@OO@
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    this.playMoves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5');
    this.checkTurn(WHITE);
    this.checkEval('e3', 6);
    this.playAndCheck('g4', 12.1);
    this.playAndCheck('g6', 4.6);
    this.checkEval('c7', 0);
};

TestAi.prototype.testAiSeesSnapbackAttack = function () {
    // 5 O@+O+
    // 4 O@*@@  <-- here
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.checkBasicGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4', 'c4');
    this.game.playOneMove('c5');
    this.playAndCheck('c4', 8); // 3 taken & 1 saved
};

TestAi.prototype.testSnapbackFails = function () {
    this.initBoard(7);
    // 7 O@+OO++
    // 6 O@+@@++
    // 5 OO@@+++
    // 4 *@@++++  <-- here a4 kills so snapback is irrelevant
    // 3 ++++O++
    //   abcdefg
    // Snapback c6 is bad idea since black-a4 can kill white group
    this.playMoves('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6');
    this.checkTurn(WHITE);
    this.checkEval('c6', -2); // NoEasyPrisoner
    this.playAndCheck('f7', 11); // FIXME white should see d7-e7 are dead (territory detection)
    this.playAndCheck('a4', 10);
};

TestAi.prototype.testAiSeesKillingBringSnapback = function () {
    this.initBoard(5);
    // 5 O@*OO  <-- c5 is bad idea for Black
    // 4 O@O@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // 
    this.playMoves('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4');
    this.checkTurn(BLACK);
    this.checkEval('c5', 0.02);
    this.playAndCheck('b2', 0.3);
};

TestAi.prototype.testSeesAttackNoGood = function () {
    this.initBoard(5);
    // 5 O@@OO
    // 4 O@+@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // NB: we could use this game to check when AI can see dead groups
    this.playMoves('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5');
    this.checkTurn(WHITE);
    this.playAndCheck('c4', 12); // kills 3 and saves 2 + 1 (disputable) space in black territory
    this.checkEval('c5', -3.3); // silly move
};

TestAi.prototype.testPusher1 = function () {
    // 7 ++O++++
    // 6 ++O@+++
    // 5 ++O++++
    // 4 +@@@+++
    // 3 +++++++
    // 2 +++++++
    // 1 +++++++
    //   abcdefg
    this.initBoard(7);
    this.playMoves('d4,c5,d6,c7,c4,c6,b4');
    this.checkEval('e7', 0); // cannot connect if e7
    this.checkEval('e5', 0.2); // spacer only; cannot connect
    this.playAndCheck('d5', 1.15);
 };

TestAi.prototype.testPusher2 = function () {
    // 7 +++++++++
    // 6 ++OO@+@++
    // 5 ++O@@++++
    // 4 ++@OO++++
    // 3 ++@@O+O++
    // 2 +++@+++++
    // 1 +++++++++
    //   abcdefghj
    this.initBoard(9);
    this.playMoves('e5,g3,c3,e3,g6,d4,d5,c5,c4,d6,e6,c6,d2,e4,d3');
    this.checkTurn(WHITE);
    this.checkEval('f5', 0); // cannot connectwith e4
    this.checkEval('e2', 0.2); // FIXME: should be bigger (invasion blocker's job)
    this.checkEval('g5', 1.3); // bigger too
};

TestAi.prototype.testSemiAndEndGame = function () {
    // 9 +O++++OO@
    // 8 @+O+OOO@@
    // 7 @O+O@@@@@
    // 6 +@O+OOO@+
    // 5 +@OOOO@+@
    // 4 @@@@@O@+@
    // 3 OOOO@@@@+
    // 2 O+OOO@+++
    // 1 @@@+OO@++
    //   abcdefghj
    this.initBoard(9);
    this.playMoves('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8');
    this.checkTurn(BLACK);
    this.checkEval('b8', 0.75); // huge threat but only if white does not answer it
    this.checkEval('d9', 0); // right in enemy territory
    this.playMoves('b8'); 
    this.checkEval('c7', 2); // FIXME much bigger cost than current eval if not c7
    // this.playAndCheck('a9', 99);
    // this.playAndCheck('c9', 99);
    // this.playAndCheck('pass');
    // this.playAndCheck('pass');
};

TestAi.prototype.testConnector_connectionNotNeeded = function () {
    this.initBoard(7);
    this.playMoves('d4,f6,f3,c7,g4,e4,e3,e5,g5,f4,g6,b4,c3');
    this.checkEval('f5', 0);
};
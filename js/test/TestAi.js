//Translated from test_ai.rb using babyruby2js
'use strict';

var main = require('../main');

var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var inherits = require('util').inherits;

var assertEqual = main.assertEqual;
var BLACK = main.BLACK, WHITE = main.WHITE;

var BIG_SCORE = 100;


/** @class NB: for debugging think of using @goban.debug_display
 */
function TestAi(testName) {
    main.TestCase.call(this, testName);
}
inherits(TestAi, main.TestCase);
module.exports = main.tests.add(TestAi);

TestAi.prototype.initBoard = function (size, handicap) {
    this.game = new GameLogic();
    this.game.newGame(size, handicap || 0);
    this.goban = this.game.goban;
    this.players = [
        new main.defaultAi(this.goban, BLACK),
        new main.defaultAi(this.goban, WHITE)
    ];
};

TestAi.prototype.showInUi = function (msg) {
    window.testUi.showTestGame(this.name, msg, this.game);
};

TestAi.prototype.playMoves = function (moves) {
    this.game.loadMoves(moves);
};

TestAi.prototype.logErrorContext = function (player) {
    main.log.error(this.goban.toString());
    main.log.error(player.getMoveSurveyText(1));
    main.log.error(player.getMoveSurveyText(2));
};

TestAi.prototype.checkScore = function(player, color, move, score, expScore, heuristic) {
    main.tests.checkCount++;
    var range = Math.abs(expScore) > 2 ? 0.5 : Math.abs(expScore) / 5 + 0.1;
    if (Math.abs(score - expScore) <= range) return;

    var msg = Grid.colorName(color) + '-' + move +
        ' got ' + score.toFixed(3) + ' instead of ' + expScore +
        (heuristic ? ' for ' + heuristic : '');
    main.log.error('Discrepancy in ' + this.name + ': ' + msg);
    if (Math.abs(expScore) !== BIG_SCORE) this.showInUi(msg);
    this.logErrorContext(player);
    main.tests.warningCount++;
};

// if expEval is null there is not check: value is returned
TestAi.prototype.checkEval = function (move, expEval, heuristic) {
    var coords = Grid.move2xy(move);
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
TestAi.prototype.checkMoveIsBetter = function (move1, move2) {
    main.tests.checkCount++;
    var s1 = this.checkEval(move1), s2 = this.checkEval(move2);
    if (s2 < s1) return;
    var msg = move1 + ' ranked lower than ' + move2 + ' (' + s1 + ' <= ' + s2 + ')';
    main.log.error(msg);
    this.showInUi(msg);
    this.checkEval(move1, BIG_SCORE); // use checkEval to display scores
    this.checkEval(move2, -BIG_SCORE);
};

/** Lets AI play and verify we got the right move.
 *  We abort the test if the wrong move is played
 * (since we cannot do anything right after this happens).
 */
TestAi.prototype.playAndCheck = function (expMove, expEval) {
    if (main.debug) main.log.debug('Letting AI play. Expected move is: ' + expMove);
    var color = this.game.curColor;
    var player = this.players[color];

    var move = player.getMove();
    var score = player.bestScore;
    if (move !== expMove) {
        this.logErrorContext(player);
        // if expMove got a very close score, our test scenario bumps on twin moves
        if (expMove !== 'pass' && Math.abs(this.checkEval(expMove) - score) < 0.001) {
            main.log.error('CAUTION: ' + expMove + ' and ' + move + 
                ' are twins or very close => consider modifying the test scenario');
        }
        this.showInUi('expected ' + Grid.colorName(color) + '-' + expMove + ' but got ' + move);
        assertEqual(expMove, move, Grid.colorName(color)); // test aborts here
    }
    if (expEval) this.checkScore(player, color, move, score, expEval);
    else main.tests.checkCount++;

    this.game.playOneMove(move);
};

TestAi.prototype.checkMovesAreEquivalent = function (moves) {
    main.tests.checkCount++;
    var score0 = this.checkEval(moves[0]).toFixed(2);
    for (var m = 1; m < moves.length; m++) {
        var score = this.checkEval(moves[m]).toFixed(2);
        if (score0 === score) continue;

        var color = this.game.curColor;
        this.showInUi(Grid.colorName(color) + '-' + moves + ' should be equivalent but ' +
            moves[m] + ' got ' + score + ' instead of ' + score0);
        main.tests.warningCount++;
        return false; // stop after 1
    }
    return true;
};

// Verify the move played is one of the equivalent moves given.
// This can only be the last check of a series (since we are not sure which move was played)
TestAi.prototype.playAndCheckEquivalentMoves = function (moves) {
    if (!this.checkMovesAreEquivalent(moves)) return;

    main.tests.checkCount++;
    var color = this.game.curColor;
    var player = this.players[color];
    var move = player.getMove();
    if (moves.indexOf(move) >= 0) return; // one of the given moves was played => GOOD

    var score = player.bestScore.toFixed(3);
    this.showInUi(Grid.colorName(color) + '-' + move + ' got ' + score +
        ' so it was played instead of one of ' + moves);
    main.tests.warningCount++;
};

TestAi.prototype.checkMoveIsBad = function (move) {
    main.tests.checkCount++;
    var score = this.checkEval(move);
    if (score <= 0.1) return;

    var color = this.game.curColor;
    this.showInUi(Grid.colorName(color) + '-' + move + ' should be a bad move but got ' + score);
    main.tests.warningCount++;
};

// Parses and runs a series of checks
TestAi.prototype.runChecks = function (checkString) {
    var checks = checkString.split(/, |,/), c;
    for (var n = 0; n < checks.length; n++) {
        var check = checks[n];
        if (check[0] === '!') {
            this.checkMoveIsBad(check.substring(1));
        } else if (check[0] === '#') {
            this.game.playOneMove(check.substring(1));
        } else if (check.indexOf('>') >= 0) {
            var moves = check.split('>');
            if (moves.length > 2) throw new Error('> operator on more than 2 moves');
            this.checkMoveIsBetter(moves[0], moves[1]);
        } else if (check.indexOf('~=') >= 0) {
            c = check.split(/~=|~/);
            this.checkEval(c[0], parseFloat(c[1]), c[2]);
        } else if (check.indexOf('=') >= 0) {
            this.checkMovesAreEquivalent(check.split('='));
        } else if (check.indexOf('|') >= 0) {
            this.playAndCheckEquivalentMoves(check.split('|'));
        } else if (check.indexOf('~') >= 0) {
            c = check.split('~');
            this.playAndCheck(c[0], parseFloat(c[1]));
        } else {
            this.playAndCheck(check);
        }
    }
};

TestAi.prototype.checkGame = function (moves, checks, gsize) {
    this.initBoard(gsize || 5);
    this.playMoves(moves);
    this.runChecks(checks);
};


//--- Tests are below

TestAi.prototype.testEyeMaking = function () {
    // ++@@@
    // +@@OO
    // +@OO+
    // +@@O*
    // +@OO+
    this.checkGame('b3,d3,b2,c3,c2,d2,c4,c1,b1,d1,b4,d4,d5,pass,e5,e4,c5', 'e2');
};

TestAi.prototype.testAiClosesItsTerritory = function () {
    // ++@@+
    // ++@O+
    // ++@O+
    // +@@O+
    // +@OO+
    // e4 might seem to AI like filling up its own space; but it is mandatory here
    this.checkGame('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5', 'e4');
};

TestAi.prototype.testCornerEyeMaking = function () {
    // OOO+*
    // @@OO+
    // +@@OO
    // ++@@O
    // +++@@
    this.checkGame('b3,d3,c3,d4,c2,c4,d2,e2,b4,b5,d1,a5,a4,c5,e1,e3,pass', 'e5');
};

TestAi.prototype.testNoPushFromDeadGroup = function () {
    // white group is dead so pusher should not speak up here
    this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,pass', 'pass');
};

TestAi.prototype.testWrongSaviorAlongBorder = function () {
    this.checkGame('e1,e2,d2', 'c3');
};

TestAi.prototype.testWrongSaviorInCorner = function () {
    this.checkGame('e1,e2,d2,e3,d3,e4,d4', 'b3'); // d1 would be wrong
};

TestAi.prototype.testWrongSaviorInsteadOfKill = function () {
    this.checkGame('e1,d1,d2,c2,c1,b1,d1', 'd3');
};

TestAi.prototype.testWrongSaviorGoingTowardWall = function () {
    this.checkGame('b2,b3,c2,c3,pass,d2,pass,a2', 'pass'); // b1 would be wrong
};

TestAi.prototype.testBorderLock = function () {
    this.checkGame('d4,c3,c4,d3,e3,e2,e4', 'd2'); //FIXME: should be c2
};

TestAi.prototype.testCornerKill = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++@+++
    //   abcdefghj
    this.checkGame('j8,j9,d7,c5,f4,pass,g6,pass', 'c3>h9, h8>h9, c3', 9);
};

TestAi.prototype.testWrongAttack = function () {
    // 5 +++++++++
    // 4 +@@@@O+++
    // 3 ++O@O@O++
    // 2 ++O@O@+++
    // 1 +++OO++++
    //   abcdefghj
    // f3-f2 cannot be saved in g2
    // c1 and f1 are wrong attacks
    this.checkGame('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1',
        'g2', // g2 seems OK
        9);
};

TestAi.prototype.testWrongAttack2 = function () {
    // white-c6 would be great... if it worked; this is a wrong move here
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b5,d1,pass,g4,pass,g6,pass,g7,pass,f7,pass,e7,pass,d7,c7',
        'g5,c6,pass,pass', 7);
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
    this.checkGame('d4,j7,j8,j6,j5,j9,j4,pass,h8,pass',
        'h6=h7, h6~=12.3,' + // h7 is OK too but capturing same 2 stones in a ladder
        '#h6, #h7, g7', // force black in h6 - choice between h6 and h7 may vary due to smaller differences
        9);
};

TestAi.prototype.testLadder = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghj
    this.checkGame('j9,j7,j8,j6,j5,a9,j4,pass', 'h7', 9);
    // we force white to run the ladder to verify black tracks to kill
    this.runChecks('!h6, #h6, h8~=0.6, g6~14');
    this.runChecks('!h5, #h5, h4~=14~Hunter, h4~25'); // h4 big because black j4-j5 is now threatened
    this.runChecks('#g5, h8~=0.6, g7~=8.6, f5~18');
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
    this.checkGame('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5', '!b6,c6', 9);
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
    this.checkGame('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8',
        '!c6, !b6, g4~=8, g4|g6|f3', 9); // g4 takes 8 from Spacer
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
    this.checkGame('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9',
        '!c2,pass,pass', 9); // c2 is wrong: should see white group is dead
};

TestAi.prototype.testBorderDefense = function () {
    // 7 +++++++
    // 6 +++@@@+
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // Issue: after W:a3 we expect B:b5 or b6 but AI does not see attack in b5; 
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3',
        'g5~=1.2~Pusher,' + // no kill for black in g5 but terr gain
        '!b6,' + // FIXME b6 should be close to b5 score: black can save a5 in b6
        'b5~8.7',
        7);
};

TestAi.prototype.testBorderAttackAndInvasion = function () {
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO@
    // 4 O@@@O+O
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see attack in b5 with territory invasion
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass',
        'b5~8.7', 7);
};

TestAi.prototype.testBorderAttackAndInvasion2 = function () {
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
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6',
        'b5~8.7', 7);
};

TestAi.prototype.testBorderClosing = function () {
    // 7 +++++++
    // 6 +@+@@@@
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see f4 is dead inside white territory if g5 is played (non trivial)
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g6',
        'g5~=1.3, g4|g5', 7); // FIXME should be g5 here
};

TestAi.prototype.testEndMoveTerrGain1 = function () {
    // 7 +++++++
    // 6 +++@@@@
    // 5 @@+@OO+
    // 4 O+@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // g4 is actually a valid move for black
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass',
        'g4~5.2, g3~=1.2, g3, g5, e3', 7); // NB: d2 is already dead
};

TestAi.prototype.testKillingSavesNearbyGroupInAtari = function () {
    // 7 +++++++
    // 6 +@+@@@+
    // 5 @++@OO@
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5',
        'e3~=6, g4~9.5, g6~2, !c7', 7);
};

TestAi.prototype.testAiSeesSnapbackAttack = function () {
    // 5 O@+O+
    // 4 O@*@@  <-- here
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4', 'c4, #c5, c4');
};

TestAi.prototype.testSnapbackFails = function () {
    // 7 O@+OO++
    // 6 O@+@@++
    // 5 OO@@+++
    // 4 *@@++++  <-- here a4 kills so snapback is irrelevant
    // 3 ++++O++
    //   abcdefg
    // Snapback c6 is bad idea since black-a4 can kill white group
    this.checkGame('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6',
        '!c6, !f7,' + // f7 is bad since d7-e7 are dead
        '!a4', // white NW group cannot escape
        7); 
};

TestAi.prototype.testAiSeesKillingBringSnapback = function () {
    // 5 O@*OO  <-- c5 is bad idea for Black
    // 4 O@O@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // c5 is a blunder (b2 seems OK)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4', '!c5');
};

TestAi.prototype.testSeesAttackNoGood = function () {
    // 5 O@@OO
    // 4 O@+@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // NB: we could use this game to check when AI can see dead groups
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5',
        'c4~10, !c5'); // c4 kills 3 and saves 2 + 1 (disputable) space in black territory
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
    this.checkGame('d4,c5,d6,c7,c4,c6,b4',
        '!e7, e5~=0.5, e3~=1.3, d5~2.1', // cannot connect if e7 or e5
        7);
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
    this.checkGame('e5,g3,c3,e3,g6,d4,d5,c5,c4,d6,e6,c6,d2,e4,d3',
        '!f5,' + // f5 cannot connect with e4
        'e2~=1.2, g5~=1.3', // FIXME: e2 & g5 should be bigger (invasion blocker's job)
        9);
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
    this.checkGame('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        '!d9,' + // right in enemy territory
        'b8~1.7,' + // huge threat but only if white does not answer it
        'c7~22,' + // If not c7 huge damage, see below
        'pass, pass', // FIXME a6,c9 should be played at some point
        9);
};

TestAi.prototype.testAnotherKillAfterKo = function () {
    // Same game as above but white did not defend -> attack
    this.checkGame('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        '#b8, #c9,' + // right in enemy territory
        'c7~20, #d8,' + // black goes for the kill in c7; too late for white now
        'd6~20, e9~26', // it seems that real score difference for e9 is 26 indeed :)
        9);
};

TestAi.prototype.testSemi1 = function () {
    // NB: scoring sees W group dead, which is true
    this.checkGame('a4,a2,b4,a3,c4,b3,d4,c3,a1,c2,b1,d2,c1,e2,d3,e1,e3',
        'pass, !d1, ' + // W cannot play first. Then black d1 would be a blunder
        '#b2,' + // FIXME: should be b2~16 or so; new job for Shaper
        'd1, #b1'); // FIXME: should be b1~20 or more
};

TestAi.prototype.testSemi2 = function () {
    // Same as above but Black plays d1 by mistake
    this.checkGame('a4,a2,b4,a3,c4,b3,d4,c3,a1,c2,b1,d2,c1,e2,d3,e1,e3',
        'pass, #d1,' +
        'b2~25,' +
        '!b1, !c1, #b1' // Black sees there is no way so we force it in b1
        );
        // + ',c1,' + // FIXME Shaper should be c1
        // 'pass, a1~0.2~Pusher'); // FIXME should be pass, not a1
};

TestAi.prototype.testConnNotNeeded1 = function () {
    this.checkGame('d4,f6,f3,c7,g4,e4,e3,e5,g5,f4,g6,b4,c3', 'f5=~1.1~=Pusher', 7);
};

TestAi.prototype.testConnNotNeededOnBorder = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4', '!b1, b4|d1');
};

TestAi.prototype.testConnNotNeededOnBorder2 = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4,d1,b4,a4', '!d4');
};

TestAi.prototype.testRaceWinOnKo = function () {
    // if AI thinks black group is dead then a2 looks pointless
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,b5,b2,c5,b4,b1,e2,e3,d2,d1,c5,pass,e4,pass,a1,e1,e2',
        'a2,pass,b5');
};

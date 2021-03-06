'use strict';

var CONST = require('../constants');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var inherits = require('util').inherits;
var log = require('../log');
var main = require('../main');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


function TestAi(testName) {
    TestCase.call(this, testName);
}
inherits(TestAi, TestCase);
module.exports = TestAi;


TestAi.prototype.initBoard = function (size, handicap, rules) {
    var game = this.game = new GameLogic();
    game.setRules(rules === 'CH' ? CONST.CH_RULES : CONST.JP_RULES);
    game.newGame(size, handicap || 0);
    this.goban = game.goban;
    this.players = [
        new main.defaultAi(game, BLACK),
        new main.defaultAi(game, WHITE)
    ];
    game.setPlayer(BLACK, this.players[BLACK].name);
    game.setPlayer(WHITE, this.players[WHITE].name);
};

TestAi.prototype.logErrorContext = function (player, move) {
    if (this.isBroken) return;
    log.error(this.goban.toString());
    log.error(player.getMoveSurveyText(move));
};

TestAi.prototype.checkScore = function(player, color, move, score, expScore, heuristic) {
    var range = 0.25 * expScore + 0.5;
    if (this.check(Math.abs(score - expScore) <= range)) return;

    var msg = Grid.colorName(color) + '-' + move +
        ' got ' + score.toFixed(3) + ' instead of ' + expScore +
        (heuristic ? ' for ' + heuristic : '');
    this.logErrorContext(player, move);
    this.fail(msg);
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

TestAi.prototype._parseMove = function (expMove) {
    if (expMove[0] === 'B' || expMove[0] === 'W') {
        this.assertEqual(expMove[0], this.game.curColor === BLACK ? 'B' : 'W');
        expMove = expMove.substr(1);
    }
    return expMove;
};

TestAi.prototype._moveOrValue = function (mv) {
    if (mv[0] > '9') {
        mv = this._parseMove(mv);
        var player = Grid.colorName(this.game.curColor);
        var score = this.checkEval(mv);
        return [score, player + '-' + mv + '/' + score.toFixed(2)];
    } else {
        return [parseFloat(mv), mv];
    }
};

// Checks that move1 is better than move2|value
TestAi.prototype.checkMoveIsBetter = function (move1, move2) {
    var m1 = this._moveOrValue(move1), m2 = this._moveOrValue(move2);
    if (this.check(m2[0] < m1[0])) return;

    var msg = m1[1] + ' should have been greater than ' + m2[1];
    this.fail(msg);
};

/** Lets AI play and verify we got the right move.
 *  We abort the test if the wrong move is played
 * (since we cannot do anything right after this happens).
 */
TestAi.prototype.playAndCheck = function (expMove, expEval, doNotPlay) {
    expMove = this._parseMove(expMove);
    if (doNotPlay && expEval) return this.checkEval(expMove, expEval);
    var color = this.game.curColor;
    var player = this.players[color];

    var move = player.getMove();
    var score = player.bestScore;
    if (move !== expMove) {
        this.logErrorContext(player, move);
        // if expMove got a very close score, our test scenario bumps on twin moves
        if (expMove !== 'pass' && Math.abs(this.checkEval(expMove) - score) < 0.001) {
            log.error(this.name + ': ' + expMove + ' and ' + move + 
                ' are twins or very close => consider modifying the test scenario');
        }
        expMove = Grid.colorName(color) + '-' + expMove;
        this.assertEqual(expMove, move); // test aborts here
    }
    if (expEval) this.checkScore(player, color, move, score, expEval);
    else this.check(true); // just counts the check

    if (!doNotPlay) this.game.playOneMove(move);
};

TestAi.prototype.checkMovesAreEquivalent = function (moves) {
    var score0 = this.checkEval(moves[0]).toFixed(3);
    for (var m = 1; m < moves.length; m++) {
        var score = this.checkEval(moves[m]).toFixed(3);
        if (this.check(score0 === score)) continue;

        var color = this.game.curColor;
        this.fail(Grid.colorName(color) + '-' + moves + ' should be equivalent but ' +
            moves[m] + ' got ' + score + ' instead of ' + score0);
    }
    return true;
};

// Verify the move played is one of the given moves.
// This can only be the last check of a series (since we are not sure which move was played)
TestAi.prototype.playAndCheckMoveIsOneOf = function (moves) {
    var color = this.game.curColor;
    var player = this.players[color];
    var move = player.getMove();
    if (this.check(moves.indexOf(move) >= 0)) return; // one of the given moves was played => GOOD

    var score = player.bestScore.toFixed(3);
    this.fail(Grid.colorName(color) + '-' + move + ' got ' + score +
        ' so it was played instead of one of ' + moves);
};

TestAi.prototype.checkMoveIsBad = function (move) {
    var score = this.checkEval(move);
    if (this.check(score <= 0.1)) return;

    var color = this.game.curColor;
    this.fail(Grid.colorName(color) + '-' + move + ' should be a bad move but got ' + score.toFixed(3));
};

function parseBinaryOp(op, check) {
    var moves = check.split(op);
    if (moves.length > 2) throw new Error(op + ' operator on more than 2 moves');
    return moves;
}

// Parses and runs a series of checks
TestAi.prototype.runChecks = function (checkString) {
    var checks = checkString.split(/, |,/), c, moves;
    for (var n = 0; n < checks.length; n++) {
        var check = checks[n];
        var doNotPlay = check[0] === '?';
        if (doNotPlay) check = check.substr(1);

        if (check[0] === '!') {
            this.checkMoveIsBad(check.substr(1));
        } else if (check[0] === '#') {
            this.game.playOneMove(check.substr(1));
        } else if (check.indexOf('>') >= 0) {
            moves = parseBinaryOp('>', check);
            this.checkMoveIsBetter(moves[0], moves[1]);
        } else if (check.indexOf('<') >= 0) {
            moves = parseBinaryOp('<', check);
            this.checkMoveIsBetter(moves[1], moves[0]);
        } else if (check.indexOf('=') >= 0) {
            this.checkMovesAreEquivalent(check.split('='));
        } else if (check.indexOf('|') >= 0) {
            this.playAndCheckMoveIsOneOf(check.split('|'));
        } else if (check.indexOf('~') >= 0) {
            c = check.split('~');
            this.playAndCheck(c[0], parseFloat(c[1]), doNotPlay);
        } else {
            this.playAndCheck(check, null, doNotPlay);
        }
    }
};

TestAi.prototype.checkGame = function (moves, checks, gsize, rules) {
    this.initBoard(gsize || 5, 0, rules);
    this.game.loadMoves(moves);
    this.runChecks(checks);
};

TestAi.prototype.checkGameTODO = function (moves, checks, gsize, rules) {
    this.startBrokenTest();
    this.checkGame(moves, checks, gsize, rules);
};

//--- Tests are below

TestAi.prototype.testAiInternals = function () {
    this.initBoard(5);
    this.assertEqual('c3 (6.40)\n- Spacer: 6.40\n', this.players[BLACK].getMoveSurveyText('c3', true));
};

TestAi.prototype.testEyeMaking1 = function () {
    // ++@@@
    // +@@OO
    // +@OO+
    // +@@O*
    // +@OO+
    this.checkGame('b3,d3,b2,c3,c2,d2,c4,c1,b1,d1,b4,d4,d5,pass,e5,e4,c5', 'e2');
};

TestAi.prototype.testEyeClosing = function () {
    // a4 saves or kills white group
    this.checkGame('a2,b4,b2,c4,c2,d4,d2,e4,e2,b5,a3,c5', 'a4>30, #pass, a4>30, a4');
};

TestAi.prototype.testClosingEyeWouldFail = function () {
    // ++@@+
    // ++@O+
    // ++@O+
    // +@@O+
    // +@OO+
    // e4 would not save W (probably nothing will, actually)
    this.checkGameTODO('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5', 'e4<2');
};

TestAi.prototype.testEyeMaking_3inCorner = function () {
    // OOO+*
    // @@OO+
    // +@@OO
    // ++@@O
    // +++@@
    this.checkGame('b3,d3,c3,d4,c2,c4,d2,e2,b4,b5,d1,a5,a4,c5,e1,e3,pass', 'e5');
};

TestAi.prototype.testEyeMaking_3withPrisoners = function () {
    // only a4 is mandatory to save 1 W eye; a3 is less urgent
    this.checkGame('c4,b4,d4,b3,a2,b5,b2,c5,c2,c3,d2,d3,b1,e3,d1',
        '?e5~1.3, a3<15, #pass, a3, a4>23'); //a3 is best considering NE black is dead
};

TestAi.prototype.testEyeMaking_4inCorner = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1,b4,a4,a5,a3',
        'd5>19,' + // e5 here would work but we don't give it points
        '#pass, !e5, d5>16, d5, #c5, e5'); // W could play e5 or c5 as desperate moves; corner e5 is better
};

TestAi.prototype.testEyeMaking_4attacked1 = function () {
    this.checkGame('Bb5,c5,b4,d5,c4,d4,c3,d3,c2,d2,c1,d1,pass,e1,e4',
        'e3>16');
};

TestAi.prototype.testEyeMaking_4attacked2 = function () {
    this.checkGame('Bb5,c5,b4,d5,c4,d4,c3,d3,c2,d2,c1,d1,pass,e1,e3',
        'e2<1, e4>16');
};

TestAi.prototype.testEyeMaking_4inTshape = function () {
    this.checkGame('a2,a4,b3,b4,a3,c4,c3,d4,c2,d3,d2,e3,d1,e2,e1', 'b1>19, #pass, b1>19');
};

TestAi.prototype.testEyeMaking_4inTshape2 = function () {
    this.checkGame('b1,a4,a2,b4,b3,c4,c3,d4,d3,e4,e2,e3,d1,a3,a1,pass,e1',
        'c2>21, #pass, c2>21'); //TODO c2 should be around 22, not 30 - band cost counts empties 3 times
};

TestAi.prototype.testEyeMaking_4inTshape3 = function () {
    // Similar to above but W is so weak its 2 groups can be killed hence making eyes in c2 become less important
    this.checkGame('b1,a4,a2,b5,b3,c5,c4,d5,d3,e4,b4,e5,e3,pass,e2,pass,d1,pass,e1,pass,a1,pass,c3',
        '?c2~36, #pass, ?c2~36, a3=d4');
};

TestAi.prototype.testEyeMaking_shape5 = function () {
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,e4,c5,b2,a2,pass,a1,b1',
        'e2>21, #pass, e2>21');
};

TestAi.prototype.testEyeMaking_shape5asPlus = function () {
    this.checkGame('b1,a4,a2,b5,b3,c5,c4,d5,d3,e4,b4,e5,e3,pass,e2,pass,d1,pass,e1,pass,a1,f3,d4,a5,a3,f2,f1,g2,g1,f4',
        'c2>35, #pass, c2>35', 7);
};

TestAi.prototype.testEyeMaking_shape5safe = function () {
    // "t" shape of 5; no move needed, group is alive
    // Verify we defend if other AI attacks in b1 or c1
    this.checkGame('a3,a4,b3,b4,a2,c4,c3,d4,c2,d3,d2,e3,e2,pass,e1',
        '#c1, b1>18');
    this.checkGame('a3,a4,b3,b4,a2,c4,c3,d4,c2,d3,d2,e3,e2,pass,e1',
        '!b1, !c1, #b1, c1>18');
};

TestAi.prototype.testEyeMaking_shape6 = function () {
    this.checkGame('c3,b4,c4,b3,d4,b2,c2,b1,c1,b5,e4,c5,e5,d5',
        'd2>21, #pass, d2>21, d2');
};

TestAi.prototype.testEyeMaking_shape6_attacked = function () {
    // Same as above but White attacks first - it should win!
    this.checkGame('c3,b4,c4,b3,d4,b2,c2,b1,c1,b5,e4,c5,e5,pass,d5',
        'd2>21, #pass, d2>21, d2');
};

TestAi.prototype.testEyeMaking_stoneNeedsConnect = function () {
    // Black a5 left as is would be captured, and full black group would die
    // @OOO+
    // +@@O+
    // +@+O+
    // @@+O+
    // +@+O+
    this.checkGame('a2,d3,b2,d4,b1,d2,b3,d1,a5,b5,b4,c5,c4,d5',
        'a4>23, #pass, a4>23');
};

TestAi.prototype.testEyeMaking_stoneNeedsConnect2 = function () {
    // Simple flip of above game
    this.checkGame('a4,d3,b4,d2,b5,d4,b3,d5,a1,b1,b2,c1,c2,d1',
        'a2>23, #pass, a2>23');
};

TestAi.prototype.testEyeMaking_sideEyeMustBeClosed = function () {
    // Same as above but no black stone in a5
    this.checkGame('a2,d3,b2,d4,b1,d2,b3,d1,pass,b5,b4,c5,c4,d5',
        'a4>19, #pass, a4>19'); // TODO: Shaper should find 19 here
};

TestAi.prototype.testRace1 = function () {
    // W loses the race because j1 & g2
    this.checkGameTODO('e5,e3,e4,d6,g6,e6,f7,f5,f6,f4,d4,c5,f3,g4,e2,c3,d3,c4,c2,h5,g3,h4,h3,b2,j4,e7,e8,c1,d7,d2,c7,b6,b7,e1,f1,d1,a6,c6,b5,b4,h6,a5,a7,g1,f2,h2,j2,d5,e3,j5',
        'j6<2,j3>20,j3,!g2,!j1,!h1,#pass,j6', 9);
};

TestAi.prototype.testConnect_misc2 = function () {
    this.checkGameTODO('e5,e3,e4,d6,g6,e6,f7,f5,f6,f4,d4,c5,f3,g4,e2,c3,d3,c4,c2,h5,g3,h4,h3,b2,j4,e7,e8,c1,d7,d2,c7,b6,b7,e1,f1,d1,a6,c6,b5,b4,h6,a5,a7,g1,f2,h2,j2,d5,e3,j5,j3,h1,j6,g8,f8,b8,h7,c8',
        '!d9,d8>15,d8', 9);
};

TestAi.prototype.testPushFromDeadGroup = function () {
    // white group is dead so pusher should not speak up here; a2 is good white threat though
    this.checkGameTODO('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,pass', 'a1<1, a2>15');
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
    this.checkGame('b2,b3,c2,c3,pass,d2,pass,a2', '!b1,!c1,?d1~0.2,d4~0.2');
};

TestAi.prototype.testBorderLock = function () {
    this.checkGameTODO('d4,c3,c4,d3,e3,e2,e4', 'd2'); //should be c2?
};

TestAi.prototype.testCornerKillIgnored = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++@+++
    //   abcdefghj
    this.checkGame('j8,j9,d7,c5,f4,pass,g6,pass', 'h9<1.4, h8<1.6, c3>5, e3>5, c3|e3', 9);
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
    this.checkGameTODO('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1',
        '?d7~8, ?d7=f7, g2',
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
        '?h6~14.6, ?h7~13.6,' + // h7 is OK too but capturing same 2 stones in a ladder
        '#h6, #h7, g7', // force black in h6 - choice between h6 and h7 may vary due to smaller differences
        9);
};

TestAi.prototype.testHunterChaseFailsBecauseOfAtari = function () {
    // Black b6 is atari before the chase starts in a1; a1 is not worth much
    this.checkGame('d4,f6,c7,d6,g3,e5,e3,c5,b6,b5,d8,f4,f3,g4,e7,h3,c3,f7,f8,g2,b4,g7,g8,h8,f2,h2,g1,g9,e9,a4,h1,b3,b2,c4,d5,a2,c2,j2,b1,a6,a7,c6',
        '?a1~2.3', 9);
};

TestAi.prototype.testHunterCountsSavedGroupsToo = function () {
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,g2',
        'g1>g6, g1', 7);
};

TestAi.prototype.testHunterCountsSavedGroupsToo2 = function () {
    this.checkGame('e5,c6,d3,g4,g3,f7,c4,e4,e3,d5,f3,f4,c5,e6,g5,f5,h4,b5,g6,b4,b3,g7,h7,h8,h6,j7,d4,j6,f6',
        'h5>e5, h5', 9); // killing in h5 saves too
};

TestAi.prototype.testHunterDoubleAttack = function () {
    // Hunter must see double threat: 'b4' not good because white group dies first
    this.checkGameTODO('d4,d6,f5,g7,g5,g3,e5,d2,c3,c5,c2,d3,c4,f4,d5,e7,e6,c6,f6,f7,h6,e4,g4,h4,h5,h3',
        'e3>13, #e3, e2, f3, f2', 9);
};

TestAi.prototype.testLadder1 = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghj
    this.checkGameTODO('j9,j7,j8,j6,j5,a9,j4,pass', 'h7', 9);
    // we force white to run the ladder to verify black tracks to kill
    this.runChecks('!h6, #h6, !h8, g6>20, g6');
    this.runChecks('!h5, #h5, h4>25, h4'); // h4 big because black j4-j5 is now threatened
    this.runChecks('#g5, !h8, f5');
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
    this.checkGameTODO('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5',
        '?b6~0.5, ?c6~14.3, d6', 9);
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
    this.checkGameTODO('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8',
        'c6<1, b6<1, ?g4~8, ?g4=g6, ?g6=f3, d6', 9); // g4 takes 8 from Spacer
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
    this.checkGameTODO('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9',
        '!c2, pass, pass', 9); // white SW group is dead
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
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3',
        '?g5~4,' + // no kill for black in g5 but terr gain; 3 points, I think
        '?b5~8,' + // b6 should be > b5 score: black can save a5 in b6
        'b6',
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
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass',
        'b5<10, b5', 7); // actual cost is 6 points
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
    // AI should still choose attack in b5
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6',
        'b5<10, b5', 7);
};

TestAi.prototype.testSaveEyeAndLives1 = function () {
    // B should secure 2 eyes with c7; if B-b7, W kills by throw-in c7
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,B-pass,b5,c6,b6',
        'c7>20, #b7, c7>20', 7);
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
        'g5', 7);
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
    // g4 is a valid move for black worth 5 pts in sente. Note d2 is dead.
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass',
        'g4~5.2, g3~0.7, g5, e3', 7);
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
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5',
        '?e3~6, g4~9.5, g6~2, !c7', 7);
};

TestAi.prototype.testKillingSavesToo = function () {
    this.checkGame('e5,c6,d3,g4,g3,f7,c4,e4,e3,d5,f3,f4,c5,e6,g5,f5,h4,b5,g6,b4,b3,g7,h7,h8,h6,j7,d4,j6,f6,e5,h5,h3,h2,j3,j2,j5,j4,h3',
        'j8', 9); // not j3
};

TestAi.prototype.testAiSeesSnapbackAttack1 = function () {
    // 5 O@+O+
    // 4 O@*@@  <-- here
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4', 'c5<0, c4, #c5, c4');
};

TestAi.prototype.testAiSeesSnapbackAttack2 = function () {
    this.checkGameTODO('d4,f6,c7,f4,e3,f3,f2,e5,c5,d6,d8,d7,f8,f7,g3,g4,h4,e8,g8,c8,c6,g5,h5,f9,h7,g7,h8,h6,g9,j7,b8,d9,e9,j6,j8,b9,b7,c3,b4,j5,h3,j4,d2,j3,b2,h2,g2,h1,c2,g1,b3,f1,e2,e1,d3,d1,c1',
        '?j2,#pass,j2', 9);
};

TestAi.prototype.testSnapbackFails = function () {
    // 7 O@+OO++
    // 6 O@+@@++
    // 5 OO@@+++
    // 4 *@@++++  <-- here a4 kills so snapback is irrelevant
    // 3 ++++O++
    //   abcdefg
    // Snapback c6 is bad idea since black-a4 can kill white group
    this.checkGameTODO('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6',
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
    this.checkGameTODO('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5',
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
    this.checkGameTODO('d4,c5,d6,c7,c4,c6,b3,b4,c3,b5,a3',
        '!e7, ?e5~0.5, ?e3~1.3, d5>a4, d5>6, #pass,' + // forces W-pass
        'd5>6, d5',
        // TODO 'a4, a6'
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
    this.checkGameTODO('e5,g3,c3,e3,g6,d4,d5,c5,c4,d6,e6,c6,d2,e4,d3',
        'f5<1,' + // f5 connection with e4 is not great
        '?e2~2.4, ?g5~1.3', // FIXME: e2 & g5 should be bigger (invasion blocker's job)
        9);
};

TestAi.prototype.testPusherInC = function () {
    // White has no interest pushing into "C" shape (beside taking 1 life but it can wait)
    this.checkGame('b1,c1,a1,c2,a2,c3,a3,c4,b3', 'b2<0.5, b4>10, b4');
};

TestAi.prototype.testPushOnFakeEye_DyingGroupJp = function () {
    // B is dead; W should not push
    this.checkGame('Bd2,c3,d3,c2,c1,c4,b2,d4,b3,b4,e4,a4,a3,e2,d5,c5,a1,e5,d1,e3',
        'pass,pass');
};

TestAi.prototype.testPushOnFakeEye_DyingGroupCh = function () {
    // Only with Chinese rules W should push; B is dead anyway
    this.checkGameTODO('Bd2,c3,d3,c2,c1,c4,b2,d4,b3,b4,e4,a4,a3,e2,d5,c5,a1,e5,d1,e3',
        'b1,e4,pass,e1,pass,a2', 5, 'CH');
};

TestAi.prototype.testBlockOnBorder1 = function () {
    this.checkGameTODO('b2,b3,c2,c3,d2,d3,e2,e3,a3', 'a4>b4, a4');
};

TestAi.prototype.testBlockOnBorder2 = function () {
    // Similar as above but here Shaper is not involved; mostly Pusher
    this.checkGame('c4,e4,d5,d3,c3,e5,d4,c2,d2,b2,e3,b3,b4,d1,e1,f3,e6,f2,e2,f1,d3,c1,a3,f5,a2,f6,d6,e7,b1,d7',
        'c7>c6', 7);
};

TestAi.prototype.testBlockOnBorder3 = function () {
    // Similar but threat on eye and whole group
    this.checkGameTODO('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b5,d1,pass,g4,pass,g6,pass,g7,pass,f7',
        '?Be7, #pass, We7, ?Bd7, #pass, Wd7, Bc7', 7);
};

TestAi.prototype.testBlockOnBorder4 = function () {
    this.checkGameTODO('e5,e3,d6,g5,f4,g7,c3,f6,d4,g3,f3,g4,f2,e7,c7,g2,d8,e8,e9', 'f9', 9);
};

TestAi.prototype.testConnectOnBorder1 = function () {
    // a3 is slightly better but there is no way to save Black b1-b2
    this.checkGame('b4,b3,c4,c3,d4,d3,e4,e3,b2,c2,b1,d1', 'a3>6, a4>6, a3|a4');
};

TestAi.prototype.testConnectOnBorderFails = function () {
    this.checkGameTODO('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,a1,d3,e2,e3,d1', '!a4,b4,a4,d5');
};

TestAi.prototype.testConnectOnBorderAndEyeMaking = function () {
    this.checkGame('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,e2,d3,d1',
        '?a4~7, b4'); // TODO e3 is "nice" but b4 is white's only way out
};

TestAi.prototype.testConnectIsImportant = function () {
    this.checkGameTODO('d4,f6,c7,d6,g3,e5,e3,c5,b6,b5,d8,f4,f3,g4,e7,h3,c3,f7,f8,g2,b4,g7,g8,h8,f2,h2,g1,g9,e9,a4,h1,b3,b2,c4,d5,e6',
        'c6>15, #pass, c6>15', 9);
};

TestAi.prototype.testThrowStoneToKillEye = function () {
    // B should throw a stone on the fake spot to destroy 2nd eye and kill W
    this.checkGameTODO('b2,a2,b3,a3,c2,b5,b1,d4,d2,c4,e2,d3,d1,b4,e3,e4,pass,c5', 'Ba4>15');
};

TestAi.prototype.testConnectOnBorderSaves = function () {
    this.checkGameTODO('d6,f6,d4,g3,f4,e5,g5,e4,e7,f3,g4,e3,c3,b6,g7,g6,f7,h6,d5,d3,c7,c6,e6,f5,h4,h5,h3,j4,h2,g2,d2,e2,c5,c2,b2,d1,h7,b7,j6,j3,b8,j5,j7,h1,a7,b5,a6,b4,b3,b1,c4,c8,d7,d8,a5,b9,a4,e8,f8,b6,b7,h8,c6,j8,e9,g8,d9,a1,a2',
        'c1~4', 9);
};

TestAi.prototype.testBigConnectScore = function () {
    // ideal score is 48 actually because c3 kills or save everyone
    this.checkGameTODO('a4,b2,b4,b3,b5,a3,c4,d4,c2,d3,d2,b1,c1,e3,e2,d5', 'c3>19, c3');
};

TestAi.prototype.testConnect1 = function () {
    this.checkGameTODO('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,g3,f6,f3,e6,e3,d6,d4,d7,b5,f7,d5,c6,a5,c3,a4,c4',
        '?c5, e5>f4, e5>e4, e5>f5, #pass, ?c5', 7);
};

TestAi.prototype.testConnectSavesMore = function () {
    // Not connecting in d8 seems wrong; W loses around 12 pts
    this.checkGame('e5,d7,g6,c4,e3,d3,d2,d5,e6,d6,c3,g3,d4,f2,b4,f4,c5,e8,c6,f7,c7,f5,e2,f6,e4,g8,f1,c8,b8,b9,a8,g1,e1,h6,e7',
        'd8>g5, d8>h7, d8', 9);
};

TestAi.prototype.testUselessConnect = function () {
    this.checkGameTODO('a2,a6,b2,b6,b1,b7,c2,f1,d2,f2,d1,g2,g6,f3,f6,f4,e6,g4,d6,b5,d7,b4,f7,a4,d3,e4,d5,c4',
        'd4<1, d4, pass, pass', // see that all the space between live groups is waste
        7);
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
    this.checkGameTODO('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        'd9<b8,' + // d9 is interesting but W has then c7 or d6 to make 2nd eye
        // NB: black b2 is good too but black is in no hurry; testSemi1 covers this.
        'b8~1.7,' + // huge threat but only if white does not answer it
        'c7~22,' + // If not c7 huge damage, see below
        'a6, h1, g2, c9, h2, a9', //FIXME h2 is not needed
        9);
};

TestAi.prototype.testAnotherKillAfterKo = function () {
    // Same game as above but white did not defend -> attack
    this.checkGameTODO('d4,f6,f3,f4,e4,e5,d6,c5,c7,d5,g3,c6,c4,d7,b4,e6,g4,f5,h6,h5,g5,h4,h3,g6,j5,c8,j4,b7,h7,g8,g7,j8,h8,f8,f7,a5,b5,a6,b6,a3,a4,b3,a7,d3,e3,c3,e7,e2,f2,d2,c1,f1,g1,e1,b1,c2,a1,a2,a8,h9,j7,b9,j9,g9,j8,e8',
        '#b8, #c9,' + // right in enemy territory
        'c7~26, #d8,' + // black goes for the kill in c7; too late for white now
        'e9~26', // should be 'd6~20, e9~26', // it seems that real score difference for e9 is 26 indeed :)
        9);
    //TODO One-eye group can survive if e9 + Ko battle
};

TestAi.prototype.testBattledVoidNotSplit = function () {
    // We may see a 3 vertex eye for Black in SW corner, but white stone is next to it
    // so White should not jump on a1
    this.checkGameTODO('d4,d2,c3,d6,e5,c5,e3,c4,d5,b3,c2,c1,b2,b4,a3',
        '!a1, ?a4~1.5, ?e2=e6, ?e2~2.9',
        7);
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
        'b2~24,' +
        '!b1, !c1, #b1' // Black sees there is no way so we force it in b1
        );
        // + ',c1,' + // FIXME Shaper should be c1
        // 'pass, a1~0.2~Pusher'); // FIXME should be pass, not a1
};

TestAi.prototype.testConnNotNeeded1 = function () {
    this.checkGame('d4,f6,f3,c7,g4,e4,e3,e5,g5,f4,g6,b4,c3', 'f5<0.5', 7);
};

TestAi.prototype.testConnNotNeededOnBorder = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4',
        'b1<1, b4, d4, c5, ?d5=d1, #d5, b5, d1, b1, pass, pass');
};

TestAi.prototype.testConnNotNeededOnBorder2 = function () {
    this.checkGame('c3,c2,b3,d3,b2,d2,c1,c4,d1,b4,a4', '!d4');
};

TestAi.prototype.testRaceWinOnKo = function () {
    // if AI thinks black group is dead then a2 looks pointless
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,b5,b2,c5,b4,b1,e2,e3,d2,d1,c5,pass,e4,pass,a1,e1,e2',
        'a2,pass,b5');
};

TestAi.prototype.testKillRace1 = function () {
    // both sides have a group with 1 eye of size 2; who plays first wins
    this.checkGameTODO('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,d2,c1,d3,a1',
        'a2>60, ?a2=b2, #pass, b5>41, ?b5=c5', 9); // a2|b2 also saves our group so big impact
};

TestAi.prototype.testKillRace2 = function () {
    // same as above but W's eye is actually shared by 2 brothers
    this.checkGameTODO('d4,f4,d6,g7,f6,e5,g5,e6,e3,f7,g6,e7,g3,g4,d5,h4,c7,f3,g2,f2,e4,f5,h6,d7,d8,e8,c8,h5,h7,d9,g8,j6,h8,j7,f9,e9,f8,j8,h9,c9,e2,f1,e1,b8,c6,b7,b6,a6,pass,b5,b4,c5,c4,h3,h2,g1,a5,j2,j4,j3,a7,a8,a6,b9,pass,c2,b2,b1,d1,b3,a2,a3,a4,c3,c1,a1,d3,d2',
        'a2>53, ?a2=b2, #pass, b5>41, ?b5=c5', 9);
};

TestAi.prototype.testKillGroupWith2Lives = function () {
    // TODO use this board for seki test - just make top-left White group alive => seki in bottom-right
    this.checkGame('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5,c4,e4,c5,b2,a2,pass,a1,b1,e2,d2,e1',
        'b4>12, b5>12'); //TODO bigger than 12 when our band-threat will be done
};

TestAi.prototype.testBlockAndConnect = function () {
    // Blocking in g5 also protects the cut
    this.checkGameTODO('d4,f6,c7,f4,e7,f7,e3,f3,e5,e8,f5', 'g5', 9);
};

TestAi.prototype.testSaferToConnect = function () {
    this.checkGameTODO('d4,f6,g3,d6,c5,c6,b6,e5,e3,f4,h4,g4,h6,g6,c7,d7,d8,h5,j5,f3,f8,f7,h7,e2,d3,g2,h3,d2,h2,e8,g8,c8,b7,e9,b8,d9,g5,c3,b4,b3,g1',
        'f2>f1, f2', 9);
};

TestAi.prototype.testBlockSavesGroup = function () {
    this.checkGameTODO('d4,f6,g3,d6,c5,c6,b6,e5,e3,f4,h4,g4,h6,g6,c7,d7,d8,h5,j5,f3,f8,f7,h7,e2,d3,g2,h3,d2,h2,e8,g8,c8,b7,e9,b8,d9,g5,c3,b4,b3,g1,c2,f2,b9,a3',
        'a2', 9);
};

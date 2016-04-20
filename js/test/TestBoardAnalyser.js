'use strict';

var CONST = require('../constants');
var main = require('../main');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var GRID_BORDER = CONST.GRID_BORDER;


/** @class Set main.debug to true for details
 */
function TestBoardAnalyser(testName) {
    TestCase.call(this, testName);
}
inherits(TestBoardAnalyser, TestCase);
module.exports = TestBoardAnalyser;


TestBoardAnalyser.prototype.initBoard = function (gsize, handicap) {
    this.game = new GameLogic();
    this.game.newGame(gsize || 5, handicap || 0);
    this.goban = this.game.goban;
    this.grid = new Grid(gsize, GRID_BORDER);
};

TestBoardAnalyser.prototype.checkGame = function (moves, expScore, gsize, finalPos) {
    this.initBoard(gsize || 5);
    if ('+O@'.indexOf(moves[0]) !== -1) {
        this.loadImage(moves); // an image, not the list of moves
    } else {
        this.game.loadAnyGame(moves);
    }
    if (finalPos) this.assertEqual(finalPos, this.goban.image());
    this.boan = new main.defaultAi.BoardAnalyser(this.game);
    this.boan.countScore(this.goban);

    var score = this.boan.getScoringGrid().image();
    if (this.check(!expScore || score === expScore)) return;
    this.fail('Expected scoring grid was:<br>' + expScore + ' but we got:<br>' + score);
};

TestBoardAnalyser.prototype.checkGameTODO = function (moves, expScore, gsize, finalPos) {
    this.startBrokenTest();
    this.checkGame(moves, expScore, gsize, finalPos);
};

TestBoardAnalyser.prototype.loadImage = function (moves) {
    var pos = 0, gsize = this.game.goban.gsize;
    for (var j = gsize; j >= 1; j--) {
        for (var i = 1; i <= gsize; i++) {
            var stone = moves[pos++];
            if (stone === '+') continue;
            var color = stone === 'O' ? 'W' : 'B';
            this.game.playOneStone(color + Grid.xy2move(i, j));
        }
        pos++; // skips the line separator
    }
    this.game.loadMoves('pass,pass');
};

TestBoardAnalyser.prototype.checkScore = function (prisoners, dead, score) {
    this.assertEqual(prisoners, this.goban.countPrisoners());
    var futurePrisoners = this.boan.prisoners;
    this.assertEqual(dead[BLACK], futurePrisoners[BLACK] - prisoners[BLACK], 'BLACK dead');
    this.assertEqual(dead[WHITE], futurePrisoners[WHITE] - prisoners[WHITE], 'WHITE dead');

    this.assertEqual(score, this.boan.scores);
};

//---


// Coverage & base methods
TestBoardAnalyser.prototype.testInternals = function () {
    this.initBoard(5);
    this.game.loadMoves('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1,pass,e3');
    // -##--
    // ###--
    // ----@
    // @@@@-
    // -@-@-
    var ba = this.boan = new main.defaultAi.BoardAnalyser(this.game);
    ba.analyseTerritory(this.goban, this.grid, WHITE);

    // Voids
    var v = ba.allVoids[0];
    var gi = ba.allGroupInfos[1];
    this.assertEqual(true, v.isTouching(gi));
    this.assertEqual(false, v.isTouching(ba.allGroupInfos[2]));
    this.assertEqual('{eye-a1 vcount:1 black:#1 white:-}', v.toString());
    this.assertEqual('{eye-e1 vcount:2 black:#3,#1 white:-}', ba.allVoids[2].toString());
    this.assertEqual('{void-a3 vcount:8 black:#1,#3 white:#2}', ba.allVoids[3].toString());

    //Coverage
    this.assertEqual(true, ba.debugDump().length > 100);
    this.assertEqual('#3,#1', gi.band.toString());
};

TestBoardAnalyser.prototype.testWeirdEmptyBoard = function () {
    // Just makes sure the analyser does not crash on empty boards.
    // Scoring these boards makes no sense so we don't check the result.
    this.checkGame('');
    this.checkGame('c3');
    this.checkGame('c3,d5');
    this.checkGame('c3,d4');
};

TestBoardAnalyser.prototype.testDoomedGivesEye1 = function () {
    // White group is doomed; verify its eye is counted right
    this.checkGame('a2,b4,b2,c4,c2,d4,d2,e4,e2,b5,a3,c5,a4,pass,pass',
        '-##--,@####,@----,@@@@@,-----');
};

TestBoardAnalyser.prototype.testDoomedGivesEye2 = function () {
    // Same as above test but white's dead group does not "touch" black.
    // This triggers a special case in analyser (white is dead without "killer")
    this.checkGame('a2,a4,b2,b4,c2,b5,b1,c5,d2,c4,d1,pass,pass',
        '-##--,' +
        '###--,' +
        '-----,' +
        '@@@@-,' +
        '-@-@-');
};

TestBoardAnalyser.prototype.testDoomedGivesEye3 = function () {
    this.todo('Handle seki'); // add a test in which both should stay alive
    // Both groups have a single eye but B has 2 more lives so he would win the race
    this.checkGame('a2,a4,b2,b4,c2,b5,c3,pass,d3,pass,d4,pass,d5,pass,a1,pass,b1,pass,c1,pass,e3,pass,e4,pass,e5,pass,pass',
        '-#-@@,##-@@,--@@@,@@@--,@@@--');
};

TestBoardAnalyser.prototype.testTwoSingleEyeConnectedByEye = function () {
    // Black SW and center groups survive depending on each other; c4 is a real eye
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,d1,e1,c1,g1,pass,pass',
        ':::::::,' +
        'OOOOOO:,' +
        'O@@@@@O,' +
        'O@-@-@O,' +
        'OO@O@@O,' +
        '@@@OOO:,' +
        '-@@@O:O', 7);
    // and a variation:
    this.checkGame('a2,a3,b2,b3,c2,a4,b1,a5,c3,b6,b4,a6,b5,c6,c5,d6,d5,e6,e5,f6,f5,g5,f4,g4,f3,g3,d4,f2,e3,e2,pass,d2,pass,d3,d1,e1,g1,g2,c1,pass,pass',
        ':::::::,' +
        'OOOOOO:,' +
        'O@@@@@O,' +
        'O@-@-@O,' +
        'OO@O@@O,' +
        '@@@OOOO,' +
        '-@@@O:&', 7);
};

TestBoardAnalyser.prototype.testUnconnectedBrothers = function () {
    this.checkGame('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,g6,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g4,g3,g5,f4,pass,pass',
        '-------,---@@@@,@@-@OO@,O?@@OO@,OOOO:OO,::O&O::,:::::::', 7);
};

TestBoardAnalyser.prototype.testFightTwoGroupsOfOneEye = function () {
    // Black wins clearly because he can make 2 eyes while white cannot.
    this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,a2,pass,pass',
        '---@@,-@@@#,-@###,@@@#-,-###-');
};

TestBoardAnalyser.prototype.testFightTwoGroupsOfOneEye2 = function () {
    // Same as above but black's a1 stone can be taken
    // TODO: review it; this is actually not obvious - seems W is winning
    // this.checkGame('b3,d3,c2,c3,b2,d2,c4,c1,d4,e4,d5,b1,e5,e3,b4,d1,a1,pass,pass',
    //     '---@@,-@@@#,-@###,-@@#-,@###-');
};

TestBoardAnalyser.prototype.testTwoFakeEyesChained = function () {
    // a5 is a fake eye but so is c5 -> W is dead
    this.checkGame('Bc3,c4,b4,d4,d2,e3,e4,b5,b1,a4,b3,d5,d1,e2,c2,a2,a3,d3,pass,e1,pass,pass',
        '-#-#-,#@##@,@@@##,#-@@#,-@-@#');
};

TestBoardAnalyser.prototype.testTwoFakeEyesChained2 = function () {
    // Similar but a4 not in atari and W is alive - b5 needs to connect because a4 needs it
    this.checkGame('c3,c4,b4,e4,d2,e3,pass,b5,b1,a4,b3,d5,d1,e2,c2,d3,a2,e1,pass,pass',
        '?O?O:,O@O:O,?@@OO,@-@@O,-@-@O');
};

TestBoardAnalyser.prototype.testSeeTwoGroupsSharingSingleEyeAreDead = function () {
    // 5 O&:&&
    // 4 O&:&&
    // 3 OO&&&
    // 2 :OOOO
    // 1 :::::
    //   abcde
    this.checkGame('b5,a5,b4,a4,d5,a3,d4,b3,c3,b2,d3,c2,e5,d2,e4,e2,e3,pass,pass',
        'O&:&&,O&:&&,OO&&&,:OOOO,:::::');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_1 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 ####@
    // 1 -@-#@
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e2,d1,e1,pass,e3,pass,b1,pass,pass',
        '-----,-----,@@@@@,####@,-@-#@');
};

TestBoardAnalyser.prototype.testNoTwoEyes3_2 = function () {
    // White group is dead - having a dead kamikaze + an empty spot in NE corner should not change that
    this.checkGame('c3,d3,c2,d2,c4,c1,b1,d1,b2,d4,d5,e4,e2,pass,c5,pass,pass',
        '--@@-,' +
        '--@##,' +
        '--@#-,' +
        '-@@#@,' +
        '-@##-');
};

TestBoardAnalyser.prototype.testNoTwoEyesDeadEnemy = function () {
    // Black group is dead - having a dead kamikaze should not change that
    this.checkGame('c3,c4,b4,d4,c5,d3,d2,c2,b3,e2,b2,d1,d5,b1,e5,e4,b5,a1,a2,a4,c1,d2,a5,b1,pass,pass',
        '&&&&&,' +
        'O&OOO,' +
        ':&&O:,' +
        '&&OOO,' +
        ':O:O:');
};

TestBoardAnalyser.prototype.testTwoEyes5_1 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 OOOOO
    // 1 :&:::
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,b1,pass,pass',
        '-----,-----,@@@@@,OOOOO,:&:::');
};

TestBoardAnalyser.prototype.testNoTwoEyes4_2 = function () {
    // 5 -----
    // 4 -----
    // 3 @@@@@
    // 2 #####
    // 1 -@@-#
    //   abcde
    this.checkGame('a3,a2,b3,b2,c3,c2,d3,d2,e3,e2,c1,pass,b1,e1,pass,pass',
        '-----,-----,@@@@@,#####,-@@-#');
};

// Reversed from the one above, just in case order is important
TestBoardAnalyser.prototype.testNoTwoEyes4_2_UP = function () {
    // 5 :OO:&
    // 4 &&&&&
    // 3 OOOOO
    // 2 :::::
    // 1 :::::
    //   abcde
    this.checkGame('a4,a3,b4,b3,c4,c3,d4,d3,e4,e3,e5,c5,pass,b5,pass,pass',
        ':OO:&,&&&&&,OOOOO,:::::,:::::');
};

// All white groups are soon dead but not yet; black should win easily
TestBoardAnalyser.prototype.testRaceForLife = function () {
    this.checkGame('a3,a4,b3,b4,c4,c5,d4,pass,e4,pass,c3,a2,b2,c2,b1,c1,d2,d1,e2,pass,d3,pass,e3,pass,pass',
        '--#--,##@@@,@@@@@,#@#@@,-@##-');
};

TestBoardAnalyser.prototype.testDeadGroupSharingOneEye = function () {
    // SE-white group is dead
    // 9 ::O@@----
    // 8 :::O@----
    // 7 ::OO@@@@-
    // 6 :::OOOO@@
    // 5 :OO@OO@--
    // 4 :O@@O@@@@
    // 3 OOO@@@##@
    // 2 OO@@##-#@
    // 1 :OO@@##-@
    //   abcdefghj
    this.checkGame('++O@@++++,+++O@++++,++OO@@@@+,+++OOOO@@,+OO@OO@++,+O@@O@@@@,OOO@@@OO@,OO@@OO+O@,+OO@@OO+@',
        '::O@@----,:::O@----,::OO@@@@-,:::OOOO@@,:OO@OO@--,:O@@O@@@@,OOO@@@##@,OO@@##-#@,:OO@@##-@', 9);
};

TestBoardAnalyser.prototype.testOneEyePlusFakeDies = function () {
    this.checkGame('a2,a3,b2,b4,b3,a4,c3,c4,d2,d3,c1,e2,pass,d1,pass,e1,pass,e3,pass,d4,pass,pass',
        ':::::,' +
        'OOOO:,' +
        'O&&OO,' +
        '&&:&O,' +
        '::&OO');
};

TestBoardAnalyser.prototype.testSmallGame1 = function () {
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
    this.checkGame('c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,j5,j6,e4,j4,j3,h8,c8,d3,j5,f3,g2,j4,b5,b4,a5,j5,pass,pass',
        '::O@@----,:&OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@?OOOO@,#@@@@@O:O,---@OOO::,---@@O:::', 9,
        '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++');

    this.checkScore([4, 5], [1, 1], [16, 12]);
};

TestBoardAnalyser.prototype.testSmallGame2 = function () {
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
    // SW white group is dead
    this.checkGame('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,j3,h3,f1,j2,e1,j4,d1,a2,a4,h1,c8,j8,f8,j9,g9,pass,pass',
        '-@--@@@@O,' +
        '-@@@@@@OO,' +
        '@@-@-@@O:,' +
        '-@-@--@O:,' +
        '-@-@@-@O:,' +
        '@@@---@OO,' +
        '@##@@@@O:,' +
        '##-###@OO,' +
        '--#@@@@O:', 9);
};

TestBoardAnalyser.prototype.testSmallGame3 = function () {
    // White S-W group connects through a dead enemy - otherwise it would die
    this.checkGameTODO('f4,f6,d6,c3,d4,e5,g5,e4,e7,d3,g7,d5,c4,b4,g6,c5,f7,b6,c7,f3,e6,f5,g4,g2,g3,h3,c6,h4,b7,h5,a6,h6,b5,h7,h8,j8,a4,g8,b3,b2,c4,f8,a2,c2,e8,h9,f9,b1,e2,e3,f2,h2,d2,f1,d1,c1,pass,g9,e9,d8,d9,c8,b8,pass,c9,pass,d7,pass,pass',
        '--@@@@OO:,' +
        '-@--@OO:O,' +
        '-@@@@@@O:,' +
        '@-@@@O@O:,' +
        '-@OOOO@O:,' +
        '@?@?O@@O:,' +
        '?@OOOO@O:,' +
        '@OO&&&OO:,' +
        '?OO&:O:::',
        9);
};

TestBoardAnalyser.prototype.testBigGame1 = function () {
    // Interesting:
    // - a8 is an unplayed move (not interesting for black nor white)
    //   but white group in b7-b8-b9 is DEAD; black a7 is ALIVE
    // - g4 is the only dame
    // - t15 appear as fake eye until weaker group in s16 is known as dead
    this.checkGame('(;FF[4]EV[go19.mc.2010.mar.1.21]PB[fuego19 bot]PW[Olivier Lombart]KM[0.5]SZ[19]SO[http://www.littlegolem.com]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq];B[fp];W[dq];B[eq];W[er];B[ep];W[cq];B[fr];W[cp];B[cn];W[co];B[dn];W[nq];B[oc];W[fc];B[ql];W[pr];B[cg];W[qq];B[mc];W[pg];B[nh];W[qi];B[dr];W[cr];B[nk];W[qe];B[hc];W[db];B[jc];W[cc];B[qj];W[qc];B[qd];W[rd];B[re];W[rc];B[qf];W[rf];B[pe];W[se];B[rg];W[qe];B[qg];W[jq];B[es];W[fe];B[ci];W[no];B[bn];W[bo];B[cs];W[bs];B[pb];W[ef];B[ao];W[ap];B[ip];W[pn];B[qn];W[qo];B[jp];W[iq];B[kq];W[lq];B[kr];W[kp];B[hq];W[lr];B[ko];W[lp];B[kg];W[hh];B[ir];W[ce];B[pm];W[rn];B[ek];W[an];B[am];W[ao];B[re];W[sk];B[qm];W[rm];B[ro];W[rp];B[qp];W[po];B[oo];W[on];B[om];W[nn];B[ii];W[bm];B[cm];W[bl];B[cl];W[bk];B[gi];W[ll];B[lm];W[km];B[kl];W[jm];B[lk];W[ln];B[hi];W[hf];B[kc];W[hm];B[ml];W[jo];B[io];W[jn];B[in];W[im];B[bf];W[be];B[bj];W[ri];B[rj];W[sj];B[rl];W[sl];B[qb];W[ph];B[pi];W[qh];B[ae];W[ad];B[ck];W[ds];B[gm];W[ik];B[kj];W[of];B[gb];W[hn];B[gl];W[ho];B[hp];W[fo];B[nf];W[ne];B[oe];W[ng];B[mf];W[mg];B[mh];W[lg];B[lh];W[lf];B[me];W[le];B[md];W[kf];B[jg];W[eh];B[af];W[cd];B[ak];W[fn];B[sf];W[gh];B[hk];W[fi];B[nm];W[ih];B[ji];W[jh];B[kh];W[er];B[fs];W[oh];B[ib];W[oi];B[oj];W[ni];B[mi];W[nj];B[jk];W[hl];B[ij];W[em];B[ls];W[ms];B[dh];W[ks];B[jr];W[cf];B[bg];W[fj];B[gj];W[fk];B[gk];W[fb];B[hd];W[gc];B[fa];W[ea];B[ga];W[dg];B[mj];W[dl];B[il];W[ej];B[gd];W[fd];B[el];W[fl];B[dk];W[dm];B[sd];W[dr];B[ge];W[gf];B[id];W[jl];B[ik];W[ig];B[jf];W[ld];B[lc];W[di];B[ei];W[ha];B[hb];W[di];B[ch];W[ei];B[fm];W[en];B[do];W[mn];B[mm];W[je];B[kd];W[go];B[gq];W[js];B[is];W[ls];B[ke];W[og];B[ie];W[sh];B[if];W[so];B[he];W[fg];B[pf];W[si];B[sg];W[kn];B[rh];W[sm];B[rk];W[gn];B[eo];W[tt];B[tt];W[tt];B[tt])',
        '::::O@@#-----------,' +
        ':::O:O@@@------@@--,' +
        '::O::OO@-@@@@-@-##-,' +
        'O:O&:O@@@-@O@--@@#@,' +
        '@OO::O@@@#@O@#@@-@-,' +
        '@@O:O:OO@@OO@@O@@-@,' +
        '-@@O:O::O@@OOOOO@@@,' +
        '--@@O:OOOO@@@@OOO@O,' +
        '--@OOO@@@@--@OO@OOO,' +
        '-@-@OO@-@-@-@O@@@@O,' +
        '@#@@@O@@@@-@-@---@O,' +
        '-#@O@O@O@O@-@---@@O,' +
        '@#@OO@@OOOO@@@@@@OO,' +
        'O@@@OOOO@OOOOOOO@O:,' +
        'OOO@@OOO@O&::O&OO:O,' +
        'O:O@@@?@@@OO:::&&O:,' +
        '::OO@-@@--@O:O::O::,' +
        '::OOO@--@@@O:::O:::,' +
        ':O:O@@--@OOOO::::::', 19);

    this.checkScore([7, 11], [5, 9], [67, 59]);
};

TestBoardAnalyser.prototype.testBigGame2 = function () {
    // Interesting:
    // - 3 prisoners "lost" into white SW territory
    // - white group of 3 in h12 is dead, which saves big black North group otherwise with 1 single eye
    // - t9 is a perfect example of fake eye (white has to play here to save group in t8)
    // - single white n19 is alive in a neutral zone because white can connect in n18
    // NB: game was initially downloaded with an extra illegal move (dupe) at the end (;W[aq])
    this.checkGame('(;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]SO[http://www.littlegolem.com];B[pd];W[pp];B[ce];W[dc];B[dp];W[ee];B[dg];W[cn];B[fq];W[bp];B[cq];W[bq];B[br];W[cp];B[dq];W[dj];B[cc];W[cb];B[bc];W[nc];B[qf];W[pb];B[qc];W[jc];B[qn];W[nq];B[pj];W[ch];B[cg];W[bh];B[bg];W[iq];B[en];W[gr];B[fr];W[ol];B[ql];W[rp];B[ro];W[qo];B[po];W[qp];B[pn];W[no];B[cl];W[dm];B[cj];W[dl];B[di];W[ck];B[ej];W[dk];B[ci];W[bj];B[bi];W[bk];B[ah];W[gc];B[lc];W[ld];B[kd];W[md];B[kc];W[jd];B[ke];W[nf];B[kg];W[oh];B[qh];W[nj];B[hf];W[ff];B[fg];W[gf];B[gg];W[he];B[if];W[ki];B[jp];W[ip];B[jo];W[io];B[jn];W[im];B[in];W[hn];B[jm];W[il];B[jl];W[ik];B[jk];W[jj];B[ho];W[go];B[hm];W[gn];B[ij];W[hj];B[ii];W[gk];B[kj];W[ji];B[lj];W[li];B[mj];W[mi];B[nk];W[ok];B[ni];W[oj];B[nh];W[ng];B[mh];W[lh];B[mg];W[lg];B[nn];W[pi];B[om];W[ml];B[mo];W[mp];B[ln];W[mk];B[qj];W[qi];B[jq];W[ir];B[ar];W[mm];B[oo];W[np];B[mn];W[ri];B[dd];W[ec];B[bb];W[rk];B[pl];W[rg];B[qb];W[pf];B[pe];W[of];B[qg];W[rh];B[ob];W[nb];B[pc];W[sd];B[rc];W[re];B[qe];W[ih];B[hi];W[hh];B[gi];W[hg];B[jh];W[lf];B[kf];W[lp];B[nm];W[kk];B[lr];W[lq];B[kr];W[jr];B[kq];W[mr];B[kb];W[jb];B[ja];W[ia];B[ka];W[hb];B[ie];W[id];B[ed];W[fd];B[db];W[eb];B[ca];W[de];B[cd];W[ek];B[ei];W[em];B[gq];W[gp];B[hr];W[hq];B[gs];W[eo];B[do];W[dn];B[co];W[bo];B[ep];W[fo];B[kl];W[lk];B[lm];W[rm];B[rn];W[rl];B[rj];W[sj];B[rf];W[sf];B[rd];W[se];B[sc];W[sg];B[qm];W[oc];B[pa];W[ko];B[kn];W[ea];B[op];W[oq];B[df];W[fe];B[ef];W[da];B[cb];W[aq];B[gj];W[hk];B[na];W[ma];B[oa];W[mc];B[le];W[me];B[oe];W[nl];B[sp];W[sq];B[so];W[qq];B[ne];W[ls];B[ks];W[aj];B[ms];W[ns];B[ls];W[ai];B[dh];W[fj];B[fi];W[fk];B[je];W[is];B[hs];W[sm];B[sk];W[sl];B[si];W[sh];B[ph];W[oi];B[pg];W[kp];B[og];W[mf];B[kh];W[qk];B[pk];W[si];B[ig];W[fp];B[js];W[hp];B[tt];W[tt];B[tt])',
        '--@OO:::O@@?O@@@---,' +
        '-@@@O::O:O@??O@-@--,' +
        '-@@OO:O::O@@OOO@@@@,' +
        '--@@@O::OO@OO??@-@O,' +
        '--@OOO:O@@@@O@@@@OO,' +
        '---@@OO@@-@OOOOO@@O,' +
        '-@@@-@@#@-@O:O@@@OO,' +
        '@--@---##@@O::O@@OO,' +
        'O@@@@@@@@OOOO:OOOOO,' +
        'OO@O@O@O@O:::OO@@@O,' +
        ':OOOOOOOO@OOO:O@OO?,' +
        '::&O::::O@@?OOO@@OO,' +
        ':::OO::&O@-@O@@-@OO,' +
        '::OO&:OO@@@@@@-@@@?,' +
        ':O@@OOO:O@O?@O@@O@@,' +
        ':OO@@OOOO@OOOO@OOO@,' +
        'OO@@-@@OO@@O:OO:O:O,' +
        '@@---@-@OO@@O::::::,' +
        '------@@O@@@@O:::::', 19);

    this.checkScore([11, 6], [3, 3], [44, 55]);
};

//Translated from test_ai.rb using babyruby2js
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Grid = require('../Grid');
var assert_equal = main.assert_equal;

var GameLogic = require('../GameLogic');
var Ai1Player = require('../Ai1Player');
// NB: for debugging think of using @goban.debug_display
TestAi.prototype.init_board = function (size, handicap) {
    if (size === undefined) size = 9;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.goban = this.game.goban;
    this.players = [new Ai1Player(this.goban, main.BLACK), new Ai1Player(this.goban, main.WHITE)];
};


/** @class */
function TestAi(test_name) {
    main.TestCase.call(this, test_name);
    return this.init_board();
}
inherits(TestAi, main.TestCase);
module.exports = TestAi;

// old method; rather use play_and_check below
TestAi.prototype.let_ai_play = function () {
    if (main.debug) {
        main.log.debug('Letting AI play...');
    }
    var player = this.players[this.game.cur_color];
    var move = player.get_move();
    this.game.play_one_move(move);
    return move;
};

TestAi.prototype.check_eval = function (move, color, exp_eval) {
    var i, j;
    var _m = Grid.parse_move(move);
    i = _m[0];
    j = _m[1];
    
    var p = this.players[color];
    p.prepare_eval();
    return assert_in_delta(p.eval_move(i, j), exp_eval + 0.5, 0.5);
};

TestAi.prototype.play_and_check = function (exp_move, exp_color, exp_eval) {
    if (exp_eval === undefined) exp_eval = null;
    if (main.debug) {
        main.log.debug('Letting AI play...');
    }
    var player = this.players[this.game.cur_color];
    if (exp_color !== player.color) {
        throw('Wrong player turn: ' + Grid.color_name(player.color) + ' to play now');
    }
    var move = player.get_move();
    assert_equal(exp_move, move);
    if (exp_eval) {
        assert_in_delta(player.last_move_score, exp_eval + 0.5, 0.5, exp_move + '/' + Grid.color_name(exp_color));
    }
    return this.game.play_one_move(move);
};

TestAi.prototype.test_cornering = function () {
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 +++@+++++
    // 6 +++++++++
    // 5 ++O++++++
    // 4 +++++++++
    //   abcdefghi
    this.game.load_moves('i8,i9,d7,c5');
    return this.play_and_check('h9', main.BLACK, 1); // FIXME: h8 is better than killing in h9 (non trivial)
};

TestAi.prototype.test_pre_atari = function () {
    // 5 +++++++++
    // 4 +@@@@O+++
    // 3 ++O@O@O++
    // 2 ++O@O@+++
    // 1 +++OO++++
    //   abcdefghi
    // f3-f2 can be saved in g2
    // Hunter should not attack in c1 since c1 would be in atari
    this.game.load_moves('d4,e2,d2,c3,d3,c2,b4,d1,c4,f4,f3,e3,e4,g3,f2,e1');
    this.check_eval('c1', main.BLACK, 0);
    return this.play_and_check('g2', main.BLACK, 2);
};

TestAi.prototype.test_hunter_1 = function () {
    // h7 is a wrong "good move"; white can escape with h8
    // 9 ++++++++O
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 +++@++++@
    //   abcdefghi
    this.game.load_moves('d4,i7,i8,i6,i5,i9,i4,pass,h8,pass');
    this.play_and_check('h6', main.BLACK, 2); // h7 ladder was OK too here but capturing same 2 stones in a ladder
    // the choice between h6 and h7 is decided by smaller differences like distance to corner, etc.
    this.game.load_moves('h7');
    return this.play_and_check('g7', main.BLACK, 3);
};

TestAi.prototype.test_ladder = function () {
    // 9 O+++++++@
    // 8 ++++++++@
    // 7 ++++++++O
    // 6 ++++++++O
    // 5 ++++++++@
    // 4 ++++++++@
    //   abcdefghi
    this.game.load_moves('i9,i7,i8,i6,i5,a9,i4,pass');
    this.play_and_check('h7', main.BLACK, 2);
    this.game.load_moves('h6');
    this.play_and_check('g6', main.BLACK, 3);
    this.game.load_moves('h5');
    this.play_and_check('h4', main.BLACK, 6); // 6 because i4-i5 black group is now also threatened
    this.game.load_moves('g5');
    return this.play_and_check('f5', main.BLACK, 5);
};

TestAi.prototype.test_ladder_breaker1 = function () {
    // 9 O++++++++
    // 8 O++++++++
    // 7 O+++O++++
    // 6 +++++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghi
    // Ladder breaker a7 does not work since the whole group dies
    this.game.load_moves('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5');
    return this.play_and_check('c6', main.BLACK, 2);
};

TestAi.prototype.test_ladder_breaker2 = function () {
    // 9 O++++++++
    // 8 OOO++++++
    // 7 O+++O++++
    // 6 ++*++++++
    // 5 @OO@+++++
    // 4 @@@@+++++
    //   abcdefghi
    // Ladder breaker are a7 and e7
    // What is sure is that neither b6 nor c6 works. However b6 is boosted by pusher
    this.game.load_moves('a4,a9,a5,a8,b4,a7,c4,e7,d4,b5,d5,c5,pass,b8,pass,c8');
    this.check_eval('c6', main.BLACK, 0.5);
    return this.play_and_check('b6', main.BLACK, 1);
};

TestAi.prototype.test_see_dead_group = function () {
    // 9 +@++@@@@O
    // 8 +@@@@@@OO
    // 7 @@+@+@@O+
    // 6 +@+@++@O+
    // 5 +@+@@+@O+
    // 4 @@@+++@OO
    // 3 @OO@@@@O+
    // 2 OO+OOO@OO
    // 1 ++O@@@@O+
    //   abcdefghi
    // Interesting here: SW corner group O (white) is dead. Both sides should see it and play accordingly.
    this.game.load_moves('d6,f4,e5,f6,g5,f5,g7,h6,g6,e7,f7,e6,g3,h4,g4,h5,d8,c7,d7,f8,e8,d4,d5,e4,f9,g9,e9,c9,g8,c8,h9,d9,e3,f2,f3,h7,c4,c5,d3,c6,b5,h8,b7,a6,b6,a4,b9,a5,b8,b3,b4,c3,c2,e2,a7,d2,a3,b2,g1,c1,g2,h2,i3,h3,f1,i2,e1,i4,d1,a2,a4,h1,c8,i8,f8,i9,g9');
    this.play_and_check('pass', main.WHITE);
    this.play_and_check('c2', main.BLACK, 2); // TODO: optim here would be @ realizing O group is dead
    this.play_and_check('d2', main.WHITE, 1);
    this.play_and_check('e2', main.BLACK, 1);
    this.play_and_check('pass', main.WHITE);
    return this.play_and_check('pass', main.BLACK); // @goban.debug_display
};

TestAi.prototype.test_border_defense = function () {
    this.init_board(7);
    // 7 +++++++
    // 6 +++@@@+
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // Issue: after W:a3 we expect B:b5 or b6 but AI does not see attack in b5; 
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3');
    this.check_eval('g5', main.BLACK, 0); // no stone to kill for black in g5
    // check_eval("b6",BLACK,1) #FIXME how? black to see he can save a5 in b6 too
    return this.play_and_check('b5', main.BLACK, 1);
};

TestAi.prototype.test_border_attack_and_invasion = function () {
    this.init_board(7);
    // 7 +++++++
    // 6 +++@@@@
    // 5 @*+@OO@
    // 4 O@@@O+O
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see attack in b5 with territory invasion
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6,d1,g5,g4,pass');
    return this.play_and_check('b5', main.WHITE, 1); // TODO: see gain is bigger because of invasion
};

TestAi.prototype.test_border_attack_and_invasion2 = function () {
    this.init_board(7);
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
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,g6');
    return this.play_and_check('b5', main.WHITE, 1);
};

TestAi.prototype.test_border_closing = function () {
    this.init_board(7);
    // 7 +++++++
    // 6 +@+@@@@
    // 5 @++@OO+
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    // AI should see f4 is dead inside white territory if g5 is played (non trivial)
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g6');
    return this.play_and_check('g4', main.WHITE, 1); // FIXME white (O) move should be g5 here
};

TestAi.prototype.test_savior_hunter = function () {
    this.init_board(7);
    // 7 +++++++
    // 6 +++@@@@
    // 5 @@+@OO+
    // 4 O+@@O@+
    // 3 OOOO+O+
    // 2 ++O@O++
    // 1 +++++++
    //   abcdefg
    // g4 is actually a valid move for black
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b5,b3,c4,a4,a5,a3,g6,pass');
    return this.play_and_check('g4', main.BLACK, 1); // black (@) move should be g4 here // assert_equal("g3", let_ai_play) # FIXME: (O) move should be g3 here (since d2 is already dead)
};

TestAi.prototype.test_killing_saves_nearby_group_in_atari = function () {
    this.init_board(7);
    // 7 +++++++
    // 6 +@+@@@+
    // 5 @++@OO@
    // 4 O@@@O@+
    // 3 OOOO+O+
    // 2 ++O+O++
    // 1 +++O+++
    //   abcdefg
    this.game.load_moves('d4,c2,d2,e5,d6,e4,d5,d3,e3,c3,f4,f5,f6,f3,e6,e2,b4,b3,c4,a4,a5,a3,b6,d1,g5');
    this.check_eval('e3', main.WHITE, 3);
    this.play_and_check('g4', main.WHITE, 4);
    this.play_and_check('g6', main.BLACK, 1);
    this.play_and_check('pass', main.WHITE);
    return this.play_and_check('pass', main.BLACK);
};

TestAi.prototype.test_snapback = function () {
    this.init_board(5);
    // 5 O@+O+
    // 4 O@*@@
    // 3 OO@++
    // 2 ++@++
    // 1 +++++
    //   abcde
    // c4 expected for white, then if c5, c4 again (snapback)
    this.game.load_moves('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,e4');
    this.play_and_check('c4', main.WHITE, 1); // FIXME: it should be 2
    this.game.play_one_move('c5');
    return this.play_and_check('c4', main.WHITE, 4); // 3 taken & 1 saved = 4
};

TestAi.prototype.test_snapback2 = function () {
    this.init_board(7);
    // 7 O@+OO++
    // 6 O@+@@++
    // 4 OO@@+++
    // 4 +@@++++
    // 3 ++++O++
    //   abcdefg
    // Snapback is bad idea since a2 can kill white group
    this.game.load_moves('b7,a7,b6,a6,c5,b5,c4,a5,d6,d7,d5,e7,b4,e3,e6');
    this.play_and_check('f7', main.WHITE, 2); // FIXME white should see d7-e7 are dead (territory detection)
    return this.play_and_check('a4', main.BLACK, 4);
};

TestAi.prototype.test_snapback3 = function () {
    this.init_board(5);
    // 5 O@+OO
    // 4 O@O@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // 
    this.game.load_moves('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4');
    // @goban.debug_display
    return this.play_and_check('c5', main.BLACK, 0); // FIXME: should NOT be c5 (count should be -1)
};

TestAi.prototype.test_sees_attack_no_good = function () {
    this.init_board(5);
    // 5 O@@OO
    // 4 O@+@+
    // 3 OO@@+
    // 2 ++@++
    // 1 ++@++
    //   abcde
    // NB: we could use this game to check when AI can see dead groups
    this.game.load_moves('b5,a5,b4,a4,c3,b3,c2,a3,d4,d5,d3,e5,c1,c4,c5');
    this.play_and_check('c4', main.WHITE, 5); // kills 3 and saves 2
    return this.check_eval('c5', main.BLACK, 0); // silly move
};

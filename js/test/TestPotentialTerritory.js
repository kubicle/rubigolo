//Translated from test_potential_territory.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('./main');
var Logging = require('../Logging');
var GameLogic = require('../GameLogic');
var PotentialTerritory = require('../PotentialTerritory');
var assert_equal = main.assert_equal;

// NB: for debugging think of using analyser.debug_dump
TestPotentialTerritory.POT2CHAR = '-\'?.:';
TestPotentialTerritory.prototype.init_board = function (size, handicap) {
    if (size === undefined) size = 5;
    if (handicap === undefined) handicap = 0;
    this.game = new GameLogic();
    this.game.new_game(size, handicap);
    this.goban = this.game.goban;
    this.ter = new PotentialTerritory(this.goban);
};


/** @class */
function TestPotentialTerritory(test_name) {
    return main.Test.Unit.TestCase.call(this, test_name);
}
inherits(TestPotentialTerritory, main.Test.Unit.TestCase);
module.exports = TestPotentialTerritory;

TestPotentialTerritory.prototype.potential_to_s = function (grid) {
    return main.strChop(grid.to_text2(false, ',', function (v) {
        return TestPotentialTerritory.POT2CHAR[2 + v * 2];
    }));
};

TestPotentialTerritory.prototype.test_terr1 = function () {
    this.init_board(9);
    // 9 +++++++++
    // 8 +++O@++++
    // 7 ++O+@+@++
    // 6 ++O++++++
    // 5 +O++O+@@+
    // 4 +O@++++O+
    // 3 +@@+@+O++
    // 2 +++@O++++
    // 1 +++++++++
    //   abcdefghi
    var game = 'c3,c6,e7,g3,g7,e2,d2,b4,b3,c7,g5,h4,h5,d8,e8,e5,c4,b5,e3'; // ,f2,c5,f6,f7,g6,h6,d7,a4,a5,b6,a3,a6,b7,a4,a7,d9,c9,b8,e6,d5,d6,e9,g4,f5,f4,e1,f1,d1,i5,i6,e4,i4,i3,h8,c8,d3,i5,f3,g2,i4,b5,b4,a5,i5"
    this.game.load_moves(game);
    var before = this.goban.image();
    var grid = this.ter.guess_territories();
    assert_equal(before, this.goban.image()); // basic check - goban should have been restored
    var black_first = ':::O@----,:::O@----,::O@@-@--,::O@@----,:O@@-@@@@,OO@-@-@OO,@@@-@@O::,---@OO:::,---@O::::';
    assert_equal(black_first, this.ter._grid(main.BLACK).image());
    var white_first = ':::O@----,:::O@----,::OO@@@--,::O:OO@--,:OO:OO@@@,OO@OO:OOO,@@@?@OO::,---@O::::,---@O::::';
    assert_equal(white_first, this.ter._grid(main.WHITE).image());
    var expected_potential = ':::??----,:::??----,::???\'?--,::?.?\'\'--,:??.\'????,???\'?????,???\'???::,---??.:::,---??::::';
    assert_equal(grid, this.ter.potential().yx);
    return assert_equal(expected_potential, this.potential_to_s(this.ter.potential()));
};

// Test on a finished game
TestPotentialTerritory.prototype.test_small_game_terr = function () {
    this.init_board(9);
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
    this.game.load_moves(game2);
    var final_pos = '++O@@++++,+@OO@++@+,OOOO@@@++,++OOOOO@@,OO@@O@@@@,@@@+OOOO@,O@@@@@O+O,+++@OOO++,+++@@O+++';
    assert_equal(final_pos, this.goban.image());
    this.ter.guess_territories();
    var black_first = '-&O@@----,&&OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@OOOOO@,#@@@@@O:O,#@-@OOO::,---@@O:::';
    assert_equal(black_first, this.ter._grid(main.BLACK).image());
    var white_first = ':OO@@----,O:OO@--@-,OOOO@@@--,::OOOOO@@,OO@@O@@@@,@@@OOOOO@,#@@@@@O:O,#@-@OOO::,---@@O:::';
    assert_equal(white_first, this.ter._grid(main.WHITE).image());
    var expected_potential = '?????----,?.???--?-,???????--,::???????,?????????,?????????,???????:?,??-????::,---???:::';
    return assert_equal(expected_potential, this.potential_to_s(this.ter.potential()));
};

// This test triggers the "if not suicide" in "add_stone" method
TestPotentialTerritory.prototype.test_no_suicide_while_evaluating = function () {
    this.init_board(7);
    this.game.load_moves('d4,d2,e3,b4,e1,c5,d6,d5,c3,e5,d3,b3,b2,c2,a2,e2,f1,f2,b6,c6,f6,e6,f4,d7,f5,f3');
    return this.ter.guess_territories();
};

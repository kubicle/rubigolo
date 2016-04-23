// NB Stone & Goban can hardly be tested separately
'use strict';

var CONST = require('../constants');
var inherits = require('util').inherits;
var GameLogic = require('../GameLogic');
var Goban = require('../Goban');
var Grid = require('../Grid');
var TestCase = require('./TestCase');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class */
function TestGoban(testName) {
    TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestGoban, TestCase);
module.exports = TestGoban;


// Coverage etc.
TestGoban.prototype.testInternals = function () {
    var goban = this.goban;
    goban.playAt(1, 2, BLACK);
    goban.playAt(2, 2, WHITE);
    this.assertEqual(BLACK, goban.colorAt(1, 2));
    this.assertEqual(WHITE, goban.colorAt(2, 2));
    // Coverage
    this.assertEqual(true, goban.debugDump().length > 100);
    // 2 Grid methods
    this.assertEqual(goban.image(), goban.grid.image()); // these 2 could change, actually
    this.assertEqual('(BORDER)(BORDER)', goban.scoringGrid.toString().substr(0, 16));
};

TestGoban.prototype.testSignature = function () {
    var goban = this.goban;
    goban.setPositionalSuperko(true);
    var moves = 'a5,b5,a4,b4,c5,a3,d4,c4,d3,d5,c3,b3,a2,c2,e4,d2,e2,e1,e5,e3,b1,b2,c1,a1'.split(',');
    var color = BLACK;
    for (var n = 0; n < moves.length; n++) {
        var coord = Grid.move2xy(moves[n]), i = coord[0], j = coord[1];

        var incrementalImg = goban.nextMoveImage(i, j, color);

        goban.playAt(i, j, color);
        color = 1 - color;

        var curImg = goban.getPositionSignature();
        this.assertEqual(curImg, incrementalImg);
        this.assertEqual(goban.buildCompressedImage(), curImg);
    }
};

TestGoban.prototype.testSuicide = function () {
    // a2 b2 b1 a3 pass c1
    var goban = this.goban;
    goban.playAt(1, 2, BLACK);
    goban.playAt(2, 2, WHITE);
    goban.playAt(2, 1, BLACK);
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE)); // suicide invalid
    goban.playAt(1, 3, WHITE);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE)); // now this would be a kill
    this.assertEqual(true, goban.isValidMove(1, 1, BLACK)); // black could a1 too (merge)
    goban.playAt(3, 1, WHITE); // now 2 black stones share a last life
    this.assertEqual(false, goban.isValidMove(1, 1, BLACK)); // so this would be a suicide with merge
};

TestGoban.prototype.testKo = function () {
    // pass b2 a2 a3 b1 a1
    var goban = this.goban;
    goban.playAt(2, 2, WHITE);
    goban.playAt(1, 2, BLACK);
    goban.playAt(1, 3, WHITE);
    goban.playAt(2, 1, BLACK);
    goban.playAt(1, 1, WHITE); // kill!
    this.assertEqual(false, goban.isValidMove(1, 2, BLACK)); // now this is a ko
    goban.playAt(4, 4, BLACK); // play once anywhere else
    goban.playAt(4, 5, WHITE);
    this.assertEqual(true, goban.isValidMove(1, 2, BLACK)); // ko can be taken by black
    goban.playAt(1, 2, BLACK); // black takes the ko
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE)); // white cannot take the ko
    goban.playAt(5, 5, WHITE); // play once anywhere else
    goban.playAt(5, 4, BLACK);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE)); // ko can be taken back by white
    goban.playAt(1, 1, WHITE); // white takes the ko
    this.assertEqual(false, goban.isValidMove(1, 2, BLACK)); // and black cannot take it now
};

TestGoban.prototype.testSuperko = function () {
    this.game = new GameLogic();
    this.game.newGame(5);
    var goban = this.goban = this.game.goban;

    goban.setPositionalSuperko(true);

    this.game.loadMoves('a3,b3,a2,b2,pass,a1,b1,c1,pass,a1,pass,a4,a2,pass,b1,pass,a3');
    // W-a1 now would repeat position we had after W-a4
    if (goban.isValidMove(1, 1, WHITE)) {
        this.showInUi('a1 should be invalid: superko');
        this.assertEqual(true, false);
    }
    // undo, redo and verify superko is still detected
    goban.undo();
    goban.playAt(1, 3, BLACK);
    this.assertEqual(false, goban.isValidMove(1, 1, WHITE));
    // a1 is allowed again after another stone is added anywhere
    goban.playAt(4, 2, BLACK);
    this.assertEqual(true, goban.isValidMove(1, 1, WHITE));
};

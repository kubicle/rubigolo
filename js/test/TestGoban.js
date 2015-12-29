// NB Stone & Goban can hardly be tested separately
'use strict';

var main = require('../main');
var inherits = require('util').inherits;
var Goban = require('../Goban');
var GameLogic = require('../GameLogic');

var BLACK = main.BLACK, WHITE = main.WHITE;


/** @class */
function TestGoban(testName) {
    main.TestCase.call(this, testName);
    this.goban = new Goban(5);
}
inherits(TestGoban, main.TestCase);
module.exports = main.tests.add(TestGoban);


// Coverage etc.
TestGoban.prototype.testInternals = function () {
    var goban = this.goban;
    goban.playAt(1, 2, BLACK);
    goban.playAt(2, 2, WHITE);
    this.assertEqual(BLACK, goban.colorAt(1, 2));
    this.assertEqual(WHITE, goban.colorAt(2, 2));
    //Coverage
    this.assertEqual(true, goban.debugDump().length > 100);
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

    goban.setRules({ positionalSuperko: true });

    this.game.loadMoves('a3,b3,a2,b2,pass,a1,b1,c1,pass,a1,pass,a4,a2,pass,b1,pass,a3,a1');
    if (goban.isValidMove(1, 2, BLACK)) {
        this.showInUi('a2 should be invalid: superko');
        this.assertEqual(true, false);
    }
    // undo, redo and verify superko is still detected
    goban.undo();
    goban.playAt(1, 1, WHITE);
    this.assertEqual(false, goban.isValidMove(1, 2, BLACK));
    // a2 is allowed again after another stone is added anywhere
    goban.playAt(4, 2, BLACK);
    this.assertEqual(true, goban.isValidMove(1, 2, BLACK));
};
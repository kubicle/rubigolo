'use strict';

var main = require('../main');
var GameLogic = require('../GameLogic');
var ScoreAnalyser = require('../ScoreAnalyser');

var WHITE = main.WHITE, BLACK = main.BLACK;
var GAME_NOT_STARTED = '00';


/** @class
 * Interface between the game engine (GameLogic, etc.) and Gtp.
 */
function GtpEngine(game, scorer) {
    this.game = game || new GameLogic();
    this.scorer = scorer || new ScoreAnalyser();
    this.players = [];
}
module.exports = GtpEngine;


GtpEngine.prototype.quit = function () {
    console.error('GTP quit command received'); // cannot be on stdout
};

GtpEngine.prototype.send = function (msg) {
    console.log(msg); // stdout is default
};

GtpEngine.prototype.refreshDisplay = function () {
};

GtpEngine.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    player = this.players[color] = new main.defaultAi(this.game.goban, color);
    return player;
};

GtpEngine.prototype._beginGame = function () {
    this.refreshDisplay();
    // make sure both AI exist
    this.getAiPlayer(BLACK);
    this.getAiPlayer(WHITE);
};

GtpEngine.prototype.name = function () {
    return main.appName;
};

GtpEngine.prototype.version = function () {
    return main.appVersion;
};

GtpEngine.prototype.initBoardSize = function (size) {
    var ok = this.game.newGame(size);
    this._beginGame();
    return ok;
};

GtpEngine.prototype.clearBoard = function () {
    var game = this.game;
    game.newGame(game.goban.gsize, game.handicap, game.komi);
    this._beginGame();
};

GtpEngine.prototype.setKomi = function (komi) {
    this.game.komi = komi;
};

GtpEngine.prototype._forceCurPlayer = function (color) {
    if (!this.players[BLACK]) return false;
    this.game.curColor = color === 'b' ? BLACK : WHITE;
    return true;
};

GtpEngine.prototype._letAiPlay = function () {
    var move = this.players[this.game.curColor].getMove();
    this.game.playOneMove(move);
    return move;
};

GtpEngine.prototype.regGenMove = function (color) {
    if (!this._forceCurPlayer(color)) return GAME_NOT_STARTED;
    return this.players[this.game.curColor].getMove();
};

GtpEngine.prototype.loadSgf = function (game, moveNumber) {
    var errors = [];
    if (!this.game.loadSgf(game, errors, moveNumber)) return errors[0];
    this._beginGame();
    return '';
};

GtpEngine.prototype.genMove = function (color) {
    if (!this._forceCurPlayer(color)) return GAME_NOT_STARTED;
    return this._letAiPlay();
};

GtpEngine.prototype.playMove = function (color, vertex) {
    if (!this._forceCurPlayer(color)) return false;
    if (!this.game.playOneMove(vertex)) return false;
    this.refreshDisplay();
    return true;
};

GtpEngine.prototype.undo = function () {
    return this.game.playOneMove('half_undo');
};

GtpEngine.prototype.computeScore = function () {
    var game = this.game;
    if (!game.gameEnding && !game.gameEnded) return null;
    return this.scorer.computeScoreDiff(game.goban, game.komi);
};

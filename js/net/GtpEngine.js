'use strict';
/* eslint no-console: 0 */

var main = require('../main');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var Gtp = require('./Gtp');
var ScoreAnalyser = require('../ScoreAnalyser');

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;
var DEAD_COLOR = Grid.DEAD_COLOR;
var DEAD = Gtp.DEAD, ALIVE = Gtp.ALIVE;

var GAME_NOT_STARTED = '00';


/** @class
 * Interface between the game engine (GameLogic, etc.) and Gtp.
 */
function GtpEngine(game, scorer) {
    this.game = game || new GameLogic();
    this.scorer = scorer || new ScoreAnalyser();
    this.players = [];
    this.scoreComputedAt = null;
    this.AiClass = main.defaultAi;
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
    player = this.players[color] = new this.AiClass(this.game.goban, color);
    return player;
};

GtpEngine.prototype.name = function () {
    var ai = this.getAiPlayer(BLACK) || this.getAiPlayer(WHITE);
    return ai.publicName;
};

GtpEngine.prototype.version = function () {
    var ai = this.getAiPlayer(BLACK) || this.getAiPlayer(WHITE);
    return ai.publicVersion;
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

GtpEngine.prototype.loadSgf = function (game, moveNumber) {
    var errors = [];
    if (!this.game.loadSgf(game, errors, moveNumber)) return errors[0];
    this._beginGame();
    return '';
};

GtpEngine.prototype.regGenMove = function (color) {
    if (!this._forceCurPlayer(color)) return GAME_NOT_STARTED;
    return this.players[this.game.curColor].getMove();
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
    this.scoreComputedAt = game.goban.getPositionSignature();
    return this.scorer.computeScoreDiff(game.goban, game.komi);
};

// status: -1: dead, 0: seki, +1: alive
GtpEngine.prototype.getStonesWithStatus = function (status) {
    var goban = this.game.goban;
    if (goban.getPositionSignature() !== this.scoreComputedAt) {
        this.computeScore();
    }
    var scoringYx = this.scorer.getScoringGrid().yx;
    var stones = [];
    for (var j = goban.gsize; j >= 1; j--) {
        for (var i = goban.gsize; i >= 1; i--) {
            var s = goban.stoneAt(i, j);
            if (s.color === EMPTY) continue;

            switch (scoringYx[j][i]) {
            case DEAD_COLOR + WHITE:
            case DEAD_COLOR + BLACK:
                if (status === DEAD) stones.push(s.asMove());
                break;
            default:
                if (status === ALIVE) stones.push(s.asMove());
            }
            // TODO: handle seki status when we can
        }
    }
    return stones;
};


//--- private

GtpEngine.prototype._beginGame = function () {
    this.refreshDisplay();
    // make sure both AI exist
    this.getAiPlayer(BLACK);
    this.getAiPlayer(WHITE);
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

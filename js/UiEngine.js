/** Engine interface for UI */
'use strict';

var main = require('./main');

var WHITE = main.WHITE, BLACK = main.BLACK;


function UiEngine(ui) {
    this.ui = ui;
}
module.exports = UiEngine;


UiEngine.prototype.init = function () {
    // make sure both AI exist
    this.ui.getAiPlayer(BLACK);
    this.ui.getAiPlayer(WHITE);
};

UiEngine.prototype.name = function () {
    return main.appName;
};

UiEngine.prototype.version = function () {
    return main.appVersion;
};

UiEngine.prototype.initBoardSize = function (size) {
    return this.ui.game.newGame(size);
};

UiEngine.prototype.clearBoard = function () {
    var game = this.ui.game;
    game.newGame(game.goban.gsize, game.handicap, game.komi);
};

UiEngine.prototype.setKomi = function (komi) {
    this.ui.game.komi = komi;
};

UiEngine.prototype._forceCurPlayer = function (color) {
    this.ui.game.curColor = color === 'b' ? BLACK : WHITE;
};

UiEngine.prototype.genMove = function (color) {
    this._forceCurPlayer(color);
    return this.ui.letAiPlay();
};

UiEngine.prototype.playMove = function (color, vertex) {
    this._forceCurPlayer(color); // this follows GTP2 spec
    return this.ui.game.playOneMove(vertex);
};

UiEngine.prototype.computeScore = function () {
    var game = this.ui.game;
    var scorer = this.ui.scorer;
    if (!game.gameEnding && !game.gameEnded) return null;
    return scorer.computeScoreDiff(game.goban, game.komi);
};

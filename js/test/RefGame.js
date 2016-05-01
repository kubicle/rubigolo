'use strict';

var log = require('../log');

var CHANGED_TO = '->';


function RefGame(id, gsize, komi, initMoves, moves, wScore, basedOn, upToMove) {
    this.id = id;
    this.gsize = gsize;
    this.komi = komi;
    this.initMoves = initMoves;
    this.moves = moves;
    this.wScore = wScore;
    this.basedOn = basedOn;
    this.upToMove = upToMove; // number of common moves with base game
    this._moves = null; // moves as an array
    this.hasChanged = false;
}
module.exports = RefGame;


function newRefGameFromMap(map) {
    return new RefGame(map.id, map.gsize, map.komi, map.init, map.moves, map.wScore,
        map.basedOn, map.upToMove);
}

RefGame.loadRefGames = function (refGameData) {
    var refGames = [];
    for (var i = 0; i < refGameData.length; i++) {
        refGames.push(newRefGameFromMap(refGameData[i]));
    }
    return refGames;
};

RefGame.prototype._serialize = function () {
    var map = {
        id: this.id,
        gsize: this.gsize,
        komi: this.komi,
        init: this.initMoves,
        moves: this.hasChanged ? this._moves.join(',') : this.moves,
        wScore: this.wScore
    };
    if (this.basedOn) {
        map.basedOn = this.basedOn;
        map.upToMove = this.upToMove;
    }
    return JSON.stringify(map, null, 4);
};

/** Used to output ref games (new ones or updated ones).
 * For now this is only as log - actual update is manual. */
RefGame.updateRefGames = function (refGames) {
    for (var i = 0; i < refGames.length; i++) {
        log.info(refGames[i]._serialize() + ',');
    }
};

RefGame.prototype._getMoves = function () {
     if (!this._moves) this._moves = this.moves.split(',');
     return this._moves;
};

RefGame.prototype.numForcedMoves = function () {
    if (!this.basedOn) return this.initMoves.split(',').length;
    return this.upToMove;
};

RefGame.prototype.getForcedMoves = function () {
    if (!this.basedOn) return this.initMoves;
    return this._getMoves().slice(0, this.upToMove).join(',');
};

function getStdOrExpMoves(moves, wantStd) {
    var res = [];
    for (var i = 0; i < moves.length; i++) {
        var move = moves[i];
        var op = move.indexOf(CHANGED_TO);
        if (op >= 0) move = wantStd ? move.substr(0, op) : move.substr(op + CHANGED_TO.length);
        res.push(move);
    }
    return res;
}

RefGame.prototype.getStandardMoves = function () {
    if (!this._stdMoves) this._stdMoves = getStdOrExpMoves(this._getMoves(), /*wantStd=*/true);
    return this._stdMoves;
};

RefGame.prototype.getExpectedMoves = function () {
    if (!this._expMoves) this._expMoves = getStdOrExpMoves(this._getMoves(), /*wantStd=*/false);
    return this._expMoves;
};

RefGame.prototype.baseOn = function (baseGame, charLen) {
    charLen = this.moves.lastIndexOf(',', charLen);
    if (charLen <= baseGame.initMoves.length) return;
    this.basedOn = baseGame.id;
    this.upToMove = this.moves.substr(0, charLen).split(',').length;
};

function firstDifference(s1, s2) {
    var i = 0;
    while (s1[i] === s2[i]) i++;
    return i;
}

RefGame.collectRefGame = function (games, gameLogic, initMoves, wScore) {
    var newGame = new RefGame(
        '#' + games.length,
        gameLogic.goban.gsize,
        Math.abs(gameLogic.komi),
        initMoves,
        gameLogic.history.join(),
        wScore);

    var baseGame = null, bestLen = 0;
    for (var i = 0; i < games.length; i++) {
        var game = games[i];
        if (game.gsize !== newGame.gsize) continue;
        var len = firstDifference(game.moves, newGame.moves);
        if (len < bestLen) continue;
        bestLen = len;
        baseGame = game;
    }
    if (bestLen) newGame.baseOn(baseGame, bestLen);
    games.push(newGame);
};

RefGame.prototype.logChange = function (i, newMove) {
    this.hasChanged = true;
    var moves = this._getMoves();
    moves[i] += CHANGED_TO + newMove;
};

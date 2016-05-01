'use strict';


function RefGame(id, gsize, komi, initMoves, moves, wScore, basedOn, upToMove) {
    this.id = id;
    this.gsize = gsize;
    this.komi = komi;
    this.initMoves = initMoves;
    this.moves = moves;
    this.wScore = wScore;
    this.basedOn = basedOn;
    this.upToMove = upToMove; // first move that is different from base game
    this._moves = null; // moves as an array
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

RefGame.prototype.serialize = function () {
    var map = {
        id: this.id,
        gsize: this.gsize,
        komi: this.komi,
        init: this.initMoves,
        moves: this.moves,
        wScore: this.wScore
    };
    if (this.basedOn) {
        map.basedOn = this.basedOn;
        map.upToMove = this.upToMove;
    }
    return JSON.stringify(map, null, 4);
};

RefGame.prototype.getMoves = function () {
     if (!this._moves) this._moves = this.moves.split(',');
     return this._moves;
};

RefGame.prototype.numForcedMoves = function () {
    if (!this.basedOn) return this.initMoves.split(',').length;
    return this.upToMove - 1;
};

RefGame.prototype.getForcedMoves = function () {
    if (!this.basedOn) return this.initMoves;
    return this.getMoves().slice(0, this.upToMove - 1).join(',');
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

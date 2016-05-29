'use strict';

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var log = require('../../log');


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype._beforeEvalBoard = function () {
    // We have to delay getting the hunter since it is created after us
    if (!this.hunter) this.hunter = this.player.heuristic.Hunter;
};

NoEasyPrisoner.prototype._evalMove = function (i, j, color) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).

    // Skip places where nothing happens around
    // NB: if dead allies (without influence), avoid adding more stones here
    if (this.infl[1 - color][j][i] < 2 && this.infl[color][j][i] < 2 &&
        this.goban.stoneAt(i, j).allyStones(color) === 0) return 0;

    var stone = this.goban.tryAt(i, j, color);
    var g = stone.group;
    var score = 0, move;
    if (log.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (log.debug) log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score -= g.stones.length * 2;
            if (log.debug) log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (log.debug) log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score -= g.stones.length * 2;
            if (log.debug) log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};

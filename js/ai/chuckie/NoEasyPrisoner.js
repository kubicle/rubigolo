//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);

    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype._beforeEvalBoard = function () {
    // We have to delay getting the hunter since it is created after us
    if (!this.hunter) this.hunter = this.player.getHeuristic('Hunter');
};

NoEasyPrisoner.prototype._evalMove = function (i, j, color) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).

    // Skip places where nothing happens around
    // NB: if dead allies (without influence), avoid adding more stones here
    if (this.infl[j][i][1 - color] < 2 && this.infl[j][i][color] < 2 &&
        this.goban.stoneAt(i, j).allyStones(color) === 0) return 0;

    var stone = this.goban.tryAt(i, j, color);
    var g = stone.group;
    var score = 0, move;
    if (main.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (main.debug) main.log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (main.debug) main.log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score = - this.groupThreat(g, true);
            if (main.debug) main.log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};
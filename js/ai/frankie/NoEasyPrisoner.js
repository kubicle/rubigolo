//Translated from no_easy_prisoner.rb using babyruby2js
'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var log = require('../../log');

var sOK = CONST.sOK;


/** @class Should recognize when our move is foolish... */
function NoEasyPrisoner(player) {
    Heuristic.call(this, player);
    this.hunter = null;
}
inherits(NoEasyPrisoner, Heuristic);
module.exports = NoEasyPrisoner;


NoEasyPrisoner.prototype.evalBoard = function (stateYx, scoreYx) {
    if (!this.hunter) this.hunter = this.player.getHeuristic('Hunter');
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j);
            if (score === 0) continue;
            scoreYx[j][i] += score;
        }
    }
};

NoEasyPrisoner.prototype.evalMove = function (i, j) {
    // NB: snapback is handled in hunter; here we just notice the sacrifice of a stone, which will
    // be balanced by the profit measured by hunter (e.g. lose 1 but kill 3).
    var stone = this.goban.tryAt(i, j, this.color);
    var g = stone.group;
    var score = 0, move;
    if (log.debug) move = Grid.xy2move(i, j);
    if (g.lives === 1) {
        if (g.stones.length === 1 && stone.empties()[0].moveIsKo(this.enemyColor)) {
            if (log.debug) log.debug('NoEasyPrisoner sees ' + move + ' starts a KO');
        } else {
            score = - this.groupThreat(g, true);
            if (log.debug) log.debug('NoEasyPrisoner says ' + move + ' is plain foolish (' + score + ')');
        }
    } else if (g.lives === 2) {
        if (log.debug) log.debug('NoEasyPrisoner asking Hunter to look at ' + move);
        if (this.hunter.isEscapingAtariCaught(stone)) {
            score = - this.groupThreat(g, true);
            if (log.debug) log.debug('NoEasyPrisoner (backed by Hunter) says ' + move + ' is foolish  (' + score + ')');
        }
    }
    this.goban.untry();
    return score;
};

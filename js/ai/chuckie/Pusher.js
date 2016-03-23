//Translated from pusher.rb using babyruby2js
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../../Stone');

var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;


/** @class
 *  Way of "pushing" our influence further...
 *  Still very naive; for that reason the coeff are rather low.
 */
function Pusher(player) {
    Heuristic.call(this, player);

    this.allyCoeff = this.getGene('allyInfl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemyInfl', 0.13, 0.01, 1.0);

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Pusher, Heuristic);
module.exports = Pusher;


Pusher.prototype._evalMove = function (i, j, color) {
    var enemyInf = this.infl[this.enemyColor][j][i];
    if (enemyInf === 0) return 0;
    var allyInf = this.infl[color][j][i];

    if (this.noEasyPrisonerYx[j][i] < 0) return 0;

    // Only push where we can connect to
    if (!this.co.canConnect(i, j, color)) return 0;
    // Stones that would "fill a blank" are not for Pusher to evaluate
    if (this.goban.stoneAt(i, j).numEmpties() === 0) return 0;

    var invasion = this.invasionCost(i, j, color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    if (main.debug) main.log.debug('Pusher heuristic sees invasion:' + invasion +
        ', influences:' + allyInf + ' - ' + enemyInf + ' at ' + Grid.xy2move(i, j) +
        ' -> ' + '%.03f'.format(score));
    return score;
};

Heuristic.prototype._invasionCost = function (i, j, dir, color, level) {
    var s = this.goban.stoneAt(i, j);
    if (s === BORDER || s.color !== EMPTY) return 0;
    var cost = this.pot.enemyTerritoryScore(i, j, color);
    if (s.isBorder()) cost /= 2;
    if (cost <= 0) return 0;
    if (--level === 0) return cost;

    var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
    var spread = XY_AROUND[(dir + 3) % 4];
    var vx = spread[0], vy = spread[1];

    cost += this._invasionCost(i + dx + vx, j + dy + vy, dir, color, level);
    cost += this._invasionCost(i + dx - vx, j + dy - vy, dir, color, level);
    return cost;
};

var INVASION_DEEPNESS = 1; // TODO: better algo for this

Heuristic.prototype.invasionCost = function (i, j, color) {
    var cost = Math.max(0, this.pot.enemyTerritoryScore(i, j, color));
    for (var dir = DIR0; dir <= DIR3; dir++) {
        cost += this._invasionCost(i + XY_AROUND[dir][0], j + XY_AROUND[dir][1], dir, color, INVASION_DEEPNESS);
    }
    var s = this.goban.stoneAt(i, j);
    if (s.isCorner()) cost = Math.max(cost - 1, 0);
    else if (s.isBorder()) cost = Math.max(cost - 0.85, 0);
    return cost;
};

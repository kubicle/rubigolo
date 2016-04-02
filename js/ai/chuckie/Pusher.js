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

    this.enemyAttacks = [];

    this.allyCoeff = this.getGene('allyInfl', 0.03, 0.01, 1.0);
    this.enemyCoeff = this.getGene('enemyInfl', 0.13, 0.01, 1.0);

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Pusher, Heuristic);
module.exports = Pusher;


Pusher.prototype.evalBoard = function (stateYx, scoreYx) {
    var enemyAttacks = this.enemyAttacks;
    enemyAttacks.length = 0;

    // Call _evalMove for each vertex and init this.scoreGrid
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx);

    for (var i = enemyAttacks.length - 1; i >= 0; i--) {
        this._blockPush(enemyAttacks[i], scoreYx);
    }
};

Pusher.prototype._evalMove = function (i, j, color) {
    this._attackPush(i, j, 1 - color, /*isEnemy=*/true);

    return this._attackPush(i, j, color);
};

Pusher.prototype._blockPush = function (attack, scoreYx) {
    var pushStone = attack[0], backupStone = attack[1], score = attack[2];
    var group = backupStone.group, color = group.color;
    var cut, triedPushStone = false;
    for (var n = 0; n < 8; n++) {
        var s = pushStone.allNeighbors[n];
        if (s === BORDER) continue;
        if (s.color === color) { // push attack is next to enemy group
            // if (triedPushStone) continue; // try only once
            // triedPushStone = true;
            // if (this.noEasyPrisonerYx[pushStone.j][pushStone.i] < 0) continue; // we cannot play in pushStone anyway
            // if (!this.co.canConnect(pushStone, 1 - color)) continue; // or could not connect there
            cut = pushStone;
            break;
        }
        if (s.color !== EMPTY) continue;
        if (!s.isNextTo(group)) continue;
        if (this.noEasyPrisonerYx[s.j][s.i] < 0) continue; // we cannot play in s anyway
//        if (!this.co.canConnect(s, 1 - color)) continue; // or could not connect there
        cut = s; // TODO more than 1 cut can exist
        break;
    }
    if (!cut) {
        if (main.debug) main.log.debug('Pusher found no way to block ' + pushStone);
        return;
    }
//if (group.lives <= 2)
    if (main.debug) main.log.debug('Pusher sees ' + cut + ' as blocking push in ' + pushStone + ', score: ' + score.toFixed(2));
    scoreYx[cut.j][cut.i] += score;
    this.scoreGrid.yx[cut.j][cut.i] += score; // no needed beside UI to show
};

Pusher.prototype._attackPush = function (i, j, color, isEnemy) {
    var enemyInf = this.infl[1 - color][j][i];
    if (enemyInf === 0) return 0;
    var allyInf = this.infl[color][j][i];

    if (!isEnemy && this.noEasyPrisonerYx[j][i] < 0) return 0;

    // Stones that would "fill a blank" are not for Pusher to evaluate
    var pushStone = this.goban.stoneAt(i, j);
    if (pushStone.numEmpties() === 0) return 0;
    // Only push where we can connect to
    var backupStone = this.co.canConnect(pushStone, color);
    if (!backupStone) return 0;

    var invasion = this.invasionCost(i, j, color);

    var score = invasion + this.enemyCoeff * enemyInf - this.allyCoeff * allyInf;
    if (main.debug) main.log.debug('Pusher sees invasion:' + invasion +
        ', influences:' + allyInf + ' - ' + enemyInf + ' at ' + Grid.xy2move(i, j) + ' -> ' + score.toFixed(3));
    if (isEnemy) this.enemyAttacks.push([pushStone, backupStone, score]);
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

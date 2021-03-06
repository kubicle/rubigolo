//Translated from heuristic.rb using babyruby2js
'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

var sOK = CONST.sOK, ALWAYS = CONST.ALWAYS;
var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER, BLACK = CONST.BLACK;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player, consultant) {
    this.player = player;
    this.name = this.constructor.name || main.funcName(this.constructor);
    this.consultant = !!consultant;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.inf = player.inf;
    this.ter = player.ter;
    this.boan = player.boan;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);
}
module.exports = Heuristic;

Heuristic.prototype.initColor = function () {
    // For consultant heuristics we reverse the colors
    if (this.consultant) {
        this.color = this.player.enemyColor;
        this.enemyColor = this.player.color;
    } else {
        this.color = this.player.color;
        this.enemyColor = this.player.enemyColor;
    }
};

// For heuristics which do not handle evalBoard (but evalMove)
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK) continue;
            var score = myScoreYx[j][i] = this.evalMove(i, j, color);
            scoreYx[j][i] += score;
        }
    }
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

Heuristic.prototype.territoryScore = function (i, j, color) {
    var ter = this.ter.potential().yx;
    return ter[j][i] * ( color === BLACK ? 1 : -1);
};

Heuristic.prototype.enemyTerritoryScore = function (i, j, color) {
    var score = Grid.territory2owner[2 + this.ter.grids[1 - color].yx[j][i]];
    return score * (color === BLACK ? 1 : -1);
};

/** Pass saved as true if g is an ally group (we evaluate how much we save) */
Heuristic.prototype.groupThreat = function (g, saved) {
    var threat = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners

    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties();
    }
    threat += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot

    if (saved) return threat;
    return threat + this._countSavedAllies(g);
};

// Count indirectly saved groups
Heuristic.prototype._countSavedAllies = function (killedEnemyGroup) {
    // do not count any saved allies if we gave them a single life along border TODO: improve later
    if (killedEnemyGroup.stones.length === 1 &&
        this.distanceFromStoneToBorder(killedEnemyGroup.stones[0]) === 0) {
        return 0;
    }
    var saving = 0;
    var allies = killedEnemyGroup.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        if (allies[a].lives > 1) continue;
        saving += this.groupThreat(allies[a], /*saved=*/true);
    }
    return saving;
};

Heuristic.prototype._invasionCost = function (i, j, dir, color, level) {
    if (level-- === 0) return 0;
    var s = this.goban.stoneAt(i, j);
    if (s === BORDER || s.color !== EMPTY) return 0;
    var cost = this.enemyTerritoryScore(i, j, color);
    if (cost <= 0) return 0;

    var dx = XY_AROUND[dir][0], dy = XY_AROUND[dir][1];
    var spread = XY_AROUND[(dir + 3) % 4];
    var vx = spread[0], vy = spread[1];

    cost += this._invasionCost(i + dx + vx, j + dy + vy, dir, color, level);
    cost += this._invasionCost(i + dx - vx, j + dy - vy, dir, color, level);
    return cost;
};

var INVASION_DEEPNESS = 0; // TODO: better algo for this

Heuristic.prototype.invasionCost = function (i, j, color) {
    var cost = Math.max(0, this.enemyTerritoryScore(i, j, color));
    for (var dir = DIR0; dir <= DIR3; dir++) {
        cost += this._invasionCost(i + XY_AROUND[dir][0], j + XY_AROUND[dir][1], dir, color, INVASION_DEEPNESS);
    }
    return cost;
};

Heuristic.prototype.distanceFromStoneToBorder = function (stone) {
    var gsize = this.gsize;
    var i = stone.i, j = stone.j;
    return Math.min(Math.min(i - 1, gsize - i), Math.min(j - 1, gsize - j));
};

Heuristic.prototype.diagonalStones = function (s1, s2) {
    return [this.goban.stoneAt(s1.i, s2.j), this.goban.stoneAt(s2.i, s1.j)];
};

Heuristic.prototype.distanceBetweenStones = function (s1, s2, color) {
    var dx = Math.abs(s2.i - s1.i), dy = Math.abs(s2.j - s1.j);
    if (dx + dy === 1) return 0; // already connected
    var enemy = 1 - color;
    var numEnemies = 0, between;
    if (dx === 1 && dy === 1) { // hane
        var diags = this.diagonalStones(s1, s2), c1 = diags[0], c2 = diags[1];
        if (c1.color === color || c2.color === color) return 0; // already connected
        if (c1.color === enemy) numEnemies++;
        if (c2.color === enemy) numEnemies++;
        if (numEnemies === 0) return 0; // safe hane
        if (numEnemies === 2) return 99; // cut!
        var connPoint = c1.color === enemy ? c2 : c1;
        if (this.distanceFromStoneToBorder(s1) === 0 || this.distanceFromStoneToBorder(s2) === 0) {
            if (this.distanceFromStoneToBorder(connPoint) === 1) return 1; // enemy cut-stone on border
            if (connPoint.allyStones(enemy) !== 0) return 1; // other enemy next to conn point
            return 0;
        } else if (this.distanceFromStoneToBorder(connPoint) === 1) {
            if (connPoint.allyStones(enemy) !== 0) return 1;
            return 0;
        }
        return 1;
    }
    if (dx + dy === 2) {
        between = this.goban.stoneAt((s1.i + s2.i) / 2, (s1.j + s2.j) /2);
        if (between.color === color) return 0; // already connected
        if (between.color === enemy) return between.group.lives; // REVIEW ME
        for (var i = between.neighbors.length - 1; i >= 0; i--) {
            if (between.neighbors[i].color === enemy) numEnemies++;
        }
        if (numEnemies >= 1) return 1; // needs 1 move to connect (1 or 2 enemies is same)
        if (this.distanceFromStoneToBorder(s1) + this.distanceFromStoneToBorder(s2) === 0) {
            return 0; // along border with 0 enemy around is safe
        }
        return 0.5; // REVIEW ME
    }
    var d1 = this.distanceFromStoneToBorder(s1), d2 = this.distanceFromStoneToBorder(s2);
    if (dx + dy === 3 && d1 === 0 && d2 === 0) {
        // TODO code betweenStones and test it
        var betweens = this.betweenStones(s1, s2);
        var dist = 0;
        for (var b = betweens.length - 1; b >= 0; b--) {
            between = betweens[b];
            if (between.color === enemy) dist += between.group.lives;
            if (between.allyStones(enemy) !== 0) dist += 1;
        }
        return dist;
    }
    //TODO: add other cases like monkey-jump
    return dx + dy;
};

/** Evaluates if a new stone at i,j will be able to connect with a "color" group around.
 *  Basically this is to make sure i,j is not alone (and not to see if i,j is a connector!) */
// +@+
// O+O
// @*@ <-- TODO review this case; looks like white here cannot connect
Heuristic.prototype.canConnect = function (i, j, color) {
    var stone = this.goban.stoneAt(i,j);

    // first look around for empties and allies (a single ally means we connect!)
    var empties = [];
    for (var nNdx = stone.neighbors.length - 1; nNdx >= 0; nNdx--) {
        var n = stone.neighbors[nNdx];
        if (n.color === color && n.group.xDead < ALWAYS) return n;
        if (n.color === EMPTY) empties.push(n);
    }
    // look around each empty for allies
    var moveNeeded = 2;
    for(var eNdx = empties.length - 1; eNdx >= 0; eNdx--) {
        var empty = empties[eNdx];
        for (var n2Ndx = empty.neighbors.length - 1; n2Ndx >= 0; n2Ndx--) {
            var en = empty.neighbors[n2Ndx];
            if (en === stone) continue; // same stone
            if (en.color !== color) continue; // empty or enemy
            if (en.group.xDead === ALWAYS) continue; // TODO: look better at group's health
            var dist = this.distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

// Cannot start from corner!
Heuristic.prototype.canConnectAlongBorder = function (i, j, color) {
    // decide direction
    var gsize = this.gsize;
    var dx = 0, dy = 0;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else return null;
    // check 1 stone to see if we should reverse direction
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s === BORDER) return null;
    if (s.color !== EMPTY) { dx = -dx; dy = -dy; }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) return null;
        if (s.color === color && s.group.lives > 2) return s.group;
    }
};

'use strict';

var CONST = require('../../constants');
var main = require('../../main');
var Grid = require('../../Grid');
var Stone = require('../../Stone');

var GRID_BORDER = CONST.GRID_BORDER;
var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;
var sOK = CONST.sOK, sDEBUG = CONST.sDEBUG;
var ALWAYS = CONST.ALWAYS;
var XY_AROUND = Stone.XY_AROUND;
var DIR0 = CONST.DIR0, DIR3 = CONST.DIR3;


/** @class Base class for all heuristics.
 *  Anything useful for all of them should be stored as data member here.
 */
function Heuristic(player) {
    this.player = player;
    this.name = null;
    this.goban = player.goban;
    this.gsize = player.goban.gsize;
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);
    this.minimumScore = player.minimumScore;

    this.spaceInvasionCoeff = this.getGene('spaceInvasion', 2.0, 0.01, 4.0);

    this.color = this.enemyColor = null;

    this.mi = player.heuristic.MoveInfo;
    this.pot = player.heuristic.PotentialTerritory;
    var influence = player.heuristic.Influence;
    this.infl = influence ? influence.infl : null;
}
module.exports = Heuristic;


Heuristic.prototype.setName = function (id) {
    var constr = this.constructor;
    this.name = constr.name || main.funcName(constr);
    // Mangled constructor name has file-scope so we may have dupes; we add the unique ID for that
    if (this.name.length < 5) this.name += id;
};

Heuristic.prototype.initColor = function (color) {
    this.color = color;
    this.enemyColor = 1 - color;
};

// For heuristics which do not handle evalBoard (but _evalMove)
// NB: _evalMove is "private": only called from here (base class), and from inside a heuristic
Heuristic.prototype.evalBoard = function (stateYx, scoreYx) {
    var prevDebug = main.debug;
    var color = this.player.color;
    var myScoreYx = this.scoreGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var state = stateYx[j][i];
            if (state < sOK) continue;
            if (state === sDEBUG && this.name === this.player.debugHeuristic)
                main.debug = true; // set your breakpoint on this line if needed

            var score = myScoreYx[j][i] = this._evalMove(i, j, color);
            scoreYx[j][i] += score;

            if (state === sDEBUG) main.debug = prevDebug;
        }
    }
};

Heuristic.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    return this.player.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

/** Pass saved as true if g is an ally group (we evaluate how much we save) */
Heuristic.prototype.groupThreat = function (g, saved) {
    var threat = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners

    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties(); // TODO: count only empties not in "lives"
    }
    threat += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot

    if (saved) return threat;
    return threat + this._countSavedAllies(g);
};

// Count indirectly saved groups
Heuristic.prototype._countSavedAllies = function (killedEnemyGroup) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemyGroup.stones.length === 1 &&
        killedEnemyGroup.stones[0].isCorner()) {
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
        var whichIsEnemy = c1.color === enemy ? 0 : 1;
        var enemyStone = diags[whichIsEnemy], connPoint = diags[1 - whichIsEnemy];
        if (s1.isBorder() || s2.isBorder()) {
            // if enemy cut-stone on border, we have a sente connect by doing atari
            if (connPoint.distanceFromBorder() === 1)
                return enemyStone.group.lives > 2 ? 1 : 0;
            if (connPoint.allyStones(enemy) !== 0) return 1; // other enemy next to conn point
            return 0;
        } else if (connPoint.distanceFromBorder() === 1) {
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
        if (s1.isBorder() && s2.isBorder()) {
            return 0; // along border with 0 enemy around is safe
        }
        return 0.5; // REVIEW ME
    }
    if (dx + dy === 3 && s1.isBorder() && s2.isBorder()) {
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
        switch (n.color) {
        case EMPTY:
            empties.push(n);
            break;
        case color:
            if (n.group.lives > 1 && n.group.xDead < ALWAYS) return n;
            break;
        default: // if we kill an enemy group here, consider this a connection
            if (n.group.lives === 1) return n.group.allEnemies()[0];
        }
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

/**
 * Checks if an escape along border can succeed.
 * group escapes toward i,j, the proposed 1st escape move
 * @return {Group|null|undefined} - group we connect to, null if fails, undefined if we cannot say
 */
Heuristic.prototype.canEscapeAlongBorder = function (group, i, j) {
    // decide direction
    var dx = 0, dy = 0, gsize = this.gsize;
    if (i === 1 || i === gsize) dy = 1;
    else if (j === 1 || j === gsize) dx = 1;
    else throw new Error('not along border');

    // get direction to second row (next to the border we run on)
    var secondRowDx = dy, secondRowDy = dx;
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy) === BORDER) {
        secondRowDx = -secondRowDx; secondRowDy = -secondRowDy;
    }
    // don't handle case of group running toward the border here
    if (this.goban.stoneAt(i + secondRowDx, j + secondRowDy).group === group) {
        return undefined;
    }
    // check 1 stone to see if we should run the other way
    var color = group.color;
    var s = this.goban.stoneAt(i + dx, j + dy);
    if (s !== BORDER && s.group === group) {
        dx = -dx; dy = -dy;
    }

    for(;;) {
        i += dx; j += dy;
        s = this.goban.stoneAt(i, j);
        if (s === BORDER) {
            return null;
        }
        switch (s.color) {
        case color:
            if (s.group.lives > 2) return s.group;
            return null;
        case EMPTY:
            var secondRow = this.goban.stoneAt(i + secondRowDx, j + secondRowDy);
            if (secondRow.color === EMPTY) continue;
            if (secondRow.color === 1 - color) {
                return null;
            }
            if (secondRow.group.lives > 2) return secondRow.group;
            return null;
        default: //enemy
            return null;
        }
    }
};

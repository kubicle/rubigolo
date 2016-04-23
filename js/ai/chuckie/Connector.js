'use strict';

var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var log = require('../../log');

var EMPTY = CONST.EMPTY, BORDER = CONST.BORDER;
var ALWAYS = CONST.ALWAYS, NEVER = CONST.NEVER;

/*
TODO:
- Fix under-evaluation in cases we could handle better:
  # When we see a group is "SOMETIMES" dead, we consider the connection/cut as
    a 0.5 win; in case where the connection/cut is precisely the saving/killing stone,
    we should count a full win instead.
  # See test TestAi#testConnect: the connection is actually deciding life/death of more
    than the 2 groups we look at: the 2 stones group is a brother of another group 
    which will be saved/dead too depending on this connection.
- Merge "direct" and "diagonal" algos to do it right
- One other way to connect 2 groups is to "protect" the cutting point; handle this here
- When we try to "cut" (enemy color), eval should give 0 if another way of connecting exists
*/

/** @class A move that connects 2 of our groups is good.
 */
function Connector(player) {
    Heuristic.call(this, player);

    this.inflCoeff = this.getGene('infl', 0.07, 0.01, 0.5);

    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
    this.hunter = player.heuristic.Hunter;
}
inherits(Connector, Heuristic);
module.exports = Connector;


Connector.prototype._evalMove = function (i, j, color) {
    // If our stone would simply be captured, no luck
    var stone = this.goban.stoneAt(i, j);
    if (this.noEasyPrisonerYx[j][i] < 0 && !this.hunter.isSnapback(stone)) {
        if (log.debug) log.debug('Connector ' + Grid.colorName(color) + ' skips ' + stone + ' (trusting NoEasyPrisoner)');
        return 0;
    }
    // Score for connecting our groups + cutting enemies
    return this._connectsMyGroups(stone, color) +
           this._connectsMyGroups(stone, 1 - color);
};

Connector.prototype._connectsMyGroups = function (stone, color) {
    var score = this._directConnect(stone, color);
    if (score) return score;
    return this._diagonalConnect(stone, color);
};

Connector.prototype._diagonalConnect = function (stone, color) {
    var diag = true, grp1 = null, grp2 = null, nonDiagGrp1 = null;
    var isDiagCon = false;
    var numEnemies = 0;
    for (var n = 0; n < 8; n++) {
        var s = stone.allNeighbors[n];
        diag = !diag;
        if (s === BORDER) continue;
        switch (s.color) {
        case EMPTY: continue;
        case color:
            if (s.group.xDead === ALWAYS) continue;
            if (!grp1) {
                grp1 = s.group;
                if (!diag) nonDiagGrp1 = s.group;
                isDiagCon = diag;
            } else {
                if (s.group === grp1) continue; // ignore if other stone of same group
                if (!diag && nonDiagGrp1 && s.group !== nonDiagGrp1) return 0; // decline direct connections
                if (!diag && !nonDiagGrp1) nonDiagGrp1 = s.group;
                grp2 = s.group;
                isDiagCon = isDiagCon || diag;
            }
            break;
        default:
            if (s.group.xDead === ALWAYS) continue;
            if (s.group.lives < 2) continue;
            numEnemies++;
        }
    }
    if (!grp2) return 0;
    if (!isDiagCon)
        return 0;
    if (numEnemies >= 3)
        return 0; //TODO improve this
    return this._computeScore(stone, color, [grp1, grp2]/*REVIEW THIS*/, numEnemies, 'diagonal');
};

Connector.prototype._directConnect = function (stone, color) {
    var s1, s1b, s2, s2b, s3;
    var numStones = 0, numEnemies = 0;
    for (var n = stone.neighbors.length - 1; n >= 0; n--) {
        var s = stone.neighbors[n];
        switch (s.color) {
        case EMPTY: continue;
        case color:
            numStones++;
            if (!s1) {
                s1 = s;
            } else if (!s2) {
                if (s.group !== s1.group) s2 = s; else s1b = s;
            } else {
                if (s.group !== s2.group) s3 = s; else s2b = s;
            }
            break;
        default:
            numEnemies++;
        }
    }
    
    if (!s2) return 0; // nothing to connect here
    if (numStones === 4) return 0; // 1 empty between 4 stones; never connect unless forced to

    var numGroups = s3 ? 3 : 2;
    var groups = s3 ? [s1.group, s2.group, s3.group] : [s1.group, s2.group];

    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3) {
        if (numEnemies === 0 && s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) {
            return this.player.areaScoring ? this.minimumScore : 0;
        }
        return this._computeScore(stone, color, groups, numEnemies, 'direct3');
    }

    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this._distanceBetweenStones(s1, s2, color) === 0) {
            if (log.debug) log.debug('Connector ' + Grid.colorName(color) + ' sees no hurry to connect ' + s1 + ' and ' + s2);
            if (!this.player.areaScoring) return 0;
            if (s1.group._info.needsToConnect() !== NEVER ||
                s2.group._info.needsToConnect() !== NEVER)
                return this.minimumScore;
            return 0;
        }
        // We count the cutting stone as enemy (we did not "see" it above because it's diagonal)
        numEnemies++;
    }
    return this._computeScore(stone, color, groups, numEnemies, 'direct');
};

Connector.prototype._computeScore = function (stone, color, groups, numEnemies, desc) {
    var score = 0;
    if (numEnemies === 0) {
        //if (this.canConnect(stone, 1 - color)) this.mi.cutThreat(groups, stone, 1 - color);
        score = this.inflCoeff / this.infl[color][stone.j][stone.i];
    } else {
        this.mi.cutThreat(groups, stone, 1 - color);
    }
    if (log.debug) log.debug('Connector ' + desc + ' for ' + Grid.colorName(color) + ' gives ' +
        score.toFixed(3) + ' to ' + stone + ' (allies:' + groups.length + ' enemies: ' + numEnemies + ')');
    return score;
};

Connector.prototype._diagonalStones = function (s1, s2) {
    return [this.goban.stoneAt(s1.i, s2.j), this.goban.stoneAt(s2.i, s1.j)];
};

Connector.prototype._distanceBetweenStones = function (s1, s2, color) {
    var dx = Math.abs(s2.i - s1.i), dy = Math.abs(s2.j - s1.j);
    if (dx + dy === 1) return 0; // already connected
    var enemy = 1 - color;
    var numEnemies = 0, between;
    if (dx === 1 && dy === 1) { // hane
        var diags = this._diagonalStones(s1, s2), c1 = diags[0], c2 = diags[1];
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
 *  Basically this is to make sure stone is not alone (and not to see if stone is a connector!) */
// +@+
// O+O
// @*@ <-- TODO review this case; looks like white here cannot connect
Connector.prototype.canConnect = function (stone, color) {
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
            if (n.group.lives === 1) return n.group.allEnemies()[0].stones[0];
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
            var dist = this._distanceBetweenStones(stone, en, color);
            if (dist >= 2) continue;
            moveNeeded -= (2 - dist);
            if (moveNeeded <= 0.5) return en; // REVIEW ME
        }
    }
    return null;
};

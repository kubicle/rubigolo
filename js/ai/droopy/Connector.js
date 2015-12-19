//Translated from connector.rb using babyruby2js
'use strict';

var main = require('../../main');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var EMPTY = main.EMPTY, BORDER = main.BORDER;
var ALWAYS = main.ALWAYS, NEVER = main.NEVER;

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
    this.riskCoeff = this.getGene('risk', 1, 0.1, 4.0);

    this.noEasyPrisonerYx = player.getHeuristic('NoEasyPrisoner').scoreGrid.yx;
    this.hunter = player.getHeuristic('Hunter');
}
inherits(Connector, Heuristic);
module.exports = Connector;


Connector.prototype._evalMove = function (i, j, color) {
    // If our stone would simply be captured, no luck
    var stone = this.goban.stoneAt(i, j);
    if (this.noEasyPrisonerYx[j][i] < 0 && !this.hunter.isSnapback(stone)) {
        if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' skips ' + stone + ' (trusting NoEasyPrisoner)');
        return 0;
    }
    // Score for connecting our groups + cutting enemies
    return this._connectsMyGroups(stone, color) +
           this._connectsMyGroups(stone, 1 - color);
};

function groupNeedsToConnect(g) {
    var gi = g._info;
    return gi.eyeCount === 0 && gi.numContactPoints === 1;
}

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
        default: numEnemies++;
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
        default: numEnemies++;
        }
    }
    
    if (!s2) return 0; // nothing to connect here
    if (numStones === 4) return 0; // 1 empty between 4 stones; never connect unless forced to
    // 3 of our stones around: no need to connect unless enemy comes by or threatens
    if (numStones === 3 && numEnemies === 0 &&
        s1.group.lives > 1 && s2.group.lives > 1 && (!s3 || s3.group.lives > 1)) {
        return 0;
    }

    var numGroups = s3 ? 3 : 2;
    var groups = s3 ? [s1.group, s2.group, s3.group] : [s1.group, s2.group];
    // if 3rd stone in same group than 1 or 2; we keep the diagonal ones
    if (numGroups === 2 && numStones === 3) {
        if (s2b) { s1b = s2b; var swap = s1; s1 = s2; s2 = swap; }
        if (s1.i === s2.i || s1.j === s2.j) s1 = s1b;
    }
    // Case of diagonal (strong) stones
    if (s1.i !== s2.i && s1.j !== s2.j) {
        // no need to connect now if connection is granted
        if (this.distanceBetweenStones(s1, s2, color) === 0) {
            if (main.debug) main.log.debug('Connector ' + Grid.colorName(color) + ' sees no hurry to connect ' + s1 + ' and ' + s2);
            if (groupNeedsToConnect(s1.group) || groupNeedsToConnect(s2.group))
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
        score = this.inflCoeff / this.infl[stone.j][stone.i][color];
    } else {
        var someAlive = false, g;
        for (var n = groups.length - 1; n >= 0; n--) {
            g = groups[n];
            // lives 1 or 2 are counted by Hunter/Savior; TODO: centralize how this is counted
            if (g.lives <= 2 && g.isAlive < ALWAYS) return 0;
            if (g.isDead < ALWAYS || g.isAlive > NEVER) {
                someAlive = true;
                break;
            }
        }
        if (!someAlive) return 0; // don't try to connect dead groups

        for (n = groups.length - 1; n >= 0; n--) {
            g = groups[n];
            if (g.isDead === NEVER) continue;
            score += (2 - g.isAlive) / 2 * this.groupThreat(g, /*saved=*/true); // !saved would not work so well I think
        }
        score *= this.riskCoeff;
    }
    if (main.debug) main.log.debug('Connector ' + desc + ' for ' + Grid.colorName(color) + ' gives ' +
        score.toFixed(3) + ' to ' + stone + ' (allies:' + groups.length + ' enemies: ' + numEnemies + ')');
    return score;
};

Connector.prototype._connectsMyGroups = function (stone, color) {
    var score = this._directConnect(stone, color);
    if (score) return score;
    return this._diagonalConnect(stone, color);
};

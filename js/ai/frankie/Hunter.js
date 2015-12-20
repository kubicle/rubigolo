//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player) {
    Heuristic.call(this, player);
}
inherits(Hunter, Heuristic);
module.exports = Hunter;


/** Returns true if group g could get at least minLives by killing one of the
 *  enemy groups around in atari
 */
Hunter.prototype._gotLivesFromKillingAround = function (g, minLives) {
    var enemies = g.allEnemies();
    for (var n = enemies.length - 1; n >= 0; n--) {
        var eg = enemies[n];
        if (eg.lives > 1) continue;
        // found 1 enemy group in atari; killing it would give us its size in new lives
        var addedLives = eg.stones.length;
        if (addedLives >= minLives) return true;
        // this is not enough, so count lives we would get by connecting with our groups around eg
        var allies = eg.allEnemies();
        for (var a = allies.length - 1; a >= 0; a--) {
            addedLives += allies[a].lives - 1;
            if (addedLives >= minLives) return true;
        }
    }
    return false;
};


var KO_KILL_SCORE = 1;

/** Returns a score to measure what kind of kill a move is.
 *  Any number < 1.01 is sign of a "not so good" kill.
 *  E.g. in this board, black c5 has a bad "kill score" of 1.0001
 *  5 O@+OO
 *  4 O@O@+
 *  3 OO@@+
 *  2 ++@++
 *  1 ++@++
 *    abcde
 *  NB: kill score of a KO is 1 (KO_KILL_SCORE)
 */
Hunter.prototype._killScore = function (empty, color) {
    var numAllies = 0, numKill = 0, life = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            life += 0.01;
            break;
        case color: // ally
            life += (n.group.lives - 1) * 0.01;
            if (n.group.xAlive === ALWAYS) life += 2;
            numAllies += 0.0001;
            break;
        default: // enemy
            if (n.group.lives > 1) break; // not a kill
            numKill += n.group.stones.length;
        }
    }
    return numKill + life + numAllies;
};

Hunter.prototype.evalMove = function (i, j, color, level) {
    if (level === undefined) level = 1;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var allies = stone.uniqueAllies(color);
    var enemies = stone.uniqueAllies(1 - color);
    var egroups = null, eg;
    var threat1 = 0;
    // first count groups already in atari
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 1) continue;
        // if we can take eg anytime later, no need to take it now
        //TODO also verify no group in "enemies" is strong
        if (this._isAtariGroupCaught(eg) && !this._gotLivesFromKillingAround(eg, 1)) {
            continue;
        }
        threat1 += this.groupThreat(eg);
    }
    var snapback = false;
    // now look for groups with 2 lives
    for (egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 2) continue;
        // no good if enemy can escape by killing one of our weak groups around
        if (this._gotLivesFromKillingAround(eg, 2)) continue; // >=2 because killing 1 stone is not enough to escape
        // same but for the group of our new stone; if should not become atari either
        if (empties.length === 0 && allies.length === 1 && allies[0].lives === 2) continue;
        
        if (empties.length === 1 && allies.length === 0) {
            // unless this is a snapback, this is a dumb move
            // it is a snapback if the last empty point (where the enemy will have to play) 
            // would not make the enemy group connect to another enemy group
            // (equivalent to: the empty point has no other enemy group as neighbor)
            var enemiesAroundEmpty = empties[0].uniqueAllies(eg.color);
            if (enemiesAroundEmpty.length !== 1 || enemiesAroundEmpty[0] !== eg) {
                continue;
            }
            // here we know this is a snapback
            snapback = true;
            if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + ' sees a snapback in ' + stone);
        }
        if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + '(level ' + level + ') looking at ' + Grid.xy2move(i, j) + ' threat on ' + eg);
        if (!egroups) egroups = [eg];
        else egroups.push(eg);
    }
    if (!egroups) return threat1;

    // unless snapback, make sure our new stone's group can survive
    if (!snapback && empties.length <= 1) {
        var killScore = this._killScore(stone, color);
        if (killScore !== KO_KILL_SCORE && killScore < 1.01) {
            return 0; // REVIEW ME: return threat1 does not penalize snapback victim enough
        }
    }

    this.goban.tryAt(i, j, color); // our attack takes one of the 2 last lives (the one in i,j)

    // see attacks that fail
    var canEscape = [false, false, false];
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (this._isAtariGroupCaught(egroups[g], level)) continue;
        if (egroups.length === 1) { egroups.pop(); break; }
        canEscape[g] = true;
    }

    this.goban.untry(); // important to undo before, so we compute threat right

    var threat = this._getMultipleChaseThreat(egroups, canEscape);

    if (main.debug && (threat1 || threat)) main.log.debug('Hunter ' + Grid.colorName(color) +
        ' found a threat of ' + threat1 + ' + ' + threat + ' at ' + Grid.xy2move(i, j));
    return threat + threat1;
};

/** Returns the maximum threat we can hope for when several groups can be chased.
 *  Some of these chases might fail, but even so, the enemy can only defend one.
 *  Rule of thumb:
 *  - if 0 can escape => we capture the bigger one
 *  - if　1 or more can escape => we capture nothing if only 1, or the 2nd bigger if the 1st can escape
 */
Hunter.prototype._getMultipleChaseThreat = function (egroups, canEscape) {
    switch (egroups.length) {
    case 0: return 0;
    case 1: return canEscape[0] ? 0 : this.groupThreat(egroups[0]);
    case 2: 
        if (!canEscape[0] && !canEscape[1]) return Math.max(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        if ( canEscape[0] &&  canEscape[1]) return Math.min(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        return canEscape[0] ? this.groupThreat(egroups[1]) : this.groupThreat(egroups[0]);
    case 3:
        var threats = [this.groupThreat(egroups[0]), this.groupThreat(egroups[1]), this.groupThreat(egroups[2])];
        if (!canEscape[0] && !canEscape[1] && !canEscape[2]) return Math.max(threats[0], threats[1], threats[2]);
        var sortedThreats = threats.concat().sort(function (a,b) { return a<b; });
        var bigger = threats.indexOf(sortedThreats[0]);
        if (!canEscape[bigger]) return threats[bigger];
        var secondBigger = threats.indexOf(sortedThreats[1]);
        return threats[secondBigger];
    default: throw new Error('Unexpected in Hunter#getMultipleChaseThreat');
    }
};

Hunter.prototype._isAtariGroupCaught = function (g, level) {
    var allLives = g.allLives();
    if (allLives.length !== 1) throw new Error('Unexpected: hunter #1: ' + allLives.length);

    var lastLife = allLives[0];
    var stone = this.goban.tryAt(lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this.isEscapingAtariCaught(stone, level);
    this.goban.untry();
    if (main.debug) main.log.debug('Hunter: group with last life ' + lastLife + ' would ' + (isCaught ? 'be caught: ' : 'escape: ') + g);
    return isCaught;
};

/** Returns true if played stone has put a nearby enemy group in atari */
Hunter.prototype._isStoneCreatingAtari = function (stone) {
    var enemyColor = 1 - stone.color;
    var neighbors = stone.neighbors;
    for (var n = neighbors.length - 1; n >= 0; n--) {
        if (neighbors[n].color !== enemyColor) continue;
        if (neighbors[n].group.lives === 1) {
            return true;
        }
    }
    return false;
};

/** @param stone is the enemy group's escape move (played)
 *  @param [level] - just to keep track for logging purposes
 *  @return true if the group gets captured
 */
Hunter.prototype.isEscapingAtariCaught = function (stone, level) {
    var g = stone.group;
    if (g.lives <= 1) return true; // caught
    if (g.lives > 2) {
        return false; //TODO look better
    }
    // g.lives is 2

    // if escape move just put one of our groups in atari the chase fails
    if (this._isStoneCreatingAtari(stone)) return false;

    // get 2 possible escape moves
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) throw new Error('Unexpected: hunter #2');
    var e1 = empties[0];
    var e2 = empties[1];
    if (main.debug) main.log.debug('Hunter: group has 2 lives left: ' + e1 + ' and ' + e2);

    // play the 2 moves (recursive descent)
    var color = 1 - g.color;
    level = (level || 1) + 1;
    return (this.evalMove(e1.i, e1.j, color, level) > 0 || this.evalMove(e2.i, e2.j, color, level) > 0);
};

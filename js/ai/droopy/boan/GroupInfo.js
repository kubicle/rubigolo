'use strict';

var Band = require('./Band');
var CONST = require('../../../constants');
var log = require('../../../log');

var EMPTY = CONST.EMPTY;
var NEVER = CONST.NEVER, SOMETIMES = CONST.SOMETIMES, ALWAYS = CONST.ALWAYS;


/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group, boan) {
    this.boan = boan;
    this.voids = []; // voids owned by the group
    this.nearVoids = []; // voids around, owned or not
    this.dependsOn = [];
    this.deadEnemies = [];
    this.killers = [];
    this.potentialEyes = [];

    this.resetAnalysis(group);
}
module.exports = GroupInfo;

// Result of a check on a group:
var FAILS = GroupInfo.FAILS = -1;
var LIVES = GroupInfo.LIVES = +1;
var UNDECIDED = GroupInfo.UNDECIDED = 0;

var ALIVE = GroupInfo.ALIVE = 1000; // any big enough liveliness to mean "alive for good"


// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function (group) {
    this.group = group;
    this.eyeCount = this._liveliness = 0;
    this.voids.clear();
    this.nearVoids.clear();
    this.dependsOn.clear();
    this.band = null;
    this.isAlive = this.isDead = false;
    this.deadEnemies.clear();
    this.killers.clear();
    this.potentialEyes.clear();
    this.numContactPoints = 0;
};

// For debug only
function when2str(when) {
    return when > NEVER ? (when > SOMETIMES ? 'ALWAYS' : 'SOMETIMES') : 'NEVER';
}

GroupInfo.giNdx = function (gi) { return '#' + gi.group.ndx; };

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ', ' +
        this.voids.length + ' voids  brothers:[' +
        brothers + '] parents:[' + this.dependsOn.map(GroupInfo.giNdx) +
        '] deadEnemies:[' + this.deadEnemies.map(GroupInfo.giNdx) + '])';
};

/** Adds a void to an owner-group + makes groups sharing the void brothers.
 * @param {Void} v
 * @param {Array} [groups] - array of co-owner groups (they become brothers)
 * @return {GroupInfo} - "this"
 */
GroupInfo.prototype.addVoid = function (v, groups) {
    if (log.debug) log.debug('OWNED: ' + v + ' owned by ' + this);
    this.voids.push(v);
    this.eyeCount++;

    // an eye between several groups makes them brothers
    if (groups && groups.length > 1) Band.gather(groups);
    return this;
};

/** Removes a void from an owner-group */
GroupInfo.prototype.removeVoid = function (v) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) throw new Error('remove unknown void');
    if (log.debug) log.debug('LOST: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    this.eyeCount--;
};

GroupInfo.prototype.makeDependOn = function (groups) {
    var band = this.band;
    if (band) band.remove(this);
    
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) >= 0) continue; // already depending on this one

        if (log.debug) log.debug('DEPENDS: ' + this + ' depends on ' + gi);
        this.dependsOn.push(gi);
    }
};

// NB: if we had another way to get the numContactPoints info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group, color = g.color;
    // find allies 1 stone away
    var allAllies = [];
    var empties = g.allLives();
    var numContactPoints = 0;
    for (var e = empties.length - 1; e >= 0; e--) {
        var neighbors = empties[e].neighbors, isContact = false;
        for (var n = neighbors.length - 1; n >= 0; n--) {
            var s = neighbors[n];
            if (s.color !== color || s.group === g) continue;
            isContact = true;
            if (allAllies.indexOf(s.group) < 0) allAllies.push(s.group);
        }
        if (isContact) numContactPoints++;
    }
    if (!numContactPoints) return;
    this.numContactPoints = numContactPoints;
    allAllies.push(g);
    Band.gather(allAllies);
};

GroupInfo.prototype.considerDead = function (reason) {
    this.isDead = true;

    var enemies = this.killers = this.group.allEnemies();
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i]._info.deadEnemies.push(this);
    }
    if (log.debug) log.debug('DEAD-' + reason + ': ' + this);
};

/** Returns a number telling how "alive" a group is.
 *  If >2 this should mean "alive for good" */
GroupInfo.prototype.liveliness = function (strict, shallow) {
    if (this.isAlive || this.eyeCount >= 2) {
        return ALIVE;
    }

    var n, racePoints = 0, color = this.group.color, lives = this.group.lives;
    for (var i = this.nearVoids.length - 1; i >= 0; i--) {
        var v = this.nearVoids[i];
        var points = Math.min(lives, v.vcount);
        if (v.owner) {
            if (v.owner === this) racePoints += points;
        } else {
            var allies = v.groups[color]; // NB: we don't care about enemies
            if (allies.length === 1) {
                racePoints += points;
            } else {
                var myNdx = this.group.ndx, minNdx = myNdx;
                for (n = allies.length - 1; n >= 0; n--) {
                    minNdx = Math.min(allies[n].ndx, minNdx);
                }
                if (myNdx === minNdx) racePoints += points;
            }
        }
    }
    racePoints /= 100;

    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow) {
        for (n = this.dependsOn.length - 1; n >= 0; n--) {
            familyPoints += this.dependsOn[n].liveliness(strict, true);
        }
        if (this.band) {
            var brothers = this.band.brothers;
            for (n = brothers.length - 1; n >= 0; n--) {
                if (brothers[n] === this) continue;
                familyPoints += brothers[n].liveliness(strict, true);
            }
        }
    }
    //TODO: get rid of this "strict" idea
    var numDeadEnemies = strict ? this.countEyesFromDeadEnemy() : this.deadEnemies.length;
    return this.eyeCount + numDeadEnemies + familyPoints + racePoints;
};

// Finds next recommended move to make 2 eyes
// Returns:
//   NEVER => cannot make 2 eyes
//   SOMETIMES => can make 2 eyes if we play now (coords will receive [i,j])
//   ALWAYS => can make 2 eyes even if opponent plays first
GroupInfo.prototype.getEyeMakerMove = function (coords) {
    // TODO: if depending group is on a side of eye, 1 vertex will be lost
    if (this.eyeCount > 1) return ALWAYS;
    if (this.eyeCount === 0) return NEVER;
    if (this.voids[0].vcount > 6) return ALWAYS;
    if (log.debug) log.debug('getEyeMakerMove checking ' + this);

    var g = this.group, color = g.color;
    var analyseYx = this.boan.analyseGrid.yx;
    var best = null, bestLives = 0, bestEnemies = 0, numMoves = 0;
    var empties = g.allLives(), numEmpties0 = empties.length;

    for (var n = 0; n < empties.length; n++) {
        var s = empties[n];
        var v = analyseYx[s.j][s.i];
        if (!v.owner || v.color !== color) continue;

        var numEnemies = 0, numAllies = 0, numLives = 0;
        for (var m = s.neighbors.length - 1; m >= 0; m--) {
            var s2 = s.neighbors[m];
            switch (s2.color) {
            case EMPTY:
                if (n < numEmpties0 && !s2.isNextTo(g) && empties.indexOf(s2) < 0)
                    empties.push(s2); // add s2 to our list of empties to check
                numLives++;
                break;
            case color: numAllies++; break;
            default:
                if (s2.group.lives > 1) numEnemies++;
                else numLives++;
            }
        }
        if (numEnemies) {
            if (numLives + (numAllies ? 1 : 0) < 2) continue;
        } else {
            if (numLives < 2) continue;
        }
        if (log.debug) log.debug('getEyeMakerMove sees ' + numLives + (numEnemies < 1 ? '' : (numEnemies > 1 ? 'e' + numEnemies : 'E')) + ' in ' + s);
        // skip corner if we have better
        if (s.isCorner() && numMoves) continue;

        numMoves++; // we must count only the successful moves
        if (best) {
            if (numEnemies <= bestEnemies) continue;
            if (numLives + numEnemies < bestLives) continue;
            if (best.isCorner()) numMoves--;
        }

        best = s;
        bestEnemies = numEnemies;
        bestLives = numLives;
    }
    if (log.debug) log.debug('getEyeMakerMove result: ' + best + ' - ' + (best ? (numMoves > 1 ? 'ALWAYS' : 'SOMETIMES') : 'NEVER'));
    if (!best) return NEVER;
    if (numMoves > 1) return ALWAYS;
    coords[0] = best.i; coords[1] = best.j;
    return SOMETIMES;
};

// TODO better algo
// We would not need this if we connected as "brothers" 2 of our groups separated by 
// a dead enemy. This is probably a better way to stop counting dead enemies to make up
// for unaccounted eyes. See TestBoardAnalyser#testBigGame2 in h12 for an example.
GroupInfo.prototype.countEyesFromDeadEnemy = function () {
    var count = this.deadEnemies.length;
    for(var n = count - 1; n >= 0; n--) {
        var voids = this.deadEnemies[n].nearVoids;
        // if a void next to this enemy belongs to us already, then dead enemy adds nothing
        for (var m = voids.length - 1; m >= 0; m--) {
            if (voids[m].owner === this) { // if remark above is coded, it becomes voids[m].color === color
                count--;
                break;
            }
        }
    }
    return count;
};

// This checks if a group can survive from its parents
GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return UNDECIDED;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var parent = this.dependsOn[n];
        if (parent.isAlive) {
            if (log.debug) log.debug('ALIVE-parents: ' + this);
            this.isAlive = true;
            return LIVES;
        }
        if (!parent.isDead) allAreDead = false;
    }
    if (!allAreDead) return UNDECIDED;
    return FAILS;
};

// This checks if a group can survive together with his brothers
GroupInfo.prototype.checkBrothers = function () {
    if (!this.band) return UNDECIDED;
    var brothers = this.band.brothers;
    var numEyes = 0, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        var gi = brothers[n];
        if (gi === this) continue;
        if (oneIsAlive || gi.isAlive) {
            oneIsAlive = gi.isAlive = true;
        } else {
            // gather the commonly owned eyes (2 one-eyed brothers are alive for good)
            numEyes += gi.eyeCount;
            if (numEyes >= 2) {
                oneIsAlive = gi.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return UNDECIDED;
    if (log.debug) log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return LIVES;
};

GroupInfo.prototype._isLostInEnemyZone = function () {
    if (this.band || this.dependsOn.length) return false;
    if (this.nearVoids[0].color === this.group.color) return false;
    if (this.group.stones.length >= 6) return false;
    return true;
};

// This checks if a group can make 2 eyes from a single one
GroupInfo.prototype.checkSingleEye = function (first2play) {
    if (this.eyeCount >= 2) {
        this.isAlive = true;
        if (log.debug) log.debug('ALIVE-doubleEye: ' + this);
        return LIVES;
    }
    if (this._isLostInEnemyZone()) return FAILS;

    var coords = [];
    var alive = this.getEyeMakerMove(coords);
    // if it depends which player plays first
    if (alive === SOMETIMES) {
        if (first2play === undefined) return UNDECIDED; // no idea who wins here
        if (first2play !== this.group.color) {
            alive = NEVER;
        }
    }
    if (alive === NEVER) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.dependsOn.length || this.deadEnemies.length) return UNDECIDED;
        this._liveliness = this.liveliness();
        return FAILS;
    }
    // alive === ALWAYS
    this.isAlive = true;
    if (log.debug) log.debug('ALIVE-singleEye-' + when2str(alive) + ': ' + this);
    return LIVES;
};

// This checks if a group has a minimum liveliness
GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this._liveliness = this.liveliness(true);
    if (life >= 2) {
        this.isAlive = true;
        if (log.debug) log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return LIVES;
    }
    if (life < minLife) {
        this._liveliness = life;
        return FAILS;
    }
    return UNDECIDED;
};

GroupInfo.prototype._count = function (method) {
    var count = method.call(this), n;
    if (this.band) {
        var brothers = this.band.brothers;
        for (n = brothers.length - 1; n >= 0; n--) {
            if (brothers[n] === this) continue;
            count += method.call(brothers[n]);
        }
    } else {
        for (n = this.dependsOn.length - 1; n >= 0; n--) {
            count += method.call(this.dependsOn[n]); //TODO do we need to run on brothers of parents?
        }
    }
    return count;
};

GroupInfo.prototype.addPotentialEye = function (stone) {
    this.potentialEyes.push(stone);
};

GroupInfo.prototype._countPotEyes = function () { return this.potentialEyes.length; };

GroupInfo.prototype.countPotentialEyes = function () {
    return this._count(this._countPotEyes);
};

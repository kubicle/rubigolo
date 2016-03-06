'use strict';

var CONST = require('../../../constants');
var main = require('../../../main');
var Band = require('./Band');

var EMPTY = CONST.EMPTY;
var NEVER = CONST.NEVER, SOMETIMES = CONST.SOMETIMES, ALWAYS = CONST.ALWAYS;
var EVEN = CONST.EVEN, ODD = CONST.ODD;


/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group, boan) {
    this.boan = boan;
    this.voids = []; // voids owned by the group
    this.nearVoids = []; // voids around, owned or not
    this.deadEnemies = [];
    this.killers = [];
    this.potentialEyeCounts = [0, 0];
    this.fakeSpots = []; // single connection points with brothers
    this.fakeBrothers = []; // brothers for which connection is a fake spot
    this.closeBrothers = [];

    this.group = group;
    this.resetAnalysis();
}
module.exports = GroupInfo;

// Result of a check on a group:
var FAILS = GroupInfo.FAILS = -1;
var LIVES = GroupInfo.LIVES = +1;
var UNDECIDED = GroupInfo.UNDECIDED = 0;

var ALIVE = GroupInfo.ALIVE = 1000; // any big enough liveliness to mean "alive for good"


// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function () {
    this.eyeCount = this._liveliness = 0;
    this.voids.length = 0;
    this.nearVoids.length = 0;
    this.band = null;
    this.isAlive = this.isDead = false;
    this.inRaceWith = null;
    this.deadEnemies.length = 0;
    this.killers.length = 0;
    this.potentialEyeCounts[EVEN] = this.potentialEyeCounts[ODD] = 0;
    this.fakeSpots.length = 0;
    this.fakeBrothers.length = 0;
    this.closeBrothers.length = 0;
};

// For debug only
function when2str(when) {
    return when > NEVER ? (when > SOMETIMES ? 'ALWAYS' : 'SOMETIMES') : 'NEVER';
}

GroupInfo.giNdx = function (gi) { return '#' + gi.group.ndx; };

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ' voids:' +
        this.voids.length + ' brothers:[' +
        brothers + '] deadEnemies:[' + this.deadEnemies.map(GroupInfo.giNdx) + '])';
};

/** Adds a void to an owner-group + makes groups sharing the void brothers.
 * @param {Void} v
 * @param {Array} [groups] - array of co-owner groups (they become brothers)
 * @return {GroupInfo} - "this"
 */
GroupInfo.prototype.addVoid = function (v, groups) {
    if (main.debug) main.log.debug('OWNED: ' + v + ' owned by ' + this);
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
    if (main.debug) main.log.debug('LOST: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    this.eyeCount--;
};

// NB: if we had another way to get the contact points info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group, color = g.color;
    // find allies 1 stone away
    var allies = [], isUnique = [], contactPoints = [];
    var empties = g.allLives();

    for (var e = empties.length - 1; e >= 0; e--) {
        var empty = empties[e];
        var neighbors = empty.neighbors;
        var ally = null;
        for (var n = neighbors.length - 1; n >= 0; n--) {
            var s = neighbors[n];
            if (s.color !== color || s.group === g) continue;
            ally = s.group;
            var ndx = allies.indexOf(ally);
            if (ndx >= 0) {
                if (contactPoints[ndx] !== empty)
                    isUnique[ndx] = false;
                continue;
            }
            allies.push(ally);
            isUnique.push(true);
            contactPoints.push(empty);
        }
    }
    if (!allies.length) return;

    for (var i = allies.length - 1; i >= 0; i--) {
        if (!isUnique[i]) {
            this.closeBrothers.push(allies[i]);
            continue;
        }
        var stone = contactPoints[i];
        this.fakeSpots.push(stone);
        this.fakeBrothers.push(allies[i]);
        this.boan.getVoidAt(stone).markAsFakeSpot();
    }
    allies.push(g);
    Band.gather(allies);
};

//FIXME: see scoring tests; a fake spot inside our territory can be left unplayed
GroupInfo.prototype.needsToConnect = function () {
    if (this.eyeCount >= 2) return NEVER;
    var numPotEyes = this._countPotEyes();
    if (numPotEyes >= 3) return NEVER;
    if (numPotEyes === 0) return ALWAYS;
    return SOMETIMES;
};

GroupInfo.prototype.getFakeSpots = function (v, stones, isScoring) {
    if (this.needsToConnect() === NEVER) return;
    // with a dead enemy around, we are usually not forced to connect
    if (this.deadEnemies.length) return;

    var color = this.group.color, numAllyVoids = 0;
    for (var i = this.nearVoids.length - 1; i >= 0; i--) {
        var nearVoid = this.nearVoids[i];
        if (nearVoid.color === color) numAllyVoids++;
    }
    if (numAllyVoids >= 2) return;
    // When scoring, having only ally voids around is enough
    if (isScoring && numAllyVoids === this.nearVoids.length) return;

    for (i = this.fakeSpots.length - 1; i >= 0; i--) {
        var stone = this.fakeSpots[i];
        if (this.boan.getVoidAt(stone) !== v) continue; // not in given void

        if (stones.indexOf(stone) < 0) stones.push(stone);
    }
};

GroupInfo.prototype.considerDead = function (reason) {
    this.isDead = true;

    var enemies = this.killers = this.group.allEnemies();
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i]._info.deadEnemies.push(this);
    }
    // All enemies are now "connected" via this dead group
    if (enemies.length > 1) Band.gather(enemies);
    if (main.debug) main.log.debug('DEAD-' + reason + ': ' + this);
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
    if (!shallow) racePoints += lives / 10000; // is this still necessary?

    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow && this.band) {
        var brothers = this.band.brothers;
        for (n = brothers.length - 1; n >= 0; n--) {
            if (brothers[n] === this) continue;
            familyPoints += brothers[n].liveliness(strict, true);
        }
    }
    //TODO: get rid of this "strict" idea
    var numDeadEnemies = strict ? this.countEyesFromDeadEnemy() : this.deadEnemies.length;
    return this.eyeCount + numDeadEnemies + familyPoints + racePoints;
};

// Finds next recommended move to make 2 eyes
// Returns:
//   NEVER => cannot make 2 eyes
//   SOMETIMES => can make 2 eyes if we play now; coords will receive [i,j]
//   ALWAYS => can make 2 eyes even if opponent plays first
// 5 shapes:
//   4-1-1-1-1 "+" shape => center is must-play now
//   2-2-2-1-1 "line" => safe
//   3-2-2-2-1 "d" shape => 3 is must-play now
//   3-2-1-1-1 "t" shape => safe
// 6 shapes:
//   3-3-2-2-2-2 "6 domino" shape => one of the 3 is must-play now
//   anything else is safe
GroupInfo.prototype.getEyeMakerMove = function (coords) {
    // TODO: if depending group is on a side of eye, 1 vertex will be lost
    if (this.eyeCount > 1) return ALWAYS;
    if (this.eyeCount === 0) return NEVER;
    var singleEye = this.voids[0], vcount = singleEye.vcount;
    if (vcount > 6) return ALWAYS;
    if (main.debug) main.log.debug('getEyeMakerMove checking ' + this + ' with single eye: ' + singleEye);

    var g = this.group, color = g.color;
    var best = null, bestLives = 0, bestEnemies = 0, numMoves = 0;
    var empties = singleEye.vertexes, oneMoveIsCorner = false, lives = [0, 0, 0, 0, 0];

    for (var n = 0; n < vcount; n++) {
        var s = empties[n];
        var numEnemies = 0, numAllies = 0, numLives = 0;

        for (var m = s.neighbors.length - 1; m >= 0; m--) {
            var s2 = s.neighbors[m];
            switch (s2.color) {
            case EMPTY:
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
            lives[numLives]++;
        }
        if (main.debug) main.log.debug('getEyeMakerMove sees ' + numLives + (numEnemies < 1 ? '' : (numEnemies > 1 ? 'e' + numEnemies : 'E')) + ' in ' + s);

        numMoves++; // count successful moves; if more than 1 => ALWAYS good
        if (s.isCorner()) oneMoveIsCorner = true;

        // If we already have a best move, compare with new move
        if (best && !best.isCorner()) { // corner (2L,0E) is "less good" than any other good move
            if (numEnemies < bestEnemies) continue;
            if (numLives + numEnemies <= bestLives + bestEnemies) continue;
        }
        best = s;
        bestEnemies = numEnemies;
        bestLives = numLives;
    }
    if (oneMoveIsCorner && numMoves > 1) numMoves--;
    if (main.debug) main.log.debug('getEyeMakerMove result: ' + best + ' - ' + (best ? (numMoves > 1 ? 'ALWAYS' : 'SOMETIMES') : 'NEVER'));

    if (!best) return NEVER;
    
    if (numMoves >= 2) {
        // except for shape "5" with 1 forced move, we are good if 2 moves or more
        var isWeak5 = vcount === 5 && bestEnemies === 0 && lives[3] === 1 && lives[2] === 3;
        var isWeak6 = vcount === 6 && bestEnemies === 0 && lives[3] === 2 && lives[2] === 4;
        if (!isWeak5 && !isWeak6) return ALWAYS;
    }
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
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this, ' numEyes: ' + numEyes);
    this.isAlive = true;
    return LIVES;
};

GroupInfo.prototype._isLostInEnemyZone = function () {
    if (this.band) return false;
    if (this.nearVoids[0].color === this.group.color) return false;
    if (this.group.stones.length >= 6) return false;
    return true;
};

// This checks if a group can make 2 eyes from a single one
GroupInfo.prototype.checkSingleEye = function (first2play) {
    if (this.eyeCount >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
        return LIVES;
    }
    if (this._isLostInEnemyZone()) return FAILS;

    var coords = [];
    var canMakeTwoEyes = this.getEyeMakerMove(coords);
    // if it depends which player plays first
    if (canMakeTwoEyes === SOMETIMES) {
        if (first2play === undefined) return UNDECIDED; // no idea who wins here
        if (first2play !== this.group.color) {
            canMakeTwoEyes = NEVER;
        }
    }
    if (canMakeTwoEyes === NEVER) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.deadEnemies.length) return UNDECIDED;
        if (this.countBandPotentialEyes() >= 2)
            return UNDECIDED;
        this._liveliness = this.liveliness();
        return FAILS;
    }
    // canMakeTwoEyes === ALWAYS or SOMETIMES & it is our turn to play
    this.isAlive = true;
    if (main.debug) main.log.debug('ALIVE-canMakeTwoEyes-' + when2str(canMakeTwoEyes) + ': ' + this);
    return LIVES;
};

// Check for races & weaker groups around
GroupInfo.prototype.checkAgainstEnemies = function () {
    var liveliness = this._liveliness || this.liveliness();
    var enemies = this.group.allEnemies();
    var inRaceWith = null;

    for (var e = 0; e < enemies.length; e++) {
        var enemy = enemies[e]._info;
        var cmp = liveliness - enemy.liveliness();
        if (main.debug) main.log.debug('comparing group #' + this.group.ndx + ' with ' +
            liveliness.toFixed(4) + ' against ' + (liveliness - cmp).toFixed(4) +
            ' for enemy group #' + enemy.group.ndx);
        if (cmp > 0) {
            if (main.debug) main.log.debug(this + ' is stronger than ' + enemy);
            return UNDECIDED;
        } else if (cmp === 0) {
            if (main.debug) main.log.debug('RACE between ' + this.group + ' and ' + enemy.group);
            inRaceWith = enemy; // we continue looping: not a race if a weaker is found
        }
    }
    if (inRaceWith) {
        this.inRaceWith = inRaceWith; // TODO race between more than 2 groups
        inRaceWith.inRaceWith = this;
        return UNDECIDED;
    }
    return FAILS;
};

// This checks if a group has a minimum liveliness
GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this._liveliness = this.liveliness(true);
    if (life >= 2) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return LIVES;
    }
    if (life < minLife) {
        this._liveliness = life;
        return FAILS;
    }
    return UNDECIDED;
};

GroupInfo.prototype.callOnBand = function (method, param) {
    if (this.band) {
        var brothers = this.band.brothers, count = 0;
        for (var n = brothers.length - 1; n >= 0; n--) {
            count += method.call(brothers[n], param);
        }
        return count;
    } else {
        return method.call(this, param);
    }
};

GroupInfo.prototype.addPotentialEye = function (oddOrEven, count) {
    this.potentialEyeCounts[oddOrEven] += count;
};

GroupInfo.prototype._countPotEyes = function () {
    return this.eyeCount + Math.max(this.potentialEyeCounts[EVEN], this.potentialEyeCounts[ODD]);
};

GroupInfo.prototype.countBandPotentialEyes = function () {
    return this.callOnBand(this._countPotEyes);
};

GroupInfo.prototype._countSize = function () {
    return this.group.stones.length;
};

GroupInfo.prototype.countBandSize = function () {
    return this.callOnBand(this._countSize);
};

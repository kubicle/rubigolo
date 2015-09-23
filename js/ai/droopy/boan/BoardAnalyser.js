//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Group = require('../../../Group');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('../Shaper');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = 1000;

function grpNdx(g) { return '#' + g.ndx; }
function giNdx(gi) { return '#' + gi.group.ndx; }


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(code, i, j, vcount, neighbors) {
    this.code = code;
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.vtype = undefined; // see vXXX contants below
    this.owner = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.stolen = false;
}
module.exports = Void;

var vEYE = 1, vFAKE_EYE = 2, vDAME = 3;
var vtypes = ['void', 'eye', 'fake-eye', 'dame'];

function vtype2str(vtype) {
    return vtype ? vtypes[vtype] : vtypes[0];
}

function isOneNotDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return true;
    }
    return false;
}

Void.prototype.findOwner = function () {
    // see which color has yet-alive groups around this void
    var hasBlack = isOneNotDead(this.groups[BLACK]);
    var hasWhite = isOneNotDead(this.groups[WHITE]);

    // every group around now dead = eye stolen by who killed them
    if (!hasBlack && !hasWhite) {
        if (this.vtype && !this.stolen) this.wasJustStolen();
        return;
    }

    if (hasBlack && hasWhite) return; // still undefined owner
    var color = hasBlack ? BLACK : WHITE;
    if (this.isFakeEye(color)) return;
    return this.setEyeOwner(color);
};

// NB: groups around a fake-eye do not count it has an eye/void
Void.prototype.isFakeEye = function (color) {
    // Potential fake eyes are identified only once (when still "undefined")
    // after which they can only lose this property
    if (this.vtype && this.vtype !== vFAKE_EYE) return false;

    if (this.vcount > 1) return false;
    var groups = this.groups[color];
    if (groups.length < 2) return false; // not shared

    var isFake = false;
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.numContactPoints === 1 && !gi.deadEnemies.length) {
            if (main.debug && !isFake) main.log.debug('FAKE EYE: ' + this);
            isFake = true;
            gi.makeDependOn(groups, this);
        }
    }
    if (!isFake) return false;
    if (!this.vtype) {
        this.vtype = vFAKE_EYE;
        this.owner = color;
    }
    return true;
};

Void.prototype.setEyeOwner = function (color) {
    if (this.vtype === vEYE && color === this.owner) return;
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.owner = color;

    // If more than 1 group and they were not brothers yet, they become brothers
    var groups = this.groups[color];
    if (groups.length > 1) Band.gather(groups);

    // Now tell ONE of the groups about this void
    groups[0]._info.addVoid(this);
};

Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner !== undefined) {
        var groups = this.groups[this.owner];
        for (var i = groups.length - 1; i >= 0; i--) {
            groups[i]._info.removeVoid(this);
        }
        this.owner = undefined;
    }
    this.vtype = vDAME;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype.wasJustStolen = function () {
    if (this.owner === undefined) throw new Error('stolen eye of undefined owner');
    if (main.debug) main.log.debug('STOLEN EYE: ' + this);
    // remove eye from previous owners and build the list of killers
    var groups = this.groups[this.owner];
    var killers = [];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        gi.removeVoid(this);
        killers.pushUnique(gi.killers);
    }
    // we "add" the eye to each killer
    this.stolen = true;
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.owner = 1 - this.owner;
    for (var k = killers.length - 1; k >= 0; k--) {
        killers[k]._info.addVoid(this);
    }
};

Void.prototype.getSingleOwner = function () {
    if (this.owner === undefined) return null;
    var groups = this.groups[this.owner];
    if (groups.length > 1) return null;
    return groups[0];
};

Void.prototype.toString = function () {
    var s = vtype2str(this.vtype) + ' ' + this.code + '-' + Grid.colorToChar(this.code) + ' (' + Grid.xy2move(this.i, this.j) + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.colorName(color) + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    console.log(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        console.log('    Color ' + color + ' (' + Grid.colorToChar(color) + '): ' +
            this.groups[color].map(grpNdx));
    }
};

//---

/** @class One list of "brother" groups = groups which share eyes.
 *  @param {GroupInfo} gi0 - first group in band */
function Band(gi0) {
    this.bandId = gi0.group.ndx; // unique enough
    this.brothers = [gi0]; // array of GroupInfo
    gi0.band = this;
    gi0.dependsOn.clear(); // does not depend on parents anymore
}

Band.prototype.toString = function () {
    return this.brothers.map(giNdx);
};

Band.prototype._add1 = function (gi) {
    gi.dependsOn.clear(); // does not depend on parents anymore

    if (!gi.band) {
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    var brothers = gi.band.brothers;
    for (var n = brothers.length - 1; n >= 0; n--) {
        this.brothers.push(brothers[n]);
        brothers[n].band = this;
    }
};

Band.prototype.remove = function (gi) {
    var ndx = this.brothers.indexOf(gi);
    if (ndx < 0) throw new Error('Band.remove on wrong Band');
    this.brothers.splice(ndx, 1);
    gi.band = null;
};

// groups contains the groups in the band
Band.gather = function (groups) {
    if (main.debug) main.log.debug('BROTHERS: ' + groups.length + ' groups: ' + groups);
    if (groups.length === 1) throw new Error('add Band of 1');

    // look if one of the group is already in a band
    var band = null;
    for (var n = 0; n < groups.length; n++) {
        if (groups[n]._info.band) { band = groups[n]._info.band; break; }
    }
    // if not, create a new band with 1st group in it
    var first = 0;
    if (!band) band = new Band(groups[first++]._info);
    // add all groups to band
    for (n = first; n < groups.length; n++) {
        band._add1(groups[n]._info);
    }
};


//---

/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group) {
    this.voids = []; // empty zones next to a group
    this.dependsOn = [];
    this.deadEnemies = [];
    this.killers = [];

    this.resetAnalysis(group);
}

// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function (group) {
    this.group = group;
    this.eyeCount = 0;
    this.voids.clear();
    this.dependsOn.clear();
    this.band = null;
    this.isAlive = false;
    this.isDead = false;
    this.deadEnemies.clear();
    this.killers.clear();
    this.numContactPoints = 0;
};

GroupInfo.prototype.toString = function () {
    var brothers = this.band ? this.band.toString() : '';
    return this.group.toString() +
        ' (isAlive:' + this.isAlive + ' isDead:' + this.isDead + ', ' +
        this.eyeCount + ' eyes, ' + this.voids.length + ' voids  brothers:[' +
        brothers + '] parents:[' + this.dependsOn.map(giNdx) +
        '] deadEnemies:[' + this.deadEnemies.map(giNdx) + '])';
};

// Adds a void or an eye to an owner-group
GroupInfo.prototype.addVoid = function (v) {
    if (main.debug) main.log.debug('OWNED EYE: ' + v + ' owned by ' + this);
    this.voids.push(v);
    if (v.vtype === vEYE) this.eyeCount++;
};

// Removes given void from the group (if not owned, does nothing)
GroupInfo.prototype.removeVoid = function (v) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) return;
    if (main.debug) main.log.debug('LOST EYE: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    if (v.vtype === vEYE) this.eyeCount--;
};

GroupInfo.prototype.giveVoidsTo = function (gi) {
    var v;
    while ((v = this.voids[0])) {
        this.removeVoid(v);
        gi.addVoid(v);
    }
};

GroupInfo.prototype.makeDependOn = function (groups) {
    if (main.debug) main.log.debug('DEPENDING group: ' + this);
    var band = this.band;
    if (band) band.remove(this);
    
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) < 0) {
            if (main.debug) main.log.debug('DEPENDS: ' + this + ' depends on ' + gi);
            this.dependsOn.push(gi);
        }
    }

    this.giveVoidsTo(this.dependsOn[0]);
};

// NB: if we had another way to get the numContactPoints info, we could do this
// much more efficiently by looking once at each empty point on the board
GroupInfo.prototype.findBrothers = function () {
    var g = this.group;
    // find allies 1 stone away
    var empties = g.allLives();
    var allAllies = [];
    var numContactPoints = 0;
    for (var e = empties.length - 1; e >= 0; e--) {
        var allies = empties[e].uniqueAllies(g.color);
        if (allies.length === 1) continue;
        numContactPoints++;
        allAllies.pushUnique(allies);
    }
    if (!numContactPoints) return;
    this.numContactPoints = numContactPoints;
    Band.gather(allAllies);
};

/** Returns the (first) single eye of a group */
GroupInfo.prototype.getSingleEye = function () {
    for (var i = this.voids.length - 1; i >= 0; i--) {
        var eye = this.voids[i];
        if (eye.vtype === vEYE) return eye;
    }
    return null;
};

GroupInfo.prototype.considerDead = function (reason) {
    this.isDead = true;

    var enemies = this.killers = this.group.allEnemies();
    for (var i = enemies.length - 1; i >= 0; i--) {
        enemies[i]._info.deadEnemies.push(this);
    }
    if (main.debug) main.log.debug('DEAD-' + reason + ': ' + this);
};

/** Returns a number telling how "alive" a group is.
 *  NB: for end-game counting, this logic is enough because undetermined situations
 *  have usually all been resolved - otherwise it means both players cannot see it ;) */
GroupInfo.prototype.liveliness = function (shallow) {
    if (this.isAlive || this.eyeCount >= 2) {
        return ALIVE;
    }
    var racePoints = this.group.lives / 100;
    if (this.isDead) {
        return 0 + racePoints;
    }
    var familyPoints = 0;
    if (!shallow) {
        for (var n = this.dependsOn.length - 1; n >= 0; n--) {
            familyPoints += this.dependsOn[n].liveliness(true);
        }
        if (this.band) {
            var brothers = this.band.brothers;
            for (n = brothers.length - 1; n >= 0; n--) {
                if (brothers[n] === this) continue;
                familyPoints += brothers[n].liveliness(true);
            }
        }
    }
    return this.voids.length + this.deadEnemies.length + familyPoints + racePoints;
};

GroupInfo.prototype.checkDoubleEye = function () {
    if (this.voids.length + this.deadEnemies.length >= 2) {
        if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
        this.isAlive = true;
        return true;
    }
    return false;
};

GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return false;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var parent = this.dependsOn[n];
        if (parent.isAlive) {
            if (main.debug) main.log.debug('ALIVE-parents: ' + this);
            this.isAlive = true;
            return true;
        }
        if (!parent.isDead) allAreDead = false;
    }
    if (!allAreDead) return false;
    this.considerDead('parentsDead');
    return true;
};

GroupInfo.prototype.checkBrothers = function () {
    if (!this.band) return false;
    var brothers = this.band.brothers;
    var numEyes = 0, oneIsAlive = false;
    for (var n = brothers.length - 1; n >= 0; n--) {
        var gi = brothers[n];
        if (gi === this) continue;
        if (oneIsAlive || gi.isAlive) {
            oneIsAlive = gi.isAlive = true;
        } else {
            numEyes += gi.eyeCount;
            if (numEyes >= 2) { // checkLiveliness does that too; TODO: remove if useless
                oneIsAlive = gi.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return false;
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return true;
};

GroupInfo.prototype.checkSingleEye = function (first) {
    if (this.eyeCount !== 1) return false;
    var eye = this.getSingleEye();
    var coords = [];
    var alive = Shaper.getEyeMakerMove(this.group.goban, eye.i, eye.j, eye.vcount, coords);
    // if it depends which player plays first
    if (alive === 1) {
        if (first === undefined) return false; // no idea who wins here
        if (first !== this.group.color) {
            alive = 0;
        }
    }
    if (alive === 0) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.deadEnemies.length) return false;
        this.considerDead('singleEyeShape');
        return true;
    }

    this.isAlive = true;
    if (main.debug) main.log.debug('ALIVE-singleEye-' + alive + ': ' + this);
    return true;
};

GroupInfo.prototype.checkLiveliness = function (minLife) {
    var life = this.liveliness();
    if (life >= ALIVE) {
        this.isAlive = true;
        if (main.debug) main.log.debug('ALIVE-liveliness ' + life + ': ' + this);
        return true;
    }
    if (life < minLife) {
        this.considerDead('liveliness=' + life.toFixed(2));
        return true;
    }
    return false;
};

GroupInfo.prototype.checkLiveliness1 = function () {
    return this.checkLiveliness(1);
};

GroupInfo.prototype.checkLiveliness2 = function () {
    return this.checkLiveliness(2);
};


//---

/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.mode = null;
    this.goban = null;
    this.allVoids = [];
    this.scores = [0, 0];
    this.prisoners = [0, 0];
}
module.exports = BoardAnalyser;


/** Calling this method updates the goban to show the detected result.
 */
BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = Group.countPrisoners(goban);

    if (!this._initAnalysis('SCORE', goban)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(this.filler.grid.toText(function (c) { return Grid.colorToChar(c); }));
};

/** If grid is not given a new one will be created from goban */
BoardAnalyser.prototype.analyse = function (goban, grid, first) {
    var mode = first === undefined ? 'MOVE' : 'TERRITORY';
    if (!this._initAnalysis(mode, goban, grid)) return;
    this._runAnalysis(first);
    this._finalColoring();
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    console.log(this.filler.grid.toText(function (c) {
        return Grid.colorToChar(c);
    }));
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.debugDump();
    }
    if (this.scores) {
        var eyes = [[], [], []];
        for (var ndx in this.allGroups) {
            var g = this.allGroups[ndx];
            var numEyes = g._info.eyeCount;
            eyes[numEyes >= 2 ? 2 : numEyes].push(g);
        }
        console.log('\nGroups with 2 eyes or more: ' + eyes[2].map(grpNdx));
        console.log('Groups with 1 eye: ' + eyes[1].map(grpNdx));
        console.log('Groups with no eye: ' + eyes[0].map(grpNdx));
        console.log('Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        }));
    }
};

BoardAnalyser.prototype._initAnalysis = function (mode, goban, grid) {
    this.mode = mode;
    this.goban = goban;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g) {
    if (this.allGroups[g.ndx]) return;
    this.allGroups[g.ndx] = g;
    if (!g._info) {
        g._info = new GroupInfo(g);
    } else {
        g._info.resetAnalysis(g);
    }
};

/** Create the list of voids and groups.
 *  The voids know which groups are around them
 *  but the groups do not own any void yet. */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, voidCode, neighbors);
            if (vcount === 0) continue;
            this.allVoids.push(new Void(voidCode, i, j, vcount, neighbors));
            voidCode++;
            // keep all the groups
            for (var color = BLACK; color <= WHITE; color++) {
                var groups = neighbors[color];
                for (var n = groups.length - 1; n >= 0; n--) {
                    this._addGroup(groups[n]);
                }
            }
            neighbors = [[], []];
        }
    }
};

BoardAnalyser.prototype._runAnalysis = function (first) {
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();
    this._lifeOrDeathLoop(first);
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroups) {
        this.allGroups[ndx]._info.findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    for (var n = this.allVoids.length - 1; n >= 0; n--) {
        this.allVoids[n].findOwner();
    }
};

function normalizeLiveliness(life) {
    if (life > 1 && life < 2) {
        return life - 1 + 0.01; // TODO check in book if this is relevant enough
    }
    return life;
}

function compareLivelines(life) {
    // make sure we have a winner, not a tie
    if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
        return undefined;
    }
    life[BLACK] = normalizeLiveliness(life[BLACK]);
    life[WHITE] = normalizeLiveliness(life[WHITE]);
    return life[BLACK] > life[WHITE] ? BLACK : WHITE;
}

BoardAnalyser.prototype._findBattleWinners = function () {
    var life = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.owner !== undefined) continue;
            life[BLACK] = life[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness();
                }
            }
            var winner = compareLivelines(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED EYE in dispute: ' + v);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED EYE: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(2) + ' VS ' + life[1 - winner].toFixed(2));
            v.setEyeOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

// FIXME: order of group should not matter
BoardAnalyser.prototype._reviewGroups = function (fn, stepNum, first) {
    var count = 0, reviewedCount = 0;
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;
        if (fn.call(gi, first)) count++;
    }
    if (main.debug) {
        var msg = 'REVIEWED ' + reviewedCount + ' groups for step ' + stepNum;
        if (count) msg += ' => found ' + count + ' alive/dead groups';
        main.log.debug(msg);
    }
    if (count === reviewedCount) return -1; // really finished
    return count;
};

var midGameLifeChecks = [
    GroupInfo.prototype.checkDoubleEye,
    GroupInfo.prototype.checkParents,
    GroupInfo.prototype.checkBrothers,
    GroupInfo.prototype.checkLiveliness1,
    GroupInfo.prototype.checkSingleEye // TODO: test if territory eval should make this check
    // We don't expect a final liveliness (2) in mid-game
];
var scoringLifeChecks = [
    GroupInfo.prototype.checkDoubleEye,
    GroupInfo.prototype.checkParents,
    GroupInfo.prototype.checkBrothers,
    GroupInfo.prototype.checkLiveliness1,
    GroupInfo.prototype.checkSingleEye,
    GroupInfo.prototype.checkLiveliness2
];

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first) {
    var checks = this.mode === 'SCORE' ? scoringLifeChecks : midGameLifeChecks;
    var stepNum = 0;
    while (stepNum < checks.length) {
        var count = this._reviewGroups(checks[stepNum], stepNum, first);
        if (count === 0) {
            stepNum++;
            continue;
        }
        // we found dead/alive groups => rerun all the checks from start
        stepNum = 0;
        this._findEyeOwners();
        if (count < 0) return;
    }
};

BoardAnalyser.prototype._finalColoring = function () {
    this._findDameVoids();
    this._colorVoids();
    this._colorDeadGroups();
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (g._info.liveliness() >= 2) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.setAsDame();
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype._colorVoids = function () {
    var color;
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        if (v.owner !== undefined && v.vtype !== vFAKE_EYE) {
            this.scores[v.owner] += v.vcount;
            color = Grid.TERRITORY_COLOR + v.owner;
        } else {
            color = Grid.DAME_COLOR;
        }
        this.filler.fillWithColor(v.i, v.j, v.code, color);
    }
};

BoardAnalyser.prototype._colorDeadGroups = function () {
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (!gi.isDead) continue;
        var color = g.color;
        var stone = g.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

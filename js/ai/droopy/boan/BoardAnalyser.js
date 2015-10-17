//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var Group = require('../../../Group');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('../Shaper');

var BOAN_VERSION = 'droopy';

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = 1000; // any big enough liveliness to mean "alive for good"

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
    this.color = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.owner = undefined; // GroupInfo or undefined; NB: fake eyes don't have owner
    this.isInDeadGroup = false; // true when all groups around an eye are dead (e.g. one-eyed dead group)
}
module.exports = Void;

var vEYE = 1, vFAKE_EYE = 2, vDAME = 3;
var VTYPES = ['void', 'eye', 'fake-eye', 'dame'];

function vtype2str(vtype) {
    return vtype ? VTYPES[vtype] : VTYPES[0];
}

function areGroupsAllDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return false;
    }
    return true;
}

Void.prototype.findOwner = function () {
    // see which color has yet-alive groups around this void
    var allBlackDead = areGroupsAllDead(this.groups[BLACK]);
    var allWhiteDead = areGroupsAllDead(this.groups[WHITE]);

    // every group around now dead = eye belongs to the killers
    if (allBlackDead && allWhiteDead) {
        if (this.vtype && !this.isInDeadGroup) this.setAsDeadGroupEye();
        return;
    }

    if (!allBlackDead && !allWhiteDead) return; // still undefined owner
    var color = allBlackDead ? WHITE : BLACK;
    if (this.isFakeEye(color)) return;

    this.setVoidOwner(color, vEYE);
};

// NB: groups around a fake-eye do not count it has an eye/void
Void.prototype.isFakeEye = function (color) {
    // Potential fake eyes are identified only once (when vtype is still "undefined")
    // after which they can only lose this property
    if (this.vtype && this.vtype !== vFAKE_EYE) return false;

    if (this.vcount > 1) return false;
    var groups = this.groups[color];
    if (groups.length < 2) return false; // not shared

    var isFake = false;
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        // NB: see TestBoardAnalyser#testBigGame1 for why we test deadEnemies below
        // Idea: with a dead enemy around, we are usually not forced to connect.
        if (gi.numContactPoints === 1 && !gi.deadEnemies.length && gi.voids.length < 2) {
            if (main.debug && !isFake) main.log.debug('FAKE EYE: ' + this);
            isFake = true;
            gi.makeDependOn(groups);
        }
    }
    if (!isFake) return false;
    if (this.vtype === undefined) {
        if (this.owner) this.owner.removeVoid(this);
        this.color = color;
        this.vtype = vFAKE_EYE;
    }
    return true;
};

/** Called in 2 cases: 
 * - sets the "stronger color" that will probably own a void - vtype == undefined
 * - decides the void is an eye for given color - vtype == vEYE
 */
Void.prototype.setVoidOwner = function (color, vtype) {
    if (vtype !== vEYE && vtype !== undefined) throw new Error('Invalid void owner vtype: ' + vtype);
    if (vtype === this.vtype && this.owner && color === this.color) return;
    if (main.debug) main.log.debug(vtype2str(vtype).toUpperCase() + ': ' + Grid.colorName(color) + ' owns ' + this);
    var oldType = this.vtype;
    this.vtype = vtype;

    // If more than 1 group and they were not brothers yet, they become brothers
    var groups = this.groups[color];
    if (groups.length > 1) Band.gather(groups);

    if (this.color !== color) {
        this.color = color;
        // ONE of the groups now owns this void
        groups[0]._info.takeVoid(this, oldType);
    } else {
        if (this.owner) this.owner.onVoidTypeChange(this, oldType);
    }
};

// Called during final steps for voids that have both B&W groups alive close-by
Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner) this.owner.removeVoid(this);
    this.color = undefined;
    this.vtype = vDAME;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype.setAsDeadGroupEye = function () {
    if (main.debug) main.log.debug('EYE-IN-DEAD-GROUP: ' + this);
    var color = this.color;
    if (color === undefined) throw new Error('dead group\'s eye of undefined owner');

    this.isInDeadGroup = true;
    var oldType = this.vtype;
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.color = 1 - color;

    // give it to any of the killers
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.killers.length) {
            return gi.killers[0]._info.takeVoid(this, oldType);
        }
    }
    // Found no killer; happens for eye inside dead group lost inside enemy zone.
    // We should leave the eye inside its possibly dead group. See TestBoardAnalyser#testDoomedGivesEye2
};

Void.prototype.isTouching = function (gi) {
    var g = gi.group;
    return this.groups[g.color].indexOf(g) > -1;
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
        if (main.debug) main.log.debug('BROTHERS: ' + gi + ' joins band: ' + this.toString());
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    if (main.debug) main.log.debug('BROTHERS: band merge: ' + gi.band + ' merge with ' + this.toString());
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
    if (main.debug) main.log.debug('un-BROTHERS: ' + gi + ' left band: ' + this.toString());
};

// groups contains the groups in the band
Band.gather = function (groups) {
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
    this.version = BOAN_VERSION;
    this.voids = []; // voids owned by the group
    this.nearVoids = []; // voids around, owned or not
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
    this.nearVoids.clear();
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

// Adds a void to an owner-group
// Current v.vtype value is used
GroupInfo.prototype._addVoid = function (v) {
    if (main.debug) main.log.debug('OWNED EYE: ' + v + ' owned by ' + this);
    this.voids.push(v);
    v.owner = this;
    if (v.vtype === vEYE) this.eyeCount++;
};

// Removes a void from an owner-group
// oldVtype value is used
GroupInfo.prototype._removeVoid = function (v, oldVtype) {
    var ndx = this.voids.indexOf(v);
    if (ndx === -1) throw new Error('remove unknown void');
    if (main.debug) main.log.debug('LOST: ' + v + ' lost by ' + this);
    this.voids.splice(ndx, 1);
    if (oldVtype === vEYE) this.eyeCount--;
};

GroupInfo.prototype.onVoidTypeChange = function (v, oldVtype) {
    this.eyeCount += (v.vtype === vEYE ? +1 : (oldVtype === vEYE ? -1 : 0));
    if (v.vtype === oldVtype || this.eyeCount < 0) throw new Error('Unexpected error vtype');
};

// Removes given void from the group
GroupInfo.prototype.removeVoid = function (v) {
    this._removeVoid(v, v.vtype);
    v.owner = undefined;
};

GroupInfo.prototype.takeVoid = function (v, oldVtype) {
    if (v.owner) v.owner._removeVoid(v, oldVtype);
    this._addVoid(v);
};

// GroupInfo.prototype.giveVoidsTo = function (gi) {
//     var v;
//     while ((v = this.voids[0])) {
//         this._removeVoid(v, v.vtype);
//         gi._addVoid(v);
//     }
// };

GroupInfo.prototype.makeDependOn = function (groups) {
    var band = this.band;
    if (band) band.remove(this);
    
    for (var n = groups.length - 1; n >= 0; n--) {
        var gi = groups[n]._info;
        if (gi === this) continue; // this group itself
        if(this.dependsOn.indexOf(gi) >= 0) continue; // already depending on this one

        if (main.debug) main.log.debug('DEPENDS: ' + this + ' depends on ' + gi);
        this.dependsOn.push(gi);
    }
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

/** Returns the (first) single eye of a group (or null if no eye) */
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
 *  If >2 this should mean "alive for good" */
GroupInfo.prototype.liveliness = function (strict, shallow) {
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
    var numEyes = strict ? this.eyeCount : this.voids.length;
    var numDeadEnemies = strict ? this.countEyesFromDeadEnemy() : this.deadEnemies.length;
    return numEyes + numDeadEnemies + familyPoints + racePoints;
};

/** This group "is doomed by" gi if without gi there would be space for 2 eyes.
 * WIP...
3:  OXO   4-2: OXXO   4T: OXO   4x: OX
                           O        XO
                O
5b: OXO    5+: OXO    6c: OXO
    OO          O         OOO
 */
GroupInfo.prototype.isDoomedBy = function (gi) {
    // this group must be surrounding gi, so it simply must have more stones
    var enemySize = gi.group.stones.length;
    if (this.group.stones.length <= enemySize) return false;

    var numVoids = this.nearVoids.length;
    if (numVoids < 2) return false; // TODO: 6c?

    var sharedVoids = [];
    for (var n = numVoids - 1; n >= 0; n--) {
        var v = this.nearVoids[n];
        if (v.isTouching(gi)) sharedVoids.push(v);
    }
    switch (sharedVoids.length) {
    case 2:
        var v0 = sharedVoids[0], v1 = sharedVoids[1];
        if (v0.vcount === 1 && v1.vcount === 1 && 
            (enemySize === 1 || enemySize === 2)) break; // 3 and 4-2; TODO 4x?
        return false;
    case 3:
        if (sharedVoids[0].vcount === 1 && sharedVoids[1].vcount === 1 &&
            sharedVoids[2].vcount === 1 && enemySize === 1) break; // 4T - TODO enemySize=2?
        //TODO: 5b 5+
        return false;
    default: return false;
    }
    gi.isAlive = true;
    return true;
};

// TODO better algo
// We would not need this if we connected as "brothers" 2 of our groups separated by 
// a dead enemy. This is probably a better way to stop counting dead enemies to make up
// for unaccounted eyes. See TestBoardAnalyser#testBigGame2 in h12 for an example.
GroupInfo.prototype.countEyesFromDeadEnemy = function () {
    var numDead = this.deadEnemies.length;
    if (!numDead) return 0;

    var eye = this.getSingleEye();
    if (!eye) return numDead;

    var count = 0;
    for(var n = numDead - 1; n >= 0; n--) {
        if (!eye.isTouching(this.deadEnemies[n])) count++;
    }
    return count;
};

// Result of a check on a group:
var FAILS = -1, LIVES = 1, UNDECIDED = 0;

// This just spots groups with 2 eyes to mark them "alive" (no kill check here)
GroupInfo.prototype.checkDoubleEye = function () {
    if (this.eyeCount + this.deadEnemies.length < 2) return UNDECIDED;
    if (this.eyeCount < 2) {
        if (this.eyeCount + this.countEyesFromDeadEnemy() < 2) return UNDECIDED;
    }
    // Group is alive
    if (main.debug) main.log.debug('ALIVE-doubleEye: ' + this);
    this.isAlive = true;
    return LIVES;
};

// This checks if a group can survive from its parents
GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return UNDECIDED;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var parent = this.dependsOn[n];
        if (parent.isAlive) {
            if (main.debug) main.log.debug('ALIVE-parents: ' + this);
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
    if (main.debug) main.log.debug('ALIVE-brothers: ' + this);
    this.isAlive = true;
    return LIVES;
};

// This checks if a group can make 2 eyes from a single one
GroupInfo.prototype.checkSingleEye = function (first2play) {
    if (this.eyeCount !== 1) return UNDECIDED;
    var eye = this.getSingleEye();
    var coords = [];
    var alive = Shaper.getEyeMakerMove(this.group.goban, eye.i, eye.j, eye.vcount, coords);
    // if it depends which player plays first
    if (alive === 1) {
        if (first2play === undefined) return UNDECIDED; // no idea who wins here
        if (first2play !== this.group.color) {
            alive = 0;
        }
    }
    if (alive === 0) {
        // yet we cannot say it is dead if there are brothers or dead enemies around
        if (this.band || this.dependsOn.length || this.deadEnemies.length) return UNDECIDED;
        this._liveliness = this.liveliness();
        return FAILS;
    }

    this.isAlive = true;
    if (main.debug) main.log.debug('ALIVE-singleEye-' + alive + ': ' + this);
    return LIVES;
};

// This checks if a group has a minimum liveliness.
// We call this several times, raising the bar progressively...
GroupInfo.prototype.checkLiveliness = function (minLife, strict) {
    var life = this.liveliness(strict);
    if (life >= ALIVE || (strict && life >= 2)) {
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


//---

/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.version = BOAN_VERSION;
    this.mode = null;
    this.goban = null;
    this.allVoids = [];
    this.allGroups = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
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
BoardAnalyser.prototype.analyse = function (goban, grid, first2play) {
    var mode = first2play === undefined ? 'MOVE' : 'TERRITORY';
    if (!this._initAnalysis(mode, goban, grid)) return;
    this._runAnalysis(first2play);
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
            var gi = this.allGroups[ndx];
            var numEyes = gi.eyeCount;
            eyes[numEyes >= 2 ? 2 : numEyes].push(gi);
        }
        console.log('\nGroups with 2 eyes or more: ' + eyes[2].map(giNdx));
        console.log('Groups with 1 eye: ' + eyes[1].map(giNdx));
        console.log('Groups with no eye: ' + eyes[0].map(giNdx));
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

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroups[g.ndx];
    if (!gi) {
        if (!g._info || g._info.version !== BOAN_VERSION) {
            g._info = new GroupInfo(g);
        } else {
            g._info.resetAnalysis(g);
        }
        gi = this.allGroups[g.ndx] = g._info;
    }
    gi.nearVoids.push(v);
};

/** Create the list of voids and groups.
 *  The voids know which groups are around them
 *  but the groups do not own any void yet. */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []], n, groups;
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, voidCode, neighbors);
            if (vcount === 0) continue;
            var v = new Void(voidCode++, i, j, vcount, neighbors);
            this.allVoids.push(v);

            // keep all the groups
            groups = neighbors[BLACK];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);
            groups = neighbors[WHITE];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);

            neighbors = [[], []];
        }
    }
};

BoardAnalyser.prototype._runAnalysis = function (first2play) {
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();
    this._lifeOrDeathLoop(first2play);
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroups) {
        this.allGroups[ndx].findBrothers();
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
    // Remove 1 if we have only 1 eye - a single-eye group is not more "resistant"
    if (life > 1 && life < 2) {
        return life - 1;
    }
    return life;
}

function compareLiveliness(life) {
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
            if (v.color !== undefined) continue;
            life[BLACK] = life[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info; // TODO: we could skip brothers to avoid counting twice; no issue noticed - see testUnconnectedBrothers / b4
                    life[color] += gi.liveliness();
                }
            }
            var winner = compareLiveliness(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED EYE in dispute: ' + v);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED EYE: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(2) + ' VS ' + life[1 - winner].toFixed(2));
            v.setVoidOwner(winner, undefined);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

// Review which groups are dead after a "liveliness" check
function killWeakest(check, fails) {
    // For all groups that failed the test, filter out these that have a weaker neighbor
    for (var i = 0; i < fails.length; i++) {
        var fail = fails[i];
        var enemies = fail.group.allEnemies();
        for (var e = 0; e < enemies.length; e++) {
            var enemy = enemies[e]._info;
            var cmp = fail._liveliness - enemy.liveliness();
            if (cmp < 0) {
                if (enemy.isDoomedBy(fail)) {
                    fails[i] = null;
                    break;
                }
            } else {
                if (!fail.isDoomedBy(enemy)) {
                    fails[i] = null;
                    break;
                }
            }
        }
    }
    var count = 0;
    for (i = 0; i < fails.length; i++) {
        if (!fails[i]) continue;
        fails[i].considerDead(check.name + ': liveliness=' + fails[i]._liveliness.toFixed(2));
        count++;
    }
    return count;
}

function killAllFails(check, fails) {
    for (var i = 0; i < fails.length; i++) {
        fails[i].considerDead(check.name);
    }
    return fails.length;
}

var doubleEyeCheck =   { name: 'doubleEye',   run: function (gi) { return gi.checkDoubleEye(); } };
var parentCheck =      { name: 'parents',     run: function (gi) { return gi.checkParents(); } };
var brotherCheck =     { name: 'brothers',    run: function (gi) { return gi.checkBrothers(); } };
var singleEyeCheck = {
    name: 'singleEye',   
    run: function (gi, first) { return gi.checkSingleEye(first); },
    kill: killWeakest
};
var liveliness1Check = { name: 'liveliness1',
    run: function (gi) { return gi.checkLiveliness(1); },
    kill: killWeakest
};
var liveliness2Check = { name: 'liveliness2',
    run: function (gi) { return gi.checkLiveliness(2); },
    kill: killWeakest
};
var finalCheck = { name: 'final', run: function (gi) { return gi.checkLiveliness(2, true); } };

var midGameLifeChecks = [
    parentCheck,
    brotherCheck,
    liveliness1Check,
    singleEyeCheck,
    doubleEyeCheck
    // We don't expect a final liveliness (2) in mid-game
];
var scoringLifeChecks = [
    parentCheck,
    brotherCheck,
    liveliness1Check,
    singleEyeCheck,
    liveliness2Check,
    doubleEyeCheck,
    finalCheck
];

// NB: order of group should not matter; we must remember this especially when killing some of them
BoardAnalyser.prototype._reviewGroups = function (check, first2play) {
    if (main.debug) main.log.debug('---REVIEWING groups for "' + check.name + '" checks');
    var count = 0, reviewedCount = 0, fails = [];
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[ndx];
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;

        switch (check.run(gi, first2play)) {
        case FAILS:
            fails.push(gi);
            break;
        case LIVES:
            count++;
            break;
        }
    }
    if (fails.length) {
        // if no dedicated method is given, simply kill them all
        count += check.kill ? check.kill(check, fails) : killAllFails(check, fails);
    }
    if (main.debug && count) main.log.debug('==> "' + check.name + '" checks found ' +
        count + '/' + reviewedCount + ' groups alive/dead');
    if (count === reviewedCount) return 0; // really finished
    if (count === 0) return reviewedCount; // remaining count
    return -count; // processed count
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first2play) {
    var checks = this.mode === 'SCORE' ? scoringLifeChecks : midGameLifeChecks;
    var stepNum = 0, count;
    while (stepNum < checks.length) {
        count = this._reviewGroups(checks[stepNum++], first2play);
        if (count === 0) {
            this._findEyeOwners();
            return;
        }
        if (count < 0) {
            // we found dead/alive groups => rerun all the checks from start
            stepNum = 0;
            this._findEyeOwners();
            continue;
        }
    }
    if (main.debug && count > 0) main.log.debug('*** UNDECIDED groups after _lifeOrDeathLoop:' + count);
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
        if (v.color !== undefined && v.vtype !== vFAKE_EYE) {
            this.scores[v.color] += v.vcount;
            color = Grid.TERRITORY_COLOR + v.color;
        } else {
            color = Grid.DAME_COLOR;
        }
        this.filler.fillWithColor(v.i, v.j, v.code, color);
    }
};

BoardAnalyser.prototype._colorDeadGroups = function () {
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[ndx];
        if (!gi.isDead) continue;
        var color = gi.group.color;
        var stone = gi.group.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

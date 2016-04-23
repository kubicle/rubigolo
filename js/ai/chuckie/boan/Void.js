'use strict';

var CONST = require('../../../constants');
var FakeSpot = require('./FakeSpot');
var Grid = require('../../../Grid');
var log = require('../../../log');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;

var vEYE = 1, vFAKE = 2, vDAME = 3;
var VTYPES = ['void', 'eye', 'fake', 'dame'];


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(goban, code) {
    this.goban = goban;
    this.code = code;
    this.i = this.j = 0;
    this.vcount = 0;
    this.groups = null; // neighboring groups (array of arrays; 1st index is color)
    this.vertexes = null;
    this.vtype = undefined; // see vXXX contants below
    this.color = undefined; // BLACK or WHITE, or undefined if no clear owner
    this.owner = undefined; // GroupInfo or undefined; NB: fake eyes don't have owner
    this.isInDeadGroup = false; // true when all groups around an eye are dead (e.g. one-eyed dead group)
    this.hasFakeSpots = false;
    this.realCount = -1;
    this.fakeSpots = null;
    this.isSingleColor = false;
}
module.exports = Void;

/** @return {array[]} - groups[BLACK] & groups[WHITE] to receive groups around zone */
Void.prototype.prepare = function (i, j) {
    this.i = i;
    this.j = j;
    this.fakeSpots = [];
    this.groups = [[], []];
    this.vertexes = [];
    return this.groups;
};

Void.prototype.addVertex = function (i, j) {
    this.vcount++;
    this.vertexes.push(this.goban.stoneAt(i, j));
};

function vtype2str(vtype) {
    return vtype ? VTYPES[vtype] : VTYPES[0];
}

function areGroupsAllDead(groups) {
    for (var i = groups.length - 1; i >= 0; i--) {
        if (!groups[i]._info.isDead) return false;
    }
    return true;
}

Void.prototype.getFakeSpot = function (stone, groups) {
    if (log.debug) log.debug('FAKE SPOT in ' + this + ' at ' + stone + ' for ' + groups.map(function (g) { return g.ndx; }));
    this.hasFakeSpots = true;
    var index = this.vertexes.indexOf(stone);
    var fakeSpot = this.fakeSpots[index];
    if (!fakeSpot) fakeSpot = this.fakeSpots[index] = new FakeSpot(stone, groups);
    else fakeSpot.addGroups(groups);
    return fakeSpot;
};

Void.prototype.findOwner = function () {
    var blackGroups = this.groups[BLACK], whiteGroups = this.groups[WHITE];
    // see which color has yet-alive groups around this void
    var allBlackDead = areGroupsAllDead(blackGroups);
    var allWhiteDead = areGroupsAllDead(whiteGroups);

    // every group around now dead = eye belongs to the killers
    if (allBlackDead && allWhiteDead) {
        if (this.isInDeadGroup || this.color === undefined) return false;
        return this._setAsDeadGroupEye();
    }
    if (this.vtype === vEYE) return false; // eyes don't change owner unless in a dead group
    if (!allBlackDead && !allWhiteDead) return false; // still undefined owner

    var color = allBlackDead ? WHITE : BLACK;
    this.isSingleColor = !blackGroups.length || !whiteGroups.length;

    if (this.hasFakeSpots) return this._initFakeEye(color);

    this.realCount = this.vcount;
    return this._setOwner(color);
};

Void.prototype._initFakeEye = function (color) {
    this.vtype = vFAKE;
    this.color = color;

    if (this.owner) {
        this.owner.removeVoid(this); this.owner = null;
    }

    for (var n = this.fakeSpots.length - 1; n >= 0; n--) {
        var fakeSpot = this.fakeSpots[n];
        if (fakeSpot) fakeSpot.mustBePlayed = false;
    }
    return true;
};

Void.prototype.checkFakeEye = function () {
    if (this.vtype !== vFAKE) return false;

    var prevCount = this.realCount;
    var realCount = this.realCount = this.vcount - this._getMustPlayStones();
    if (log.debug) log.debug('Real vcount: ' + realCount + ' for ' + this);

    return realCount !== prevCount;
};

Void.prototype._getMustPlayStones = function (stones) {
    if (!stones) stones = [];

    for (var n = this.fakeSpots.length - 1; n >= 0; n--) {
        var fakeSpot = this.fakeSpots[n];
        if (!fakeSpot || fakeSpot.color !== this.color) continue;
        var groups = fakeSpot.groups;
        for (var i = groups.length - 1; i >= 0; i--) {
            if (groups[i]._info.needsBrothers()) {
                if (log.debug && !fakeSpot.mustBePlayed) log.debug('Must be played: ' + fakeSpot.stone);
                fakeSpot.mustBePlayed = true;
                stones.push(fakeSpot.stone);
                break;
            }
        }    
    }
    return stones.length;
};

Void.prototype.finalizeFakeEye = function () {
    if (this.vtype !== vFAKE) return;

    if (this.realCount === 0) {
        if (this.owner) throw new Error('NEVER HAPPENS');
        if (log.debug) log.debug('FAKE EYE remains fake: ' + this);
        return;
    }

    if (log.debug) log.debug('FAKE SPOTS disregarded for: ' + this);
    var color = this.color;
    this.color = this.vtype = undefined;
    return this._setOwner(color);
};

Void.prototype._setOwner = function (color) {
    if (this.isSingleColor) {
        return this._setAsEye(color);
    } else {
        return this.setVoidOwner(color);
    }
};

Void.prototype._setAsEye = function (color) {
    if (log.debug) log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.color = color;
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
    return true;
};

/** Sets the "stronger color" that will probably own a void - vtype == undefined */
Void.prototype.setVoidOwner = function (color) {
    if (color === this.color) return false;
    if (log.debug) log.debug('VOID: ' + Grid.colorName(color) + ' owns ' + this);

    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.color = color;
 
    // Given void can be seen as an eye if no other eye is around its "dead" enemies
    // i.e. no dead enemy ever "connects" 2 eyes (this would be a single eye)
    var enemies = this.groups[1 - color];
    for (var e = enemies.length - 1; e >= 0; e--) {
        var evoids = enemies[e]._info.nearVoids;
        for (var n = evoids.length - 1; n >= 0; n--) {
            if (evoids[n] === this) continue;
            if (evoids[n].color === color) return true;
        }
    }
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
    return true;
};

// Called during final steps for voids that have both B&W groups alive close-by
Void.prototype.setAsDame = function () {
    if (log.debug) log.debug('DAME: ' + this);
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vDAME;
    this.color = undefined;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype._setAsDeadGroupEye = function () {
    if (log.debug) log.debug('EYE-IN-DEAD-GROUP: ' + this);
    var color = this.color;
    if (color === undefined) throw new Error('dead group\'s eye of undefined owner');

    this.isInDeadGroup = true;
    this.hasFakeSpots = false; // fakes become regular space if the group is dead
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.color = 1 - color;

    // give it to any of the killers
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.killers.length) {
            this.owner = gi.killers[0]._info.addVoid(this);
            return true;
        }
    }
    // Found no killer; happens for eye inside dead group lost inside enemy zone.
    // We should leave the eye inside its possibly dead group. See TestBoardAnalyser#testDoomedGivesEye2
    return true;
};

Void.prototype.getScore = function (fakes) {
    if (this.color === undefined) return 0;
    if (fakes) {
        fakes.length = 0;
        if (this.hasFakeSpots) this._getMustPlayStones(fakes);
    }
    return this.vcount;
};

Void.prototype.isTouching = function (gi) {
    var g = gi.group;
    return this.groups[g.color].indexOf(g) > -1;
};

function grpNdx(g) { return '#' + g.ndx; }

Void.prototype.toString = function () {
    return '{' + vtype2str(this.vtype) + '-' + Grid.xy2move(this.i, this.j) + ' vcount:' + this.vcount +
        ' black:' + (this.groups[BLACK].map(grpNdx).toString() || '-') +
        ' white:' + (this.groups[WHITE].map(grpNdx).toString() || '-') + '}';
};

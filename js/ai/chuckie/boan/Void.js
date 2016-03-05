'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;

var vEYE = 1, vDAME = 2;
var VTYPES = ['void', 'eye', 'dame'];


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
}
module.exports = Void;

/** @return {array[]} - groups[BLACK] & groups[WHITE] to receive groups around zone */
Void.prototype.prepare = function (i, j) {
    this.i = i;
    this.j = j;
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

Void.prototype.findOwner = function () {
    var blackGroups = this.groups[BLACK], whiteGroups = this.groups[WHITE];
    // see which color has yet-alive groups around this void
    var allBlackDead = areGroupsAllDead(blackGroups);
    var allWhiteDead = areGroupsAllDead(whiteGroups);

    // every group around now dead = eye belongs to the killers
    if (allBlackDead && allWhiteDead) {
        if (this.vtype && !this.isInDeadGroup) this.setAsDeadGroupEye();
        return;
    }
    if (this.vtype === vEYE) return; // eyes don't change owner unless in a dead group
    if (!allBlackDead && !allWhiteDead) return; // still undefined owner

    var color = allBlackDead ? WHITE : BLACK;

    if (this.isFakeEye(color)) return;

    if (!blackGroups.length || !whiteGroups.length) {
        return this.setAsEye(color);
    }

    this.setVoidOwner(color);
};

// NB: groups around a fake-eye do not count it as an eye/void
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
        if (gi.numContactPoints === 1 && !gi.deadEnemies.length && gi.voids.length === 0) {
            if (main.debug && !isFake) main.log.debug('FAKE EYE: ' + this);
            isFake = true;
            gi.makeDependOn(groups);
        }
    }
    if (!isFake) return false;
    if (this.vtype === undefined) {
        if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
        this.vtype = vFAKE_EYE;
        this.color = color;
    }
    return true;
};

Void.prototype.setAsEye = function (color) {
    if (main.debug) main.log.debug('EYE: ' + Grid.colorName(color) + ' owns ' + this);
    this.vtype = vEYE;
    this.color = color;
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
};

/** Sets the "stronger color" that will probably own a void - vtype == undefined */
Void.prototype.setVoidOwner = function (color) {
    if (color === this.color) return;
    if (main.debug) main.log.debug('VOID: ' + Grid.colorName(color) + ' owns ' + this);

    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.color = color;
 
    // Given void can be seen as an eye if no other eye is around its "dead" enemies
    // i.e. no dead enemy ever "connects" 2 eyes (this would be a single eye)
    var enemies = this.groups[1 - color];
    for (var e = enemies.length - 1; e >= 0; e--) {
        var evoids = enemies[e]._info.nearVoids;
        for (var n = evoids.length - 1; n >= 0; n--) {
            if (evoids[n] === this) continue;
            if (evoids[n].color === color) return;
        }
    }
    // ONE of the groups now owns this void
    var groups = this.groups[color];
    this.owner = groups[0]._info.addVoid(this, groups);
};

// Called during final steps for voids that have both B&W groups alive close-by
Void.prototype.setAsDame = function () {
    if (main.debug) main.log.debug('DAME: ' + this);
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vDAME;
    this.color = undefined;
};

// Called for eyes or fake eyes when their owner group is captured
Void.prototype.setAsDeadGroupEye = function () {
    if (main.debug) main.log.debug('EYE-IN-DEAD-GROUP: ' + this);
    var color = this.color;
    if (color === undefined) throw new Error('dead group\'s eye of undefined owner');

    this.isInDeadGroup = true;
    if (this.owner) { this.owner.removeVoid(this); this.owner = null; }
    this.vtype = vEYE; // it could have been a fake eye but now it is an eye
    this.color = 1 - color;

    // give it to any of the killers
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        var gi = groups[i]._info;
        if (gi.killers.length) {
            this.owner = gi.killers[0]._info.addVoid(this);
            return;
        }
    }
    // Found no killer; happens for eye inside dead group lost inside enemy zone.
    // We should leave the eye inside its possibly dead group. See TestBoardAnalyser#testDoomedGivesEye2
};

Void.prototype.finalScore = function () {
    if (this.color === undefined || this.vtype === vFAKE_EYE) {
        return 0;
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

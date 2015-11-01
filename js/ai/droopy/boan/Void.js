'use strict';

var main = require('../../../main');
var Band = require('./Band');
var Grid = require('../../../Grid');

var BLACK = main.BLACK, WHITE = main.WHITE;


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

var vEYE = Void.vEYE = 1;
var vFAKE_EYE = Void.vFAKE_EYE = 2;
var vDAME = Void.vDAME = 3;


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
    if (groups.length > 1) Band.gather(groups); // TODO: should be GroupInfo's responsibility

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

Void.prototype.toString = function () {
    var s = vtype2str(this.vtype) + ' ' + this.code + '-' + Grid.colorToChar(this.code) + ' (' + Grid.xy2move(this.i, this.j) + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.colorName(color) + ' neighbors';
    }
    return s;
};

function grpNdx(g) { return '#' + g.ndx; }

Void.prototype.debugDump = function () {
    console.log(this.toString());
    for (var color = 0; color < this.groups.length; color++) {
        console.log('    Color ' + color + ' (' + Grid.colorToChar(color) + '): ' +
            this.groups[color].map(grpNdx));
    }
};

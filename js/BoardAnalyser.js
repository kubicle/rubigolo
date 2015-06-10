//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
var ZoneFiller = require('./ZoneFiller');
var Shaper = require('./ai/Shaper');


var BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = 1000;


/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(analyser, code, i, j, vcount, neighbors) {
    this.analyzer = analyser; //TODO remove this if not used
    this.goban = analyser.goban; //TODO remove this if not used
    this.code = code;
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.vtype = undefined; // see vXXX contants below
    this.owner = undefined; // BLACK or WHITE, or undefined if no clear owner
}
module.exports = Void;

var vEYE = 4, vFAKE_EYE = 3, vBATTLED = 2, vDAME = 1;

Void.prototype.changeType = function (vtype) {
    var oldType = this.vtype;
    this.vtype = vtype;

    if (this.owner === undefined) return; // did not have owner, nothing more to do
    var groups = this.groups[this.owner];
    if (this.vtype === vDAME) {
        if (main.debug) main.log.debug(this + ' is now considered neutral ("dame")');
        this.owner = undefined;
    }

    for (var i = groups.length - 1; i >= 0; i--) {
        groups[i]._info.onVoidTypeChange(this, oldType);
    }
};

Void.prototype.setOwner = function (vtype, color) {
    this.vtype = vtype;
    this.owner = color;

    // Now tell the groups about this void
    var groups = this.groups[color];
    for (var i = groups.length - 1; i >= 0; i--) {
        groups[i]._info.addVoid(this);
    }
    if (main.debug) {
        switch (vtype) {
        case vEYE: main.log.debug('Color ' + Grid.colorName(color) + ' surrounds ' + this + ' (=> eye)'); break;
        case vFAKE_EYE: main.log.debug(this + ' identified as fake eye'); break;
        case vBATTLED: main.log.debug(this + ' seems to be owned by ' + Grid.colorName(color)); break;
        default: throw new Error('Void#setOwner: invalid void type: ' + vtype);
        }
    }
};

Void.prototype.getSingleOwner = function () {
    var owner = this.owner;
    if (owner === undefined) return null;
    var groups = this.groups[owner];
    if (groups.length > 1) return null;
    return groups[0];
};

Void.prototype.toString = function () {
    var s = 'void ' + this.code + '-' + Grid.colorToChar(this.code) + ' (' + Grid.moveAsString(this.i, this.j) + '), vcount ' + this.vcount;
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

//---

/** @class Contains the analyse results that are attached to each group */
function GroupInfo(group) {
    this.group = group;
    this.eyeCount = 0;
    this.voids = []; // empty zones next to a group
    this.dependsOn = [];
    this.brothers = []; // groups with which this group shares eyes
//    this.extraLives = 0; // lives granted by dying enemy nearby
}

GroupInfo.prototype.toString = function () {
    return this.group.toString();
};

// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function (group) {
    this.group = group;
    this.eyeCount = 0;
    this.voids.clear();
    this.dependsOn.clear();
    this.brothers.clear();
    this.isAlive = false;
    this.isDead = false;
//    this.extraLives = 0;
};

// Adds a void or an eye to an owner-group
GroupInfo.prototype.addVoid = function (v) {
    this.voids.push(v);
    if (v.vtype === vEYE) {
        this.eyeCount++;
    }
};

GroupInfo.prototype.onVoidTypeChange = function (v, oldType) {
    if (oldType === vEYE) {
        this.eyeCount--;
    }
    if (v.vtype === vDAME) {
        this._removeVoid(v);
    }
};

GroupInfo.prototype._removeVoid = function (v) {
    this.voids.splice(this.voids.indexOf(v), 1);
};

GroupInfo.prototype.addParentGroup = function (gi) {
    if (main.debug) main.log.debug(this + ' depends on ' + gi);
    this.dependsOn.push(gi);
};

GroupInfo.prototype.addBrotherGroup = function (gi) {
    if (main.debug) main.log.debug(this + ' is brother of ' + gi);
    this.brothers.push(gi);
    gi.brothers.push(this);
};

/** Returns the (first) single eye (fully owned) of a group */
GroupInfo.prototype.getSingleEye = function () {
    for (var i = this.voids.length - 1; i >= 0; i--) {
        var eye = this.voids[i];
        if (eye.vtype === vEYE && eye.getSingleOwner()) return eye;
    }
    return null;
};

/** Returns a number telling how "alive" a group is. TODO: review this
 *  Really basic logic for now.
 *  - eyes and owned voids count for 1 point each
 *  - non-owned voids (undetermined owner or enemy-owned void) count for 0
 *  NB: for end-game counting, this logic is enough because undetermined situations
 *  have usually all been resolved (or this means both players cannot see it...) */
GroupInfo.prototype.liveliness = function () {
    if (this.isAlive) return ALIVE;
    if (this.isDead) return 0;

    if (this.eyeCount >= 2) {
        this.isAlive = true;
        return ALIVE;
    }
    if (this.voids.length === 0) {
        this.isDead = true;
        return 0;
    }

    //TODO see fake eyes etc
    // var count = 0;
    // for (var i = this.voids.length - 1; i >= 0; i--) {
    //     if (this.voids[i].xxx) count++;
    // }
    return this.voids.length;
};

GroupInfo.prototype.checkDoubleEye = function () {
    return false; //TODO
};

GroupInfo.prototype.checkSingleEye = function () {
    if (this.eyeCount !== 1) return false;
    var eye = this.getSingleEye();
    if (!eye) return false;
    var coords = [];
    if (Shaper.getEyeMakerMove(this.group.goban, eye.i, eye.j, eye.vcount, coords) === 0) return false;
    this.isAlive = true;
    return true;
};

GroupInfo.prototype.checkParents = function () {
    if (!this.dependsOn.length) return false;
    var allAreDead = true;
    for (var n = this.dependsOn.length - 1; n >= 0; n--) {
        var neighbor = this.dependsOn[n];
        if (neighbor.isAlive) {
            this.isAlive = true;
            return true;
        }
        if (!neighbor.isDead) allAreDead = false;
    }
    if (!allAreDead) return false;
    this.isDead = true;
    return true;
};

GroupInfo.prototype.checkBrothers = function () {
    if (!this.brothers.length) return false;
    var numEyes = 1, oneIsAlive = false;
    for (var n = this.brothers.length - 1; n >= 0; n--) {
        var neighbor = this.brothers[n];
        if (oneIsAlive || neighbor.isAlive) {
            oneIsAlive = neighbor.isAlive = true;
        } else {
            numEyes += neighbor.eyeCount - 1;
            if (numEyes >= 2) {
                oneIsAlive = neighbor.isAlive = true;
            }
        }
    }
    if (!oneIsAlive) return false;
    this.isAlive = true;
    return true;
};


//---

/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.goban = null;
    this.allVoids = [];
}
module.exports = BoardAnalyser;

/** Calling this method updates the goban to show the detected result.
 *  If grid is not given a new one will be created from goban */
BoardAnalyser.prototype.countScore = function (goban, grid) {
    if (main.debug) main.log.debug('Counting score...');
    this.goban = goban;
    this.scores = [0, 0];
    this.prisoners = Group.countPrisoners(this.goban);
    this.filler = new ZoneFiller(this.goban, grid);

    this.findVoids();
    this.findEyes();
    this.findFakeEyes();
    this.findStrongerOwners();
    this.findDyingGroups();
    this.findDameVoids();
    this.colorVoids();

    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        if (v.owner !== undefined) {
            this.scores[v.owner] += v.vcount;
        }
    }
    if (main.debug) this.debugDump();
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

//---private

BoardAnalyser.prototype.addGroup = function (g) {
    if (!g._info) {
        g._info = new GroupInfo(g);
    } else {
        g._info.resetAnalysis(g);
    }
    this.allGroups[g.ndx] = g;
};

BoardAnalyser.prototype.findVoids = function () {
    if (main.debug) main.log.debug('Find voids...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount;
            if ((vcount = this.filler.fillWithColor(i, j, main.EMPTY, voidCode, neighbors)) > 0) {
                this.allVoids.push(new Void(this, voidCode, i, j, vcount, neighbors));
                voidCode += 1;
                // keep all the groups
                for (var n, n_array = neighbors, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
                    for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                        this.addGroup(g);
                    }
                }
                neighbors = [[], []];
            }
        }
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype.findEyes = function () {
    for (var n = this.allVoids.length - 1; n >= 0; n--) {
        var v = this.allVoids[n];

        var hasBlack = v.groups[BLACK].length > 0;
        var hasWhite = v.groups[WHITE].length > 0;

        if (hasBlack) {
            if (!hasWhite) v.setOwner(vEYE, BLACK);
        } else if (hasWhite) {
            v.setOwner(vEYE, WHITE);
        }
    }
};

BoardAnalyser.prototype.findFakeEyes = function () {
    var foundSomeFakeEyes = true;
    while (foundSomeFakeEyes) {
        foundSomeFakeEyes = false;
        for (var ndx in this.allGroups) {
            var g = this.allGroups[ndx], gi = g._info;
            if (gi.voids.length !== 1) continue;
            var eye = gi.voids[0];
            var sharedWithGroups = eye.groups[g.color];
            if (sharedWithGroups.length === 1) continue; // not shared
            var isFake = (eye.vtype === vEYE && eye.vcount === 1); // REVIEW: always OK for vcount >= 2 ?
            if (isFake) {
                foundSomeFakeEyes = true;
                eye.changeType(vFAKE_EYE);
            }
            if (main.debug) main.log.debug(eye + ' is a ' + (isFake? 'fake' : 'shared') + ' eye');
            for (var i = sharedWithGroups.length - 1; i >= 0; i--) {
                var neighbor = sharedWithGroups[i]._info;
                if (neighbor === gi) continue;
                if (isFake) {
                    gi.addParentGroup(neighbor);
                } else {
                    gi.addBrotherGroup(neighbor);
                }
            }
        }
    }
};

// Decides who owns a void by comparing the "liveness" of each side
BoardAnalyser.prototype.findStrongerOwners = function () {
    var lives = [0, 0];
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.owner !== undefined) continue;

        lives[BLACK] = lives[WHITE] = 0;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                lives[c] += (g._info.isAlive ? ALIVE : g.lives);
            }
        }
        // make sure we have a winner, not a tie
        if (lives[BLACK] === lives[WHITE]) continue;
        if (lives[BLACK] >= ALIVE && lives[WHITE] >= ALIVE) continue;
        var winner = lives[BLACK] > lives[WHITE] ? BLACK : WHITE;
        v.setOwner(vBATTLED, winner);
        if (main.debug) main.log.debug('It looks like color ' + Grid.colorName(winner) + ', with ' +
            Math.max(lives[BLACK], lives[WHITE]) + ' lives, owns ' + v +
            ' (this might change once we identify dead groups)');
    }
};

BoardAnalyser.prototype.countGroupAsDead = function (g) {
    var gi = g._info;
    gi.isDead = true;

    var color = g.color;
    var stones = g.stones;
    var stone = stones[0];
    var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
    this.prisoners[color] += taken;
    this.scores[1 - color] += taken;

    // for (var n = stones.length - 1; n >= 0; n--) {
    //     var enemies = stones[n].uniqueEnemies(color);
    //     for (var m = enemies.length - 1; m >= 0; m--) {
    //         enemies[m]._info.extraLives++; // TODO: decide if we keep extraLives
    //     }
    // }
    if (main.debug) main.log.debug('Hence ' + g + ' is considered dead (' +
        taken + ' prisoners; 1st stone ' + stone + ' eyes:' + gi.eyeCount + ')');
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype.findDyingGroups = function () {
    var foundDeathOrLife = true;
    while (foundDeathOrLife) {
        foundDeathOrLife = false;
        for (var ndx in this.allGroups) {
            var g = this.allGroups[ndx], gi = g._info;
            if (gi.isAlive || gi.isDead) continue;

            gi.checkDoubleEye() ||
            gi.checkSingleEye() ||
            gi.checkParents() ||
            gi.checkBrothers() ||
            gi.liveliness();

            if (gi.isDead) {
                this.countGroupAsDead(g);
                foundDeathOrLife = true;
            } else if (gi.isDead) {
                foundDeathOrLife = true;
            }
        }            
    }
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype.findDameVoids = function () {
    var aliveColors = [];
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.vtype >= vFAKE_EYE) continue;

        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (g._info.liveliness() >= 1) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.changeType(vDAME);
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype.colorVoids = function () {
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        var c = v.owner !== undefined ? Grid.TERRITORY_COLOR + v.owner : Grid.DAME_COLOR;
        this.filler.fillWithColor(v.i, v.j, v.code, c);
    }
};

// if (gi.eyeCount === 1 && gi.eyes[0].vcount + gi.extraLives >= 3) { // actually not enough if gote but well...
//     continue;
// }
// var color = g.color;
// we need to look at voids around (fake eyes, etc.)
// var ownedVoids = 0, vcount = 0;
// var myVoid = null;
// var oneOwner = false;
// for (var v, v_array = gi.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
//     if (v.owner !== null) {
//         oneOwner = true;
//         if (v.owner === color) {
//             myVoid = v;
//             ownedVoids += 1;
//             vcount += v.vcount;
//         }
//     }
// }
// if (ownedVoids >= 2) { // TODO later: here is the horror we read about on the web
//     continue;
// }
// if (ownedVoids === 1 && myVoid.groups[color].length > 1) { // TODO: check also lives of ally
//     continue;
// }
// find if the only void around is owned (e.g. lost stones inside big territory)
// if we don't know who owns the voids around g, leave g as alive (unfinished game)
// if (gi.voids.length !== 0 && !oneOwner) {
//     continue;
// }
// g is dead!
// this.countGroupAsDead(g);

//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
//require 'set';
var Goban = require('./Goban');
var ZoneFiller = require('./ZoneFiller');

/** @class Class used by BoardAnalyser class.
 *  A void in an empty zone surrounded by (and including) various groups.
 *  NB: when a void has a single color around; we call this an eye. Can be discussed...
 *  public read-only attribute: code, i, j, vcount, groups, eyeColor, owner
 *  code is the void code (like a color but higher index)
 *  neighbors is an array of n arrays, with n == number of colors
 */
function Void(analyser, code, i, j, vcount, neighbors) {
    this.analyzer = analyser;
    this.goban = analyser.goban;
    this.code = code;
    this.i = i;
    this.j = j;
    this.vcount = vcount;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.eyeColor = null; // stays nil if not an eye
    this.owner = null;
}
module.exports = Void;

// Call it once. Populates @eye_color
// @eye_color stays nil if there is more than 1 color around (not an eye) or full board empty
Void.prototype.eyeCheck = function () {
    var oneColor = null;
    for (var c = 1; c <= this.groups.length; c++) {
        // is there 1 or more groups of this color?
        if (this.groups[c].length >= 1) {
            if (oneColor) { // we already had groups in another color
                oneColor = null;
                break;
            }
            oneColor = c;
        }
    }
    this.eyeColor = oneColor;
    // Now tell the groups about this void
    if (oneColor) {
        this.setOwner(oneColor);
        for (var n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.addVoid(this, true);
            }
        }
        if (main.debug) {
            return main.log.debug('Color ' + oneColor + ' surrounds ' + this + ' (eye)');
        }
    } else {
        for (n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.addVoid(this);
            }
        }
        if (main.debug) {
            return main.log.debug(this + ' has to be sorted out...');
        }
    }
};

Void.prototype.setOwner = function (color) {
    this.owner = color;
};

Void.prototype.toString = function () {
    var s = 'void ' + this.code + ' (' + Grid.colorToChar(this.code) + '/' + this.i + ',' + this.j + '), vcount ' + this.vcount;
    for (var color = 1; color <= this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.COLOR_NAMES[color] + ' neighbors';
    }
    return s;
};

Void.prototype.debugDump = function () {
    console.log(this.toString());
    for (var color = 1; color <= this.groups.length; color++) {
        console.log('    Color ' + color + ' (' + Grid.colorToChar(color) + '):');
        for (var neighbor, neighbor_array = this.groups[color], neighbor_ndx = 0; neighbor=neighbor_array[neighbor_ndx], neighbor_ndx < neighbor_array.length; neighbor_ndx++) {
            console.log(' #' + neighbor.ndx);
        }
    }
    console.log('\n');
};


/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.goban = null;
    this.voids = [];
    this.allGroups = new main.Set();
}
module.exports = BoardAnalyser;

// Calling this method updates the goban to show the detected result.
BoardAnalyser.prototype.countScore = function (goban, grid) {
    if (grid === undefined) grid = null;
    if (main.debug) {
        main.log.debug('Counting score...');
    }
    this.goban = goban;
    this.scores = [0, 0];
    this.prisoners = Group.prisoners(this.goban);
    this.filler = new ZoneFiller(this.goban, grid);
    this.findVoids();
    this.findEyes();
    this.findStrongerOwners();
    this.findDyingGroups();
    this.findDameVoids();
    this.colorVoids();
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.owner) {
            this.scores[v.owner] += v.vcount;
        }
    }
    if (main.debug) {
        return this.debugDump();
    }
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    console.log(this.filler.grid.toText(function (c) {
        return Grid.colorToChar(c);
    }));
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.debugDump();
    }
    if (this.scores) {
        console.log('\nGroups with 2 eyes or more: ');
        for (var g, g_array = this.allGroups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.length >= 2) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nGroups with 1 eye: ');
        for (g, g_array = this.allGroups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.length === 1) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nGroups with no eye: ');
        for (g, g_array = this.allGroups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.length === 0) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nScore:\n');
        for (var i = 1; i <= this.scores.length; i++) {
            console.log('Player ' + i + ': ' + this.scores[i] + ' points');
        }
    }
};

//private;
BoardAnalyser.prototype.findVoids = function () {
    if (main.debug) {
        main.log.debug('Find voids...');
    }
    var voidCode = Grid.ZONE_CODE;
    for (var g, g_array = this.allGroups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.resetAnalysis();
    }
    this.allGroups.clear();
    this.voids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount;
            if ((vcount = this.filler.fillWithColor(i, j, main.EMPTY, voidCode, neighbors)) > 0) {
                this.voids.push(new Void(this, voidCode, i, j, vcount, neighbors));
                voidCode += 1;
                // keep all the groups
                for (var n, n_array = neighbors, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
                    for (g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                        this.allGroups.add(g);
                    }
                }
                neighbors = [[], []];
            }
        }
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype.findEyes = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.eyeCheck();
    }
};

// Decides who owns a void by comparing the "liveness" of each side
BoardAnalyser.prototype.findStrongerOwners = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor) {
            continue;
        }
        var lives = [0, 0];
        for (var c = 1; c <= 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                lives[c] += g.lives;
            }
        }
        var moreLives = Math.max.apply(Math, lives);
        if (lives.count(function (l) {
            return l === moreLives;
        }) === 1) { // make sure we have a winner, not a tie
            c = lives.findIndex(moreLives);
            v.setOwner(c);
            if (main.debug) {
                main.log.debug('It looks like color ' + c + ', with ' + moreLives + ' lives, owns ' + v + ' (this might change once we identify dead groups)');
            }
        }
    }
};

// Reviews the groups and declare "dead" the ones who do not own any void
BoardAnalyser.prototype.findDyingGroups = function () {
    var ownedVoids, vcount, oneOwner, myVoid;
    for (var g, g_array = this.allGroups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.eyes.length >= 2) {
            continue;
        }
        if (g.eyes.length === 1 && g.eyes[0].vcount + g.extraLives >= 3) { // actually not enough if gote but well...
            continue;
        }
        var color = g.color;
        if (g.eyes.length === 1 && g.eyes[0].groups[color].length > 1) { // connected by eye
            continue;
        }
        // we need to look at voids around (fake eyes, etc.)
        ownedVoids = vcount = 0;
        oneOwner = myVoid = null;
        for (var v, v_array = g.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
            if (v.owner) {
                oneOwner = v.owner;
                if (v.owner === color) {
                    myVoid = v;
                    ownedVoids += 1;
                    vcount += v.vcount;
                }
            }
        }
        if (g.eyes.length === 1 && ownedVoids >= 1) { // TODO: this is too lenient
            continue;
        }
        if (ownedVoids >= 2) { // TODO later: here is the horror we read about on the web
            continue;
        }
        if (ownedVoids === 1 && vcount + g.extraLives >= 3) {
            continue;
        }
        if (ownedVoids === 1 && myVoid.groups[color].length > 1) { // TODO: check also lives of ally
            continue;
        }
        // find if the only void around is owned (e.g. lost stones inside big territory)
        // if we don't know who owns the voids around g, leave g as alive (unfinished game)
        if (g.voids.length !== 0 && !oneOwner) {
            continue;
        }
        // g is dead!
        var stone = g.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
        g.countAsDead();
        if (main.debug) {
            main.log.debug('Hence ' + g + ' is considered dead (' + taken + ' prisoners; 1st stone ' + stone + ')');
        }
        if (main.debug) {
            main.log.debug('eyes:' + g.eyes.length + ' owned_voids:' + ownedVoids + ' vcount-voids:' + vcount);
        }
    }
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype.findDameVoids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor) {
            continue;
        }
        var aliveColors = [];
        for (var c = 1; c <= 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (this.groupLiveliness(g) >= 1) {
                    aliveColors.push(c);
                    break;
                }
            }
        }
        if (aliveColors.length >= 2) {
            v.setOwner(null);
            if (main.debug) {
                main.log.debug('Void ' + v + ' is considered neutral ("dame")');
            }
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype.colorVoids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        var c = (( v.owner ? Grid.TERRITORY_COLOR + v.owner : Grid.DAME_COLOR ));
        this.filler.fillWithColor(v.i, v.j, v.code, c);
    }
};

// Returns a number telling how "alive" a group is. TODO: review this
// Really basic logic for now.
// (instead we should determine if the shape of a single eye is right to make 2 eyes)
// - eyes and owned voids count for 1 point each
// - non-owned voids (undetermined owner or enemy-owned void) count for 0
// NB: for end-game counting, this logic is enough because undetermined situations
// have usually all been resolved (or this means both players cannot see it...)
BoardAnalyser.prototype.groupLiveliness = function (g) {
    return g.eyes.length + g.voids.count(function (z) {
        return z.owner === g.color;
    });
};

// W02: Unknown class supposed to be attached to main: Set
// E02: unknown method add(...)
// E02: unknown method find_index(...)
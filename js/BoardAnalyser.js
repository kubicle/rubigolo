//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
var ZoneFiller = require('./ZoneFiller');

var BLACK = main.BLACK, WHITE = main.WHITE;


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
    var hasBlack = this.groups[BLACK].length > 0;
    var hasWhite = this.groups[WHITE].length > 0;
    var oneColor = null;
    if (hasBlack) {
        if (!hasWhite) {
            oneColor = BLACK;
        }
    } else if (hasWhite) {
        oneColor = WHITE;
    }
    this.eyeColor = oneColor;
    // Now tell the groups about this void
    var color, groups, i;
    var isEye = oneColor !== null;
    if (isEye) this.setOwner(oneColor);
    for (color = this.groups.length - 1; color >= 0; color--) {
        groups = this.groups[color];
        for (i = groups.length - 1; i >= 0; i--) {
            groups[i]._info.addVoid(this, isEye);
        }
    }
    if (main.debug) {
        if (isEye) main.log.debug('Color ' + oneColor + ' surrounds ' + this + ' (eye)');
        else main.log.debug(this + ' has to be sorted out...');
    }
};

Void.prototype.setOwner = function (color) {
    this.owner = color;
};

Void.prototype.toString = function () {
    var s = 'void ' + this.code + ' (' + Grid.colorToChar(this.code) + '/' + this.i + ',' + this.j + '), vcount ' + this.vcount;
    for (var color = 0; color < this.groups.length; color++) {
        s += ', ' + this.groups[color].length + ' ' + Grid.COLOR_NAMES[color] + ' neighbors';
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

function GroupInfo(group) {
    this.group = group;
    this.voids = []; // empty zones next to a group
    this.eyes = []; // eyes (i.e. void surrounded by a group)
    this.extraLives = 0; // lives granted by dying enemy nearby
}

// This also resets the eyes
GroupInfo.prototype.resetAnalysis = function () {
    this.voids.clear();
    this.eyes.clear();
    this.extraLives = 0;
};

// Adds a void or an eye
GroupInfo.prototype.addVoid = function (v, isEye) {
    if (isEye) {
        this.eyes.push(v);
    } else {
        this.voids.push(v);
    }
};



/** @class public read-only attribute: goban, scores, prisoners
 */
function BoardAnalyser() {
    this.goban = null;
    this.voids = [];
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
        if (v.owner !== null) {
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
        var eyes = [[], [], []];
        for (var ndx in this.allGroups) {
            var g = this.allGroups[ndx];
            var numEyes = g._info.eyes.length;
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
        g._info = new GroupInfo();
    } else {
        g._info.resetAnalysis();
    }
    this.allGroups[g.ndx] = g;
};

BoardAnalyser.prototype.findVoids = function () {
    if (main.debug) main.log.debug('Find voids...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
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
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.eyeCheck();
    }
};

// Decides who owns a void by comparing the "liveness" of each side
BoardAnalyser.prototype.findStrongerOwners = function () {
    var lives = [0, 0];
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor !== null) {
            continue;
        }
        lives[BLACK] = lives[WHITE] = 0;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                lives[c] += g.lives;
            }
        }
        // make sure we have a winner, not a tie
        if (lives[BLACK] === lives[WHITE]) continue;
        var winner = lives[BLACK] > lives[WHITE] ? BLACK : WHITE;
        var moreLives = Math.max(lives[BLACK], lives[WHITE]);
        v.setOwner(winner);
        if (main.debug) main.log.debug('It looks like color ' + winner + ', with ' + moreLives +
            ' lives, owns ' + v + ' (this might change once we identify dead groups)');
    }
};

BoardAnalyser.prototype.countGroupAsDead = function (group) {
    var color = group.color;
    var stones = group.stones;
    for (var n = stones.length - 1; n >= 0; n--) {
        var enemies = stones[n].uniqueEnemies(color);
        for (var m = enemies.length - 1; m >= 0; m--) {
            enemies[m]._info.extraLives++;
        }
    }
};

// Reviews the groups and declare "dead" the ones who do not own any void
BoardAnalyser.prototype.findDyingGroups = function () {
    for (var ndx in this.allGroups) {
        var g = this.allGroups[ndx], gi = g._info;
        if (gi.eyes.length >= 2) continue;
        if (gi.eyes.length === 1 && gi.eyes[0].vcount + gi.extraLives >= 3) { // actually not enough if gote but well...
            continue;
        }
        var color = g.color;
        if (gi.eyes.length === 1 && gi.eyes[0].groups[color].length > 1) { // connected by eye
            continue;
        }
        // we need to look at voids around (fake eyes, etc.)
        var ownedVoids = 0, vcount = 0;
        var myVoid = null;
        var oneOwner = false;
        for (var v, v_array = gi.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
            if (v.owner !== null) {
                oneOwner = true;
                if (v.owner === color) {
                    myVoid = v;
                    ownedVoids += 1;
                    vcount += v.vcount;
                }
            }
        }
        if (gi.eyes.length === 1 && ownedVoids >= 1) { // TODO: this is too lenient
            continue;
        }
        if (ownedVoids >= 2) { // TODO later: here is the horror we read about on the web
            continue;
        }
        if (ownedVoids === 1 && vcount + gi.extraLives >= 3) {
            continue;
        }
        if (ownedVoids === 1 && myVoid.groups[color].length > 1) { // TODO: check also lives of ally
            continue;
        }
        // find if the only void around is owned (e.g. lost stones inside big territory)
        // if we don't know who owns the voids around g, leave g as alive (unfinished game)
        if (gi.voids.length !== 0 && !oneOwner) {
            continue;
        }
        // g is dead!
        var stone = g.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
        this.countGroupAsDead(g);
        if (main.debug) {
            main.log.debug('Hence ' + g + ' is considered dead (' + taken + ' prisoners; 1st stone ' + stone + ')');
            main.log.debug('eyes:' + gi.eyes.length + ' owned_voids:' + ownedVoids + ' vcount-voids:' + vcount);
        }
    }
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype.findDameVoids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eyeColor !== null) {
            continue;
        }
        var aliveColors = [];
        for (var c = 0; c < 2; c++) {
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
        var c = (( v.owner !== null ? Grid.TERRITORY_COLOR + v.owner : Grid.DAME_COLOR ));
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
    var gi = g._info;
    return gi.eyes.length + gi.voids.count(function (z) {
        return z.owner === g.color;
    });
};

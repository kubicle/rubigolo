//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

var GRID_BORDER = main.GRID_BORDER;
var EMPTY = main.EMPTY, BORDER = main.BORDER;


/** @class Stores what we have on the board (stones & groups).
 *  Goban remembers the stones played - undo feature is provided.
 *  public RO attributes: gsize, grid
 *  public RW attributes: scoringGrid, mergedGroups, killedGroups
 */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    if (gsize !== ~~gsize || gsize < 3) throw new Error('Invalid goban size: ' + gsize);
    this.gsize = gsize;
    this.grid = new Grid(gsize, BORDER);
    this.scoringGrid = new Grid(gsize, GRID_BORDER);

    this.ban = this.grid.yx;
    var i, j;
    for (j = 1; j <= gsize; j++) {
        for (i = 1; i <= gsize; i++) {
            this.ban[j][i] = new Stone(this, i, j, EMPTY);
        }
    }
    for (j = 1; j <= gsize; j++) {
        for (i = 1; i <= gsize; i++) {
            this.ban[j][i].findNeighbors();
        }
    }
    // Sentinel for group stacks
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel];
    this.mergedGroups = [Goban.sentinel];

    this.garbageGroups = [];
    this.numGroups = 0;

    this.history = [];
    this._initSuperko(false);

    // this._moveIdStack = [];
    // this._moveIdGen = this.moveId = 0; // moveId is unique per tried move

    this.analyseGrid = null;
}
module.exports = Goban;

// Prepares the goban for another game (same size, same number of players)
Goban.prototype.clear = function () {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.ban[j][i];
            if (stone.group) {
                stone.group.clear();
            }
        }
    }
    // Collect all the groups and put them into garbageGroups
    // NB: V8 does slightly faster when we keep the sentinel instead of clearing to []
    this.killedGroups.shift(); // removes sentinel
    this.mergedGroups.shift(); // removes sentinel
    this.garbageGroups.concat(this.killedGroups);
    this.garbageGroups.concat(this.mergedGroups);
    this.killedGroups.clear();
    this.mergedGroups.clear();
    this.killedGroups.push(Goban.sentinel);
    this.mergedGroups.push(Goban.sentinel);
    this.numGroups = 0;

    this.history.clear();
    this._initSuperko(false);

    // this._moveIdStack.clear();
    // this._moveIdGen = this.moveId = 0;
};

Goban.prototype.setRules = function (rules) {
    for (var rule in rules) {
        var setting = rules[rule];
        switch (rule) {
        case 'positionalSuperko': this._initSuperko(setting); break;
        default: main.log.warn('Ignoring unsupported rule: ' + rule + ': ' + setting);
        }
    }
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.newGroup = function (stone, lives) {
    this.numGroups++;
    var group = this.garbageGroups.pop();
    if (group) {
        group.recycle(stone, lives, this.numGroups);
        return group;
    } else {
        return new Group(this, stone, lives, this.numGroups);
    }
};

Goban.prototype.deleteGroup = function (group) {
    // When undoing a move, we usually can decrement group ID generator too
    if (group.ndx === this.numGroups) this.numGroups--;
    this.garbageGroups.push(group);
};

Goban.prototype.image = function () {
    return this.grid.toLine();
};

// For tests; can load a game image (without the move history)
Goban.prototype.loadImage = function (image) {
    this.scoringGrid.loadImage(image);
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            var color = this.scoringGrid.yx[j][i];
            if (color !== EMPTY) this.playAt(i, j, color);
        }
    }
};

Goban.prototype.getAllGroups = function () {
    var groups = {};
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            var group = this.ban[j][i].group;
            if (group) groups[group.ndx] = group;
        }
    }
    return groups;
};

// For debugging only
Goban.prototype.debugDump = function () {
    var res = 'Board:\n' + this.toString() +
        '\nGroups:\n' +
        this.grid.toText(function (s) { return s.group ? '' + s.group.ndx : '.'; }) +
        '\nStones in groups:\n';
    var groups = {};
    for (var row, row_array = this.grid.yx, row_ndx = 0; row=row_array[row_ndx], row_ndx < row_array.length; row_ndx++) {
        for (var s, s_array = row, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s && s.group) groups[s.group.ndx] = s.group;
        }
    }
    for (var ndx = 1; ndx <= this.numGroups; ndx++) {
        if (groups[ndx]) res += groups[ndx].debugDump() + '\n';
    }
    return res;
};

// This display is for debugging and text-only game
Goban.prototype.toString = function () {
    return this.grid.toText();
};

Goban.prototype.isValidMove = function (i, j, color) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) return false;

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) return false;

    if (stone.moveIsSuicide(color)) {
        return false;
    }

    if (this.useSuperko) {
        // Check this is not a superko (already seen position)
        if (this.allSeenPositions[this.nextMoveImage(i, j, color)]) {
            return false;
        }
    } else if (stone.moveIsKo(color)) {
        return false;
    }

    return true;
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.colorAt = function (i, j) {
    var stone = this.ban[j][i];
    return stone ? stone.color : BORDER;
};

// No validity test here
Goban.prototype.isEmpty = function (i, j) {
    return this.ban[j][i].isEmpty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

Goban.prototype.playAt = function (i, j, color) {
    this._updatePositionSignature(i, j, color);

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) throw new Error('Tried to play on existing stone in ' + stone);
    return this.tryAt(i, j, color);
};

// Called to undo a single stone (the main undo feature relies on this)  
Goban.prototype.undo = function () {
    if (!this.history.length) throw new Error('Extra undo');
    this.history.pop().takeBack();

    this._updatePositionSignature();
};

Goban.prototype.tryAt = function (i, j, color) {
    var stone = this.ban[j][i];
    this.history.push(stone);
    stone.putDown(color);
    return stone;
};

Goban.prototype.untry = function () {
    this.history.pop().takeBack();
};

// Returns undefined if no group was killed yet
Goban.prototype.previousKilledGroup = function () {
    return this.killedGroups[this.killedGroups.length - 1];
};

// If inc > 0 (e.g. +1), increments the move ID
// otherwise, unstack (pop) the previous move ID (we are doing a "undo")
// Goban.prototype.updateMoveId = function (inc) {
//     if (inc > 0) {
//         this._moveIdGen++;
//         this._moveIdStack.push(this.moveId);
//         this.moveId = this._moveIdGen;
//     } else {
//         this.moveId = this._moveIdStack.pop();
//     }
// };

Goban.prototype.previousStone = function () {
    return this.history[this.history.length - 1];
};

// Returns an array with the prisoner count per color
// e.g. [3,5] means 3 black stones are prisoners, 5 white stones
Goban.prototype.countPrisoners = function () {
    var prisoners = [0, 0];
    for (var i = this.killedGroups.length - 1; i >= 0; i--) {
        var g = this.killedGroups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

Goban.prototype._initSuperko = function (isRuleOn) {
    this.useSuperko = isRuleOn;
    if (isRuleOn) {
        this.currentPosition = this.buildCompressedImage();
        this.positionHistory = [];
        this.allSeenPositions = {};
    } else {
        this.currentPosition = null;
        this.positionHistory = this.allSeenPositions = null;
    }
};

Goban.prototype._updatePositionSignature = function (i, j, color) {
    if (this.useSuperko) {
        if (i) { // play
            this.positionHistory.push(this.currentPosition);
            this.allSeenPositions[this.currentPosition] = this.history.length;
            this.currentPosition = this.nextMoveImage(i, j, color);
        } else { // undo
            this.currentPosition = this.positionHistory.pop();
            this.allSeenPositions[this.currentPosition] = null;
        }
    } else {
        this.currentPosition = null;
    }
};

Goban.prototype.nextMoveImage = function (i, j, color) {
    var img = this._modifyCompressedImage(this.currentPosition, i, j, color);

    // Remove all dead stones from image
    var enemies = this.stoneAt(i, j).uniqueAllies(1 - color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        if (enemies[e].lives > 1) continue;
        var stones = enemies[e].stones;
        for (var n = stones.length - 1; n >= 0; n--) {
            var s = stones[n];
            img = this._modifyCompressedImage(img, s.i, s.j, EMPTY);
        }
    }
    return img;
};

Goban.prototype.getPositionSignature = function () {
    if (this.useSuperko) {
        return this.currentPosition;
    } else {
        if (!this.currentPosition) this.currentPosition = this.image();
        return this.currentPosition;
    }
};

var COMPRESS_CHAR0 = 33; // 33 is "!" - we avoid 32/space on purpose
var ZERO = '0'.charCodeAt();

/** Returns a string which describes a unique game position.
 * 4 stones (0: empty, 1: black, 2: white) are coded into a single character.
 * Resulting character has ascii code COMPRESS_CHAR0 + n, with n in 0..80
 */
Goban.prototype.buildCompressedImage = function () {
    var buf = '', img = '';
    var gsize = this.gsize;
    for (var j = 1; j <= gsize; j++) {
        var yxj = this.ban[j];
        for (var i = 1; i <= gsize; i++) {
            buf += String.fromCharCode(ZERO + yxj[i].color + 1);
            if (buf.length === 4) {
                img += String.fromCharCode(parseInt(buf, 3) + COMPRESS_CHAR0);
                buf = '';
            }
        }
    }
    if (buf.length) {
        buf = (buf + '000').substr(0, 4);
        img += String.fromCharCode(parseInt(buf, 3) + COMPRESS_CHAR0);
    }
    return img;
};

Goban.prototype._modifyCompressedImage = function (img, i, j, color) {
    var stoneNum = (j - 1) * this.gsize + (i - 1);
    var ndx = ~~(stoneNum / 4), subNdx = stoneNum % 4;
    var newChar;
    if (color === EMPTY) {
        var asStr = ('000' + (img.charCodeAt(ndx) - COMPRESS_CHAR0).toString(3)).slice(-4);
        var newStr = asStr.substr(0, subNdx) + '0' + asStr.substr(subNdx + 1);
        newChar = parseInt(newStr, 3) + COMPRESS_CHAR0;
    } else {
        newChar = img.charCodeAt(ndx) + (1 << color) * Math.pow(3, 3 - subNdx);
    }
    return img.substr(0, ndx) + String.fromCharCode(newChar) + img.substr(ndx + 1);
};

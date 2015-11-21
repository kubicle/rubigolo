//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

var EMPTY = main.EMPTY, BORDER = main.BORDER;


/** @class Stores what we have on the board (namely, the stones and the empty spaces).
 *  - Giving coordinates, a Goban can return an existing stone.
 *  - It also remembers the list of stones played and can share this info for undo feature.
 *  - For console game and debug features, a goban can also "draw" its content as text.
 *  See Stone and Group classes for the layer above this.
 *  public read-only attribute: gsize, grid, scoringGrid, mergedGroups, killedGroups, garbageGroups
 */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    if (gsize !== ~~gsize || gsize < 3) throw new Error('Invalid goban size: ' + gsize);
    this.gsize = gsize;
    this.grid = new Grid(gsize);
    this.scoringGrid = new Grid(gsize);
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
    // sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel]; // so that we can always do @killed_groups.last.color, etc.
    this.mergedGroups = [Goban.sentinel];
    this.garbageGroups = [];
    this.numGroups = 0;

    this.history = [];
    this._initSuperko(false);
    this._moveIdStack = [];
    this._moveIdGen = this.moveId = 0; // moveId is unique per tried move
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
    this._moveIdStack.clear();
    this._moveIdGen = this.moveId = 0;
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

Goban.prototype._initSuperko = function (isRuleOn) {
    this.useSuperko = isRuleOn;
    if (isRuleOn) {
        this.positionHistory = [];
        this.currentPosition = this.buildCompressedImage();
        this.allSeenPositions = {};
    }
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.newGroup = function (stone, lives) {
    this.numGroups++;
    var group = this.garbageGroups.pop();
    if (group) {
        return group.recycle(stone, lives, this.numGroups);
    } else {
        return new Group(this, stone, lives, this.numGroups);
    }
};

Goban.prototype.image = function () {
    return this.grid.toLine(function (s) {
        return Grid.colorToChar(s.color);
    });
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
Goban.prototype.debugDisplay = function () {
    if (!main.debug) return;
    main.log.debug('Board:');
    main.log.debug(this.grid.toText(function (s) { return Grid.colorToChar(s.color); }));
    main.log.debug('Groups:');
    main.log.debug(this.grid.toText(function (s) { return s.group ? '' + s.group.ndx : '.'; }));
    main.log.debug('Full info on groups and stones:');
    var groups = {};
    for (var row, row_array = this.grid.yx, row_ndx = 0; row=row_array[row_ndx], row_ndx < row_array.length; row_ndx++) {
        for (var s, s_array = row, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s && s.group) groups[s.group.ndx] = s.group;
        }
    }
    for (var ndx = 1; ndx <= this.numGroups; ndx++) {
        if (groups[ndx]) main.log.debug(groups[ndx].debugDump());
    }
};

// This display is for debugging and text-only game
Goban.prototype.toString = function () {
    return this.grid.toText(function (s) {
        return Grid.colorToChar(s.color);
    });
};

Goban.prototype.isValidMove = function (i, j, color) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) return false;

    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) return false;

    if (this.useSuperko) {
        // Check this is not a superko (already seen position)
        var pos = this.nextMoveImage(i, j, color);
        if (this.allSeenPositions[pos]) {
            return false;
        }
    }
    if (stone.moveIsSuicide(color)) {
        return false;
    }
    if (stone.moveIsKo(color)) {
        return false;
    }
    return true;
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.color = function (i, j) {
    var stone = this.ban[j][i];
    if (stone) { // works because BORDER == nil
        return stone.color;
    }
    return BORDER;
};

// No validity test here
Goban.prototype.isEmpty = function (i, j) {
    return this.ban[j][i].isEmpty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

Goban.prototype.playAt = function (i, j, color) {
    var stone = this._putDown(i, j);
    stone.putDown(color);

    if (this.useSuperko) {
        this.positionHistory.push(this.currentPosition);
        this.allSeenPositions[this.currentPosition] = this.history.length;
        //TODO: use nextMoveImage(i, j, color) or better
        this.currentPosition = this.buildCompressedImage();
    }
    return stone;
};

// Called to undo a single stone (the main undo feature relies on this)  
Goban.prototype.undo = function () {
    var stone = this._takeBack();
    if (!stone) throw new Error('Extra undo');
    stone.takeBack();

    if (this.useSuperko) {
        this.currentPosition = this.positionHistory.pop();
        delete this.allSeenPositions[this.currentPosition];
    }
};

Goban.prototype.tryAt = function (i, j, color) {
    var stone = this._putDown(i, j);
    if (main.debug) main.log.debug('try ' + stone);
    stone.putDown(color);
    return stone;
};

Goban.prototype.untry = function () {
    var stone = this._takeBack();
    if (main.debug) main.log.debug('untry ' + stone);
    stone.takeBack();
};

// Plays a stone and stores it in history
// Returns the existing stone and the caller (Stone class) will update it
Goban.prototype._putDown = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== EMPTY) {
        throw new Error('Tried to play on existing stone in ' + stone);
    }
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Returns the existing stone for the caller to update it
Goban.prototype._takeBack = function () {
    return this.history.pop();
};

// If inc > 0 (e.g. +1), increments the move ID
// otherwise, unstack (pop) the previous move ID (we are doing a "undo")
Goban.prototype.updateMoveId = function (inc) {
    if (inc > 0) {
        this._moveIdGen++;
        this._moveIdStack.push(this.moveId);
        this.moveId = this._moveIdGen;
    } else {
        this.moveId = this._moveIdStack.pop();
    }
};

Goban.prototype.previousStone = function () {
    return this.history[this.history.length-1];
};

/** Compresses 4 stones into a single character.
 * buf contains the 4 stones, each one coded as 0: empty, 1: black, 2: white
 * Resulting character has ascii code 33 + n, with n in 0..81
 */
function compress4(buf) {
    return String.fromCharCode(33 + // 33 is "!" - we avoid 32/space on purpose
        buf[0] +
        buf[1] * 3 +
        buf[2] * 9 +
        buf[3] * 27);
}

/** Returns a string which describes a unique game position */
Goban.prototype.buildCompressedImage = function () {
    var buf = [], img = '';
    var ndx = 0, gsize = this.gsize;
    for (var j = 1; j <= gsize; j++) {
        var yxj = this.ban[j];
        for (var i = 1; i <= gsize; i++) {
            buf[ndx++] = yxj[i].color + 1;
            if (ndx === 4) {
                img += compress4(buf);
                ndx = 0;
            }
        }
    }
    if (ndx > 0) {
        for (var n = ndx; n < 4; n++) buf[n] = 0;
        img += compress4(buf);
    }
    return img;
};

Goban.prototype.nextMoveImage = function (i, j, color) {
    var stoneNdx = (j - 1) * this.gsize + i - 1;
    var img = this.currentPosition;
    var ndx = ~~(stoneNdx / 4);
    var newChar = img.charCodeAt(ndx) - 33 + ((1 << color) * Math.pow(3, stoneNdx % 4));
    return img.substr(0, ndx) + String.fromCharCode(newChar + 33) + img.substr(ndx + 1);
};

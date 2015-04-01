//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');

var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');
// Stores what we have on the board (namely, the stones and the empty spaces).
// - Giving coordinates, a Goban can return an existing stone.
// - It also remembers the list of stones played and can share this info for undo feature.
// - For console game and debug features, a goban can also "draw" its content as text.
// See Stone and Group classes for the layer above this.
//public read-only attribute: gsize, grid, scoringGrid, mergedGroups, killedGroups, garbageGroups;

/** @class */
function Goban(gsize) {
    if (gsize === undefined) gsize = 19;
    this.gsize = gsize;
    this.grid = new Grid(gsize);
    this.scoringGrid = new Grid(gsize);
    this.ban = this.grid.yx;
    var i, j;
    for (var j = 1; j <= gsize; j++) {
        for (var i = 1; i <= gsize; i++) {
            this.ban[j][i] = new Stone(this, i, j, main.EMPTY);
        }
    }
    for (var j = 1; j <= gsize; j++) {
        for (var i = 1; i <= gsize; i++) {
            this.ban[j][i].findNeighbors();
        }
    }
    // sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, main.EMPTY), -100, 0);
    this.killedGroups = [Goban.sentinel]; // so that we can always do @killed_groups.last.color, etc.
    this.mergedGroups = [Goban.sentinel];
    this.garbageGroups = [];
    this.numGroups = 0;
    this.history = [];
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
    // Collect all the groups and put them into @garbage_groups
    this.killedGroups.shift(); // removes @@sentinel
    this.mergedGroups.shift(); // removes @@sentinel
    this.garbageGroups.concat(this.killedGroups);
    this.garbageGroups.concat(this.mergedGroups);
    this.killedGroups.clear();
    this.killedGroups.push(Goban.sentinel);
    this.mergedGroups.clear();
    this.mergedGroups.push(Goban.sentinel);
    this.numGroups = 0;
    return this.history.clear();
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.newGroup = function (stone, lives) {
    var group = this.garbageGroups.pop();
    if (group) {
        return group.recycle(stone, lives);
    } else {
        this.numGroups += 1;
        return new Group(this, stone, lives, this.numGroups);
    }
};

Goban.prototype.image = function () {
    return this.grid.toTextExt(false, ',', function (s) {
        return Grid.COLOR_CHARS[s.color];
    }).chop();
};

// For debugging only
Goban.prototype.debugDisplay = function () {
    console.log('Board:');
    console.log(this.grid.toText(function (s) {
        return Grid.COLOR_CHARS[s.color];
    }));
    console.log('Groups:');
    console.log(this.grid.toText(function (s) {
        if (s.group) {
            return '' + s.group.ndx;
        } else {
            return '.';
        }
    }));
    console.log('Full info on groups and stones:');
    var groups = {};
    for (var row, row_array = this.grid.yx, row_ndx = 0; row=row_array[row_ndx], row_ndx < row_array.length; row_ndx++) {
        for (var s, s_array = row, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s && s.group) {
                groups[s.group.ndx] = s.group;
            }
        }
    }
    for (var ndx = 1; ndx <= this.numGroups; ndx++) {
        if (groups[ndx]) {
            console.log(groups[ndx].debugDump());
        }
    }
};

// This display is for debugging and text-only game
Goban.prototype.consoleDisplay = function () {
    console.log(this.grid.toText(function (s) {
        return Grid.COLOR_CHARS[s.color];
    }));
};

// Basic validation only: coordinates and checks the intersection is empty
// See Stone class for evolved version of this (calling this one)
Goban.prototype.validMove = function (i, j) {
    if (i < 1 || i > this.gsize || j < 1 || j > this.gsize) {
        return false;
    }
    return this.ban[j][i].empty();
};

Goban.prototype.stoneAt = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.color = function (i, j) {
    var stone = this.ban[j][i];
    if (stone) { // works because BORDER == nil
        return stone.color;
    }
    return main.BORDER;
};

// No validity test here
Goban.prototype.empty = function (i, j) {
    return this.ban[j][i].empty();
};

Goban.prototype.moveNumber = function () {
    return this.history.length;
};

// Plays a stone and stores it in history
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.playAt = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== main.EMPTY) {
        throw new Error('Tried to play on existing stone in ' + i + ',' + j);
    }
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.undo = function () {
    return this.history.pop();
};

Goban.prototype.previousStone = function () {
    return this.history[this.history.length-1];
};

// E02: unknown method concat(...)
//Translated from goban.rb using babyruby2js
'use strict';

var main = require('./main');
//var StoneConstants = require('StoneConstants');
var Grid = require('./Grid');
var Stone = require('./Stone');
var Group = require('./Group');

// Stores what we have on the board (namely, the stones and the empty spaces).
// - Giving coordinates, a Goban can return an existing stone.
// - It also remembers the list of stones played and can share this info for undo feature.
// - For console game and debug features, a goban can also "draw" its content as text.
// See Stone and Group classes for the layer above this.
//public read-only attribute: size, grid, scoring_grid, merged_groups, killed_groups, garbage_groups;

/** @class */
function Goban(size) {
    if (size === undefined) size = 19;
    this.size = size;
    this.grid = new Grid(size);
    this.scoring_grid = new Grid(size);
    this.ban = this.grid.yx;
    var i,j;
    for (j = 1; j <= size; j++) {
        for (i = 1; i <= size; i++) {
            this.ban[j][i] = new Stone(this, i, j, main.EMPTY);
        }
    }
    for (j = 1; j <= size; j++) {
        for (i = 1; i <= size; i++) {
            this.ban[j][i].find_neighbors();
        }
    }
    // sentinel for group list searches; NB: values like -100 helps detecting bugs when value is used by mistake
    Goban.sentinel = new Group(this, new Stone(this, -50, -50, main.EMPTY), -100, 0);
    this.killed_groups = [Goban.sentinel]; // so that we can always do @killed_groups.last.color, etc.
    this.merged_groups = [Goban.sentinel];
    this.garbage_groups = [];
    this.num_groups = 0;
    this.history = [];
}
module.exports = Goban;

// Prepares the goban for another game (same size, same number of players)
Goban.prototype.clear = function () {
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            var stone = this.ban[j][i];
            if (stone.group) {
                stone.group.clear();
            }
        }
    }
    // Collect all the groups and put them into @garbage_groups
    this.killed_groups.shift(); // removes @@sentinel
    this.merged_groups.shift(); // removes @@sentinel
    this.garbage_groups.concat(this.killed_groups);
    this.garbage_groups.concat(this.merged_groups);
    this.killed_groups.clear();
    this.killed_groups.push(Goban.sentinel);
    this.merged_groups.clear();
    this.merged_groups.push(Goban.sentinel);
    this.num_groups = 0;
    return this.history.clear();
};

// Allocate a new group or recycles one from garbage list.
// For efficiency, call this one, do not call the regular Group.new method.
Goban.prototype.new_group = function (stone, lives) {
    var group = this.garbage_groups.pop();
    if (group) {
        return group.recycle(stone, lives);
    } else {
        this.num_groups += 1;
        return new Group(this, stone, lives, this.num_groups);
    }
};

Goban.prototype.image = function () {
    return main.strChop(this.grid.to_text2(false, ',', function (s) {
        return Grid.COLOR_CHARS[s.color];
    }));
};

// For debugging only
Goban.prototype.debug_display = function () {
    console.log('Board:');
    console.log(this.grid.to_text());
    console.log('Groups:');
    console.log(this.grid.to_text(function (s) {
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
    for (var ndx = 1; ndx <= this.num_groups; ndx++) {
        if (groups[ndx]) {
            console.log(groups[ndx].debug_dump());
        }
    }
};

// This display is for debugging and text-only game
Goban.prototype.console_display = function () {
    console.log(this.grid.to_text(function (s) {
        return Grid.COLOR_CHARS[s.color];
    }));
};

// Basic validation only: coordinates and checks the intersection is empty
// See Stone class for evolved version of this (calling this one)
Goban.prototype.valid_move = function (i, j) {
    if (i < 1 || i > this.size || j < 1 || j > this.size) {
        return false;
    }
    return this.ban[j][i].empty();
};

Goban.prototype.stone_at = function (i, j) {
    return this.ban[j][i];
};

Goban.prototype.color = function (i, j) {
    var stone = this.ban[j][i];
    if (stone) {
        return stone.color;
    } // works because BORDER == nil
    return main.BORDER;
};

// No validity test here
Goban.prototype.empty = function (i, j) {
    return this.ban[j][i].empty();
};

Goban.prototype.move_number = function () {
    return this.history.length;
};

// Plays a stone and stores it in history
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.play_at = function (i, j) {
    var stone = this.ban[j][i];
    if (stone.color !== main.EMPTY) throw new Error('Tried to play on existing stone in '+i+','+j);
    this.history.push(stone);
    return stone;
};

// Removes the last stone played from the board
// Actually we simply return the existing stone and the caller will update it
Goban.prototype.undo = function () {
    return this.history.pop();
};

Goban.prototype.previous_stone = function () {
    return this.history[this.history.length-1];
};

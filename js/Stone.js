//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
var StoneConstants = require('./StoneConstants');

// A "stone" stores everything we want to keep track of regarding an intersection on the board.
// By extension, an empty intersection is also a stone, with a color attribute equals to EMPTY.
// This class is also the entry point for moves in general, so it has methods to play or undo,
// and verify if a planned move is authorized.

//public read-only attribute: goban, group, color, i, j, neighbors;

/** @class */
function Stone(goban, i, j, color) {
    this.goban = goban;
    this.i = i;
    this.j = j;
    this.color = color;
    this.group = null;
    // @neighbors contains the neighboring stones (empty or not); no need to compute coordinates anymore
    this.neighbors = new main.Array(4);
    // @allies and @enemies are used as buffers for corresponding methods (unique_allies, unique_enemies etc.)
    this.allies = new main.Array(4);
    this.enemies = new main.Array(4);
}
module.exports = Stone;

Stone.XY_AROUND = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // top, right, bottom, left
Stone.XY_DIAGONAL = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top-right, bottom-right, bottom-left, top-left

Stone.prototype.clear = function () {
    this.color = main.EMPTY;
    this.group = null;
};

// Computes each stone's neighbors (called for each stone after init)
// NB: Stones next to side have only 3 neighbors, and the corner stones have 2
Stone.prototype.find_neighbors = function () {
    this.neighbors.clear();
    for (var coord_change, coord_change_array = Stone.XY_AROUND, coord_change_ndx = 0;
        coord_change=coord_change_array[coord_change_ndx], coord_change_ndx < coord_change_array.length;
        coord_change_ndx++) {
        var stone = this.goban.stone_at(this.i + coord_change[0], this.j + coord_change[1]);
        if (stone !== main.BORDER) {
            this.neighbors.push(stone);
        }
    }
};

Stone.prototype.to_s = function () {
    if (this.color === main.EMPTY) {
        return 'empty:' + this.as_move();
    } else {
        return 'stone' + Grid.COLOR_CHARS[this.color] + ':' + this.as_move();
    }
};

// Returns "c3" for a stone in 3,3
Stone.prototype.as_move = function () {
    return '' + Grid.move_as_string(this.i, this.j);
};

Stone.prototype.debug_dump = function () {
    return this.to_s(); // we could add more info
};

// Returns the empty points around this stone
Stone.prototype.empties = function () {
    return this.neighbors.select(function (s) {
        return s.color === main.EMPTY;
    });
};

// Number of empty points around this stone
Stone.prototype.num_empties = function () {
    var count = 0;
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === main.EMPTY) {
            count += 1;
        }
    }
    return count;
};

// Returns a string with the list of empty points, sorted (debug only)
Stone.prototype.empties_dump = function () {
    return this.empties().map(function (s) {
        return s.as_move();
    }).sort().join(',');
};

Stone.prototype.empty = function () {
    return this.color === main.EMPTY;
};

Stone.valid_move = function (goban, i, j, color) {
    // Remark: no log here because of the noise created with web server mode
    if (!goban.valid_move(i, j)) {
        return false;
    } // also checks if empty
    var stone = goban.stone_at(i, j);
    if (stone.move_is_suicide(color)) {
        return false;
    }
    if (stone.move_is_ko(color)) {
        return false;
    }
    return true;
};

// Is a move a suicide?
// not a suicide if 1 free life around
// or if one enemy group will be killed
// or if the result of the merge of ally groups will have more than 0 life
Stone.prototype.move_is_suicide = function (color) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === main.EMPTY) {
            return false;
        }
        if (s.color !== color) {
            if (s.group.lives === 1) {
                return false;
            }
        } else if (s.group.lives > 1) {
            return false;
        }
    }
    // $log.debug("move #{@i}, #{@j}, color:#{color} would be a suicide") if $debug
    return true;
};

// Is a move a ko?
// if the move would kill with stone i,j a single stone A (and nothing else!)
// and the previous move killed with stone A a single stone B in same position i,j
// then it is a ko
Stone.prototype.move_is_ko = function (color) {
    // Must kill a single group
    var group_a = null;
    var res = true;
    this.each_enemy(color, function (enemy) {
        if (enemy.lives !== 1) { return; }
        if (group_a) { res = false; return; }
        group_a = enemy;
    });
    if (!res || !group_a) {
        return false;
    }
    // This killed group must be a single stone A
    if (group_a.stones.length !== 1) {
        return false;
    }
    var stone_a = group_a.stones[0];
    // Stone A was played just now
    if (this.goban.previous_stone() !== stone_a) {
        return false;
    }
    // Stone B was killed by A in same position we are looking at
    var group_b = this.goban.killed_groups[this.goban.killed_groups.length-1];
    if (group_b.killed_by !== stone_a) {
        return false;
    }
    if (group_b.stones.length !== 1) {
        return false;
    }
    var stone_b = group_b.stones[0];
    if (stone_b.i !== this.i || stone_b.j !== this.j) {
        return false;
    }
    // $log.debug("ko in #{@i}, #{@j}, color:#{color} cannot be played now") if $debug
    return true;
};

Stone.play_at = function (goban, i, j, color) {
    var stone = goban.play_at(i, j, color);
    stone.put_down(color);
    return stone;
};

Stone.prototype.die = function () {
    // update_around_before_die
    this.color = main.EMPTY;
    this.group = null;
};

Stone.prototype.resuscitate_in = function (group) {
    this.group = group;
    this.color = group.color; // update_around_on_new
};

// Called to undo a single stone (the main undo feature relies on this)  
Stone.undo = function (goban) {
    var stone = goban.undo();
    if (!stone) {
        return;
    }
    if (main.debug) {
        main.log.debug('Stone.undo ' + stone);
    }
    return stone.take_back();
};

// Iterate through enemy groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// Example: +@@+
//          +@O+ <- for stone O, the @ group will be selected 2 times
//          ++++
Stone.prototype.each_enemy = function (ally_color, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== ally_color) {
            cb(s.group);
        }
    }
};

Stone.prototype.unique_enemies = function (ally_color) {
    this.enemies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== ally_color && !this.enemies.contains(s.group)) {
            this.enemies.push(s.group);
        }
    }
    return this.enemies;
};

// Iterate through our groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// See also each_enemy
Stone.prototype.each_ally = function (ally_color, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === ally_color) {
            cb(s.group);
        }
    }
};

Stone.prototype.unique_allies = function (color) {
    this.allies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === color && !this.allies.contains(s.group)) {
            this.allies.push(s.group);
        }
    }
    return this.allies;
};

// Called for each new stone played
Stone.prototype.put_down = function (color) {
    this.color = color;
    if (main.debug) {
        main.log.debug('put_down: ' + this.to_s());
    }
    var allies = this.unique_allies(color); // note we would not need unique if group#merge ignores dupes
    if (allies.length === 0) {
        var lives = 0;
        for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.color === main.EMPTY) {
                lives += 1;
            }
        }
        this.group = this.goban.new_group(this, lives);
    } else {
        this.group = allies[0];
        this.group.connect_stone(this);
    }
    // kill before merging to get the right live-count in merged subgroups
    for (var g, g_array = this.unique_enemies(color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.attacked_by(this);
    }
    for (var a = 1; a <= allies.length - 1; a++) {
        this.group.merge(allies[a], this);
    } // update_around_on_new
};

Stone.prototype.take_back = function () {
    if (main.debug_group) {
        main.log.debug('take_back: ' + this.to_s() + ' from group ' + this.group);
    }
    this.group.unmerge_from(this);
    this.group.disconnect_stone(this);
    for (var g, g_array = this.unique_enemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.not_attacked_anymore(this);
    }
    // update_around_before_die
    var log_group;
    if (main.debug_group) {
        log_group = this.group;
    }
    this.group = null;
    this.color = main.EMPTY;
    Group.resuscitate_from(this, this.goban);
    if (main.debug_group) {
        return main.log.debug('take_back: end; main group: ' + log_group.debug_dump());
    }
};

Stone.prototype.set_group_on_merge = function (new_group) {
    this.group = new_group;
};
 // Not used anymore but could become handy again later // def update_around_on_new //   $log.debug("update_around_on_new #{self.debug_dump}") if $debug // end // Not used anymore but could become handy again later // def update_around_before_die //   $log.debug("update_around_before_die #{self.debug_dump}") if $debug // end
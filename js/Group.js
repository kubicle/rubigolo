//Translated from group.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');

// Always require goban instead of stone
// A group keeps the list of its stones, the updated number of "lives" (empty intersections around),
// and whatever status information we need to decide what happens to a group (e.g. when a
// group is killed or merged with another group, etc.).
// Note that most of the work here is to keep this status information up to date.
//public read-only attribute: goban, stones, lives, color;
//public read-only attribute: merged_with, merged_by, killed_by, ndx;
//public read-write attribute: merged_with, merged_by, extra_lives; // only used in this file
//public read-only attribute: eyes, voids, extra_lives; // for analyser
// Create a new group. Always with a single stone.
// Do not call this using Group.new but Goban#new_group instead.

/** @class */
function Group(goban, stone, lives, ndx) {
    this.goban = goban;
    this.stones = [stone];
    this.lives = lives;
    this.color = stone.color;
    this.merged_with = null; // a group
    this.merged_by = null; // a stone
    this.killed_by = null; // a stone
    this.ndx = ndx; // unique index
    this.voids = []; // for analyser: empty zones next to a group
    this.eyes = []; // for analyser: eyes (i.e. void surrounded by a group)
    this.extra_lives = 0; // for analyser: lives granted by dying enemy nearby
    this.all_enemies = [];
    this.all_lives = []; // $log.debug("New group created #{self}") if $debug_group
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.merged_with = this.merged_by = this.killed_by = null;
    this.voids.clear();
    this.eyes.clear();
    this.all_enemies.clear();
    this.all_lives.clear();
    // $log.debug("Use (new) recycled group #{self}") if $debug_group
    return this;
};

Group.prototype.clear = function () {
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.clear();
    }
    return this.goban.garbage_groups.push(this);
};

Group.prototype.toString = function () {
    var s = '{group #' + this.ndx + ' of ' + this.stones.length + ' ' + Grid.color_name(this.color) + ' stones [';
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        s += stone.as_move() + ',';
    }
    s = main.strChop(s);
    s += '], lives:' + this.lives;
    if (this.merged_with) {
        s += ' MERGED with #' + this.merged_with.ndx;
    }
    if (this.killed_by) {
        s += ' KILLED by ' + this.killed_by.as_move();
    }
    s += '}';
    return s;
};

// debug dump does not have more to display now that stones are simpler
// TODO: remove it unless stones get more state data to display
Group.prototype.debug_dump = function () {
    return this.toString();
};

Group.prototype.stones_dump = function () {
    return this.stones.map(function (s) {
        return s.as_move();
    }).sort().join(',');
};

// This also resets the eyes
Group.prototype.reset_analysis = function () {
    this.extra_lives = 0;
    this.voids.clear();
    return this.eyes.clear();
};

// Adds a void or an eye
Group.prototype.add_void = function (v, is_eye) {
    if (is_eye === undefined) is_eye = false;
    if (is_eye) {
        return this.eyes.push(v);
    } else {
        return this.voids.push(v);
    }
};

// For analyser  
Group.prototype.count_as_dead = function () {
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.unique_enemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.extra_lives += 1;
        }
    }
};

// Builds a list of all lives of the group
Group.prototype.all_lives = function () {
    this.all_lives.clear(); // TODO: try if set is more efficient
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== main.EMPTY) {
                continue;
            }
            if (!this.all_lives.contains(life)) {
                this.all_lives.push(life);
            }
        }
    }
    return this.all_lives;
};

// Builds a list of all enemies of the group
Group.prototype.all_enemies = function () {
    this.all_enemies.clear();
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color === main.EMPTY || en.color === this.color) {
                continue;
            }
            if (!this.all_enemies.contains(en.group)) {
                this.all_enemies.push(en.group);
            }
        }
    }
    if (main.debug_group) {
        main.log.debug(this + ' has ' + this.all_enemies.length + ' enemies');
    }
    return this.all_enemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
Group.prototype.lives_added_by_stone = function (stone) {
    var lives = 0;
    for (var life, life_array = stone.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
        if (life.color !== main.EMPTY) {
            continue;
        }
        var res = false;
        for (var s, s_array = life.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === this && s !== stone) {
                res = true;
                break;
            }
        }
        if (!res) {
            lives++;
        }
    }
    if (main.debug_group) {
        main.log.debug(lives + ' lives added by ' + stone + ' for group ' + this);
    }
    return lives;
};

// Connect a new stone or a merged stone to this group
Group.prototype.connect_stone = function (stone, on_merge) {
    if (on_merge === undefined) on_merge = false;
    if (main.debug_group) {
        main.log.debug('Connecting ' + stone + ' to group ' + this + ' (on_merge=' + on_merge + ')');
    }
    this.stones.push(stone);
    this.lives += this.lives_added_by_stone(stone);
    if (!on_merge) {
        this.lives -= 1;
    } // minus one since the connection itself removes 1
    if (this.lives < 0) {
        throw new Error('Unexpected error (lives<0 on connect)');
    } // can be 0 if suicide-kill
    if (main.debug_group) {
        return main.log.debug('Final group: ' + this);
    }
};

// Disconnect a stone
// on_merge must be true for merge or unmerge-related call 
Group.prototype.disconnect_stone = function (stone, on_merge) {
    if (on_merge === undefined) on_merge = false;
    if (main.debug_group) {
        main.log.debug('Disconnecting ' + stone + ' from group ' + this + ' (on_merge=' + on_merge + ')');
    }
    // groups of 1 stone become empty groups (->garbage)
    if (this.stones.length > 1) {
        this.lives -= this.lives_added_by_stone(stone);
        if (!on_merge) {
            this.lives += 1;
        } // see comment in connect_stone
        if (this.lives < 0) {
            throw new Error('Unexpected error (lives<0 on disconnect)');
        } // can be 0 if suicide-kill
    } else {
        this.goban.garbage_groups.push(this);
        if (main.debug_group) {
            main.log.debug('Group going to recycle bin: ' + this);
        }
    }
    // we always remove them in the reverse order they came
    if (this.stones.pop() !== stone) {
        throw new Error('Unexpected error (disconnect order)');
    }
};

// When a new stone appears next to this group
Group.prototype.attacked_by = function (stone) {
    this.lives -= 1;
    if (this.lives <= 0) {
        return this.die_from(stone);
    } // also check <0 so we can raise in die_from method
};

// When a group of stones reappears because we undo
// NB: it can never kill anything
Group.prototype.attacked_by_resuscitated = function (stone) {
    this.lives -= 1;
    if (main.debug_group) {
        main.log.debug(this + ' attacked by resuscitated ' + stone);
    }
    if (this.lives < 1) {
        throw new Error('Unexpected error (lives<1 on attack by resucitated)');
    }
};

// Stone parameter is just for debug for now
Group.prototype.not_attacked_anymore = function (stone) {
    this.lives += 1;
    if (main.debug_group) {
        return main.log.debug(this + ' not attacked anymore by ' + stone);
    }
};

// Merges a subgroup with this group
Group.prototype.merge = function (subgroup, by_stone) {
    if (subgroup.merged_with === this || subgroup === this || this.color !== subgroup.color) {
        throw new Error('Invalid merge');
    }
    if (main.debug_group) {
        main.log.debug('Merging subgroup:' + subgroup + ' to main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.set_group_on_merge(this);
        this.connect_stone(s, true);
    }
    subgroup.merged_with=(this);
    subgroup.merged_by=(by_stone);
    this.goban.merged_groups.push(subgroup);
    if (main.debug_group) {
        return main.log.debug('After merge: subgroup:' + subgroup + ' main:' + this);
    }
};

// Reverse of merge
Group.prototype.unmerge = function (subgroup) {
    if (main.debug_group) {
        main.log.debug('Unmerging subgroup:' + subgroup + ' from main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = s_array.length - 1; s=s_array[s_ndx], s_ndx >= 0; s_ndx--) {
        this.disconnect_stone(s, true);
        s.set_group_on_merge(subgroup);
    }
    subgroup.merged_by=(subgroup.merged_with=(null));
    if (main.debug_group) {
        return main.log.debug('After unmerge: subgroup:' + subgroup + ' main:' + this);
    }
};

// This must be called on the main group (stone.group)
Group.prototype.unmerge_from = function (stone) {
    var subgroup;
    while ((subgroup = this.goban.merged_groups[this.goban.merged_groups.length-1]).merged_by === stone && subgroup.merged_with === this) {
        this.unmerge(this.goban.merged_groups.pop());
    }
};

// Called when the group has no more life left
Group.prototype.die_from = function (killer_stone) {
    if (main.debug_group) {
        main.log.debug('Group dying: ' + this);
    }
    if (this.lives < 0) {
        throw new Error('Unexpected error (lives<0)');
    }
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.unique_enemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.not_attacked_anymore(stone);
        }
        stone.die();
    }
    this.killed_by = killer_stone;
    this.goban.killed_groups.push(this);
    if (main.debug_group) {
        return main.log.debug('Group dead: ' + this);
    }
};

// Called when "undo" operation removes the killer stone of this group
Group.prototype.resuscitate = function () {
    this.killed_by = null;
    this.lives = 1; // always comes back with a single life
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        stone.resuscitate_in(this);
        for (var enemy, enemy_array = stone.unique_enemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.attacked_by_resuscitated(stone);
        }
    }
};

Group.resuscitate_from = function (killer_stone, goban) {
    while (goban.killed_groups[goban.killed_groups.length-1].killed_by === killer_stone) {
        var group = goban.killed_groups.pop();
        if (main.debug_group) {
            main.log.debug('taking back ' + killer_stone + ' so we resuscitate ' + group.debug_dump());
        }
        group.resuscitate();
    }
};

// Returns prisoners grouped by color of dead stones  
Group.prisoners = function (goban) {
    var prisoners = [0, 0];
    for (var i = 1; i < goban.killed_groups.length; i++) {
        var g = goban.killed_groups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

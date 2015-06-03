//Translated from group.rb using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');

/** @class Always require goban instead of stone
 *  A group keeps the list of its stones, the updated number of "lives" (empty intersections around),
 *  and whatever status information we need to decide what happens to a group (e.g. when a
 *  group is killed or merged with another group, etc.).
 *  Note that most of the work here is to keep this status information up to date.
 *    public read-only attribute: goban, stones, lives, color
 *    public read-only attribute: mergedWith, mergedBy, killedBy, ndx
 *    public write attribute: mergedWith, mergedBy, extraLives  *  only used in this file
 *  Create a new group. Always with a single stone.
 *  Do not call this using Group.new but Goban#newGroup instead.
 */
function Group(goban, stone, lives, ndx) {
    this.goban = goban;
    this.stones = [stone];
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = null; // a group
    this.mergedBy = null; // a stone
    this.killedBy = null; // a stone
    this.ndx = ndx; // unique index
    this._allEnemies = [];
    this._allLives = [];
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = this.mergedBy = this.killedBy = null;
    this._allEnemies.clear();
    this._allLives.clear();
    return this;
};

Group.prototype.clear = function () {
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.clear();
    }
    return this.goban.garbageGroups.push(this);
};

Group.prototype.toString = function () {
    var s = '{group #' + this.ndx + ' of ' + this.stones.length + ' ' + Grid.colorName(this.color) + ' stones [';
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        s += stone.asMove() + ',';
    }
    s = s.chop();
    s += '], lives:' + this.lives;
    if (this.mergedWith) {
        s += ' MERGED with #' + this.mergedWith.ndx;
    }
    if (this.killedBy) {
        s += ' KILLED by ' + this.killedBy.asMove();
    }
    s += '}';
    return s;
};

// debug dump does not have more to display now that stones are simpler
// TODO: remove it unless stones get more state data to display
Group.prototype.debugDump = function () {
    return this.toString();
};

Group.prototype.stonesDump = function () {
    return this.stones.map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

// Builds a list of all lives of the group
Group.prototype.allLives = function () {
    this._allLives.clear(); // TODO: try if set is more efficient
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== main.EMPTY) {
                continue;
            }
            if (!this._allLives.contains(life)) {
                this._allLives.push(life);
            }
        }
    }
    return this._allLives;
};

// Builds a list of all enemies of the group
Group.prototype.allEnemies = function () {
    this._allEnemies.clear();
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color === main.EMPTY || en.color === this.color) {
                continue;
            }
            if (!this._allEnemies.contains(en.group)) {
                this._allEnemies.push(en.group);
            }
        }
    }
    if (main.debugGroup) {
        main.log.debug(this + ' has ' + this._allEnemies.length + ' enemies');
    }
    return this._allEnemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
Group.prototype.livesAddedByStone = function (stone) {
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
            lives += 1;
        }
    }
    if (main.debugGroup) {
        main.log.debug(lives + ' lives added by ' + stone + ' for group ' + this);
    }
    return lives;
};

// Connect a new stone or a merged stone to this group
Group.prototype.connectStone = function (stone, onMerge) {
    if (onMerge === undefined) onMerge = false;
    if (main.debugGroup) {
        main.log.debug('Connecting ' + stone + ' to group ' + this + ' (on_merge=' + onMerge + ')');
    }
    this.stones.push(stone);
    this.lives += this.livesAddedByStone(stone);
    if (!onMerge) { // minus one since the connection itself removes 1
        this.lives -= 1;
    }
    if (this.lives < 0) { // can be 0 if suicide-kill
        throw new Error('Unexpected error (lives<0 on connect)');
    }
    if (main.debugGroup) {
        return main.log.debug('Final group: ' + this);
    }
};

// Disconnect a stone
// on_merge must be true for merge or unmerge-related call 
Group.prototype.disconnectStone = function (stone, onMerge) {
    if (onMerge === undefined) onMerge = false;
    if (main.debugGroup) {
        main.log.debug('Disconnecting ' + stone + ' from group ' + this + ' (on_merge=' + onMerge + ')');
    }
    // groups of 1 stone become empty groups (->garbage)
    if (this.stones.length > 1) {
        this.lives -= this.livesAddedByStone(stone);
        if (!onMerge) { // see comment in connect_stone
            this.lives += 1;
        }
        if (this.lives < 0) { // can be 0 if suicide-kill
            throw new Error('Unexpected error (lives<0 on disconnect)');
        }
    } else {
        this.goban.garbageGroups.push(this);
        if (main.debugGroup) {
            main.log.debug('Group going to recycle bin: ' + this);
        }
    }
    // we always remove them in the reverse order they came
    if (this.stones.pop() !== stone) {
        throw new Error('Unexpected error (disconnect order)');
    }
};

// When a new stone appears next to this group
Group.prototype.attackedBy = function (stone) {
    this.lives -= 1;
    if (this.lives <= 0) { // also check <0 so we can raise in die_from method
        return this.dieFrom(stone);
    }
};

// When a group of stones reappears because we undo
// NB: it can never kill anything
Group.prototype.attackedByResuscitated = function (stone) {
    this.lives -= 1;
    if (main.debugGroup) {
        main.log.debug(this + ' attacked by resuscitated ' + stone);
    }
    if (this.lives < 1) {
        throw new Error('Unexpected error (lives<1 on attack by resucitated)');
    }
};

// Stone parameter is just for debug for now
Group.prototype.notAttackedAnymore = function (stone) {
    this.lives += 1;
    if (main.debugGroup) {
        return main.log.debug(this + ' not attacked anymore by ' + stone);
    }
};

// Merges a subgroup with this group
Group.prototype.merge = function (subgroup, byStone) {
    if (subgroup.mergedWith === this || subgroup === this || this.color !== subgroup.color) {
        throw new Error('Invalid merge');
    }
    if (main.debugGroup) {
        main.log.debug('Merging subgroup:' + subgroup + ' to main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.setGroupOnMerge(this);
        this.connectStone(s, true);
    }
    subgroup.mergedWith = this;
    subgroup.mergedBy = byStone;
    this.goban.mergedGroups.push(subgroup);
    if (main.debugGroup) {
        return main.log.debug('After merge: subgroup:' + subgroup + ' main:' + this);
    }
};

// Reverse of merge
Group.prototype.unmerge = function (subgroup) {
    if (main.debugGroup) {
        main.log.debug('Unmerging subgroup:' + subgroup + ' from main:' + this);
    }
    for (var s, s_array = subgroup.stones, s_ndx = s_array.length - 1; s=s_array[s_ndx], s_ndx >= 0; s_ndx--) {
        this.disconnectStone(s, true);
        s.setGroupOnMerge(subgroup);
    }
    subgroup.mergedBy = subgroup.mergedWith = null;
    if (main.debugGroup) {
        return main.log.debug('After unmerge: subgroup:' + subgroup + ' main:' + this);
    }
};

// This must be called on the main group (stone.group)
Group.prototype.unmergeFrom = function (stone) {
    var subgroup;
    while ((subgroup = this.goban.mergedGroups[this.goban.mergedGroups.length-1]).mergedBy === stone && subgroup.mergedWith === this) {
        this.unmerge(this.goban.mergedGroups.pop());
    }
};

// Called when the group has no more life left
Group.prototype.dieFrom = function (killerStone) {
    if (main.debugGroup) {
        main.log.debug('Group dying: ' + this);
    }
    if (this.lives < 0) {
        throw new Error('Unexpected error (lives<0)');
    }
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.notAttackedAnymore(stone);
        }
        stone.die();
    }
    this.killedBy = killerStone;
    this.goban.killedGroups.push(this);
    if (main.debugGroup) {
        return main.log.debug('Group dead: ' + this);
    }
};

// Called when "undo" operation removes the killer stone of this group
Group.prototype.resuscitate = function () {
    this.killedBy = null;
    this.lives = 1; // always comes back with a single life
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        stone.resuscitateIn(this);
        for (var enemy, enemy_array = stone.uniqueEnemies(this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.attackedByResuscitated(stone);
        }
    }
};

Group.resuscitateFrom = function (killerStone, goban) {
    while (goban.killedGroups[goban.killedGroups.length-1].killedBy === killerStone) {
        var group = goban.killedGroups.pop();
        if (main.debugGroup) {
            main.log.debug('taking back ' + killerStone + ' so we resuscitate ' + group.debugDump());
        }
        group.resuscitate();
    }
};

// Returns prisoners grouped by color of dead stones  
Group.prisoners = function (goban) {
    var prisoners = [0, 0];
    for (var i = 1; i <= goban.killedGroups.length - 1; i++) {
        var g = goban.killedGroups[i];
        prisoners[g.color] += g.stones.length;
    }
    return prisoners;
};

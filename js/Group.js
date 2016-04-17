'use strict';

var CONST = require('./constants');
var main = require('./main');
var Grid = require('./Grid');

var EMPTY = CONST.EMPTY;


/** @class
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

    // populated by analysis:
    this._info = null;
    this.xAlive = this.xDead = 0;
    this.xInRaceWith = null;
}
module.exports = Group;

Group.prototype.recycle = function (stone, lives, ndx) {
    this.stones.clear();
    this.stones.push(stone);
    this.lives = lives;
    this.color = stone.color;
    this.mergedWith = this.mergedBy = this.killedBy = null;
    this.ndx = ndx;

    this.xAlive = this.xDead = 0;
    this.xInRaceWith = null;
};

Group.prototype.clear = function () {
    for (var i = this.stones.length - 1; i >= 0; i--) {
        this.stones[i].clear();
    }
    this.goban.deleteGroup(this);
};

Group.prototype.toString = function (detail) {
    if (detail === 0) return '#' + this.ndx;
    if (detail === 1) return this.stones[0] + 'x' + this.stones.length + '#' + this.ndx;

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

Group.prototype.isValid = function () {
    return this.stones.length && this.stones[0].group === this;
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

// Builds a list of all lives of the group (empty stones around)
// Costly!
Group.prototype.allLives = function () {
    var lives = [];
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var life, life_array = s.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
            if (life.color !== EMPTY) continue;

            if (lives.indexOf(life) < 0) lives.push(life);
        }
    }
    if (lives.length !== this.lives) throw new Error('Wrong life count for group');
    return lives;
};

// Builds a list of all enemies of the group
// Costly!
Group.prototype.allEnemies = function () {
    var enemies = [];
    var enemyColor = 1 - this.color;
    for (var s, s_array = this.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        for (var en, en_array = s.neighbors, en_ndx = 0; en=en_array[en_ndx], en_ndx < en_array.length; en_ndx++) {
            if (en.color !== enemyColor) continue;

            if (enemies.indexOf(en.group) < 0) enemies.push(en.group);
        }
    }
    if (main.debugGroup) main.log.debug(this + ' has ' + enemies.length + ' enemies');
    return enemies;
};

// Counts the lives of a stone that are not already in the group
// (the stone is to be added or removed)
// NB: presupposes that stone.isNextTo(this) is true
Group.prototype.livesAddedByStone = function (stone) {
    var lives = -1; // -1 since the connection itself removes 1
    for (var life, life_array = stone.neighbors, life_ndx = 0; life=life_array[life_ndx], life_ndx < life_array.length; life_ndx++) {
        if (life.color !== EMPTY) continue;

        lives++;
        for (var s, s_array = life.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === this && s !== stone) {
                lives--;
                break;
            }
        }
    }
    if (main.debugGroup) main.log.debug(lives + ' lives added by ' + stone + ' for group ' + this);
    return lives;
};

// Connects a new stone or a merged stone to this group
Group.prototype.connectStone = function (stone) {
    if (main.debugGroup) main.log.debug('Connecting ' + stone + ' to group ' + this);

    this.stones.push(stone);
    this.lives += this.livesAddedByStone(stone);

    if (this.lives < 0) { // can be 0 if suicide-kill
        throw new Error('Unexpected error (lives<0 on connect)');
    }
    if (main.debugGroup) main.log.debug('Final group: ' + this);
};

// Disconnects a stone
Group.prototype.disconnectStone = function (stone) {
    if (main.debugGroup) main.log.debug('Disconnecting ' + stone + ' from group ' + this);

    if (this.stones.length > 1) {
        this.lives -= this.livesAddedByStone(stone);
        if (this.lives < 0) throw new Error('Lives<0 on disconnect'); // =0 if suicide-kill
    } else { // groups of 1 stone become empty groups (->garbage)
        this.goban.deleteGroup(this);
        if (main.debugGroup) main.log.debug('Group going to recycle bin: ' + this);
    }
    // we always remove them in the reverse order they came
    if (this.stones.pop() !== stone) throw new Error('Unexpected error (disconnect order)');
};

// When a new stone appears next to this group
Group.prototype.attackedBy = function (stone) {
    this.lives--;
    if (this.lives <= 0) { // also check <0 so we can raise in die_from method
        return this._dieFrom(stone);
    }
};

// When a group of stones reappears because we undo
// NB: it can never kill anything
Group.prototype._attackedByResuscitated = function (stone) {
    this.lives--;
    if (main.debugGroup) main.log.debug(this + ' attacked by resuscitated ' + stone);

    if (this.lives < 1) throw new Error('Unexpected error (lives<1 on attack by resucitated)');
};

// Stone parameter is just for debug for now
Group.prototype.notAttackedAnymore = function (stone) {
    this.lives++;
    if (main.debugGroup) main.log.debug(this + ' not attacked anymore by ' + stone);
};

// Merges a subgroup with this group
Group.prototype.merge = function (subgroup, byStone) {
    if (subgroup.mergedWith === this || subgroup === this || this.color !== subgroup.color) {
        throw new Error('Invalid merge');
    }
    if (main.debugGroup) main.log.debug('Merging subgroup:' + subgroup + ' to main:' + this);

    this.lives += subgroup.stones.length;
    for (var s, s_array = subgroup.stones, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        s.setGroupOnMerge(this);
        this.connectStone(s);
    }
    subgroup.mergedWith = this;
    subgroup.mergedBy = byStone;
    this.goban.mergedGroups.push(subgroup);
    if (main.debugGroup) main.log.debug('After merge: subgroup:' + subgroup + ' main:' + this);
};

// Reverse of merge
Group.prototype._unmerge = function (subgroup) {
    if (main.debugGroup) main.log.debug('Unmerging subgroup:' + subgroup + ' from main:' + this);

    for (var s, s_array = subgroup.stones, s_ndx = s_array.length - 1; s=s_array[s_ndx], s_ndx >= 0; s_ndx--) {
        this.disconnectStone(s);
        s.setGroupOnMerge(subgroup);
    }
    this.lives -= subgroup.stones.length;
    subgroup.mergedBy = subgroup.mergedWith = null;
    if (main.debugGroup) main.log.debug('After _unmerge: subgroup:' + subgroup + ' main:' + this);
};

Group.prototype.unmergeFrom = function (stone) {
    var mergedGroups = this.goban.mergedGroups;
    for (var last = mergedGroups.length - 1; last >= 0; last--) {
        var subgroup = mergedGroups[last];
        if (subgroup.mergedBy !== stone || subgroup.mergedWith !== this) break;
        this._unmerge(subgroup);
        mergedGroups.pop();
    }
};

// Called when the group has no more life left
Group.prototype._dieFrom = function (killerStone) {
    if (main.debugGroup) main.log.debug('Group dying: ' + this);
    if (this.lives < 0) throw new Error('Unexpected error (lives<0)');

    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        for (var enemy, enemy_array = stone.uniqueAllies(1 - this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy.notAttackedAnymore(stone);
        }
        stone.die();
    }
    this.killedBy = killerStone;
    this.goban.killedGroups.push(this);
    if (main.debugGroup) main.log.debug('Group dead: ' + this);
};

// Called when "undo" operation removes the killer stone of this group
Group.prototype._resuscitate = function () {
    this.killedBy = null;
    this.lives = 1; // always comes back with a single life
    for (var stone, stone_array = this.stones, stone_ndx = 0; stone=stone_array[stone_ndx], stone_ndx < stone_array.length; stone_ndx++) {
        stone.resuscitateIn(this);
        for (var enemy, enemy_array = stone.uniqueAllies(1 - this.color), enemy_ndx = 0; enemy=enemy_array[enemy_ndx], enemy_ndx < enemy_array.length; enemy_ndx++) {
            enemy._attackedByResuscitated(stone);
        }
    }
};

Group.resuscitateGroupsFrom = function (killerStone) {
    var killedGroups = killerStone.goban.killedGroups;
    for (var last = killedGroups.length - 1; last >= 0; last--) {
        var group = killedGroups[last];
        if (group.killedBy !== killerStone) break;
        killedGroups.pop();
        if (main.debugGroup) main.log.debug('taking back ' + killerStone + ' so we resuscitate ' + group);
        group._resuscitate();
    }
};

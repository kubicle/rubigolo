//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');

/** @class A "stone" stores everything we want to keep track of regarding an intersection on the board.
 *  By extension, an empty intersection is also a stone, with a color attribute equals to EMPTY.
 *  This class is also the entry point for moves in general, so it has methods to play or undo,
 *  and verify if a planned move is authorized.
 *  public read-only attribute: goban, group, color, i, j, neighbors
 */
function Stone(goban, i, j, color) {
    this.goban = goban;
    this.i = i;
    this.j = j;
    this.color = color;
    this.group = null;
    // @neighbors contains the neighboring stones (empty or not); no need to compute coordinates anymore
    this.neighbors = new Array(4);
    // @allies and @enemies are used as buffers for corresponding methods (unique_allies, unique_enemies etc.)
    this.allies = new Array(4);
    this.enemies = new Array(4);
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
Stone.prototype.findNeighbors = function () {
    this.neighbors.clear();
    for (var coordChange, coordChange_array = Stone.XY_AROUND, coordChange_ndx = 0; coordChange=coordChange_array[coordChange_ndx], coordChange_ndx < coordChange_array.length; coordChange_ndx++) {
        var stone = this.goban.stoneAt(this.i + coordChange[0], this.j + coordChange[1]);
        if (stone !== main.BORDER) {
            this.neighbors.push(stone);
        }
    }
};

Stone.prototype.toString = function () {
    if (this.color === main.EMPTY) {
        return 'empty:' + this.asMove();
    } else {
        return 'stone' + Grid.colorToChar(this.color) + ':' + this.asMove();
    }
};

// Returns "c3" for a stone in 3,3
Stone.prototype.asMove = function () {
    return '' + Grid.moveAsString(this.i, this.j);
};

Stone.prototype.debugDump = function () {
    return this.toString(); // we could add more info
};

// Returns the empty points around this stone
Stone.prototype.empties = function () {
    return this.neighbors.select(function (s) {
        return s.color === main.EMPTY;
    });
};

// Number of empty points around this stone
Stone.prototype.numEmpties = function () {
    var count = 0;
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === main.EMPTY) {
            count += 1;
        }
    }
    return count;
};

// Returns a string with the list of empty points, sorted (debug only)
Stone.prototype.emptiesDump = function () {
    return this.empties().map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

Stone.prototype.empty = function () {
    return this.color === main.EMPTY;
};

Stone.validMove = function (goban, i, j, color) {
    // Remark: no log here because of the noise created with web server mode
    if (!goban.validMove(i, j)) { // also checks if empty
        return false;
    }
    var stone = goban.stoneAt(i, j);
    if (stone.moveIsSuicide(color)) {
        return false;
    }
    if (stone.moveIsKo(color)) {
        return false;
    }
    return true;
};

// Is a move a suicide?
// not a suicide if 1 free life around
// or if one enemy group will be killed
// or if the result of the merge of ally groups will have more than 0 life
Stone.prototype.moveIsSuicide = function (color) {
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
Stone.prototype.moveIsKo = function (color) {
    // Must kill a single group
    var groupA = null;
    var res = true;
    this.eachEnemy(color, function (enemy) {
        if (enemy.lives !== 1) {
            return;
        }
        if (groupA) {
            res = false;
            return;
        }
        groupA = enemy;
    });
    if (!res || !groupA) {
        return false;
    }
    // This killed group must be a single stone A
    if (groupA.stones.length !== 1) {
        return false;
    }
    var stoneA = groupA.stones[0];
    // Stone A was played just now
    if (this.goban.previousStone() !== stoneA) {
        return false;
    }
    // Stone B was killed by A in same position we are looking at
    var groupB = this.goban.killedGroups[this.goban.killedGroups.length-1];
    if (groupB.killedBy !== stoneA) {
        return false;
    }
    if (groupB.stones.length !== 1) {
        return false;
    }
    var stoneB = groupB.stones[0];
    if (stoneB.i !== this.i || stoneB.j !== this.j) {
        return false;
    }
    // $log.debug("ko in #{@i}, #{@j}, color:#{color} cannot be played now") if $debug
    return true;
};

Stone.playAt = function (goban, i, j, color) {
    var stone = goban.playAt(i, j);
    stone.putDown(color);
    return stone;
};

Stone.prototype.die = function () {
    // update_around_before_die
    this.color = main.EMPTY;
    this.group = null;
};

Stone.prototype.resuscitateIn = function (group) {
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
    return stone.takeBack();
};

// Iterate through enemy groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// Example: +@@+
//          +@O+ <- for stone O, the @ group will be selected 2 times
//          ++++
Stone.prototype.eachEnemy = function (allyColor, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== allyColor) {
            cb(s.group);
        }
    }
};

Stone.prototype.uniqueEnemies = function (allyColor) {
    this.enemies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color !== main.EMPTY && s.color !== allyColor && !this.enemies.contains(s.group)) {
            this.enemies.push(s.group);
        }
    }
    return this.enemies;
};

// Iterate through our groups and calls the given block
// (same group appears more than once if it faces the stone 2 times or more)
// See also each_enemy
Stone.prototype.eachAlly = function (allyColor, cb) {
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === allyColor) {
            cb(s.group);
        }
    }
};

Stone.prototype.uniqueAllies = function (color) {
    this.allies.clear();
    for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        if (s.color === color && !this.allies.contains(s.group)) {
            this.allies.push(s.group);
        }
    }
    return this.allies;
};

// Called for each new stone played
Stone.prototype.putDown = function (color) {
    this.color = color;
    if (main.debug) {
        main.log.debug('put_down: ' + this.toString());
    }
    var allies = this.uniqueAllies(color); // note we would not need unique if group#merge ignores dupes
    if (allies.length === 0) {
        var lives = 0;
        for (var s, s_array = this.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.color === main.EMPTY) {
                lives += 1;
            }
        }
        this.group = this.goban.newGroup(this, lives);
    } else {
        this.group = allies[0];
        this.group.connectStone(this);
    }
    // kill before merging to get the right live-count in merged subgroups
    for (var g, g_array = this.uniqueEnemies(color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.attackedBy(this);
    }
    for (var a = 1; a <= allies.length - 1; a++) {
        this.group.merge(allies[a], this);
    } // update_around_on_new
};

Stone.prototype.takeBack = function () {
    if (main.debugGroup) {
        main.log.debug('take_back: ' + this.toString() + ' from group ' + this.group);
    }
    this.group.unmergeFrom(this);
    this.group.disconnectStone(this);
    for (var g, g_array = this.uniqueEnemies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.notAttackedAnymore(this);
    }
    // update_around_before_die
    if (main.debugGroup) {
        var logGroup = this.group;
    }
    this.group = null;
    this.color = main.EMPTY;
    Group.resuscitateFrom(this, this.goban);
    if (main.debugGroup) {
        return main.log.debug('take_back: end; main group: ' + logGroup.debugDump());
    }
};

Stone.prototype.setGroupOnMerge = function (newGroup) {
    this.group = newGroup;
};
 // Not used anymore but could become handy again later // def update_around_on_new //   $log.debug("update_around_on_new #{self.debug_dump}") if $debug // end // Not used anymore but could become handy again later // def update_around_before_die //   $log.debug("update_around_before_die #{self.debug_dump}") if $debug // end
// E02: unknown method: select(...)
// E02: unknown method: map(...)
// E02: unknown method: find_index(...)
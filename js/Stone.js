//Translated from stone.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');

var EMPTY = main.EMPTY, BORDER = main.BORDER;
var DIR0 = main.DIR0, DIR3 = main.DIR3;


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
    this.neighbors = []; // direct neighbors (top, right, bottom, left)
    this.allNeighbors = []; // including diagonals - top, top-right, right, bottom-right, etc.
}
module.exports = Stone;

var XY_AROUND = Stone.XY_AROUND = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // top, right, bottom, left
var XY_DIAGONAL = Stone.XY_DIAGONAL = [[1, 1], [1, -1], [-1, -1], [-1, 1]]; // top-right, bottom-right, bottom-left, top-left

Stone.prototype.clear = function () {
    this.color = EMPTY;
    this.group = null;
};

// Computes each stone's neighbors (called for each stone after init)
// NB: Stones next to side have only 3 neighbors, and the corner stones have 2
Stone.prototype.findNeighbors = function () {
    var yx = this.goban.ban;
    // NB: order in which we push neighbors should be irrelevant but is not fully
    // because TestGroup looks at group merging numbers etc. (no worry here)
    for (var n = DIR3; n >= DIR0; n--) {
        var stone = yx[this.j + XY_AROUND[n][1]][this.i + XY_AROUND[n][0]];
        if (stone !== BORDER) this.neighbors.push(stone);

        this.allNeighbors.push(stone);
        stone = yx[this.j + XY_DIAGONAL[n][1]][this.i + XY_DIAGONAL[n][0]];
        this.allNeighbors.push(stone);
    }
};

Stone.prototype.toString = function () {
    if (this.color === EMPTY) {
        return this.asMove();
    } else {
        return (this.color ? 'W' : 'B') + '-' + this.asMove();
    }
};

// Returns "c3" for a stone in 3,3
Stone.prototype.asMove = function () {
    return Grid.xy2move(this.i, this.j);
};

// Returns a string with the list of empty points, sorted (debug only)
Stone.prototype.emptiesDump = function () {
    return this.empties().map(function (s) {
        return s.asMove();
    }).sort().join(',');
};

Stone.prototype.isEmpty = function () {
    return this.color === EMPTY;
};

Stone.prototype.isCorner = function () {
    return this.neighbors.length === 2;
};

Stone.prototype.isBorder = function () {
    return this.neighbors.length <= 3; // NB: corners are borders too
};

Stone.prototype.distanceFromBorder = function () {
    var gsize = this.goban.gsize;
    var i = this.i, j = this.j;
    return Math.min(Math.min(i - 1, gsize - i), Math.min(j - 1, gsize - j));
};

// Is a move a suicide?
// not a suicide if 1 free life around
// or if one enemy group will be killed
// or if the result of the merge of ally groups will have more than 0 life
Stone.prototype.moveIsSuicide = function (color) {
    for (var i = this.neighbors.length - 1; i >= 0; i--) {
        var s = this.neighbors[i];
        if (s.color === EMPTY) {
            return false;
        } else if (s.color !== color) {
            if (s.group.lives === 1) return false; // we kill 1 group
        } else {
            if (s.group.lives > 1) return false; // our neighbor group will still have lives left
        }
    }
    return true; // move would be a suicide
};

// Is a move a ko?
// if the move would kill with stone i,j a single stone A (and nothing else!)
// and the previous move killed with stone A a single stone B in same position i,j
// then it is a ko
Stone.prototype.moveIsKo = function (color) {
    // 1) Must kill a single group
    // NB: we don't need to iterate on unique groups because on condition #2 below
    var groupA = null;
    for (var n = this.neighbors.length - 1; n >= 0; n--) {
        var enemy = this.neighbors[n].group;
        if (!enemy || enemy.color !== 1 - color) continue;
        if (enemy.lives !== 1) continue;
        if (groupA) return false;
        groupA = enemy;
    }
    if (!groupA) return false;

    // 2) This killed group must be a single stone A
    if (groupA.stones.length !== 1) {
        return false;
    }
    var stoneA = groupA.stones[0];
    // 3) Stone A was played just now
    if (this.goban.previousStone() !== stoneA) {
        return false;
    }
    // 4) Stone B was killed by A in same position we are looking at
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
    return true; // move is a ko
};

Stone.prototype.die = function () {
    this.color = EMPTY;
    this.group = null;
};

Stone.prototype.resuscitateIn = function (group) {
    this.group = group;
    this.color = group.color;
};

// Called by goban only
Stone.prototype.putDown = function (color) {
    this.color = color;

    var allies = this.uniqueAllies(color); // note we would not need unique if group#merge ignores dupes
    if (allies.length === 0) {
        this.group = this.goban.newGroup(this, this.numEmpties());
    } else {
        this.group = allies[0];
        this.group.connectStone(this);
    }
    // kill before merging to get the right live-count in merged subgroups
    var enemies = this.uniqueAllies(1 - color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        enemies[e].attackedBy(this);
    }
    for (var a = 1; a < allies.length; a++) {
        this.group.merge(allies[a], this);
    }
};

// Called by goban only
Stone.prototype.takeBack = function () {
    if (main.debugGroup) main.log.debug('takeBack: ' + this.toString() + ' from group ' + this.group);

    this.group.unmergeFrom(this);
    this.group.disconnectStone(this);
    var enemies = this.uniqueAllies(1 - this.color);
    for (var e = enemies.length - 1; e >= 0; e--) {
        enemies[e].notAttackedAnymore(this);
    }
    var logGroup;
    if (main.debugGroup) logGroup = this.group;

    this.group = null;
    this.color = EMPTY;
    Group.resuscitateFrom(this, this.goban);
    if (main.debugGroup) main.log.debug('takeBack: end; main group: ' + logGroup.debugDump());
};

Stone.prototype.setGroupOnMerge = function (newGroup) {
    this.group = newGroup;
};

Stone.prototype.uniqueAllies = function (color) {
    var allies = [];
    var neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === color && allies.indexOf(s.group) < 0) {
            allies.push(s.group);
        }
    }
    return allies;
};

// Returns the empty points around this stone
Stone.prototype.empties = function () {
    var empties = [], neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        var s = neighbors[i];
        if (s.color === EMPTY) empties.push(s);
    }
    return empties;
};

// Number of empty points around this stone
Stone.prototype.numEmpties = function () {
    var count = 0, neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].color === EMPTY) count++;
    }
    return count;
};

/** Returns the count of ally stones around.
 *  If an array is passed, the stones are pushed on it. */
Stone.prototype.allyStones = function (color, array) {
    var count = 0, neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].color === color) {
            if (array) array.push(neighbors[i]);
            count++;
        }
    }
    return count;
};

Stone.prototype.isNextTo = function (group) {
    var neighbors = this.neighbors;
    for (var i = neighbors.length - 1; i >= 0; i--) {
        if (neighbors[i].group === group) return true;
    }
    return false;
};

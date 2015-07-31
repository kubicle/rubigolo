//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../main');

var Grid = require('../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;
var Stone = require('../Stone');


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player, consultant) {
    if (consultant === undefined) consultant = false;
    Heuristic.call(this, player, consultant);
}
inherits(Hunter, Heuristic);
module.exports = Hunter;

Hunter.prototype.evalMove = function (i, j, level) {
    if (level === undefined) level = 1;
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var allies = stone.uniqueAllies(this.color);
    var egroups = null;
    var snapback = false;
    for (var eg, eg_array = stone.uniqueEnemies(this.color), eg_ndx = 0; eg=eg_array[eg_ndx], eg_ndx < eg_array.length; eg_ndx++) {
        if (eg.lives !== 2) { // NB if 1 this is a case for Executioner
            continue;
        }
        // if even a single of our groups around is in atari this will not work (enemy will kill our group and escape)
        var ourGroups = eg.allEnemies(), atariLives = 0;
        for (var n = ourGroups.length - 1; n >= 0; n--) {
            var ourGroup = ourGroups[n];
            if (ourGroup.lives === 1) {
                atariLives += ourGroup.stones.length;
                if (atariLives > 1) break;
                var enemies = ourGroup.allEnemies();
                for (var e = enemies.length - 1; e >= 0; e--) {
                    atariLives += enemies[e].lives;
                }
            }
        }
        if (atariLives > 1) continue;
        
        if (empties.length === 1 && allies.length === 0) {
            // unless this is a snapback, this is a dumb move
            // it is a snapback if the last empty point (where the enemy will have to play) 
            // would not make the enemy group connect to another enemy group
            // (equivalent to: the empty point has no other enemy group as neighbor)
            var enemiesAroundEmpty = empties[0].uniqueAllies(eg.color);
            if (enemiesAroundEmpty.length !== 1 || enemiesAroundEmpty[0] !== eg) {
                continue;
            }
            // here we know this is a snapback
            snapback = true;
            if (main.debug) main.log.debug('Hunter sees a snapback in ' + stone);
        }
        if (main.debug) main.log.debug('Hunter (level ' + level + ') looking at ' + Grid.xy2move(i, j) + ' threat on ' + eg);
        if (!egroups) egroups = [eg];
        else egroups.push(eg);
    }
    if (!egroups) return 0;

    // unless snapback, make sure our new stone's group is not in atari
    if (!snapback && empties.length < 2) {
        var lives = empties.length;
        for (var ag, ag_array = allies, ag_ndx = 0; ag=ag_array[ag_ndx], ag_ndx < ag_array.length; ag_ndx++) {
            lives += ag.lives - 1;
        }
        if (lives < 2) {
            return 0;
        }
    }
    Stone.playAt(this.goban, i, j, this.color); // our attack takes one of the 2 last lives (the one in i,j)
    // filter out the attacks that fail
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (!this.atariIsCaught(egroups[g], level)) egroups.splice(g, 1);
    }
    Stone.undo(this.goban); // important to undo before, so we compute threat right
    if (!egroups.length) return 0; // none is caught
    
    // find the bigger threat if more than 1 chase is possible
    var threat = 0;
    for (g = egroups.length - 1; g >= 0; g--) {
        var t = this.groupThreat(egroups[g]);
        if (t > threat) threat = t;
    }
    if (main.debug) main.log.debug('Hunter found a threat of ' + threat + ' at ' + Grid.xy2move(i, j));
    return threat;
};

Hunter.prototype.atariIsCaught = function (g, level) {
    if (level === undefined) level = 1;
    var allLives = g.allLives();
    if (allLives.length !== 1) {
        throw new Error('Unexpected: hunter #1: ' + allLives.length);
    }
    var lastLife = allLives[0];
    var stone = Stone.playAt(this.goban, lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this.escapingAtariIsCaught(stone, level);
    Stone.undo(this.goban);
    if (main.debug) main.log.debug('Hunter: group in atari would be caught: ' + g);
    return isCaught;
};

// stone is the atari escape move
Hunter.prototype.escapingAtariIsCaught = function (stone, level) {
    if (level === undefined) level = 1;
    var g = stone.group;
    if (g.lives > 2) {
        return false;
    }
    if (g.lives === 0) {
        return true;
    }
    // g.lives is 1 or 2
    for (var allyThreatened, allyThreatened_array = stone.neighbors, allyThreatened_ndx = 0; allyThreatened=allyThreatened_array[allyThreatened_ndx], allyThreatened_ndx < allyThreatened_array.length; allyThreatened_ndx++) {
        if (allyThreatened.color !== this.color) {
            continue;
        }
        if (allyThreatened.group.lives < g.lives) {
            return false;
        }
    }
    if (g.lives === 1) {
        return true;
    }
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) {
        throw new Error('Unexpected: hunter #2');
    }
    var e1 = empties[0]; // need to keep the empties ref since all_lives returns volatile content
    var e2 = empties[1];
    //  recursive descent
    if (main.debug) {
        main.log.debug('Enemy has 2 lives left: ' + e1 + ' and ' + e2);
    }
    return (this.evalMove(e1.i, e1.j, level + 1) > 0 || this.evalMove(e2.i, e2.j, level + 1) > 0);
};


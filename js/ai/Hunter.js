//Translated from hunter.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('./main');
var Stone = require('./Stone');
// Hunters find threats to struggling enemy groups.
// Ladder attack fits in here.
var Heuristic = require('./Heuristic');

/** @class */
function Hunter(player, consultant) {
    if (consultant === undefined) consultant = false;
    return Heuristic.call(this);
}
inherits(Hunter, Heuristic);
module.exports = Hunter;

Hunter.prototype.eval_move = function (i, j, level) {
    if (level === undefined) level = 1;
    var stone = this.goban.stone_at(i, j);
    var empties = stone.empties();
    var allies = stone.unique_allies(this.color);
    var eg1, eg2, eg3;
    eg1 = eg2 = eg3 = null;
    var snapback = false;
    for (var eg, eg_array = stone.unique_enemies(this.color), eg_ndx = 0; eg=eg_array[eg_ndx], eg_ndx < eg_array.length; eg_ndx++) {
        if (eg.lives !== 2) {
            continue;
        } // NB if 1 this is a case for Executioner
        // if even a single of our groups around is in atari this will not work (enemy will kill our group and escape)
        if (1 === eg.all_enemies().forEach(function (ag) {
            if (ag.lives < 2) {
                error_break_value((1));
            }
        })) {
            continue;
        }
        if (empties.size === 1 && allies.size === 0) {
            // unless this is a snapback, this is a dumb move
            empty = stone.neighbors.forEach(function (n) {
                var empty;
                if (n.color === main.EMPTY) {
                    error_break_value((n));
                }
            });
            // it is a snapback if the last empty point (where the enemy will have to play) 
            // would not make the enemy group connect to another enemy group
            // (equivalent to: the empty point has no other enemy group as neighbor)
            var enemies_around_empty = empty.unique_allies(eg.color);
            if (enemies_around_empty.size !== 1 || enemies_around_empty[0] !== eg) {
                continue;
            }
            // here we know this is a snapback
            snapback = true;
            if (main.debug) {
                main.log.debug('Hunter sees a snapback in ' + stone);
            }
        }
        if (main.debug) {
            main.log.debug('Hunter (level ' + level + ') looking at ' + i + ',' + j + ' threat on ' + eg);
        }
        if (!eg1) {
            eg1 = eg;
        } else if (!eg2) {
            eg2 = eg;
        } else {
            eg3 = eg;
        }
    }
    // each eg
    if (!eg1) {
        return 0;
    }
    // unless snapback, make sure our new stone's group is not in atari
    if (!snapback && empties.size < 2) {
        var lives = empties.size;
        for (var ag, ag_array = allies, ag_ndx = 0; ag=ag_array[ag_ndx], ag_ndx < ag_array.length; ag_ndx++) {
            lives += ag.lives - 1;
        }
        if (lives < 2) {
            return 0;
        }
    }
    Stone.play_at(this.goban, i, j, this.color); // our attack takes one of the 2 last lives (the one in i,j)
    // keep the max of both attacks (if both are succeeding)
    var taken = ( this.atari_is_caught(eg1, level) ? eg1.stones.size : 0 );
    var taken2 = ( eg2 && this.atari_is_caught(eg2, level) ? eg2.stones.size : 0 );
    var taken3 = ( eg3 && this.atari_is_caught(eg3, level) ? eg3.stones.size : 0 );
    if (taken < taken2) {
        taken = taken2;
    }
    if (taken < taken3) {
        taken = taken3;
    }
    Stone.undo(this.goban);
    if (main.debug && taken > 0) {
        main.log.debug('Hunter found a threat of ' + taken + ' at ' + i + ',' + j);
    }
    return taken;
};

Hunter.prototype.atari_is_caught = function (g, level) {
    if (level === undefined) level = 1;
    var all_lives = g.all_lives();
    if (all_lives.size !== 1) {
        throw new Error('Unexpected: hunter #1: ' + all_lives.size);
    }
    var last_life = all_lives[0];
    var stone = Stone.play_at(this.goban, last_life.i, last_life.j, g.color); // enemy's escape move
    var is_caught = this.escaping_atari_is_caught(stone, level);
    Stone.undo(this.goban);
    if (main.debug) {
        main.log.debug('Hunter: group in atari would be caught: ' + g);
    }
    return is_caught;
};

// stone is the atari escape move
Hunter.prototype.escaping_atari_is_caught = function (stone, level) {
    if (level === undefined) level = 1;
    var g = stone.group;
    if (g.lives > 2) {
        return false;
    }
    if (g.lives === 0) {
        return true;
    }
    // g.lives is 1 or 2
    for (var ally_threatened, ally_threatened_array = stone.neighbors, ally_threatened_ndx = 0; ally_threatened=ally_threatened_array[ally_threatened_ndx], ally_threatened_ndx < ally_threatened_array.length; ally_threatened_ndx++) {
        if (ally_threatened.color !== this.color) {
            continue;
        }
        if (ally_threatened.group.lives < g.lives) {
            return false;
        }
    }
    if (g.lives === 1) {
        return true;
    }
    var empties = stone.empties();
    if (empties.size !== 2) {
        empties = g.all_lives();
    }
    if (empties.size !== 2) {
        throw new Error('Unexpected: hunter #2');
    }
    var e1 = empties[0]; // need to keep the empties ref since all_lives returns volatile content
    var e2 = empties[1];
    //  recursive descent
    if (main.debug) {
        main.log.debug('Enemy has 2 lives left: ' + e1 + ' and ' + e2);
    }
    return (this.eval_move(e1.i, e1.j, level + 1) > 0 || this.eval_move(e2.i, e2.j, level + 1) > 0);
};

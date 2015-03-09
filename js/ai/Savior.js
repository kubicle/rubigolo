//Translated from savior.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('../main');
var Stone = require('../Stone');
// Saviors rescue ally groups in atari
var Heuristic = require('./Heuristic');
var Hunter = require('./Hunter');

/** @class */
function Savior(player) {
    Heuristic.call(this);
    this.enemy_hunter = new Hunter(player, true);
}
inherits(Savior, Heuristic);
module.exports = Savior;

Savior.prototype.init_color = function () {
    Heuristic.init_color.call(this);
    return this.enemy_hunter.init_color();
};

Savior.prototype.eval_move = function (i, j) {
    var stone = this.goban.stone_at(i, j);
    var threat = this.eval_escape(i, j, stone);
    if (main.debug && threat > 0) {
        main.log.debug('=> Savior thinks we can save a threat of ' + threat + ' in ' + i + ',' + j);
    }
    return threat;
};

//private;
Savior.prototype.eval_escape = function (i, j, stone) {
    var threat, lives_added;
    threat = lives_added = 0;
    for (var g, g_array = stone.unique_allies(this.color), g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        var new_threat = null;
        if (g.lives === 1) {
            // NB: if more than 1 group in atari, they merge if we play this "savior" stone
            new_threat = g.stones.size;
        } else if (g.lives === 2) {
            if (main.debug) {
                main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': pre-atari on ' + g);
            }
            new_threat = this.enemy_hunter.eval_move(i, j);
        }
        if (!new_threat) {
            lives_added += g.lives - 1;
        } else {
            threat += new_threat;
        }
    }
    if (threat === 0) {
        return 0;
    } // no threat
    lives_added += stone.num_empties();
    // $log.debug("Savior looking at #{i},#{j}: threat is #{threat}, lives_added is #{lives_added}") if $debug
    if (lives_added < 2) {
        return 0;
    } // nothing we can do here
    if (lives_added === 2) {
        // when we get 2 lives from the new stone, get our "consultant hunter" to evaluate if we can escape
        if (main.debug) {
            main.log.debug('Savior asking hunter to look at ' + i + ',' + j + ': threat=' + threat + ', lives_added=' + lives_added);
        }
        Stone.play_at(this.goban, i, j, this.color);
        var is_caught = this.enemy_hunter.escaping_atari_is_caught(stone);
        Stone.undo(this.goban);
        if (is_caught) {
            if (main.debug) {
                main.log.debug('Savior giving up on threat of ' + threat + ' in ' + i + ',' + j);
            }
            return 0;
        }
    }
    return threat;
};

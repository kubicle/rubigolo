//Translated from  using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('./main');
// Basic: a move that connects 2 of our groups is good.
// TODO: this could threaten our potential for keeping eyes, review this.
var Heuristic = require('Heuristic');

/** @class */
function Connector(player) {
    Heuristic.call(this);
    this.infl_coeff = get_gene('infl', 0.07, 0.01, 0.5);
    this.ally_coeff1 = get_gene('ally-1enemy', 0.33, 0.01, 1.0);
    this.ally_coeff2 = get_gene('ally-more-enemies', 1.66, 0.01, 3.0);
}
inherits(Connector, Heuristic);
module.exports = Connector;

Connector.prototype.eval_move = function (i, j) {
    // we care a lot if the enemy is able to cut us,
    // and even more if by connecting we cut them...
    // TODO: the opposite heuristic - a cutter; and make both more clever.
    var stone = this.goban.stone_at(i, j);
    var enemies = stone.unique_enemies(this.color);
    var num_enemies = enemies.size;
    var allies = stone.unique_allies(this.color);
    var num_allies = allies.size;
    if (num_allies < 2) {
        return 0;
    } // nothing to connect here
    if (num_allies === 3 && num_enemies === 0) {
        return 0;
    } // in this case we never want to connect unless enemy comes by
    if (num_allies === 4) {
        return 0;
    }
    if (num_allies === 2) {
        var s1, s2;
        s1 = s2 = null;
        var non_unique_count = 0;
        for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
            if (s.group === allies[0]) {
                s1 = s;
            }
            if (s.group === allies[1]) {
                s2 = s;
            }
            if (s.color === this.color) {
                non_unique_count += 1;
            }
        }
        if (non_unique_count === 3 && num_enemies === 0) {
            return 0;
        }
        // Case of diagonal (strong) stones (TODO: handle the case with a 3rd stone in same group than 1 or 2)
        if (non_unique_count === 2 && s1.i !== s2.i && s1.j !== s2.j) {
            // No need to connect if both connection points are free
            if (this.goban.empty(s1.i, s2.j) && this.goban.empty(s2.i, s1.j)) {
                return 0;
            }
        }
    }
    switch (num_enemies) {
    case 0:
        var eval = this.infl_coeff / this.inf.map[j][i][this.color];
        break;
    case 1:
        eval = this.ally_coeff1 * num_allies;
        break;
    default: 
        eval = this.ally_coeff2 * num_allies;
    }
    if (main.debug) {
        main.log.debug('Connector gives ' + main.strFormat('%.2f', eval) + ' to ' + i + ',' + j + ' (allies:' + num_allies + ' enemies: ' + num_enemies + ')');
    }
    return eval;
};

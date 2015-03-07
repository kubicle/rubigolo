//Translated from spacer.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var main = require('./main');
// Vague idea that playing where we already have influence is moot.
var Heuristic = require('./Heuristic');

/** @class */
function Spacer(player) {
    Heuristic.call(this);
    this.infl_coeff = get_gene('infl', 2.0, 0.0, 8.0);
    this.corner_coeff = get_gene('corner', 2.0, 0.0, 8.0);
}
inherits(Spacer, Heuristic);
module.exports = Spacer;

Spacer.prototype.eval_move = function (i, j) {
    var enemy_inf, ally_inf;
    enemy_inf = ally_inf = 0;
    var stone = this.goban.stone_at(i, j);
    var inf = this.inf.map[j][i];
    enemy_inf += inf[this.enemy_color];
    ally_inf += inf[this.color];
    for (var s, s_array = stone.neighbors, s_ndx = 0; s=s_array[s_ndx], s_ndx < s_array.length; s_ndx++) {
        inf = this.inf.map[s.j][s.i];
        enemy_inf += inf[this.enemy_color];
        ally_inf += inf[this.color];
    }
    var total_inf = enemy_inf + ally_inf;
    var corner = 3;
    var db_x = this.distance_from_border(i);
    var db_y = this.distance_from_border(j);
    var dc_x = 1 + Math.abs((db_x - corner));
    var dc_y = 1 + Math.abs((db_y - corner));
    var dc = dc_x + dc_y;
    // hacky: why play on border if no one is around?
    if (db_x < 2) {
        total_inf += (20 * (2 - db_x)) / (total_inf + 1);
    }
    if (db_y < 2) {
        total_inf += (20 * (2 - db_y)) / (total_inf + 1);
    }
    // TESTME
    // remove points only if we fill up our own territory
    var ter = this.ter.potential().yx;
    var fill_own_ter = ( this.color === main.BLACK ? ter[j][i] : -ter[j][i] );
    if (fill_own_ter > 0) {
        fill_own_ter = 0;
    } // filling up enemy's space is not looked at here
    if (main.debug && fill_own_ter !== 0) {
        main.log.debug('Spacer sees potential territory score ' + fill_own_ter + ' in ' + i + ',' + j);
    }
    return fill_own_ter + 1.33 / (total_inf * this.infl_coeff + dc * this.corner_coeff + 1);
};

Spacer.prototype.distance_from_border = function (n) {
    if (n - 1 < this.size - n) {
        return n - 1;
    } else {
        return this.size - n;
    }
};

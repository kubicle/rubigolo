//Translated from ai1_player.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var Heuristic = require('./Heuristic');
var main = require('./main');
var Grid = require('./Grid');
var Stone = require('./Stone');
// TODO: 
// - do not fill my own territory (potential territory recognition will use analyser.enlarge method)
// - identify all foolish moves (like NoEasyPrisoner but once for all) in a map that all heuristics can use
// - foresee a poursuit = on attack/defense (and/or use a reverse-killer?)
// - an eye shape constructor
var Player = require('./Player');
var Goban = require('./Goban');
var InfluenceMap = require('./InfluenceMap');
var PotentialTerritory = require('./PotentialTerritory');
var AllHeuristics = require('ai/AllHeuristics');
var TimeKeeper = require('./TimeKeeper');
var Genes = require('./Genes');
//public read-only attribute: goban, inf, ter, enemy_color, genes, last_move_score;

/** @class */
function Ai1Player(goban, color, genes) {
    if (genes === undefined) genes = null;
    main.Player.call(this, false, goban);
    this.inf = new InfluenceMap(this.goban);
    this.ter = new PotentialTerritory(this.goban);
    this.size = this.goban.size;
    this.genes = (( genes ? genes : new Genes() ));
    this.minimum_score = this.get_gene('smaller-move', 0.033, 0.02, 0.066);
    this.heuristics = [];
    this.negative_heuristics = [];
    for (var cl, cl_array = Heuristic.all_heuristics(), cl_ndx = 0; cl=cl_array[cl_ndx], cl_ndx < cl_array.length; cl_ndx++) {
        var h = new cl(this);
        if (!h.negative) {
            this.heuristics.push(h);
        } else {
            this.negative_heuristics.push(h);
        }
    }
    this.set_color(color);
    // genes need to exist before we create heuristics so passing genes below is done
    // to keep things coherent
    return this.prepare_game(this.genes); // @timer = TimeKeeper.new // @timer.calibrate(0.7)
}
inherits(Ai1Player, main.Player);
module.exports = Ai1Player;

Ai1Player.prototype.prepare_game = function (genes) {
    this.genes = genes;
    this.num_moves = 0;
};

Ai1Player.prototype.set_color = function (color) {
    main.Player.set_color.call(this, color);
    this.enemy_color = 1 - color;
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.init_color();
    }
    for (var h, h_array = this.negative_heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        h.init_color();
    }
};

Ai1Player.prototype.get_gene = function (name, def_val, low_limit, high_limit) {
    if (low_limit === undefined) low_limit = null;
    if (high_limit === undefined) high_limit = null;
    return this.genes.get(this.constructor.name + '-' + name, def_val, low_limit, high_limit);
};

// Returns the move chosen (e.g. c4 or pass)
// One can check last_move_score to see the score of the move returned
Ai1Player.prototype.get_move = function () {
    // @timer.start("AI move",0.5,3)
    this.num_moves += 1;
    if (this.num_moves >= this.size * this.size) {
        main.log.error('Forcing AI pass since we already played ' + this.num_moves);
        return 'pass';
    } // force pass after too many moves
    this.prepare_eval();
    var best_score, second_best;
    best_score = second_best = this.minimum_score;
    var best_i, best_j;
    best_i = best_j = -1;
    var best_num_twin = 0; // number of occurrence of the current best score (so we can randomly pick any of them)
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            var score = this.eval_move(i, j, best_score);
            // Keep the best move
            if (score > best_score) {
                second_best = best_score;
                if (main.debug) {
                    main.log.debug('=> ' + Grid.move_as_string(i, j) + ' becomes the best move with ' + score + ' (2nd best is ' + Grid.move_as_string(best_i, best_j) + ' with ' + best_score + ')');
                }
                best_score = score;
                best_i = i;
                best_j = j;
                best_num_twin = 1;
            } else if (score === best_score) {
                best_num_twin += 1;
                if (~~(Math.random()*~~(best_num_twin)) === 0) {
                    if (main.debug) {
                        main.log.debug('=> ' + Grid.move_as_string(i, j) + ' replaces equivalent best move with ' + score + ' (equivalent best was ' + Grid.move_as_string(best_i, best_j) + ')');
                    }
                    best_score = score;
                    best_i = i;
                    best_j = j;
                }
            } else if (score >= second_best) {
                if (main.debug) {
                    main.log.debug('=> ' + Grid.move_as_string(i, j) + ' is second best move with ' + score + ' (best is ' + Grid.move_as_string(best_i, best_j) + ' with ' + best_score + ')');
                }
                second_best = score;
            }
        }
    }
    this.last_move_score = best_score;
    // @timer.stop(false) # false: no exception if it takes longer but an error in the log
    if (best_score > this.minimum_score) {
        return Grid.move_as_string(best_i, best_j);
    }
    if (main.debug) {
        main.log.debug('AI is passing...');
    }
    return 'pass';
};

Ai1Player.prototype.prepare_eval = function () {
    this.inf.build_map();
    return this.ter.guess_territories();
};

Ai1Player.prototype.eval_move = function (i, j, best_score) {
    if (best_score === undefined) best_score = this.minimum_score;
    if (!Stone.valid_move(this.goban, i, j, this.color)) {
        return 0.0;
    }
    var score = 0.0;
    // run all positive heuristics
    for (var h, h_array = this.heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
        score += h.eval_move(i, j);
    }
    // we run negative heuristics only if this move was a potential candidate
    if (score >= best_score) {
        for (var h, h_array = this.negative_heuristics, h_ndx = 0; h=h_array[h_ndx], h_ndx < h_array.length; h_ndx++) {
            score += h.eval_move(i, j);
            if (score < best_score) {
                break;
            }
        }
    }
    return score;
};

//Translated from breeder.rb using babyruby2js
'use strict';

var main = require('./main');
var Genes = require('./Genes');
var Breeder = require('./Breeder');
//require 'trollop';
var Logging = require('./Logging');
var TimeKeeper = require('./TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');
var Ai1Player = require('./Ai1Player');
main.debug_breed = false; // TODO move me somewhere else?
Breeder.GENERATION_SIZE = 26; // must be even number
Breeder.MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
Breeder.WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
Breeder.KOMI = 4.5;
Breeder.TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game

/** @class */
function Breeder(game_size) {
    this.size = game_size;
    this.timer = new TimeKeeper();
    this.timer.calibrate(0.7);
    this.game = new GameLogic();
    this.game.messages_to_console(true);
    this.game.set_log_level('all=0');
    this.game.new_game(this.size);
    this.goban = this.game.goban;
    this.players = [new Ai1Player(this.goban, main.BLACK), new Ai1Player(this.goban, main.WHITE)];
    this.scorer = new ScoreAnalyser();
    this.gen_size = Breeder.GENERATION_SIZE;
    return this.first_generation();
}
module.exports = Breeder;

Breeder.prototype.first_generation = function () {
    this.control_genes = this.players[0].genes.clone();
    this.generation = [];
    this.new_generation = [];
    for (var i = 1; i <= this.gen_size; i++) {
        this.generation.push(this.players[0].genes.clone().mutate_all());
        this.new_generation.push(new Genes());
    }
    this.score_diff = [];
};

Breeder.prototype.play_until_game_ends = function () {
    while (!this.game.game_ending) {
        var cur_player = this.players[this.game.cur_color];
        var move = cur_player.get_move();
        try {
            this.game.play_one_move(move);
        } catch (err) {
            console.log('' + err);
            console.log('Exception occurred during a breeding game.\n' + cur_player + ' with genes: ' + cur_player.genes);
            console.log(this.game.history_string());
            throw err;
        }
    }
};

// Plays a game and returns the score difference in points
Breeder.prototype.play_game = function (name1, name2, p1, p2) {
    // @timer.start("AI VS AI game",0.5,3)
    this.game.new_game(this.size, 0, Breeder.KOMI);
    this.players[0].prepare_game(p1);
    this.players[1].prepare_game(p2);
    this.play_until_game_ends();
    var score_diff = this.scorer.compute_score_diff(this.goban, Breeder.KOMI);
    // @timer.stop(false) # no exception if it takes longer but an error in the log
    if (main.debug_breed) {
        main.log.debug('\n#' + name1 + ':' + p1 + '\nagainst\n#' + name2 + ':' + p2);
    }
    if (main.debug_breed) {
        main.log.debug('Distance: ' + main.strFormat('%.02f', p1.distance(p2)));
    }
    if (main.debug_breed) {
        main.log.debug('Score: ' + score_diff);
    }
    if (main.debug_breed) {
        main.log.debug('Moves: ' + this.game.history_string());
    }
    if (main.debug_breed) {
        this.goban.console_display();
    }
    return score_diff;
};

Breeder.prototype.run = function (num_tournaments, num_match_per_ai) {
    for (var i = 1; i <= num_tournaments; i++) {
        this.timer.start('Breeding tournament ' + i + 1 + '/' + num_tournaments + ': each of ' + this.gen_size + ' AIs plays ' + num_match_per_ai + ' games', 5.5, 36);
        this.one_tournament(num_match_per_ai);
        this.timer.stop(false);
        this.reproduction();
        this.control();
    } // TODO: Find a way to appreciate the progress
};

// NB: we only update score for black so komi unbalance does not matter.
// Sadly this costs us a lot: we need to play twice more games to get score data...
Breeder.prototype.one_tournament = function (num_match_per_ai) {
    if (main.debug_breed) {
        main.log.debug('One tournament starts for ' + this.generation.size + ' AIs');
    }
    for (var p1 = 1; p1 <= this.gen_size; p1++) {
        this.score_diff[p1] = 0;
    }
    for (var i = 1; i <= num_match_per_ai; i++) {
        for (var p1 = 1; p1 <= this.gen_size; p1++) {
            var p2 = ~~(Math.random()*~~(this.gen_size - 1));
            if (p2 === p1) {
                p2 = this.gen_size - 1;
            }
            var diff = this.play_game(p1.to_s(), p2.to_s(), this.generation[p1], this.generation[p2]);
            if (Math.abs(diff) < Breeder.TOO_SMALL_SCORE_DIFF) {
                diff = 0;
            } else {
                diff = Math.abs(diff) / diff; // get sign of diff only -> -1,+1
            }
            // diff is now -1, 0 or +1
            this.score_diff[p1] += diff;
            if (main.debug_breed) {
                main.log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' + p1 + ':' + this.score_diff[p1] + ', #' + p2 + ':' + this.score_diff[p2]);
            }
        }
    }
    return this.rank;
};

Breeder.prototype.reproduction = function () {
    if (main.debug_breed) {
        main.log.debug('=== Reproduction time for ' + this.generation.size + ' AI');
    }
    this.picked = new main.Array(this.gen_size, 0);
    this.max_score = Math.max.apply(Math,this.score_diff);
    this.winner = this.generation[this.score_diff.find_index(this.max_score)];
    this.pick_index = 0;
    for (var i = 0; i <= this.gen_size - 1; i += 2) {
        var parent1 = this.pick_parent();
        var parent2 = this.pick_parent();
        parent1.mate(parent2, this.new_generation[i], this.new_generation[i + 1], Breeder.MUTATION_RATE, Breeder.WIDE_MUTATION_RATE);
    }
    if (main.debug_breed) {
        for (var i = 1; i <= this.gen_size; i++) {
            main.log.debug('#' + i + ', score ' + this.score_diff[i] + ', picked ' + this.picked[i] + ' times');
        }
    }
    // swap new generation to replace old one
    var swap = this.generation;
    this.generation = this.new_generation;
    this.new_generation = swap;
    this.generation[0] = this.winner; // TODO review this; we force the winner (a parent) to stay alive
};

Breeder.prototype.pick_parent = function () {
    while (true) {
        var i = this.pick_index;
        this.pick_index = (this.pick_index + 1) % this.gen_size;
        if (Math.random() < this.score_diff[i] / this.max_score) {
            this.picked[i] += 1;
            // $log.debug("Picked parent #{i} (score #{@score_diff[i]})") if $debug_breed
            return this.generation[i];
        }
    }
};

Breeder.prototype.control = function () {
    var previous = main.debug_breed;
    main.debug_breed = false;
    var num_control_games = 30;
    main.log.debug('Playing ' + num_control_games * 2 + ' games to measure the current winner against our control AI...');
    var total_score, num_wins, num_wins_w;
    total_score = num_wins = num_wins_w = 0;
    for (var i = 1; i <= num_control_games; i++) {
        var score = this.play_game('control', 'winner', this.control_genes, this.winner);
        var score_w = this.play_game('winner', 'control', this.winner, this.control_genes);
        if (score > 0) {
            num_wins += 1;
        }
        if (score_w < 0) {
            num_wins_w += 1;
        }
        total_score += score - score_w;
    }
    main.debug_breed = true;
    if (main.debug_breed) {
        main.log.debug('Average score: ' + total_score / num_control_games);
    }
    if (main.debug_breed) {
        main.log.debug('Winner genes: ' + this.winner);
    }
    if (main.debug_breed) {
        main.log.debug('Distance between control and current winner genes: ' + main.strFormat('%.02f', this.control_genes.distance(this.winner)));
    }
    if (main.debug_breed) {
        main.log.debug('Total score of control against current winner: ' + total_score + ' (out of ' + num_control_games * 2 + ' games, control won ' + num_wins + ' as black and ' + num_wins_w + ' as white)');
    }
    main.debug_breed = previous;
};

// Play many games AI VS AI to verify black/white balance
Breeder.prototype.bw_balance_check = function (num_games, size) {
    this.timer.start('bw_balance_check', num_games / 1000.0 * 50, num_games / 1000.0 * 512);
    main.log.debug('Checking black/white balance by playing ' + num_games + ' games (komi=' + Breeder.KOMI + ')...');
    var total_score, num_wins;
    total_score = num_wins = 0;
    for (var i = 1; i <= num_games; i++) {
        var score = this.play_game('control', 'control', this.control_genes, this.control_genes);
        if (score > 0) {
            num_wins += 1;
        }
        if (score === 0) {
            throw new Error('tie game?!');
        }
        total_score += score;
    }
    this.timer.stop(false); // size == 9) # if size is not 9 our perf numbers are of course meaningless
    main.log.debug('Average score of control against itself: ' + total_score / num_games);
    main.log.debug('Out of ' + num_games + ' games, black won ' + num_wins + ' times');
    return num_wins;
};

if (!main.test_all && !main.test) {
    opts = main.Trollop.options(function () {
        var opts;
        opt('size', 'Goban size', {'default':9});
        opt('num_tour', 'Number of tournaments', {'default':2});
        return opt('match_per_ai', 'Number of matches per AI per tournament', {'default':3});
    });
    var breeder = new Breeder(opts['size']);
    breeder.run(opts['num_tour'], opts['match_per_ai']);
}
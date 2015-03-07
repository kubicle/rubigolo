//Translated from  using babyruby2js
'use strict';

var Grid = require('./Grid');
var main = require('./main');
var ConsoleGame = require('./ConsoleGame');
//require 'trollop';
var Logging = require('Logging');
var GameLogic = require('GameLogic');
var ScoreAnalyser = require('ScoreAnalyser');
var Ai1Player = require('Ai1Player');
var ConsoleHumanPlayer = require('ConsoleHumanPlayer');
// Create game & players

/** @class */
function ConsoleGame(opts) {
    this.game = new GameLogic();
    this.game.messages_to_console(true);
    this.game.new_game(opts['size'], opts.handicap);
    this.goban = this.game.goban;
    this.players = [];
    for (var color = 1; color <= 2; color++) {
        this.players[color] = ( opts.ai() > color ? new Ai1Player(this.goban, color) : new ConsoleHumanPlayer(this.goban, color) );
    }
    if (opts.load()) {
        this.game.load_moves(opts.load());
    }
    // if no human is playing we create one to allow human interaction
    this.spectator = ( opts.ai() >= 2 ? new ConsoleHumanPlayer(this.goban, -1) : null );
    this.scorer = new ScoreAnalyser();
}
module.exports = ConsoleGame;

// Show prisoner counts during the game  
ConsoleGame.prototype.show_prisoners = function () {
    var prisoners = this.game.prisoners();
    for (var c = 1; c <= prisoners.size; c++) {
        console.log(prisoners[c] + ' ' + Grid.COLOR_NAMES[c] + ' (' + Grid.COLOR_CHARS[c] + ') are prisoners');
    }
    console.log('');
};

ConsoleGame.prototype.propose_console_end = function () {
    var text = this.scorer.compute_score(this.goban, this.game.komi, this.game.who_resigned);
    console.log(this.goban.scoring_grid.to_text(function (c) {
        return Grid.COLOR_CHARS[c];
    }));
    for (var line, line_array = text, line_ndx = 0; line=line_array[line_ndx], line_ndx < line_array.length; line_ndx++) {
        console.log(line);
    }
    // We ask human players; AI always accepts
    for (var player, player_array = this.players, player_ndx = 0; player=player_array[player_ndx], player_ndx < player_array.length; player_ndx++) {
        if (player.is_human && !player.propose_score()) {
            // Ending refused, we will keep on playing
            this.game.accept_ending(false);
            return;
        }
    }
    return this.game.accept_ending(true);
};

ConsoleGame.prototype.get_move_or_cmd = function () {
    if (!this.spectator || this.num_autoplay > 0) {
        this.num_autoplay -= 1;
        return this.players[this.game.cur_color].get_move();
    } else {
        return this.spectator.get_move(this.game.cur_color);
    }
};

ConsoleGame.prototype.play_move_or_cmd = function (move) {
    if (move.start_with('cont')) {
        this.num_autoplay = parseInt(move.split(':')[1], 10);
        if (this.num_autoplay === 0) {
            this.num_autoplay = 1;
        } // no arg is equivalent to continue:1
    } else if (move.start_with('pris')) {
        return this.show_prisoners();
    } else if (move.start_with('hist')) {
        console.log(this.game.history_string());
    } else if (move === 'dbg') {
        return this.goban.debug_display();
    } else if (move === 'help') {
        console.log('Move (e.g. b3) or pass, undo, resign, history, dbg, log:(level)=(1/0), load:(moves), continue:(times)');
        console.log('Four letter abbreviations are accepted, e.g. "hist" is valid to mean "history"');
    } else {
        return this.game.play_one_move(move);
    } // this help is for console only
};

ConsoleGame.prototype.play_game = function () {
    this.num_autoplay = 0;
    while (!this.game.game_ended) {
        if (this.game.game_ending) {
            this.propose_console_end();
            continue;
        }
        var move = this.get_move_or_cmd();
        this.play_move_or_cmd(move);
    }
    console.log('Game ended.');
    console.log(this.game.history_string());
};

opts = main.Trollop.options(function () {
    var opts;
    opt('size', 'Goban size', {'default':9});
    opt('ai', 'How many AI players', {'default':2});
    opt('handicap', 'Number of handicap stones', {'default':0});
    return opt('load', 'Game to load like e4,c3,d5', {'type':'string'});
});
console.log('Command line options received: ' + opts);
// Start the game
new ConsoleGame(opts).play_game();
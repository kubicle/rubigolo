//Translated from breeder.rb using babyruby2js
'use strict';

var main = require('./main');
var Genes = require('./Genes');
//require 'trollop';
var TimeKeeper = require('./TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');
var Ai1Player = require('./Ai1Player');
main.debugBreed = false; // TODO move me somewhere else?

/** @class */
function Breeder(gameSize) {
    this.gsize = gameSize;
    this.timer = new TimeKeeper();
    this.timer.calibrate(0.7);
    this.game = new GameLogic();
    this.game.messagesToConsole(true);
    this.game.setLogLevel('all=0');
    this.game.newGame(this.gsize);
    this.goban = this.game.goban;
    this.players = [new Ai1Player(this.goban, main.BLACK), new Ai1Player(this.goban, main.WHITE)];
    this.scorer = new ScoreAnalyser();
    this.genSize = Breeder.GENERATION_SIZE;
    return this.firstGeneration();
}
module.exports = Breeder;

Breeder.GENERATION_SIZE = 26; // must be even number
Breeder.MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
Breeder.WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
Breeder.KOMI = 4.5;
Breeder.TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game
Breeder.prototype.firstGeneration = function () {
    this.controlGenes = this.players[0].genes.clone();
    this.generation = [];
    this.newGeneration = [];
    for (var i = 1; i <= this.genSize; i++) {
        this.generation.push(this.players[0].genes.clone().mutateAll());
        this.newGeneration.push(new Genes());
    }
    this.scoreDiff = [];
};

Breeder.prototype.playUntilGameEnds = function () {
    while (!this.game.gameEnding) {
        var curPlayer = this.players[this.game.curColor];
        var move = curPlayer.getMove();
        try {
            this.game.playOneMove(move);
        } catch (err) {
            console.log('' + err);
            console.log('Exception occurred during a breeding game.\n' + curPlayer + ' with genes: ' + curPlayer.genes);
            console.log(this.game.historyString());
            throw err;
        }
    }
};

// Plays a game and returns the score difference in points
Breeder.prototype.playGame = function (name1, name2, p1, p2) {
    // @timer.start("AI VS AI game",0.5,3)
    this.game.newGame(this.gsize, 0, Breeder.KOMI);
    this.players[0].prepareGame(p1);
    this.players[1].prepareGame(p2);
    this.playUntilGameEnds();
    var scoreDiff = this.scorer.computeScoreDiff(this.goban, Breeder.KOMI);
    // @timer.stop(false) # no exception if it takes longer but an error in the log
    if (main.debugBreed) {
        main.log.debug('\n#' + name1 + ':' + p1 + '\nagainst\n#' + name2 + ':' + p2);
    }
    if (main.debugBreed) {
        main.log.debug('Distance: ' + '%.02f'.format(p1.distance(p2)));
    }
    if (main.debugBreed) {
        main.log.debug('Score: ' + scoreDiff);
    }
    if (main.debugBreed) {
        main.log.debug('Moves: ' + this.game.historyString());
    }
    if (main.debugBreed) {
        this.goban.consoleDisplay();
    }
    return scoreDiff;
};

Breeder.prototype.run = function (numTournaments, numMatchPerAi) {
    for (var i = 1; i <= numTournaments; i++) { // TODO: Find a way to appreciate the progress
        this.timer.start('Breeding tournament ' + i + 1 + '/' + numTournaments + ': each of ' + this.genSize + ' AIs plays ' + numMatchPerAi + ' games', 5.5, 36);
        this.oneTournament(numMatchPerAi);
        this.timer.stop(false);
        this.reproduction();
        this.control();
    }
};

// NB: we only update score for black so komi unbalance does not matter.
// Sadly this costs us a lot: we need to play twice more games to get score data...
Breeder.prototype.oneTournament = function (numMatchPerAi) {
    if (main.debugBreed) {
        main.log.debug('One tournament starts for ' + this.generation.length + ' AIs');
    }
    for (var p1 = 1; p1 <= this.genSize; p1++) {
        this.scoreDiff[p1] = 0;
    }
    for (var _i = 1; _i <= numMatchPerAi; _i++) {
        for (p1 = 1; p1 <= this.genSize; p1++) {
            var p2 = ~~(Math.random()*~~(this.genSize - 1));
            if (p2 === p1) {
                p2 = this.genSize - 1;
            }
            var diff = this.playGame(p1.toString(), p2.toString(), this.generation[p1], this.generation[p2]);
            if (Math.abs(diff) < Breeder.TOO_SMALL_SCORE_DIFF) {
                diff = 0;
            } else {
                diff = Math.abs(diff) / diff; // get sign of diff only -> -1,+1
            }
            // diff is now -1, 0 or +1
            this.scoreDiff[p1] += diff;
            if (main.debugBreed) {
                main.log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' + p1 + ':' + this.scoreDiff[p1] + ', #' + p2 + ':' + this.scoreDiff[p2]);
            }
        }
    }
    return this.rank;
};

Breeder.prototype.reproduction = function () {
    if (main.debugBreed) {
        main.log.debug('=== Reproduction time for ' + this.generation.length + ' AI');
    }
    this.picked = Array.new(this.genSize, 0);
    this.maxScore = Math.max.apply(Math, this.scoreDiff);
    this.winner = this.generation[this.scoreDiff.indexOf(this.maxScore)];
    this.pickIndex = 0;
    for (var i = 0; i <= this.genSize - 1; i += 2) {
        var parent1 = this.pickParent();
        var parent2 = this.pickParent();
        parent1.mate(parent2, this.newGeneration[i], this.newGeneration[i + 1], Breeder.MUTATION_RATE, Breeder.WIDE_MUTATION_RATE);
    }
    if (main.debugBreed) {
        for (i = 1; i <= this.genSize; i++) {
            main.log.debug('#' + i + ', score ' + this.scoreDiff[i] + ', picked ' + this.picked[i] + ' times');
        }
    }
    // swap new generation to replace old one
    var swap = this.generation;
    this.generation = this.newGeneration;
    this.newGeneration = swap;
    this.generation[0] = this.winner; // TODO review this; we force the winner (a parent) to stay alive
};

Breeder.prototype.pickParent = function () {
    while (true) {
        var i = this.pickIndex;
        this.pickIndex = (this.pickIndex + 1) % this.genSize;
        if (Math.random() < this.scoreDiff[i] / this.maxScore) {
            this.picked[i] += 1;
            // $log.debug("Picked parent #{i} (score #{@score_diff[i]})") if $debug_breed
            return this.generation[i];
        }
    }
};

Breeder.prototype.control = function () {
    var totalScore, numWins, numWinsW;
    var previous = main.debugBreed;
    main.debugBreed = false;
    var numControlGames = 30;
    main.log.debug('Playing ' + numControlGames * 2 + ' games to measure the current winner against our control AI...');
    totalScore = numWins = numWinsW = 0;
    for (var _i = 1; _i <= numControlGames; _i++) {
        var score = this.playGame('control', 'winner', this.controlGenes, this.winner);
        var scoreW = this.playGame('winner', 'control', this.winner, this.controlGenes);
        if (score > 0) {
            numWins += 1;
        }
        if (scoreW < 0) {
            numWinsW += 1;
        }
        totalScore += score - scoreW;
    }
    main.debugBreed = true;
    if (main.debugBreed) {
        main.log.debug('Average score: ' + totalScore / numControlGames);
    }
    if (main.debugBreed) {
        main.log.debug('Winner genes: ' + this.winner);
    }
    if (main.debugBreed) {
        main.log.debug('Distance between control and current winner genes: ' + '%.02f'.format(this.controlGenes.distance(this.winner)));
    }
    if (main.debugBreed) {
        main.log.debug('Total score of control against current winner: ' + totalScore + ' (out of ' + numControlGames * 2 + ' games, control won ' + numWins + ' as black and ' + numWinsW + ' as white)');
    }
    main.debugBreed = previous;
};

// Play many games AI VS AI to verify black/white balance
Breeder.prototype.bwBalanceCheck = function (numGames, gsize) {
    var totalScore, numWins;
    this.timer.start('bw_balance_check', numGames / 1000.0 * 50, numGames / 1000.0 * 512);
    main.log.debug('Checking black/white balance by playing ' + numGames + ' games (komi=' + Breeder.KOMI + ')...');
    totalScore = numWins = 0;
    for (var _i = 1; _i <= numGames; _i++) {
        var score = this.playGame('control', 'control', this.controlGenes, this.controlGenes);
        if (score > 0) {
            numWins += 1;
        }
        if (score === 0) {
            throw new Error('tie game?!');
        }
        totalScore += score;
    }
    this.timer.stop(false); // gsize == 9) # if gsize is not 9 our perf numbers are of course meaningless
    main.log.debug('Average score of control against itself: ' + totalScore / numGames);
    main.log.debug('Out of ' + numGames + ' games, black won ' + numWins + ' times');
    return numWins;
};

if (!main.testAll && !main.test) {
    var opts = main.Trollop.options(function () {
        opt('size', 'Goban size', {'default':9});
        opt('num_tour', 'Number of tournaments', {'default':2});
        return opt('match_per_ai', 'Number of matches per AI per tournament', {'default':3});
    });
    var breeder = new Breeder(opts['size']);
    breeder.run(opts['num_tour'], opts['match_per_ai']);
}
// E02: unknown method find_index(...)
// E02: unknown method opt(...)
// W02: Unknown class supposed to be attached to main: Trollop
// E02: unknown method options(...)
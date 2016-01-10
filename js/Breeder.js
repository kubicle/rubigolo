//Translated from breeder.rb using babyruby2js
'use strict';

var main = require('./main');
var Genes = require('./Genes');
var TimeKeeper = require('./test/TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');

var BLACK = main.BLACK, WHITE = main.WHITE;

main.debugBreed = false; // TODO move me somewhere else?


/** @class */
function Breeder(gameSize, komi) {
    this.gsize = gameSize;
    this.komi = komi;
    this.timer = new TimeKeeper();
    this.game = new GameLogic();
    this.game.switchConsoleMode(true);
    this.game.setLogLevel('all=0');
    this.game.newGame(this.gsize);
    this.goban = this.game.goban;
    this.players = [
        new main.ais.Droopy(this.goban, BLACK),
        new main.defaultAi(this.goban, WHITE)
    ];
    this.scorer = new ScoreAnalyser();
    this.genSize = Breeder.GENERATION_SIZE;
    this.firstGeneration();
    this.seenGames = {};
}
module.exports = Breeder;

Breeder.GENERATION_SIZE = 26; // must be even number
Breeder.MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
Breeder.WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
Breeder.TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game


Breeder.prototype.firstGeneration = function () {
    this.controlGenes = this.players[0].genes.clone();
    this.generation = [];
    this.newGeneration = [];
    for (var i = 0; i < this.genSize; i++) {
        this.generation.push(this.players[0].genes.clone().mutateAll());
        this.newGeneration.push(new Genes());
    }
    this.scoreDiff = [];
};

Breeder.prototype.showInUi = function (title, msg) {
    if (main.testUi) main.testUi.showTestGame(title, msg, this.game);
};

Breeder.prototype.playUntilGameEnds = function () {
    var game = this.game;
    while (!game.gameEnding) {
        var curPlayer = this.players[game.curColor];
        var move = curPlayer.getMove();
        game.playOneMove(move);
    }
    // Keep track of games we already saw
    var img = game.goban.buildCompressedImage();
    if (!this.seenGames[img]) this.seenGames[img] = 1;
    else this.seenGames[img]++;
};

// Plays a game and returns the score difference in points
Breeder.prototype.playGame = function (name1, name2, p1, p2) {
    this.game.newGame(this.gsize, 0, this.komi);
    this.players[0].prepareGame(p1);
    this.players[1].prepareGame(p2);
    var scoreDiff;
    try {
        this.playUntilGameEnds();
        scoreDiff = this.scorer.computeScoreDiff(this.goban, this.komi);
    } catch (err) {
        main.log.error('Exception occurred during a breeding game: ' + err);
        main.log.error(this.game.historyString());
        this.showInUi('Exception in breeding game', err);
        throw err;
    }
    if (main.debugBreed) {
        main.log.debug('\n#' + name1 + ':' + p1 + '\nagainst\n#' + name2 + ':' + p2);
        main.log.debug('Distance: ' + '%.02f'.format(p1.distance(p2)));
        main.log.debug('Score: ' + scoreDiff);
        main.log.debug('Moves: ' + this.game.historyString());
        main.log.debug(this.goban.toString());
    }
    return scoreDiff;
};

Breeder.prototype.run = function (numTournaments, numMatchPerAi) {
    for (var i = 1; i <= numTournaments; i++) { // TODO: Find a way to appreciate the progress
        var tournamentDesc = 'Breeding tournament ' + i + '/' + numTournaments +
            ': each of ' + this.genSize + ' AIs plays ' + numMatchPerAi + ' games';
        this.timer.start(tournamentDesc, 5.5);
        this.oneTournament(numMatchPerAi);
        this.timer.stop(/*lenientIfSlow=*/true);
        this.reproduction();
        this.control();
    }
};

// NB: we only update score for black so komi unbalance does not matter.
// Sadly this costs us a lot: we need to play twice more games to get score data...
Breeder.prototype.oneTournament = function (numMatchPerAi) {
    if (main.debugBreed) main.log.debug('One tournament starts for ' + this.generation.length + ' AIs');

    for (var p1 = 0; p1 < this.genSize; p1++) {
        this.scoreDiff[p1] = 0;
    }
    for (var i = 0; i < numMatchPerAi; i++) {
        for (p1 = 0; p1 < this.genSize; p1++) {
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
            if (main.debugBreed) main.log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' +
                p1 + ':' + this.scoreDiff[p1] + ', #' + p2 + ':' + this.scoreDiff[p2]);
        }
    }
    return this.rank;
};

Breeder.prototype.reproduction = function () {
    if (main.debugBreed) main.log.debug('=== Reproduction time for ' + this.generation.length + ' AI');

    this.picked = main.newArray(this.genSize, 0);
    this.maxScore = Math.max.apply(Math, this.scoreDiff);
    this.winner = this.generation[this.scoreDiff.indexOf(this.maxScore)];
    this.pickIndex = 0;
    for (var i = 0; i <= this.genSize - 1; i += 2) {
        var parent1 = this.pickParent();
        var parent2 = this.pickParent();
        parent1.mate(parent2, this.newGeneration[i], this.newGeneration[i + 1], Breeder.MUTATION_RATE, Breeder.WIDE_MUTATION_RATE);
    }
    if (main.debugBreed) {
        for (i = 0; i < this.genSize; i++) {
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
    for (;;) {
        var i = this.pickIndex;
        this.pickIndex = (this.pickIndex + 1) % this.genSize;
        if (Math.random() < this.scoreDiff[i] / this.maxScore) {
            this.picked[i]++;
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
    for (var i = 0; i < numControlGames; i++) {
        var score = this.playGame('control', 'winner', this.controlGenes, this.winner);
        var scoreW = this.playGame('winner', 'control', this.winner, this.controlGenes);
        if (score > 0) numWins++;
        if (scoreW < 0) numWinsW++;
        totalScore += score - scoreW;
    }
    if (main.debug) main.log.debug('Average score: ' + totalScore / numControlGames +
        '\nWinner genes: ' + this.winner +
        '\nDistance between control and current winner: ' + this.controlGenes.distance(this.winner).toFixed(2) +
        '\nTotal score of control against current winner: ' + totalScore +
        ' (out of ' + numControlGames * 2 + ' games, control won ' +
        numWins + ' as black and ' + numWinsW + ' as white)');
    main.debugBreed = previous;
};

// Play many games AI VS AI to verify black/white balance
// Returns the number of games won by White
Breeder.prototype.bwBalanceCheck = function (numGames, gsize, numLostGamesShowed) {
    var blackAi = this.players[BLACK].version, whiteAi = this.players[WHITE].version;
    var desc = numGames + ' games on ' + gsize + 'x' + gsize + ', komi=' + this.komi + ', ' +
        whiteAi + ' VS ' + blackAi + '(B)';
    var expectedDuration = gsize === 9 ? numGames * 0.05 : undefined;

    this.timer.start(desc, expectedDuration);
    var totalScore = 0, numWins = 0, numCloseMatch = 0, numMoves = 0, numRandom = 0;
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame('control', 'control', this.controlGenes, this.controlGenes);
        if (score === 0) throw new Error('Unexpected tie game');
        if (score > 0) {
            numWins++; // Black won
            if (numWins <= numLostGamesShowed)
                this.showInUi('Lost breeding game #' + numWins, this.game.historyString());
        }
        if (Math.abs(score) < 3) numCloseMatch++;
        totalScore += score;
        numMoves += this.game.history.length;
        numRandom += this.players[WHITE].numRandomPicks;
    }
    this.timer.stop(/*lenientIfSlow=*/true);

    var dupes = 0;
    for (i in this.seenGames) { dupes += this.seenGames[i] - 1; }

    main.log.info('Average score difference: ' + (-totalScore / numGames).toFixed(1));
    main.log.info('Close match (score diff < 3 pts): ' + ~~(numCloseMatch / numGames * 100) + '%');
    main.log.info('Average number of moves: ' + ~~(numMoves / numGames));
    main.log.info('Average number of times White picked at random between equivalent moves: ' + (numRandom / numGames).toFixed(1));
    main.log.info('Average time per move: ' + (this.timer.duration * 1000 / numMoves).toFixed(1) + 'ms');
    main.log.info('Dupe games: ' + ~~(dupes / numGames * 100) + '%');
    main.log.info('Won games for White-' + whiteAi +
        ' VS Black-' + blackAi + ': ' + ((numGames - numWins) / numGames * 100).toFixed(1) + '%');

    return numGames - numWins; // number of White's victory
};

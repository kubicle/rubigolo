'use strict';

var CONST = require('./constants');
var Genes = require('./Genes');
var Grid = require('./Grid');
var log = require('./log');
var main = require('./main');
var TimeKeeper = require('./test/TimeKeeper');
var GameLogic = require('./GameLogic');
var ScoreAnalyser = require('./ScoreAnalyser');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;

var MUTATION_RATE = 0.03; // e.g. 0.02 is 2%
var WIDE_MUTATION_RATE = 0.1; // how often do we "widely" mutate
var TOO_SMALL_SCORE_DIFF = 3; // if final score is less that this, see it as a tie game


/** @class */
function Breeder(gameSize, komi) {
    this.gsize = gameSize;
    this.komi = komi;
    this.timer = new TimeKeeper();
    this.game = new GameLogic();
    this.game.setRules(CONST.JP_RULES);
    this.game.newGame(this.gsize);
    this.goban = this.game.goban;
    this.scorer = new ScoreAnalyser(this.game);
    this.genSize = 26; // default; must be even number
    this.seenGames = {};
    this.skipDupeEndings = false;

    this.controlGenes = null;
    this.players = [];
    this.generation = this.newGeneration = this.scoreDiff = null;
}
module.exports = Breeder;


function getAiName(Ai) { return Ai.publicName + '-' + Ai.publicVersion; }

Breeder.prototype.initPlayers = function (BlackAi, WhiteAi) {
    for (var color = BLACK; color <= WHITE; color++) {
        var Ai = (color === BLACK ? BlackAi : WhiteAi) || main.defaultAi;
        this.players[color] = new Ai(this.game, color);
        this.game.setPlayer(color, getAiName(Ai));
    }
};

Breeder.prototype.initFirstGeneration = function () {
    this.controlGenes = this.players[WHITE].genes.clone('control');
    this.generation = [];
    this.newGeneration = [];
    for (var i = 0; i < this.genSize; i++) {
        this.generation.push(this.players[WHITE].genes.clone('g1#' + i).mutateAll());
        this.newGeneration.push(new Genes(null, null, 'g2#' + i));
    }
    this.scoreDiff = [];
};

Breeder.prototype.showInUi = function (title, msg) {
    if (main.testUi) main.testUi.showTestGame(title, msg, this.game);
};

// Returns true if this game ending was not seen before
Breeder.prototype.playUntilGameEnds = function () {
    var game = this.game, moveNum = 0, maxMoveNum = 2 * this.gsize * this.gsize;
    while (!game.gameEnding) {
        var curPlayer = this.players[game.curColor];
        var move = curPlayer.getMove();
        game.playOneMove(move);
        if (++moveNum === maxMoveNum) break;
    }
    var numTimesSeen = this._countAlreadySeenGames();
    if (moveNum === maxMoveNum) {
        if (numTimesSeen === 1) this.showInUi('Never stopping game');
        log.logError('Never stopping game. Times seen: ' + numTimesSeen);
    }
    return numTimesSeen === 1;
};

// Returns the number of times we saw this game ending
Breeder.prototype._countAlreadySeenGames = function () {
    var img = this.goban.image(), seenGames = this.seenGames;

    if (seenGames[img])
        return ++seenGames[img];
    
    var flippedImg = Grid.flipImage(img);
    if (seenGames[flippedImg])
        return ++seenGames[flippedImg];

    var mirroredImg = Grid.mirrorImage(img);
    if (seenGames[mirroredImg])
        return ++seenGames[mirroredImg];

    var mfImg = Grid.flipAndMirrorImage(img);
    if (seenGames[mfImg])
        return ++seenGames[mfImg];

    seenGames[img] = 1;
    return 1;
};

// Plays a game and returns the score difference in points (>0 if black wins)
// @param {Genes} [genes1] - AI will use its default genes otherwise
// @param {Genes} [genes2]
// @param {string} [initMoves] - e.g. "e5,d4"
Breeder.prototype.playGame = function (genes1, genes2, initMoves) {
    var komi = initMoves && initMoves[0] === 'W' ? - this.komi : this.komi; // reverse komi if W starts

    this.game.newGame(this.gsize, 0, komi);
    this.game.loadMoves(initMoves);
    this.players[BLACK].prepareGame(genes1);
    this.players[WHITE].prepareGame(genes2);
    var scoreDiff;
    try {
        if (!this.playUntilGameEnds() && this.skipDupeEndings) return 0;
        scoreDiff = this.scorer.computeScoreDiff(this.game);
    } catch (err) {
        log.logError('Exception occurred during a breeding game: ' + err);
        log.logError(this.game.historyString());
        this.showInUi('Exception in breeding game', err);
        throw err;
    }
    if (log.debugBreed) {
        log.debug('\n' + genes1.name + '\nagainst\n' + genes2.name);
        log.debug('Distance: ' + genes1.distance(genes2).toFixed(2));
        log.debug('Score: ' + scoreDiff);
        log.debug('Moves: ' + this.game.historyString());
        log.debug(this.goban.toString());
    }
    return scoreDiff;
};

// NB: we only update score for black so komi unbalance does not matter.
// Sadly this costs us a lot: we need to play twice more games to get score data...
Breeder.prototype.oneTournament = function (numMatchPerAi) {
    if (log.debugBreed) log.debug('One tournament starts for ' + this.generation.length + ' AIs');

    for (var p1 = 0; p1 < this.genSize; p1++) {
        this.scoreDiff[p1] = 0;
    }
    for (var i = 0; i < numMatchPerAi; i++) {
        for (p1 = 0; p1 < this.genSize; p1++) {
            var p2 = ~~(Math.random()*~~(this.genSize - 1));
            if (p2 === p1) {
                p2 = this.genSize - 1;
            }
            var diff = this.playGame(this.generation[p1], this.generation[p2]);
            if (Math.abs(diff) < TOO_SMALL_SCORE_DIFF) {
                diff = 0;
            } else {
                diff = Math.abs(diff) / diff; // Math.sign later
            }
            // diff is now -1, 0 or +1
            this.scoreDiff[p1] += diff;
            if (log.debugBreed) log.debug('Match #' + p1 + ' against #' + p2 + '; final scores #' +
                p1 + ':' + this.scoreDiff[p1] + ', #' + p2 + ':' + this.scoreDiff[p2]);
        }
    }
};

Breeder.prototype.reproduction = function () {
    if (log.debugBreed) log.debug('=== Reproduction time for ' + this.generation.length + ' AI');

    this.picked = main.newArray(this.genSize, 0);
    this.maxScore = Math.max.apply(Math, this.scoreDiff);
    this.winner = this.generation[this.scoreDiff.indexOf(this.maxScore)];
    this.pickIndex = 0;
    for (var i = 0; i <= this.genSize - 1; i += 2) {
        var parent1 = this.pickParent();
        var parent2 = this.pickParent();
        parent1.mate(parent2, this.newGeneration[i], this.newGeneration[i + 1], MUTATION_RATE, WIDE_MUTATION_RATE);
    }
    if (log.debugBreed) {
        for (i = 0; i < this.genSize; i++) {
            log.debug('#' + i + ', score ' + this.scoreDiff[i] + ', picked ' + this.picked[i] + ' times');
        }
    }
    // swap new generation to replace old one
    var swap = this.generation;
    this.generation = this.newGeneration;
    this.newGeneration = swap;
    this.generation[0] = this.winner; // TODO review this; we force the winner (a parent) to stay alive
};

Breeder.prototype.pickParent = function () {
    var i = this.pickIndex;
    for (;;) {
        i = (i + 1) % this.genSize;
        if (Math.random() < this.scoreDiff[i] / this.maxScore) break;
    }
    this.picked[i]++;
    this.pickIndex = i;
    return this.generation[i];
};

Breeder.prototype.control = function (numGames) {
    var totalScore, numWins, numWinsW;
    var previousDebugBreed = log.debugBreed;
    log.debugBreed = false; // never want debug during control games

    log.logInfo('Playing ' + numGames * 2 + ' games to measure the current winner against our control AI...');
    totalScore = numWins = numWinsW = 0;
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame(this.controlGenes, this.winner);
        var scoreW = this.playGame(this.winner, this.controlGenes);
        if (score > 0) numWins++;
        if (scoreW < 0) numWinsW++;
        totalScore += score - scoreW;
    }
    log.logInfo('Average score: ' + totalScore / numGames +
        '\nWinner genes:\n' + this.winner +
        '\nControl genes:\n' + this.controlGenes +
        '\nDistance between control and current winner: ' + this.controlGenes.distance(this.winner).toFixed(2) +
        '\nTotal score of control against current winner: ' + totalScore +
        ' (out of ' + numGames * 2 + ' games, control won ' +
        numWins + ' as black and ' + numWinsW + ' as white)');
    log.debugBreed = previousDebugBreed;
};

// Play many games AI VS AI
// Returns the ratio of games won by White, e.g. 0.6 for 60% won
Breeder.prototype.aiVsAi = function (numGames, numGamesShowed, initMoves) {
    var BlackAi, WhiteAi = main.latestAi;
    switch (main.defaultAi) {
    case main.latestAi: BlackAi = main.previousAi; break;
    case main.previousAi: BlackAi = main.olderAi; WhiteAi = main.previousAi; break;
    case main.olderAi: BlackAi = main.defaultAi; break;
    }
    this.initPlayers(BlackAi, WhiteAi);

    var blackName = this.game.playerNames[BLACK], whiteName = this.game.playerNames[WHITE];
    var gsize = this.gsize;
    var descMoves = initMoves ? ' [' + initMoves + ']' : '';
    var desc = numGames + ' games on ' + gsize + 'x' + gsize + ', komi=' + this.komi + ', ' +
        whiteName + ' VS ' + blackName + '(B)' + descMoves;
    var expectedDuration = numGames * 0.05 * gsize * gsize / 81;

    this.timer.start(desc, expectedDuration);
    this.skipDupeEndings = true;
    var totalScore = 0, numDupes = 0, numCloseMatch = 0, numMoves = 0, numRandom = 0;
    var won = [0, 0];
    for (var i = 0; i < numGames; i++) {
        var score = this.playGame(null, null, initMoves);
        numMoves += this.game.history.length;
        numRandom += this.players[WHITE].numRandomPicks;
        if (score === 0) { numDupes++; continue; }

        var winner = score > 0 ? BLACK : WHITE;
        if (++won[winner] <= numGamesShowed) this.showInUi('Breeding game #' + won[winner] +
            ' won by ' + Grid.colorName(winner), this.game.historyString());
        if (Math.abs(score) < 3) numCloseMatch++;
        totalScore += score;
    }
    this.timer.stop(/*lenientIfSlow=*/true);

    var uniqGames = numGames - numDupes;
    var winRatio = won[WHITE] / uniqGames;
    log.logInfo('Unique games: ' + uniqGames + ' (' + ~~(uniqGames  / numGames * 100) + '%)');
    log.logInfo('Average score difference: ' + (-totalScore / uniqGames).toFixed(1));
    log.logInfo('Close match (score diff < 3 pts): ' + ~~(numCloseMatch / uniqGames * 100) + '%');
    log.logInfo('Average number of moves: ' + ~~(numMoves / numGames));
    log.logInfo('Average number of times White picked at random between equivalent moves: ' + (numRandom / numGames).toFixed(1));
    log.logInfo('Average time per move: ' + (this.timer.duration * 1000 / numMoves).toFixed(1) + 'ms');
    log.logInfo('Won games for White-' + whiteName +
        ' VS Black-' + blackName + descMoves + ': ' + (winRatio * 100).toFixed(1) + '%');

    return winRatio; // White's victory ratio
};

/** genSize must be an even number (e.g. 26) */
Breeder.prototype.run = function (genSize, numTournaments, numMatchPerAi) {
    this.genSize = genSize;
    this.initPlayers();
    this.initFirstGeneration();
    var gsize = this.gsize;
    var expectedDuration = genSize * numTournaments * numMatchPerAi * 0.05 * gsize * gsize / 81;

    for (var i = 1; i <= numTournaments; i++) { // TODO: Find a way to appreciate the progress
        var tournamentDesc = 'Breeding tournament ' + i + '/' + numTournaments +
            ': each of ' + this.genSize + ' AIs plays ' + numMatchPerAi + ' games';
        this.timer.start(tournamentDesc, expectedDuration);
        this.oneTournament(numMatchPerAi);
        this.timer.stop(/*lenientIfSlow=*/true);
        this.reproduction();
        this.control(numMatchPerAi);
    }
};

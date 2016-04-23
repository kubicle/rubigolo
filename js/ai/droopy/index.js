//Translated from ai1_player.rb using babyruby2js
'use strict';

var allHeuristics = require('./AllHeuristics');
var BoardAnalyser = require('./boan/BoardAnalyser');
var CONST = require('../../constants');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var log = require('../../log');
var ZoneFiller = require('./boan/ZoneFiller');

var GRID_BORDER = CONST.GRID_BORDER;
var sOK = CONST.sOK, sINVALID = CONST.sINVALID, sBLUNDER = CONST.sBLUNDER, sDEBUG = CONST.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves


/** @class */
function Droopy(game, color, genes) {
    this.name = 'Droopy';
    this.game = game;
    this.goban = game.goban;
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.stateGrid = new Grid(this.gsize, GRID_BORDER);
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Droopy;

Droopy.publicName = 'Droopy';
Droopy.publicVersion = '0.1';

// Used only by tests
Droopy.BoardAnalyser = BoardAnalyser;
Droopy.ZoneFiller = ZoneFiller;


Droopy.prototype._createHeuristics = function () {
    this.heuristics = [];
    var heuristics = allHeuristics();
    for (var n = 0; n < heuristics.length; n++) {
        var h = new (heuristics[n])(this);
        this.heuristics.push(h);
    }
};

Droopy.prototype.setColor = function (color) {
    this.color = color;
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].initColor(color);
    }
};

/** Can be called from Breeder with different genes */
Droopy.prototype.prepareGame = function (genes) {
    if (genes) this.genes = genes;
    this.numMoves = 0;

    this.bestScore = this.bestI = this.bestJ = 0;
    this.testI = this.testJ = NO_MOVE;
    this.debugHeuristic = null;
};

Droopy.prototype.getHeuristic = function (heuristicName) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    return null;
};

Droopy.prototype.getGene = function (name, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.name + '-' + name, defVal, lowLimit, highLimit);
};

Droopy.prototype._foundBestMove = function(i, j, score) {
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
};

Droopy.prototype._keepBestMove = function(i, j, score) {
    if (score > this.bestScore) {
        this.numBestTwins = 1; // number of moves with same best score (we randomly pick one of them)
        this._foundBestMove(i, j, score);
    } else { // score === this.bestScore
        this.numBestTwins++;
        if (Math.random() * this.numBestTwins >= 1) return; // keep current twin if it does not win
        this._foundBestMove(i, j, score);
    }
};

// Returns the move chosen (e.g. c4 or pass)
Droopy.prototype.getMove = function () {
    this.numMoves++;
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;

    this._prepareEval();
    this._initScoringGrid(stateYx, scoreYx);
    this._runHeuristics(stateYx, scoreYx);
    var move = this._collectBestMove(stateYx, scoreYx);

    return move;
};

Droopy.prototype._prepareEval = function () {
    this.bestScore = this.minimumScore - 0.001;
    this.bestI = NO_MOVE;
};

/** Init grids (and mark invalid moves) */
Droopy.prototype._initScoringGrid = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (!this.goban.isValidMove(i, j, this.color)) {
                stateYx[j][i] = sINVALID;
                continue;
            }
            stateYx[j][i] = sOK;
            scoreYx[j][i] = 0;
        }
    }
    if (this.testI !== NO_MOVE) {
        stateYx[this.testJ][this.testI] = sDEBUG;
    }
};

/** Do eval using each heuristic (NB: order is important) */
Droopy.prototype._runHeuristics = function (stateYx, scoreYx) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];

        if (h._beforeEvalBoard) h._beforeEvalBoard();
        h.evalBoard(stateYx, scoreYx);
    }
};

/** Returns the move which got the best score */
Droopy.prototype._collectBestMove = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK || scoreYx[j][i] < this.bestScore) continue;
            this._keepBestMove(i, j, scoreYx[j][i]);
        }
    }
    if (this.bestScore < this.minimumScore) return 'pass';
    return Grid.xy2move(this.bestI, this.bestJ);
};

/** Called by heuristics if they decide to stop looking further (rare cases) */
Droopy.prototype.markMoveAsBlunder = function (i, j, reason) {
    this.stateGrid.yx[j][i] = sBLUNDER;
    if (log.debug) log.debug(Grid.xy2move(i, j) + ' seen as blunder: ' + reason);
};
Droopy.prototype.isBlunderMove = function (i, j) {
    return this.stateGrid.yx[j][i] === sBLUNDER;
};

Droopy.prototype.guessTerritories = function () {
    this.pot.evalBoard();
    return this.pot.territory.yx;
};

Droopy.prototype._getMoveForTest = function (i, j) {
    this.testI = i;
    this.testJ = j;

    this.getMove();

    this.testI = NO_MOVE;
};

Droopy.prototype._getMoveSurvey = function (i, j) {
    var survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        var s = h.scoreGrid.yx[j][i];
        if (s) survey[h.name] = s;
    }
    return survey;
};

/** For tests */
Droopy.prototype.testMoveEval = function (i, j) {
    this._getMoveForTest(i, j);
    return this.scoreGrid.yx[j][i];
};

/** For tests */
Droopy.prototype.testHeuristic = function (i, j, heuristicName) {
    this._getMoveForTest(i, j);
    var h = this.getHeuristic(heuristicName);
    return h.scoreGrid.yx[j][i];
};

/** For tests */
Droopy.prototype.setDebugHeuristic = function (heuristicName) {
    this.debugHeuristic = heuristicName;
};

function surveySort(h1, h2) { return h2[1] - h1[1]; }

Droopy.prototype.getMoveSurveyText = function (move, isTest) {
    var coords = this.game.oneMove2xy(move);
    if (!coords) return '';
    var i = coords[0], j = coords[1];
    if (isTest) this._getMoveForTest(i, j);
    var survey = this._getMoveSurvey(i, j);
    var score = this.scoreGrid.yx[j][i];

    var sortedSurvey = [];
    for (var h in survey) {
        if (survey[h] === 0) continue;
        sortedSurvey.push([h, survey[h]]);
    }
    sortedSurvey.sort(surveySort);

    var txt = move + ' (' + score.toFixed(2) + ')\n';
    for (var n = 0; n < sortedSurvey.length; n++) {
        txt += '- ' + sortedSurvey[n][0] + ': ' + sortedSurvey[n][1].toFixed(2) + '\n';
    }
    return txt;
};


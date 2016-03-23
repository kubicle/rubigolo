'use strict';

var main = require('../../main');

var BoardAnalyser = require('./boan/BoardAnalyser');
var CONST = require('../../constants');
var Genes = require('../../Genes');
var Grid = require('../../Grid');
var ZoneFiller = require('./boan/ZoneFiller');

// All heuristics
var Connector = require('./Connector');
var GroupAnalyser = require('./GroupAnalyser');
var GroupsAndVoids = require('./GroupsAndVoids');
var Hunter = require('./Hunter');
var Influence = require('./Influence');
var MoveInfo = require('./MoveInfo');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var PotentialEyes = require('./PotentialEyes');
var PotentialTerritory = require('./PotentialTerritory');
var Pusher = require('./Pusher');
var Savior = require('./Savior');
var Shaper = require('./Shaper');
var Spacer = require('./Spacer');

var GRID_BORDER = CONST.GRID_BORDER;
var sOK = CONST.sOK, sINVALID = CONST.sINVALID, sDEBUG = CONST.sDEBUG;

var NO_MOVE = -1; // used for i coordinate of "not yet known" best moves

var AI_VERSION = '0.1';


/** @class */
function Chuckie(game, color, genes) {
    this.name = 'Chuckie';
    this.publicName = this.name; // could be different if needed
    this.publicVersion = AI_VERSION;

    this.game = game;
    this.goban = game.goban;
    this.boan = new BoardAnalyser(game); // several heuristics can share this boan
    this.genes = genes || new Genes();
    this.gsize = this.goban.gsize;
    this.jpRules = game.rules === CONST.JP_RULES;
    this.stateGrid = new Grid(this.gsize, GRID_BORDER);
    this.scoreGrid = new Grid(this.gsize, 0, GRID_BORDER);

    // genes need to exist before we create heuristics
    this.minimumScore = this.getGene('smallerMove', 0.03, 0.01, 0.1);

    this._createHeuristics();
    this.setColor(color);
    this.prepareGame();
}
module.exports = Chuckie;

// Used only by tests
Chuckie.BoardAnalyser = BoardAnalyser;
Chuckie.ZoneFiller = ZoneFiller;


Chuckie.prototype._newHeuristic = function (Constr) {
    var h = new Constr(this);
    h.setName(this.heuristics.length);
    this.heuristics.push(h);
    return h;
};

Chuckie.prototype._createHeuristics = function () {
    var heuristic = this.heuristic = {};
    this.heuristics = [];

    heuristic.MoveInfo = this._newHeuristic(MoveInfo);
    heuristic.PotentialTerritory = this._newHeuristic(PotentialTerritory);
    heuristic.GroupsAndVoids = this._newHeuristic(GroupsAndVoids);
    heuristic.Influence = this._newHeuristic(Influence);
    heuristic.PotentialEyes = this._newHeuristic(PotentialEyes);
    heuristic.GroupAnalyser = this._newHeuristic(GroupAnalyser);
    heuristic.NoEasyPrisoner = this._newHeuristic(NoEasyPrisoner);
    heuristic.Savior = this._newHeuristic(Savior);
    heuristic.Hunter = this._newHeuristic(Hunter);
    heuristic.Connector = this._newHeuristic(Connector);
    heuristic.Spacer = this._newHeuristic(Spacer);
    heuristic.Pusher = this._newHeuristic(Pusher);
    heuristic.Shaper = this._newHeuristic(Shaper);

    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].updateCrossRef();
    }
};

Chuckie.prototype.setColor = function (color) {
    this.color = color;
    for (var n = 0; n < this.heuristics.length; n++) {
        this.heuristics[n].initColor(color);
    }
};

/** Can be called from Breeder with different genes */
Chuckie.prototype.prepareGame = function (genes) {
    if (genes) this.genes = genes;
    this.numMoves = this.numRandomPicks = 0;

    this.bestScore = this.bestI = this.bestJ = 0;
    this.usedRandom = false;
    this.testI = this.testJ = NO_MOVE;
    this.debugHeuristic = null;
};

/** Get a heuristic from its human name - for UI and tests */
Chuckie.prototype.getHeuristic = function (heuristicName) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        if (h.name === heuristicName) return h;
    }
    return null;
};

Chuckie.prototype.getGene = function (geneName, defVal, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    return this.genes.get(this.name + '-' + geneName, defVal, lowLimit, highLimit);
};

Chuckie.prototype._foundBestMove = function(i, j, score) {
    this.bestScore = score;
    this.bestI = i; this.bestJ = j;
    this.usedRandom = this.numBestTwins !== 1;
};

Chuckie.prototype._keepBestMove = function(i, j, score) {
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
Chuckie.prototype.getMove = function () {
    this.numMoves++;
    var stateYx = this.stateGrid.yx;
    var scoreYx = this.scoreGrid.yx;

    this._prepareEval();
    this._initScoringGrid(stateYx, scoreYx);
    this._runHeuristics(stateYx, scoreYx);
    var move = this._collectBestMove(stateYx, scoreYx);

    main.debug = this.debugMode;
    return move;
};

Chuckie.prototype._prepareEval = function () {
    this.bestScore = this.minimumScore - 0.001;
    this.bestI = NO_MOVE;

    this.debugMode = main.debug;
    main.debug = false;
};

/** Init grids (and mark invalid moves) */
Chuckie.prototype._initScoringGrid = function (stateYx, scoreYx) {
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
        if (stateYx[this.testJ][this.testI] === sINVALID)
            throw new Error('Invalid test move: ' + this.testI + ',' + this.testJ);
        stateYx[this.testJ][this.testI] = sDEBUG;
    }
};

/** Do eval using each heuristic (NB: order is important) */
Chuckie.prototype._runHeuristics = function (stateYx, scoreYx) {
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        main.debug = this.debugMode && this.debugHeuristic === h.name;
        var t0 = Date.now();

        if (h._beforeEvalBoard) h._beforeEvalBoard();
        h.evalBoard(stateYx, scoreYx);

        var time = Date.now() - t0;
        if (time >= 3 && !main.isCoverTest) {
            main.log.warn('Slowness: ' + h.name + ' took ' + time + 'ms');
        }
    }
    this.heuristic.MoveInfo.collectScores(stateYx, scoreYx);
};

/** Returns the move which got the best score */
Chuckie.prototype._collectBestMove = function (stateYx, scoreYx) {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            if (stateYx[j][i] < sOK || scoreYx[j][i] < this.bestScore) continue;
            this._keepBestMove(i, j, scoreYx[j][i]);
        }
    }
    if (this.bestScore < this.minimumScore) return 'pass';
    if (this.usedRandom) this.numRandomPicks++;
    return Grid.xy2move(this.bestI, this.bestJ);
};

// Called by UI only
Chuckie.prototype.guessTerritories = function () {
    var pot = this.heuristic.PotentialTerritory;
    pot.evalBoard();
    return pot.territory.yx;
};

Chuckie.prototype._getMoveForTest = function (i, j) {
    this.testI = i;
    this.testJ = j;

    this.getMove();

    this.testI = NO_MOVE;
};

Chuckie.prototype._getMoveSurvey = function (i, j) {
    var survey = {};
    for (var n = 0; n < this.heuristics.length; n++) {
        var h = this.heuristics[n];
        var s = h.scoreGrid.yx[j][i];
        if (s) survey[h.name] = s;
    }
    return survey;
};

/** For tests */
Chuckie.prototype.testMoveEval = function (i, j) {
    this._getMoveForTest(i, j);
    return this.scoreGrid.yx[j][i];
};

/** For tests */
Chuckie.prototype.testHeuristic = function (i, j, heuristicName) {
    this._getMoveForTest(i, j);
    var h = this.getHeuristic(heuristicName);
    return h.scoreGrid.yx[j][i];
};

/** For tests */
Chuckie.prototype.setDebugHeuristic = function (heuristicName) {
    this.debugHeuristic = heuristicName;
};

function surveySort(h1, h2) { return h2[1] - h1[1]; }

Chuckie.prototype.getMoveSurveyText = function (move, isTest) {
    var coords = this.game.oneMove2xy(move);
    if (!coords) return '';
    var i = coords[0], j = coords[1];
    if (isTest) {
        if (!this.goban.isValidMove(i, j, this.game.curColor)) return 'Invalid move: ' + move;
        this._getMoveForTest(i, j);
    }
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


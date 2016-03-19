'use strict';

//var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;


/** @class */
function MoveInfo(player) {
    Heuristic.call(this, player);

    this.grid = new Grid(this.gsize, null);
    this.groupDeath = [];
    this.groupKills = [];
    this.cuts = [];
    this.connects = [];

    this.pressureCoeff = this.getGene('pressure', 1, 0.01, 2);
    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);
}
inherits(MoveInfo, Heuristic);
module.exports = MoveInfo;


//---

function CellInfo() {
    this.fakeEyeForColor = null;
    this.score = 0;
    this.goals = [];
    this.goalFactors = [];
}

//---

MoveInfo.prototype.evalBoard = function () {
    this.grid.init(null);
    this.groupDeath.length = 0;
    this.groupKills.length = 0;
    this.cuts.length = 0;
    this.connects.length = 0;
};

MoveInfo.prototype.collectScores = function (stateYx, scoreYx) {
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx); // calls _evalMove below
};

MoveInfo.prototype._evalMove = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (!cell) return 0;

    var score = cell.score;
    var goals = cell.goals;
    if (!goals.length) return score;

    for (var n = goals.length - 1; n >= 0; n--) {
        score += goals[n].countScore();
    }
    return score;
};

MoveInfo.prototype.getCellInfo = function (i, j) {
    return this.grid.yx[j][i]; // can be null
};

MoveInfo.prototype._getCell = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (cell) return cell;

    this.grid.yx[j][i] = cell = new CellInfo();
    return cell;
};

MoveInfo.prototype.setAsFakeEye = function (stone, color) {
    this._getCell(stone.i, stone.j).fakeEyeForColor = color;
};

MoveInfo.prototype.isFakeEye = function (stone, color) {
    var cell = this.getCellInfo(stone.i, stone.j);
    return cell && cell.fakeEyeForColor === color;
};


//---

function Goal(type, score, g, factor) {
    this.type = type;
    this.score = score;
    this.finalScore = null;
    this.group = g;
    //this.moves = [];
    this.consequences = [];
    this.factor = factor || 1;
}

Goal.prototype.countScore = function () {
    if (this.finalScore !== null) return this.finalScore;
    this.finalScore = 0; // blocks cycles
    var score = 0;
    for (var i = this.consequences.length - 1; i >= 0; i--) {
        score += this.consequences[i].countScore(); // recursive call
    }
    this.finalScore = score = score * this.factor + this.score;
    return score;
};

Goal.prototype.implies = function (goal) {
    var goals = this.consequences;
    if (goals.indexOf(goal) < 0) goals.push(goal);
};


//---

MoveInfo.prototype._groupDeath = function (g) {
    var goal = this.groupDeath[g.ndx];
    if (goal) return goal;

    var cost = 2 * g.stones.length; // 2 points are pretty much granted for the prisonners
    // TODO: instead of below, evaluate the damage caused by an *invasion* by taking group g
    var lives = g.allLives();
    var numEmpties = 0;
    for (var i = lives.length - 1; i >= 0; i--) {
        numEmpties += lives[i].numEmpties(); // TODO: count only empties not in "lives"
    }
    cost += this.spaceInvasionCoeff * Math.max(0, numEmpties - 1); //...and the "open gate" to territory will count a lot
    goal = this.groupDeath[g.ndx] = new Goal('death', cost, g);
    return goal;
};

MoveInfo.prototype._goalReachedByMove = function (goal, stone, factor) {
    if (!stone)  return goal;
    factor = factor || 1;

    // var moves = goal.moves;
    // if (moves.indexOf(stone) < 0) moves.push(stone);

    var cell = this._getCell(stone.i, stone.j);
    var goals = cell.goals, goalFactors = cell.goalFactors;
    var n = goals.indexOf(goal);
    if (n < 0) {
        goals.push(goal);
        goalFactors.push(factor);
    } else {
        goalFactors[n] = Math.max(goalFactors[n], factor);
    }
    return goal;
};

MoveInfo.prototype.addPressure = function (g, stone) {
    var pressure = 1 / (g.lives + 1) * this.pressureCoeff;
    this._getCell(stone.i, stone.j).score += pressure;
};

MoveInfo.prototype.raceThreat = function (g, stone) {
    this._groupThreat(g, stone, false);
    //TODO in _countSavedAllies: this._groupThreat(allyInRace, stone, /*saved=*/true);
    // and make sure this is the shortest race around - otherwise it is not a race at all
};

MoveInfo.prototype.singleEyeThreat = function (g, stone, color) {
    this._eyeThreatOnBand(g, stone, color, 1);
};

function countThreatOnBand(self, params) {
    var goal0 = params[2];
    var goal = self._groupThreat(this.group, /*stone=*/params[0], /*saving=*/params[1], goal0.factor);
    goal0.implies(goal);
    return 0; // not used
}

MoveInfo.prototype._eyeThreatOnBand = function (g, stone, color, extraPotEye) {
    var gi = g._info;
    var potEyeCount = gi.countBandPotentialEyes() + extraPotEye;
    if (potEyeCount < 2) return false;

    var factor = 1 / (potEyeCount - 1);
    var id = gi.band ? gi.band : g;
    var goal0 = new Goal('eye', 0, id, factor); // TODO: cache them!
    var saving = color === g.color;
    gi.callOnBand(countThreatOnBand, this, [stone, saving, goal0]);
    return true;
};

MoveInfo.prototype.eyeThreat = function (g, stone, color) {
    return this._eyeThreatOnBand(g, stone, color, 0);
};

MoveInfo.prototype.cutThreat = function (g, stone, color) {
    var isConnect = color === g.color;
    var goals = isConnect ? this.connects : this.cuts;
    var goal = goals[g.ndx];
    if (goal) return goal;

    // goal = goals[g.ndx] = new Goal(isConnect ? 'connect' : 'cut', 0, g);

    var potEyeCount = g._info.countBandPotentialEyes();
    var factor = 1 / Math.max(1, potEyeCount - 1);

    goal = goals[g.ndx] = this._groupThreat(g, stone, /*saving=*/isConnect, factor);

    return goal;
};

MoveInfo.prototype.killThreat = function (g, stone) {
    return this._groupThreat(g, stone, /*saving=*/false);
};

MoveInfo.prototype.rescueGroup = function (g, stone) {
    return this._groupThreat(g, stone, /*saving=*/true);
};

MoveInfo.prototype._groupThreat = function (g, stone, saving, factor) {
    var goal = this.groupKills[g.ndx];
    if (goal) return this._goalReachedByMove(goal, stone, factor);

    goal = this.groupKills[g.ndx] = this._groupDeath(g);

    if (!saving) this._countSavedAllies(g, stone, factor);

    return this._goalReachedByMove(goal, stone, factor);
};

// Count indirectly saved groups
MoveInfo.prototype._countSavedAllies = function (killedEnemy, stone, factor) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemy.stones.length === 1 && killedEnemy.stones[0].isCorner()) {
        return;
    }

    var allies = killedEnemy.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        var ally = allies[a];
        if (ally.lives > 2) continue; //TODO later races etc.
        if (ally.lives === 2 && !this.groupKills[ally.ndx]) continue;

        this._groupThreat(ally, stone, /*saving=*/true, factor);
    }
};

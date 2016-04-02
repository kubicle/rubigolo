'use strict';

var main = require('../../main');
var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = CONST.ALWAYS;


/** @class */
function MoveInfo(player) {
    Heuristic.call(this, player);

    this.grid = new Grid(this.gsize, null);
    this.groupDeath = [];
    //this.groupKills = [];
    // this.cuts = [];
    // this.connects = [];
    this.what = '';

    this.pressureCoeff = this.getGene('pressure', 1, 0.01, 2);
    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);
}
inherits(MoveInfo, Heuristic);
module.exports = MoveInfo;


MoveInfo.prototype.evalBoard = function () {
    this.grid.init(null);
    this.groupDeath.length = 0;
    // this.groupKills.length = 0;
    // this.cuts.length = 0;
    // this.connects.length = 0;
};

MoveInfo.prototype.collectScores = function (stateYx, scoreYx) {
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx); // calls _evalMove below
};

MoveInfo.prototype._evalMove = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (!cell) return 0;
    return cell.computeScore();
};

function CellInfo() {
    this.fakeEyeForColor = null;
    this.score = 0;
    this.goals = [];
    this.goalFactors = [];
    this.goalNumMoves = [];
}

CellInfo.prototype.computeScore = function () {
    var score = this.score;
    var goals = this.goals;
    if (!goals.length) return score;

    for (var n = goals.length - 1; n >= 0; n--) {
        var goal = goals[n];
        score += goal.score * this.goalFactors[n];
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

function Goal(name, score, g) {
    this.name = name;
    this.score = score;
    // this.finalScore = null;
    this.group = g;
    this.minMoves = Infinity;
    //this.moves = [];
    // this.consequences = [];
}

Goal.prototype.toString = function () {
    return this.name + ' (on: #' + this.group.ndx +
        (this.minMoves !== Infinity ? ', minMoves:' + this.minMoves : '') +
        ', score:' + this.score.toFixed(2) + ')';
};

// Goal.prototype.countScore = function () {
//     if (this.finalScore !== null) return this.finalScore;
//     this.finalScore = 0; // blocks cycles
//     var score = 0;
//     for (var i = this.consequences.length - 1; i >= 0; i--) {
//         score += this.consequences[i].countScore(); // recursive call
//     }
//     this.finalScore = score = score * this.factor + this.score;
//     return score;
// };

// Goal.prototype.implies = function (goal) {
//     var goals = this.consequences;
//     if (goals.indexOf(goal) < 0) goals.push(goal);
// };


//---

MoveInfo.prototype._enter = function (name, g, stone) {
    this.what = name + '#' + g.ndx + '-' + stone;
};

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

    this.groupDeath[g.ndx] = goal = new Goal(this.what || 'death', cost, g);
    return goal;
};

MoveInfo.prototype._goalReachedByMove = function (goal, stone, factor, numMoves) {
    if (!stone)  throw new Error('Unexpected'); //return goal;
    factor = factor || 1;
    numMoves = numMoves || 1;
    if (main.debug) main.log.debug('Goal reached: ' + goal + ' at ' + stone +
        (factor ? ' factor:' + factor : '') + (numMoves ? ' numMoves:' + numMoves : ''));

    // var moves = goal.moves;
    // if (moves.indexOf(stone) < 0) moves.push(stone);

    var cell = this._getCell(stone.i, stone.j);
    var goals = cell.goals, goalFactors = cell.goalFactors, goalNumMoves = cell.goalNumMoves;
    var n = goals.indexOf(goal);
    if (n < 0) {
        goals.push(goal);
        goalFactors.push(factor);
        goalNumMoves.push(numMoves);
    } else {
        goalFactors[n] = Math.max(goalFactors[n], factor);
        goalNumMoves[n] = Math.min(goalNumMoves[n], numMoves);
    }
    goal.minMoves = Math.min(goal.minMoves, numMoves);
    return goal;
};

MoveInfo.prototype._bandThreat = function (ginfos, stone, saving, factor, numMoves) {
    factor = factor || 1;
    var potEyeCount = 0, lives = numMoves || 0;
    for (var n = ginfos.length - 1; n >= 0; n--) {
        var gi = ginfos[n];
        potEyeCount += gi.countPotEyes();
        lives += gi.group.lives;
    }
    if (potEyeCount >= 2.5) factor /= (potEyeCount - 1.5) * (potEyeCount - 1.5) * lives / 5;

    for (n = ginfos.length - 1; n >= 0; n--) {
        this._groupThreat(ginfos[n].group, stone, saving, factor, lives);
    }
};

MoveInfo.prototype._groupThreat = function (g, stone, saving, factor, numMoves) {
    var goal = this._groupDeath(g);

    if (!saving) this._countSavedAllies(g, stone, factor, numMoves);

    return this._goalReachedByMove(goal, stone, factor, numMoves);
};

// Count indirectly saved groups
MoveInfo.prototype._countSavedAllies = function (killedEnemy, stone, factor, numMoves) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemy.stones.length === 1 && killedEnemy.stones[0].isCorner()) {
        return;
    }
    numMoves = numMoves || 1;
    var allies = killedEnemy.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        var ally = allies[a];
        if (ally.lives < numMoves) continue;
        if (ally.xAlive === ALWAYS) continue;

        this._rescueGroup(ally, stone, factor, numMoves);
    }
};

MoveInfo.prototype._rescueGroup = function (g, stone, factor, numMoves) {
    var bands = g._info.getSubBandsIfKilled();
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/true, factor, numMoves);
    }
    this._groupThreat(g, stone, true, factor, numMoves);
};

MoveInfo.prototype.addPressure = function (g, stone) {
    var pressure = 1 / (g.lives + 1) * this.pressureCoeff;
    this._getCell(stone.i, stone.j).score += pressure;
};

MoveInfo.prototype.giveMinimumScore = function (stone) {
    this._getCell(stone.i, stone.j).score += this.minimumScore;
};

MoveInfo.prototype.raceThreat = function (g, stone) {
    if (main.debug) this._enter('race', g, stone);
    var gi = g._info;
    var ginfos = gi.band ? gi.band.brothers : [gi];
    this._bandThreat(ginfos, stone, false);
};

MoveInfo.prototype.eyeThreat = function (g, stone, color) {
    if (main.debug) this._enter('eye', g, stone);
    var gi = g._info;
    var potEyeCount = gi.countBandPotentialEyes();
    if (potEyeCount < 1.5) return false;

    if (main.debug) main.log.debug('MoveInfo ' + Grid.colorName(color) + ' - eye threat at ' + stone);
    var ginfos = gi.band ? gi.band.brothers : [gi];
    this._bandThreat(ginfos, stone, color === g.color);
    return true;
};

MoveInfo.prototype.cutThreat = function (groups, stone, color) {
    var g = groups[0];
    if (main.debug) this._enter('cut', g, stone);
    var saving = color === g.color;

    var bands = g._info.getSubBandsIfCut(stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, saving);
    }
};

MoveInfo.prototype.killThreat = function (g, stone) {
    if (main.debug) this._enter('kill', g, stone);
    var bands = g._info.getSubBandsIfKilled();
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/false);
    }
    this._groupThreat(g, stone, false, 1, g.lives);
};

MoveInfo.prototype.rescueGroup = function (g, stone) {
    if (main.debug) this._enter('rescue', g, stone);
    this._rescueGroup(g, stone);
};

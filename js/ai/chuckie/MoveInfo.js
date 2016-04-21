'use strict';

var main = require('../../main');
var CONST = require('../../constants');
var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = CONST.ALWAYS;

var MIN_FACTOR = 0.1; // REVIEW ME; under this factor we ignore threats for now


/** @class */
function MoveInfo(player) {
    Heuristic.call(this, player);

    this.debug = false;
    this.grid = new Grid(this.gsize, null);
    this.groupDeath = [];
    this.what = '';

    this.pressureCoeff = this.getGene('pressure', 1, 0.01, 2);
    this.eyeCloserCoeff = this.getGene('eyeCloser', 1, 0.01, 1);
    this.wideSpaceToEyeCoeff = this.getGene('wideSpaceToEye', 0.5, 0.01, 1);
}
inherits(MoveInfo, Heuristic);
module.exports = MoveInfo;


MoveInfo.prototype.evalBoard = function () {
    this.debug = this.player.debugMode;
    this.grid.init(null);
    this.groupDeath.length = 0;
};

MoveInfo.prototype.collectScores = function (stateYx, scoreYx) {
    Heuristic.prototype.evalBoard.call(this, stateYx, scoreYx); // calls _evalMove below
};

MoveInfo.prototype._evalMove = function (i, j) {
    var cell = this.grid.yx[j][i];
    if (!cell) return 0;
    return cell.computeScore();
};

// Redefines Heuristic#getMoveSurvey
MoveInfo.prototype.getMoveSurvey = function (i, j, survey) {
    var cell = this.grid.yx[j][i];
    if (cell) cell.computeScore(survey, this.name);
};

function CellInfo() {
    this.fakeEyeForColor = null;
    this.score = 0;
    this.goals = [];
    this.goalFactors = [];
    this.goalNumMoves = [];
}

CellInfo.prototype.computeScore = function (survey, hName) {
    var score = this.score;
    if (survey && score) survey[hName + '-base'] = score;
    var goals = this.goals;
    if (!goals.length) return score;

    for (var n = goals.length - 1; n >= 0; n--) {
        var goal = goals[n];
        var goalScore = goal.score * this.goalFactors[n];
        score += goalScore;

        if (survey) {
            var f = this.goalFactors[n], factorStr = f !== 1 ? ' factor:' + f.toFixed(2) : '';
            survey[hName + '-' + goal + factorStr] = goalScore;
        }
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
    this.group = g;
    this.minMoves = Infinity;
}

Goal.prototype.toString = function () {
    return this.name +
        (this.minMoves !== Infinity ? ' minMoves:' + this.minMoves : '') +
        ' score:' + this.score.toFixed(2);
};

//---

MoveInfo.prototype._enter = function (name, g, stone) {
    this.what = name + ' on ' + g.toString(1);

    if (stone.i === this.player.testI && stone.j === this.player.testJ) {
        main.debug = true; // set your breakpoint here if needed
        main.log.debug('MoveInfo scoring ' + stone + ': ' + this.what);
    } else {
        main.debug = false;
    }
};

MoveInfo.prototype._groupDeathGoal = function (g) {
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

    this.groupDeath[g.ndx] = goal = new Goal('death of ' + g.toString(1), cost, g);
    return goal;
};

MoveInfo.prototype._goalReachedByMove = function (goal, stone, factor, numMoves) {
    if (!stone)  throw new Error('Unexpected'); //return goal;
    factor = factor || 1;
    numMoves = numMoves || 1;
    if (main.debug) main.log.debug('Goal reached by ' + stone + ': ' + goal +
        (factor ? ' factor:' + factor.toFixed(2) : '') + (numMoves ? ' numMoves:' + numMoves : ''));

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

MoveInfo.prototype._countWideSpace = function (g) {
    if (g.lives <= g.stones.length) return 0; // blunt simplification
    var count = 0, color = g.color;
    var enemyInf = this.infl[1 - color];
    var lives = g.allLives();
    for (var i = lives.length - 1; i >= 0; i--) {
        var s = lives[i];
        if (enemyInf[s.j][s.i] > 0) continue;
        var v = this.player.boan.getVoidAt(s);
        if (v.owner && v.owner.group.color === color) continue;
        count++;
    }
    return count;
};

function twoEyeChance(potEyeCount) {
    if (potEyeCount >= 2.5) return 1;
    if (potEyeCount < 1.5) return 0;
    if (potEyeCount < 2) return 0.5;
    return 0.9; // REVIEW ME
}

MoveInfo.prototype.groupChance = function (gi) {
    var band = gi.band;
    return this._bandChance(band ? band.brothers : [gi]);
};

// @return {number} between 0=dead and 1=lives always
MoveInfo.prototype._bandChance = function (ginfos, addedEyes) {
    if (ginfos.length === 1) { // REVIEW ME maybe even if > 1
        var g = ginfos[0].group;
        if (g.xAlive === ALWAYS) return 1;
        if (g.xDEAD === ALWAYS) return 0;
    }
    var potEyeCount = addedEyes || 0;
    for (var n = ginfos.length - 1; n >= 0; n--) {
        potEyeCount += ginfos[n].countPotEyes();
    }
    var twoEyeCh = twoEyeChance(potEyeCount);
    if (twoEyeCh === 1) {
        if (main.debug) main.log.debug('MoveInfo: ' + potEyeCount + ' pot eyes for band of ' + ginfos[0]);
        return 1;
    }

    var wideSpace = 0;
    for (n = ginfos.length - 1; n >= 0; n--) {
        wideSpace += this._countWideSpace(ginfos[n].group);
    }
    wideSpace *= this.wideSpaceToEyeCoeff;
    return twoEyeChance(potEyeCount + wideSpace);
};

MoveInfo.prototype._bandThreat = function (ginfos, stone, saving, factor, numMoves, addedEyes) {
    factor = factor || 1;
    var chance = this._bandChance(ginfos, addedEyes);
    factor *= (1 - chance);
    if (factor < MIN_FACTOR) {
        if (main.debug) main.log.debug('MoveInfo: juging safe the band of ' + ginfos[0].group.toString(1));
        return;
    }

    var lives = numMoves || 0;
    for (var n = ginfos.length - 1; n >= 0; n--) {
        lives += ginfos[n].group.lives;
    }

    for (n = ginfos.length - 1; n >= 0; n--) {
        this._groupCost(ginfos[n].group, stone, saving, factor, lives);
    }
    return factor;
};

MoveInfo.prototype._groupCost = function (g, stone, saving, factor, numMoves) {
    if (factor < MIN_FACTOR) return;

    var goal = this._groupDeathGoal(g);

    if (!saving) this._countSavedAllies(g, stone, factor, numMoves);

    return this._goalReachedByMove(goal, stone, factor, numMoves);
};

// Count indirectly saved groups
MoveInfo.prototype._countSavedAllies = function (killedEnemy, stone, factor, numMoves) {
    // do not count any saved allies if we gave them a single life in corner
    if (killedEnemy.stones.length === 1 && killedEnemy.stones[0].isCorner()) {
        return;
    }
    if (stone.numEmpties() === 0 && killedEnemy.stones.length < 3) return;
    numMoves = numMoves || 1;
    var allies = killedEnemy.allEnemies();
    for (var a = allies.length - 1; a >= 0; a--) {
        var ally = allies[a];
        if (ally.lives < numMoves) continue;
        if (ally.xAlive === ALWAYS) continue;

        var threatFactor = factor * this._bandThreat([ally._info], stone, false, factor, numMoves);
        if (threatFactor < MIN_FACTOR) continue;
        this._bandThreatIfKilled(ally, stone, threatFactor, numMoves);
    }
};

// Counts threats saved on g's band if g is saved
MoveInfo.prototype._bandThreatIfKilled = function (g, stone, factor, numMoves) {
    var bands = g._info.getSubBandsIfKilled(stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/true, factor, numMoves);
    }
};

MoveInfo.prototype.addPressure = function (g, stone) {
    var pressure = 1 / (g.lives + 1) * this.pressureCoeff;
    if (g.xDead === ALWAYS) {
        if (!this.player.areaScoring) return 0;
        pressure = this.minimumScore;
    }
    this._getCell(stone.i, stone.j).score += pressure;
    if (this.debug && stone.i === this.player.testI && stone.j === this.player.testJ) {
        main.log.debug('MoveInfo ' + Grid.colorName(1 - g.color) + ' - pressure at ' + stone + ': ' + pressure.toFixed(2));
    }
};

MoveInfo.prototype.giveMinimumScore = function (stone) {
    this._getCell(stone.i, stone.j).score += this.minimumScore;
};

MoveInfo.prototype.raceThreat = function (g, stone) {
    if (this.debug) this._enter('race', g, stone);
    var gi = g._info;
    var ginfos = gi.band ? gi.band.brothers : [gi];
    this._bandThreat(ginfos, stone, false);
};

MoveInfo.prototype.eyeThreat = function (g, stone, color, numEyes) {
    if (this.debug) this._enter('eye threat', g, stone);
    var gi = g._info;
    var ginfos = gi.band ? gi.band.brothers : [gi];

    this._bandThreat(ginfos, stone, color === g.color, undefined, undefined, -numEyes);
    return true;
};

MoveInfo.prototype.cutThreat = function (groups, stone, color) {
    var g = groups[0];
    if (this.debug) this._enter('cut', g, stone);
    var saving = color === g.color;

    var bands = g._info.getSubBandsIfCut(groups, stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, saving);
    }
};

MoveInfo.prototype.killThreat = function (g, stone) {
    if (this.debug) this._enter('kill', g, stone);
    var bands = g._info.getSubBandsIfKilled(stone);
    for (var i = bands.length - 1; i >= 0; i--) {
        this._bandThreat(bands[i], stone, /*saving=*/false);
    }
    this._groupCost(g, stone, false, 1, g.lives);
};

MoveInfo.prototype.rescueGroup = function (g, stone) {
    if (this.debug) this._enter('rescue', g, stone);
    this._bandThreatIfKilled(g, stone);
    this._groupCost(g, stone, true);
};

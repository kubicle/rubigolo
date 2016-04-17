'use strict';

var CONST = require('../../../constants');
var main = require('../../../main');
var Grid = require('../../../Grid');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = CONST.EMPTY, GRID_BORDER = CONST.GRID_BORDER;
var BLACK = CONST.BLACK, WHITE = CONST.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES, UNDECIDED = GroupInfo.UNDECIDED;

// Analyse modes:
var SCORE = 0, TERRITORY = 1, MOVE = 2;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser(game) {
    this.game = game;
    this.version = 'chuckie';
    this.mode = null;
    this.areaScoring = false; // true if we count area; false if we count territory & prisoners
    this.goban = null;
    this.analyseGrid = null;
    this.scoreGrid = null;
    this.allVoids = [];
    this.allGroupInfos = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners[BLACK] = this.prisoners[WHITE] = 0;
    if (!this.scoreGrid || this.scoreGrid.gsize !== goban.gsize) {
        this.scoreGrid = new Grid(goban.gsize, GRID_BORDER);
    }

    if (!this._initAnalysis(SCORE, goban, this.scoreGrid)) return;
    this._runAnalysis();

    if (!this.areaScoring) goban.countPrisoners(this.prisoners);
};

BoardAnalyser.prototype.getScoringGrid = function () {
    return this.scoreGrid;
};

BoardAnalyser.prototype.getVoidAt = function (stone) {
    return this.analyseGrid.yx[stone.j][stone.i];
};

BoardAnalyser.prototype.startMoveAnalysis = function (goban, grid) {
    this._initAnalysis(MOVE, goban, grid);
};

BoardAnalyser.prototype.continueMoveAnalysis = function () {
    this._runAnalysis();
};

BoardAnalyser.prototype.analyseTerritory = function (goban, grid, first2play) {
    if (!this._initAnalysis(TERRITORY, goban, grid)) return;
    this._runAnalysis(first2play);
};

BoardAnalyser.prototype.image = function () {
    return this.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' + this.analyseGrid.toText() + 'Voids:\n';
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        res += v.toString() + '\n';
    }
    res += 'Groups:\n';
    for (var ndx in this.allGroupInfos) {
        res += this.allGroupInfos[~~ndx].toString() + '\n';
    }
    if (this.scores) {
        res += 'Score:' + this.scores.map(function (s, i) {
            return ' player ' + i + ': ' + s + ' points';
        });
    }
    return res;
};

BoardAnalyser.prototype._initAnalysis = function (mode, goban, grid) {
    this.mode = mode;
    this.areaScoring = this.game.useAreaScoring && mode === SCORE;
    this.goban = goban;
    this.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    grid.initFromGoban(goban);
    this._initVoidsAndGroups();
    this._findBrothers();
    this._findEyeOwners();
    return true;
};

BoardAnalyser.prototype._runAnalysis = function (first2play) {
    if (this.mode === MOVE) {
        this._lifeOrDeathLoop();
    } else {
        this._findBattleWinners();
        this._lifeOrDeathLoop(first2play);
        this._findDameVoids();
        this._finalColoring();
    }
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroupInfos[g.ndx];
    if (!gi) {
        if (!g._info || g._info.boan !== this) {
            g._info = new GroupInfo(g, this);
        } else {
            g._info.resetAnalysis();
        }
        gi = this.allGroupInfos[g.ndx] = g._info;
    }
    gi.nearVoids.push(v);
};

/** Create the list of voids and groups.
 * Voids know which groups are around them, but groups do not own any void yet.
 */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroupInfos = {};
    this.allVoids.clear();
    var n, groups, goban = this.goban;
    var v = new Void(goban, voidCode++);
    for (var j = 1; j <= goban.gsize; j++) {
        for (var i = 1; i <= goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, v);
            if (vcount === 0) continue;

            // 1 new void created
            this.allVoids.push(v);
            // keep all the groups
            for (var color = BLACK; color <= WHITE; color++) {
                groups = v.groups[color];
                for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);
            }

            v = new Void(goban, voidCode++);
        }
    }
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroupInfos) {
        this.allGroupInfos[~~ndx].findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    var allVoids = this.allVoids, count = allVoids.length;
    for (var n = count - 1; n >= 0; n--) {
        allVoids[n].findOwner();
    }
    var changed;
    for (;;) {
        changed = false;
        for (n = count - 1; n >= 0; n--) {
            if (allVoids[n].checkFakeEye()) changed = true;
        }
        if (!changed) break;
    }
    for (n = count - 1; n >= 0; n--) {
        allVoids[n].finalizeFakeEye();
    }
};

function normalizeLiveliness(life) {
    // Remove 1 if we have only 1 eye - a single-eye group is not more "resistant"
    if (life > 1 && life < 2) {
        return life - 1;
    }
    return life;
}

function compareLiveliness(life) {
    // make sure we have a winner, not a tie
    if (life[BLACK] === life[WHITE] || (life[BLACK] >= ALIVE && life[WHITE] >= ALIVE)) {
        return undefined;
    }
    life[BLACK] = normalizeLiveliness(life[BLACK]);
    life[WHITE] = normalizeLiveliness(life[WHITE]);
    return life[BLACK] > life[WHITE] ? BLACK : WHITE;
}

BoardAnalyser.prototype._findBattleWinners = function () {
    if (this.areaScoring) return;
    var goban = this.goban;
    if (goban.moveNumber() < 2 * goban.gsize) return; // no battle before enough moves were played
    var life = [0, 0], size = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.color !== undefined) continue;
            if (v.vcount > 2 * goban.gsize) continue; // no battle for big voids
            life[BLACK] = life[WHITE] = size[BLACK] = size[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                // NB: we don't check for brothers' liveliness counted twice.
                // No issue noticed so far - see testUnconnectedBrothers / b4
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness();
                    size[color] += gi.countBandSize();
                }
            }
            // no battle if 2 big groups around
            if (size[BLACK] > 4 && size[WHITE] > 4) continue;

            var winner = compareLiveliness(life);
            // make sure we have a winner, not a tie
            if (winner === undefined) {
                if (main.debug) main.log.debug('BATTLED VOID in dispute: ' + v + ' with ' + life[0]);
                continue;
            }
            if (main.debug) main.log.debug('BATTLED VOID: ' + Grid.colorName(winner) +
                ' wins with ' + life[winner].toFixed(4) + ' VS ' + life[1 - winner].toFixed(4));
            v.setVoidOwner(winner);
            foundOne = true;
        }
        if (!foundOne) break;
    }
};

// Review which groups are dead after a "liveliness" check
function killWeakest(check, fails) {
    // For all groups that failed the test, filter out these that have a weaker neighbor
    for (var i = 0; i < fails.length; i++) {
        var fail = fails[i];
        if (main.debug) main.log.debug('FAIL-' + check.name + ': group #' + fail.group.ndx);
        if (fail.checkAgainstEnemies() !== FAILS)
            fails[i] = null;
    }
    var count = 0;
    for (i = 0; i < fails.length; i++) {
        if (!fails[i]) continue;
        fails[i].considerDead(check.name + ': liveliness=' + fails[i]._liveliness.toFixed(4));
        count++;
    }
    return count;
}

function killAllFails(check, fails) {
    for (var i = 0; i < fails.length; i++) {
        fails[i].considerDead(check.name);
    }
    return fails.length;
}

function killNone() {
    return 0;
}

var brotherCheck =   { name: 'brothers', run: GroupInfo.prototype.checkBrothers };
var singleEyeCheck = { name: 'singleEye', run: GroupInfo.prototype.checkSingleEye, kill: killWeakest };
var raceCheck = { name: 'race', run: GroupInfo.prototype.checkAgainstEnemies, kill: killNone };
var killAtaris = { name: 'atari', run: function () { return this.group.lives <= 1 ? FAILS : UNDECIDED; } };
var finalCheck = { name: 'final', run: function () { return this.checkLiveliness(2); } };

var lifeChecks = [];
lifeChecks[SCORE] = [
    brotherCheck,
    killAtaris,
    singleEyeCheck,
    finalCheck
];
lifeChecks[TERRITORY] = [
    brotherCheck,
    singleEyeCheck
];
lifeChecks[MOVE] = [
    brotherCheck,
    singleEyeCheck,
    raceCheck
];

// NB: order of group should not matter; we must remember this especially when killing some of them
BoardAnalyser.prototype._reviewGroups = function (check, first2play) {
    if (main.debug) main.log.debug('---REVIEWING groups for "' + check.name + '" checks');
    var count = 0, reviewedCount = 0, fails = [];
    for (var ndx in this.allGroupInfos) {
        var gi = this.allGroupInfos[~~ndx];
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;

        switch (check.run.call(gi, first2play)) {
        case FAILS:
            fails.push(gi);
            break;
        case LIVES:
            count++;
            break;
        }
    }
    if (fails.length) {
        // if no dedicated method is given, simply kill them all
        count += check.kill ? check.kill(check, fails) : killAllFails(check, fails);
    }
    if (main.debug && count) main.log.debug('==> "' + check.name + '" checks found ' +
        count + '/' + reviewedCount + ' groups alive/dead');
    if (count === reviewedCount) return 0; // really finished
    if (count === 0) return reviewedCount; // remaining count
    return -count; // processed count
};

// Reviews the groups and declare "dead" the ones who do not own enough eyes or voids
BoardAnalyser.prototype._lifeOrDeathLoop = function (first2play) {
    if (this.areaScoring) return;
    var checks = lifeChecks[this.mode];
    var stepNum = 0, count;
    while (stepNum < checks.length) {
        count = this._reviewGroups(checks[stepNum++], first2play);
        if (count === 0) {
            this._findEyeOwners();
            return;
        }
        if (count < 0) {
            // we found dead/alive groups => rerun all the checks from start
            stepNum = 0;
            this._findEyeOwners();
            continue;
        }
    }
    if (main.debug && count > 0) main.log.debug('*** UNDECIDED groups after _lifeOrDeathLoop:' + count);
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype._findDameVoids = function () {
    var aliveColors = [];
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        aliveColors[BLACK] = aliveColors[WHITE] = false;
        for (var c = BLACK; c <= WHITE; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (this.areaScoring || g._info.liveliness() >= 2) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.setAsDame();
        } else if (this.areaScoring) {
            v.color = aliveColors[BLACK] ? BLACK : WHITE;
        }
    }
};

BoardAnalyser.prototype._finalColoring = function () {
    this._countGroupArea();
    this._colorAndCountDeadGroups();
    this._colorAndCountVoids();
};

BoardAnalyser.prototype._countGroupArea = function () {
    if (!this.areaScoring) return;
    for (var ndx in this.allGroupInfos) {
        var group = this.allGroupInfos[~~ndx].group;
        this.scores[group.color] += group.stones.length;
    }
};

BoardAnalyser.prototype._colorAndCountDeadGroups = function () {
    if (this.areaScoring) return;
    for (var ndx in this.allGroupInfos) {
        var gi = this.allGroupInfos[~~ndx];
        if (!gi.isDead) continue;

        // At least 1 enemy around must be alive otherwise this group is not really dead
        var reallyDead = false;
        for (var n = gi.killers.length - 1; n >= 0; n--) {
            if (!gi.killers[n]._info.isDead) { reallyDead = true; break; }
        }
        // If not really dead we own the voids around
        var color = gi.group.color;
        if (gi.killers.length && !reallyDead) {
            for (var i = gi.nearVoids.length - 1; i >= 0; i--) {
                gi.nearVoids[i].setVoidOwner(color);
            }
            continue;
        }

        var stone = gi.group.stones[0];
        var taken = this.filler.fillWithColor(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype._colorAndCountVoids = function () {
    var gridYx = this.analyseGrid.yx;
    var fakes = [];

    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        var score = v.getScore(this.areaScoring ? null : fakes);
        if (score) {
            // Get real score added by void (not counting fakes)
            this.scores[v.color] += score - fakes.length;
            // Fill the void with its color
            this.filler.fillWithColor(v.i, v.j, v, Grid.TERRITORY_COLOR + v.color);
            // Mark fakes as DAME, one by one
            for (var n = fakes.length - 1; n >= 0; n--) {
                var s = fakes[n];
                gridYx[s.j][s.i] = Grid.DAME_COLOR;
            }
        } else {
            // This whole void is DAME (between 2 alive groups)
            this.filler.fillWithColor(v.i, v.j, v, Grid.DAME_COLOR);
        }
    }
};

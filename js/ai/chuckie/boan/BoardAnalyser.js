'use strict';

var main = require('../../../main');
var Grid = require('../../../Grid');
var GroupInfo = require('./GroupInfo');
var Void = require('./Void');
var ZoneFiller = require('./ZoneFiller');

var EMPTY = main.EMPTY, BLACK = main.BLACK, WHITE = main.WHITE;
var ALIVE = GroupInfo.ALIVE;
var FAILS = GroupInfo.FAILS, LIVES = GroupInfo.LIVES;


/** @class Our main board analyser / score counter etc.
 */
function BoardAnalyser() {
    this.version = BoardAnalyser.VERSION;
    this.mode = null;
    this.goban = null;
    this.allVoids = [];
    this.allGroups = null;
    this.scores = [0, 0];
    this.prisoners = [0, 0];
    this.filler = null;
}
module.exports = BoardAnalyser;


var BOAN_VERSION = BoardAnalyser.VERSION = 'chuckie';


BoardAnalyser.prototype.countScore = function (goban) {
    if (main.debug) main.log.debug('Counting score...');
    this.scores[BLACK] = this.scores[WHITE] = 0;
    this.prisoners = goban.countPrisoners();

    var grid = goban.scoringGrid.initFromGoban(goban);
    if (!this._initAnalysis('SCORE', goban, grid)) return;
    this._runAnalysis();
    this._finalColoring();
    if (main.debug) main.log.debug(grid.toText(function (c) { return Grid.colorToChar(c); }));
};

BoardAnalyser.prototype.getScoringGrid = function () {
    return this.goban.scoringGrid;
};

BoardAnalyser.prototype.analyse = function (goban, grid, first2play) {
    var mode = first2play === undefined ? 'MOVE' : 'TERRITORY';
    if (!this._initAnalysis(mode, goban, grid)) return;
    this._runAnalysis(first2play);
    if (mode === 'TERRITORY') this._finalColoring();
};

BoardAnalyser.prototype.image = function () {
    return this.goban.analyseGrid.image();
};

BoardAnalyser.prototype.debugDump = function () {
    var res = 'Grid:\n' +
        this.goban.analyseGrid.toText(function (c) { return Grid.colorToChar(c); }) +
        'Voids:\n';
    for (var v, v_array = this.allVoids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        res += v.toString() + '\n';
    }
    res += 'Groups:\n';
    for (var ndx in this.allGroups) {
        res += this.allGroups[~~ndx].toString() + '\n';
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
    this.goban = goban;
    goban.analyseGrid = grid;
    this.filler = new ZoneFiller(goban, grid);
    if (goban.moveNumber() === 0) return false;

    this._initVoidsAndGroups();
    return true;
};

BoardAnalyser.prototype._addGroup = function (g, v) {
    var gi = this.allGroups[g.ndx];
    if (!gi) {
        if (!g._info || g._info.version !== BOAN_VERSION) {
            g._info = new GroupInfo(g, BOAN_VERSION);
        } else {
            g._info.resetAnalysis();
        }
        gi = this.allGroups[g.ndx] = g._info;
    }
    gi.nearVoids.push(v);
};

/** Create the list of voids and groups.
 * Voids know which groups are around them, but groups do not own any void yet.
 */
BoardAnalyser.prototype._initVoidsAndGroups = function () {
    if (main.debug) main.log.debug('---Initialising voids & groups...');
    var voidCode = Grid.ZONE_CODE;
    this.allGroups = {};
    this.allVoids.clear();
    var neighbors = [[], []], n, groups;
    var v = new Void(voidCode++);
    for (var j = 1; j <= this.goban.gsize; j++) {
        for (var i = 1; i <= this.goban.gsize; i++) {
            var vcount = this.filler.fillWithColor(i, j, EMPTY, v, neighbors);
            if (vcount === 0) continue;

            // 1 new void created
            v.init(i, j, vcount, neighbors);
            this.allVoids.push(v);

            // keep all the groups
            groups = neighbors[BLACK];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);
            groups = neighbors[WHITE];
            for (n = groups.length - 1; n >= 0; n--) this._addGroup(groups[n], v);

            neighbors = [[], []];
            v = new Void(voidCode++);
        }
    }
};

BoardAnalyser.prototype._runAnalysis = function (first2play) {
    this._findBrothers();
    this._findEyeOwners();
    this._findBattleWinners();
    this._lifeOrDeathLoop(first2play);
    this._findDameVoids();
};

BoardAnalyser.prototype._findBrothers = function () {
    for (var ndx in this.allGroups) {
        this.allGroups[~~ndx].findBrothers();
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype._findEyeOwners = function () {
    if (main.debug) main.log.debug('---Finding eye owners...');
    for (var n = this.allVoids.length - 1; n >= 0; n--) {
        this.allVoids[n].findOwner();
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
    var life = [0, 0];
    for (;;) {
        var foundOne = false;
        for (var i = this.allVoids.length - 1; i >= 0; i--) {
            var v = this.allVoids[i];
            if (v.color !== undefined) continue;
            life[BLACK] = life[WHITE] = 0;
            for (var color = BLACK; color <= WHITE; color++) {
                // NB: we don't check for brothers' liveliness counted twice.
                // No issue noticed so far - see testUnconnectedBrothers / b4
                for (var n = v.groups[color].length - 1; n >= 0; n--) {
                    var gi = v.groups[color][n]._info;
                    life[color] += gi.liveliness() + gi.group.lives / 10000; // is gi.group.lives still necessary?
                }
            }
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
        var enemies = fail.group.allEnemies();
        for (var e = 0; e < enemies.length; e++) {
            var enemy = enemies[e]._info;
            var cmp = fail._liveliness - enemy.liveliness();
            if (main.debug) main.log.debug('FAIL: group #' + fail.group.ndx + ' with ' +
                fail._liveliness + ' against ' + (fail._liveliness - cmp) + ' for enemy group #' + enemy.group.ndx);
            if (cmp > 0) {
                if (main.debug) main.log.debug(check.name + ' would fail ' + fail +
                    ' BUT keept alive since it is stronger than ' + enemy);
                fails[i] = null;
                break;
            } else if (cmp === 0) {
                if (main.debug) main.log.debug('RACE between ' + fail.group + ' and ' + enemy.group);
                fail.group.xInRaceWith = enemy.group;
                enemy.group.xInRaceWith = fail.group;
                fails[i] = null;
                break;
            }
        }
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

var parentCheck =      { name: 'parents',     run: function (gi) { return gi.checkParents(); } };
var brotherCheck =     { name: 'brothers',    run: function (gi) { return gi.checkBrothers(); } };
var singleEyeCheck = {
    name: 'singleEye',   
    run: function (gi, first) { return gi.checkSingleEye(first); },
    kill: killWeakest
};
var finalCheck = { name: 'final', run: function (gi) { return gi.checkLiveliness(2); } };

var midGameLifeChecks = [
    parentCheck,
    brotherCheck,
    singleEyeCheck
    // We don't expect a final liveliness (2) in mid-game
];
var scoringLifeChecks = [
    parentCheck,
    brotherCheck,
    singleEyeCheck,
    finalCheck
];

// NB: order of group should not matter; we must remember this especially when killing some of them
BoardAnalyser.prototype._reviewGroups = function (check, first2play) {
    if (main.debug) main.log.debug('---REVIEWING groups for "' + check.name + '" checks');
    var count = 0, reviewedCount = 0, fails = [];
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[~~ndx];
        if (gi.isAlive || gi.isDead) continue;
        reviewedCount++;

        switch (check.run(gi, first2play)) {
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
    var checks = this.mode === 'SCORE' ? scoringLifeChecks : midGameLifeChecks;
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
                if (g._info.liveliness() >= 2) {
                    aliveColors[c] = true;
                    break;
                }
            }
        }
        if (aliveColors[BLACK] && aliveColors[WHITE]) {
            v.setAsDame();
        }
    }
};

BoardAnalyser.prototype._finalColoring = function () {
    this._colorDeadGroups();
    this._colorVoids();
};

BoardAnalyser.prototype._colorDeadGroups = function () {
    for (var ndx in this.allGroups) {
        var gi = this.allGroups[~~ndx];
        if (!gi.isDead) continue;

        // At least 1 enemy around must be alive 
        var reallyDead = false;
        for (var n = gi.killers.length - 1; n >= 0; n--) {
            if (!gi.killers[n]._info.isDead) reallyDead = true;
        }
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
BoardAnalyser.prototype._colorVoids = function () {
    var color;
    for (var i = this.allVoids.length - 1; i >= 0; i--) {
        var v = this.allVoids[i];
        var score = v.finalScore();
        if (score) {
            this.scores[v.color] += score;
            color = Grid.TERRITORY_COLOR + v.color;
        } else {
            color = Grid.DAME_COLOR;
        }
        this.filler.fillWithColor(v.i, v.j, v, color);
    }
};

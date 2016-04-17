//Translated from hunter.rb using babyruby2js
'use strict';

var main = require('../../main');

var Grid = require('../../Grid');
var Heuristic = require('./Heuristic');
var inherits = require('util').inherits;

var ALWAYS = main.ALWAYS;


/** @class Hunters find threats to struggling enemy groups.
 *  Ladder attack fits in here. */
function Hunter(player) {
    Heuristic.call(this, player);

    this.snapbacks = null;
    this.noEasyPrisonerYx = player.heuristic.NoEasyPrisoner.scoreGrid.yx;
}
inherits(Hunter, Heuristic);
module.exports = Hunter;


/** Returns true if group g could get at least minLives by killing one of the
 *  enemy groups around in atari
 */
Hunter.prototype._gotLivesFromKillingAround = function (g, minLives) {
    var enemies = g.allEnemies();
    for (var n = enemies.length - 1; n >= 0; n--) {
        var eg = enemies[n];
        if (eg.lives > 1) continue;
        // found 1 enemy group in atari; killing it would give us its size in new lives
        var addedLives = eg.stones.length;
        if (addedLives >= minLives) return true;
        // this is not enough, so count lives we would get by connecting with our groups around eg
        var allies = eg.allEnemies();
        for (var a = allies.length - 1; a >= 0; a--) {
            addedLives += allies[a].lives - 1;
            if (addedLives >= minLives) return true;
        }
    }
    return false;
};


var KO_KILL_SCORE = 1;
var RACE_KILL_SCORE = 1.1; // just need to be enough to let the move happen (score comes from pressure eval)

/** Returns a score to measure what kind of kill a move is.
 *  Any number < 1.01 is sign of a "not so good" kill.
 *  E.g. in this board, black c5 has a bad "kill score" of 1.0001
 *  5 O@+OO
 *  4 O@O@+
 *  3 OO@@+
 *  2 ++@++
 *  1 ++@++
 *    abcde
 *  NB: kill score of a KO is 1 (KO_KILL_SCORE)
 */
Hunter.prototype._killScore = function (empty, color) {
    var numAllies = 0, numKill = 0, life = 0;
    for (var i = empty.neighbors.length - 1; i >= 0; i--) {
        var n = empty.neighbors[i];
        switch (n.color) {
        case main.EMPTY:
            life += 0.01;
            break;
        case color: // ally
            life += (n.group.lives - 1) * 0.01;
            if (n.group.xAlive === ALWAYS) life += 2;
            numAllies += 0.0001;
            break;
        default: // enemy
            if (n.group.xInRaceWith) return RACE_KILL_SCORE;
            if (n.group.lives > 1) break; // not a kill
            numKill += n.group.stones.length;
        }
    }
    return numKill + life + numAllies;
};

Hunter.prototype._countAtariThreat = function (killerStone, enemies, level) {
    var minimumScore = false, isKill = false;

    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        var eg = enemies[egNdx];
        if (eg.lives !== 1) continue;
        // if we can take eg anytime later, no need to take it now
        //TODO also verify no group in "enemies" is strong
        if (!level && this._isAtariGroupCaught(eg, level) && !this._gotLivesFromKillingAround(eg, 1)) {
            if (this.player.areaScoring) minimumScore = true;
            continue;
        }
        isKill = true;
        if (!level) this.mi.killThreat(eg, killerStone);
    }
    if (minimumScore) this.mi.giveMinimumScore(killerStone);
    return isKill;
};

// It is a snapback if the last empty point is where the enemy will have to play
// AND would not make the enemy group connect to a stronger enemy group.
Hunter.prototype._isSnapback = function (killerStone, lastEmpty, eg) {
    if (!lastEmpty.isNextTo(eg)) return false;
    var enemiesAroundEmpty = lastEmpty.uniqueAllies(eg.color);
    for (var e = enemiesAroundEmpty.length - 1; e >= 0; e--) {
        var enemy = enemiesAroundEmpty[e];
        if (enemy.lives > 2) return false;
        if (!killerStone.isNextTo(enemy)) return false;
    }
    return true;
};

Hunter.prototype._countPreAtariThreat = function (stone, enemies, empties, color, level, egroups) {
    var isSnapback = false, eg;
    var allies = stone.uniqueAllies(color);
    // now look for groups with 2 lives
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        eg = enemies[egNdx];
        if (eg.lives !== 2) continue;
        // no good if enemy can escape by killing one of our weak groups around
        if (this._gotLivesFromKillingAround(eg, 2)) continue; // >=2 because killing 1 stone is not enough to escape
        // same but for the group of our new stone; if should not become atari either
        if (empties.length === 0 && allies.length === 1 && allies[0].lives === 2) continue;
        // If no ally & our new stone is atari
        if (empties.length === 1 && allies.length === 0) {
            // Unless a snapback, this is a dumb move
            if (!this._isSnapback(stone, empties[0], eg)) continue;
            isSnapback = true;
            if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + ' sees a snapback in ' + stone);
        }
        if (!level && eg._info.isInsideEnemy()) continue; // avoid chasing inside our groups - eyes are #1 goal
        egroups.push(eg);
    }
    return isSnapback;
};

// Presupposes that stone.isNextTo(enemy) is true
Hunter.prototype._isValidRaceMove = function (stone, enemy, ally) {
    if (!ally || enemy.lives !== ally.lives) return false;
    if (!ally.isValid()) return false;
    if (stone.isNextTo(ally) && ally.livesAddedByStone(stone) < 1) return false; // playing stone would not help us
    // TODO check all lives; if one of them is a better move than stone, then return false
    // var added = enemy.livesAddedByStone(stone);
    // var lives = enemy.allLives();
    // for (var n = lives.length - 1; n >= 0; n--) {
    //     if (enemy.livesAddedByStone(lives[n]) > added) return false;
    // }
    return true;
};

Hunter.prototype._countPressureAndRace = function (stone, enemies, level, isEasyPrisoner) {
    var isKill = false;
    for (var egNdx = enemies.length - 1; egNdx >= 0; egNdx--) {
        var enemy = enemies[egNdx];
        var egl = enemy.lives, allyInRace = enemy.xInRaceWith;
        if (egl > 2 && this._isValidRaceMove(stone, enemy, allyInRace)) {
            if (!level) this.mi.raceThreat(enemy, stone);
            isKill = true;
        } else if (egl >= 2 && level === 0 && !isEasyPrisoner) {
            if (!level) this.mi.addPressure(enemy, stone); // see TestAi#testSemiAndEndGame h1 & b8 for examples
        }
    }
    return isKill;
};

Hunter.prototype._beforeEvalBoard = function () {
    this.snapbacks = [];
};

Hunter.prototype._evalMove = function (i, j, color) {
    this._isKill(i, j, color, 0);
    return 0; // never rating directly; MoveInfo will do it
};

Hunter.prototype._isKill = function (i, j, color, level) {
    var stone = this.goban.stoneAt(i, j);
    var empties = stone.empties();
    var enemies = stone.uniqueAllies(1 - color);

    // now look for groups with 2 lives
    var egroups = [];
    var isSnapback = this._countPreAtariThreat(stone, enemies, empties, color, level, egroups);
    if (level === 0 && isSnapback) {
        this.snapbacks.push(stone); // for other heuristics to look at...
    }
    // unless snapback, make sure our new stone's group can survive
    if (!isSnapback && empties.length <= 1) {
        var killScore = this._killScore(stone, color); //TODO: make this easier!
        if (killScore !== KO_KILL_SCORE &&
            (killScore < 0.02 || (killScore > 1 && killScore < 1.01))) {
            return false;
        }
    }
    // count groups already in atari
    var isAtariKill = this._countAtariThreat(stone, enemies, level);
    // count some profit in removing enemy lives
    var isEasyPrisoner = !isSnapback && this.noEasyPrisonerYx[j][i] < 0;
    var isRaceKill = this._countPressureAndRace(stone, enemies, level, isEasyPrisoner);

    if (!egroups.length) return isAtariKill || isRaceKill;

    this.goban.tryAt(i, j, color); // our attack takes one of the 2 last lives (the one in i,j)

    // see attacks that fail
    var canEscape = [false, false, false];
    for (var g = egroups.length - 1; g >= 0; g--) {
        if (main.debug) main.log.debug('Hunter ' + Grid.colorName(color) + '(level ' + level + ') looking at threat ' + stone + ' on ' + egroups[g]);
        if (this._isAtariGroupCaught(egroups[g], level)) continue;
        if (egroups.length === 1) { egroups.pop(); break; }
        canEscape[g] = true;
    }

    this.goban.untry(); // important to undo before, so we compute threat right

    var isChaseKill = this._countMultipleChaseThreat(stone, egroups, canEscape, level);

    if (main.debug && (isAtariKill || isRaceKill || isChaseKill)) main.log.debug('Hunter ' + Grid.colorName(color) +
        ' found a kill at ' + Grid.xy2move(i, j) +
        (isAtariKill ? ' #atari' : '') + (isRaceKill ? ' #race' : '') + (isChaseKill ? ' #chase' : ''));
    return isAtariKill || isRaceKill || isChaseKill;
};

/** Returns the maximum threat we can hope for when several groups can be chased.
 *  Some of these chases might fail, but even so, the enemy can only defend one.
 *  Rule of thumb:
 *  - if 0 can escape => we capture the bigger one
 *  - if 1 or more can escape => we capture nothing if only 1, or the 2nd bigger if the 1st can escape
 */
Hunter.prototype._countMultipleChaseThreat = function (stone, egroups, canEscape, level) {
    switch (egroups.length) {
    case 0: return false;
    case 1:
        if (canEscape[0]) return false;
        if (!level) this.mi.killThreat(egroups[0], stone);
        return true;
    case 3: //TODO
    case 2:
        if (!level) {
            if (canEscape[1]) {
                this.mi.killThreat(egroups[0], stone);
            } else {
                this.mi.killThreat(egroups[1], stone);
            }
        }
        // if (!canEscape[0] && !canEscape[1]) return Math.max(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        // if ( canEscape[0] &&  canEscape[1]) return Math.min(this.groupThreat(egroups[0]), this.groupThreat(egroups[1]));
        // return canEscape[0] ? this.groupThreat(egroups[1]) : this.groupThreat(egroups[0]);
        return true;
    //function basicSort(a, b) { return a - b; }
    // case 3:
    //     var threats = [this.groupThreat(egroups[0]), this.groupThreat(egroups[1]), this.groupThreat(egroups[2])];
    //     if (!canEscape[0] && !canEscape[1] && !canEscape[2]) return Math.max(threats[0], threats[1], threats[2]);
    //     var sortedThreats = threats.concat().sort(basicSort);
    //     var bigger = threats.indexOf(sortedThreats[0]);
    //     if (!canEscape[bigger]) return threats[bigger];
    //     var secondBigger = threats.indexOf(sortedThreats[1]);
    //     return threats[secondBigger];
    default: throw new Error('Unexpected in Hunter#getMultipleChaseThreat');
    }
};

/** Evaluates if group g in atari (1 last escape move) can escape */
Hunter.prototype._isAtariGroupCaught = function (g, level) {
    var allLives = g.allLives();
    if (allLives.length !== 1) throw new Error('Unexpected: hunter #1: ' + allLives.length);

    var lastLife = allLives[0];
    var stone = this.goban.tryAt(lastLife.i, lastLife.j, g.color); // enemy's escape move
    var isCaught = this._isEscapingAtariCaught(stone, level);
    this.goban.untry();
    if (main.debug) main.log.debug('Hunter: group with last life ' + lastLife + ' would ' + (isCaught ? 'be caught: ' : 'escape: ') + g);
    return isCaught;
};

/** Checks if played stone has put a nearby enemy group in atari
 * Returns 0 if no atari
 *         1 if atari will help us escape (forces enemy to escape too)
 *        -1 if atari's reply is attacking us (so move was blunder)
 */
Hunter.prototype._atariOnEnemy = function (stone) {
    var enemyColor = 1 - stone.color;
    var neighbors = stone.neighbors;
    for (var n = neighbors.length - 1; n >= 0; n--) {
        var s = neighbors[n];
        if (s.color !== enemyColor) continue;
        var enemy = s.group;
        if (enemy.lives !== 1) continue;
        var escape = enemy.allLives()[0];
        if (!escape.isNextTo(stone.group)) return 1; // atari's escape is not attacking us back    
        if (this._isAtariGroupCaught(enemy, 1)) return 1; // enemy would die
        return -1; // bad move for us
    }
    return 0;
};

/** @param stone is the enemy group's escape move (just been played)
 *  @param [level] - just to keep track for logging purposes
 *  @return true if caught
 */
Hunter.prototype._isEscapingAtariCaught = function (stone, level) {
    var g = stone.group;
    if (g.lives <= 1) return true; // caught
    if (g.lives > 2) {
        return false; //TODO look better
    }
    // g.lives is 2

    // if escape move just put one of our groups in atari the chase fails
    var atari = this._atariOnEnemy(stone);
    if (atari !== 0) return atari < 0; // < 0 if counter atari fails

    // get 2 possible escape moves
    var empties = stone.empties();
    if (empties.length !== 2) {
        empties = g.allLives();
    }
    if (empties.length !== 2) throw new Error('Unexpected: hunter #2');
    var e1 = empties[0], e2 = empties[1];
    if (main.debug) main.log.debug('Hunter: group has 2 lives left: ' + e1 + ' and ' + e2);

    // try blocking the 2 moves (recursive descent)
    var color = 1 - g.color;
    return this._isKill(e1.i, e1.j, color, level + 1) ||
           this._isKill(e2.i, e2.j, color, level + 1);
};

/** @param stone is the enemy group's escape move (just been played)
 *  @return true if the group gets captured
 */
Hunter.prototype.isEscapingAtariCaught = function (stone) {
    return this._isEscapingAtariCaught(stone, 1);
};

Hunter.prototype.isKill = function (i, j, color) {
    return this._isKill(i, j, color, 1);
};

/** Called by other heuristics to know if a stone is a snapback for current move.
 * By snapback here we mean the 1st move = attacking (good) move of a snapback */
Hunter.prototype.isSnapback = function (stone) {
    return this.snapbacks.indexOf(stone) !== -1;
};

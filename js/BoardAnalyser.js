//Translated from board_analyser.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
var Group = require('./Group');
//require 'set';
var Goban = require('./Goban');
var ZoneFiller = require('./ZoneFiller');
// Class used by BoardAnalyser class.
// A void in an empty zone surrounded by (and including) various groups.
// NB: when a void has a single color around; we call this an eye. Can be discussed...
//public read-only attribute: code, i, j, size, groups, eye_color, owner;
// code is the void code (like a color but higher index)
// neighbors is an array of n arrays, with n == number of colors

/** @class */
function Void(analyser, code, i, j, size, neighbors) {
    this.analyzer = analyser;
    this.goban = analyser.goban;
    this.code = code;
    this.i = i;
    this.j = j;
    this.size = size;
    this.groups = neighbors; // neighboring groups (array of arrays; 1st index is color)
    this.eye_color = null; // stays nil if not an eye
    this.owner = null;
}
module.exports = Void;

// Call it once. Populates @eye_color
// @eye_color stays nil if there is more than 1 color around (not an eye) or full board empty
Void.prototype.eye_check = function () {
    var one_color = null;
    for (var c = 1; c <= this.groups.size; c++) {
        // is there 1 or more groups of this color?
        if (this.groups[c].size >= 1) {
            if (one_color) {
                one_color = null;
                break;
            } // we already had groups in another color
            one_color = c;
        }
    }
    this.eye_color = one_color;
    // Now tell the groups about this void
    if (one_color) {
        this.set_owner(one_color);
        for (var n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.add_void(this, true);
            }
        }
        if (main.debug) {
            return main.log.debug('Color ' + one_color + ' surrounds ' + this + ' (eye)');
        }
    } else {
        for (var n, n_array = this.groups, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
            for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                g.add_void(this);
            }
        }
        if (main.debug) {
            return main.log.debug(this + ' has to be sorted out...');
        }
    }
};

Void.prototype.set_owner = function (color) {
    this.owner = color;
};

Void.prototype.toString = function () {
    var s = 'void ' + this.code + ' (' + Grid.color_to_char(this.code) + '/' + this.i + ',' + this.j + '), size ' + this.size;
    for (var color = 1; color <= this.groups.size; color++) {
        s += ', ' + this.groups[color].size + ' ' + Grid.COLOR_NAMES[color] + ' neighbors';
    }
    return s;
};

Void.prototype.debug_dump = function () {
    console.log(this.toString());
    for (var color = 1; color <= this.groups.size; color++) {
        console.log('    Color ' + color + ' (' + Grid.color_to_char(color) + '):');
        for (var neighbor, neighbor_array = this.groups[color], neighbor_ndx = 0; neighbor=neighbor_array[neighbor_ndx], neighbor_ndx < neighbor_array.length; neighbor_ndx++) {
            console.log(' #' + neighbor.ndx);
        }
    }
    console.log('\n');
};

//public read-only attribute: goban, scores, prisoners;

/** @class */
function BoardAnalyser() {
    this.goban = null;
    this.voids = [];
    this.all_groups = new main.Set();
}
module.exports = BoardAnalyser;

// Calling this method updates the goban to show the detected result.
BoardAnalyser.prototype.count_score = function (goban, grid) {
    if (grid === undefined) grid = null;
    if (main.debug) {
        main.log.debug('Counting score...');
    }
    this.goban = goban;
    this.scores = [0, 0];
    this.prisoners = Group.prisoners(this.goban);
    this.filler = new ZoneFiller(this.goban, grid);
    this.find_voids();
    this.find_eyes();
    this.find_stronger_owners();
    this.find_dying_groups();
    this.find_dame_voids();
    this.color_voids();
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.owner) {
            this.scores[v.owner] += v.size;
        }
    }
    if (main.debug) {
        return this.debug_dump();
    }
};

BoardAnalyser.prototype.image = function () {
    return this.filler.grid.image();
};

BoardAnalyser.prototype.debug_dump = function () {
    console.log(this.filler.grid.to_text(function (c) {
        return Grid.color_to_char(c);
    }));
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.debug_dump();
    }
    if (this.scores) {
        console.log('\nGroups with 2 eyes or more: ');
        for (var g, g_array = this.all_groups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.size >= 2) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nGroups with 1 eye: ');
        for (var g, g_array = this.all_groups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.size === 1) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nGroups with no eye: ');
        for (var g, g_array = this.all_groups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
            if (g.eyes.size === 0) {
                console.log(g.ndx + ',');
            }
        }
        console.log('\nScore:\n');
        for (var i = 1; i <= this.scores.size; i++) {
            console.log('Player ' + i + ': ' + this.scores[i] + ' points');
        }
    }
};

//private;
BoardAnalyser.prototype.find_voids = function () {
    if (main.debug) {
        main.log.debug('Find voids...');
    }
    var void_code = Grid.ZONE_CODE;
    for (var g, g_array = this.all_groups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        g.reset_analysis();
    }
    this.all_groups.clear();
    this.voids.clear();
    var neighbors = [[], []];
    for (var j = 1; j <= this.goban.size; j++) {
        for (var i = 1; i <= this.goban.size; i++) {
            var size;
            if ((size = this.filler.fill_with_color(i, j, main.EMPTY, void_code, neighbors)) > 0) {
                this.voids.push(new Void(this, void_code, i, j, size, neighbors));
                void_code += 1;
                // keep all the groups
                for (var n, n_array = neighbors, n_ndx = 0; n=n_array[n_ndx], n_ndx < n_array.length; n_ndx++) {
                    for (var g, g_array = n, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                        this.all_groups.add(g);
                    }
                }
                neighbors = [[], []];
            }
        }
    }
};

// Find voids surrounded by a single color -> eyes
BoardAnalyser.prototype.find_eyes = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        v.eye_check();
    }
};

// Decides who owns a void by comparing the "liveness" of each side
BoardAnalyser.prototype.find_stronger_owners = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eye_color) {
            continue;
        }
        var lives = [0, 0];
        for (var c = 1; c <= 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                lives[c] += g.lives;
            }
        }
        var more_lives = Math.max.apply(Math,lives);
        if (lives.count(function (l) {
            return l === more_lives;
        }) === 1) {
            var c = lives.find_index(more_lives);
            v.set_owner(c);
            if (main.debug) {
                main.log.debug('It looks like color ' + c + ', with ' + more_lives + ' lives, owns ' + v + ' (this might change once we identify dead groups)');
            }
        } // make sure we have a winner, not a tie
    }
};

// Reviews the groups and declare "dead" the ones who do not own any void
BoardAnalyser.prototype.find_dying_groups = function () {
    for (var g, g_array = this.all_groups, g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
        if (g.eyes.size >= 2) {
            continue;
        }
        if (g.eyes.size === 1 && g.eyes[0].size + g.extra_lives >= 3) {
            continue;
        } // actually not enough if gote but well...
        var color = g.color;
        if (g.eyes.size === 1 && g.eyes[0].groups[color].size > 1) {
            continue;
        } // connected by eye
        // we need to look at voids around (fake eyes, etc.)
        var owned_voids, size;
        owned_voids = size = 0;
        var one_owner, my_void;
        one_owner = my_void = null;
        for (var v, v_array = g.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
            if (v.owner) {
                one_owner = v.owner;
                if (v.owner === color) {
                    my_void = v;
                    owned_voids += 1;
                    size += v.size;
                }
            }
        }
        if (g.eyes.size === 1 && owned_voids >= 1) {
            continue;
        } // TODO: this is too lenient
        if (owned_voids >= 2) {
            continue;
        } // TODO later: here is the horror we read about on the web
        if (owned_voids === 1 && size + g.extra_lives >= 3) {
            continue;
        }
        if (owned_voids === 1 && my_void.groups[color].size > 1) {
            continue;
        } // TODO: check also lives of ally
        // find if the only void around is owned (e.g. lost stones inside big territory)
        // if we don't know who owns the voids around g, leave g as alive (unfinished game)
        if (g.voids.size !== 0 && !one_owner) {
            continue;
        }
        // g is dead!
        var stone = g.stones[0];
        var taken = this.filler.fill_with_color(stone.i, stone.j, color, Grid.DEAD_COLOR + color);
        this.prisoners[color] += taken;
        this.scores[1 - color] += taken;
        g.count_as_dead();
        if (main.debug) {
            main.log.debug('Hence ' + g + ' is considered dead (' + taken + ' prisoners; 1st stone ' + stone + ')');
        }
        if (main.debug) {
            main.log.debug('eyes:' + g.eyes.size + ' owned_voids:' + owned_voids + ' size-voids:' + size);
        }
    }
};

// Looks for "dame" = neutral voids (if alive groups from more than one color are around)
BoardAnalyser.prototype.find_dame_voids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        if (v.eye_color) {
            continue;
        }
        var alive_colors = [];
        for (var c = 1; c <= 2; c++) {
            for (var g, g_array = v.groups[c], g_ndx = 0; g=g_array[g_ndx], g_ndx < g_array.length; g_ndx++) {
                if (this.group_liveliness(g) >= 1) {
                    alive_colors.push(c);
                    break;
                }
            }
        }
        if (alive_colors.size >= 2) {
            v.set_owner(null);
            if (main.debug) {
                main.log.debug('Void ' + v + ' is considered neutral ("dame")');
            }
        }
    }
};

// Colors the voids with owner's color
BoardAnalyser.prototype.color_voids = function () {
    for (var v, v_array = this.voids, v_ndx = 0; v=v_array[v_ndx], v_ndx < v_array.length; v_ndx++) {
        var c = (( v.owner ? Grid.TERRITORY_COLOR + v.owner : Grid.DAME_COLOR ));
        this.filler.fill_with_color(v.i, v.j, v.code, c);
    }
};

// Returns a number telling how "alive" a group is. TODO: review this
// Really basic logic for now.
// - eyes count a lot (proportionaly to their size; instead we should determine if an
//   eye shape is right to make 2 eyes)
// - owned voids count much less (1 point per void, no matter its size)
// - non-owned voids (undetermined owner or enemy-owned void) count for 0
// NB: for end-game counting, this logic is enough because undetermined situations
// have usually all been resolved (or this means both players cannot see it...)
BoardAnalyser.prototype.group_liveliness = function (g) {
    return g.eyes.size + g.voids.count(function (z) {
        return z.owner === g.color;
    });
};

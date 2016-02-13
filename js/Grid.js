'use strict';

var main = require('./main');
var CONST = require('constants');

var GRID_BORDER = CONST.GRID_BORDER;


/** @class A generic grid.
 *  NB: We keep extra "border" cells around the real board.
 *      Idea is to avoid checking i,j against gsize in many places.
 *  public read-only attribute: gsize
 *  public RW attribute: yx
 */
function Grid(gsize, initValue, borderValue) {
    if (initValue === undefined) throw new Error('Grid init value must be defined');
    this.gsize = gsize;
    if (borderValue === undefined) {
        this.yx = main.newArray2(gsize + 2, gsize + 2, initValue);
    } else {
        this.yx = main.newArray2(gsize + 2, gsize + 2, borderValue);
        this.init(initValue);
    }
}
module.exports = Grid;

Grid.COLOR_NAMES = ['black', 'white'];
Grid.EMPTY_CHAR = '+';
Grid.DAME_CHAR = '?';
Grid.STONE_CHARS = '@O';
Grid.DEAD_CHARS = '&#';
Grid.TERRITORY_CHARS = '-:';
Grid.COLOR_CHARS = Grid.STONE_CHARS + Grid.DEAD_CHARS + Grid.TERRITORY_CHARS + Grid.DAME_CHAR + Grid.EMPTY_CHAR;
Grid.CIRCULAR_COLOR_CHARS = Grid.DAME_CHAR + Grid.EMPTY_CHAR + Grid.COLOR_CHARS;
Grid.ZONE_CODE = 100; // used for zones (100, 101, etc.); must be > COLOR_CHARS.length

// Possible values of a color (beside BLACK & WHITE)
Grid.EMPTY_COLOR = -1; // this is same as EMPTY, conveniently
Grid.DAME_COLOR = -2; // index of ? in above string; 2 from the end of the string
Grid.DEAD_COLOR = 2; // 2 and 3
Grid.TERRITORY_COLOR = 4; // 4 and 5

// Converts a "territory" character into an owner score (-1= black, +1= white)
// dame,empty, liveB,liveW deadB,deadW, terrB,terrW
Grid.territory2owner = [0,0, -1,+1, +1,-1, -1,+1];
// Converts potential territory number to a char (-1, -0.5, 0, +0.5, +1) -> char
Grid.territory2char = '-\'?.:';


Grid.prototype.init = function (initValue) {
    if (initValue === undefined) throw new Error('Grid init value must be defined');
    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = initValue;
        }
    }
};

Grid.prototype.copy = function (sourceGrid) {
    if (sourceGrid.gsize !== this.gsize) throw new Error('Cannot copy between different sized grids');

    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j], srcYxj = sourceGrid.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = srcYxj[i];
        }
    }
    return this;
};

/** Converts from goban grid (stones) to simple grid (colors)
 *  @param {Goban} goban - not modified
 *  @return {Grid} the grid (this)
 */
Grid.prototype.initFromGoban = function (goban) {
    var sourceGrid = goban.grid;
    if (sourceGrid.gsize !== this.gsize) throw new Error('Cannot copy between different sized grids');

    for (var j = this.gsize; j >= 1; j--) {
        var yxj = this.yx[j], srcYxj = sourceGrid.yx[j];
        for (var i = this.gsize; i >= 1; i--) {
            yxj[i] = srcYxj[i].color;
        }
    }
    return this;
};

// Returns the "character" used to represent a stone in text style
function colorToChar(color) {
    if (color === GRID_BORDER) return '(BORDER)';
    if (color >= Grid.ZONE_CODE) {
        return String.fromCharCode(('A'.charCodeAt() + color - Grid.ZONE_CODE));
    }
    if (color < Grid.DAME_COLOR || color >= Grid.COLOR_CHARS.length) {
        throw new Error('Invalid color ' + color);
    }
    if (color < 0) color += Grid.COLOR_CHARS.length;
    return Grid.COLOR_CHARS[color];
}

// Returns the name of the color/player (e.g. "black")
Grid.colorName = function (color) { // TODO remove me or?
    return Grid.COLOR_NAMES[color];
};

Grid.charToColor = function (char) {
    return Grid.CIRCULAR_COLOR_CHARS.indexOf(char) + Grid.DAME_COLOR;
};

function cell2char(c) {
    return colorToChar(typeof c === 'number' ? c : c.color);
}

Grid.prototype.toText = function (block) {
    return this.toTextExt(true, '\n', block || cell2char);
};

Grid.prototype.toLine = function (block) {
    return this.toTextExt(false, ',', block || cell2char);
};

// Receives a block of code and calls it for each vertex.
// The block should return a string representation.
// This method returns the concatenated string showing the grid.
Grid.prototype.toTextExt = function (withLabels, endOfRow, block) {
    var outYx = new Grid(this.gsize, '').yx;
    var maxlen = 1, i, j, val;
    for (j = this.gsize; j >= 1; j--) {
        for (i = 1; i <= this.gsize; i++) {
            val = block(this.yx[j][i]);
            if (val === null) continue;
            outYx[j][i] = val;
            maxlen = Math.max(maxlen, val.length);
        }
    }
    var numChar = maxlen;
    var white = '          ';
    var s = '';
    for (j = this.gsize; j >= 1; j--) {
        if (withLabels) s += '%2d'.format(j) + ' ';
        for (i = 1; i <= this.gsize; i++) {
            val = outYx[j][i];
            if (val.length < numChar) val = white.substr(1, numChar - val.length) + val;
            s += val;
        }
        s += endOfRow;
    }
    if (withLabels) {
        s += '   ';
        for (i = 1; i <= this.gsize; i++) {
            s += white.substr(1, numChar - 1) + Grid.xLabel(i);
        }
        s += '\n';
    }
    if (endOfRow !== '\n') s = s.chop(); // remove last endOfRow unless it is \n
    return s;
};

Grid.prototype.toString = function () {
    var s = '';
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            s += colorToChar(this.yx[j][i]);
        }
        s += '\n';
    }
    return s;
};

// Returns a text "image" of the grid. See also copy? method.
// Image is upside-down to help compare with a copy paste from console log.
// So last row (j==gsize) comes first in image
Grid.prototype.image = function () {
    if (typeof this.yx[1][1] === 'object') {
        return this.toLine(function (s) {
            return colorToChar(s.color);
        });
    } else {
        return this.toLine(function (c) {
            return colorToChar(c);
        });
    }
};

// Watch out our images are upside-down on purpose (to help copy paste from screen)
// So last row (j==gsize) comes first in image
Grid.prototype.loadImage = function (image) {
    var rows = image.split(/\"|,/);
    if (rows.length !== this.gsize) {
        throw new Error('Invalid image: ' + rows.length + ' rows instead of ' + this.gsize);
    }
    for (var j = this.gsize; j >= 1; j--) {
        var row = rows[this.gsize - j];
        if (row.length !== this.gsize) throw new Error('Invalid image: row ' + row);
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = Grid.charToColor(row[i - 1]);
        }
    }
};

function reverseStr(s) {
    var res = '';
    for (var i = s.length - 1; i >= 0; i--) { res += s[i]; }
    return res;
}

Grid.flipImage = function (image) {
    return image.split(',').reverse().join();
};

Grid.mirrorImage = function (image) {
    return image.split(',').map(reverseStr).join();
};

Grid.flipAndMirrorImage = function (image) {
    return reverseStr(image);
};


var COLUMNS = 'abcdefghjklmnopqrstuvwxyz'; // NB: "i" is skipped

// Parses a move like "c12" into 3,12
// Throws OR returns null if move is not a vertex or illegal
Grid.move2xy = function (move, dontThrow) {
    var i = COLUMNS.indexOf(move[0]) + 1;
    var j = parseInt(move.substr(1, 2));
    if (!i || isNaN(j)) {
        if (dontThrow) return null;
        throw new Error('Illegal move parsed: ' + move);
    }
    return [i, j];
};

// Builds a string representation of a move (3,12->"c12")  
Grid.xy2move = function (i, j) {
    return COLUMNS[i - 1] + j;
};

// Converts a numeric X coordinate in a letter (e.g 3->c)
Grid.xLabel = function (i) {
    return COLUMNS[i - 1];
};

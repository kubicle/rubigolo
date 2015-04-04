//Translated from grid.rb using babyruby2js
'use strict';

var main = require('./main');
var Stone = require('./Stone');

// A generic grid - a Goban owns a grid
//public read-only attribute: gsize, yx;

/** @class */
function Grid(gsize) {
    if (gsize === undefined) gsize = 19;
    this.gsize = gsize;
    // TODO: use only 1 extra "nil" cell (0..gsize instead of 0..gsize+1)
    // Idea is to avoid to have to check i,j against gsize in many places.
    // In case of bug, e.g. for @yx[5][-1], Ruby returns you @yx[5][@yx.size] (looping back)
    // so having a real item (BORDER) on the way helps to detect a bug.
    this.yx = new main.Array(gsize + 2, function () {
        return new main.Array(gsize + 2, main.BORDER);
    });
}
module.exports = Grid;

Grid.COLOR_NAMES = ['black', 'white'];
Grid.NOTATION_A = ('a').charCodeAt(); // notation origin; could be A or a
Grid.EMPTY_CHAR = '+';
Grid.DAME_CHAR = '?';
Grid.STONE_CHARS = '@O';
Grid.DEAD_CHARS = '&#';
Grid.TERRITORY_CHARS = '-:';
Grid.COLOR_CHARS = Grid.STONE_CHARS + Grid.DEAD_CHARS + Grid.TERRITORY_CHARS + Grid.DAME_CHAR + Grid.EMPTY_CHAR;
Grid.EMPTY_COLOR = -1; // this is same as EMPTY, conveniently
Grid.DAME_COLOR = -2; // index of ? in above string; 2 from the end of the string
Grid.DEAD_COLOR = 2;
Grid.TERRITORY_COLOR = 4;
Grid.CIRCULAR_COLOR_CHARS = Grid.DAME_CHAR + Grid.EMPTY_CHAR + Grid.COLOR_CHARS;
Grid.ZONE_CODE = 100; // used for zones (100, 101, etc.); must be > COLOR_CHARS.size

Grid.prototype.copy = function (sourceGrid) {
    if (sourceGrid.gsize !== this.gsize) {
        throw new Error('Cannot copy between different sized grids');
    }
    var srcYx = sourceGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = srcYx[j][i];
        }
    }
    return this;
};

// Converts from goban grid (stones) to simple grid (colors) REVIEWME
Grid.prototype.convert = function (sourceGrid) {
    if (sourceGrid.gsize !== this.gsize) {
        throw new Error('Cannot copy between different sized grids');
    }
    var srcYx = sourceGrid.yx;
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = srcYx[j][i].color;
        }
    }
    return this;
};

// Returns the "character" used to represent a stone in text style
Grid.colorToChar = function (color) {
    if (color >= Grid.ZONE_CODE) {
        return String.fromCharCode((('A').charCodeAt() + color - Grid.ZONE_CODE));
    }
    if (color < Grid.DAME_COLOR || color >= Grid.COLOR_CHARS.length) {
        throw new Error('Invalid color ' + color);
    }
    if (color < 0) color += Grid.COLOR_CHARS.length;
    return Grid.COLOR_CHARS[color];
};

// Returns the name of the color/player (e.g. "black")
Grid.colorName = function (color) { // TODO remove me or?
    return Grid.COLOR_NAMES[color];
};

Grid.charToColor = function (char) {
    return Grid.CIRCULAR_COLOR_CHARS.index(char) + Grid.DAME_COLOR;
};

Grid.prototype.toText = function () {
    return this.toTextExt(true, '\n');
};

// Receives a block of code and calls it for each vertex.
// The block should return a string representation.
// This method returns the concatenated string showing the grid.
Grid.prototype.toTextExt = function (withLabels, endOfRow, cb) {
    var yx = new Grid(this.gsize).yx;
    var maxlen = 1;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            var val = cb(this.yx[j][i]);
            if (val === null) {
                val = '';
            }
            yx[j][i] = val;
            if (val.length > maxlen) {
                maxlen = val.length;
            }
        }
    }
    var numChar = maxlen;
    var white = '          ';
    var s = '';
    for (var j = this.gsize; j >= 1; j--) {
        if (withLabels) {
            s += '%2d'.format(j) + ' ';
        }
        for (var i = 1; i <= this.gsize; i++) {
            val = yx[j][i];
            if (val.length < numChar) {
                val = white.substr(1, numChar - val.length) + val;
            }
            s += val;
        }
        s += endOfRow;
    }
    if (withLabels) {
        s += '   ';
        for (var i = 1; i <= this.gsize; i++) {
            s += white.substr(1, numChar - 1) + Grid.xLabel(i);
        }
        s += '\n';
    }
    return s;
};

Grid.prototype.toString = function () {
    var s = '';
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = 1; i <= this.gsize; i++) {
            s += Grid.colorToChar(this.yx[j][i]);
        }
        s += '\n';
    }
    return s;
};

// Returns a text "image" of the grid. See also copy? method.
// Image is upside-down to help compare with a copy paste from console log.
// So last row (j==gsize) comes first in image
Grid.prototype.image = function () {
    if (this.yx[1][1].instanceOf(Stone)) { // FIXME
        return this.toText(false, ',', function (s) {
            return Grid.colorToChar(s.color);
        }).chop();
    } else {
        return this.toText(false, ',', function (c) {
            return Grid.colorToChar(c);
        }).chop();
    }
};

// Watch out our images are upside-down on purpose (to help copy paste from screen)
// So last row (j==gsize) comes first in image
Grid.prototype.loadImage = function (image) {
    var rows = image.split(/'\"|,'/);
    if (rows.length !== this.gsize) {
        throw new Error('Invalid image: ' + rows.length + ' rows instead of ' + this.gsize);
    }
    for (var j = this.gsize; j >= 1; j--) {
        var row = rows[this.gsize - j];
        if (row.length !== this.gsize) {
            throw new Error('Invalid image: row ' + row);
        }
        for (var i = 1; i <= this.gsize; i++) {
            this.yx[j][i] = Grid.charToColor(row[i - 1]);
        }
    }
};

// Parses a move like "c12" into 3,12
Grid.parseMove = function (move) {
    return [(move[0]).charCodeAt() - Grid.NOTATION_A + 1, parseInt(move[1], 10)];
};

// Builds a string representation of a move (3,12->"c12")  
Grid.moveAsString = function (col, row) {
    return String.fromCharCode((col + Grid.NOTATION_A - 1)) + row;
};

// Converts a numeric X coordinate in a letter (e.g 3->c)
Grid.xLabel = function (i) {
    return String.fromCharCode((i + Grid.NOTATION_A - 1));
};

// E02: unknown method index(...)
// E02: unknown method instance_of?(...)
//Translated from grid.rb using babyruby2js
'use strict';

var main = require('./main');
var Stone = require('./Stone');

//public read-only attribute: size, yx;

/** @class A generic grid - a Goban owns a grid */
function Grid(size) {
    if (size === undefined) size = 19;
    this.size = size;
    // TODO: use only 1 extra "nil" cell (0..size instead of 0..size+1)
    // Idea is to avoid to have to check i,j against size in many places.
    // In case of bug, e.g. for @yx[5][-1], Ruby returns you @yx[5][@yx.size] (looping back)
    // so having a real item (BORDER) on the way helps to detect a bug.
    this.yx = new main.Array(size + 2, function () {
        return new main.Array(size + 2, main.BORDER);
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

Grid.prototype.copy = function (source_grid) {
    if (source_grid.size !== this.size) {
        throw new Error('Cannot copy between different sized grids');
    }
    var src_yx = source_grid.yx;
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            this.yx[j][i] = src_yx[j][i];
        }
    }
    return this;
};

// Converts from goban grid (stones) to simple grid (colors) REVIEWME
Grid.prototype.convert = function (source_grid) {
    if (source_grid.size !== this.size) {
        throw new Error('Cannot copy between different sized grids');
    }
    var src_yx = source_grid.yx;
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            this.yx[j][i] = src_yx[j][i].color;
        }
    }
    return this;
};

// Returns the "character" used to represent a stone in text style
Grid.color_to_char = function (color) {
    if (color >= Grid.ZONE_CODE) {
        return String.fromCharCode((('A').charCodeAt() + color - Grid.ZONE_CODE));
    }
    if (color < Grid.DAME_COLOR || color >= Grid.COLOR_CHARS.length) {
        throw new Error('Invalid color ' + color);
    }
    if (color < 0) color += Grid.COLOR_CHARS.length;
    var char = Grid.COLOR_CHARS[color];
    return char;
};

// Returns the name of the color/player (e.g. "black")
Grid.color_name = function (color) {
    return Grid.COLOR_NAMES[color];
};
 // TODO remove me or?
Grid.char_to_color = function (char) {
    return Grid.CIRCULAR_COLOR_CHARS.index(char) + Grid.DAME_COLOR;
};

function def_to_text(stone) {
    return Grid.color_to_char(stone.color);
};

// Receives a block of code and calls it for each vertex.
// The block should return a string representation.
// This method returns the concatenated string showing the grid.
Grid.prototype.to_text = function (cb) { return this.to_text2(true, '\n', cb); };
Grid.prototype.to_text2 = function (with_labels, end_of_row, cb) {
    if (!cb) cb = def_to_text;
    var yx = new Grid(this.size).yx;
    var maxlen = 1;
    var i, j, val;
    for (j = this.size; j >= 1; j--) {
        for (i = 1; i <= this.size; i++) {
            val = cb(this.yx[j][i]);
            if (val === null) {
                val = '';
            }
            yx[j][i] = val;
            if (val.length > maxlen) {
                maxlen = val.length;
            }
        }
    }
    var num_char = maxlen;
    var white = '          ';
    var s = '';
    for (j = this.size; j >= 1; j--) {
        if (with_labels) {
            s += main.strFormat('%2d', j) + ' ';
        }
        for (i = 1; i <= this.size; i++) {
            val = yx[j][i];
            if (val.length < num_char) {
                val = white.substr(1, num_char - val.length) + val;
            }
            s += val;
        }
        s += end_of_row;
    }
    if (with_labels) {
        s += '   ';
        for (i = 1; i <= this.size; i++) {
            s += white.substr(1, num_char - 1) + Grid.x_label(i);
        }
        s += '\n';
    }
    return s;
};

Grid.prototype.to_s = function () {
    var s = '';
    for (var j = this.size; j >= 1; j--) {
        for (var i = 1; i <= this.size; i++) {
            s += Grid.color_to_char(this.yx[j][i]);
        }
        s += '\n';
    }
    return s;
};

// Returns a text "image" of the grid. See also copy? method.
// Image is upside-down to help compare with a copy paste from console log.
// So last row (j==size) comes first in image
Grid.prototype.image = function () {
    if (this.yx[1][1].instance_of(Stone)) {
        return main.strChop(this.to_text2(false, ',', function (s) {
            return Grid.color_to_char(s.color);
        }));
    } else {
        return main.strChop(this.to_text2(false, ',', function (c) {
            return Grid.color_to_char(c);
        }));
    } // FIXME
};

// Watch out our images are upside-down on purpose (to help copy paste from screen)
// So last row (j==size) comes first in image
Grid.prototype.load_image = function (image) {
    var rows = image.split(/'\"|,'/);
    if (rows.length !== this.size) {
        throw new Error('Invalid image: ' + rows.length + ' rows instead of ' + this.size);
    }
    for (var j = this.size; j >= 1; j--) {
        var row = rows[this.size - j];
        if (row.length !== this.size) {
            throw new Error('Invalid image: row ' + row);
        }
        for (var i = 1; i <= this.size; i++) {
            this.yx[j][i] = Grid.char_to_color(row[i - 1]);
        }
    }
};

// Parses a move like "c12" into 3,12
Grid.parse_move = function (move) {
    return [(move[0]).charCodeAt() - Grid.NOTATION_A + 1, parseInt(move[1], 10)];
};

// Builds a string representation of a move (3,12->"c12")  
Grid.move_as_string = function (col, row) {
    return String.fromCharCode((col + Grid.NOTATION_A - 1)) + row;
};

// Converts a numeric X coordinate in a letter (e.g 3->c)
Grid.x_label = function (i) {
    return String.fromCharCode((i + Grid.NOTATION_A - 1));
};

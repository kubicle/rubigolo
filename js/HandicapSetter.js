//Translated from handicap_setter.rb using babyruby2js
'use strict';

var main = require('./main');
var HandicapSetter = require('./HandicapSetter');
var Grid = require('./Grid');
var Stone = require('./Stone');
// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "3=d4-p16-p4" or "d4-p16-p4"
// Returns the handicap actual count
HandicapSetter.setHandicap = function (goban, h) {
    if (h === 0 || h === '0') {
        return 0;
    }
    // Standard handicap?
    if (main.isA(String, h)) {
        var eq = h.index('=');
        if (h[0].between('0', '9') && !eq) {
            h = parseInt(h, 10);
        }
    }
    if (main.isA('Fixnum', h)) { // e.g. 3
        return HandicapSetter.setStandardHandicap(goban, h);
    }
    // Could be standard or not but we are given the stones so use them   
    if (eq) { // "3=d4-p16-p4" would become "d4-p16-p4"
        h = h.range(eq + 1, -1);
    }
    var moves = h.split('-');
    for (var move, move_array = moves, move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
        var i, j;
        var _m = Grid.parseMove(move);
        i = _m[0];
        j = _m[1];
        
        Stone.playAt(goban, i, j, main.BLACK);
    }
    return moves.length;
};

// Places the standard (star points) handicap
//   count: requested handicap
// NB: a handicap of 1 stone does not make sense but we don't really need to care.
// Returns the handicap actual count (if board is too small it can be smaller than count)
HandicapSetter.setStandardHandicap = function (goban, count) {
    // we want middle points only if the board is big enough 
    // and has an odd number of intersections
    var gsize = goban.gsize;
    if ((gsize < 9 || gsize % 2 === 0) && count > 4) {
        count = 4;
    }
    // Compute the distance from the handicap points to the border:
    // on boards smaller than 13, the handicap point is 2 points away from the border
    var distToBorder = (( gsize < 13 ? 2 : 3 ));
    var short = 1 + distToBorder;
    var middle = (1 + gsize) / 2;
    var long = gsize - distToBorder;
    for (var ndx = 1; ndx <= count; ndx++) {
        // Compute coordinates from the index.
        // Indexes correspond to this map (with Black playing on North on the board)
        // 2 7 1
        // 4 8 5
        // 0 6 3
        // special case: for odd numbers and more than 4 stones, the center is picked
        if (count % 2 === 1 && count > 4 && ndx === count - 1) {
            ndx = 8;
        }
        switch (ndx) {
        case 0:
            var x = short;
            var y = short;
            break;
        case 1:
            x = long;
            y = long;
            break;
        case 2:
            x = short;
            y = long;
            break;
        case 3:
            x = long;
            y = short;
            break;
        case 4:
            x = short;
            y = middle;
            break;
        case 5:
            x = long;
            y = middle;
            break;
        case 6:
            x = middle;
            y = short;
            break;
        case 7:
            x = middle;
            y = long;
            break;
        case 8:
            x = middle;
            y = middle;
            break;
        default: 
            break; // not more than 8
        }
        Stone.playAt(goban, x, y, main.BLACK);
    }
    return count;
};

// E02: unknown method between?(...)
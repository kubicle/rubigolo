'use strict';

var CONST = require('./constants');
var Grid = require('./Grid');

var BLACK = CONST.BLACK, WHITE = CONST.WHITE;


/** @class Used for setting handicap stones,
 * and for setting a position "by hand", which is exactly the same. */
function HandicapSetter() {
}
module.exports = HandicapSetter;

// Initializes the handicap points
// h can be a number or a string
// string examples: "3" or "B=d4-p16-p4" or "W=d4-p16-p4"
// Returns the handicap actual count
HandicapSetter.setHandicap = function (goban, h) {
    if (h === 0 || h === '0') return 0;
    
    // Standard handicap if simple number - no "=..."
    if (typeof h === 'number' || h.indexOf('=') < 0) {
        return HandicapSetter.setStandardHandicap(goban, ~~h);
    }

    var color;
    switch (h[0]) {
    case 'B': color = BLACK; break;
    case 'W': color = WHITE; break;
    default: throw new Error('Invalid "hand" command: ' + h);
    }
    
    var posEqual = h.indexOf('=');
    var moves = h.substring(posEqual + 1).split('-');
    for (var move, move_array = moves, move_ndx = 0; move=move_array[move_ndx], move_ndx < move_array.length; move_ndx++) {
        var coords = Grid.move2xy(move);
        goban.playAt(coords[0], coords[1], color);
    }
    return moves.length;
};

// Places the standard (star points) handicap
//   count: requested handicap
// NB: a handicap of 1 stone does not make sense but we don't really need to care.
// Returns the handicap actual count (if board is too small it can be smaller than count)
HandicapSetter.setStandardHandicap = function (goban, count) {
    var gsize = goban.gsize;
    // no middle point if size is an even number or size<9
    if (count > 4 && (gsize < 9 || gsize % 2 === 0)) count = 4;
    // no handicap on smaller than 5 boards
    if (gsize <= 5) return 0;

    // Compute the distance from the handicap points to the border:
    // on boards smaller than 13, the handicap point is 2 points away from the border
    var distToBorder = (( gsize < 13 ? 2 : 3 ));
    var short = 1 + distToBorder;
    var middle = (1 + gsize) / 2;
    var long = gsize - distToBorder;
    for (var ndx = 0; ndx < count; ndx++) {
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
        goban.playAt(x, y, BLACK);
    }
    return count;
};

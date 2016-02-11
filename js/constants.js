'use strict';


function Constants() {
    this.EVEN = 0;
    this.ODD = 1;
}
module.exports = new Constants();


Constants.prototype.attachConstants = function (main) {
    main.BORDER = null; // border of Goban's grid (Stones)
    main.GRID_BORDER = -99; // border of regular (numeric) grids

    // Colors
    main.EMPTY = -1;
    main.BLACK = 0;
    main.WHITE = 1;

    main.sOK = 0;
    main.sDEBUG = 1;
    main.sINVALID = -1;
    main.sBLUNDER = -2;

    main.NEVER = 0;
    main.SOMETIMES = 1; // e.g. depends who plays first
    main.ALWAYS = 2;

    main.DIR0 = 0;
    main.DIR3 = 3;
    main.UP = 0;
    main.RIGHT = 1;
    main.DOWN = 2;
    main.LEFT = 3;
};

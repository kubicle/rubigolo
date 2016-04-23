'use strict';


function Constants() {
    this.EVEN = 0;
    this.ODD = 1;

    this.BORDER = null; // border of Goban's grid (Stones)
    this.GRID_BORDER = -99; // border of regular (numeric) grids

    // Colors
    this.EMPTY = -1;
    this.BLACK = 0;
    this.WHITE = 1;

    this.sOK = 0;
    this.sDEBUG = 1;
    this.sINVALID = -1;
    this.sBLUNDER = -2;

    this.NEVER = 0;
    this.SOMETIMES = 1; // e.g. depends who plays first
    this.ALWAYS = 2;

    this.DIR0 = 0;
    this.DIR3 = 3;
    this.UP = 0;
    this.RIGHT = 1;
    this.DOWN = 2;
    this.LEFT = 3;

    this.JP_RULES = 'Japanese';
    this.CH_RULES = 'Chinese';
}
module.exports = new Constants();

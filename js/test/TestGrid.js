'use strict';

var main = require('../main');
var Grid = require('../Grid');
var inherits = require('util').inherits;
var TestCase = require('./TestCase');

var BLACK = main.BLACK, WHITE = main.WHITE, EMPTY = main.EMPTY;


function TestGrid(testName) {
    TestCase.call(this, testName);
}
inherits(TestGrid, TestCase);
module.exports = TestGrid;


function val(v) { return v; }

TestGrid.prototype.testGridToString = function () {
    var g = new Grid(3, BLACK, -1);
    g.yx[1][1] = WHITE;
    g.yx[1][2] = EMPTY;
    this.assertEqual('@@@\n@@@\nO+@\n', g.toString());
    this.assertEqual(' 3 @@@\n 2 @@@\n 1 O+@\n   abc\n', g.toText());
    this.assertEqual('@@@,@@@,O+@', g.toLine());
    this.assertEqual('000,000,1-10', g.toLine(val));
};

function fillGrid(g) {
    var yx = g.yx, n = 1;
    for (var j = 1; j <= g.gsize; j++) {
        for (var i = 1; i <= g.gsize; i++) {
            yx[j][i] = n++;
        }
    }
}

TestGrid.prototype.testFlipAndMirror = function () {
    var g = new Grid(3, -1);
    fillGrid(g);
    var img = '789,456,123';
    this.assertEqual(img, g.toLine(val));

    this.assertEqual('123,456,789', Grid.flipImage(img));
    this.assertEqual('987,654,321', Grid.mirrorImage(img));
    this.assertEqual('321,654,987', Grid.flipAndMirrorImage(img));
};

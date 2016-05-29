//Translated from influence_map.rb using babyruby2js
'use strict';

var CONST = require('../../../constants');
var Grid = require('../../../Grid');
var log = require('../../../log');

var EMPTY = CONST.EMPTY;


/** @class public read-only attribute: map
 */
function InfluenceMap(goban) {
    var self = this;
    this.goban = goban;
    this.gsize = goban.gsize;
    this.map = Array.new(this.gsize + 1, function () {
        return Array.new(self.gsize + 1, function () {
            return [0, 0];
        });
    });
}
module.exports = InfluenceMap;

InfluenceMap.prototype.clear = function () {
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            for (var c = 0; c < 2; c++) {
                this.map[j][i][c] = 0;
            }
        }
    }
};

InfluenceMap.prototype.buildMap = function () {
    this.clear();
    var influence = [4, 2, 1];
    // First we get stones' direct influence
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            var stone = this.goban.stoneAt(i, j);
            var color = stone.color;
            if (color !== EMPTY) {
                this.map[j][i][color] += influence[0];
                // Then we propagate it decreasingly with distance
                for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                    if (n1.color !== EMPTY) {
                        continue;
                    }
                    this.map[n1.j][n1.i][color] += influence[1];
                    // Second level
                    for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                        if (n2.color !== EMPTY) {
                            continue;
                        }
                        if (n2 === stone) {
                            continue;
                        }
                        this.map[n2.j][n2.i][color] += influence[2]; // 3rd level // n2.neighbors.each do |n3| //   next if n3 == n1 //   @map[n3.j][n3.i][color] += influence[3] // end
                    }
                }
            }
        }
    }
    if (log.debug) {
        return this.debugDump();
    }
};

InfluenceMap.prototype.debugDump = function () {
    var c;
    function inf2str(inf) { return '%2d'.format(inf[c]); }

    for (c = 0; c < 2; c++) {
        log.debug('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.gsize; j >= 1; j--) {
            log.debug('' + '%2d'.format(j) +
                this.map[j].slice(1, this.gsize + 1).map(inf2str).join('|'));
        }
        var cols = '  ';
        for (var i = 1; i <= this.gsize; i++) { cols += ' ' + Grid.xLabel(i) + ' '; }
        log.debug(cols);
    }
};

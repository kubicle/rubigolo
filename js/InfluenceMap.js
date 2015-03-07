//Translated from influence_map.rb using babyruby2js
'use strict';

var main = require('./main');
var Grid = require('./Grid');
//public read-only attribute: map;

/** @class */
function InfluenceMap(goban) {
    this.goban = goban;
    this.size = goban.size;
    this.map = new main.Array(this.size + 1, function () {
        return new main.Array(this.size + 1, function () {
            return [0, 0];
        });
    });
}
module.exports = InfluenceMap;

InfluenceMap.prototype.clear = function () {
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            for (var c = 1; c <= 2; c++) {
                this.map[j][i][c] = 0;
            }
        }
    }
};

InfluenceMap.prototype.build_map = function () {
    this.clear();
    var influence = [4, 2, 1];
    // First we get stones' direct influence
    for (var j = 1; j <= this.size; j++) {
        for (var i = 1; i <= this.size; i++) {
            var stone = this.goban.stone_at(i, j);
            var color = stone.color;
            if (color !== main.EMPTY) {
                this.map[j][i][color] += influence[0];
                // Then we propagate it decreasingly with distance
                for (var n1, n1_array = stone.neighbors, n1_ndx = 0; n1=n1_array[n1_ndx], n1_ndx < n1_array.length; n1_ndx++) {
                    if (n1.color !== main.EMPTY) {
                        continue;
                    }
                    this.map[n1.j][n1.i][color] += influence[1];
                    // Second level
                    for (var n2, n2_array = n1.neighbors, n2_ndx = 0; n2=n2_array[n2_ndx], n2_ndx < n2_array.length; n2_ndx++) {
                        if (n2.color !== main.EMPTY) {
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
    if (main.debug) {
        return this.debug_dump();
    }
};

InfluenceMap.prototype.debug_dump = function () {
    for (var c = 1; c <= 2; c++) {
        console.log('Influence map for ' + Grid.COLOR_NAMES[c] + ':');
        for (var j = this.size; j >= 1; j--) {
            console.log('' + main.strFormat('%2d', j));
            for (var i = 1; i <= this.size; i++) {
                console.log(main.strFormat('%2d', this.map[j][i][c]) + '|');
            }
            console.log('\n');
        }
        console.log('  ');
        for (var i = 1; i <= this.size; i++) {
            console.log(' ' + Grid.x_label(i) + ' ');
        }
        console.log('\n');
    }
};

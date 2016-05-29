'use strict';


function FakeSpot(stone, groups) {
    this.stone = stone;
    this.groups = [];
    this.color = groups[0].color;
    this.mustBePlayed = false; // true if connection at fake spot is mandatory

    this.addGroups(groups);
}
module.exports = FakeSpot;


FakeSpot.prototype.addGroups = function (groups) {
    var list = this.groups;
    for (var i = groups.length - 1; i >= 0; i--) {
        var g = groups[i];
        if (list.indexOf(g) < 0) list.push(g);
    }
};

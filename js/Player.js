//Translated from player.rb using babyruby2js
'use strict';


/** @class */
function Player(isHuman, goban) {
    this.isHuman = isHuman;
    this.goban = goban;
}
module.exports = Player;

//public read-only attribute: goban, color, isHuman;
Player.prototype.setColor = function (color) {
    this.color = color;
};

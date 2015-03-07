//Translated from player.rb using babyruby2js
'use strict';

//public read-only attribute: goban, color, is_human;

/** @class */
function Player(is_human, goban) {
    this.is_human = is_human;
    this.goban = goban;
}
module.exports = Player;

Player.prototype.set_color = function (color) {
    this.color = color;
};

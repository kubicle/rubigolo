//Translated from player.rb using babyruby2js
'use strict';


/** @class public read-only attribute: goban, color, isHuman
 */
function Player(isHuman, goban) {
    this.isHuman = isHuman;
    this.goban = goban;
}
module.exports = Player;

Player.prototype.setColor = function (color) {
    this.color = color;
};

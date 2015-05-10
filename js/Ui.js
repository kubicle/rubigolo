'use strict';

//var main = require('./main');
//var WGo = require('../lib/wgo.js');
var main = window.main, WGo = window.WGo; //TMP

var GameLogic = main.GameLogic;
var Grid = main.Grid;
var Ai1Player = main.Ai1Player;

var size = 19, handicap = 0;

function Ui() {
  this.createBoard();
  this.createControls();
}
//TMP module.exports = Ui;

Ui.prototype.createBoard = function () {
  this.board = new WGo.Board(document.getElementById('board'), { width: 600 });
  var self = this;
  this.board.addEventListener('click', function (x,y) { self.onClick(x,y); });
};

Ui.prototype.createControls = function () {
  var controls = document.getElementById('controls');
  //controls.appendChild()
};

Ui.prototype.startGame = function () {
  var game = this.game = new GameLogic();
  game.newGame(size, handicap);
  this.aiPlayer = new Ai1Player(game.goban, main.WHITE);
};

Ui.prototype.onClick = function (x, y) {
  console.log(x,y);
  var move = Grid.moveAsString(x + 1, y + 1);
  if (!this.game.playOneMove(move)) {
    return console.error(this.game.getErrors());
  }
  this.board.addObject({ x: x, y: y, c: WGo.B });
  // now AI plays
  move = this.aiPlayer.getMove();
  this.game.playOneMove(move);
  var xy = Grid.parseMove(move);
  this.board.addObject({ x: xy[0] - 1, y: xy[1] - 1, c: WGo.W });
};

var ui = new Ui();
ui.startGame(); //TMP

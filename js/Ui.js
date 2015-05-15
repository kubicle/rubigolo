'use strict';

//var main = require('./main');
//var WGo = require('../lib/wgo.js');
var main = window.main, WGo = window.WGo; //TMP

var GameLogic = main.GameLogic;
var Grid = main.Grid;
var Ai1Player = main.Ai1Player;


function Ui() {
  this.gsize = 19;
  this.handicap = 0;
  this.withCoords = true;

  this.createBoard();
  this.createControls();
  this.output = document.getElementById('output');
}
//TMP module.exports = Ui;

Ui.prototype.createBoard = function () {
  var config = { width: 600, section: { top: -0.5, left: -0.5, right: -0.5, bottom: -0.5 } };
  this.board = new WGo.Board(document.getElementById('board'), config);
  if (this.withCoords) this.board.addCustomObject(WGo.Board.coordinates);
  var self = this;
  this.board.addEventListener('click', function (x,y) { self.onClick(x,y); });
};

// Color codes conversions WGo->Rubigolo
var fromWgoColor = {};
fromWgoColor[WGo.B] = main.BLACK;
fromWgoColor[WGo.W] = main.WHITE;
// Color codes conversions Rubigolo->WGo
var toWgoColor = {};
toWgoColor[main.EMPTY] = null;
toWgoColor[main.BLACK] = WGo.B;
toWgoColor[main.WHITE] = WGo.W;

Ui.prototype.refreshBoard = function () {
  for (var j = 0; j < this.gsize; j++) {
    for (var i = 0; i < this.gsize; i++) {
      var color = toWgoColor[this.game.goban.color(i + 1, this.gsize - j)];
      var obj = this.board.obj_arr[i][j][0];
      if (color === null) {
        if (obj) this.board.removeObjectsAt(i,j);
      } else if (!obj || obj.c !== color) {
          this.board.addObject({ x: i, y: j, c: color });
      }
    }
  }
};

Ui.prototype.newButton = function (name, label) {
  var self = this;
  var btn = this.ctrl[name] = document.createElement('button');
  btn.innerText = label;
  btn.addEventListener('click', function () {
    self.onButton(name);
  });
  this.controls.appendChild(btn);
};

Ui.prototype.createControls = function () {
  this.ctrl = {};
  this.controls = document.getElementById('controls');
  this.newButton('pass', 'Pass');
  this.newButton('undo', 'Undo');
  this.newButton('resi', 'Resign');
  this.newButton('hist', 'History');
  this.newButton('newg', 'New game');
};

Ui.prototype.toggleControls = function () {
  var inGame = !this.game.gameEnded;
  this.setVisible(['pass', 'undo', 'resi', 'hist'], inGame);
  this.setVisible(['newg'], !inGame);
};

Ui.prototype.setVisible = function (names, show) {
  for (var i = 0; i < names.length; i++) {
    var ctrl = this.ctrl[names[i]];
    if (show) ctrl.hidden = false;
    else ctrl.hidden = true;
  }
};

Ui.prototype.message = function (html, append) {
  if (!append) this.output.innerHTML = '';
  this.output.innerHTML += html;
};

Ui.prototype.startGame = function () {
  var game = this.game = new GameLogic();
  game.newGame(this.gsize, this.handicap);
  this.aiPlayer = new Ai1Player(game.goban, main.WHITE);
  this.toggleControls();
};

Ui.prototype.checkEnd = function () {
  if (!this.game.gameEnded) return false;
  this.message('Game ended.<br>' + this.game.historyString());
  this.toggleControls();
  return true;
};

Ui.prototype.onButton = function (btnName) {
  switch (btnName) {
  case 'pass':
    this.game.playOneMove(btnName);
    return this.letAiPlay();
  case 'resi':
    this.game.playOneMove(btnName);
    return this.checkEnd();
  case 'undo':
    return this.playerMove(btnName);
  case 'hist':
    this.message(this.game.historyString());
    return;
  case 'newg':
    this.startGame();
    return this.refreshBoard();
  default:
    throw new Error('Button not handled: ' + btnName);
  }
};

Ui.prototype.playerMove = function (move) {
  if (!this.game.playOneMove(move)) {
    return this.message(this.game.getErrors().join('<br>'));
  }
  this.refreshBoard();
  return true;
};

Ui.prototype.letAiPlay = function () {
  if (this.checkEnd()) return;
  var move = this.aiPlayer.getMove();
  this.game.playOneMove(move);
  this.message('AI: ' + move);
  // AI passed or resigned?
  if (this.checkEnd() || move === 'pass') return;

  this.refreshBoard();
};

Ui.prototype.onClick = function (x, y) {
  if (x < 0 || y < 0 || x >= this.gsize || y >= this.gsize) return;
  var move = Grid.moveAsString(x + 1, this.gsize - y);
  if (!this.playerMove(move)) return;

  this.letAiPlay();
};

var ui = new Ui();
ui.startGame(); //TMP

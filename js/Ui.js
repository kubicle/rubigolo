'use strict';

//var main = require('./main');
//var WGo = require('../lib/wgo.js');
var main = window.main, WGo = window.WGo; //TMP

var GameLogic = main.GameLogic;
var Grid = main.Grid;
var Ai1Player = main.Ai1Player;
var ScoreAnalyser = main.ScoreAnalyser;


function Ui() {
  this.gsize = 9;
  this.handicap = 0;
  this.aiColor = main.WHITE;
  this.withCoords = true;

  this.scorer = new ScoreAnalyser();
  this.createBoard();
  this.createControls();
  this.history = document.getElementById('history');
  this.output = document.getElementById('output');
}
//TMP module.exports = Ui;

Ui.prototype.createBoard = function () {
  var config = { size: this.gsize, width: 600, section: { top: -0.5, left: -0.5, right: -0.5, bottom: -0.5 } };
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
  this.refreshHistory();

  for (var j = 0; j < this.gsize; j++) {
    for (var i = 0; i < this.gsize; i++) {
      var color = this.game.goban.color(i + 1, this.gsize - j);
      var wgoColor = toWgoColor[color];
      var obj = this.board.obj_arr[i][j][0];
      if (wgoColor === null) {
        if (obj) this.board.removeObjectsAt(i,j);
      } else if (!obj || obj.c !== wgoColor) {
          this.board.addObject({ x: i, y: j, c: wgoColor });
      }
    }
  }
};

Ui.prototype.showScoringBoard = function () {
  for (var j = 0; j < this.gsize; j++) {
    for (var i = 0; i < this.gsize; i++) {
      var color = this.game.goban.scoringGrid.yx[this.gsize - j][i + 1];
      switch (color) {
      case Grid.TERRITORY_COLOR + main.BLACK:
      case Grid.DEAD_COLOR + main.WHITE:
        this.board.addObject({ x: i, y: j, type: 'mini', c: WGo.B });
        break;
      case Grid.TERRITORY_COLOR + main.WHITE:
      case Grid.DEAD_COLOR + main.BLACK:
        this.board.addObject({ x: i, y: j, type: 'mini', c: WGo.W });
        break;
      case Grid.DAME_COLOR:
        this.board.addObject({ x: i, y: j, type: 'SL' });
        break;
      case main.BLACK: case main.WHITE: break;
      case Grid.EMPTY_COLOR: break;
      default: console.error(i,j,color)
      }
    }
  }
};

Ui.prototype.refreshHistory = function () {
  var moves = this.game.history;
  var black = !this.handicap;
  var txt = '';
  if (this.handicap) txt += 'Handicap: ' + this.handicap + '<br>';
  for (var i = 0; i < moves.length; i++, black = !black) {
    var num = '%3d'.format(i + 1).replace(/ /g, '&nbsp;');
    var color = black ? 'B' : 'W';
    txt += num + ': ' + color + '-' + moves[i] + '<br>';
  }
  this.history.innerHTML = txt;
};

Ui.prototype.newButton = function (name, label) {
  var self = this;
  var btn = this.ctrl[name] = document.createElement('button');
  btn.className = 'gameButton';
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
  this.newButton('accept', 'Accept');
  this.newButton('refuse', 'Refuse');
  this.newButton('newg', 'New game');
};

Ui.prototype.toggleControls = function () {
  var inGame = !(this.game.gameEnded || this.game.gameEnding);
  this.setVisible(['accept', 'refuse'], this.game.gameEnding);
  this.setVisible(['pass', 'undo', 'resi'], inGame);
  this.setVisible(['newg'], this.game.gameEnded);
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
  this.aiPlayer = new Ai1Player(game.goban, this.aiColor);
  this.toggleControls();
  this.message('Game started. Your turn...');
  this.refreshBoard();
};

/** @return false if game goes on normally; true if special ending action was done */
Ui.prototype.checkEnd = function () {
  if (this.game.gameEnding) {
    this.proposeScore();
    return true;
  }
  if (this.game.gameEnded) {
    this.showEnd(); // one resigned
    return true;
  }
  return false;
};

Ui.prototype.proposeScore = function () {
  this.scorer.startScoring(this.game.goban, this.game.komi, this.game.whoResigned);
  this.scoreMsg = this.scorer.getScore().join('<br>');
  this.message(this.scoreMsg);
  this.message('<br>Do you accept this score?', true);
  this.toggleControls();
  this.showScoringBoard();
};

Ui.prototype.acceptScore = function (acceptEnd) {
  this.game.acceptEnding(acceptEnd);
  if (acceptEnd) return this.showEnd();

  this.message('Score in dispute. Continue playing...');
  this.toggleControls();
  this.refreshBoard();
};

Ui.prototype.showEnd = function () {
  this.message('Game ended.<br>' + this.scoreMsg + '<br>' + this.game.historyString());
  this.refreshHistory();
  this.toggleControls();
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
  case 'accept':
    return this.acceptScore(true);
  case 'refuse':
    return this.acceptScore(false, /*whoRefused=*/ 1 - this.aiColor);
  case 'newg':
    return this.startGame();
  default:
    throw new Error('Button not handled: ' + btnName);
  }
};

Ui.prototype.playerMove = function (move) {
  if (!this.game.playOneMove(move)) {
    if (this.game.gameEnded) return; // simply ignore if game already ended
    return this.message(this.game.getErrors().join('<br>'));
  }
  this.refreshBoard();
  return true;
};

Ui.prototype.showAiMoveData = function (move) {
  var txt = 'AI: ' + move + '<br>';
  var ev = this.aiPlayer.survey;
  if (!ev) return this.message(txt);

  for (var h in ev) {
    if (ev[h] === 0) continue;
    txt += h + ': ' + ev[h].toFixed(3) + '<br>';
  }
  this.message(txt);
};

Ui.prototype.letAiPlay = function () {
  // human resigned or double-passed?
  if (this.checkEnd()) return;

  // get AI move
  var move = this.aiPlayer.getMove();
  this.game.playOneMove(move);
  this.showAiMoveData(move);
  
  // AI resigned or double-passed?
  if (this.checkEnd()) return;

  // refresh what should be
  if (move === 'pass') return this.refreshHistory();
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

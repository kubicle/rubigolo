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
  this.createControls();
  this.history = document.getElementById('history');
  this.output = document.getElementById('output');
}
//TMP module.exports = Ui;

Ui.prototype.createBoard = function () {
  if (this.boardSize === this.gsize) return; // already have the right board
  this.boardSize = this.gsize;
  var parentElt = document.getElementById('board');
  parentElt.innerHTML = '';
  var config = { size: this.gsize, width: 600, section: { top: -0.5, left: -0.5, right: -0.5, bottom: -0.5 } };
  this.board = new WGo.Board(parentElt, config);
  if (this.withCoords) this.board.addCustomObject(WGo.Board.coordinates);
  var self = this;
  this.board.addEventListener('click', function (x,y) {
    if (x < 0 || y < 0 || x >= self.gsize || y >= self.gsize) return;
    self.onClick(x + 1, self.gsize - y);
  });
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

Ui.prototype.refreshBoard = function (force) {
  this.refreshHistory();

  for (var j = 0; j < this.gsize; j++) {
    for (var i = 0; i < this.gsize; i++) {
      var color = this.game.goban.color(i + 1, this.gsize - j);
      var wgoColor = toWgoColor[color];
      
      var obj = this.board.obj_arr[i][j][0];
      if (force) { obj = null; this.board.removeObjectsAt(i,j); }

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
        this.board.addObject({ x: i, y: j, type: 'SL', c: 'grey' });
        break;
      case main.BLACK: case main.WHITE: break;
      case Grid.EMPTY_COLOR: break;
      default: console.error(i,j,color);
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

function newElement(type, className) {
  var elt = document.createElement(type);
  if (className) elt.className = className;
  return elt;
}

function newButton(name, label, action) {
  var btn = document.createElement('button');
  btn.className = 'gameButton ' + name + 'Button';
  btn.innerText = label;
  btn.addEventListener('click', action);
  return btn;
}

function newInput(parent, name, label, init) {
  var labelElt = parent.appendChild(newElement('span', 'inputLabel'));
  labelElt.textContent = label + ':';
  var inp = parent.appendChild(newElement('input', name + 'Input'));
  if (init !== undefined) inp.value = init;
  return inp;
}

Ui.prototype.newGameDialog = function () {
  this.ctrl.newg.disabled = true;
  var dialog = document.body.appendChild(newElement('div', 'newGameDialog'));
  var form = dialog.appendChild(newElement('form'));
  form.setAttribute('action',' ');
  var options = form.appendChild(newElement('div'));
  var size = newInput(options, 'size', 'Size', this.gsize);
  var handicap = newInput(options, 'handicap', 'Handicap', this.handicap);
  var aiColor = newInput(options, 'aiColor', 'AI plays', this.aiColor);
  var moves = newInput(form, 'moves', 'Moves to load');
  var self = this;
  var okBtn = form.appendChild(newButton('start', 'OK', function (ev) {
    ev.preventDefault();
    self.gsize = parseInt(size.value) || 9;
    self.handicap = parseInt(handicap.value) || 0;
    self.aiColor = parseInt(aiColor.value) ? main.WHITE : main.BLACK;

    self.startGame(moves.value);
    document.body.removeChild(dialog);
    self.ctrl.newg.disabled = false;
  }));
  okBtn.setAttribute('type','submit'); //style="display:none"
};

Ui.prototype.newButton = function (name, label, action) {
  this.ctrl[name] = this.controls.appendChild(newButton(name, label, action));
};

Ui.prototype.createControls = function () {
  this.ctrl = {};
  this.controls = document.getElementById('controls');
  var self = this;
  this.newButton('pass', 'Pass', function () {
    self.game.playOneMove('pass');
    self.letAiPlay();
  });
  this.newButton('undo', 'Undo', function () {
    self.message('Undone AI move and your previous move');
    self.playerMove('undo');
  });
  this.newButton('resi', 'Resign', function () {
    self.game.playOneMove('resi');
    self.computeScore();
    self.checkEnd();
  });
  this.newButton('accept', 'Accept', function () {
    self.acceptScore(true);
  });
  this.newButton('refuse', 'Refuse', function () {
    self.acceptScore(false);
  });
  this.newButton('newg', 'New game', function () {
    self.newGameDialog();
  });
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

Ui.prototype.startGame = function (firstMoves) {
  this.createBoard();
  var game = this.game = new GameLogic();
  game.newGame(this.gsize, this.handicap);
  this.aiPlayer = new Ai1Player(game.goban, this.aiColor);
  this.toggleControls();
  this.message('Game started. Your turn...'); // player will not see this if AI plays below
  this.refreshBoard(); // needed here to clean-up previous score counting if any
  if (firstMoves) {
    game.loadMoves(firstMoves);
    this.refreshBoard();
  }
  if (this.aiColor === game.curColor) this.letAiPlay();
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

Ui.prototype.computeScore = function () {
  this.scoreMsg = this.scorer.computeScore(this.game.goban, this.game.komi, this.game.whoResigned).join('<br>');
};

Ui.prototype.proposeScore = function () {
  this.computeScore();
  this.message(this.scoreMsg);
  this.message('<br>Do you accept this score?', true);
  this.toggleControls();
  this.refreshHistory();
  this.showScoringBoard();
};

Ui.prototype.acceptScore = function (acceptEnd) {
  var humanColor = 1 - this.aiColor; // if dispute, this is always human since AI did the counting
  this.game.acceptEnding(acceptEnd, humanColor);
  if (acceptEnd) return this.showEnd();

  this.message('Score in dispute. Continue playing...');
  this.toggleControls();
  this.refreshBoard(/*force=*/true);
};

Ui.prototype.showEnd = function () {
  this.message('Game ended.<br>' + this.scoreMsg + '<br>' + this.game.historyString());
  this.refreshHistory();
  this.toggleControls();
};

Ui.prototype.playerMove = function (move) {
  if (!this.game.playOneMove(move)) {
    if (this.game.gameEnded) return; // simply ignore if game already ended
    return this.message(this.game.getErrors().join('<br>'));
  }
  this.refreshBoard();
  return true;
};

Ui.prototype.onClick = function (i, j) {
  var move = Grid.moveAsString(i, j);
  if (!this.playerMove(move)) return;

  this.letAiPlay();
};

Ui.prototype.showAiMoveData = function (move) {
  var txt = 'AI: ' + move + '<br>';
  txt += this.aiPlayer.getMoveSurveyText(1).replace(/\n/g, '<br>');
  txt += this.aiPlayer.getMoveSurveyText(2).replace(/\n/g, '<br>');
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

var ui = new Ui();
ui.startGame(); //TMP

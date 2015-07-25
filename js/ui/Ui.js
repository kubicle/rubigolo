'use strict';

var main = require('../main');

var Ai1Player = require('../ai/Ai1Player');
var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var NewGameDlg = require('./NewGameDlg');
var ScoreAnalyser = require('../ScoreAnalyser');

var WHITE = main.WHITE, BLACK = main.BLACK;

var viewportWidth = document.documentElement.clientWidth;
//var pixelRatio = window.devicePixelRatio || 1;


function Ui(game) {
    this.gsize = 9;
    this.handicap = 0;
    this.aiPlays = 'white';
    this.withCoords = true;

    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser();
    this.board = null;
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    this.newGameDialog();
};

Ui.prototype.refreshBoard = function () {
    this.refreshHistory();
    this.board.refresh();
};

Ui.prototype.refreshHistory = function () {
    if (!this.historyElt) return;
    var moves = this.game.history;
    var black = !this.handicap;
    var txt = '';
    if (this.handicap) txt += 'Handicap: ' + this.handicap + '<br>';
    for (var i = 0; i < moves.length; i++, black = !black) {
        var num = '%3d'.format(i + 1).replace(/ /g, '&nbsp;');
        var color = black ? 'B' : 'W';
        txt += num + ': ' + color + '-' + moves[i] + '<br>';
    }
    this.historyElt.setHtml(txt);
    this.historyElt.elt.scrollTop = this.historyElt.elt.scrollHeight;
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    this.message(this.whoPlaysNow());
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    var isCompact = layout === 'compact';
    var gameDiv = this.gameDiv = Dome.newDiv(parent, 'gameUi');

    if (title) gameDiv.newDiv(isCompact ? 'testTitle' : 'pageTitle').setText(title);
    this.boardElt = gameDiv.newDiv('board');
    if (descr) this.boardDesc = gameDiv.newDiv('boardDesc').setHtml(descr);
    this.createControls(gameDiv);

    var logDiv = gameDiv.newDiv('logDiv');
    this.output = logDiv.newDiv('logBox outputBox');
    if (!isCompact) this.historyElt = logDiv.newDiv('logBox historyBox');

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60, viewportWidth);
    if (!isCompact) this.controlElt.setAttribute('style', 'max-width:' + this.boardWidth + 'px');

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (self.inEvalMode) return self.evalMove(move);
        self.playerMove(move);
    });
};

Ui.prototype.resetUi = function () {
    if (!this.gameDiv) return;
    Dome.removeChild(document.body, this.gameDiv);
    this.gameDiv = null;
    this.board = null;
};

Ui.prototype.newGameDialog = function () {
    this.resetUi();
    var options = {
        gsize: this.gsize,
        handicap: this.handicap,
        aiPlays: this.aiPlays
    };
    var self = this;
    new NewGameDlg(options, function (options) {
        self.gsize = options.gsize;
        self.handicap = options.handicap;
        self.aiPlays = options.aiPlays;
        self.startGame(options.moves);
    });
};

Ui.prototype.createControls = function (parentDiv) {
    this.controls = Dome.newGroup();
    this.controlElt = parentDiv.newDiv('controls');
    this.mainBtn = this.controlElt.newDiv('mainControls');
    this.testBtn = this.controlElt.newDiv('testControls');
    var self = this;
    Dome.newButton(this.mainBtn, '#pass', 'Pass', function () { self.playerMove('pass'); });
    Dome.newButton(this.mainBtn, '#next', 'Next', function () { self.letNextPlayerPlay(); });
    Dome.newButton(this.mainBtn, '#next10', 'Next 10', function () { self.automaticAiPlay(10); });
    Dome.newButton(this.mainBtn, '#nextAll', 'Finish', function () { self.automaticAiPlay(); });
    Dome.newButton(this.mainBtn, '#undo', 'Undo', function () { self.playUndo(); });
    Dome.newButton(this.mainBtn, '#resi', 'Resign', function () { self.playerResigns(); });
    Dome.newButton(this.mainBtn, '#accept', 'Accept', function () { self.acceptScore(true); });
    Dome.newButton(this.mainBtn, '#refuse', 'Refuse', function () { self.acceptScore(false); });
    Dome.newButton(this.mainBtn, '#newg', 'New game', function () { self.newGameDialog(); });

    Dome.newButton(this.testBtn, '#evalMode', 'Eval mode', function () {
        self.inEvalMode = !self.inEvalMode;
        self.controls.setEnabled('ALL', !self.inEvalMode, ['evalMode','undo','next','pass']);
        self.controls.get('evalMode').toggleClass('toggled', self.inEvalMode);
        main.debug = true;
        main.log.level = main.Logger.DEBUG;
    });
    Dome.newButton(this.testBtn, '#score', 'Score test', function () { self.scoreTest(); });
    Dome.newButton(this.testBtn, '#territory', 'Territory test', function () { self.territoryTest(); });
};

Ui.prototype.toggleControls = function () {
    var inGame = !(this.game.gameEnded || this.game.gameEnding);
    var auto = this.aiPlays === 'both';

    this.controls.setVisible(['accept', 'refuse'], this.game.gameEnding);
    this.controls.setVisible(['undo'], inGame);
    this.controls.setVisible(['pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll'], inGame && auto);
    this.controls.setVisible(['newg'], this.game.gameEnded);
};

Ui.prototype.message = function (html, append) {
    if (append) html = this.output.html() + html;
    this.output.setHtml(html);
};

Ui.prototype.createPlayers = function () {
    this.players = [];
    this.playerIsAi = [false, false];
    if (this.aiPlays === 'black' || this.aiPlays === 'both') {
        this.players[BLACK] = new Ai1Player(this.game.goban, BLACK);
        this.playerIsAi[BLACK] = true;
    }
    if (this.aiPlays === 'white' || this.aiPlays === 'both') {
        this.players[WHITE] = new Ai1Player(this.game.goban, WHITE);
        this.playerIsAi[WHITE] = true;
    }
};

Ui.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (!player) player = this.players[color] = new Ai1Player(this.game.goban, color);
    return player;
};

Ui.prototype.startGame = function (firstMoves, isLoaded) {
    var game = this.game;
    if (!isLoaded) game.newGame(this.gsize, this.handicap);
    if (firstMoves) {
        game.loadMoves(firstMoves);
    }
    // read values from game to make sure they are valid and match loaded game
    this.gsize = game.goban.gsize;
    this.handicap = game.handicap;

    this.createPlayers();
    if (!this.gameDiv) this.createGameUi('main', document.body, 'Rubigolo');
    this.toggleControls();

    var options = { coords: this.withCoords };
    this.board.create(this.boardElt, this.boardWidth, this.game.goban, options);
    this.refreshBoard();

    if (isLoaded) return;
    if (firstMoves && this.checkEnd()) return;

    this.message('Game started. Your turn...'); // erased if a move is played below
    this.letNextPlayerPlay();
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
    this.message('<br><br>Do you accept this score?', true);
    this.toggleControls();
    this.refreshHistory();
    this.board.showScoring();
};

Ui.prototype.acceptScore = function (acceptEnd) {
    // who actually refused? Current player unless this is a human VS AI match (in which case always human)
    var whoRefused = this.game.curColor;
    if (this.playerIsAi[whoRefused] && !this.playerIsAi[1 - whoRefused]) whoRefused = 1 - whoRefused;

    this.game.acceptEnding(acceptEnd, whoRefused);
    if (acceptEnd) return this.showEnd();

    this.message('Score in dispute. Continue playing...');
    this.toggleControls();
    this.refreshBoard();
    // In AI VS AI move we don't ask AI to play again otherwise it simply passes again
    if (this.aiPlays !== 'both') this.letNextPlayerPlay();
};

Ui.prototype.showEnd = function () {
    this.message('Game ended.<br>' + this.scoreMsg + '<br>' + this.game.historyString());
    this.refreshHistory();
    this.toggleControls();
};

Ui.prototype.showAiMoveData = function (aiPlayer, move) {
    var playerName = Grid.colorName(aiPlayer.color);
    var txt = playerName + ' (AI): ' + move + '<br>';
    txt += aiPlayer.getMoveSurveyText(1).replace(/\n/g, '<br>');
    txt += aiPlayer.getMoveSurveyText(2).replace(/\n/g, '<br>');
    this.message(txt);
};

Ui.prototype.letAiPlay = function (automatic) {
    var aiPlayer = this.players[this.game.curColor];
    var move = aiPlayer.getMove();
    if (!automatic) this.showAiMoveData(aiPlayer, move);
    this.game.playOneMove(move);

    // AI resigned or double-passed?
    if (this.checkEnd()) return;

    // no refresh in automatic mode until last move
    if (!automatic) this.refreshBoard();
};

Ui.prototype.playerMove = function (move) {
    var playerName = Grid.colorName(this.game.curColor);

    if (!this.game.playOneMove(move)) {
        return this.message(this.game.getErrors().join('<br>'));
    }
    if (this.checkEnd()) return;

    this.refreshBoard();
    this.message(playerName + ': ' + move);
    this.letNextPlayerPlay();
};

Ui.prototype.playerResigns = function () {
    this.game.playOneMove('resi');
    this.computeScore();
    this.checkEnd();
};

Ui.prototype.playUndo = function () {
    var command = 'undo';
    if (this.aiPlays === 'none' || this.aiPlays === 'both' || this.inEvalMode) {
        command = 'half_undo';
    }

    if (!this.game.playOneMove(command)) {
        this.message(this.game.getErrors().join('<br>'));
    } else {
        this.refreshBoard();
        this.message('Undo!');
    }
    this.message(' ' + this.whoPlaysNow(), true);
};

Ui.prototype.whoPlaysNow = function () {
    var playerName = Grid.colorName(this.game.curColor);
    return '(' + playerName + '\'s turn)';
};

Ui.prototype.letNextPlayerPlay = function (automatic) {
    if (this.playerIsAi[this.game.curColor]) {
        this.letAiPlay(automatic);
    } else {
        this.message(' ' + this.whoPlaysNow(), true);
    }
};

Ui.prototype.automaticAiPlay = function (turns) {
    for(var i = 0; i < turns || !turns; i++) {
        this.letNextPlayerPlay(true);
        if (this.game.gameEnding) return; // no refresh since scoring board is displayed
    }
    this.refreshBoard();
};

//---

Ui.prototype.evalMove = function (move) {
    var player = this.getAiPlayer(this.game.curColor);
    var coords = Grid.parseMove(move);
    player.testMoveEval(coords[0], coords[1]);
    this.showAiMoveData(player, move);
};

Ui.prototype.scoreTest = function () {
    if (!this.board.prepareSpecialDisplay('scoring')) return;

    this.computeScore();
    this.scorer.computeScore(this.game.goban, 0);
    
    var yx = this.game.goban.scoringGrid.yx;
    this.board.showSpecial('scoring', yx);
};

Ui.prototype.territoryTest = function () {
    if (!this.board.prepareSpecialDisplay('territory')) return;

    var yx = this.getAiPlayer(this.game.curColor).ter.guessTerritories();
    this.board.showSpecial('territory', yx);
};

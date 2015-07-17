'use strict';

var main = require('./main');
var GameLogic = require('./GameLogic');
var Grid = require('./Grid');
var Ai1Player = require('./ai/Ai1Player');
var ScoreAnalyser = require('./ScoreAnalyser');

var WGo = window.WGo;

var WHITE = main.WHITE, BLACK = main.BLACK, EMPTY = main.EMPTY;


function Ui(game) {
    this.gsize = 9;
    this.handicap = 0;
    this.aiPlays = 'white';
    this.withCoords = true;

    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser();
}
module.exports = Ui;


Ui.prototype.createBoard = function () {
    if (this.boardSize === this.gsize) return; // already have the right board
    this.boardSize = this.gsize;
    this.boardElt.innerHTML = '';
    var config = { size: this.gsize, width: this.boardWidth, section: { top: -0.5, left: -0.5, right: -0.5, bottom: -0.5 } };
    this.board = new WGo.Board(this.boardElt, config);
    if (this.withCoords) this.board.addCustomObject(WGo.Board.coordinates);
    var self = this;
    this.board.addEventListener('click', function (x,y) {
        if (x < 0 || y < 0 || x >= self.gsize || y >= self.gsize) return;
        var move = Grid.moveAsString(x + 1, self.gsize - y);
        if (self.inEvalMode) return self.evalMove(move);
        self.playerMove(move);
    });
};

// Color codes conversions WGo->Rubigolo
var fromWgoColor = {};
fromWgoColor[WGo.B] = BLACK;
fromWgoColor[WGo.W] = WHITE;
// Color codes conversions Rubigolo->WGo
var toWgoColor = {};
toWgoColor[EMPTY] = null;
toWgoColor[BLACK] = WGo.B;
toWgoColor[WHITE] = WGo.W;

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

Ui.prototype.showBoard = function (fn) {
    this.refreshBoard(); // the base is the up-to-date board

    for (var j = 0; j < this.gsize; j++) {
        for (var i = 0; i < this.gsize; i++) {
            var obj = fn(i + 1, this.gsize - j);
            if (!obj) continue;
            obj.x = i; obj.y = j;
            this.board.addObject(obj);
        }
    }
};

Ui.prototype.showScoringBoard = function () {
    var yx = this.game.goban.scoringGrid.yx;
    this.showBoard(function (i, j) {
        switch (yx[j][i]) {
        case Grid.TERRITORY_COLOR + BLACK:
        case Grid.DEAD_COLOR + WHITE:
            return { type: 'mini', c: WGo.B };
        case Grid.TERRITORY_COLOR + WHITE:
        case Grid.DEAD_COLOR + BLACK:
            return { type: 'mini', c: WGo.W };
        case Grid.DAME_COLOR:
            return { type: 'SL', c: 'grey' };
        default:
            return null;
        }
    });
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
    this.historyElt.innerHTML = txt;
};

function newElement(parent, type, className) {
    var elt = parent.appendChild(document.createElement(type));
    if (className) elt.className = className;
    return elt;
}

function toggleElementClass(elt, className, enable) {
    var classes = elt.className.split(' ');
    var ndx = classes.indexOf(className);
    if (enable) {
        if (ndx >= 0) return;
        elt.className += ' ' + className;
    } else {
        if (ndx < 0) return;
        classes.splice(ndx, 1);
        elt.className = classes.join(' ');
    }
}

function newButton(parent, name, label, action) {
    var btn = newElement(parent, 'button', name + 'Button');
    btn.innerText = label;
    btn.addEventListener('click', action);
    return btn;
}

function newLabel(parent, name, label) {
    var elt = newElement(parent, 'span', name + 'Label');
    elt.textContent = label;
    return elt;
}

function newInput(parent, name, label, init) {
    newLabel(parent, name + 'Label input', label + ':');
    var inp = newElement(parent, 'input', name + 'Input');
    if (init !== undefined) inp.value = init;
    return inp;
}

function newRadio(parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var inp = opts[i] = newElement(parent, 'input', name + 'RadioBtn');
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;
        var label = newElement(parent, 'label', name + 'RadioLabel');
        label.textContent = labels[i];
        label.setAttribute('for', inp.id);
    }
    return opts;
}
function getRadioValue(opts) {
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].checked) return opts[i].value;
    }
}

Ui.prototype.createUi = function () {
    this.createGameUi('main', document.body, 'Rubigolo');
    this.createBoard(); // TODO: replace by png or any other decoration
    this.newGameDialog();
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    this.message(this.whoPlaysNow());
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    if (title) newElement(parent, 'h1', 'pageTitle').textContent = title;
    var gameDiv = newElement(parent, 'div', 'gameUi');
    var boardHist = newElement(gameDiv, 'div');
    this.boardElt = newElement(boardHist, 'div', 'board');
    if (descr) {
        this.boardDesc = newElement(boardHist, 'div', 'boardDesc');
        this.boardDesc.textContent = descr;
    }
    if (layout === 'main') this.historyElt = newElement(boardHist, 'div', 'logBox historyBox');
    this.controlElt = newElement(gameDiv, 'div', 'controls');
    this.output = newElement(gameDiv, 'div', 'logBox outputBox');

    this.boardWidth = layout === 'compact' ? (this.game.goban.gsize + 2) * 28 : 600;
    this.createControls();
};

Ui.prototype.newGameDialog = function () {
    this.setVisible('ALL', false);
    var dialog = newElement(document.body, 'div', 'newGameDialog');
    var form = newElement(dialog, 'form');
    form.setAttribute('action',' ');
    var options = newElement(form, 'div');

    var sizeBox = newElement(options, 'div');
    newLabel(sizeBox, 'input', 'Size:');
    var sizeElt = newRadio(sizeBox, 'size', [5,7,9,13,19], null, this.gsize);

    var handicap = newInput(options, 'handicap', 'Handicap', this.handicap);

    var aiColorBox = newElement(options, 'div');
    newLabel(aiColorBox, 'input', 'AI plays:');
    var aiColor = newRadio(aiColorBox, 'aiColor', ['white', 'black', 'both', 'none'], null, this.aiPlays);

    var moves = newInput(form, 'moves', 'Moves to load');
    var self = this;
    var okBtn = newButton(form, 'gameButton start', 'OK', function (ev) {
        ev.preventDefault();
        self.gsize = ~~getRadioValue(sizeElt);
        self.handicap = parseInt(handicap.value) || 0;
        self.aiPlays = getRadioValue(aiColor);

        self.setVisible('ALL', true);
        self.startGame(moves.value);
        document.body.removeChild(dialog);
    });
    okBtn.setAttribute('type','submit');
};

Ui.prototype.newButton = function (name, label, action, isTest) {
    var parent = isTest ? this.testButtons : this.mainButtons;
    this.ctrl[name] = newButton(parent, 'gameButton ' + name, label, action);
};

Ui.prototype.createControls = function () {
    this.ctrl = {};
    this.mainButtons = newElement(this.controlElt, 'div');
    this.testButtons = newElement(this.controlElt, 'div', 'testControls');
    var self = this;
    this.newButton('pass', 'Pass', function () {
        self.playerMove('pass');
    });
    this.newButton('next', 'Next', function () {
        self.letNextPlayerPlay();
    });
    this.newButton('next10', 'Next 10', function () {
        self.automaticAiPlay(10);
    });
    this.newButton('nextAll', 'Finish', function () {
        self.automaticAiPlay();
    });
    this.newButton('undo', 'Undo', function () {
        self.playUndo();
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
    this.newButton('evalMode', 'Eval mode', function () {
        self.inEvalMode = !self.inEvalMode;
        main.debug = true;
        main.log.level = main.Logger.DEBUG;
        self.setEnabled('ALL', !self.inEvalMode, ['evalMode','undo','next','pass']);
        toggleElementClass(self.ctrl.evalMode, 'toggled', self.inEvalMode);
    }, true);
    this.newButton('score', 'Score test', function () {
        self.scoreTest();
    }, true);
    this.newButton('territory', 'Territory test', function () {
        self.territoryTest();
    }, true);
};

Ui.prototype.toggleControls = function () {
    var inGame = !(this.game.gameEnded || this.game.gameEnding);
    var auto = this.aiPlays === 'both';

    this.setVisible(['accept', 'refuse'], this.game.gameEnding);
    this.setVisible(['undo'], inGame);
    this.setVisible(['pass', 'resi'], inGame && !auto);
    this.setVisible(['next', 'next10', 'nextAll'], inGame && auto);
    this.setVisible(['newg'], this.game.gameEnded);
};

Ui.prototype.setEnabled = function (names, enabled, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var ctrl = this.ctrl[names[i]];
        ctrl.disabled = !enabled;
    }
};

Ui.prototype.setVisible = function (names, show, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        var ctrl = this.ctrl[names[i]];
        ctrl.hidden = !show;
    }
};

Ui.prototype.message = function (html, append) {
  if (!append) this.output.innerHTML = '';
  this.output.innerHTML += html;
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
  this.message('Game started. Your turn...'); // erased if moved are played
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
    this.toggleControls();
    this.createBoard();
    this.refreshBoard();

    if (isLoaded) return;
    if (firstMoves && this.checkEnd()) return;
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
    this.showScoringBoard();
};

Ui.prototype.acceptScore = function (acceptEnd) {
    // who actually refused? Current player unless this is a human VS AI match (in which case always human)
    var whoRefused = this.game.curColor;
    if (this.playerIsAi[whoRefused] && !this.playerIsAi[1 - whoRefused]) whoRefused = 1 - whoRefused;

    this.game.acceptEnding(acceptEnd, whoRefused);
    if (acceptEnd) return this.showEnd();

    this.message('Score in dispute. Continue playing...');
    this.toggleControls();
    this.refreshBoard(/*force=*/true);
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
    this.scoreDisplayed = !this.scoreDisplayed;
    if (!this.scoreDisplayed) return this.refreshBoard(/*force=*/true);

    this.computeScore();
    this.showScoringBoard();
};

Ui.prototype.territoryTest = function () {
    this.territoryDisplayed = !this.territoryDisplayed;
    if (!this.territoryDisplayed) return this.refreshBoard(/*force=*/true);

    var yx = this.getAiPlayer(this.game.curColor).ter.guessTerritories();
    this.showBoard(function (i, j) {
        switch (yx[j][i]) {
        case -1:   return { type: 'mini', c: WGo.B };
        case -0.5: return { type: 'outline', c: WGo.B };
        case  0:   return null;
        case +0.5: return { type: 'outline', c: WGo.W };
        case +1:   return { type: 'mini', c: WGo.W };
        default:   return null;
        }
    });
};

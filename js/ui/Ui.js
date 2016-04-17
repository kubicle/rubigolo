'use strict';

var CONST = require('../constants');
var main = require('../main');

var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var NewGameDlg = require('./NewGameDlg');
var PopupDlg = require('./PopupDlg');
var ScoreAnalyser = require('../ScoreAnalyser');
var userPref = require('../userPreferences');

var WHITE = CONST.WHITE, BLACK = CONST.BLACK;

var viewportWidth = document.documentElement.clientWidth;


function Ui(game) {
    this.gsize = this.handicap = 0;
    this.aiPlays = '';
    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser(this.game);
    this.board = null;

    if (this.initDev) {
        this.initDev();
    } else {
        this.isProd = true;
    }
}
module.exports = Ui;


/** This is the entry point for starting the app UI */
Ui.prototype.createUi = function () {
    window.addEventListener('beforeunload', this.beforeUnload.bind(this));

    this.gsize = userPref.getValue('lastGameSize', 9);
    this.handicap = userPref.getValue('lastGameHandicap', 0);
    this.aiPlays = userPref.getValue('lastGameAiPlays', 'white');
    this.rules = userPref.getValue('lastGameRules', 'jp');
    var lastGame = userPref.getValue('lastGameHistory');

    this.newGameDialog(lastGame);
};

Ui.prototype.saveGamePreferences = function () {
    userPref.setValue('lastGameSize', this.gsize);
    userPref.setValue('lastGameHandicap', this.handicap);
    userPref.setValue('lastGameAiPlays', this.aiPlays);
    userPref.setValue('lastGameRules', this.rules);
    userPref.setValue('lastGameHistory', this.game.history);
};

Ui.prototype.beforeUnload = function () {
    this.saveGamePreferences();
    userPref.close();
};

Ui.prototype.refreshBoard = function () {
    this.board.refresh();
    if (this.inDevMode) this.devDisplay();
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    if (this.game.gameEnding) this.proposeScore();
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    var isCompact = this.isCompactLayout = layout === 'compact';
    var gameDiv = this.gameDiv = Dome.newDiv(parent, 'gameUi');

    if (title) gameDiv.newDiv(isCompact ? 'testTitle' : 'pageTitle').setText(title);
    this.boardElt = gameDiv.newDiv('board');
    if (descr) this.boardDesc = gameDiv.newDiv('boardDesc').setHtml(descr);
    this.createStatusBar(gameDiv);
    this.createControls(gameDiv);
    if (!this.isProd) this.createDevControls();

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60 + 10, viewportWidth - 15);

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (move[0] === '!') return !self.isProd && self.onDevKey(move.substr(1));
        if (self.inEvalMode || self.inReview) return self.showDevData(move, null, true);
        self.playerMove(move);
    });
};

Ui.prototype.resetUi = function () {
    if (!this.gameDiv) return;
    Dome.removeChild(document.body, this.gameDiv);
    this.gameDiv = null;
    this.board = null;
};

Ui.prototype.newGameDialog = function (lastGameHistory) {
    Dome.setPageTitle(main.appName);
    this.resetUi();
    var options = {
        gsize: this.gsize,
        handicap: this.handicap,
        aiPlays: this.aiPlays,
        moves: lastGameHistory,
        rules: this.rules
    };
    var self = this;
    new NewGameDlg(options, function validate(options) {
        self.gsize = options.gsize;
        self.handicap = options.handicap;
        self.aiPlays = options.aiPlays;
        self.rules = options.rules;
        self.game.setRules(self.rules === 'jp' ? CONST.JP_RULES : CONST.CH_RULES);
        return self.startGame(options.moves);
    });
};

function MoveElt(parent, className, label) {
    var elt = this.elt = parent.newDiv('oneMove ' + className);
    elt.newDiv('label').setText(label);
    var icon = elt.newDiv('icon');
    this.text = icon.newDiv('text');
}

MoveElt.prototype.setMove = function (move, color) {
    this.elt.setVisible(move !== null);
    this.elt.toggleClass('black', color === BLACK);
    this.elt.toggleClass('white', color === WHITE);
    this.text.setText(move);
};

Ui.prototype.createStatusBar = function (gameDiv) {
    var statusBar = this.statusBar = gameDiv.newDiv('statusBar');
    this.lastMoveElt = new MoveElt(statusBar, 'lastMove', 'Last:');
    this.gameInfoElt = statusBar.newDiv('gameInfo');
    this.shortMessage = statusBar.newDiv('message');
    this.nextPlayerElt = new MoveElt(statusBar, 'nextPlayer', 'Next:');
};

Ui.prototype.showGameInfo = function () {
    var gameInfo = this.game.playerNames[WHITE] + ' VS ' + this.game.playerNames[BLACK] + ' (B)';
    gameInfo += ', komi: ' + this.game.komi;
    if (this.handicap) gameInfo += ', hand: ' + this.handicap;
    if (this.game.rulesName) gameInfo += ', rules: ' + this.game.rulesName;
    this.gameInfoElt.setText(gameInfo);
};

Ui.prototype.showLastMove = function () {
    var moves = this.game.history;
    if (moves.length) {
        var move = this.game.stripMoveColor(moves[moves.length - 1]);
        this.lastMoveElt.setMove(move, 1 - this.game.curColor);
        var pos = this.game.oneMove2xy(move);
        if (pos) this.board.highlightStone('CR', pos[0], pos[1]);
        else this.board.highlightStone(null);
    } else {
        this.lastMoveElt.setMove(null);
    }
    this.showNextPlayer();
    this.shortMessage.setText('');
};

Ui.prototype.showNextPlayer = function (move) {
    if (move === null) return this.nextPlayerElt.setMove(null);
    move = this.game.stripMoveColor(move || '');
    this.nextPlayerElt.setMove(move, this.game.curColor);
};

Ui.prototype.statusMessage = function (msg) {
    this.shortMessage.setText(msg);
    this.showNextPlayer();
    this.longTextElt.setVisible(false);
};

Ui.prototype.longMessage = function (html) {
    this.longTextElt.setHtml(html);
    this.longTextElt.setVisible(true);
};

Ui.prototype.createControls = function (gameDiv) {
    var mainDiv = gameDiv.newDiv('mainControls');
    var self = this;
    this.reviewControls = Dome.newGroup();
    Dome.newButton(mainDiv, '#review', 'Review', function () { self.toggleReview(); });
    Dome.newButton(mainDiv, '#back10', '<<', function () { self.replay(-10); });
    Dome.newButton(mainDiv, '#back1', '<', function () { self.replay(-1); });
    Dome.newButton(mainDiv, '#forw1', '>', function () { self.replay(1); });
    Dome.newButton(mainDiv, '#forw10', '>>', function () { self.replay(10); });

    this.controls = Dome.newGroup();
    Dome.newButton(mainDiv, '#pass', 'Pass', function () { self.playerMove('pass'); });
    Dome.newButton(mainDiv, '#next', 'Next', function () { self.automaticAiPlay(1); });
    Dome.newButton(mainDiv, '#next10', 'Next 10', function () { self.automaticAiPlay(10); });
    Dome.newButton(mainDiv, '#nextAll', 'Finish', function () { self.automaticAiPlay(); });
    Dome.newButton(mainDiv, '#undo', 'Undo', function () { self.playUndo(); });
    Dome.newButton(mainDiv, '#accept', 'Accept', function () { self.acceptScore(true); });
    Dome.newButton(mainDiv, '#refuse', 'Refuse', function () { self.acceptScore(false); });
    Dome.newButton(mainDiv, '#newg', 'New game', function () { self.newGameDialog(); });
    this.longTextElt = mainDiv.newDiv('logBox outputBox').setVisible(false);
    Dome.newButton(mainDiv, '#resi', 'Resign', function () { self.playerResigns(); });

    this.aiVsAiFlags = mainDiv.newDiv('#aiVsAiFlags');
    this.animated = Dome.newCheckbox(this.aiVsAiFlags, 'animated', 'Animated');
};

Ui.prototype.toggleReview = function () {
    this.inReview = !this.inReview;
    this.reviewControls.get('review').toggleClass('toggled', this.inReview);
    this.toggleControls();
    if (this.inReview) {
        this.reviewMoves = this.game.history.concat();
        this.reviewCursor = this.reviewMoves.length;
        this.replay(0); // init buttons' state
    } else {
        this.replay(this.reviewMoves.length - this.reviewCursor);
        this.showNextPlayer();
    }
};

Ui.prototype.toggleControls = function () {
    var inReview = this.inReview, ended = this.game.gameEnded, ending = this.game.gameEnding;
    var inGame = !(ended || ending) && !inReview;
    var auto = this.aiPlays === 'both';

    this.statusBar.setVisible(!ended);
    this.reviewControls.setVisible(['review'], inGame || inReview);
    this.reviewControls.setVisible(['back1', 'back10', 'forw1', 'forw10'], inReview);
    this.controls.setVisible(['accept', 'refuse'], ending);
    this.controls.setVisible(['undo', 'pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll', 'aiVsAiFlags'], inGame && auto);
    this.controls.setVisible(['newg'], ended && !this.isCompactLayout);

    // Dev controls
    if (!this.isProd) this.toggleDevControls(inGame, inReview, auto);
};


//--- GAME LOGIC

Ui.prototype.createPlayers = function (isGameLoaded) {
    this.players = [];
    this.playerIsAi = [false, false];
    for (var color = BLACK; color <= WHITE; color++) {
        if (this.aiPlays === Grid.COLOR_NAMES[color] || this.aiPlays === 'both') {
            var Ai = this.getAiPlayer(color).constructor;
            this.playerIsAi[color] = true;
            if (!isGameLoaded) this.game.setPlayer(color, Ai.publicName + '-' + Ai.publicVersion);
        } else {
            if (!isGameLoaded) this.game.setPlayer(color, 'human');
        }
    }
};

Ui.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    var Ai = color === BLACK ? main.defaultAi : main.latestAi;
    player = this.players[color] = new Ai(this.game, color);
    return player;
};

Ui.prototype.initDisplay = function () {
    this.showGameInfo();
    this.showLastMove();
    this.showNextPlayer();
    this.toggleControls();
    this.refreshBoard();
};

Ui.prototype.loadMoves = function (moves) {
    var errors = [];
    if (!this.game.loadAnyGame(moves, errors)) {
        new PopupDlg(this.gameDiv, errors.join('\n'));
        return false;
    }
    return true;
};

Ui.prototype.startGame = function (firstMoves, isLoaded) {
    var game = this.game;
    if (!isLoaded) game.newGame(this.gsize, this.handicap);
    this.createPlayers(isLoaded);

    if (firstMoves && !this.loadMoves(firstMoves)) return false;

    // read values from game to make sure they are valid and match loaded game
    this.gsize = game.goban.gsize;
    this.handicap = game.handicap;

    if (!this.isProd) this.initDev();

    if (!this.gameDiv) this.createGameUi('main', document.body);

    var options = this.isCompactLayout ? undefined : { background: 'wood' };

    this.board.create(this.boardElt, this.boardWidth, game.goban, options);
    this.initDisplay();

    if (!isLoaded && !firstMoves) this.statusMessage('Game started. Your turn...'); // erased if a move is played below
    if (!this.checkEnd()) this.letNextPlayerPlay();

    return true;
};

/** @return false if game goes on normally; true if special ending action was done */
Ui.prototype.checkEnd = function () {
    if (this.game.gameEnding) {
        this.proposeScore();
        return true;
    }
    if (this.game.gameEnded) { // NB: we only pass here when one resigned
        this.computeScore();
        this.showEnd();
        return true;
    }
    return false;
};

Ui.prototype.computeScore = function () {
    var msgs = this.scorer.computeScoreAsTexts();
    this.scoreMsg = msgs.join('<br>');
};

Ui.prototype.proposeScore = function () {
    this.computeScore();
    this.statusMessage('Do you accept this score?');
    this.longMessage(this.scoreMsg);
    this.toggleControls();
    this.board.showScoring(this.scorer.getScoringGrid().yx);
};

Ui.prototype.acceptScore = function (acceptEnd) {
    // who actually refused? Current player unless this is a human VS AI match (in which case always human)
    var whoRefused = this.game.curColor;
    if (this.playerIsAi[whoRefused] && !this.playerIsAi[1 - whoRefused]) whoRefused = 1 - whoRefused;

    this.game.acceptEnding(acceptEnd, whoRefused);
    if (acceptEnd) return this.showEnd();

    this.statusMessage('Score in dispute. Continue playing...');
    this.toggleControls();
    this.refreshBoard();
    // In AI VS AI move we don't ask AI to play again otherwise it simply passes again
    if (this.aiPlays !== 'both') this.letNextPlayerPlay();
};

Ui.prototype.showEnd = function () {
    this.longMessage(this.scoreMsg + '<br><br>' + this.game.historyString());
    this.toggleControls();
};

Ui.prototype.letAiPlay = function (skipRefresh) {
    var aiPlayer = this.lastAiPlayer = this.players[this.game.curColor];
    this.prevNumRandomPicks = aiPlayer.numRandomPicks;

    var move = aiPlayer.getMove();
    this.game.playOneMove(move);
    if (!skipRefresh) {
        this.showLastMove();
        if (this.inDevMode) this.showDevData(move, aiPlayer, false);
    }

    // AI resigned or double-passed?
    if (this.checkEnd()) return move;

    if (!skipRefresh) this.refreshBoard();
    return move;
};

Ui.prototype.playerMove = function (move) {
    if (!this.game.playOneMove(move)) {
        return this.statusMessage(this.game.getErrors().join('. '));
    }
    if (this.checkEnd()) return;

    this.refreshBoard();
    this.showLastMove();

    this.letNextPlayerPlay();
};

Ui.prototype.playerResigns = function () {
    var self = this;
    var options = { buttons: ['YES', 'NO'] };
    new PopupDlg(this.gameDiv, 'Do you really want to resign?', 'Confirm', options, function (options) {
        if (options.choice !== 0) return;
        self.game.playOneMove('resi');
        self.checkEnd();
    });
};

Ui.prototype.playUndo = function () {
    var command = 'undo';
    if (this.aiPlays === 'none' || this.aiPlays === 'both' || this.inEvalMode) {
        command = 'half_undo';
    }

    if (!this.game.playOneMove(command)) {
        return this.statusMessage(this.game.getErrors().join('. '));
    }
    this.refreshBoard();
    this.showLastMove();
    this.statusMessage('Performed "' + command + '"');
};

Ui.prototype.whoPlaysNow = function () {
    this.board.setCurrentColor(this.game.curColor);
    var playerName = Grid.colorName(this.game.curColor);
    return '(' + playerName + '\'s turn)';
};

Ui.prototype.letNextPlayerPlay = function (skipRefresh) {
    if (this.playerIsAi[this.game.curColor]) {
        this.letAiPlay(skipRefresh);
    } else {
        if (!skipRefresh) this.showNextPlayer();
    }
};

Ui.prototype.automaticAiPlay = function (turns) {
    var isLastTurn = turns === 1;
    var animated = this.animated.isChecked();
    // we refresh for last move OR if animated
    var skipRefresh = !isLastTurn && !animated;

    this.letNextPlayerPlay(skipRefresh);
    if (isLastTurn) return;
    if (this.game.gameEnding) return; // scoring board is displayed

    // play next move
    var self = this;
    window.setTimeout(function () {
        self.automaticAiPlay(turns - 1);
    }, animated ? 100 : 0);
};

Ui.prototype.replay = function (numMoves) {
    var moves = this.reviewMoves, cur = this.reviewCursor;
    // Play or "unplay" the moves
    for (var i = 0; i < numMoves; i++) {
        if (cur === moves.length) break;
        this.game.playOneMove(moves[cur]);
        cur++;
    }
    for (i = 0; i > numMoves; i--) {
        if (cur === 0) break;
        this.game.playOneMove('half_undo');
        cur--;
    }
    this.reviewCursor = cur;

    // Now refresh UI
    this.refreshBoard();
    this.reviewControls.setEnabled(['forw1', 'forw10'], cur !== moves.length);
    this.reviewControls.setEnabled(['back1', 'back10'], cur !== 0);
    this.showLastMove();
    if (cur < moves.length) {
        this.showNextPlayer(moves[cur]);
    } else {
        this.showNextPlayer(null);
    }

    // In eval mode, replay last move to get dev data
    if (this.inEvalMode) {
        var move = cur > 0 ? moves[cur - 1] : null;
        if (move && move.length <= 3) this.afterReplay(move);
    }
};

'use strict';

var main = require('../main');

var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var gtp = require('../net/gtp');
var Logger = require('../Logger');
var ogsApi = require('../net/ogsApi');
var NewGameDlg = require('./NewGameDlg');
var PopupDlg = require('./PopupDlg');
var ScoreAnalyser = require('../ScoreAnalyser');
var UiGtpEngine = require('../net/UiGtpEngine');
var userPref = require('../userPreferences');

var WHITE = main.WHITE, BLACK = main.BLACK;
var sOK = main.sOK;

var viewportWidth = document.documentElement.clientWidth;

var NO_HEURISTIC = '(heuristic)';
var NO_EVAL_TEST = '(other eval)';


function Ui(game) {
    this.gsize = 9;
    this.handicap = 0;
    this.aiPlays = 'white';

    this.game = new GameLogic(game);
    this.scorer = new ScoreAnalyser();
    this.board = null;

    this.initDev();
}
module.exports = Ui;


/** This is the entry point for starting the app */
Ui.prototype.createUi = function () {
    this.newGameDialog();
};

Ui.prototype.refreshBoard = function () {
    this.board.refresh();
    this.devDisplay();
};

Ui.prototype.loadFromTest = function (parent, testName, msg) {
    this.createGameUi('compact', parent, testName, msg);
    this.aiPlays = 'both';
    this.startGame(null, /*isLoaded=*/true);
    if (this.game.gameEnding) {
        this.proposeScore();
    } else {
        this.message(this.whoPlaysNow());
    }
};

Ui.prototype.createGameUi = function (layout, parent, title, descr) {
    var isCompact = this.isCompactLayout = layout === 'compact';
    var gameDiv = this.gameDiv = Dome.newDiv(parent, 'gameUi');

    if (title) gameDiv.newDiv(isCompact ? 'testTitle' : 'pageTitle').setText(title);
    this.boardElt = gameDiv.newDiv('board');
    if (descr) this.boardDesc = gameDiv.newDiv('boardDesc').setHtml(descr);
    this.createControls(gameDiv);
    this.createDevControls();

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60 + 10, viewportWidth - 15);

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (move[0] === '!') return self.onDevKey(move.substr(1));
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
    Dome.setPageTitle(main.appName);
    this.resetUi();
    var options = {
        gsize: this.gsize,
        handicap: this.handicap,
        aiPlays: this.aiPlays
    };
    var self = this;
    new NewGameDlg(options, function validate(options) {
        self.gsize = options.gsize;
        self.handicap = options.handicap;
        self.aiPlays = options.aiPlays;
        return self.startGame(options.moves);
    });
};

Ui.prototype.createControls = function (gameDiv) {
    this.controls = Dome.newGroup();
    var mainDiv = gameDiv.newDiv('mainControls');
    var self = this;
    Dome.newButton(mainDiv, '#pass', 'Pass', function () { self.playerMove('pass'); });
    Dome.newButton(mainDiv, '#next', 'Next', function () { self.automaticAiPlay(1); });
    Dome.newButton(mainDiv, '#next10', 'Next 10', function () { self.automaticAiPlay(10); });
    Dome.newButton(mainDiv, '#nextAll', 'Finish', function () { self.automaticAiPlay(); });
    Dome.newButton(mainDiv, '#undo', 'Undo', function () { self.playUndo(); });
    Dome.newButton(mainDiv, '#accept', 'Accept', function () { self.acceptScore(true); });
    Dome.newButton(mainDiv, '#refuse', 'Refuse', function () { self.acceptScore(false); });
    Dome.newButton(mainDiv, '#newg', 'New game', function () { self.newGameDialog(); });
    this.output = mainDiv.newDiv('logBox outputBox');
    Dome.newButton(mainDiv, '#resi', 'Resign', function () { self.playerResigns(); });

    this.aiVsAiFlags = mainDiv.newDiv('#aiVsAiFlags');
    this.animated = Dome.newCheckbox(this.aiVsAiFlags, 'animated', 'Animated');
};

Ui.prototype.toggleControls = function () {
    var inGame = !(this.game.gameEnded || this.game.gameEnding);
    var auto = this.aiPlays === 'both';
    if (!inGame) this.setEvalMode(false);

    this.controls.setVisible(['accept', 'refuse'], this.game.gameEnding);
    this.controls.setVisible(['undo'], inGame);
    this.controls.setVisible(['pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll', 'aiVsAiFlags'], inGame && auto);
    this.controls.setVisible(['newg'], this.game.gameEnded && !this.isCompactLayout);

    // Dev controls
    this.controls.setVisible(['devDiv'], inGame && this.inDevMode);
};

Ui.prototype.message = function (html, append) {
    if (append) html = this.output.html() + html;
    this.output.setHtml(html);
};


//--- GAME LOGIC

Ui.prototype.createPlayers = function () {
    this.players = [];
    this.playerIsAi = [false, false];
    if (this.aiPlays === 'black' || this.aiPlays === 'both') {
        this.getAiPlayer(BLACK);
        this.playerIsAi[BLACK] = true;
    }
    if (this.aiPlays === 'white' || this.aiPlays === 'both') {
        this.getAiPlayer(WHITE);
        this.playerIsAi[WHITE] = true;
    }
};

Ui.prototype.getAiPlayer = function (color) {
    var player = this.players[color];
    if (player) return player;
    var Ai = color === BLACK ? main.defaultAi : main.latestAi;
    player = this.players[color] = new Ai(this.game.goban, color);
    return player;
};

Ui.prototype.startGame = function (firstMoves, isLoaded) {
    var game = this.game;
    if (!isLoaded) game.newGame(this.gsize, this.handicap);
    if (firstMoves) {
        var errors = [];
        if (!game.loadMoves(firstMoves, errors)) {
            new PopupDlg(this.gameDiv, errors.join('\n'));
            return false;
        }
    }
    // read values from game to make sure they are valid and match loaded game
    this.gsize = game.goban.gsize;
    this.handicap = game.handicap;

    this.createPlayers();
    this.debugHeuristic = null;

    if (!this.gameDiv) this.createGameUi('main', document.body);
    this.toggleControls();

    this.board.create(this.boardElt, this.boardWidth, this.game.goban);
    this.refreshBoard();

    if (isLoaded) return true;
    if (firstMoves && this.checkEnd()) return true;

    this.message('Game started. Your turn...'); // erased if a move is played below
    this.letNextPlayerPlay();
    return true;
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
    this.board.showScoring(this.scorer.getScoringGrid().yx);
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
    this.message(this.scoreMsg + '<br><br>' + this.game.historyString());
    this.toggleControls();
};

Ui.prototype.showAiMoveData = function (aiPlayer, move, isTest) {
    var playerName = Grid.colorName(aiPlayer.color);
    this.message(playerName + ' (AI ' + aiPlayer.version + '): ' + move);

    var txt = aiPlayer.getMoveSurveyText(move, isTest);
    txt = txt.replace(/\n/g, '<br>');
    this.devMessage(txt);
};

Ui.prototype.letAiPlay = function (skipRefresh) {
    var aiPlayer = this.lastAiPlayer = this.players[this.game.curColor];
    var move = aiPlayer.getMove();
    if (!skipRefresh) this.showAiMoveData(aiPlayer, move);
    this.game.playOneMove(move);

    // AI resigned or double-passed?
    if (this.checkEnd()) return move;

    if (!skipRefresh) this.refreshBoard();
    return move;
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
    var self = this;
    var options = { buttons: ['YES', 'NO'] };
    new PopupDlg(this.gameDiv, 'Do you really want to resign?', 'Confirm', options, function (options) {
        if (options.choice !== 0) return;
        self.game.playOneMove('resi');
        self.computeScore();
        self.checkEnd();
    });
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
    this.board.setCurrentColor(this.game.curColor);
    var playerName = Grid.colorName(this.game.curColor);
    return '(' + playerName + '\'s turn)';
};

Ui.prototype.letNextPlayerPlay = function (skipRefresh) {
    if (this.playerIsAi[this.game.curColor]) {
        this.letAiPlay(skipRefresh);
    } else {
        if (!skipRefresh) this.message(' ' + this.whoPlaysNow(), true);
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

window.addEventListener('beforeunload', function () {
    userPref.close();
});


//--- DEV UI

Ui.prototype.initDev = function () {
    this.inDevMode = userPref.getValue('devMode', false);
    this.debugHeuristic = null;
    this.inEvalMode = false;
    this.devKeys = '';
};

Ui.prototype.onDevKey = function (key) {
    this.devKeys = this.devKeys.slice(-9) + key;
    if (this.devKeys.slice(-2) === 'db') {
        this.inDevMode = !this.inDevMode;
        userPref.setValue('devMode', this.inDevMode);
        return this.toggleControls();
    }
    if (this.devKeys.slice(-2) === '0g') {
        // TODO: WIP OGS
        main.gtp = gtp;
        gtp.init(new UiGtpEngine(this));
        this.ogsApi = ogsApi;
        return ogsApi.init();
    }
};

Ui.prototype.devMessage = function (html, append) {
    if (append) html = this.devOutput.html() + html;
    this.devOutput.setHtml(html);
};

Ui.prototype.setEvalMode = function (enabled) {
    if (enabled === this.inEvalMode) return;
    this.inEvalMode = enabled;
    this.controls.setEnabled('ALL', !this.inEvalMode, ['evalMode','undo','next','pass', 'heuristicTest']);
    this.controls.get('evalMode').toggleClass('toggled', enabled);
};

Ui.prototype.evalMove = function (move) {
    var player = this.getAiPlayer(this.game.curColor);
    this.showAiMoveData(player, move, /*isTest=*/true);
};

Ui.prototype.scoreTest = function () {
    var score = this.scorer.computeScore(this.game.goban, this.game.komi);
    this.message(score);
    this.board.showSpecial('scoring', this.scorer.getScoringGrid().yx);
};

Ui.prototype.territoryTest = function () {
    this.board.showSpecial('territory', this.getAiPlayer(this.game.curColor).guessTerritories());
};

Ui.prototype.heuristicTest = function (name) {
    this.debugHeuristic = name === NO_HEURISTIC ? null : name;

    this.getAiPlayer(BLACK).setDebugHeuristic(this.debugHeuristic);
    this.getAiPlayer(WHITE).setDebugHeuristic(this.debugHeuristic);

    this.refreshBoard();
};

Ui.prototype.influenceTest = function (color) {
    var infl = this.getAiPlayer(1 - this.game.curColor).infl;
    // This could be AiPlayer's job to return us a grid ready for display
    var yx = new Grid(this.gsize).yx; // TODO: covert infl to 2 grids one day?
    for (var j = 1; j <= this.gsize; j++) {
        for (var i = 1; i <= this.gsize; i++) {
            yx[j][i] = infl[j][i][color];
        }
    }
    this.board.showSpecial('value', yx);
};

Ui.prototype.devDisplay = function () {
    this.evalTestDropdown.select(NO_EVAL_TEST);
    if (!this.debugHeuristic || !this.lastAiPlayer) return;
    var heuristic = this.lastAiPlayer.getHeuristic(this.debugHeuristic);
    // Erase previous values (heuristics don't care about old values)
    // This could be AiPlayer's job to return us a grid ready for display
    var stateYx = this.lastAiPlayer.stateGrid.yx, scoreYx = heuristic.scoreGrid.yx;
    for (var j = this.gsize; j >= 1; j--) {
        for (var i = this.gsize; i >= 1; i--) {
            if (stateYx[j][i] < sOK) scoreYx[j][i] = 0;
        }
    }
    this.board.showSpecial('value', scoreYx);
};

var heuristics = [
    NO_HEURISTIC,
    'NoEasyPrisoner',
    'Hunter',
    'Savior',
    'Connector',
    'Spacer',
    'Pusher',
    'Shaper'
];

var evalTests = [
    NO_EVAL_TEST,
    'Score',
    'Territory',
    'Influence B',
    'Influence W'
];

Ui.prototype.createDevControls = function () {
    var self = this;
    var devDiv = this.gameDiv.newDiv('#devDiv');
    var devCtrls = devDiv.newDiv('devControls');

    Dome.newButton(devCtrls, '#evalMode', 'Eval mode', function () { self.setEvalMode(!self.inEvalMode); });

    var col2 = devCtrls.newDiv('col2');
    Dome.newCheckbox(col2, 'debug', 'Debug').on('change', function () {
        main.debug = this.isChecked();
        main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    });

    Dome.newLink(col2, 'emailGame', 'Email game',
        'mailto:kubicle@yahoo.com?subject=' + main.appName + '%20game' +
        '&body=' + this.game.historyString());

    this.evalTestDropdown = Dome.newDropdown(col2, '#evalTest', evalTests, null, '');
    this.evalTestDropdown.on('change', function () {
        switch (this.value()) {
        case NO_EVAL_TEST: return self.refreshBoard();
        case 'Score': return self.scoreTest();
        case 'Territory': return self.territoryTest();
        case 'Influence B': return self.influenceTest(BLACK);
        case 'Influence W': return self.influenceTest(WHITE);
        }
    });
    Dome.newDropdown(col2, '#heuristicTest', heuristics, null, '').on('change', function () {
        self.heuristicTest(this.value());
    });

    this.devOutput = devDiv.newDiv('logBox devLogBox');
};

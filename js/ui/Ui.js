'use strict';

var main = require('../main');

var Board = require('./Board');
var Dome = require('./Dome');
var GameLogic = require('../GameLogic');
var Grid = require('../Grid');
var Gtp = require('../net/Gtp');
var Logger = require('../Logger');
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
    this.createDevControls();

    // width adjustments
    var width = this.game.goban.gsize + 2; // width in stones
    this.boardWidth = isCompact ? width * 28 : Math.min(width * 60 + 10, viewportWidth - 15);

    var self = this;
    this.board = new Board();
    this.board.setTapHandler(function (move) {
        if (move[0] === '!') return self.onDevKey(move.substr(1));
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
    var gameInfo = this.getPlayerDesc(WHITE) + ' VS ' + this.getPlayerDesc(BLACK) + ' (B)';
    gameInfo += ', komi:' + this.game.komi;
    this.gameInfoElt.setText(gameInfo);
};

Ui.prototype.showLastMove = function () {
    var moves = this.game.history;
    if (moves.length) {
        this.lastMoveElt.setMove(moves[moves.length - 1], 1 - this.game.curColor);
    } else {
        this.lastMoveElt.setMove(null);
    }
    this.showNextPlayer();
    this.shortMessage.setText('');
};

Ui.prototype.showNextPlayer = function (move) {
    if (move === null) return this.nextPlayerElt.setMove(null);
    this.nextPlayerElt.setMove(move || '', this.game.curColor);
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
    if (!inGame) this.setEvalMode(false);

    this.statusBar.setVisible(!ended);
    this.reviewControls.setVisible(['review'], inGame || inReview);
    this.reviewControls.setVisible(['back1', 'back10', 'forw1', 'forw10'], inReview);
    this.controls.setVisible(['accept', 'refuse'], ending);
    this.controls.setVisible(['undo'], inGame);
    this.controls.setVisible(['pass', 'resi'], inGame && !auto);
    this.controls.setVisible(['next', 'next10', 'nextAll', 'aiVsAiFlags'], inGame && auto);
    this.controls.setVisible(['newg'], ended && !this.isCompactLayout);

    // Dev controls
    this.controls.setVisible(['devDiv'], this.inDevMode && (inGame || inReview));
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

Ui.prototype.getPlayerDesc = function (color) {
    if (!this.playerIsAi[color]) {
        return 'human'; //TODO store names from SGF or outside world
    }
    var ai = this.players[color];
    return ai.publicName + '-' + ai.publicVersion;
};

Ui.prototype.initDisplay = function () {
    this.showGameInfo();
    this.showLastMove();
    this.showNextPlayer();
    this.toggleControls();
    this.refreshBoard();
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

    var options = this.isCompactLayout ? undefined : { background: 'wood' };

    this.board.create(this.boardElt, this.boardWidth, this.game.goban, options);
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
    var msgs = this.scorer.computeScoreAsTexts(this.game.goban, this.game.komi, this.game.whoResigned);
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

window.addEventListener('beforeunload', function () {
    userPref.close();
});

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
    var move = cur > 0 ? moves[cur - 1] : null;
    if (this.inEvalMode && move && move.length <= 3) {
        this.game.playOneMove('half_undo');
        this.showDevData(move, null, true);
        this.game.playOneMove(move);
    }
};


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
        // TODO: WIP
        var gtp = main.gtp = new Gtp();
        return gtp.init(new UiGtpEngine(this));
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

Ui.prototype.showDevData = function (move, aiPlayer, isTest) {
    aiPlayer = aiPlayer || this.getAiPlayer(this.game.curColor);
    var txt = aiPlayer.getMoveSurveyText(move, isTest);
    txt = txt.replace(/\n/g, '<br>');
    if (aiPlayer.numRandomPicks - this.prevNumRandomPicks === 1) txt = '#RANDOM ' + txt;
    this.devMessage(txt);

    this.updateGameLink();
};

Ui.prototype.scoreTest = function () {
    this.computeScore();
    this.longMessage(this.scoreMsg);
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
    this.board.showSpecial('value', infl[color]);
};

Ui.prototype.totalEvalTest = function (color) {
    var score = this.getAiPlayer(color).scoreGrid.yx;
    this.board.showSpecial('value', score);
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
    'GroupAnalyser',
    'NoEasyPrisoner',
    'Hunter',
    'Savior',
    'Connector',
    'Spacer',
    'Pusher',
    'Shaper'
];

var evalTests = [
    [NO_EVAL_TEST, Ui.prototype.refreshBoard],
    ['Score', Ui.prototype.scoreTest],
    ['Territory', Ui.prototype.territoryTest],
    ['Influence B', function () { this.influenceTest(BLACK); }],
    ['Influence W', function () { this.influenceTest(WHITE); }],
    ['Total', Ui.prototype.totalEvalTest]
];

Ui.prototype.updateGameLink = function () {
    this.devGameLink.setAttribute('href', 'mailto:kubicle@yahoo.com?subject=' + main.appName + '%20game' +
        '&body=' + this.game.historyString());
};

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

    this.devGameLink = Dome.newLink(col2, 'emailGame', 'Game link');
    this.updateGameLink();

    var tests = [], values = [];
    for (var i = 0; i < evalTests.length; i++) { tests.push(evalTests[i][0]); values.push(i); }
    this.evalTestDropdown = Dome.newDropdown(col2, '#evalTest', tests, values, '');
    this.evalTestDropdown.on('change', function () {
        var fn = evalTests[this.value()][1];
        fn.call(self, self.game.curColor);
    });
    Dome.newDropdown(col2, '#heuristicTest', heuristics, null, '').on('change', function () {
        self.heuristicTest(this.value());
    });

    this.devOutput = devDiv.newDiv('logBox devLogBox');
};

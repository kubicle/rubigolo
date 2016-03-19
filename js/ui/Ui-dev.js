'use strict';

var Ui = require('./Ui'); // we add methods to Ui class here

var CONST = require('../constants');
var main = require('../main');

var Dome = require('./Dome');
var Gtp = require('../net/Gtp');
var Logger = require('../Logger');
var UiGtpEngine = require('../net/UiGtpEngine');
var userPref = require('../userPreferences');

var WHITE = CONST.WHITE, BLACK = CONST.BLACK, EMPTY = CONST.EMPTY;
var sOK = CONST.sOK, ODD = CONST.ODD, EVEN = CONST.EVEN;

var NO_HEURISTIC = '(heuristic)';


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

    this._updateGameLink();
};

Ui.prototype.afterReplay = function (move) {
    this.game.playOneMove('half_undo');
    this.showDevData(move, null, true);
    this.game.playOneMove(move);
};

Ui.prototype.scoreTest = function () {
    this.computeScore();
    this.longMessage(this.scoreMsg);
    this.board.showSpecial('scoring', this.scorer.getScoringGrid().yx);
};

Ui.prototype.territoryTest = function (aiColor) {
    this.board.showSpecial('territory', this.getAiPlayer(aiColor).guessTerritories());
};

Ui.prototype.influenceTest = function (aiColor, color) {
    var infl = this.getAiPlayer(aiColor).getHeuristic('Influence').infl;
    this.board.setValueFormat(0, 1);
    this.board.showSpecial('value', infl[color]);
};

Ui.prototype.eyesTest = function (aiColor, oddOrEven) {
    var shaper = this.getAiPlayer(aiColor).getHeuristic('Shaper');
    var yx = shaper.potEyeGrids[oddOrEven].yx;
    this.board.setValueFormat(0, 1, EMPTY);
    this.board.showSpecial('value', yx);
};

Ui.prototype.totalEvalTest = function (aiColor) {
    var score = this.getAiPlayer(aiColor).scoreGrid.yx;
    this.board.setValueFormat(1, 1);
    this.board.showSpecial('value', score);
};

var heuristics = [
    NO_HEURISTIC,
    'GroupAnalyser',
    'NoEasyPrisoner',
    'Savior',
    'Hunter',
    'Connector',
    'Spacer',
    'Pusher',
    'Shaper',
    'MoveInfo'
];

var evalTests = [
    ['(other eval)', Ui.prototype.refreshBoard],
    ['Score', Ui.prototype.scoreTest],
    ['Territory', Ui.prototype.territoryTest],
    ['Influence B', function (aiColor) { this.influenceTest(aiColor, BLACK); }],
    ['Influence W', function (aiColor) { this.influenceTest(aiColor, WHITE); }],
    ['Potential eyes EVEN', function (aiColor) { this.eyesTest(aiColor, EVEN); }],
    ['Potential eyes ODD', function (aiColor) { this.eyesTest(aiColor, ODD); }],
    ['Total', Ui.prototype.totalEvalTest]
];

Ui.prototype.evalTestHandler = function (name) {
    var evalTest = evalTests[name];
    this.statusMessage('Showing "' + evalTest[0] + '"');
    evalTest[1].call(this, 1 - this.game.curColor);
    this.board.highlightStone(null);
    this.evalTestDropdown.select(0);
};

Ui.prototype.heuristicTestHandler = function (name) {
    this.debugHeuristic = name === NO_HEURISTIC ? null : name;

    this.getAiPlayer(BLACK).setDebugHeuristic(this.debugHeuristic);
    this.getAiPlayer(WHITE).setDebugHeuristic(this.debugHeuristic);

    this.board.setValueFormat(1, 1);
    this.refreshBoard();
};

Ui.prototype.devDisplay = function () {
    this.evalTestDropdown.select(0);
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

Ui.prototype._updateGameLink = function () {
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
    this._updateGameLink();

    var tests = [], values = [];
    for (var i = 0; i < evalTests.length; i++) { tests.push(evalTests[i][0]); values.push(i); }
    this.evalTestDropdown = Dome.newDropdown(col2, '#evalTest', tests, values, '');
    this.evalTestDropdown.on('change', function () {
        self.evalTestHandler(this.value());
    });
    Dome.newDropdown(col2, '#heuristicTest', heuristics, null, '').on('change', function () {
        self.heuristicTestHandler(this.value());
    });

    this.devOutput = devDiv.newDiv('logBox devLogBox');
};

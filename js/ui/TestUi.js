'use strict';

var main = require('../main');
var Dome = require('./Dome');
var Ui = require('./Ui');

var Logger = main.Logger;


function TestUi() {
    main.debug = false;
    main.log.level = Logger.INFO;
    window.testUi = this;
}
module.exports = TestUi;


TestUi.prototype.enableButtons = function (enabled) {
    for (var name in this.ctrl) { this.ctrl[name].disabled = !enabled; }
};

TestUi.prototype.runTest = function (name) {
    this.output.setText('');
    main.debug = this.debug.isChecked();

    var specificClass = name === 'ALL' ? undefined : name;
    if (name === 'ALL' || name === 'TestSpeed') {
        main.debug = false; // dead slow if debug is ON
    }
    main.log.level = main.debug ? Logger.DEBUG : Logger.INFO;
    var self = this;
    var logfn = function (lvl, msg) { return self.logfn(lvl, msg); };

    main.tests.run(logfn, specificClass, this.namePattern.value());

    this.controls.setEnabled('ALL', true);
};

TestUi.prototype.initTest = function (name) {
    this.output.setText('Running unit test "' + name + '"...');
    this.errors.setText('');
    this.gameDiv.clear();
    this.controls.setEnabled('ALL', false);
    var self = this;
    return window.setTimeout(function () { self.runTest(name); }, 50);
};

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= Logger.WARN) this.errors.setHtml(this.errors.html() + msg);
    else if (lvl > Logger.DEBUG) this.output.setHtml(this.output.html() + msg);
    return true; // also log in console
};

TestUi.prototype.newButton = function (name, label) {
    var self = this;
    Dome.newButton(this.controlElt, '#' + name, label, function () { self.initTest(name); });
};

TestUi.prototype.createControls = function (parentDiv) {
    this.controls = Dome.newGroup();
    this.controlElt = parentDiv.newDiv('controls');
    this.newButton('ALL', 'Test All');
    this.newButton('TestSpeed', 'Speed');
    this.newButton('TestBreeder', 'Breeder');
    this.newButton('TestBoardAnalyser', 'Scoring');
    this.newButton('TestPotentialTerritory', 'Territory');
    this.newButton('TestAi', 'AI');
};

TestUi.prototype.createUi = function () {
    var testDiv = Dome.newDiv(document.body, 'testUi');
    this.gameDiv = Dome.newDiv(document.body, 'gameDiv');
    testDiv.newDiv('pageTitle').setText('Rubigolo - Tests');
    this.createControls(testDiv);
    this.namePattern = Dome.newInput(testDiv, 'namePattern', 'Test name pattern:');
    this.debug = Dome.newCheckbox(testDiv, 'debug', 'Debug');
    testDiv.newDiv('subTitle').setText('Result');
    this.output = testDiv.newDiv('logBox testOutputBox');
    testDiv.newDiv('subTitle').setText('Errors');
    this.errors = testDiv.newDiv('logBox testErrorBox');
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.loadFromTest(this.gameDiv, title, msg);
};

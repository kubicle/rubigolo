'use strict';

var main = require('../main');
var Dome = require('./Dome');
var Ui = require('./Ui');

var Logger = main.Logger;


function TestUi() {
    this.controls = Dome.newGroup();
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

    var specificClass;
    if (name === 'TestAll' || name === 'TestSpeed') {
        main.debug = false;
        main.log.level = Logger.INFO;
    } else {
        specificClass = name;
    }
    var self = this;
    main.tests.run(function (lvl, msg) { return self.logfn(lvl, msg); }, specificClass);
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

//TODO: checkbox to toggle debug logs
// main.debug = true;
// main.log.level = Logger.DEBUG;

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= Logger.WARN) this.errors.setHtml(this.errors.html() + msg);
    else if (lvl > Logger.DEBUG) this.output.setHtml(this.output.html() + msg);
    return true; // also log in console
};

TestUi.prototype.createUi = function () {
    var testDiv = Dome.newDiv(document.body, 'testUi');
    testDiv.newDiv('pageTitle').setText('Rubigolo - Tests');
    this.controlElt = testDiv.newDiv('controls');
    testDiv.newDiv('subTitle').setText('Result');
    this.output = testDiv.newDiv('logBox testOutputBox');
    testDiv.newDiv('subTitle').setText('Errors');
    this.errors = testDiv.newDiv('logBox testErrorBox');
    this.gameDiv = testDiv.newDiv('gameDiv');

    this.createControls();
};

TestUi.prototype.createControls = function () {
    this.newButton('TestAll', 'Test All');
    this.newButton('TestSpeed', 'Speed');
    this.newButton('TestBoardAnalyser', 'Scoring');
    this.newButton('TestPotentialTerritory', 'Territory');
    this.newButton('TestAi', 'AI');
};

TestUi.prototype.newButton = function (name, label) {
    var self = this;
    Dome.newButton(this.controlElt, '#' + name, label, function () { self.initTest(name); });
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.loadFromTest(this.gameDiv, title, msg);
};

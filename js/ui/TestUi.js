'use strict';

var main = require('../main');
var Dome = require('./Dome');
var log = require('../log');
var pref = require('../localPref');
var Ui = require('./Ui');


function TestUi() {
    main.debug = false;
    log.setLevel(log.INFO);
    main.testUi = this;
}
module.exports = TestUi;


TestUi.prototype.enableButtons = function (enabled) {
    for (var name in this.ctrl) { this.ctrl[name].disabled = !enabled; }
};

TestUi.prototype.runTest = function (name, pattern) {
    main.defaultAi = main.ais[this.defaultAi.value()];

    main.debug = this.debug.isChecked();
    // Remove debug flag for ALL and Speed test
    if (name === 'ALL' || name === 'TestSpeed') main.debug = false;

    var specificClass = name;
    if (name === 'ALL' || name === 'FILTER') specificClass = undefined;

    log.setLevel(main.debug ? log.DEBUG : log.INFO);
    log.setLogFunc(this.logfn.bind(this));

    var numIssues = main.tests.run(specificClass, pattern);
    if (numIssues) this.logfn(log.INFO, '\n*** ' + numIssues + ' ISSUE' + (numIssues !== 1 ? 'S' : '') + ' - See below ***');

    this.output.scrollToBottom();
    this.errors.scrollToBottom();
    this.controls.setEnabled('ALL', true);
};

TestUi.prototype.initTest = function (name) {
    var pattern = name === 'FILTER' ? this.namePattern.value() : undefined;
    var desc = pattern ? '*' + pattern + '*' : name;

    this.output.setHtml('Running "' + desc + '"...<br>');
    this.errors.setText('');
    this.gameDiv.clear();
    this.controls.setEnabled('ALL', false);
    var self = this;
    window.setTimeout(function () { self.runTest(name, pattern); }, 50);
};

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= log.WARN) this.errors.setHtml(this.errors.html() + msg);
    else if (lvl > log.DEBUG) this.output.setHtml(this.output.html() + msg);
    return true; // also log in console
};

TestUi.prototype.newButton = function (parent, name, label) {
    Dome.newButton(parent, '#' + name, label, this.initTest.bind(this, name));
};

TestUi.prototype.createControls = function (parentDiv) {
    this.controls = Dome.newGroup();
    var div = parentDiv.newDiv('controls');
    this.newButton(div, 'ALL', 'Test All');
    this.newButton(div, 'TestSpeed', 'Speed');
    this.newButton(div, 'TestBreeder', 'Breeder');
    this.newButton(div, 'TestBoardAnalyser', 'Scoring');
    this.newButton(div, 'TestPotentialTerritory', 'Territory');
    this.newButton(div, 'TestAi', 'AI');
};

TestUi.prototype.createUi = function () {
    window.addEventListener('beforeunload', this.beforeUnload.bind(this));

    var title = main.appName + ' - Tests';
    Dome.setPageTitle(title);
    var testDiv = Dome.newDiv(document.body, 'testUi');
    this.gameDiv = Dome.newDiv(document.body, 'gameDiv');
    testDiv.newDiv('pageTitle').setText(title);
    this.createControls(testDiv);

    var div1 = testDiv.newDiv();
    Dome.newLabel(div1, 'inputLbl', 'Default AI:');
    this.defaultAi = Dome.newDropdown(div1, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    this.debug = Dome.newCheckbox(div1, 'debug', 'Debug');

    var div2 = testDiv.newDiv('patternDiv');
    this.namePattern = Dome.newInput(div2, 'namePattern', 'Filter:', pref.getValue('testNamePattern'));
    this.newButton(div2, 'FILTER', 'Run');
    
    testDiv.newDiv('subTitle').setText('Result');
    this.output = testDiv.newDiv('logBox testOutputBox');
    testDiv.newDiv('subTitle').setText('Errors');
    this.errors = testDiv.newDiv('logBox testErrorBox');
};

TestUi.prototype.saveTestPreferences = function () {
    pref.setValue('testNamePattern', this.namePattern.value());
};

TestUi.prototype.beforeUnload = function () {
    this.saveTestPreferences();
    pref.terminate();
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.inDevMode = true;
    ui.loadFromTest(this.gameDiv, title, msg);
};

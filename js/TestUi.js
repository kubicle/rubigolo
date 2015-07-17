'use strict';

var main = require('./main');
var Ui = require('./Ui');

var Logger = main.Logger;


function TestUi() {
    this.ctrl = {};
    main.debug = false;
    main.log.level = Logger.INFO;
    window.testUi = this;
}
module.exports = TestUi;


TestUi.prototype.enableButtons = function (enabled) {
    for (var name in this.ctrl) { this.ctrl[name].disabled = !enabled; }
};

TestUi.prototype.runTest = function (name) {
    this.output.textContent = '';

    var specificClass;
    if (name === 'TestAll' || name === 'TestSpeed') {
        main.debug = false;
        main.log.level = Logger.INFO;
    } else {
        specificClass = name;
    }
    var self = this;
    main.tests.run(function (lvl, msg) { return self.logfn(lvl, msg); }, specificClass);
    this.enableButtons(true);
};

TestUi.prototype.initTest = function (name) {
    this.output.textContent = 'Running unit test "' + name + '"...';
    this.errors.textContent = '';
    this.gameDiv.innerHTML = '';
    this.enableButtons(false);
    var self = this;
    return window.setTimeout(function () { self.runTest(name); }, 50);
};

TestUi.prototype.newButton = function (name, label) {
    var btn = this.ctrl[name] = document.createElement('button');
    btn.className = 'testButton';
    btn.innerText = label;
    var self = this;
    btn.addEventListener('click', function () { self.initTest(name); });
    this.controlElt.appendChild(btn);
};

TestUi.prototype.logfn = function (lvl, msg) {
    msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
    if (lvl >= Logger.WARN) this.errors.innerHTML += msg;
    else if (lvl > Logger.DEBUG) this.output.innerHTML += msg;
    return true; // also log in console
};

TestUi.prototype.createControls = function () {
    this.newButton('TestAll', 'Test All');
    this.newButton('TestSpeed', 'Speed');
    this.newButton('TestBoardAnalyser', 'Scoring');
    this.newButton('TestPotentialTerritory', 'Territory');
    this.newButton('TestAi', 'AI');
};

function newElement(parent, type, className) {
    var elt = parent.appendChild(document.createElement(type));
    if (className) elt.className = className;
    return elt;
}

TestUi.prototype.createUi = function () {
    newElement(document.body, 'h1', 'pageTitle').textContent = 'Rubigolo - Tests';
    var testDiv = newElement(document.body, 'div', 'testUi');
    this.controlElt = newElement(testDiv, 'div', 'controls');
    newElement(testDiv, 'h2').textContent = 'Result';
    this.output = newElement(testDiv, 'div', 'logBox testOutputBox');
    newElement(testDiv, 'h2').textContent = 'Errors';
    this.errors = newElement(testDiv, 'div', 'logBox testErrorBox');
    this.gameDiv = newElement(testDiv, 'div');

    this.createControls();
};

TestUi.prototype.showTestGame = function (title, msg, game) {
    var ui = new Ui(game);
    ui.loadFromTest(this.gameDiv, title, msg);
};

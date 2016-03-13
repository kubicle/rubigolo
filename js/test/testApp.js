// Browser application

'use strict';

// First we define "main" on which global things attach
var main = require('../main');
window.main = main; // just for helping console debugging

var TestSeries = require('./TestSeries');
var addAllTests = require('./TestAll');

var ais = [
    { name: 'Frankie', constr: require('../ai/frankie') },
    { name: 'Droopy',  constr: require('../ai/droopy') },
    { name: 'Chuckie', constr: require('../ai/chuckie') }
];

main.initAis(ais);

//--- Main UI in dev mode or Tests UI

require('../ui/style.less');
require('../ui/Ui-dev');

var ui;
if (window.testApp) {
    main.initTests(TestSeries, addAllTests);

    var TestUi = require('../ui/TestUi');
    ui = new TestUi();
} else {
    var Ui = require('../ui/Ui');
    ui = new Ui();
}
main.ui = ui;

ui.createUi();

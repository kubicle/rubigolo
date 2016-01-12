// Browser application

'use strict';

// First we define "main" on which global things attach
var main = require('./main');
window.main = main; // just for helping console debugging

main.initAis();

//--- UI (main or test)

require('./ui/style.less');

var ui;
if (window.testApp) {
    main.initTests();

    var TestUi = require('./ui/TestUi');
    ui = new TestUi();
} else {
    var Ui = require('./ui/Ui');
    ui = new Ui();
}
main.ui = ui;

ui.createUi();

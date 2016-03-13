// Browser application

'use strict';

var main = require('./main');

var ais = [
    { name: 'Chuckie', constr: require('./ai/chuckie') }
];

main.initAis(ais);

require('./ui/style.less');

var Ui = require('./ui/Ui');
var ui = new Ui();

ui.createUi();

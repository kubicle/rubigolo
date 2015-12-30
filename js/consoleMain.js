'use strict';

require('./app');

var main = require('./main');
var gtp = require('./net/gtp');
var GtpEngine = require('./net/GtpEngine');
var Logger = require('./Logger');
var readline = require('readline');


function run() {
    // NB: any unexpected log on stdout will break GTP
    main.log.level = Logger.ERROR;

    gtp.init(new GtpEngine());

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', function (line) {
        gtp.runCommand(line);
    });

    gtp.on('quit', function () {
        rl.close();
    });
}

run();

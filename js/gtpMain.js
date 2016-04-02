'use strict';

var main = require('./main');

var Gtp = require('./net/Gtp');
var GtpEngine = require('./net/GtpEngine');
var Logger = require('./Logger');
var readline = require('readline');

var ais = [
    { name: 'Chuckie', constr: require('./ai/chuckie') }
];

var rulesName = 'CGOS'; // can be changed using command line, see below


function parseArgs() {
    var args = process.argv;
    for (var n = 2; n < args.length; n++) {
        var arg = args[n];
        if (arg.startsWith('--rules=')) {
            rulesName = arg.substr(8);
        } else {
            console.error('Invalid argument:', arg);
            process.exit(-1);
        }
    }
}

function run() {
    parseArgs();

    // NB: any unexpected log on stdout will break GTP
    main.log.level = Logger.ERROR;
    main.initAis(ais);

    var gtpEngine = new GtpEngine();
    gtpEngine.setRules(rulesName);

    var gtp = new Gtp();
    gtp.init(gtpEngine);

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

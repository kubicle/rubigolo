'use strict';

var Connector = require('./Connector');
var Hunter = require('./Hunter');
var Influence = require('./Influence');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var Pusher = require('./Pusher');
var Savior = require('./Savior');
var Shaper = require('./Shaper');
var Spacer = require('./Spacer');


var allHeuristics = function () {
    return [
        Influence,
        NoEasyPrisoner,
        Hunter,
        Savior,
        Connector,
        Spacer,
        Pusher,
        Shaper
    ];
};
module.exports = allHeuristics;

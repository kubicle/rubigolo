'use strict';

var Connector = require('./Connector');
var GroupAnalyser = require('./GroupAnalyser');
var GroupsAndVoids = require('./GroupsAndVoids');
var Hunter = require('./Hunter');
var Influence = require('./Influence');
var NoEasyPrisoner = require('./NoEasyPrisoner');
var PotentialEyes = require('./PotentialEyes');
var PotentialTerritory = require('./PotentialTerritory');
var Pusher = require('./Pusher');
var Savior = require('./Savior');
var Shaper = require('./Shaper');
var Spacer = require('./Spacer');


var allHeuristics = function () {
    return [
        PotentialTerritory,
        GroupsAndVoids,
        Influence,
        PotentialEyes,
        GroupAnalyser,
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

//Translated from all_heuristics.rb using babyruby2js
'use strict';

// When creating a new heuristic, remember to add it here.
var Spacer = require('./Spacer');
var Executioner = require('./Executioner');
var Savior = require('./Savior');
var Hunter = require('./Hunter');
var Connector = require('./Connector');
var Pusher = require('./Pusher');
var NoEasyPrisoner = require('./NoEasyPrisoner');

var allHeuristics = function () {
    return [Executioner, Savior, Hunter, Connector, Spacer, Pusher, NoEasyPrisoner];
};
module.exports = allHeuristics;

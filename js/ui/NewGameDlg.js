'use strict';

var Dome = require('./Dome');
var main = require('../main');


function NewGameDlg(options, cb) {
    var dialog = Dome.newDiv(document.body, 'newGameBackground');
    var frame = dialog.newDiv('newGameDialog dialog');
    frame.newDiv('dialogTitle').setText('Start a new game');
    var form = new Dome(frame, 'form').setAttribute('action',' ');

    var sizeBox = form.newDiv();
    Dome.newLabel(sizeBox, 'inputLbl', 'Size:');
    var sizeElt = Dome.newRadio(sizeBox, 'size', [5,7,9,13,19], null, options.gsize);

    Dome.newLabel(form, 'inputLbl', 'Handicap:');
    var handicap = Dome.newDropdown(form, 'handicap', [0,2,3,4,5,6,7,8,9], null, options.handicap);

    var aiColorBox = form.newDiv();
    Dome.newLabel(aiColorBox, 'inputLbl', 'AI plays:');
    var aiColor = Dome.newRadio(aiColorBox, 'aiColor', ['white', 'black', 'both', 'none'], null, options.aiPlays);

    var moves = Dome.newInput(form, 'moves', 'Moves to load:');

    var defAiDiv = form.newDiv();
    Dome.newLabel(defAiDiv, 'inputLbl', 'Default AI:');
    var defaultAi = Dome.newDropdown(defAiDiv, 'defaultAi', Object.keys(main.ais), null, main.defaultAi.name);
    Dome.newLabel(defAiDiv, 'defAiInfo', 'Black AI uses default AI; White always uses latest AI version.');

    var okBtn = Dome.newButton(form.newDiv('btnDiv'), 'start', 'OK', function (ev) {
        ev.preventDefault();
        options.gsize = ~~Dome.getRadioValue(sizeElt);
        options.handicap = ~~handicap.value();
        options.aiPlays = Dome.getRadioValue(aiColor);
        options.moves = moves.value();
        main.defaultAi = main.ais[defaultAi.value()];
        Dome.removeChild(document.body, dialog);
        cb(options);
    });
    okBtn.setAttribute('type','submit');
}
module.exports = NewGameDlg;

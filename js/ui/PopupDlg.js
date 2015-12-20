'use strict';

var Dome = require('./Dome');


function action() {
    var dlg = this.dlg;
    if (dlg.options) dlg.options.choice = this.id;
    Dome.removeChild(document.body, dlg.dialogRoot);
    if (dlg.validateFn) dlg.validateFn(dlg.options);
}

function newButton(div, dlg, label, id) {
    var btn = Dome.newButton(div, 'popupDlg', label, action);
    btn.dlg = dlg;
    btn.id = id;
}

function PopupDlg(msg, title, options, validateFn) {
    this.options = options;
    this.validateFn = validateFn;

    this.dialogRoot = Dome.newDiv(document.body, 'popupBackground');
    var dialog = this.dialogRoot.newDiv('popupDlg dialog');
    dialog.newDiv('dialogTitle').setText(title || 'Problem');

    var content = dialog.newDiv('content');
    Dome.newLabel(content, 'message', msg);

    var btns = (options && options.buttons) || ['OK'];
    var btnDiv = dialog.newDiv('btnDiv');
    for (var i = 0; i < btns.length; i++) {
        newButton(btnDiv, this, btns[i], i);
    }
}
module.exports = PopupDlg;

'use strict';

var curGroup = null;


function Dome(parent, type, className, name) {
    this.type = type;
    if (parent instanceof Dome) parent = parent.elt;
    var elt = this.elt = parent.appendChild(document.createElement(type));
    if (name && name[0] === '#') {
        // name starts with # so remove it from className and add this to current group
        className = className.substr(1);
        curGroup.add(name.substr(1), this);
    }
    if (className) elt.className = className;
}
module.exports = Dome;

Dome.deleteChild = function (parent, dome) {
    if (parent instanceof Dome) parent = parent.elt;
    parent.removeChild(dome.elt);
};

Dome.prototype.clear = function () { this.elt.innerHTML = ''; };
Dome.prototype.setText = function (text) { this.elt.textContent = text; return this; };
Dome.prototype.setHtml = function (html) { this.elt.innerHTML = html; return this; };
Dome.prototype.setAttribute = function (name, val) { this.elt.setAttribute(name, val); return this; };
Dome.prototype.setEnabled = function (enable) { this.elt.disabled = !enable; return this; };
Dome.prototype.setVisible = function (show) { this.elt.hidden = !show; return this; };

Dome.prototype.text = function () { return this.elt.textContent; };
Dome.prototype.html = function () { return this.elt.innerHTML; };
Dome.prototype.value = function () { return this.elt.value; };

Dome.prototype.toggleClass = function (className, enable) {
    var elt = this.elt;
    var classes = elt.className.split(' ');
    var ndx = classes.indexOf(className);
    if (enable) {
        if (ndx >= 0) return;
        elt.className += ' ' + className;
    } else {
        if (ndx < 0) return;
        classes.splice(ndx, 1);
        elt.className = classes.join(' ');
    }
};

Dome.newDiv = function (parent, className) {
    return new Dome(parent, 'div', className);
};
// object like helper for newDiv
Dome.prototype.newDiv = function (className) { return new Dome(this, 'div', className); };

Dome.newButton = function (parent, name, label, action) {
    var button = new Dome(parent, 'button', name + 'Button', name);
    var btn = button.elt;
    btn.innerText = label;
    btn.addEventListener('click', action);
    return button;
};

/** A label is a span = helps to write text on the left of an element */
Dome.newLabel = function (parent, name, label) {
    return new Dome(parent, 'span', name + 'Label', name).setText(label);
};

Dome.newInput = function (parent, name, label, init) {
    Dome.newLabel(parent, name + 'Label input', label + ':', name + 'Label');
    var input = new Dome(parent, 'input', name + 'Input', name);
    if (init !== undefined) input.elt.value = init;
    return input;
};

/** e.g. Dome.newRadio(parent, 'stoneColor', ['white', 'black'], null, 'white') */
Dome.newRadio = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var input = opts[i] = new Dome(parent, 'input', name + 'RadioBtn', name);
        var inp = input.elt;
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;
        var label = new Dome(parent, 'label', name + 'RadioLabel', name).elt;
        label.textContent = labels[i];
        label.setAttribute('for', inp.id);
    }
    return opts;
};

/** @param {array} opts - the array of options returned when you created the radio buttons with newRadio */
Dome.getRadioValue = function (opts) {
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].elt.checked) return opts[i].elt.value;
    }
};


//---Group helpers

function DomeGroup() {
    this.ctrl = {};
}

Dome.newGroup = function () {
    curGroup = new DomeGroup();
    return curGroup;
};

DomeGroup.prototype.add = function (name, dome) { this.ctrl[name] = dome; };
DomeGroup.prototype.get = function (name) { return this.ctrl[name]; };

DomeGroup.prototype.setEnabled = function (names, enabled, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        this.ctrl[names[i]].setEnabled(enabled);
    }
};

DomeGroup.prototype.setVisible = function (names, show, except) {
    if (names === 'ALL') names = Object.keys(this.ctrl);
    for (var i = 0; i < names.length; i++) {
        if (except && except.indexOf(names[i]) !== -1) continue;
        this.ctrl[names[i]].setVisible(show);
    }
};

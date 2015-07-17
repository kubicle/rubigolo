'use strict';

function Dome(parent, type, className) {
    this.type = type;
    if (parent instanceof Dome) parent = parent.elt;
    var elt = this.elt = parent.appendChild(document.createElement(type));
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

Dome.newButton = function (parent, name, label, action) {
    var button = new Dome(parent, 'button', name + 'Button');
    var btn = button.elt;
    btn.innerText = label;
    btn.addEventListener('click', action);
    return button;
};

Dome.newLabel = function (parent, name, label) {
    return new Dome(parent, 'span', name + 'Label').setText(label);
};

Dome.newInput = function (parent, name, label, init) {
    Dome.newLabel(parent, name + 'Label input', label + ':');
    var input = new Dome(parent, 'input', name + 'Input');
    if (init !== undefined) input.elt.value = init;
    return input;
};

Dome.newRadio = function (parent, name, labels, values, init) {
    if (!values) values = labels;
    var opts = [];
    for (var i = 0; i < labels.length; i++) {
        var input = opts[i] = new Dome(parent, 'input', name + 'RadioBtn');
        var inp = input.elt;
        inp.type = 'radio';
        inp.name = name;
        inp.value = values[i];
        inp.id = name + 'Radio' + values[i];
        if (values[i] === init) inp.checked = true;
        var label = new Dome(parent, 'label', name + 'RadioLabel').elt;
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

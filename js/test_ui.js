'use strict';

var main = window.main;
var Logger = main.Logger;

var controls = document.getElementById('controls');
var output = document.getElementById('output');
var errors = document.getElementById('errors');

var ctrl = {};

function enableButtons(enabled) {
  for (var name in ctrl) { ctrl[name].disabled = !enabled; }
}

function runTest(name) {
  output.textContent = '';

  var specificClass;
  if (name !== 'TestAll' && name !== 'TestSpeed') {
    specificClass = name;
    main.debug = true;
    main.log.level = Logger.DEBUG;
  } else {
    main.debug = false;
    main.log.level = Logger.INFO;
  }
  main.tests.run(logfn, specificClass);
  enableButtons(true);
}

function initTest(name) {
  output.textContent = 'Running unit test "' + name + '"...';
  errors.textContent = '';
  enableButtons(false);
  return window.setTimeout(function () { runTest(name); }, 50);
}

function newButton(name, label) {
  var btn = ctrl[name] = document.createElement('button');
  btn.className = 'testButton';
  btn.innerText = label;
  btn.addEventListener('click', function () { initTest(name); });
  controls.appendChild(btn);
}

function logfn(lvl, msg) {
  msg = msg.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + '<br>';
  if (lvl >= Logger.WARN) errors.innerHTML += msg;
  else if (lvl > Logger.DEBUG) output.innerHTML += msg;
  return true; // also log in console
}

newButton('TestAll', 'Test All');
newButton('TestSpeed', 'Test Speed');
newButton('TestAi', 'Test AI');

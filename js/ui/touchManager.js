'use strict';

var DISTANCE_THRESHOLD = 10; // px
var MIN_MOVE_DELAY = 50; // ms, how often do we emit a drag event
var HOLD_TIME_THRESHOLD = 300; // how long you must hold before dragging

/**
 * How long you must drag to be a real drag.
 * Under this, the move is considered a slow, undecided tap.
 * This is to prevent mistap when holding & releasing on same spot just long enough to start a drag.
 */
var MIN_DRAG_TIME = 500;

var MOUSE_BTN_MAIN = 0;


function TouchManager() {
    this.startX = this.startY = 0;
    this.holding = this.dragging = false;
    this.target = null;
    this.touchCount = this.startTime = this.lastMoveTime = 0;
}

var tm = module.exports = new TouchManager();


function touchstartHandler(ev) {
    var target = ev.currentTarget;
    tm.touchCount += ev.changedTouches.length;
    if (tm.touchCount > 1) {
        return tm._cancelDrag(target);
    }
    tm._onTouchStart(ev.changedTouches[0], target);
}

function touchendHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    if (tm.touchCount > 0) return console.warn('Extra touchend count?', ev);

    if (tm._onTouchEnd(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchmoveHandler(ev) {
    if (ev.changedTouches.length > 1) return tm._cancelDrag(tm.target);

    if (tm._onTouchMove(ev.changedTouches[0], tm.target)) {
        ev.preventDefault();
    }
}

function touchcancelHandler(ev) {
    tm.touchCount -= ev.changedTouches.length;
    tm._cancelDrag(tm.target);
}

function mousedownHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    tm._onTouchStart(ev, ev.currentTarget);
}

function mouseupHandler(ev) {
    if (ev.button !== MOUSE_BTN_MAIN) return;
    if (tm._onTouchEnd(ev, tm.target)) {
        ev.preventDefault();
    }
}

function mousemoveHandler(ev) {
    if (tm._onTouchMove(ev, tm.target)) {
        ev.preventDefault();
    }
}

TouchManager.prototype._listen = function (target, on) {
    if (on) {
        if (this.target !== null) console.error('Forgot to stop listening on', this.target);
        this.holding = true;
        this.target = target;
        target.addEventListener('touchmove', touchmoveHandler);
        target.addEventListener('touchend', touchendHandler);
        target.addEventListener('touchcancel', touchcancelHandler);
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
    } else {
        if (this.target === null) return console.warn('Not listening anyway');
        this.holding = false;
        this.target = null;
        target.removeEventListener('touchmove', touchmoveHandler);
        target.removeEventListener('touchend', touchendHandler);
        target.removeEventListener('touchcancel', touchcancelHandler);
        document.removeEventListener('mousemove', mousemoveHandler);
        document.removeEventListener('mouseup', mouseupHandler);
    }
};

TouchManager.prototype._onTouchStart = function (ev, target) {
    this._listen(target, true);
    this.holding = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startTime = Date.now();
    var self = this;
    if (this.holdTimeout) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = window.setTimeout(function () {
        self.holdTimeout = null;
        if (self.holding && !self.dragging) self._startDrag(ev, target);
    }, HOLD_TIME_THRESHOLD);
};

TouchManager.prototype._startDrag = function (ev, target) {
    this.dragging = true;
    this.startTime = Date.now();
    target.touchHandlerFn('dragStart', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
};

TouchManager.prototype._cancelDrag = function (target) {
    this.touchCount = 0;
    this._listen(target, false);
    if (this.dragging) {
        this.dragging = false;
        target.touchHandlerFn('dragCancel');
    }
    return true;
};

TouchManager.prototype._onTouchMove = function (ev, target) {
    var now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_DELAY) return true;
    this.lastMoveTime = now;

    if (!this.dragging) {
        if (Math.abs(ev.clientX - this.startX) + Math.abs(ev.clientY - this.startY) < DISTANCE_THRESHOLD) {
            return false;
        }
        if (now - this.startTime < HOLD_TIME_THRESHOLD) {
            this._listen(target, false);
            return false;
        }
        return this._startDrag(ev, target);
    }
    target.touchHandlerFn('drag', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    return true;
};

TouchManager.prototype._onTouchEnd = function (ev, target) {
    // Did we drag long enough?
    if (this.dragging && Date.now() - this.startTime < MIN_DRAG_TIME) {
        return this._cancelDrag(target);
    }

    var eventName = this.dragging ? 'dragEnd' : 'tap';
    target.touchHandlerFn(eventName, ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    this._listen(target, false);
    this.dragging = false;
    return true;
};

/** Starts to listen on given element.
 * @param {dom} elt
 * @param {func} handlerFn - handlerFn(eventName, x, y)
 *    With eventName in: tap, dragStart, drag, dragEnd, dragCancel
 */
TouchManager.prototype.listenOn = function (elt, handlerFn) {
    elt.touchHandlerFn = handlerFn;

    elt.addEventListener('touchstart', touchstartHandler);
    elt.addEventListener('mousedown', mousedownHandler);
};

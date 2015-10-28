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


function TouchManager() {
    this.startX = this.startY = 0;
    this.holding = this.dragging = false;
    this.touchCount = this.startTime = this.lastMoveTime = 0;
    this.multiTouch = false;
}

module.exports = new TouchManager();


TouchManager.prototype.listenOn = function (elt, handlerFn) {
    var self = this;
    elt.touchHandlerFn = handlerFn;

    elt.addEventListener('touchstart', function (e) {
        self.touchCount += e.changedTouches.length;
        if (self.touchCount > 1) {
            self.multiTouch = true;
            return self.cancelDrag(elt);
        }
        self.onTouchStart(e.changedTouches[0], elt);
    });
    elt.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        self.onTouchStart(e, elt);
    });

    elt.addEventListener('touchmove', function (e) {
        if (!self.holding) return; // drag cancelled
        if (e.changedTouches.length > 1) return self.cancelDrag(elt);

        if (self.onTouchMove(e.changedTouches[0], elt)) {
            e.preventDefault();
        }
    });
    elt.addEventListener('mousemove', function (e) {
        if (!self.holding) return; // drag cancelled or mouse button is up
        if (self.onTouchMove(e, elt)) {
            e.preventDefault();
        }
    });

    elt.addEventListener('touchend', function (e) {
        self.touchCount -= e.changedTouches.length;
        if (self.multiTouch) {
            self.multiTouch = self.touchCount > 0; // multiTouch is true until we remove all fingers
            return;
        }
        if (self.onTouchEnd(e.changedTouches[0], elt)) {
            e.preventDefault();
        }
    });
    elt.addEventListener('mouseup', function (e) {
        if (e.button !== 0) return;
        if (self.onTouchEnd(e, elt)) {
            e.preventDefault();
        }
    });

    elt.addEventListener('touchcancel', function (e) {
        self.touchCount -= e.changedTouches.length;
        return self.cancelDrag(elt);
    });
};

TouchManager.prototype.onTouchStart = function (ev, target) {
    this.holding = true;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.startTime = Date.now();
    var self = this;
    if (this.holdTimeout) window.clearTimeout(this.holdTimeout);
    this.holdTimeout = window.setTimeout(function () {
        self.holdTimeout = null;
        if (self.holding && !self.dragging) self.startDrag(ev, target);
    }, HOLD_TIME_THRESHOLD);
};

TouchManager.prototype.startDrag = function (ev, target) {
    this.dragging = true;
    this.startTime = Date.now();
    target.touchHandlerFn('dragStart', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
};

TouchManager.prototype.cancelDrag = function (target) {
    this.holding = false;
    if (this.dragging) {
        this.dragging = false;
        target.touchHandlerFn('dragCancel');
    }
    return true;
};

TouchManager.prototype.onTouchMove = function (ev, target) {
    var now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_DELAY) return true;
    this.lastMoveTime = now;

    if (!this.dragging) {
        if (Math.abs(ev.clientX - this.startX) + Math.abs(ev.clientY - this.startY) < DISTANCE_THRESHOLD) {
            return false;
        }
        if (now - this.startTime < HOLD_TIME_THRESHOLD) {
            this.holding = false;
            return false;
        }
        return this.startDrag(ev, target);
    }
    target.touchHandlerFn('drag', ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    return true;
};

TouchManager.prototype.onTouchEnd = function (ev, target) {
    if (!this.holding) return true; // drag cancelled: swallow the touch end
    // Did we drag long enough?
    if (this.dragging && Date.now() - this.startTime < MIN_DRAG_TIME) return this.cancelDrag(target);

    var eventName = this.dragging ? 'dragEnd' : 'tap';
    target.touchHandlerFn(eventName, ev.pageX - target.offsetLeft, ev.pageY - target.offsetTop);
    this.holding = false;
    this.dragging = false;
    return true;
};

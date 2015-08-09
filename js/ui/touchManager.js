'use strict';

var DISTANCE_THRESHOLD = 10; // px
var MIN_MOVE_DELAY = 100; // ms


function TouchManager() {
    this.startX = this.startY = null;
    this.dragging = false;
    this.touchCount = 0;
    this.multiTouch = false;
}

module.exports = new TouchManager();

TouchManager.prototype.listenOn = function (elt, handlerFn) {
    var self = this;
    var target = {
        elt: elt,
        rect: elt.getBoundingClientRect(),
        handlerFn: handlerFn
    };

    elt.addEventListener('touchstart', function (e) {
        self.touchCount += e.changedTouches.length;
        if (self.touchCount > 1) {
            self.multiTouch = true;
            return self.cancelDrag(target);
        }
        self.onTouchStart(e.changedTouches[0]);
    });
    elt.addEventListener('mousedown', function (e) {
        self.onTouchStart(e);
    });

    elt.addEventListener('touchmove', function (e) {
        if (self.startX === null) return; // drag cancelled
        if (e.changedTouches.length > 1) return self.cancelDrag(target);

        if (self.onTouchMove(e.changedTouches[0], target)) {
            e.preventDefault();
        }
    });
    elt.addEventListener('mousemove', function (e) {
        if (self.startX === null) return; // mouse move without holding button
        if (self.onTouchMove(e, target)) {
            e.preventDefault();
        }
    });

    elt.addEventListener('touchend', function (e) {
        self.touchCount -= e.changedTouches.length;
        if (self.multiTouch) {
            self.multiTouch = self.touchCount > 0; // multiTouch is true until we remove all fingers
            return;
        }
        if (self.onTouchEnd(e.changedTouches[0], target)) {
            e.preventDefault();
        }
    });
    elt.addEventListener('mouseup', function (e) {
        if (self.onTouchEnd(e, target)) {
            e.preventDefault();
        }
    });

    elt.addEventListener('touchcancel', function (e) {
        self.touchCount -= e.changedTouches.length;
        return self.cancelDrag(target);
    });
};

TouchManager.prototype.cancelDrag = function (target) {
    this.startX = null;
    if (this.dragging) {
        this.dragging = false;
        target.handlerFn('dragCancel');
    }
};

TouchManager.prototype.onTouchStart = function (ev) {
    this.startX = ev.clientX;
    this.startY = ev.clientY;
};

TouchManager.prototype.onTouchMove = function (ev, target) {
    var now = Date.now();
    if (now - this.lastMoveTime < MIN_MOVE_DELAY) return true;
    this.lastMoveTime = now;

    var eventName;
    if (!this.dragging) {
        if (Math.abs(ev.clientX - this.startX) + Math.abs(ev.clientY - this.startY) < DISTANCE_THRESHOLD) {
            return false;
        }
        this.dragging = true;
        eventName = 'dragStart';
    } else {
        eventName = 'drag';
    }
    var rect = target.rect;
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    target.handlerFn(eventName, x, y);
    return true;
};

TouchManager.prototype.onTouchEnd = function (ev, target) {
    var eventName = this.dragging ? 'dragEnd' : 'tap';
    var rect = target.rect;
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    target.handlerFn(eventName, x, y);
    this.startX = null;
    this.dragging = false;
    return true;
};

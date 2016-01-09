'use strict';

var main = require('../../../main');


/** @class One list of "brother" groups = groups which share eyes.
 *  @param {GroupInfo} gi0 - first group in band */
function Band(gi0) {
    this.bandId = gi0.group.ndx; // unique enough
    this.brothers = [gi0]; // array of GroupInfo
    gi0.band = this;
    gi0.dependsOn.clear(); // does not depend on parents anymore
}
module.exports = Band;


function giNdx(gi) { return '#' + gi.group.ndx; }

Band.prototype.toString = function () {
    return this.brothers.map(giNdx).toString();
};

Band.prototype._add1 = function (gi) {
    gi.dependsOn.clear(); // does not depend on parents anymore

    if (!gi.band) {
        if (main.debug) main.log.debug('BROTHERS: ' + gi + ' joins band: ' + this.toString());
        this.brothers.push(gi);
        gi.band = this;
        return;
    }
    if (gi.band.bandId === this.bandId) return; // gi uses same band

    if (main.debug) main.log.debug('BROTHERS: band merge: ' + gi.band.toString() + ' merge with ' + this.toString());
    var brothers = gi.band.brothers;
    for (var n = brothers.length - 1; n >= 0; n--) {
        this.brothers.push(brothers[n]);
        brothers[n].band = this;
    }
};

Band.prototype.remove = function (gi) {
    var ndx = this.brothers.indexOf(gi);
    if (ndx < 0) throw new Error('Band.remove on wrong Band');
    this.brothers.splice(ndx, 1);
    gi.band = null;
    if (main.debug) main.log.debug('un-BROTHERS: ' + gi + ' left band: ' + this.toString());
};

// groups contains the groups in the band
Band.gather = function (groups) {
    if (groups.length === 1) throw new Error('add Band of 1');

    // look if one of the group is already in a band
    var band = null;
    for (var n = 0; n < groups.length; n++) {
        if (groups[n]._info.band) { band = groups[n]._info.band; break; }
    }
    // if not, create a new band with 1st group in it
    var first = 0;
    if (!band) band = new Band(groups[first++]._info);
    // add all groups to band
    for (n = first; n < groups.length; n++) {
        band._add1(groups[n]._info);
    }
};

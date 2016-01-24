'use strict';

var main = require('./main');

var idGen = 1;


/** @class
 */
function Genes(map, limits, name) {
    this._map = map || {};
    this._limits = limits || {};
    this.name = name || '#' + idGen++;
}
module.exports = Genes;

var SMALL_MUTATION = 0.05; // e.g. 0.05 -> plus or minus 5%

// Each limit is an array of 2 numbers: LOW and HIGH:
var LOW = 0, HIGH = 1;


Genes.prototype.clone = function (newName) {
    return new Genes(main.clone(this._map), main.clone(this._limits), newName);
};

Genes.prototype.setLimits = function (limits) {
    this._limits = limits;
};

Genes.prototype.toString = function () {
    var s = '{' + this.name + ' - ';
    for (var k in this._map) {
        s += k + ':' + this._map[k].toFixed(2) + ', ';
    }
    return s.chomp(', ') + '}';
};

// Returns a distance between 2 sets of genes
Genes.prototype.distance = function (gene2) {
    var dist = 0.0;
    for (var k in this._map) {
        var m = this._map[k];
        var n = gene2._map[k];
        // first handle sign differences
        if ((n < 0) !== (m < 0)) {
            if (n < 0) {
                m -= n;
                n = 0;
            } else {
                n -= m;
                m = 0;
            }
        } else {
            m = Math.abs(m);
            n = Math.abs(n);
        }
        // then separate 0 values
        var d;
        if (n === 0.0) {
            d = m > 1.0 ? 1.0 : m;
        } else if (m === 0.0) {
            d = n > 1.0 ? 1.0 : n;
        } else {
            // finally we can do a ratio
            d = 1.0 - ( n >= m ? m / n : n / m );
        }
        dist += d;
    }
    return dist;
};

// If limits are given, they will be respected during mutation.
// The mutated value will remain >=low and <=high.
// So if you want to remain strictly >0 you have to set a low limit as 0.0001 or alike.
Genes.prototype.get = function (name, defValue, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    var val = this._map[name];
    if (val) return val;

    this._map[name] = defValue;

    if (lowLimit || highLimit) this._limits[name] = [lowLimit, highLimit];
    if (lowLimit && highLimit && lowLimit > highLimit) {
        throw new Error('Limits are invalid: ' + lowLimit + ' > ' + highLimit);
    }
    return defValue;
};

Genes.prototype.serialize = function () {
    return JSON.stringify(this);
};

Genes.unserialize = function (text) {
    var j = JSON.parse(text);
    this._map = j._map;
    this._limits = j._limits;
};

// mutation_rate: 0.05 for 5% mutation on each gene
// wide_mutation_rate: 0.20 for 20% chances to pick any value in limit range
// if wide mutation is not picked, a value near to the old value is picked
Genes.prototype.mate = function (parent2, kid1, kid2, mutationRate, wideMutationRate) {
    var p1 = this._map;
    var p2 = parent2._map;
    kid1.setLimits(this._limits);
    kid2.setLimits(this._limits);
    var k1 = kid1._map;
    var k2 = kid2._map;
    var crossPoint2 = ~~(Math.random() * p1.length);
    var crossPoint = ~~(Math.random() * crossPoint2);
    var pos = 0;
    for (var key in p1) {
        if (pos < crossPoint || pos > crossPoint2) {
            k1[key] = p1[key];
            k2[key] = p2[key];
        } else {
            k1[key] = p2[key];
            k2[key] = p1[key];
        }
        if (Math.random() < mutationRate) {
            k1[key] = this.mutation1(key, k1[key], wideMutationRate);
        }
        if (Math.random() < mutationRate) {
            k2[key] = this.mutation1(key, k2[key], wideMutationRate);
        }
        pos++;
    }
};

Genes.prototype.mutation1 = function (name, oldVal, wideMutationRate) {
    var limits = this._limits[name];
    var val;
    if (limits) {
        var low = limits[LOW];
        var high = limits[HIGH];
        if (Math.random() < wideMutationRate) {
            val = low + Math.random() * (high - low);
        } else {
            var variation = 1 + (Math.random() * 2 * SMALL_MUTATION) - SMALL_MUTATION;
            val = oldVal * variation;
            if (low && val < low) val = low;
            if (high && val > high) val = high;
        }
    } else {
        // not used yet; it seems we will always have limits for valid values
        // add or remove up to 5
        val = oldVal + (Math.random() - 0.5) * 10;
    }
    return val;
};

Genes.prototype.mutateAll = function () {
    for (var key in this._map) {
        this._map[key] = this.mutation1(key, this._map[key], 1.0);
    }
    return this;
};

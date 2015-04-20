//Translated from genes.rb using babyruby2js
'use strict';

var main = require('./main');
//require 'yaml';

/** @class public read-only attribute: map
 */
function Genes(map, limits) {
    if (map === undefined) map = {};
    if (limits === undefined) limits = {};
    this.map = map;
    this.limits = limits;
}
module.exports = Genes;

Genes.SMALL_MUTATION_AMOUNT = 0.05; // e.g. 0.05 -> plus or minus 5%
// for limits
Genes.LOW = 0;
Genes.HIGH = 1;
Genes.prototype.clone = function () {
    return new Genes(this.map.clone(), this.limits.clone());
};

Genes.prototype.setLimits = function (limits) {
    this.limits = limits;
};

Genes.prototype.toString = function () {
    var s = '';
    for (var k in this.map) {
        s += k + ':' + '%.02f'.format(this.map[k]) + ', ';
    }
    return s.chomp(', ');
};

// Returns a distance between 2 sets of genes
Genes.prototype.distance = function (gene2) {
    var dist = 0.0;
    for (var k in this.map) {
        var m = this.map[k];
        var n = gene2.map[k];
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
        if (n === 0.0) {
            var d = (( m > 1.0 ? 1.0 : m ));
        } else if (m === 0.0) {
            d = (( n > 1.0 ? 1.0 : n ));
        } else {
            // finally we can do a ratio
            d = 1.0 - (( n >= m ? m / n : n / m ));
        }
        dist += d; // puts "Distance for #{k} between #{'%.02f' % @map[k]} and #{'%.02f' % gene2.map[k]}: #{d}"
    }
    // puts "Total distance: #{'%.02f' % dist}"
    return dist;
};

// If limits are given, they will be respected during mutation.
// The mutated value will remain >=low and <=high.
// So if you want to remain strictly >0 you have to set a low limit as 0.0001 or alike.
Genes.prototype.get = function (name, defValue, lowLimit, highLimit) {
    if (lowLimit === undefined) lowLimit = null;
    if (highLimit === undefined) highLimit = null;
    var val = this.map[name];
    if (val) {
        return val;
    }
    this.map[name] = defValue;
    if (lowLimit || highLimit) {
        this.limits[name] = [lowLimit, highLimit];
    }
    if (lowLimit && highLimit && lowLimit > highLimit) {
        throw new Error('Limits are invalid: ' + lowLimit + ' > ' + highLimit);
    }
    return defValue;
};

Genes.prototype.serialize = function () {
    return main.YAML.dump(this);
};

Genes.unserialize = function (dump) {
    return main.YAML.load(dump);
};

// mutation_rate: 0.05 for 5% mutation on each gene
// wide_mutation_rate: 0.20 for 20% chances to pick any value in limit range
// if wide mutation is not picked, a value near to the old value is picked
Genes.prototype.mate = function (parent2, kid1, kid2, mutationRate, wideMutationRate) {
    var p1 = this.map;
    var p2 = parent2.map;
    kid1.setLimits(this.limits);
    kid2.setLimits(this.limits);
    var k1 = kid1.map;
    var k2 = kid2.map;
    var crossPoint2 = ~~(Math.random()*~~(p1.length));
    var crossPoint = ~~(Math.random()*~~(crossPoint2));
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
        pos += 1;
    }
};

Genes.prototype.mutation1 = function (name, oldVal, wideMutationRate) {
    var limits = this.limits[name];
    if (limits) {
        var low = limits[Genes.LOW];
        var high = limits[Genes.HIGH];
        if (Math.random() < wideMutationRate) {
            var val = low + Math.random() * (high - low);
        } else {
            var variation = 1 + (Math.random() * 2 * Genes.SMALL_MUTATION_AMOUNT) - Genes.SMALL_MUTATION_AMOUNT;
            val = oldVal * variation;
            if (low && val < low) {
                val = low;
            }
            if (high && val > high) {
                val = high;
            }
        }
    } else {
        // not used yet; it seems we will always have limits for valid values
        // add or remove up to 5
        val = oldVal + (Math.random() - 0.5) * 10;
    }
    return val;
};

Genes.prototype.mutateAll = function () {
    for (var key in this.map) {
        this.map[key] = this.mutation1(key, this.map[key], 1.0);
    }
    return this;
};

// E02: unknown method chomp!(...)
// W02: Unknown constant supposed to be attached to main: YAML
// E02: unknown method dump(...)
// W02: Unknown constant supposed to be attached to main: YAML
// E02: unknown method load(...)
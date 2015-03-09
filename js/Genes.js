//Translated from genes.rb using babyruby2js
'use strict';

var main = require('./main');
//require 'yaml';
Genes.SMALL_MUTATION_AMOUNT = 0.05; // e.g. 0.05 -> plus or minus 5%
//public read-only attribute: map;
// for limits
Genes.LOW = 0;
Genes.HIGH = 1;

/** @class */
function Genes(map, limits) {
    if (map === undefined) map = {};
    if (limits === undefined) limits = {};
    this.map = map;
    this.limits = limits;
}
module.exports = Genes;

Genes.prototype.clone = function () {
    return new Genes(this.map.clone(), this.limits.clone());
};

Genes.prototype.set_limits = function (limits) {
    this.limits = limits;
};

Genes.prototype.toString = function () {
    var s = '';
    this.map.each_key(function (k) {
        s += k + ':' + main.strFormat('%.02f', this.map[k]) + ', ';
    });
    return s.chomp(', ');
};

// Returns a distance between 2 sets of genes
Genes.prototype.distance = function (gene2) {
    var dist = 0.0;
    this.map.each_key(function (k) {
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
    });
    // puts "Total distance: #{'%.02f' % dist}"
    return dist;
};

// If limits are given, they will be respected during mutation.
// The mutated value will remain >=low and <=high.
// So if you want to remain strictly >0 you have to set a low limit as 0.0001 or alike.
Genes.prototype.get = function (name, def_value, low_limit, high_limit) {
    if (low_limit === undefined) low_limit = null;
    if (high_limit === undefined) high_limit = null;
    var val = this.map[name];
    if (val) {
        return val;
    }
    this.map[name] = def_value;
    if (low_limit || high_limit) {
        this.limits[name] = [low_limit, high_limit];
    }
    if (low_limit && high_limit && low_limit > high_limit) {
        throw new Error('Limits are invalid: ' + low_limit + ' > ' + high_limit);
    }
    return def_value;
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
Genes.prototype.mate = function (parent2, kid1, kid2, mutation_rate, wide_mutation_rate) {
    var p1 = this.map;
    var p2 = parent2.map;
    kid1.set_limits(this.limits);
    kid2.set_limits(this.limits);
    var k1 = kid1.map;
    var k2 = kid2.map;
    var cross_point_2 = ~~(Math.random()*~~(p1.size));
    var cross_point = ~~(Math.random()*~~(cross_point_2));
    var pos = 0;
    return p1.each_key(function (key) {
        if (pos < cross_point || pos > cross_point_2) {
            k1[key] = p1[key];
            k2[key] = p2[key];
        } else {
            k1[key] = p2[key];
            k2[key] = p1[key];
        }
        if (Math.random() < mutation_rate) {
            k1[key] = this.mutation1(key, k1[key], wide_mutation_rate);
        }
        if (Math.random() < mutation_rate) {
            k2[key] = this.mutation1(key, k2[key], wide_mutation_rate);
        }
        pos += 1;
    });
};

Genes.prototype.mutation1 = function (name, old_val, wide_mutation_rate) {
    var limits = this.limits[name];
    if (limits) {
        var low = limits[Genes.LOW];
        var high = limits[Genes.HIGH];
        if (Math.random() < wide_mutation_rate) {
            var val = low + Math.random() * (high - low);
        } else {
            var variation = 1 + (Math.random() * 2 * Genes.SMALL_MUTATION_AMOUNT) - Genes.SMALL_MUTATION_AMOUNT;
            val = old_val * variation;
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
        val = old_val + (Math.random() - 0.5) * 10;
    }
    return val;
};

Genes.prototype.mutate_all = function () {
    this.map.each_key(function (key) {
        this.map[key] = this.mutation1(key, this.map[key], 1.0);
    });
    return this;
};

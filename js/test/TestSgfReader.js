//Translated from test_sgf_reader.rb using babyruby2js
'use strict';

var inherits = require('util').inherits;
var SgfReader = require('../SgfReader');
var TestCase = require('./TestCase');


/** @class */
function TestSgfReader(testName) {
    TestCase.call(this, testName);
}
inherits(TestSgfReader, TestCase);
module.exports = TestSgfReader;


TestSgfReader.prototype.testSgfNoHandicap = function () {
    // Game from LittleGolem
    var game = '(;FF[4]EV[go19.ch.10.4.3]PB[kyy]PW[Olivier Lombart]KM[6.5]SZ[19]SO[http://www.littlegolem.com];B[pd];W[pp];B[ce];W[dc];B[dp];W[ee];B[dg];W[cn];B[fq];W[bp];B[cq];W[bq];B[br];W[cp];B[dq];W[dj];B[cc];W[cb];B[bc];W[nc];B[qf];W[pb];B[qc];W[jc];B[qn];W[nq];B[pj];W[ch];B[cg];W[bh];B[bg];W[iq];B[en];W[gr];B[fr];W[ol];B[ql];W[rp];B[ro];W[qo];B[po];W[qp];B[pn];W[no];B[cl];W[dm];B[cj];W[dl];B[di];W[ck];B[ej];W[dk];B[ci];W[bj];B[bi];W[bk];B[ah];W[gc];B[lc];W[ld];B[kd];W[md];B[kc];W[jd];B[ke];W[nf];B[kg];W[oh];B[qh];W[nj];B[hf];W[ff];B[fg];W[gf];B[gg];W[he];B[if];W[ki];B[jp];W[ip];B[jo];W[io];B[jn];W[im];B[in];W[hn];B[jm];W[il];B[jl];W[ik];B[jk];W[jj];B[ho];W[go];B[hm];W[gn];B[ij];W[hj];B[ii];W[gk];B[kj];W[ji];B[lj];W[li];B[mj];W[mi];B[nk];W[ok];B[ni];W[oj];B[nh];W[ng];B[mh];W[lh];B[mg];W[lg];B[nn];W[pi];B[om];W[ml];B[mo];W[mp];B[ln];W[mk];B[qj];W[qi];B[jq];W[ir];B[ar];W[mm];B[oo];W[np];B[mn];W[ri];B[dd];W[ec];B[bb];W[rk];B[pl];W[rg];B[qb];W[pf];B[pe];W[of];B[qg];W[rh];B[ob];W[nb];B[pc];W[sd];B[rc];W[re];B[qe];W[ih];B[hi];W[hh];B[gi];W[hg];B[jh];W[lf];B[kf];W[lp];B[nm];W[kk];B[lr];W[lq];B[kr];W[jr];B[kq];W[mr];B[kb];W[jb];B[ja];W[ia];B[ka];W[hb];B[ie];W[id];B[ed];W[fd];B[db];W[eb];B[ca];W[de];B[cd];W[ek];B[ei];W[em];B[gq];W[gp];B[hr];W[hq];B[gs];W[eo];B[do];W[dn];B[co];W[bo];B[ep];W[fo];B[kl];W[lk];B[lm];W[rm];B[rn];W[rl];B[rj];W[sj];B[rf];W[sf];B[rd];W[se];B[sc];W[sg];B[qm];W[oc];B[pa];W[ko];B[kn];W[ea];B[op];W[oq];B[df];W[fe];B[ef];W[da];B[cb];W[aq];B[gj];W[hk];B[na];W[ma];B[oa];W[mc];B[le];W[me];B[oe];W[nl];B[sp];W[sq];B[so];W[qq];B[ne];W[ls];B[ks];W[aj];B[ms];W[ns];B[ls];W[ai];B[dh];W[fj];B[fi];W[fk];B[je];W[is];B[hs];W[sm];B[sk];W[sl];B[si];W[sh];B[ph];W[oi];B[pg];W[kp];B[og];W[mf];B[kh];W[qk];B[pk];W[si];B[ig];W[fp];B[js];W[hp];B[tt];W[tt];B[tt])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(19, infos.boardSize);
    this.assertEqual(6.5, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual('Bq16,q4,c15,d17,d4,e15,d13,c6,f3,b4,c3,b3,b2,c4,d3,d10,c17,c18,b17,o17,r14,q18,r17,k17,r6,o3,q10,c12,c13,b12,b13,j3,e6,g2,f2,p8,r8,s4,s5,r5,q5,r4,q6,o5,c8,d7,c10,d8,d11,c9,e10,d9,c11,b10,b11,b9,a12,g17,m17,m16,l16,n16,l17,k16,l15,o14,l13,p12,r12,o10,h14,f14,f13,g14,g13,h15,j14,l11,k4,j4,k5,j5,k6,j7,j6,h6,k7,j8,k8,j9,k9,k10,h5,g5,h7,g6,j10,h10,j11,g9,l10,k11,m10,m11,n10,n11,o9,p9,o11,p10,o12,o13,n12,m12,n13,m13,o6,q11,p7,n8,n5,n4,m6,n9,r10,r11,k3,j2,a2,n7,p5,o4,n6,s11,d16,e17,b18,s9,q8,s13,r18,q14,q15,p14,r13,s12,p18,o18,q17,t16,s17,s15,r15,j12,h11,h12,g11,h13,k12,m14,l14,m4,o7,l9,m2,m3,l2,k2,l3,n2,l18,k18,k19,j19,l19,h18,j15,j16,e16,f16,d18,e18,c19,d15,c16,e9,e11,e7,g3,g4,h2,h3,g1,e5,d5,d6,c5,b5,e4,f5,l8,m9,m7,s7,s6,s8,s10,t10,s14,t14,s16,t15,t17,t13,r7,p17,q19,l5,l6,e19,p4,p3,d14,f15,e14,d19,c18,a3,g10,h9,o19,n19,p19,n17,m15,n15,p15,o8,t4,t3,t5,r3,o15,m1,l1,a10,n1,o1,m1,a11,d12,f10,f11,f9,k15,j1,h1,t7,t9,t8,t11,t12,q12,p11,q13,l4,p13,n14,l12,r9,q9,t11,j13,f4,k1,h4,pass,pass,pass',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgfWithHandicap = function () {
    // Game 2 from LittleGolem - with handicap; +replaced pass moves "tt" by ""
    var game = '(;FF[4]EV[go19.mc.2010.mar.1.21]PB[fuego19 bot]PW[Olivier Lombart]KM[0.5]SZ[19]SO[http://www.littlegolem.com]HA[6]AB[pd]AB[dp]AB[pp]AB[dd]AB[pj]AB[dj];W[fq];B[fp];W[dq];B[eq];W[er];B[ep];W[cq];B[fr];W[cp];B[cn];W[co];B[dn];W[nq];B[oc];W[fc];B[ql];W[pr];B[cg];W[qq];B[mc];W[pg];B[nh];W[qi];B[dr];W[cr];B[nk];W[qe];B[hc];W[db];B[jc];W[cc];B[qj];W[qc];B[qd];W[rd];B[re];W[rc];B[qf];W[rf];B[pe];W[se];B[rg];W[qe];B[qg];W[jq];B[es];W[fe];B[ci];W[no];B[bn];W[bo];B[cs];W[bs];B[pb];W[ef];B[ao];W[ap];B[ip];W[pn];B[qn];W[qo];B[jp];W[iq];B[kq];W[lq];B[kr];W[kp];B[hq];W[lr];B[ko];W[lp];B[kg];W[hh];B[ir];W[ce];B[pm];W[rn];B[ek];W[an];B[am];W[ao];B[re];W[sk];B[qm];W[rm];B[ro];W[rp];B[qp];W[po];B[oo];W[on];B[om];W[nn];B[ii];W[bm];B[cm];W[bl];B[cl];W[bk];B[gi];W[ll];B[lm];W[km];B[kl];W[jm];B[lk];W[ln];B[hi];W[hf];B[kc];W[hm];B[ml];W[jo];B[io];W[jn];B[in];W[im];B[bf];W[be];B[bj];W[ri];B[rj];W[sj];B[rl];W[sl];B[qb];W[ph];B[pi];W[qh];B[ae];W[ad];B[ck];W[ds];B[gm];W[ik];B[kj];W[of];B[gb];W[hn];B[gl];W[ho];B[hp];W[fo];B[nf];W[ne];B[oe];W[ng];B[mf];W[mg];B[mh];W[lg];B[lh];W[lf];B[me];W[le];B[md];W[kf];B[jg];W[eh];B[af];W[cd];B[ak];W[fn];B[sf];W[gh];B[hk];W[fi];B[nm];W[ih];B[ji];W[jh];B[kh];W[er];B[fs];W[oh];B[ib];W[oi];B[oj];W[ni];B[mi];W[nj];B[jk];W[hl];B[ij];W[em];B[ls];W[ms];B[dh];W[ks];B[jr];W[cf];B[bg];W[fj];B[gj];W[fk];B[gk];W[fb];B[hd];W[gc];B[fa];W[ea];B[ga];W[dg];B[mj];W[dl];B[il];W[ej];B[gd];W[fd];B[el];W[fl];B[dk];W[dm];B[sd];W[dr];B[ge];W[gf];B[id];W[jl];B[ik];W[ig];B[jf];W[ld];B[lc];W[di];B[ei];W[ha];B[hb];W[di];B[ch];W[ei];B[fm];W[en];B[do];W[mn];B[mm];W[je];B[kd];W[go];B[gq];W[js];B[is];W[ls];B[ke];W[og];B[ie];W[sh];B[if];W[so];B[he];W[fg];B[pf];W[si];B[sg];W[kn];B[rh];W[sm];B[rk];W[gn];B[eo];W[];B[];W[];B[])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(19, infos.boardSize);
    this.assertEqual(0.5, infos.komi);
    this.assertEqual(6, infos.handicap);
    this.assertEqual('hand:B=q16-d4-q4-d16-q10-d10,Wf3,f4,d3,e3,e2,e4,c3,f2,c4,c6,c5,d6,o3,p17,f17,r8,q2,c13,r3,n17,q13,o12,r11,d2,c2,o9,r15,h17,d18,k17,c17,r10,r17,r16,s16,s15,s17,r14,s14,q15,t15,s13,r15,r13,k3,e1,f15,c11,o5,b6,b5,c1,b1,q18,e14,a5,a4,j4,q6,r6,r5,k4,j3,l3,m3,l2,l4,h3,m2,l5,m4,l13,h12,j2,c15,q7,s6,e9,a6,a7,a5,s15,t9,r7,s7,s5,s4,r4,q5,p5,p6,p7,o6,j11,b7,c7,b8,c8,b9,g11,m8,m7,l7,l8,k7,m9,m6,h11,h14,l17,h7,n8,k5,j5,k6,j6,j7,b14,b15,b10,s11,s10,t10,s8,t8,r18,q12,q11,r12,a15,a16,c9,d1,g7,j9,l10,p14,g18,h6,g8,h5,h4,f5,o14,o15,p15,o13,n14,n13,n12,m13,m12,m14,n15,m15,n16,l14,k13,e12,a14,c16,a9,f6,t14,g12,h9,f11,o7,j12,k11,k12,l12,e2,f1,p12,j18,p11,p10,o11,n11,o10,k9,h8,j10,e7,m1,n1,d12,l1,k2,c14,b13,f10,g10,f9,g9,f18,h16,g17,f19,e19,g19,d13,n10,d8,j8,e10,g16,f16,e8,f8,d9,d7,t16,d2,g15,g14,j16,k8,j9,j13,k14,m16,m17,d11,e11,h19,h18,d11,c12,e11,f7,e6,d5,n6,n7,k15,l16,g5,g3,k1,j1,m1,l15,p13,j15,t12,j14,t5,h15,f13,q14,t11,t13,l6,s12,t7,s9,g6,e5,pass,pass,pass,pass',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgfWithCommentsAndEscapedChars = function () {
    // Game from KGS Bot tournament (contains "\]")
    var game = '(;GM[1]FF[4]CA[UTF-8]AP[CGoban:3]ST[2] RU[Chinese]SZ[13]KM[7.50]TM[540]OT[10/30 Canadian] PW[AyaMC]PB[abakus]WR[3d]BR[5d]DT[2015-12-06]PC[The KGS Go Server at http://www.gokgs.com/]C[abakus [5d\\]: GTP Engine for abakus (black): Abakus version 20151124. Have a nice game! AyaMC [3d\\]: GTP Engine for AyaMC (white): Aya version 7.85x ]RE[B+Resign] ;B[kd]BL[538.796] ;W[dd]WL[534.304] ;B[dj]BL[533.672] ;W[jk]WL[528.911] ;B[cc]BL[528.49] ;W[jg]WL[518.219] ;B[hd]BL[523.244] ;W[dc]WL[506.076] ;B[kk]BL[517.912] ;W[jj]WL[497.504] ;B[kj]BL[512.541] ;W[ji]WL[487.283] ;B[kh]BL[506.973] ;W[ci]WL[476.303] ;B[cf]BL[501.478] ;W[di]WL[465.306] ;B[cd]BL[495.775] ;W[de]WL[457.758] ;B[cj]BL[490.122] ;W[ej]WL[450.304] ;B[ek]BL[484.394] ;W[bj]WL[439.151] ;B[bk]BL[478.509] ;W[fk]WL[431.785] ;B[ei]BL[472.607] ;W[fj]WL[425.918] ;B[bi]BL[466.64] ;W[bh]WL[418.984] ;B[aj]BL[460.592] ;W[ce]WL[418.079] ;B[ch]BL[454.562] ;W[dh]WL[412.067] ;B[cg]BL[448.411] ;W[jc]WL[403.129] ;B[jd]BL[442.046]C[HYamashita [?\\]: Aya thinks 54% for w. ] ;W[ic]WL[392.818] ;B[hc]BL[435.676] ;W[id]WL[382.391] ;B[ie]BL[429.243] ;W[he]WL[374.706] ;B[kc]BL[422.684] ;W[be]WL[366.623] ;B[fd]BL[415.99] ;W[fc]WL[355.717] ;B[fb]BL[409.184] ;W[hf]WL[344.867] ;B[ib]BL[402.253] ;W[ki]WL[338.787] ;B[eh]BL[395.166] ;W[li]WL[333.51] ;B[hl]BL[387.955]C[HYamashita [?\\]: hmm... similar shape. ] ;W[il]WL[327.9] ;B[gi]BL[380.558] ;W[el]WL[318.677]C[gogonuts [3d\\]: abakus seems to be playing those 3-3 invasions too early ] ;B[db]BL[373.018]C[HYamashita [?\\]: D7 is ladder? ] ;W[eb]WL[313.967] ;B[ea]BL[365.31] ;W[cb]WL[313.305] ;B[ec]BL[357.407] ;W[bb]WL[312.599] ;B[hh]BL[349.515]C[gogonuts [3d\\]: y ] ;W[ed]WL[303.707]C[HYamashita [?\\]: thx. 52% for w. ] ;B[hk]BL[341.303] ;W[hj]WL[302.873] ;B[gj]BL[332.984] ;W[dg]WL[302.008]C[gogonuts [3d\\]: not anymore HYamashita [?\\]: oh ] ;B[gk]BL[324.465]C[gogonuts [3d\\]: e10 broke it ] ;W[dk]WL[292.138] ;B[fl]BL[315.67] ;W[ck]WL[289.354] ;B[bj]BL[306.853] ;W[if]WL[280.722] ;B[fi]BL[298.178] ;W[je]WL[271.173]C[HYamashita [?\\]: big furikawari gogonuts [3d\\]: bots play rough on 13*13 :-) ] ;B[jb]BL[289.728] ;W[fg]WL[269.17]C[HYamashita [?\\]: I like rough play :-) ] ;B[gc]BL[281.567]C[gogonuts [3d\\]: lol ] ;W[bg]WL[263.706] ;B[lf]BL[273.64]C[HYamashita [?\\]: oops 41% for w. ] ;W[lg]WL[254.75] ;B[kg]BL[265.924] ;W[le]WL[254.081] ;B[ke]BL[258.429] ;W[kf]WL[253.414]C[gogonuts [3d\\]: nasty ko ] ;B[jf]BL[251.058] ;W[fm]WL[250.004] ;B[ek]BL[243.875] ;W[kf]WL[249.152]C[HYamashita [?\\]: 39% for w. ] ;B[jl]BL[236.855] ;W[kl]WL[243.202] ;B[jf]BL[230.089] ;W[hm]WL[241.051] ;B[ie]BL[223.604] ;W[mf]WL[233.697] ;B[kf]BL[217.374] ;W[eg]WL[232.283]C[gogonuts [3d\\]: ko wasnt really playable ] ;B[dl]BL[211.285]C[gogonuts [3d\\]: the last hurah ] ;W[lh]WL[225.674] ;B[gm]BL[205.35]C[HYamashita [?\\]: 18% resign soon HYamashita [?\\]: thx for the game. farg [7k\\]: thx ])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(13, infos.boardSize);
    this.assertEqual(7.5, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual('Bl10,d10,d4,k3,c11,k7,h10,d11,l3,k4,l4,k5,l6,c5,c8,d5,c10,d9,c4,e4,e3,b4,b3,f3,e5,f4,b5,b6,a4,c9,c6,d6,c7,k11,k10,j11,h11,j10,j9,h9,l11,b9,f10,f11,f12,h8,j12,l5,e6,m5,h2,j2,g5,e2,d12,e12,e13,c12,e11,b12,h6,e10,h3,h4,g4,d7,g3,d3,f2,c3,b4,j8,f5,k9,k12,f7,g11,b7,m8,m7,l7,m9,l9,l8,k8,f1,e3,l8,k2,l2,k8,h1,j9,n8,l8,e7,d2,m6,g1',
        reader.toMoveList());
};

TestSgfReader.prototype.testSgf3AndPartialLoad = function () {
    // From Computer Go Test Collection; Format FF[3]
    // + stones set by hand before a single move + marked vertex using BM, CR, etc.
    var game = '(;GM[1]FF[3]SZ[19]AP[Explorer:0]N[Territory]ID[Territory]BS[0]WS[0];AB[oc][pd][qf][op][qp][lq]AW[dd][cj][co][dq][iq]CR[jc][jd];W[ch]BM[1]CR[fc][ic][id][jd][jc])';
    var reader = new SgfReader();
    var infos = reader.readGame(game);
    this.assertEqual(0, infos.komi);
    this.assertEqual(0, infos.handicap);
    this.assertEqual(19, infos.boardSize);

    this.assertEqual('hand:B=p17-q16-r14-p4-r4-m3,hand:W=d16-c10-c5-d3-j3,Wc12',
        reader.toMoveList());
    // and this time stopping *before* move #1
    infos = reader.readGame(game, 1);
    this.assertEqual('hand:B=p17-q16-r14-p4-r4-m3,hand:W=d16-c10-c5-d3-j3',
        reader.toMoveList());
};

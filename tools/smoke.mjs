import * as m from '../src/sim.js';
const L=m.parseLevel('N First Steps|H Draw a bridge, then press Play|S 2 12 1|G 28 11|R 0 12 10 6|R 22 12 10 6|I O14 R6');
const r=m.createRun(L,[m.mkStroke(1,[10,12,22,12])]);let n=0;while(!m.step(r)&&n<2000)n++;
console.log('sol state',r._state,'t',r._t.toFixed(2),'x',r._u._x.toFixed(2),'y',r._u._y.toFixed(2));
const r2=m.createRun(L,[]);n=0;while(!m.step(r2)&&n<2000)n++;
console.log('empty',r2._state,r2._t.toFixed(2),r2._u._x.toFixed(1),r2._u._y.toFixed(1));

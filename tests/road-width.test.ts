import {test} from 'node:test';
import assert from 'node:assert/strict';
import {roadWidth} from '../scripts/geography/road-width.ts';
test('major roads do not fall back to narrow service width',()=>{
 assert.equal(roadWidth({highway:'trunk',name:'御堂筋',lanes:'7',oneway:'yes'}).metres,22.7);
 assert.ok(roadWidth({highway:'trunk'}).metres>10);
});
test('separate carriageways use their own lanes and explicit width wins',()=>{
 assert.equal(roadWidth({highway:'primary',lanes:'2',oneway:'yes'}).metres,7);
 assert.equal(roadWidth({highway:'primary',lanes:'6',width:'12 m'}).metres,12);
 assert.equal(roadWidth({highway:'footway',lanes:'2'}).metres,2);
 assert.ok(Number.isFinite(roadWidth({highway:'trunk',lanes:'2;3',width:'unknown'}).metres));
});

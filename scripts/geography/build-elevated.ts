import {readFileSync,writeFileSync} from 'node:fs';
const features=JSON.parse(readFileSync('data/geography/features.json','utf8')) as {id:string;tags:Record<string,string>;coordinates:number[][]}[];
const ids=new Set(['north','south','west'].flatMap(region=>(JSON.parse(readFileSync(`data/geography/elevated/${region}.json`,'utf8')) as {links:{ways:number[]}[]}).links.flatMap(l=>l.ways.map(String))));
const ways=features.filter(f=>ids.has(f.id));
if(ways.length!==ids.size||ways.some(w=>w.tags.highway!=='footway'))throw new Error('Missing/non-footway elevated source');
writeFileSync('data/geography/elevated/ways.json',JSON.stringify({source:'Repository OSM snapshot; original longitude/latitude; ODbL 1.0, OpenStreetMap contributors. Widths and display heights are separate estimates.',ways},null,2)+'\n');
console.log('Wrote '+ways.length+' elevated OSM ways');

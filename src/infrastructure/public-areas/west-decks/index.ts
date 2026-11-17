import type {DeckBlock,DeckPortal} from '../../../domain/map/public-deck.ts';
import {deckEvidence,sourceDeckPaths} from '../elevated-source.ts';
export function westDecks():{blocks:DeckBlock[];portals:DeckPortal[]}{return {
 blocks:[{id:'west-decks',name:'LUCUA 西侧—梅北上方公共步道',level:'district-north-deck',paths:sourceDeckPaths(['lucua-umekita','umekita-public']),regions:[],evidence:deckEvidence}],
 portals:[{id:'lucua-west-concourse',blockId:'west-decks',target:'station:jr-osaka',point:{x:293.9,z:616},width:7,angle:Math.PI/3,level:'district-north-deck',evidence:deckEvidence}],
};}

import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Facility, Level, LevelId, RouteNode, StationLayout, FloorOpening,StationId } from '../domain/map/model.ts';
import type { MapViewState } from '../application/map-session.ts';
import { displayElevation } from '../application/display-elevation.ts';
import { platformPoint, pointInPolygon } from '../domain/map/geometry.ts';
import { planFloorOpenings } from '../application/connection-openings.ts';
import { planGateBoundaries } from '../application/gate-boundaries.ts';
import type { GateBoundary } from '../application/gate-boundaries.ts';
import { buildFloorGeometry } from './floor-geometry.ts';
import { VerticalConnectionModel } from './vertical-connection-model.ts';
import { viewLayerRole } from '../application/view-layer.ts';
import { LayerAppearance,setRegionOwner } from './layer-appearance.ts';
import {isRegionMuted} from '../application/region-focus.ts';
import { cameraOffset, viewBasis } from './view-orientation.ts';
import { roofHeightAt,roofPlan } from './roof-profile.ts';
import {visibleElevatorConnections} from '../application/elevator-visibility.ts';
import { advanceExplode } from './explode-transition.ts';
import {stationPalettes,publicAreaColor} from './station-palette.ts';
import {cameraEnvelope} from './camera-framing.ts';
import {stationPlinthParts} from './station-plinth.ts';
import {buildRailApproachModel} from './rail-approach-model.ts';
import {platformRail} from '../domain/map/rail-geometry.ts';
import {buildCommercialFloor} from './commercial-building-model.ts';
import {buildCommercialMassing} from './commercial-massing-model.ts';
import {PublicPassageModel} from './public-passage-model.ts';
import {planAtriumOpenings} from '../application/atrium-openings.ts';
import {buildAtriumRailing} from './atrium-model.ts';
import {LabelOcclusion,visibleLabelOccluders} from './label-occlusion.ts';
import {facilityFocusRect,facilityCameraCenter,minimumMapZoom} from './facility-focus.ts';
import {SelectionMarker} from './selection-marker.ts';
import {buildCommercialConcourse} from './commercial-concourse-model.ts';
import {buildFloorLabel} from './floor-label.ts';
import {areaColor} from './area-palette.ts';

const colors = { slab: publicAreaColor, edge: 0xc6bea8, mint: 0xbbd1bd, blue: 0xb0c6ce,
  steel: 0x647c7a, white: 0xf5f3df, roof: 0xe3e9df, glass: 0x719eac, route: 0xd47747 };
interface MapLabel { element: HTMLDivElement; position: T.Vector3; level?: LevelId; roof?: boolean;owner?:StationId|null }

export class MapScene {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 1200);
  private groups = new Map<LevelId, T.Group>();
  private roof = new T.Group();
  private commercialMassing:T.Group[]=[];
  private base = new T.Group();
  private ground?: T.Mesh;
  private appearance = new LayerAppearance();
  private labels: MapLabel[] = [];
  private labelOccluders:T.Object3D[]=[];
  private labelOcclusion=new LabelOcclusion();
  private pickables: T.Object3D[] = [];
  private raycaster = new T.Raycaster();
  private route = new T.Group();
  private state: MapViewState;
  private displayedExplode: number;
  private immediateExplode = false;
  private framing?:{center:T.Vector3;span:number};
  private focusTransition=false;
  private locatingFacility=false;
  private targetCenter?:T.Vector3;
  private zoomValue = 1;
  private minimumZoom=1;
  private pan = new T.Vector3();
  private frame = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private down: { x: number; y: number } | null = null;
  private dragged = false;
  private width = 1;
  private height = 1;
  private materials = new Map<number, T.MeshStandardMaterial>();
  private selectionMarker=new SelectionMarker();
  private selected=this.selectionMarker.group;
  private activeFacility?: Facility;
  private nodeById: Map<string, RouteNode>;
  private connectors: VerticalConnectionModel[] = [];
  private publicPassages:PublicPassageModel[]=[];
  private openings: FloorOpening[] = [];
  private gateBoundaries: GateBoundary[] = [];

  constructor(private host: HTMLElement, private labelHost: HTMLElement,
    private levels: Level[], private facilities: Facility[], nodes: RouteNode[], private layout: StationLayout,
    initial: MapViewState, private onSelect: (facility: Facility) => void) {
    this.state = { ...initial }; this.displayedExplode = initial.explode;
    this.nodeById = new Map(nodes.map(n => [n.id, n]));
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    host.append(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight(0xffffff, 0xb1b69d, 2.5));
    const sun = new T.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-60, 120, 65); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 1, far: 300 });
    sun.shadow.bias = -0.001; sun.shadow.normalBias = 0.12;
    this.scene.add(sun);
    const ground = new T.Mesh(new T.PlaneGeometry(142, 130), new T.ShadowMaterial({ opacity: 0.075, depthWrite: false }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -4; ground.receiveShadow = true; this.scene.add(ground); this.ground=ground;
    this.openings = [...planFloorOpenings(this.layout.connections, this.levels, this.layout.platforms),...planAtriumOpenings(this.layout.atria??[])];
    this.gateBoundaries = planGateBoundaries(this.facilities, this.layout.areas);
    this.buildStation();
    this.scene.add(this.roof, this.route, this.selected);
    this.scene.traverse(object=>{if(object.userData.labelOccluder)this.labelOccluders.push(object);});
    this.roof.traverse(object=>{if(object instanceof T.Mesh)this.labelOccluders.push(object);});
    this.bindGestures();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }

  private material(color: number): T.MeshStandardMaterial {
    let value = this.materials.get(color);
    if (!value) { value = new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 }); this.materials.set(color, value); }
    return value;
  }
  private box(group: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, color: number): T.Mesh {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), this.material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  private beam(group: T.Group, a: T.Vector3, b: T.Vector3, radius: number, color: number): T.Mesh {
    const delta = b.clone().sub(a);
    const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, delta.length(), 5), this.material(color));
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    group.add(mesh); return mesh;
  }
  private label(text: string, x: number, y: number, z: number, level?: LevelId, roof = false, emphasis = false,owner?:StationId|null): void {
    const el = document.createElement('div'); el.className = `map-label${emphasis ? ' emphasis' : ''}`;
    el.textContent = text; this.labelHost.append(el);
    this.labels.push({ element: el, position: new T.Vector3(x, y, z), level, roof,owner });
  }

  private buildStation(): void {
    const base = this.base; this.scene.add(base);
    for(const {geometry,color}of stationPlinthParts(this.openings)){
      if(!geometry.getAttribute('position'))continue;
      const mesh=new T.Mesh(geometry,this.material(color));mesh.castShadow=true;mesh.receiveShadow=true;base.add(mesh);
      mesh.userData.labelOccluder=true;
    }
    for (const level of this.levels) { const group = setRegionOwner(new T.Group(),level.station??'jr-osaka'); this.groups.set(level.id, group); this.scene.add(group); }
    for(const hall of this.layout.concourses??[])this.groups.get(hall.level)!.add(setRegionOwner(buildCommercialConcourse(hall),null));
    const publicContext={areas:this.layout.areas,levels:this.levels,passages:this.layout.passages??[]};
    for(const building of this.layout.buildings??[])if(building.podiumHeight||building.volumes?.length){
      const model=setRegionOwner(buildCommercialMassing(building,publicContext),null);this.groups.get('platform')!.add(model);this.commercialMassing.push(model);
    }
    for(const building of this.layout.buildings??[])for(const floor of building.floors){
      this.groups.get(floor.level)!.add(setRegionOwner(buildCommercialFloor(building,floor,this.layout.passages??[],publicContext,this.openings),null));
      const x=building.outline.reduce((s,p)=>s+p.x,0)/building.outline.length;
      const z=building.outline.reduce((s,p)=>s+p.z,0)/building.outline.length;
      this.label(`${building.name} · ${floor.name}`,x,3+(floor.elevationOffset??0),z,floor.level,false,true,null);
    }
    for(const passage of this.layout.passages??[]){
      if(passage.surfaceId)continue;
      const model=new PublicPassageModel(passage,publicContext);this.publicPassages.push(model);this.scene.add(model.group);
      if(passage.kind==='underground'||(passage.kind==='deck'&&!passage.label))continue;
      const boundary=passage.points.find(p=>p.boundaryName);
      const point=boundary??passage.points[Math.floor(passage.points.length/2)]!;
      this.label(boundary?.boundaryName??passage.name,point.x,3+(point.elevationOffset??0),point.z,point.level,false,!!boundary,null);
    }
    const screenGlass = new T.MeshStandardMaterial({color:0x9dc5cc,transparent:true,opacity:0.38,depthWrite:false,roughness:0.3});
    for (const area of this.layout.areas) {
      const cuts = [...area.holes??[],...this.openings.filter(opening => opening.level === area.level).map(opening => opening.outline)];
      const geometry = buildFloorGeometry(area.outline, cuts, area.height ?? 0.55, area.elevationOffset??0);
      if (!geometry.getAttribute('position')) continue;
      const palette=stationPalettes[this.levels.find(l=>l.id===area.level)?.station??'jr-osaka'];
      const mesh = new T.Mesh(geometry, this.material(area.kind==='paid'?palette.paid:areaColor(area,this.levels.find(l=>l.id===area.level)!.y<0)));
      mesh.userData.labelOccluder=true;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const owner=area.kind==='commercial'||area.evidence.source==='district'?null:this.levels.find(l=>l.id===area.level)!.station??'jr-osaka';
      setRegionOwner(mesh,owner);
      this.groups.get(area.level)!.add(mesh);
      if (area.label && !(area.kind==='public'&&(this.levels.find(l=>l.id===area.level)!.y<0||/通路|通道|连廊|联络桥|连络桥/.test(area.name)))) {
        if(area.labelStyle==='floor'){
          this.groups.get(area.level)!.add(setRegionOwner(buildFloorLabel(area,Math.PI/2-58.35*Math.PI/180,this.renderer.capabilities.getMaxAnisotropy()),owner));
          continue;
        }
        const x = area.outline.reduce((sum, point) => sum + point.x, 0) / area.outline.length;
        const z = area.outline.reduce((sum, point) => sum + point.z, 0) / area.outline.length;
        this.label(area.name, x, (area.height ?? 0.55) + (area.elevationOffset??0) + 1, z, area.level, false,
          area.id === 'central-public' || area.id === 'bridge-public' || area.id === 'central-mezz' || area.id === 'south-central-raised',owner);
      }
    }
    for (const platform of this.layout.platforms) {
      const { x, z, length, width, tracks, level } = platform;
      const platformGroup = this.groups.get(level)!;
      const position = (along: number, across: number) => platformPoint(platform, along, across);
      const block = (along: number, y: number, across: number, w: number, h: number, d: number, color: number) => {
        const p = position(along, across);
        const mesh = this.box(platformGroup, p.x, y, p.z, w, h, d, color);
        mesh.rotation.y = -platform.rotationRad;
        return mesh;
      };
      const outline = [position(-length/2,-width/2),position(length/2,-width/2),position(length/2,width/2),position(-length/2,width/2)];
      const slab = new T.Mesh(buildFloorGeometry(outline, this.openings.filter(opening => opening.level === level).map(opening => opening.outline), 0.95, -0.475),
        this.material(level==='underground-platform'?0x90b6c5:stationPalettes[this.levels.find(l=>l.id===level)?.station??'jr-osaka'].platform));
      slab.name = `platform-slab-${platform.id}`; slab.castShadow = true; slab.receiveShadow = true; platformGroup.add(slab);
      slab.userData.labelOccluder=true;
      for (const [index, number] of tracks.entries()) {
        const {side,across,length:railLength,center:railCenter}=platformRail(platform,index);
        block(railCenter, -0.62, across, railLength, 0.3, 2.5, 0xb9bcae);
        for (const offset of [-0.7, 0.7]) block(railCenter, -0.36, across + offset, railLength, 0.12, 0.12, 0x6d7c77);
        for (let railX = railCenter-railLength/2; railX <= railCenter+railLength/2; railX += 2.2) block(railX, -0.45, across, 0.45, 0.13, 2.2, 0x939c8e);
        if(platform.terminal)block((platform.terminalEnd==='end'?1:-1)*(length/2-3),0.3,across,0.45,1.4,2,0x855c57);
        if(platform.lineColor)block(0,0.58,side*(width/2-0.75),length-2,0.06,0.16,platform.lineColor);
        block(0, 0.53, side * (width / 2 - 0.4), length - 1, 0.08, 0.3, 0xe9d694);
        const label = position(length / 2 - 2, across);
        this.label(`${number} 番线`, label.x, 1, label.z, level);
        if (level === 'underground-platform'||platform.screenDoors==='full-height') {
          // Full-height underground screen doors: overhead frame, glazing and sliding leaves.
          block(0, 3.55, side * (width / 2 - 0.2), length-1, 0.25, 0.3, 0x648e9b);
          for (let px = -length / 2 + 2; px < length / 2 - 2; px += 3) {
            const edge=side*(width/2-0.2);
            block(px, 2, edge, 0.16, 3.1, 0.25, 0x648e9b);
            for(const offset of [0.75,2.15]){
              const panel=block(px+offset,2,edge,1.32,2.9,0.1,0x9dc5cc);
              panel.material=screenGlass;panel.castShadow=false;panel.renderOrder=1;
              block(px+offset,1.1,edge,1.32,0.08,0.18,0x648e9b);
            }
            block(px+1.45,2,edge,0.055,2.9,0.15,0x648e9b);
            block(px+1.45,3.3,edge,0.55,0.12,0.2,0x8cbba7);
          }
        }
        if(platform.screenDoors==='half-height')for(let px=-length/2+2;px<length/2-2;px+=3){
          const edge=side*(width/2-0.2);
          block(px,1.2,edge,0.15,1.4,0.23,0x779a9d);
          const panel=block(px+1.4,1.15,edge,2.6,1.2,0.1,0x9dc5cc);panel.material=screenGlass;panel.castShadow=false;
          block(px+1.4,1.8,edge,2.6,0.12,0.18,0x779a9d);
        }
      }
      // Shared alighting strips use the adjacent track edges without drawing
      // another copy of those rails.
      if(!tracks.length&&platform.screenDoors==='half-height')for(const side of platform.screenDoorSides??[]){
        const edge=side*(width/2-0.2);
        for(let px=-length/2+2;px<length/2-2;px+=3){
          block(px,1.2,edge,0.15,1.4,0.23,0x779a9d);
          const panel=block(px+1.4,1.15,edge,2.6,1.2,0.1,0x9dc5cc);panel.material=screenGlass;panel.castShadow=false;
          block(px+1.4,1.8,edge,2.6,0.12,0.18,0x779a9d);
        }
      }
      if (level === 'platform') {
        const canopyCuts=planFloorOpenings(this.layout.connections,this.levels,this.layout.platforms,
          [{id:level,y:this.levels.find(l=>l.id===level)!.y+3.2}]).map(o=>o.outline);
        for (const canopy of [{ x: -48, length: 18 }, { x: 31, length: 15 }]) {
          const half=(width-1.4)/2;
          const footprint=[position(canopy.x-canopy.length/2,-half),position(canopy.x+canopy.length/2,-half),
            position(canopy.x+canopy.length/2,half),position(canopy.x-canopy.length/2,half)];
          const geometry=buildFloorGeometry(footprint,canopyCuts,0.3,3.05);
          if(geometry.getAttribute('position')){
            const mesh=new T.Mesh(geometry,this.material(0xe7e9dc));mesh.castShadow=true;mesh.receiveShadow=true;platformGroup.add(mesh);
            mesh.userData.labelOccluder=true;
          }
          for (const dx of [-5, 5]) if(!canopyCuts.some(cut=>pointInPolygon(position(canopy.x+dx,0),cut)))
            block(canopy.x + dx, 1.8, 0, 0.3, 2.7, 0.3, colors.steel);
        }
      }
      block(length / 5, 0.9, 0, 3, 0.65, 0.85, 0x789887);
      block(-6, 3, 0, 5, 0.75, 0.35, 0x416c67);
      const label = position(-length / 2 + 8, 0);
      this.label(platform.name??(tracks.join(' / ') + ' 番线'), label.x, 3.7, label.z, level, false, true);
    }
    for(const approach of this.layout.railApproaches??[]){
      this.groups.get(approach.level)!.add(buildRailApproachModel(approach));
      this.label(approach.name,approach.labelPoint.x,2.5,approach.labelPoint.z,approach.level,false,true);
    }
    for(const guide of this.layout.guides??[]){
      for(const p of guide.points)if(p.caption)this.label(p.caption,p.x,3,p.z,p.level,false,true);
    }
    for(const atrium of this.layout.atria??[])for(const opening of atrium.openings)
      this.groups.get(opening.level)!.add(buildAtriumRailing(atrium,opening.level,this.layout.areas,this.layout.connections));
    // Handrails frame the narrow elevated passages, not imaginary full floor plates.
    for (const id of ['mezzanine', 'bridge'] as const) {
      const group = this.groups.get(id)!;
      const sides = id === 'bridge' ? [-12, 9] : [-50.5, -22];
      for (const x of sides) {
        const inOpening = (z: number) => {
          if(this.openings.some(opening => opening.level === id && pointInPolygon({x,z},opening.outline)))return true;
          const floorAt=(px:number)=>this.layout.areas.some(a=>a.level===id&&pointInPolygon({x:px,z},a.outline));
          // A passage branch is not an outer railing edge.
          if(!floorAt(x)||(floorAt(x-0.2)&&floorAt(x+0.2)))return true;
          return this.layout.connections.some(c=>[c.from,c.to].some(p=>p.level===id&&Math.abs(p.x-x)<3.5&&Math.abs(p.z-z)<2.4));
        };
        const half = id === 'bridge' ? 37 : 31;
        for (let z = -half; z < half; z += 1) if (!inOpening(z + 0.5)) this.box(group, x, 1.45, z+0.5, 0.14, 0.12, 1, 0x78968a);
        for (let z = -30; z <= 30; z += 6) if(!inOpening(z)) this.box(group, x, 0.95, z, 0.12, 0.9, 0.12, 0x9fb3a0);
      }
    }
    const boundaries=new Map(this.gateBoundaries.map(boundary=>[boundary.boundaryId,boundary]));
    for (const boundary of boundaries.values()) this.buildGateFences(boundary);
    for (const facility of this.facilities) if(!facility.id.startsWith('connection-'))this.buildFacility(facility);
    for (const connection of this.layout.connections) {
      const model = new VerticalConnectionModel(connection, this.levels, this.layout.platforms);
      this.connectors.push(model); this.scene.add(model.group);
    }
    this.label('1F 中央改札口', -9, 3.5, 4, 'concourse', false, true);
    this.label('3F 桥上改札口', -3, 3.5, 4, 'bridge');
    this.buildRoof();
    for (const group of [base, ...this.groups.values(), this.roof]) this.batchStaticMeshes(group);
    for (const facility of this.facilities) {
      const target = new T.Mesh(new T.BoxGeometry(7, 5, 7), new T.MeshBasicMaterial({ visible: false }));
      target.position.set(facility.x, 2.5+(facility.elevationOffset??0), facility.z); target.userData.facility = facility;
      this.groups.get(facility.level)!.add(target); this.pickables.push(target);
    }
  }

  private buildFacility(facility: Facility): void {
    const group = this.groups.get(facility.level)!;
    if (facility.kind === 'gate') {
      const palette=stationPalettes[this.levels.find(l=>l.id===facility.level)?.station??'jr-osaka'];
      const boundary = this.gateBoundaries.find(item => item.gateId === facility.id)!;
      const rotation = boundary.rotationRad;
      for (let i=0;i<(facility.gateCount??6);i++) {
        const offset=(i-((facility.gateCount??6)-1)/2)*1.7;
        const x = boundary.center.x + Math.cos(rotation) * offset, z = boundary.center.z + Math.sin(rotation) * offset;
        this.box(group, x, 1.3, z, 0.7, 1.5, 2.7, palette.gate).rotation.y = -rotation;
        this.box(group, x, 2.09, z, 0.6, 0.1, 2, palette.gateTop).rotation.y = -rotation;
      }
      if (!['gate', 'bridge'].includes(facility.id)) this.label(facility.name, facility.x, 3, facility.z, facility.level);
    } else if (facility.kind === 'ticket') {
      this.box(group, facility.x, 2.7, facility.z, 12, 0.4, 4, colors.white);
      for (let i = 0; i < 4; i++) {
        this.box(group, facility.x - 5 + i * 2.3, 3.5, facility.z, 1.2, 1, 0.3, 0x69877a);
      }
      this.label(facility.name, facility.x, 4.7, facility.z, facility.level);
    } else if (facility.kind === 'ticket-machine') {
      const angle=facility.rotationRad??0;
      const point=(along:number,across:number)=>({x:facility.x+along*Math.cos(angle)-across*Math.sin(angle),z:facility.z+along*Math.sin(angle)+across*Math.cos(angle)});
      const cabinet=(along:number,y:number,across:number,w:number,h:number,d:number,color:number)=>{
        const p=point(along,across);this.box(group,p.x,y,p.z,w,h,d,color).rotation.y=-angle;
      };
      for(const offset of [-1.8,0,1.8]){
        cabinet(offset,1.8,0,1.45,2.5,0.85,0x668b87);
        cabinet(offset,2.2,0.46,1.04,0.72,0.045,0xd5e9dd);
        cabinet(offset,1.48,0.49,0.66,0.1,0.05,0x3c5c54);
        cabinet(offset,3.1,0,1.4,0.12,0.88,0x91b397);
      }
      this.label('自动售票机',facility.x,3.6,facility.z,facility.level);
    } else if (facility.kind === 'information') {
      this.box(group, facility.x, 2.1, facility.z, 7, 0.4, 3, colors.white);
      this.label('咨询 i', facility.x, 3.5, facility.z, facility.level);
    } else if(facility.kind==='convenience-store'){
      this.label(facility.name,facility.x,3.3,facility.z,facility.level,false,true);
    } else if (['stairs', 'escalator', 'elevator'].includes(facility.kind)) {
      this.label(facility.kind === 'elevator' ? '直梯 ↕' : facility.kind === 'stairs' ? '夹层楼梯' : '扶梯 ↗', facility.x, 2.2, facility.z, facility.level);
    }
  }

  private buildGateFences(boundary: GateBoundary): void {
    const group = this.groups.get(boundary.level)!;
    const color=stationPalettes[this.levels.find(l=>l.id===boundary.level)?.station??'jr-osaka'].fence;
    for (const segment of boundary.fences) {
      const dx = segment.to.x-segment.from.x, dz = segment.to.z-segment.from.z, length = Math.hypot(dx,dz);
      const rotation = -Math.atan2(dz,dx);
      for (const height of [0.95,1.85]) {
        this.box(group,(segment.from.x+segment.to.x)/2,height,(segment.from.z+segment.to.z)/2,length,0.12,0.13,color).rotation.y=rotation;
      }
      const count = Math.ceil(length/1.8);
      for (let i=0;i<=count;i++) {
        const t=i/count;
        this.box(group,segment.from.x+dx*t,1.22,segment.from.z+dz*t,0.12,1.35,0.12,color);
      }
    }
  }

  private batchStaticMeshes(group: T.Group): void {
    const batches = new Map<T.Material, T.Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof T.Mesh) || child.userData.dynamic || child.userData.labelOccluder || Array.isArray(child.material)) continue;
      const batch = batches.get(child.material) ?? []; batch.push(child); batches.set(child.material, batch);
    }
    for (const [material, meshes] of batches) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(parts);
      parts.forEach(part => part.dispose());
      if (!geometry) continue;
      meshes.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose(); });
      const merged = new T.Mesh(geometry, material); merged.castShadow = true; merged.receiveShadow = true; group.add(merged);
    }
  }

  private buildRoof(): void {
    this.roof.scale.x=roofPlan.width/126;this.roof.position.x=roofPlan.centerX;
    const slope = roofHeightAt;
    // Low-poly roof profile: shallow curved slope, separate strips for the skylights.
    for (let x = -63; x < 63; x += 6) {
      for (let z = -36; z < 36; z += 6) {
        const a = slope(z), b = slope(z + 6);
        const vertices = new Float32Array([x, a, z, x + 5.9, a, z, x + 5.9, b, z + 6,
          x, a, z, x + 5.9, b, z + 6, x, b, z + 6]);
        const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
        const glass = x > -43 && x < 42 && z > -25 && z < 20;
        const material = this.material(glass ? (Math.round((x + 63) / 6) % 2 === 0 ? 0x99bdc3 : colors.glass) : colors.roof);
        material.side = T.DoubleSide;
        const mesh = new T.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; this.roof.add(mesh);
      }
    }
    for (const x of [-63, 63]) {
      for (let z = -36; z < 36; z += 6) this.beam(this.roof, new T.Vector3(x, slope(z), z), new T.Vector3(x, slope(z + 6), z + 6), 0.65, colors.white);
    }
    for (const z of [-36, 36]) {
      this.box(this.roof, 0, slope(z), z, 127, 0.85, 0.8, colors.white);
      // Triangular steel truss below the roof edge.
      this.beam(this.roof, new T.Vector3(-63, slope(z) - 3, z), new T.Vector3(63, slope(z) - 3, z), 0.23, colors.steel);
      for (let x = -63; x < 63; x += 9) {
        this.beam(this.roof, new T.Vector3(x, slope(z) - 3, z), new T.Vector3(x + 4.5, slope(z) - 0.5, z), 0.13, colors.steel);
        this.beam(this.roof, new T.Vector3(x + 4.5, slope(z) - 0.5, z), new T.Vector3(x + 9, slope(z) - 3, z), 0.13, colors.steel);
      }
    }
    this.label('大阪站', roofPlan.centerX, 13, 0, undefined, true, true);
  }

  update(state: MapViewState, options: { immediateExplode?: boolean } = {}): void {
    const routeChanged = this.state.route !== state.route;
    if(this.state.level!==state.level)this.locatingFacility=false;
    if(this.state.focusStation!==state.focusStation)this.focusTransition=true;
    if(options.immediateExplode)this.focusTransition=false;
    this.state = { ...state };
    this.immediateExplode ||= options.immediateExplode === true;
    if (routeChanged) this.buildRoute();
    this.requestRender();
  }
  select(facility: Facility): void {
    this.activeFacility = facility;
    this.locatingFacility=true;this.focusTransition=true;
    this.selectionMarker.restart(performance.now());this.requestRender();
  }
  zoom(factor: number): void { this.focusTransition=false;this.zoomValue = T.MathUtils.clamp(this.zoomValue * factor, this.minimumZoom, Math.max(2.8,this.minimumZoom*3)); this.requestRender(); }
  reset(): void { this.locatingFacility=false;this.focusTransition=false;this.zoomValue = 1; this.pan.set(0, 0, 0); this.activeFacility = undefined; this.selected.visible=false; this.requestRender(); }
  refreshViewport():void {this.requestRender();}
  private levelY(id: LevelId): number {
    return displayElevation(this.levels, id, this.displayedExplode);
  }
  private clearRoute(): void {
    this.route.traverse(obj => { if (obj instanceof T.Mesh) { obj.geometry.dispose(); } });
    this.route.clear();
  }
  private buildRoute(): void {
    this.clearRoute();
    const ids = this.state.route; if (!ids) return;
    const points = ids.map(id => { const node = this.nodeById.get(id)!; return new T.Vector3(node.x, this.levelY(node.level) + (node.elevationOffset??0) + 1.3, node.z); });
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!, b = points[i + 1]!;
      this.beam(this.route, a, b, 0.38, colors.route);
      const direction = b.clone().sub(a).normalize();
      const arrow = new T.Mesh(new T.ConeGeometry(0.9, 2.1, 3), this.material(colors.route));
      arrow.position.copy(a).lerp(b, 0.66); arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction); this.route.add(arrow);
    }
    for (const point of [points[0]!, points.at(-1)!]) {
      const marker = new T.Mesh(new T.SphereGeometry(0.9, 12, 8), this.material(colors.route)); marker.position.copy(point); this.route.add(marker);
    }
  }
  private resize(): void {
    this.width = this.host.clientWidth; this.height = this.host.clientHeight;
    this.renderer.setSize(this.width, this.height); this.requestRender();
  }
  private requestRender(): void { if (!this.frame) this.frame = requestAnimationFrame(() => this.render()); }
  private render(): void {
    this.frame = 0;
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const {value,animate}=advanceExplode(this.displayedExplode,this.state.explode,this.immediateExplode,reducedMotion);
    const previousExplode = this.displayedExplode;
    this.displayedExplode = value;
    this.immediateExplode = false;
    for (const [id, group] of this.groups) {
      group.position.y = this.levelY(id);
      const role=viewLayerRole(this.levels,this.state,id);
      group.visible=role!=='hidden';this.appearance.apply(group,role==='context',this.state.focusStation);
    }
    const baseRole=viewLayerRole(this.levels,this.state,'concourse');
    for(const passage of this.publicPassages)passage.update(id=>this.levelY(id),id=>viewLayerRole(this.levels,this.state,id),this.state.focusStation);
    this.base.visible=baseRole!=='hidden';this.appearance.apply(this.base,baseRole==='context',this.state.focusStation,'jr-osaka');
    if(this.ground)this.ground.visible=this.base.visible;
    const fullShafts=visibleElevatorConnections(this.layout.connections,this.levels,this.state.level);
    for (const connector of this.connectors) {
      const fullShaft=fullShafts.has(connector.connection.id);
      if(!fullShaft&&viewLayerRole(this.levels,this.state,connector.connection.from.level)==='hidden'&&viewLayerRole(this.levels,this.state,connector.connection.to.level)==='hidden'){
        connector.group.visible=false;continue;
      }
      connector.group.visible=true;
      connector.update(id => this.levelY(id), this.state.level,fullShaft);
      const {from,to}=connector.connection;
      const roles=[from,to].map(p=>viewLayerRole(this.levels,this.state,p.level));
      const owners=[from,to].map(p=>this.levels.find(l=>l.id===p.level)!.station??'jr-osaka');
      const owner=this.activeFacility?.connectionId===connector.connection.id?this.state.focusStation??null:
        connector.connection.evidence.source==='district'?null:owners[0]===owners[1]?owners[0]!:null;
      this.appearance.apply(connector.group,!roles.some(role=>role==='current'||role==='normal'),this.state.focusStation,owner);
    }
    this.roof.position.y = 26 + this.displayedExplode * 56;
    for(const model of this.commercialMassing)model.visible=this.state.roof&&this.state.level==='all';
    this.roof.visible = this.state.roof && this.state.level === 'all';
    this.appearance.apply(this.roof,false,this.state.focusStation,'jr-osaka');
    this.route.visible = !!this.state.route;
    if (previousExplode !== this.displayedExplode && this.state.route) this.buildRoute();
    this.selected.visible = !!this.activeFacility && ['normal','current'].includes(viewLayerRole(this.levels,this.state,this.activeFacility.level));
    if (this.activeFacility) this.selected.position.set(this.activeFacility.x, this.levelY(this.activeFacility.level) + (this.activeFacility.elevationOffset??0) + 0.9, this.activeFacility.z);
    // Fit around the visible floor envelope; reserve side panels on desktop.
    const mobile = this.width < 761;
    const aspect = this.width / Math.max(1, this.height);
    const usableWidth = mobile ? this.width * 0.91 : Math.max(this.width * 0.55, this.width - 380);
    const envelope=cameraEnvelope(this.layout,this.levels,this.state,id=>this.levelY(id));
    if(!this.state.focusStation||this.state.focusStation==='jr-osaka')
      for(const x of [roofPlan.centerX-roofPlan.width/2-1,roofPlan.centerX+roofPlan.width/2+1])for(const z of [-37,37])envelope.push(new T.Vector3(x,this.roof.position.y+14,z));
    const center = new T.Box3().setFromPoints(envelope).getCenter(new T.Vector3());
    const {right,up} = viewBasis();
    const boundsX = envelope.map(point => point.clone().sub(center).dot(right));
    const boundsY = envelope.map(point => point.clone().sub(center).dot(up));
    const minX = Math.min(...boundsX), maxX = Math.max(...boundsX), minY = Math.min(...boundsY), maxY = Math.max(...boundsY);
    center.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2).add(this.pan);
    const viewport=this.host.getBoundingClientRect();
    const sidebar=this.host.parentElement?.querySelector('.sidebar')?.getBoundingClientRect();
    const usable=facilityFocusRect(viewport,sidebar,mobile);
    const baseSpan=Math.max(55,(maxY-minY)*1.18,(maxX-minX)*this.height/usableWidth*1.12);
    this.minimumZoom=minimumMapZoom(baseSpan,maxY-minY,this.height,usable.height);
    this.zoomValue=T.MathUtils.clamp(this.zoomValue,this.minimumZoom,Math.max(2.8,this.minimumZoom*3));
    let span = baseSpan / this.zoomValue;
    if(!mobile)center.addScaledVector(right,-Math.min(150,this.width*0.13)*span/this.height);
    else center.copy(facilityCameraCenter(center,span,this.width,this.height,usable));
    if(this.locatingFacility&&this.activeFacility){
      const target=facilityCameraCenter(this.selected.position,span,this.width,this.height,usable);
      this.pan.add(target.clone().sub(center));center.copy(target);
    }
    this.targetCenter=center.clone();
    if(this.framing&&this.focusTransition&&!reducedMotion){
      this.framing.center.lerp(center,0.24);this.framing.span+=(span-this.framing.span)*0.24;
      this.focusTransition=this.framing.center.distanceTo(center)>0.02||Math.abs(this.framing.span-span)>0.02;
      if(this.focusTransition){center.copy(this.framing.center);span=this.framing.span;}
    }else this.focusTransition=false;
    this.framing={center:center.clone(),span};
    this.selectionMarker.update(performance.now(),reducedMotion,span/this.height);
    this.camera.left=-span*aspect/2;this.camera.right=span*aspect/2;
    this.camera.top=span/2;this.camera.bottom=-span/2;
    this.camera.position.copy(center).add(cameraOffset);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
    const rect = this.host.getBoundingClientRect();
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    const occluders=visibleLabelOccluders(this.labelOccluders);
    const labelMuted=(label:MapLabel)=>isRegionMuted(this.state.focusStation,label.owner!==undefined?label.owner:label.roof?'jr-osaka':this.levels.find(l=>l.id===label.level)?.station??'jr-osaka');
    const priority=(label:MapLabel)=>Number(!labelMuted(label))*8+Number(label.level&&viewLayerRole(this.levels,this.state,label.level)==='current')*4+Number(label.element.classList.contains('emphasis'));
    const orderedLabels = [...this.labels].sort((a,b)=>priority(b)-priority(a));
    const placements = orderedLabels.map(label => {
      const role=label.level?viewLayerRole(this.levels,this.state,label.level):'normal';
      let visible = label.roof ? this.roof.visible : role!=='hidden';
      label.element.classList.toggle('context',role==='context'||labelMuted(label));
      if(role==='context'&&!label.element.classList.contains('emphasis'))visible=false;
      if ((mobile || this.state.level === 'all') && this.zoomValue < 1.2 && !label.element.classList.contains('emphasis')) visible = false;
      const anchor = label.position.clone();
      anchor.y += label.roof ? this.roof.position.y : label.level ? this.levelY(label.level) : 0;
      const point=anchor.clone().project(this.camera);
      visible = visible && Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.94;
      if(visible&&this.labelOcclusion.isOccluded(anchor,this.camera,occluders))visible=false;
      label.element.hidden = !visible;
      const x = rect.left + (point.x + 1) * this.width / 2, y = rect.top + (1 - point.y) * this.height / 2;
      label.element.style.left = `${x}px`;
      label.element.style.top = `${y}px`;
      return {label,visible,x,y};
    });
    // Batch DOM writes and measurements, avoiding a forced layout for every label.
    const measured = placements.map(p => ({...p,w:p.visible?p.label.element.offsetWidth:0,h:p.visible?p.label.element.offsetHeight:0}));
    for(const {label,visible,x,y,w,h} of measured){
      if (visible) {
        const collides = occupied.some(other => Math.abs(x - other.x) < (w + other.w) / 2 + 5 && Math.abs(y - other.y) < (h + other.h) / 2 + 4);
        label.element.hidden = collides;
        if (!collides) occupied.push({ x, y, w, h });
      }
    }
    if (animate||this.focusTransition||(this.selected.visible&&!reducedMotion)) this.requestRender();
  }
  private bindGestures(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('wheel', e => { e.preventDefault(); this.zoom(Math.exp(-e.deltaY * 0.001)); }, { passive: false });
    canvas.addEventListener('pointerdown', e => {
      if (this.pointers.size === 0) { this.down = { x: e.clientX, y: e.clientY }; this.dragged = false; }
      else this.dragged = true;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      const old = this.pointers.get(e.pointerId); if (!old) return;
      if(this.locatingFacility&&this.framing&&this.targetCenter)
        this.pan.add(this.framing.center.clone().sub(this.targetCenter));
      this.locatingFacility=false;
      this.focusTransition=false;
      if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) this.dragged = true;
      const other = [...this.pointers].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const previous = Math.hypot(old.x - other.x, old.y - other.y);
        const current = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (previous > 1) this.zoom(current / previous);
      } else {
        const scale = (this.camera.top - this.camera.bottom) / this.height;
        const right = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new T.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        this.pan.addScaledVector(right, -(e.clientX - old.x) * scale);
        this.pan.addScaledVector(up, (e.clientY - old.y) * scale);
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.requestRender();
    });
    canvas.addEventListener('pointerup', e => {
      this.pointers.delete(e.pointerId);
      if (!this.dragged && this.down) {
        const rect = canvas.getBoundingClientRect();
        this.raycaster.setFromCamera(new T.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
        const candidates = this.pickables.filter(obj => obj.parent?.visible && ['normal','current'].includes(viewLayerRole(this.levels,this.state,(obj.userData.facility as Facility).level)));
        const hit = this.raycaster.intersectObjects(candidates, false)[0];
        if (hit) this.onSelect(hit.object.userData.facility as Facility);
      }
      if (!this.pointers.size) this.down = null;
    });
    canvas.addEventListener('pointercancel', e => { this.pointers.delete(e.pointerId); this.dragged = true; this.down = null; });
  }
}

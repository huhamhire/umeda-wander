import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Facility, Level, LevelId, RouteNode } from '../domain/map/model.ts';
import type { MapViewState } from '../application/map-session.ts';

const colors = { slab: 0xe9ddc3, edge: 0xc6bea8, mint: 0xbbd1bd, blue: 0xb0c6ce,
  steel: 0x647c7a, white: 0xf5f3df, roof: 0xe3e9df, glass: 0x719eac, route: 0xd47747 };
interface MapLabel { element: HTMLDivElement; position: T.Vector3; level?: LevelId; roof?: boolean }

export class MapScene {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-100, 100, 100, -100, 0.1, 1200);
  private groups = new Map<LevelId, T.Group>();
  private roof = new T.Group();
  private labels: MapLabel[] = [];
  private pickables: T.Object3D[] = [];
  private raycaster = new T.Raycaster();
  private route = new T.Group();
  private state: MapViewState;
  private displayedExplode: number;
  private zoomValue = 1;
  private pan = new T.Vector3();
  private frame = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private down: { x: number; y: number } | null = null;
  private dragged = false;
  private width = 1;
  private height = 1;
  private materials = new Map<number, T.MeshStandardMaterial>();
  private selected: T.Group = new T.Group();
  private activeFacility?: Facility;
  private nodeById: Map<string, RouteNode>;
  private escalators: { x: number; y: number; z: number; rise: number; steps: T.Mesh[]; rails: T.Mesh[] }[] = [];

  constructor(private host: HTMLElement, private labelHost: HTMLElement,
    private levels: Level[], private facilities: Facility[], nodes: RouteNode[],
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
    const ground = new T.Mesh(new T.PlaneGeometry(650, 650), new T.ShadowMaterial({ opacity: 0.075 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -4; ground.receiveShadow = true; this.scene.add(ground);
    this.buildStation();
    this.scene.add(this.roof, this.route, this.selected);
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
  private label(text: string, x: number, y: number, z: number, level?: LevelId, roof = false, emphasis = false): void {
    const el = document.createElement('div'); el.className = `map-label${emphasis ? ' emphasis' : ''}`;
    el.textContent = text; this.labelHost.append(el);
    this.labels.push({ element: el, position: new T.Vector3(x, y, z), level, roof });
  }

  private buildStation(): void {
    const base = new T.Group(); this.scene.add(base);
    this.box(base, 0, -2.5, 0, 118, 2, 75, 0xe0dfcf);
    this.box(base, 0, -1.35, 0, 114, 0.5, 71, 0xefecdb);
    // Fine paving lines add scale without copying a photographic texture.
    for (let x = -54; x <= 54; x += 6) this.box(base, x, -1.06, 0, 0.08, 0.02, 68, 0xd9dece);
    for (let z = -30; z <= 30; z += 6) this.box(base, 0, -1.05, z, 110, 0.02, 0.08, 0xd9dece);
    for (const level of this.levels) { const group = new T.Group(); this.groups.set(level.id, group); this.scene.add(group); }
    const concourse = this.groups.get('concourse')!;
    this.box(concourse, 0, 0, 0, 98, 1.1, 55, colors.slab);
    this.box(concourse, 0, 0.6, -8, 70, 0.12, 33, colors.mint);
    // Public hall, service counters and a paid boundary.
    this.box(concourse, -35, 1.9, -17, 15, 3, 10, 0xe4ded0);
    this.box(concourse, 35, 1.9, -17, 15, 3, 10, 0xe4ded0);
    for (let x = -40; x <= 40; x += 16) {
      for (const z of [-23, 23]) this.box(concourse, x, 3.8, z, 0.8, 7, 0.8, 0xd6d9c7);
    }
    // Gate row, with short glass wings and entry markers.
    for (let x = -6; x <= 6; x += 2) {
      this.box(concourse, x, 1.6, 13, 0.85, 2, 3.7, 0x778d87);
      this.box(concourse, x, 2.67, 12, 0.65, 0.12, 0.5, 0x92b594);
      if (x < 6) this.box(concourse, x + 1, 1.55, 13, 1.1, 0.6, 0.12, 0xc6d9cc);
    }
    this.box(concourse, -21, 1.5, 19, 10, 2, 3, 0xc8b78f);
    this.box(concourse, -21, 2.65, 19, 10.4, 0.3, 3.2, colors.white);
    for (let x = -30; x < -23; x += 2) {
      this.box(concourse, x, 2, 18, 1.6, 3, 1.3, 0x718d82);
      this.box(concourse, x, 2.5, 18.72, 1, 0.8, 0.06, 0xc9e1d5);
    }
    this.escalator(concourse, 8, 0.8, -3, 8);
    this.escalator(concourse, 12, 0.8, -3, 8);
    this.box(concourse, -16, 4.8, -3, 4, 8, 4, 0xb5c7c1);
    this.box(concourse, -16, 2.5, -0.92, 2.5, 3.5, 0.1, 0x668780);
    this.box(concourse, -16, 9, -3, 4.5, 0.4, 4.5, colors.white);

    const platforms = this.groups.get('platform')!;
    for (const z of [-31, -17, -1, 15, 31]) {
      this.box(platforms, 0, -0.7, z, 104, 0.5, 3, 0xc4c5b7);
      for (const dz of [-0.8, 0.8]) this.box(platforms, 0, -0.35, z + dz, 104, 0.16, 0.12, 0x7d8984);
      for (let x = -50; x < 52; x += 2) this.box(platforms, x, -0.4, z, 0.5, 0.16, 2.5, 0x9fa59a);
    }
    for (const [index, z] of [-24, -8, 8, 24].entries()) {
      this.box(platforms, 0, 0, z, 104, 1.2, 9, colors.blue);
      for (const dz of [-4, 4]) this.box(platforms, 0, 0.64, z + dz, 103, 0.08, 0.35, 0xe9d694);
      // Leave an opening beside the sample escalator arrival.
      for (const x of [-34, 34]) {
        this.box(platforms, x, 4, z, 25, 0.35, 6.4, 0xe7e9dc);
        for (const px of [x - 8, x + 8]) this.box(platforms, px, 2.2, z, 0.35, 3.5, 0.35, colors.steel);
      }
      for (const x of [-22, 22]) this.box(platforms, x, 1, z, 4, 0.6, 1, 0x8ba79c);
      this.label(`${index * 2 + 2} · ${index * 2 + 3}`, 48, 2, z, 'platform');
    }
    const bridge = this.groups.get('bridge')!;
    this.box(bridge, -10, 0, 0, 12, 0.8, 67, colors.slab);
    this.box(bridge, -10, 0.48, 0, 8, 0.12, 65, 0xd7dfc1);
    for (const x of [-15.7, -4.3]) {
      this.box(bridge, x, 1.2, 0, 0.18, 1.7, 66, 0xb7c9bc);
      this.box(bridge, x, 2.1, 0, 0.22, 0.16, 67, 0x7e978c);
    }
    this.box(bridge, 0, 0, 27, 32, 0.8, 12, colors.slab);
    for (let x = -3; x < 6; x += 2) this.box(bridge, x, 1.4, 25, 0.8, 1.9, 3, 0x6e8980);
    this.escalator(bridge, -11, 0.5, -13, -8);
    this.label('1F 中央站厅', -25, 1, 29, 'concourse', false, true);
    this.label('3F 南北连络桥', -10, 1, -32, 'bridge', false, true);
    this.label('中央改札', 2, 4, 14, 'concourse');
    this.buildRoof();
    for (const group of [base, ...this.groups.values(), this.roof]) this.batchStaticMeshes(group);
    for (const facility of this.facilities) {
      const target = new T.Mesh(new T.BoxGeometry(9, 6, 8), new T.MeshBasicMaterial({ visible: false }));
      target.position.set(facility.x, 3, facility.z); target.userData.facility = facility;
      this.groups.get(facility.level)!.add(target); this.pickables.push(target);
    }
  }

  private escalator(group: T.Group, x: number, y: number, z: number, rise: number): void {
    const steps: T.Mesh[] = [], rails: T.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const step = this.box(group, x, y + t * rise, z + 5 - t * 10, 2.6, 0.38, 0.85, i % 2 ? 0x91aaa4 : 0xc8d3bf);
      step.userData.dynamic = true; steps.push(step);
    }
    for (const dx of [-1.5, 1.5]) {
      const rail = this.beam(group, new T.Vector3(x + dx, y + 1.4, z + 5), new T.Vector3(x + dx, y + rise + 1.4, z - 5), 0.16, 0x587e7a);
      rail.userData.dynamic = true; rails.push(rail);
    }
    this.escalators.push({ x, y, z, rise, steps, rails });
  }

  private batchStaticMeshes(group: T.Group): void {
    const batches = new Map<T.Material, T.Mesh[]>();
    for (const child of group.children) {
      if (!(child instanceof T.Mesh) || child.userData.dynamic || Array.isArray(child.material)) continue;
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
    const slope = (z: number): number => 2.5 + (z + 30) * 0.15 + Math.cos(z / 60 * Math.PI) * 1.5;
    // Low-poly roof profile: shallow curved slope, separate strips for the skylights.
    for (let x = -55; x < 55; x += 5) {
      for (let z = -30; z < 30; z += 6) {
        const a = slope(z), b = slope(z + 6);
        const vertices = new Float32Array([x, a, z, x + 4.9, a, z, x + 4.9, b, z + 6,
          x, a, z, x + 4.9, b, z + 6, x, b, z + 6]);
        const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(vertices, 3)); geometry.computeVertexNormals();
        const glass = x > -43 && x < 42 && z > -25 && z < 20;
        const material = this.material(glass ? (x % 10 === 0 ? 0x99bdc3 : colors.glass) : colors.roof);
        material.side = T.DoubleSide;
        const mesh = new T.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; this.roof.add(mesh);
      }
    }
    for (const x of [-55, 55]) {
      for (let z = -30; z < 30; z += 6) this.beam(this.roof, new T.Vector3(x, slope(z), z), new T.Vector3(x, slope(z + 6), z + 6), 0.65, colors.white);
    }
    for (const z of [-30, 30]) {
      this.box(this.roof, 0, slope(z), z, 111, 0.85, 0.8, colors.white);
      // Triangular steel truss below the roof edge.
      this.beam(this.roof, new T.Vector3(-54, slope(z) - 3, z), new T.Vector3(54, slope(z) - 3, z), 0.23, colors.steel);
      for (let x = -54; x < 54; x += 9) {
        this.beam(this.roof, new T.Vector3(x, slope(z) - 3, z), new T.Vector3(x + 4.5, slope(z) - 0.5, z), 0.13, colors.steel);
        this.beam(this.roof, new T.Vector3(x + 4.5, slope(z) - 0.5, z), new T.Vector3(x + 9, slope(z) - 3, z), 0.13, colors.steel);
      }
    }
    this.label('OSAKA STATION / 大屋顶', -25, 13, 0, undefined, true, true);
  }

  update(state: MapViewState): void {
    const routeChanged = this.state.route !== state.route;
    this.state = { ...state };
    if (routeChanged) this.buildRoute();
    this.requestRender();
  }
  select(facility: Facility): void {
    this.activeFacility = facility;
    this.selected.clear();
    const ring = new T.Mesh(new T.RingGeometry(2.5, 3.1, 40), new T.MeshBasicMaterial({ color: colors.route, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; this.selected.add(ring); this.requestRender();
  }
  zoom(factor: number): void { this.zoomValue = T.MathUtils.clamp(this.zoomValue * factor, 0.55, 2.8); this.requestRender(); }
  reset(): void { this.zoomValue = 1; this.pan.set(0, 0, 0); this.activeFacility = undefined; this.selected.clear(); this.requestRender(); }
  private levelY(id: LevelId): number {
    const index = this.levels.findIndex(l => l.id === id);
    return this.levels[index]!.y + index * this.displayedExplode * 18;
  }
  private clearRoute(): void {
    this.route.traverse(obj => { if (obj instanceof T.Mesh) { obj.geometry.dispose(); } });
    this.route.clear();
  }
  private buildRoute(): void {
    this.clearRoute();
    const ids = this.state.route; if (!ids) return;
    const points = ids.map(id => { const node = this.nodeById.get(id)!; return new T.Vector3(node.x, this.levelY(node.level) + 1.3, node.z); });
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
    const delta = this.state.explode - this.displayedExplode;
    const animate = Math.abs(delta) > 0.002 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.displayedExplode = animate ? this.displayedExplode + delta * 0.18 : this.state.explode;
    for (const [id, group] of this.groups) {
      group.position.y = this.levelY(id);
      group.visible = this.state.level === 'all' || this.state.level === id;
    }
    for (const escalator of this.escalators) {
      const rise = escalator.rise + Math.sign(escalator.rise) * this.displayedExplode * 18;
      escalator.steps.forEach((step, i) => { step.position.y = escalator.y + i / 13 * rise; });
      escalator.rails.forEach((rail, i) => {
        const x = escalator.x + (i === 0 ? -1.5 : 1.5);
        const a = new T.Vector3(x, escalator.y + 1.4, escalator.z + 5);
        const b = new T.Vector3(x, escalator.y + rise + 1.4, escalator.z - 5);
        rail.position.copy(a).add(b).multiplyScalar(0.5);
        rail.scale.y = a.distanceTo(b) / Math.hypot(10, escalator.rise);
        rail.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.sub(a).normalize());
      });
    }
    this.roof.position.y = 26 + this.displayedExplode * 54;
    this.roof.visible = this.state.roof && this.state.level === 'all';
    this.route.visible = !!this.state.route;
    if (animate && this.state.route) this.buildRoute();
    this.selected.visible = !!this.activeFacility && (this.state.level === 'all' || this.state.level === this.activeFacility.level);
    if (this.activeFacility) this.selected.position.set(this.activeFacility.x, this.levelY(this.activeFacility.level) + 0.9, this.activeFacility.z);
    // Fit around the visible floor envelope; reserve side panels on desktop.
    const mobile = this.width < 761;
    const aspect = this.width / Math.max(1, this.height);
    const usableWidth = mobile ? this.width * 0.91 : Math.max(this.width * 0.45, this.width - 570);
    const targetHeight = 24 + this.displayedExplode * 20;
    const span = Math.max(115, 165 * this.height / usableWidth) / this.zoomValue;
    this.camera.left = -span * aspect / 2; this.camera.right = span * aspect / 2;
    this.camera.top = span / 2; this.camera.bottom = -span / 2;
    // Sample axes: +X follows the tracks eastward, +Z points southward.
    // This fixed quadrant projects the tracks from bottom-left to top-right.
    this.camera.position.copy(new T.Vector3(-180, 180, 180).add(this.pan).add(new T.Vector3(0, targetHeight, 0)));
    this.camera.lookAt(this.pan.clone().add(new T.Vector3(0, targetHeight, 0)));
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld();
    this.scene.updateMatrixWorld(true);
    this.renderer.render(this.scene, this.camera);
    const rect = this.host.getBoundingClientRect();
    for (const label of this.labels) {
      let visible = label.roof ? this.roof.visible : this.state.level === 'all' || this.state.level === label.level;
      if (mobile && this.zoomValue < 1.2 && !label.element.classList.contains('emphasis')) visible = false;
      const point = label.position.clone();
      point.y += label.roof ? this.roof.position.y : label.level ? this.levelY(label.level) : 0;
      point.project(this.camera);
      label.element.hidden = !visible || Math.abs(point.x) > 0.96 || Math.abs(point.y) > 0.94;
      label.element.style.left = `${rect.left + (point.x + 1) * this.width / 2}px`;
      label.element.style.top = `${rect.top + (1 - point.y) * this.height / 2}px`;
    }
    if (animate) this.requestRender();
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
        const candidates = this.pickables.filter(obj => obj.parent?.visible);
        const hit = this.raycaster.intersectObjects(candidates, false)[0];
        if (hit) this.onSelect(hit.object.userData.facility as Facility);
      }
      if (!this.pointers.size) this.down = null;
    });
    canvas.addEventListener('pointercancel', e => { this.pointers.delete(e.pointerId); this.dragged = true; this.down = null; });
  }
}

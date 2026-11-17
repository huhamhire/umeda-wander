import {mkdirSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {geographicBuildings} from '../../src/infrastructure/buildings/index.ts';
import {buildGeographicBuilding} from '../../src/presentation/models/geographic-building-model.ts';
import {exteriorOpenings} from '../../src/infrastructure/district/geographic-map.ts';

// Offline CPU depth buffer over the actual H5 meshes, not a painter-sorted box sketch.
// No browser, WebGL, photographic texture or external renderer is required.
const ids = ['hanshin-dept', 'hankyu-dept', 'jp-tower', 'hankyu-sanbangai', 'daimaru', 'yodobashi', 'grand-front-south', 'lucua-1100'];
const width = 1200;
const height = 1840;
const rgb = Buffer.alloc(width * height * 3);
for (let i = 0; i < rgb.length; i += 3) {
  rgb[i] = 247;
  rgb[i + 1] = 246;
  rgb[i + 2] = 240;
}
const depth = new Float64Array(width * height).fill(-Infinity);
const light = new T.Vector3(-.5, 1, .8).normalize();
const project = (p: T.Vector3) => ({x: p.x * .86 + p.z * .5, y: p.z * .43 - p.x * .25 - p.y * .86,
  depth: -p.x * .43 + p.y * .4948 + p.z * .7396});
const labels: string[] = [];
for (const [panel, id] of ids.entries()) {
  const building = geographicBuildings.find(b => b.id === id)!;
  const model = buildGeographicBuilding(building, exteriorOpenings);
  model.updateMatrixWorld(true);
  const meshes: T.Mesh[] = [];
  model.traverse(o => {
    if (o instanceof T.Mesh) {
      meshes.push(o);
    }
  });
  const bounds: ReturnType<typeof project>[] = [];
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      bounds.push(project(new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld)));
    }
  }
  const minX = Math.min(...bounds.map(p => p.x));
  const maxX = Math.max(...bounds.map(p => p.x));
  const minY = Math.min(...bounds.map(p => p.y));
  const maxY = Math.max(...bounds.map(p => p.y));
  const scale = Math.min(540 / (maxX - minX), 350 / (maxY - minY));
  const originX = panel % 2 * 600 + (600 - (maxX - minX) * scale) / 2;
  const originY = Math.floor(panel / 2) * 460 + 58 + (350 - (maxY - minY) * scale) / 2;
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    const index = geometry.index;
    const count = index?.count ?? positions.count;
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as T.MeshStandardMaterial;
    const color = material.color.clone().convertLinearToSRGB();
    for (let i = 0; i < count; i += 3) {
      const vertices = [0, 1, 2].map(j => new T.Vector3()
        .fromBufferAttribute(positions, index ? index.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld));
      const normal = vertices[1]!.clone().sub(vertices[0]!).cross(vertices[2]!.clone().sub(vertices[0]!)).normalize();
      const shade = .66 + .34 * Math.max(0, normal.dot(light));
      const [a, b, c] = vertices.map(p => {
        const q = project(p);
        return {x: originX + (q.x - minX) * scale, y: originY + (q.y - minY) * scale, depth: q.depth};
      }) as [ReturnType<typeof project>, ReturnType<typeof project>, ReturnType<typeof project>];
      const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
      if (Math.abs(determinant) < 1e-8) {
        continue;
      }
      const left = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
      const right = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const top = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
      const bottom = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const u = ((b.y - c.y) * (x + .5 - c.x) + (c.x - b.x) * (y + .5 - c.y)) / determinant;
          const v = ((c.y - a.y) * (x + .5 - c.x) + (a.x - c.x) * (y + .5 - c.y)) / determinant;
          if (u < 0 || v < 0 || u + v > 1) {
            continue;
          }
          const z = u * a.depth + v * b.depth + (1 - u - v) * c.depth;
          const pixel = y * width + x;
          if (z <= depth[pixel]!) {
            continue;
          }
          depth[pixel] = z;
          rgb[pixel * 3] = Math.round(color.r * shade * 255);
          rgb[pixel * 3 + 1] = Math.round(color.g * shade * 255);
          rgb[pixel * 3 + 2] = Math.round(color.b * shade * 255);
        }
      }
    }
  }
  const x = panel % 2 * 600 + 24;
  const y = Math.floor(panel / 2) * 460;
  labels.push(`<text x="${x}" y="${y + 30}">${building.name.replaceAll('&', '&amp;')}</text>`);
  labels.push(`<text x="${x}" y="${y + 443}" font-size="13">H5 实际网格 · CPU 深度遮挡 · 各建筑独立缩放</text>`);
}
mkdirSync('build/geography', {recursive: true});
writeFileSync('build/geography/building-details.ppm', Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), rgb]));
execFileSync('magick', ['build/geography/building-details.ppm', 'build/geography/building-details-base.png']);
writeFileSync('build/geography/building-details.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g font-family="Microsoft YaHei,sans-serif" font-size="18" fill="#31524d">${labels.join('')}</g></svg>`);
execFileSync('magick', ['-background', 'none', 'build/geography/building-details.svg', 'build/geography/building-details-labels.png']);
execFileSync('magick', ['build/geography/building-details-base.png', 'build/geography/building-details-labels.png', '-composite', 'build/geography/building-details.png']);
console.log('Wrote actual-mesh building-details.png');

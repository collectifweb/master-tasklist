// Spike « Orée voxel » — three.js orthographique, voxels instanciés, rendu à la demande.
import * as THREE from 'three';

/* =========================================================================
   Configuration, état, instrumentation
   ========================================================================= */
const QS = new URLSearchParams(location.search);
const DEBUG = QS.has('debug');
const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
let RM = mqRM.matches || QS.get('rm') === '1';
let ambientOn = QS.get('amb') !== '0';
const AMB_MS = 1000 / Number(QS.get('ambfps') || 30);
const SLOW = Number(QS.get('slow') || 1); // ralenti réservé aux captures
const D = (ms) => ms * SLOW;
const MANUAL = QS.has('manual'); // horloge pilotée par le test (captures image par image)
let vnow = 0;
const clock = () => (MANUAL ? vnow : performance.now());

const perf = (window.__perf = { renders: 0, stamps: [], cpuMs: [], firstRender: 0, shadowUpdates: 0, t0: performance.now() });

let rs = 7;
const rnd = () => { rs |= 0; rs = (rs + 0x6d2b79f5) | 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

/* Palette : esprit DESIGN.md 006 (terre ocre, sauge, bois blond, verre solaire, crème ; braise = menaces seulement) */
const P = {
  grass: 0x9db46c, grass2: 0x8ba862, grassDry: 0xb4b673, tuft: 0x7d9b57, flowerA: 0xfff3d0, flowerB: 0xf3c879, flowerC: 0x9fd0cc,
  path: 0xdcc193, plot: 0xc39a6b,
  soilTop: 0xb4784a, soil: 0x96613e, soilDeep: 0x784b33, rock: 0x8c8274, rockD: 0x72695e,
  tilled: 0x7a4b31, ridge: 0x93603e, mulch: 0xe6cf8f,
  wood: 0xd9b277, woodD: 0xb68a54, woodDD: 0x86613f, cream: 0xf2e6c8, plaster: 0xf0e2c2,
  stone: 0xb8aa92, stoneD: 0x9b8d78, stoneL: 0xcabda4,
  roof: 0x3f6047, roof2: 0x55795a, roofB: 0x7a4a31,
  metal: 0xdcd5c6, metalL: 0xe8e2d4, metalD: 0xa99f8d,
  glass: 0x8fd3cb, glassDeep: 0x2d7473, tech: 0x58a9a4, techGlow: 0x7fe0d6,
  water: 0x4f9fb4, waterL: 0x9ad7da, foam: 0xf4fbf8,
  leaf: 0x6f8f52, leafD: 0x56774a, pine: 0x47694b, pineD: 0x38573e,
  maple: 0xdba54a, maple2: 0xcb8d3c, birch: 0x9cb565, trunk: 0x86613f, birchBark: 0xece6d8,
  wheat: 0xe8c66c, wheatD: 0xc9a14c, squash: 0xe2a54d, squashD: 0xc98a36, sprout: 0x9fca6c, peas: 0x7fae5a,
  warm: 0xffc46e, warmW: 0xffd89a,
  hive: 0xf3ead6,
};

const tmpHSL = { h: 0, s: 0, l: 0 };
function col(hex, j = 0.035) {
  const c = new THREE.Color(hex);
  if (j) { c.getHSL(tmpHSL); c.setHSL(tmpHSL.h, tmpHSL.s, clamp(tmpHSL.l * (1 + (rnd() * 2 - 1) * j * 2), 0, 1)); }
  return c;
}

/* =========================================================================
   Moteur : renderer, scène, caméra, lumières
   ========================================================================= */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QS.get('aa') !== '0', alpha: true, powerPreference: 'low-power' });
const DPR = Math.min(window.devicePixelRatio || 1, Number(QS.get('dpr') || 2));
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // PCF + radius = ombres douces (PCFSoft est déprécié en r18x)
renderer.shadowMap.autoUpdate = false;          // carte d'ombres recalculée seulement quand le monde change
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 300);
const view = { az: Math.PI / 4, el: THREE.MathUtils.degToRad(36), k: 0.05, W: 1, H: 1, availTop: 0, availBot: 0, shake: 0, shakeT: 0 };

const hemi = new THREE.HemisphereLight(0xd4e6ec, 0x94744e, 1.35);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
const SM = Number(QS.get('sm') || 2048);
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -12.5, right: 12.5, top: 12.5, bottom: -12.5, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3.2;
scene.add(hemi, sun, sun.target);

const U = { night: { value: 0 } };
let shadowDirty = true;

/* Matériau voxel : Lambert + biseau lumineux sur les arêtes + occlusion de contact au sol (dans le shader) */
function patchVoxel(mat, mode) {
  mat.customProgramCacheKey = () => 'vox-' + mode;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = U.night;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLoc; varying vec3 vScl; varying vec3 vLN; varying float vWY;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vLoc = position; vLN = normal;
        #ifdef USE_INSTANCING
          vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vWY = (modelMatrix * instanceMatrix * vec4(position, 1.0)).y;
        #else
          vScl = vec3(1.0); vWY = (modelMatrix * vec4(position, 1.0)).y;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLoc; varying vec3 vScl; varying vec3 vLN; varying float vWY; uniform float uNight;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 glowBase = diffuseColor.rgb;
        {
          vec3 an = abs(vLN);
          vec3 d = (0.5 - abs(vLoc)) * vScl;
          float de = min(an.x > 0.5 ? 1e3 : d.x, min(an.y > 0.5 ? 1e3 : d.y, an.z > 0.5 ? 1e3 : d.z));
          float aa = fwidth(de) * 1.25;
          float edge = 1.0 - smoothstep(0.032 - aa, 0.032 + aa, de);
          float up = step(0.5, vLN.y);
          diffuseColor.rgb *= 1.0 + edge * mix(0.08, 0.2, up);
          float ao = vWY >= 0.0 ? mix(0.66, 1.0, smoothstep(0.0, 0.6, vWY)) : mix(0.5, 1.0, smoothstep(-4.4, -0.35, vWY));
          diffuseColor.rgb *= mix(1.0, ao, 1.0 - up);
        }
        ${mode === 'glow' ? 'diffuseColor.rgb *= mix(0.42, 0.1, uNight);' : ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        ${mode === 'glow' ? 'totalEmissiveRadiance += glowBase * (0.1 + uNight * 2.4);' : ''}
        ${mode === 'glass' ? 'totalEmissiveRadiance += glowBase * uNight * 0.55;' : ''}`);
  };
  return mat;
}
const MAT = {
  solid: patchVoxel(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'solid'),
  glass: patchVoxel(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false }), 'glass'),
  glow: patchVoxel(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'glow'),
};
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.18 });
const BOX = new THREE.BoxGeometry(1, 1, 1);

/* Texture radiale (halos, ombres portées douces) générée sur canvas */
function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const TEX_HALO = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
const TEX_BLOB = radialTex('rgba(30,22,12,0.75)', 'rgba(30,22,12,0)');

/* =========================================================================
   Constructeur de voxels → InstancedMesh (1 à 3 appels de dessin par entité)
   ========================================================================= */
class VB {
  constructor() { this.lists = { solid: [], glass: [], glow: [] }; this.tags = {}; }
  box(x0, y0, z0, x1, y1, z1, color, o = {}) {
    const kind = o.kind || 'solid';
    const c = color instanceof THREE.Color ? color : col(color, o.j ?? 0.035);
    const L = this.lists[kind];
    L.push({ x0, y0, z0, x1, y1, z1, c, rot: o.rot || null });
    if (o.tag != null) (this.tags[o.tag] ||= []).push([kind, L.length - 1]);
    return L.length - 1;
  }
  c(cx, y0, cz, w, h, d, color, o) { return this.box(cx - w / 2, y0, cz - d / 2, cx + w / 2, y0 + h, cz + d / 2, color, o); }
  top() { let m = 0; for (const k in this.lists) for (const b of this.lists[k]) m = Math.max(m, b.y1); return m; }
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function boxMatrix(b, out = _m) {
  _p.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
  _s.set(Math.max(1e-3, b.x1 - b.x0), Math.max(1e-3, b.y1 - b.y0), Math.max(1e-3, b.z1 - b.z0));
  if (b.rot) _q.setFromEuler(_e.set(b.rot[0], b.rot[1], b.rot[2])); else _q.identity();
  return out.compose(_p, _q, _s);
}
function buildIM(list, mat, cast, recv) {
  const im = new THREE.InstancedMesh(BOX, mat, list.length);
  list.forEach((b, i) => { im.setMatrixAt(i, boxMatrix(b)); im.setColorAt(i, b.c); });
  im.castShadow = cast; im.receiveShadow = recv;
  im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

const entities = new Map();
const pickables = [];
function makeEntity(id, vb, o = {}) {
  const g = new THREE.Group();
  if (o.pos) g.position.set(...o.pos);
  const meshes = {};
  for (const kind of ['solid', 'glass', 'glow']) {
    const L = vb.lists[kind]; if (!L.length) continue;
    const im = buildIM(L, MAT[kind], kind !== 'glass' && o.cast !== false, kind !== 'glass');
    meshes[kind] = im; g.add(im);
  }
  const ent = { id, name: o.name, desc: o.desc, tag: o.tag || '', group: g, meshes, vb, top: vb.top(), selectable: !!o.name, outline: null, kind: o.kind || 'building' };
  for (const m of Object.values(meshes)) { m.userData.entity = ent; if (ent.selectable) pickables.push(m); }
  scene.add(g);
  entities.set(id, ent);
  return ent;
}

/* =========================================================================
   Monde : socle continu 16×16 (ferme 12×12 + couronne de 2 cases)
   ========================================================================= */
const MIN = -2, MAX = 13;
const wx = (i) => i - 5.5, wz = (j) => j - 5.5;
const key = (i, j) => i + ',' + j;
const removed = new Set();
for (const [ci, cj, di, dj] of [[MIN, MIN, 1, 1], [MAX, MIN, -1, 1], [MIN, MAX, 1, -1], [MAX, MAX, -1, -1]]) {
  removed.add(key(ci, cj)); removed.add(key(ci + di, cj)); removed.add(key(ci, cj + dj));
}
['-2,5', '-2,6', '13,4', '3,13', '2,13', '11,13', '13,9'].forEach((k) => removed.add(k));
const inIsland = (i, j) => i >= MIN && i <= MAX && j >= MIN && j <= MAX && !removed.has(key(i, j));

// Distance au bord (pour l'effilement du dessous de l'île)
const dist = new Map();
for (let i = MIN; i <= MAX; i++) for (let j = MIN; j <= MAX; j++) if (inIsland(i, j)) dist.set(key(i, j), 99);
for (let pass = 0; pass < 8; pass++) for (const k of dist.keys()) {
  const [i, j] = k.split(',').map(Number);
  let d = 99;
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = key(i + a, j + b); d = Math.min(d, dist.has(n) ? dist.get(n) + 1 : 0); }
  dist.set(k, Math.min(dist.get(k), d));
}

// Cases spéciales
const cellType = new Map();
const setType = (i, j, t) => cellType.set(key(i, j), t);
// chemin continu : allée nord-sud depuis la porte du Bastion, boucle autour des parcelles, embranchements
for (let j = -1; j <= 4; j++) setType(5, j, 'path');
for (let i = 4; i <= 10; i++) { setType(i, 4, 'path'); setType(i, 10, 'path'); }
for (let j = 4; j <= 10; j++) { setType(4, j, 'path'); setType(10, j, 'path'); }
for (let i = 0; i <= 3; i++) setType(i, 4, 'path');
setType(11, 4, 'path');
setType(5, 11, 'path'); setType(5, 13, 'path');
setType(3, 10, 'path'); setType(3, 6, 'path');
setType(7, 2, 'path'); setType(7, 3, 'path'); setType(1, 2, 'path'); setType(1, 3, 'path'); setType(10, 2, 'path'); setType(10, 3, 'path');
// parcelles 2×2
const PARCELS = [
  { id: 'p-ail', i: 5, j: 5, stage: 'semis', name: 'Parcelle d’ail', desc: 'Semée sous paille avant le gel', tag: 'Semis' },
  { id: 'p-pois', i: 8, j: 5, stage: 'pousses', name: 'Parcelle d’épinards', desc: 'Les pousses tiennent au froid', tag: 'Pousses' },
  { id: 'p-ble', i: 5, j: 8, stage: 'ble', name: 'Parcelle de blé', desc: 'Prête à récolter', tag: 'Mûre' },
  { id: 'p-courge', i: 8, j: 8, stage: 'courge', name: 'Parcelle de courges', desc: 'Prête à récolter', tag: 'Mûre' },
];
for (const p of PARCELS) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) setType(p.i + a, p.j + b, 'tilled');
// terrain à bâtir
for (let a = 1; a <= 2; a++) for (let b = 9; b <= 10; b++) setType(a, b, 'plot');
// ruisseau (couronne sud) puis cascade sur le bord
const STREAM = [];
for (let i = 0; i <= 8; i++) { setType(i, 12, i === 5 ? 'bridge' : 'water'); STREAM.push([i, 12]); }
setType(8, 13, 'water'); STREAM.push([8, 13]);
// petits monticules dans la couronne
const raise = new Map();
for (const k of ['-1,-1', '0,-1', '-2,0', '-1,0', '-2,1', '12,0', '13,0', '12,1', '13,1', '12,-1', '13,10', '12,11', '13,11', '12,12']) raise.set(k, 0.25);
for (const k of ['-2,0', '13,0', '13,1']) raise.set(k, 0.5);
const topH = (i, j) => raise.get(key(i, j)) || 0;

function buildTerrain() {
  const vb = new VB();
  for (const k of dist.keys()) {
    const [i, j] = k.split(',').map(Number);
    const x = wx(i), z = wz(j), d = dist.get(k), t = cellType.get(k) || 'grass';
    const h = topH(i, j);
    const x0 = x - 0.5, x1 = x + 0.5, z0 = z - 0.5, z1 = z + 0.5;
    let gb = h - R(0.22, 0.32);
    if (t === 'grass') {
      const c = rnd() < 0.12 ? P.grassDry : rnd() < 0.45 ? P.grass2 : P.grass;
      vb.box(x0, gb, z0, x1, h, z1, c, { j: 0.04 });
    } else if (t === 'path') {
      vb.box(x0, gb, z0, x1, -0.05, z1, P.path, { j: 0.03 });
    } else if (t === 'plot') {
      vb.box(x0, gb, z0, x1, -0.04, z1, P.plot, { j: 0.03 });
    } else if (t === 'tilled') {
      vb.box(x0, gb, z0, x1, -0.08, z1, P.tilled, { j: 0.02 });
    } else if (t === 'water' || t === 'bridge') {
      gb = -0.5; vb.box(x0, gb, z0, x1, -0.2, z1, P.water, { j: 0.02 });
    }
    // strates de terre (tranche visible)
    const tsB = -0.95 + R(-0.12, 0.12), sB = -1.85 + R(-0.15, 0.15);
    const bottom = [-1.7, -2.5, -3.2, -3.7, -4.1][Math.min(d, 4)] + R(-0.25, 0.15);
    vb.box(x0, tsB, z0, x1, gb, z1, P.soilTop, { j: 0.04 });
    vb.box(x0, Math.max(sB, bottom), z0, x1, tsB, z1, P.soil, { j: 0.04 });
    if (bottom < sB) {
      vb.box(x0, Math.max(bottom, -2.7), z0, x1, sB, z1, P.soilDeep, { j: 0.05 });
      if (bottom < -2.7) vb.box(x0, bottom, z0, x1, -2.7, z1, rnd() < 0.5 ? P.rock : P.rockD, { j: 0.05 });
    }
    // détails sur les faces extérieures : mousse qui coule, pierres incrustées, racines
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inIsland(i + a, j + b)) continue;
      const fx = x + a * 0.5, fz = z + b * 0.5;
      const along = (u) => (a !== 0 ? [fx + a * 0.02, z + u] : [x + u, fz + b * 0.02]);
      if (t === 'grass' && rnd() < 0.7) {
        const u = R(-0.3, 0.3), w = R(0.18, 0.45), hh = R(0.12, 0.42);
        const [px, pz] = along(u);
        const sx = a !== 0 ? 0.05 : w, sz = a !== 0 ? w : 0.05;
        vb.c(px, gb - hh + 0.02, pz, sx, hh, sz, rnd() < 0.5 ? P.grass2 : P.tuft, { j: 0.04 });
      }
      if (rnd() < 0.45) {
        const u = R(-0.32, 0.32), s = R(0.16, 0.3);
        const [px, pz] = along(u);
        vb.c(px, R(-2.2, -0.9), pz, a !== 0 ? 0.08 : s, s * 0.8, a !== 0 ? s : 0.08, pick([P.rock, P.stoneD, P.rockD]), { j: 0.05 });
      }
      if (d === 0 && rnd() < 0.25) {
        const u = R(-0.3, 0.3); const [px, pz] = along(u);
        vb.c(px, bottom - R(0.2, 0.6), pz, 0.06, 0.6, 0.06, P.woodDD, { j: 0.05 });
      }
    }
    // touffes d'herbe et fleurs
    if (t === 'grass' && rnd() < 0.55) {
      const n = 1 + Math.floor(rnd() * 3);
      for (let q = 0; q < n; q++) {
        const fx = x + R(-0.38, 0.38), fz = z + R(-0.38, 0.38);
        if (rnd() < 0.25) vb.c(fx, h, fz, 0.07, 0.07, 0.07, pick([P.flowerA, P.flowerB, P.flowerC]), { j: 0.02 });
        else vb.c(fx, h, fz, 0.06, R(0.1, 0.18), 0.06, P.tuft, { j: 0.06 });
      }
    }
    // bordures de chemin : galets
    if ((t === 'path') && rnd() < 0.35) vb.c(x + R(-0.4, 0.4), -0.05, z + R(-0.4, 0.4), 0.1, 0.05, 0.08, P.stoneL, { j: 0.05 });
  }
  return makeEntity('terrain', vb, { kind: 'terrain' });
}

/* ---------- Décor : arbres, haie, lanternes, pont, ruches, cascade ---------- */
function pine(vb, x, y, z, s = 1) {
  vb.c(x, y, z, 0.18 * s, 0.4 * s, 0.18 * s, P.trunk);
  const tiers = [[0.98, 0.42], [0.78, 0.4], [0.58, 0.38], [0.36, 0.34], [0.16, 0.22]];
  let yy = y + 0.3 * s;
  tiers.forEach(([w, h], k) => { vb.c(x, yy, z, w * s, h * s, w * s, k % 2 ? P.pineD : P.pine, { j: 0.05 }); yy += h * s * 0.82; });
}
function maple(vb, x, y, z, s = 1, cA = P.maple, cB = P.maple2) {
  vb.c(x, y, z, 0.2 * s, 0.7 * s, 0.2 * s, P.trunk);
  vb.c(x, y + 0.55 * s, z, 1.0 * s, 0.75 * s, 1.0 * s, cA, { j: 0.05 });
  vb.c(x + 0.22 * s, y + 1.05 * s, z - 0.12 * s, 0.68 * s, 0.45 * s, 0.68 * s, cB, { j: 0.05 });
  vb.c(x - 0.3 * s, y + 0.8 * s, z + 0.22 * s, 0.6 * s, 0.5 * s, 0.6 * s, cB, { j: 0.05 });
  vb.c(x + 0.32 * s, y + 0.65 * s, z + 0.3 * s, 0.5 * s, 0.42 * s, 0.5 * s, cA, { j: 0.05 });
}
function birch(vb, x, y, z, s = 1) {
  vb.c(x, y, z, 0.14 * s, 0.9 * s, 0.14 * s, P.birchBark, { j: 0.02 });
  vb.c(x + 0.071 * s, y + 0.3 * s, z, 0.02, 0.06, 0.08, P.woodDD);
  vb.c(x, y + 0.7 * s, z, 0.7 * s, 0.6 * s, 0.7 * s, P.birch, { j: 0.05 });
  vb.c(x - 0.12 * s, y + 1.15 * s, z + 0.08 * s, 0.46 * s, 0.4 * s, 0.46 * s, P.leaf, { j: 0.05 });
}
function bush(vb, x, y, z, s = 1, c = P.leaf) {
  vb.c(x, y, z, 0.56 * s, 0.38 * s, 0.5 * s, c, { j: 0.05 });
  vb.c(x + 0.06 * s, y + 0.3 * s, z - 0.04 * s, 0.34 * s, 0.2 * s, 0.32 * s, c, { j: 0.06 });
}
function rock(vb, x, y, z, s = 1) {
  vb.c(x, y - 0.02, z, 0.42 * s, 0.24 * s, 0.34 * s, P.stoneD, { j: 0.05 });
  vb.c(x + 0.08 * s, y + 0.2 * s, z - 0.02 * s, 0.24 * s, 0.14 * s, 0.2 * s, P.stone, { j: 0.05 });
}
const LANTERNS = [];
function lantern(vb, x, z, y = 0) {
  vb.c(x, y, z, 0.1, 1.05, 0.1, P.woodDD);
  vb.c(x, y + 1.02, z, 0.24, 0.05, 0.24, P.woodDD);
  vb.c(x, y + 0.82, z, 0.17, 0.2, 0.17, P.warm, { kind: 'glow', j: 0 });
  vb.c(x, y + 1.07, z, 0.12, 0.06, 0.12, P.woodDD);
  LANTERNS.push(new THREE.Vector3(x, y + 0.92, z));
}

function buildDecor() {
  const vb = new VB();
  // haie taillée côté ouest
  for (let j = 1; j <= 11; j++) {
    if (j === 4) continue;
    const x = wx(-1), z = wz(j);
    vb.c(x, 0, z, 0.72, 0.62 + R(-0.05, 0.08), 1.0, P.leafD, { j: 0.05 });
    vb.c(x + R(-0.08, 0.08), 0.6, z + R(-0.2, 0.2), 0.5, 0.18, 0.5, P.leaf, { j: 0.06 });
  }
  // arbres de la couronne
  pine(vb, wx(-2), 0.5, wz(0), 1.25); pine(vb, wx(-1), 0.25, wz(-1), 1.0);
  maple(vb, wx(-2) + 0.1, 0.25, wz(1) + 0.3, 0.85);
  pine(vb, wx(-2), 0, wz(3), 0.95); birch(vb, wx(-2), 0, wz(8), 1.0); pine(vb, wx(-2), 0, wz(10), 1.05);
  maple(vb, wx(12), 0.25, wz(-1), 0.95); pine(vb, wx(13), 0.5, wz(1), 1.3); pine(vb, wx(13), 0.5, wz(0) - 0.2, 0.9);
  maple(vb, wx(12), 0.25, wz(1) + 0.2, 0.75, P.maple2, P.maple);
  birch(vb, wx(13), 0, wz(3), 0.9); maple(vb, wx(12) + 0.2, 0, wz(6), 0.9); pine(vb, wx(13), 0, wz(7), 1.0);
  birch(vb, wx(12), 0.25, wz(11) + 0.1, 0.85); maple(vb, wx(13), 0.25, wz(10), 0.8, P.maple2, P.maple);
  // buissons et rochers bas à l'avant (lisibilité)
  bush(vb, wx(1), 0, wz(13), 0.9); bush(vb, wx(4), 0, wz(13) + 0.1, 0.8, P.leafD); bush(vb, wx(9), 0, wz(13), 0.9);
  bush(vb, wx(12), 0.25, wz(12) - 0.1, 0.8, P.leafD); bush(vb, wx(11), 0, wz(12), 0.7);
  rock(vb, wx(-1), 0, wz(12), 1.1); rock(vb, wx(10), 0, wz(13), 0.9); rock(vb, wx(13), 0, wz(5), 0.8); rock(vb, wx(0), 0, wz(11), 0.7);
  bush(vb, wx(0), 0.25, wz(-1), 0.8); bush(vb, wx(11), 0, wz(-1) + 0.1, 0.7, P.leafD);
  bush(vb, wx(3), 0, wz(-1), 0.6, P.leafD); bush(vb, wx(8), 0, wz(-1), 0.6);
  // pont de bois sur le ruisseau
  const bx = wx(5), bz = wz(12);
  for (let k = 0; k < 6; k++) vb.c(bx, -0.08 + (k === 0 || k === 5 ? 0 : 0.04), bz - 0.5 + 0.085 + k * 0.166, 0.86, 0.1, 0.15, P.wood, { j: 0.06 });
  for (const sx of [-0.42, 0.42]) { vb.c(bx + sx, 0.0, bz - 0.45, 0.07, 0.42, 0.07, P.woodD); vb.c(bx + sx, 0.0, bz + 0.45, 0.07, 0.42, 0.07, P.woodD); vb.c(bx + sx, 0.36, bz, 0.07, 0.06, 0.98, P.woodD); }
  // banc-belvédère au bout de l'allée
  vb.c(wx(5), 0, wz(13) + 0.2, 0.7, 0.2, 0.08, P.woodDD); vb.c(wx(5), 0.2, wz(13) + 0.2, 0.8, 0.07, 0.3, P.wood);
  // ruches au bord est
  for (const j of [6, 8]) { const x = wx(11), z = wz(j); vb.c(x, 0, z, 0.5, 0.12, 0.5, P.woodD); vb.c(x, 0.12, z, 0.42, 0.42, 0.42, P.hive, { j: 0.03 }); vb.c(x, 0.36, z, 0.44, 0.03, 0.44, P.flowerB); vb.c(x, 0.54, z, 0.5, 0.08, 0.5, P.roof2); }
  // bûcher près du silo
  for (let r = 0; r < 3; r++) for (let q = 0; q < 4 - r; q++) vb.c(wx(3) - 0.3 + q * 0.2 + r * 0.1, r * 0.17, wz(1), 0.17, 0.17, 0.8, q % 2 ? P.woodD : P.wood, { j: 0.06 });
  // caisses près de l'entrepôt
  vb.c(wx(9) - 0.1, 0, wz(1), 0.45, 0.45, 0.45, P.wood); vb.c(wx(9) + 0.1, 0.45, wz(1) + 0.05, 0.35, 0.35, 0.35, P.woodD); vb.c(wx(9) + 0.25, 0, wz(2) - 0.2, 0.35, 0.3, 0.35, P.wood);
  // pompe d'irrigation au centre des parcelles + tuyaux
  const px = wx(7), pz = wz(7);
  vb.c(px, 0, pz, 0.5, 0.18, 0.5, P.stone); vb.c(px, 0.18, pz, 0.28, 0.5, 0.28, P.metal); vb.c(px, 0.68, pz, 0.4, 0.08, 0.4, P.tech, { j: 0 });
  vb.c(px, 0.76, pz, 0.12, 0.12, 0.12, P.techGlow, { kind: 'glow', j: 0 });
  vb.c(px, 0.02, pz, 4.6, 0.07, 0.09, P.tech, { j: 0.02 }); vb.c(px, 0.02, pz, 0.09, 0.07, 4.6, P.tech, { j: 0.02 });
  // lanternes
  lantern(vb, wx(4) - 0.35, wz(3) + 0.35); lantern(vb, wx(11) + 0.3, wz(3) + 0.35); lantern(vb, wx(3) + 0.35, wz(11) - 0.35);
  lantern(vb, wx(11) - 0.2, wz(10) + 0.3); lantern(vb, wx(6) - 0.3, wz(-1) + 0.1);
  // cascade sur la tranche sud
  const cx = wx(8), cz = wz(13) + 0.5;
  for (let k = 0; k < 12; k++) {
    const y1 = -0.2 - k * 0.32, y0 = y1 - 0.34;
    vb.box(cx - 0.42, y0, cz - 0.02, cx + 0.42, y1, cz + 0.1 + k * 0.012, k % 3 === 0 ? P.waterL : P.water, { j: 0.03 });
  }
  for (let k = 0; k < 7; k++) vb.c(cx + R(-0.6, 0.6), R(-4.5, -4.1), cz + R(-0.1, 0.5), R(0.3, 0.6), R(0.2, 0.4), R(0.3, 0.5), P.foam, { j: 0.02 });
  // halos des lanternes / cristal
  return makeEntity('decor', vb, { kind: 'decor' });
}

/* ---------- Bâtiments ---------- */
function gableRoof(vb, W, D, y, color, gableC, steps = 5, overX = 0.16) {
  // toit à pignon en escalier ; arête le long de X
  const layers = []; for (let s = 0; s < steps; s++) layers.push([D + 0.36 - s * ((D + 0.2) / steps), 0.2]);
  for (const [d, h] of layers) {
    vb.c(0, y, 0, W + overX * 2, h, Math.max(0.16, d), color, { j: 0.03 });
    if (d - 0.36 > 0.1) for (const sx of [-1, 1]) vb.c(sx * (W / 2 + overX + 0.005), y, 0, 0.012, h, Math.max(0.05, d - 0.36), gableC, { j: 0.03 });
    y += h;
  }
  return y;
}
function bSilo() {
  const b = new VB();
  b.c(0, 0, 0, 1.9, 0.18, 1.9, P.stoneD);
  for (let k = 0; k < 4; k++) {
    const y0 = 0.18 + k * 0.85, c = k % 2 ? P.metal : P.metalL;
    b.c(0, y0, 0, 1.5, 0.85, 1.5, c, { j: 0.015 }); b.c(0, y0, 0, 1.72, 0.85, 1.12, c, { j: 0.015 }); b.c(0, y0, 0, 1.12, 0.85, 1.72, c, { j: 0.015 });
  }
  for (let k = 1; k < 4; k++) { const y = 0.18 + k * 0.85 - 0.04; b.c(0, y, 0, 1.53, 0.08, 1.53, P.metalD); b.c(0, y, 0, 1.75, 0.08, 1.15, P.metalD); b.c(0, y, 0, 1.15, 0.08, 1.75, P.metalD); }
  b.c(0, 3.58, 0, 1.56, 0.22, 1.56, P.roof2); b.c(0, 3.58, 0, 1.78, 0.22, 1.18, P.roof2); b.c(0, 3.58, 0, 1.18, 0.22, 1.78, P.roof2);
  b.c(0, 3.8, 0, 1.2, 0.2, 1.2, P.roof); b.c(0, 4.0, 0, 0.7, 0.18, 0.7, P.roof2); b.c(0, 4.18, 0, 0.24, 0.22, 0.24, P.techGlow, { kind: 'glow', j: 0 });
  for (let y = 0.35; y < 3.5; y += 0.28) b.c(0.3, y, 0.88, 0.34, 0.05, 0.06, P.woodD, { j: 0.02 });
  b.c(0.13, 0.18, 0.89, 0.05, 3.4, 0.06, P.woodDD); b.c(0.47, 0.18, 0.89, 0.05, 3.4, 0.06, P.woodDD);
  b.c(-0.35, 0.18, 0.87, 0.42, 0.62, 0.05, P.woodDD); // trappe
  return b;
}
function bTower() {
  const b = new VB();
  b.c(0, 0, 0, 1.0, 0.32, 1.0, P.stoneD); b.c(0, 0.32, 0, 0.86, 0.12, 0.86, P.stone);
  for (let s = 0; s < 4; s++) {
    const inset = 0.33 - s * 0.045, y0 = 0.44 + s * 0.98;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.c(sx * inset, y0, sz * inset, 0.12, 1.0, 0.12, P.woodD, { j: 0.03 });
    const w = inset * 2 + 0.12;
    b.c(0, y0 + 0.86, inset, w, 0.07, 0.06, P.wood); b.c(0, y0 + 0.86, -inset, w, 0.07, 0.06, P.wood);
    b.c(inset, y0 + 0.86, 0, 0.06, 0.07, w, P.wood); b.c(-inset, y0 + 0.86, 0, 0.06, 0.07, w, P.wood);
    b.c(0, y0 + 0.45, inset + 0.01, w * 1.05, 0.05, 0.04, P.woodD, { rot: [0, 0, 0.62 * (s % 2 ? 1 : -1)] });
    b.c(inset + 0.01, y0 + 0.45, 0, 0.04, 0.05, w * 1.05, P.woodD, { rot: [0.62 * (s % 2 ? -1 : 1), 0, 0] });
  }
  b.c(0, 4.36, 0, 0.82, 0.12, 0.82, P.wood); b.c(0, 4.48, 0, 0.46, 0.2, 0.46, P.metal);
  b.c(0, 4.68, 0, 0.09, 1.0, 0.09, P.metalD);
  b.c(0, 5.2, 0, 0.34, 0.34, 0.34, P.techGlow, { kind: 'glow', j: 0, rot: [0.615, Math.PI / 4, 0] });
  b.c(0, 5.66, 0, 0.05, 0.25, 0.05, P.metalD);
  for (const sx of [-1, 1]) { b.c(sx * 0.62, 1.55, 0, 0.5, 0.05, 0.62, P.glassDeep, { rot: [0, 0, sx * -0.55], j: 0.02 }); b.c(sx * 0.6, 1.53, 0, 0.53, 0.03, 0.66, P.metalD, { rot: [0, 0, sx * -0.55] }); }
  return b;
}
function bWarehouse() {
  const b = new VB(); const W = 2.6, D = 1.6, H = 1.5;
  b.c(0, 0, 0, 2.9, 0.16, 1.9, P.stoneD);
  b.c(0, 0.16, 0, W, H, D, P.wood, { j: 0.02 });
  for (let x = -W / 2 + 0.16; x < W / 2 - 0.05; x += 0.26) for (const sz of [-1, 1]) b.c(x, 0.16, sz * (D / 2 + 0.008), 0.11, H, 0.02, P.woodD, { j: 0.04 });
  for (let z = -D / 2 + 0.16; z < D / 2 - 0.05; z += 0.26) for (const sx of [-1, 1]) b.c(sx * (W / 2 + 0.008), 0.16, z, 0.02, H, 0.11, P.woodD, { j: 0.04 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.c(sx * (W / 2 - 0.02), 0.16, sz * (D / 2 - 0.02), 0.16, H, 0.16, P.woodDD);
  // porte double avec croix
  b.c(0.15, 0.16, D / 2 + 0.03, 1.0, 1.15, 0.05, P.woodDD);
  b.c(0.15, 0.2, D / 2 + 0.06, 0.08, 1.35, 0.02, P.cream, { rot: [0, 0, 0.72] }); b.c(0.15, 0.2, D / 2 + 0.06, 0.08, 1.35, 0.02, P.cream, { rot: [0, 0, -0.72] });
  b.c(0.15, 1.31, D / 2 + 0.04, 1.12, 0.07, 0.06, P.cream);
  b.c(-0.85, 0.75, D / 2 + 0.02, 0.36, 0.32, 0.04, P.warm, { kind: 'glow', j: 0 });
  b.c(-0.85, 0.73, D / 2 + 0.03, 0.44, 0.05, 0.05, P.cream);
  const y = gableRoof(b, W, D, 0.16 + H, P.roof, P.wood, 5, 0.16);
  b.c(0, y, 0, W + 0.36, 0.08, 0.16, P.roof2);
  b.c(1.0, y - 0.2, -0.2, 0.3, 0.5, 0.3, P.stoneD);
  return b;
}
function bGreenhouse() {
  const b = new VB(); const H = 1.2, WX = 1.8, DZ = 2.8;
  b.c(0, 0, 0, WX + 0.12, 0.2, DZ + 0.12, P.stone);
  for (const sx of [-1, 1]) for (const z of [-1.4, -0.47, 0.47, 1.4]) b.c(sx * WX / 2, 0.2, z, 0.08, H, 0.08, P.cream, { j: 0.01 });
  for (const sx of [-1, 1]) b.c(sx * WX / 2, 0.2 + H, 0, 0.1, 0.07, DZ + 0.08, P.cream);
  for (const sz of [-1, 1]) b.c(0, 0.2 + H, sz * DZ / 2, WX + 0.08, 0.07, 0.1, P.cream);
  for (const sx of [-1, 1]) b.c(sx * (WX / 2), 0.2, 0, 0.04, H, DZ - 0.06, P.glass, { kind: 'glass', j: 0.02 });
  for (const sz of [-1, 1]) b.c(0, 0.2, sz * DZ / 2, WX - 0.06, H, 0.04, P.glass, { kind: 'glass', j: 0.02 });
  // toit vitré en pente
  const a = 0.5, half = WX / 2, slant = half / Math.cos(a) + 0.08, yTop = 0.2 + H + Math.tan(a) * half;
  for (const sx of [-1, 1]) b.c(sx * half / 2, 0.2 + H + Math.tan(a) * half / 2 - 0.02, 0, slant, 0.04, DZ + 0.06, P.glass, { kind: 'glass', rot: [0, 0, -sx * a], j: 0.02 });
  for (const z of [-1.4, -0.47, 0.47, 1.4]) for (const sx of [-1, 1]) b.c(sx * half / 2, 0.2 + H + Math.tan(a) * half / 2, z, slant, 0.06, 0.07, P.cream, { rot: [0, 0, -sx * a] });
  b.c(0, yTop - 0.03, 0, 0.1, 0.08, DZ + 0.14, P.cream);
  for (const sz of [-1, 1]) { b.c(0, 0.2 + H + 0.04, sz * DZ / 2, 1.3, 0.2, 0.04, P.glass, { kind: 'glass', j: 0 }); b.c(0, 0.2 + H + 0.24, sz * DZ / 2, 0.68, 0.18, 0.04, P.glass, { kind: 'glass', j: 0 }); }
  // intérieur : planches de culture + lampes
  for (const sx of [-1, 1]) {
    b.c(sx * 0.45, 0.2, 0, 0.62, 0.26, 2.5, P.woodD);
    for (let z = -1.05; z <= 1.06; z += 0.35) b.c(sx * 0.45 + R(-0.08, 0.08), 0.46, z, R(0.18, 0.28), R(0.14, 0.3), R(0.18, 0.26), pick([P.sprout, P.leaf, P.peas]), { j: 0.06 });
  }
  b.c(0, 0.2 + H - 0.1, 0, 0.08, 0.05, 2.2, P.techGlow, { kind: 'glow', j: 0 });
  // porte côté est
  b.c(WX / 2 + 0.03, 0.2, 0, 0.04, 0.95, 0.5, P.cream);
  return b;
}
function bWall() {
  const b = new VB(); const z = 0, x0 = wx(0) - 0.5, x1 = wx(11) + 0.5, T = 0.8, H = 1.2;
  const gate0 = wx(5) - 0.5, gate1 = wx(5) + 0.5;
  // maçonnerie en rangs décalés
  for (let r = 0; r < 3; r++) {
    let x = x0 + (r % 2 ? 0.35 : 0); const y0 = r * 0.4;
    if (r % 2) b.box(x0, y0, z - T / 2, x, y0 + 0.4, z + T / 2, P.stone, { j: 0.06 });
    while (x < x1 - 0.01) {
      let w = R(0.55, 1.0); let xe = Math.min(x1, x + w);
      if (x < gate0 - 0.6 && xe > gate0 - 0.6) xe = gate0 - 0.6;
      if (x >= gate0 - 0.6 && x < gate1 + 0.6) { x = gate1 + 0.6; continue; }
      const dz = R(-0.03, 0.03);
      b.box(x + 0.012, y0 + 0.012, z - T / 2 + dz, xe - 0.012, y0 + 0.4 - 0.012, z + T / 2 + dz, pick([P.stone, P.stoneD, P.stoneL]), { j: 0.06 });
      x = xe;
    }
  }
  // joints (mortier) derrière les pierres
  b.box(x0 + 0.02, 0, z - T / 2 + 0.04, gate0 - 0.62, H, z + T / 2 - 0.04, P.stoneD, { j: 0 });
  b.box(gate1 + 0.62, 0, z - T / 2 + 0.04, x1 - 0.02, H, z + T / 2 - 0.04, P.stoneD, { j: 0 });
  // créneaux + mousse
  for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.9) {
    if (x > gate0 - 0.9 && x < gate1 + 0.7) continue;
    b.c(x, H, z, 0.45, 0.32, T * 0.9, pick([P.stone, P.stoneL]), { j: 0.05 });
    if (rnd() < 0.4) b.c(x + R(-0.15, 0.15), H + 0.32, z + R(-0.2, 0.2), 0.22, 0.06, 0.3, P.leaf, { j: 0.05 });
  }
  // porte : piliers + linteau gravé d'un glyphe des Veilleurs
  for (const px of [gate0 - 0.3, gate1 + 0.3]) { b.c(px, 0, z, 0.6, 2.0, 0.95, P.stoneL, { j: 0.04 }); b.c(px, 2.0, z, 0.72, 0.16, 1.05, P.stone); b.c(px, 2.16, z, 0.4, 0.2, 0.6, P.stoneD); }
  b.c((gate0 + gate1) / 2, 1.62, z, gate1 - gate0 + 0.05, 0.38, 0.78, P.stone, { j: 0.02 });
  b.c((gate0 + gate1) / 2, 1.7, z + 0.4, 0.3, 0.22, 0.04, P.techGlow, { kind: 'glow', j: 0 });
  b.c((gate0 + gate1) / 2, 1.7, z - 0.4, 0.3, 0.22, 0.04, P.techGlow, { kind: 'glow', j: 0 });
  // tourelles d'extrémité
  for (const tx of [x0 + 0.45, x1 - 0.45]) { b.c(tx, 0, z, 0.95, 1.65, 1.0, P.stone, { j: 0.04 }); b.c(tx, 1.65, z, 1.05, 0.14, 1.1, P.stoneL); b.c(tx, 1.79, z, 0.3, 0.26, 0.3, P.stoneD); }
  // runes dormantes
  for (const rx of [wx(2), wx(8.5)]) b.c(rx, 0.55, z + T / 2 + 0.03, 0.18, 0.18, 0.03, P.techGlow, { kind: 'glow', j: 0 });
  return b;
}
function bWorkshop() {
  const b = new VB(); const W = 1.6, D = 1.5, H = 1.15;
  b.c(0, 0, 0, 1.9, 0.14, 1.85, P.stoneD);
  b.c(0, 0.14, 0, W, H, D, P.plaster, { j: 0.01 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.c(sx * (W / 2 - 0.03), 0.14, sz * (D / 2 - 0.03), 0.14, H, 0.14, P.wood);
  b.c(0, 0.14 + H - 0.1, 0, W + 0.04, 0.1, D + 0.04, P.wood);
  b.c(-0.3, 0.14, D / 2 + 0.02, 0.42, 0.78, 0.04, P.woodDD);
  b.c(0.35, 0.58, D / 2 + 0.02, 0.36, 0.32, 0.04, P.warm, { kind: 'glow', j: 0 });
  b.c(W / 2 + 0.02, 0.58, 0.1, 0.04, 0.32, 0.4, P.warm, { kind: 'glow', j: 0 });
  b.c(0.35, 0.55, D / 2 + 0.04, 0.44, 0.05, 0.05, P.wood); b.c(W / 2 + 0.04, 0.55, 0.1, 0.05, 0.05, 0.48, P.wood);
  const y = gableRoof(b, W, D, 0.14 + H, P.roofB, P.wood, 4, 0.14);
  b.c(0.45, 0.14 + H, -0.4, 0.26, y - 0.14 - H + 0.35, 0.26, P.stoneD);
  b.c(-0.3, y - 0.52, 0.42, 0.6, 0.04, 0.42, P.glassDeep, { rot: [-0.62, 0, 0] });
  return b;
}
function bPlot() {
  const b = new VB();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.c(sx * 0.85, -0.04, sz * 0.85, 0.08, 0.42, 0.08, P.wood); b.c(sx * 0.85, 0.34, sz * 0.85, 0.1, 0.06, 0.1, P.flowerB, { j: 0 }); }
  for (const sz of [-1, 1]) b.c(0, 0.3, sz * 0.85, 1.7, 0.02, 0.02, P.cream, { j: 0 });
  for (const sx of [-1, 1]) b.c(sx * 0.85, 0.3, 0, 0.02, 0.02, 1.7, P.cream, { j: 0 });
  b.c(-0.3, -0.04, 0.2, 0.5, 0.12, 0.3, P.wood); b.c(-0.3, 0.08, 0.2, 0.45, 0.1, 0.25, P.woodD);
  b.c(0.35, -0.04, -0.3, 0.3, 0.2, 0.3, P.stoneL);
  return b;
}

/* ---------- Parcelles (sillons à plat + cultures) ---------- */
function bParcel(stage) {
  const b = new VB(); const crops = [];
  for (let r = 0; r < 4; r++) {
    const z = -0.75 + r * 0.5;
    b.c(0, -0.08, z, 1.84, 0.12, 0.3, P.ridge, { j: 0.03 });
    for (let q = 0; q < 4; q++) {
      const x = -0.69 + q * 0.46 + R(-0.04, 0.04), y = 0.04, tag = 'c' + r + q;
      if (stage === 'semis') {
        b.c(x + R(-0.1, 0.1), y, z + R(-0.06, 0.06), 0.22, 0.03, 0.12, P.mulch, { j: 0.05, rot: [0, R(-0.5, 0.5), 0] });
        b.c(x, y, z, 0.05, R(0.08, 0.14), 0.05, P.sprout, { j: 0.05 }); b.c(x + 0.09, y, z + 0.03, 0.04, R(0.06, 0.1), 0.04, P.sprout, { j: 0.05 });
      } else if (stage === 'pousses') {
        b.c(x, y, z, 0.26, 0.1, 0.18, P.peas, { j: 0.06 }); b.c(x, y + 0.06, z, 0.16, 0.12, 0.26, P.sprout, { j: 0.06 });
        b.c(x, y + 0.14, z, 0.1, 0.06, 0.1, P.peas, { j: 0.06 });
      } else if (stage === 'ble') {
        for (let s = 0; s < 3; s++) {
          const sx = x + R(-0.12, 0.12), sz = z + R(-0.09, 0.09), h = R(0.42, 0.6);
          b.c(sx, y, sz, 0.06, h, 0.06, P.wheatD, { j: 0.05, tag }); b.c(sx, y + h - 0.02, sz, 0.1, 0.18, 0.1, P.wheat, { j: 0.06, tag });
        }
      } else if (stage === 'courge') {
        b.c(x, y, z, 0.42, 0.06, 0.3, P.leaf, { j: 0.06, rot: [0, R(-0.4, 0.4), 0], tag });
        const s = R(0.85, 1.1);
        b.c(x, y + 0.02, z, 0.3 * s, 0.22 * s, 0.24 * s, P.squash, { j: 0.05, tag }); b.c(x, y + 0.02, z, 0.24 * s, 0.24 * s, 0.3 * s, P.squash, { j: 0.05, tag });
        b.c(x, y + 0.02, z, 0.31 * s, 0.1 * s, 0.31 * s, P.squashD, { j: 0.05, tag });
        b.c(x, y + 0.24 * s, z, 0.04, 0.08, 0.04, P.woodDD, { tag });
      }
      if (stage === 'ble' || stage === 'courge') crops.push({ tag, x, z });
    }
  }
  return { b, crops };
}

/* ---------- Villageois (une InstancedMesh, membres animés) ---------- */
function makeVillager(id, name, desc, palette, route, opts = {}) {
  const parts = [
    // [w,h,d, offset(x,y,z), pivot(x,y,z), color, swing]
    [0.1, 0.3, 0.11, [0, -0.15, 0], [-0.07, 0.31, 0], palette.legs, 'L'],
    [0.1, 0.3, 0.11, [0, -0.15, 0], [0.07, 0.31, 0], palette.legs, 'R'],
    [0.11, 0.06, 0.15, [0, -0.3, 0.02], [-0.07, 0.31, 0], palette.shoe, 'L'],
    [0.11, 0.06, 0.15, [0, -0.3, 0.02], [0.07, 0.31, 0], palette.shoe, 'R'],
    [0.28, 0.32, 0.18, [0, 0.16, 0], [0, 0.3, 0], palette.body, null],
    [0.08, 0.27, 0.09, [0, -0.12, 0], [-0.185, 0.58, 0], palette.body, 'R'],
    [0.08, 0.27, 0.09, [0, -0.12, 0], [0.185, 0.58, 0], palette.body, 'L'],
    [0.07, 0.07, 0.08, [0, -0.28, 0], [-0.185, 0.58, 0], palette.skin, 'R'],
    [0.07, 0.07, 0.08, [0, -0.28, 0], [0.185, 0.58, 0], palette.skin, 'L'],
    [0.22, 0.21, 0.2, [0, 0.105, 0], [0, 0.62, 0], palette.skin, null],
    ...palette.extra,
  ];
  const im = new THREE.InstancedMesh(BOX, MAT.solid, parts.length);
  parts.forEach((p, i) => im.setColorAt(i, col(p[5], 0.02)));
  im.castShadow = false; im.receiveShadow = true;
  const g = new THREE.Group(); g.add(im); g.scale.setScalar(1.22);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: TEX_BLOB, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; blob.renderOrder = 1; g.add(blob);
  let glowSprite = null;
  if (opts.lantern) {
    const lv = new VB(); lv.c(0.27, 0.22, 0.06, 0.1, 0.13, 0.1, P.warm, { kind: 'glow', j: 0 });
    const lm = buildIM(lv.lists.glow, MAT.glow, false, false); g.add(lm);
    glowSprite = haloSprite(0xffc46e, 0.9); glowSprite.position.set(0.27, 0.3, 0.06); g.add(glowSprite);
  }
  scene.add(g);
  const pts = route.map(([i, j]) => new THREE.Vector3(wx(i), 0, wz(j)));
  const segs = []; let total = 0;
  for (let k = 0; k < pts.length - 1; k++) { const L = pts[k].distanceTo(pts[k + 1]); segs.push(L); total += L; }
  const ent = { id, name, desc, tag: opts.tag || '', group: g, meshes: { solid: im }, kind: 'villager', top: 0.95, selectable: true, outline: null,
    parts, pts, segs, total, s: opts.start || 0, dir: 1, pingpong: !!opts.pingpong, pause: 0, phase: rnd() * 6, yaw: 0, speed: opts.speed || 0.75, offset: opts.offset || 0 };
  im.userData.entity = ent; pickables.push(im);
  entities.set(id, ent);
  poseVillager(ent, 0);
  placeVillager(ent);
  im.computeBoundingSphere();
  return ent;
}
const _pm = new THREE.Matrix4(), _pr = new THREE.Matrix4(), _po = new THREE.Matrix4(), _ps = new THREE.Matrix4();
function poseVillager(v, swing) {
  const im = v.meshes.solid;
  v.parts.forEach((p, i) => {
    const a = p[6] === 'L' ? swing : p[6] === 'R' ? -swing : 0;
    _pm.makeTranslation(p[4][0], p[4][1], p[4][2]);
    _pr.makeRotationX(a);
    _po.makeTranslation(p[3][0], p[3][1], p[3][2]);
    _ps.makeScale(p[0], p[1], p[2]);
    _pm.multiply(_pr).multiply(_po).multiply(_ps);
    im.setMatrixAt(i, _pm);
  });
  im.instanceMatrix.needsUpdate = true;
}
function placeVillager(v) {
  let s = v.s, k = 0;
  while (k < v.segs.length - 1 && s > v.segs[k]) { s -= v.segs[k]; k++; }
  const a = v.pts[k], b = v.pts[k + 1], t = clamp(s / v.segs[k], 0, 1);
  const x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
  const dx = (b.x - a.x) * v.dir, dz = (b.z - a.z) * v.dir;
  const targetYaw = Math.atan2(dx, dz);
  let dy = targetYaw - v.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  v.yaw += dy * 0.35;
  // décalage latéral pour ne pas marcher pile au centre
  const nx = -dz, nz = dx, nl = Math.hypot(nx, nz) || 1;
  const onBridge = Math.abs(x - wx(5)) < 0.5 && Math.abs(z - wz(12)) < 0.55;
  v.group.position.set(x + (nx / nl) * v.offset, onBridge ? 0.0 : -0.05, z + (nz / nl) * v.offset);
  v.group.rotation.y = v.yaw;
}
function stepVillager(v, dt) {
  if (v.pause > 0) { v.pause -= dt; poseVillager(v, 0); return; }
  v.s += v.dir * v.speed * dt;
  if (v.pingpong) {
    if (v.s >= v.total) { v.s = v.total; v.dir = -1; v.pause = 1.6; }
    if (v.s <= 0) { v.s = 0; v.dir = 1; v.pause = 1.6; }
  } else v.s = ((v.s % v.total) + v.total) % v.total;
  v.phase += dt * v.speed * 11;
  poseVillager(v, Math.sin(v.phase) * 0.55);
  v.meshes.solid.position.y = Math.abs(Math.cos(v.phase)) * 0.025;
  placeVillager(v);
}

/* ---------- Nuages ---------- */
const clouds = [];
function makeCloud(lane, frac, s, speed, x0) {
  const g = new THREE.Group(); const vb = new VB();
  const n = 4 + Math.floor(rnd() * 3);
  vb.c(0, 0, 0, 1.6 * s, 0.5 * s, 1.0 * s, 0xffffff, { j: 0.01 });
  for (let k = 0; k < n; k++) vb.c(R(-0.9, 0.9) * s, R(0, 0.35) * s, R(-0.4, 0.4) * s, R(0.6, 1.2) * s, R(0.4, 0.75) * s, R(0.6, 1.0) * s, 0xffffff, { j: 0.02 });
  const im = buildIM(vb.lists.solid, cloudMat, false, false);
  g.add(im); scene.add(g);
  clouds.push({ g, speed, lane, frac, x: x0 });
}
// Les nuages vivent dans le repère de la caméra : couloirs au-dessus/au-dessous de l'île, toujours DERRIÈRE elle.
function placeClouds() {
  const { fwd, r, u } = basis(view.az, view.el); const e = extents(view.az);
  const tu = view.tu ?? 0, halfW = (view.W / 2) * view.k;
  const skyTop = tu + (view.H / 2 - view.availTop) * view.k, skyBot = tu - (view.availBot - view.H / 2) * view.k;
  for (const c of clouds) {
    if (c.x > halfW + 3) c.x = -halfW - 3;
    const b = c.lane === 'top' ? lerp(e.y1 + 0.6, Math.max(e.y1 + 1.2, skyTop - 1), c.frac) : lerp(Math.min(e.y0 - 1.0, skyBot + 1.5), e.y0 - 0.2, c.frac);
    c.g.position.set(0, 0, 0).addScaledVector(r, (e.x0 + e.x1) / 2 + c.x).addScaledVector(u, b).addScaledVector(fwd, 26 + c.frac * 6);
    c.g.rotation.y = view.az - Math.PI / 4;
  }
}

/* ---------- Halos (sprites additifs) ---------- */
const halos = [];
const mists = [];
function haloSprite(color, size) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  sp.scale.set(size, size, 1); sp.renderOrder = 5; halos.push(sp); return sp;
}

/* =========================================================================
   Construction de la scène
   ========================================================================= */
const ENT = {};
function buildWorld() {
  buildTerrain();
  buildDecor();
  ENT.silo = makeEntity('silo', bSilo(), { pos: [wx(0.5), 0, wz(0.5)], name: 'Silo', desc: 'Garde l’Énergie au sec', tag: 'Énergie 128' });
  ENT.tower = makeEntity('tower', bTower(), { pos: [wx(10), 0, wz(1)], name: 'Tour-relais', desc: 'Relie tes gestes du foyer à l’Orée', tag: 'Niveau 2' });
  ENT.warehouse = makeEntity('warehouse', bWarehouse(), { pos: [wx(7), 0, wz(0.5)], name: 'Entrepôt', desc: 'Matériaux pour bâtir et réparer', tag: 'Matériaux 42' });
  ENT.greenhouse = makeEntity('greenhouse', bGreenhouse(), { pos: [wx(1.5), 0, wz(6)], name: 'Serre solaire', desc: 'Les semis passent l’hiver au chaud', tag: 'Active' });
  ENT.wall = makeEntity('wall', bWall(), { pos: [0, 0, wz(-2)], name: 'Muret du Bastion', desc: 'Pierre des Veilleurs. Quelque chose y dort.', tag: 'Intact' });
  ENT.wall.anchor = new THREE.Vector3(wx(5), 2.4, wz(-2));
  for (const p of PARCELS) {
    const { b, crops } = bParcel(p.stage);
    const e = makeEntity(p.id, b, { pos: [wx(p.i + 0.5), 0, wz(p.j + 0.5)], name: p.name, desc: p.desc, tag: p.tag, kind: 'parcel' });
    e.crops = crops.map((c) => ({ ...c, idx: b.tags[c.tag].map(([, i]) => i), base: b.tags[c.tag].map(([, i]) => boxMatrix(b.lists.solid[i], new THREE.Matrix4())) }));
    e.stage = p.stage; e.harvested = false; e.anchorY = 0.9;
    ENT[p.id] = e;
  }
  ENT.plot = makeEntity('plot', bPlot(), { pos: [wx(1.5), 0, wz(9.5)], name: 'Terrain à bâtir', desc: 'Prêt pour un atelier', tag: '2 × 2' });
  ENT.workshop = makeEntity('workshop', bWorkshop(), { pos: [wx(1.5), 0, wz(9.5)], name: 'Atelier de Milo', desc: 'Répare outils et machines', tag: 'Nouveau' });
  ENT.workshop.group.visible = false;
  // halos des lanternes, du cristal et de la porte du Bastion
  for (const L of LANTERNS) { const h = haloSprite(0xffc46e, 1.5); h.position.copy(L); scene.add(h); }
  for (let k = 0; k < 4; k++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_HALO, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.55 }));
    const sz = 1.6 + k * 0.5; m.scale.set(sz * 1.4, sz, 1); m.position.set(wx(8) + (k - 1.5) * 0.35, -4.3 - k * 0.15, wz(13) + 0.6); m.renderOrder = 4; scene.add(m); mists.push(m);
  }
  ENT.crystalHalo = haloSprite(0x7fe0d6, 2.2); ENT.crystalHalo.position.set(wx(10), 5.37, wz(1)); scene.add(ENT.crystalHalo);
  const gh = haloSprite(0x7fe0d6, 2.6); gh.position.set(wx(5), 1.0, wz(-2)); scene.add(gh);
  const ghh = haloSprite(0x9fe6c0, 3.2); ghh.position.set(wx(1.5), 0.9, wz(6)); scene.add(ghh);
  // villageois
  ENT.solene = makeVillager('solene', 'Solène', 'Agronome · veille sur les champs', {
    legs: 0x5b4a3c, shoe: 0x3d3229, body: 0x5f7f4f, skin: 0xc98d62,
    extra: [[0.36, 0.05, 0.36, [0, 0.0, 0], [0, 0.82, 0], 0xe7c983, null], [0.24, 0.1, 0.22, [0, 0.05, 0], [0, 0.82, 0], 0xe7c983, null], [0.29, 0.06, 0.19, [0, 0.12, 0], [0, 0.3, 0], 0xe7d7b0, null]],
  }, [[4, 4], [10, 4], [10, 10], [4, 10], [4, 4]], { start: 3.2, speed: 0.62, offset: 0.14, tag: 'Terrain' });
  ENT.milo = makeVillager('milo', 'Milo', 'Technicien · maison et véhicule', {
    legs: 0x4a4038, shoe: 0x2f2a25, body: 0x3f8f8c, skin: 0xe0b48c,
    extra: [[0.24, 0.07, 0.22, [0, 0.03, 0], [0, 0.82, 0], 0xb4784a, null], [0.24, 0.03, 0.1, [0, 0.0, 0.14], [0, 0.82, 0], 0xb4784a, null], [0.3, 0.05, 0.2, [0, 0.0, 0], [0, 0.38, 0], 0x86613f, null]],
  }, [[5, -1], [5, 4], [4, 4], [4, 10], [5, 10], [5, 13]], { start: 4, speed: 0.7, offset: -0.12, pingpong: true, lantern: true, tag: 'Maison · Véhicule' });
  // nuages : au-dessus et sous l'île
  makeCloud('top', 0.15, 1.25, 0.32, -9); makeCloud('top', 0.75, 0.95, 0.24, 4); makeCloud('top', 0.45, 1.1, 0.28, 12);
  makeCloud('bot', 0.2, 1.5, 0.2, -5); makeCloud('bot', 0.8, 1.2, 0.26, 8); makeCloud('top', 0.95, 0.8, 0.2, -16);
}

/* Flocons d'écume qui descendent le ruisseau (ambiance) */
let flecks;
function buildFlecks() {
  const n = 10; flecks = new THREE.InstancedMesh(BOX, MAT.solid, n); flecks.castShadow = false;
  for (let k = 0; k < n; k++) flecks.setColorAt(k, col(P.foam, 0));
  flecks.userData.t = Array.from({ length: n }, (_, k) => k / n);
  scene.add(flecks); updateFlecks(0);
}
const streamPts = STREAM.map(([i, j]) => new THREE.Vector3(wx(i), -0.19, wz(j)));
streamPts.unshift(new THREE.Vector3(wx(-0.6), -0.19, wz(12)));
streamPts.push(new THREE.Vector3(wx(8), -0.19, wz(13) + 0.45));
function updateFlecks(dt) {
  const ts = flecks.userData.t, n = ts.length, segN = streamPts.length - 1;
  for (let k = 0; k < n; k++) {
    ts[k] = (ts[k] + dt * 0.045) % 1;
    const f = ts[k] * segN, s = Math.floor(f), t = f - s;
    const a = streamPts[s], b = streamPts[Math.min(s + 1, segN)];
    _p.set(lerp(a.x, b.x, t), -0.19, lerp(a.z, b.z, t) + ((k % 3) - 1) * 0.22);
    _s.set(0.16, 0.02, 0.06); _q.identity();
    flecks.setMatrixAt(k, _m.compose(_p, _q, _s));
  }
  flecks.instanceMatrix.needsUpdate = true;
}

/* =========================================================================
   Particules (pool instancié)
   ========================================================================= */
const PCOUNT = 320;
const parts = { im: null, list: [], alive: 0 };
function buildParticles() {
  const im = new THREE.InstancedMesh(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15 }), PCOUNT);
  im.frustumCulled = false; im.count = 0; im.castShadow = false;
  for (let k = 0; k < PCOUNT; k++) im.setColorAt(k, new THREE.Color(1, 1, 1));
  scene.add(im); parts.im = im;
}
function spawn(p) { if (parts.list.length >= PCOUNT) return; parts.list.push({ age: 0, rx: rnd() * 6, ry: rnd() * 6, spin: R(-6, 6), drag: 0, g: -9, grow: 0, ...p }); }
const _pc = new THREE.Color();
function updateParticles(dt) {
  const L = parts.list; let n = 0;
  for (let k = 0; k < L.length; k++) {
    const p = L[k]; p.age += dt;
    if (p.age >= p.life) continue;
    p.vy += p.g * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vz *= dr; p.vy *= p.drag ? dr : 1;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.floor != null && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
    const t = p.age / p.life;
    const sz = p.size * (p.grow ? Math.sin(Math.min(1, t * 1.15) * Math.PI) * (1 + p.grow) : 1 - t * t);
    p.rx += p.spin * dt; p.ry += p.spin * dt * 0.7;
    _p.set(p.x, p.y, p.z); _q.setFromEuler(_e.set(p.rx, p.ry, 0)); _s.set(sz, sz, sz);
    parts.im.setMatrixAt(n, _m.compose(_p, _q, _s));
    parts.im.setColorAt(n, _pc.set(p.color));
    L[n++] = p;
  }
  L.length = n; parts.im.count = n; parts.alive = n;
  parts.im.instanceMatrix.needsUpdate = true; if (parts.im.instanceColor) parts.im.instanceColor.needsUpdate = true;
}

/* =========================================================================
   Caméra : iso orthographique, rotation par pas de 90°, cadrage auto
   ========================================================================= */
const FIT_PTS = [];
for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8], [-8, 0], [8, 0], [0, -8], [0, 8]]) { FIT_PTS.push(new THREE.Vector3(x, 0.6, z), new THREE.Vector3(x * 0.9, -3.6, z * 0.9)); }
FIT_PTS.push(new THREE.Vector3(wx(10), 5.8, wz(1)), new THREE.Vector3(wx(0.5), 4.4, wz(0.5)));
function basis(az, el) {
  const fwd = new THREE.Vector3(-Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el));
  const r = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
  const u = new THREE.Vector3().crossVectors(r, fwd).normalize();
  return { fwd, r, u };
}
function extents(az) {
  const { r, u } = basis(az, view.el); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of FIT_PTS) { const a = p.dot(r), b = p.dot(u); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
  return { x0, x1, y0, y1 };
}
let zoomMul = Number(QS.get('zoom') || 1);
function fit() {
  const W = innerWidth, H = innerHeight;
  view.W = W; view.H = H;
  const hud = document.getElementById('hud').getBoundingClientRect();
  const panel = document.getElementById('panel').getBoundingClientRect();
  document.documentElement.style.setProperty('--panel-h', (H - panel.top) + 'px');
  document.documentElement.style.setProperty('--hills-b', (W < 700 ? Math.max(0, H - panel.top - 24) : 0) + 'px');
  view.availTop = hud.bottom + 6; view.availBot = Math.min(H, panel.top) - 6;
  const availW = W - 16, availH = view.availBot - view.availTop;
  let k = 0;
  for (let q = 0; q < 4; q++) {
    const e = extents(Math.PI / 4 + q * Math.PI / 2);
    // en portrait on accepte de rogner un peu la couronne à gauche/droite
    const cropW = W < H ? 0.74 : 1.0;
    k = Math.max(k, ((e.x1 - e.x0) * cropW) / availW, (e.y1 - e.y0) / availH);
  }
  view.k = k / zoomMul;
  renderer.setSize(W, H, false);
  cam.left = (-W / 2) * view.k; cam.right = (W / 2) * view.k; cam.top = (H / 2) * view.k; cam.bottom = (-H / 2) * view.k;
  cam.updateProjectionMatrix();
  invalidate();
}
function updateCamera() {
  const { fwd, r, u } = basis(view.az, view.el);
  const e = extents(view.az);
  const cx = (e.x0 + e.x1) / 2, cy = (e.y0 + e.y1) / 2;
  const sx = cx;
  const availCY = (view.availTop + view.availBot) / 2;
  const sy = cy - (view.H / 2 - availCY) * view.k;
  const target = new THREE.Vector3().addScaledVector(r, sx).addScaledVector(u, sy);
  view.tu = sy; placeClouds();
  if (view.shake > 0) { const a = view.shake; target.addScaledVector(r, (rnd() - 0.5) * a).addScaledVector(u, (rnd() - 0.5) * a); }
  cam.position.copy(target).addScaledVector(fwd, -80);
  cam.up.set(0, 1, 0);
  cam.lookAt(target);
  cam.updateMatrixWorld();
}
let camTween = null;
function rotate(dir) {
  const from = view.az, to = (camTween ? camTween.to : view.az) + dir * Math.PI / 2;
  if (RM) { view.az = to; camTween = null; invalidate(); return; }
  camTween = { from, to, t0: clock(), dur: D(520) };
  kick();
}

/* =========================================================================
   Jour / nuit : une seule source de vérité pour la lumière 3D et le ciel CSS
   ========================================================================= */
const N = { skyTop: '#111d38', skyMid: '#22325a', skyBot: '#3a4a72', hillFar: '#2c3a5c', hillNear: '#202c48', light: '#bccbf0', li: 1.25, hemiS: '#6f82b8', hemiG: '#3a3446', hi: 1.55, night: 1, disc: '#e9eefc' };
const KEYS = [
  { h: 0, ...N }, { h: 5, ...N },
  { h: 6.5, skyTop: '#56689a', skyMid: '#c49ca2', skyBot: '#f4c08e', hillFar: '#a08a99', hillNear: '#7d7287', light: '#ffb47e', li: 1.4, hemiS: '#b4a8c4', hemiG: '#6a5040', hi: 1.1, night: 0.3, disc: '#ffd8a8' },
  { h: 8.5, skyTop: '#78afd6', skyMid: '#b9d6e3', skyBot: '#f3ead3', hillFar: '#a9bfc5', hillNear: '#8ea898', light: '#fff0d8', li: 2.6, hemiS: '#d4e6ec', hemiG: '#94744e', hi: 1.35, night: 0, disc: '#fff6dc' },
  { h: 15.5, skyTop: '#78afd6', skyMid: '#b9d6e3', skyBot: '#f3ead3', hillFar: '#a9bfc5', hillNear: '#8ea898', light: '#fff0d8', li: 2.6, hemiS: '#d4e6ec', hemiG: '#94744e', hi: 1.35, night: 0, disc: '#fff6dc' },
  { h: 18, skyTop: '#7f9cc4', skyMid: '#e8c4a0', skyBot: '#f7cf8e', hillFar: '#c4aa97', hillNear: '#9c8c78', light: '#ffc283', li: 2.4, hemiS: '#ead2b6', hemiG: '#86603e', hi: 1.2, night: 0.08, disc: '#ffe0a8' },
  { h: 19.5, skyTop: '#3a4778', skyMid: '#a7728a', skyBot: '#e89a78', hillFar: '#6d5a72', hillNear: '#4d445e', light: '#ff9f72', li: 0.9, hemiS: '#8a7aa0', hemiG: '#3c2c30', hi: 1.0, night: 0.62, disc: '#ffb48a' },
  { h: 21, ...N }, { h: 24, ...N },
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
function mixHex(a, b, t) { _ca.set(a); _cb.set(b); return '#' + _ca.lerp(_cb, t).getHexString(); }
let tod = 14;
function sample(h) {
  let k = 0; while (k < KEYS.length - 2 && h > KEYS[k + 1].h) k++;
  const A = KEYS[k], B = KEYS[k + 1]; const t = clamp((h - A.h) / (B.h - A.h), 0, 1);
  const o = {};
  for (const f in A) if (f !== 'h') o[f] = typeof A[f] === 'number' ? lerp(A[f], B[f], t) : mixHex(A[f], B[f], t);
  return o;
}
const SUNRISE = 6, SUNSET = 19.75;
function lightDir(h) {
  if (h >= SUNRISE && h <= SUNSET) {
    const a = ((h - SUNRISE) / (SUNSET - SUNRISE)) * Math.PI;
    return { v: new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.62 + 0.14, 0.62).normalize(), sun: true };
  }
  const hh = h < SUNRISE ? h + 24 : h; const a = ((hh - SUNSET) / (24 + SUNRISE - SUNSET)) * Math.PI;
  return { v: new THREE.Vector3(Math.cos(a) * 0.7, Math.sin(a) * 0.5 + 0.5, -0.45).normalize(), sun: false };
}
function setTime(h, silent) {
  tod = ((h % 24) + 24) % 24;
  const s = sample(tod);
  const fade = Math.min(1, Math.abs(tod - SUNRISE) / 0.45) * Math.min(1, Math.abs(tod - SUNSET) / 0.45);
  const { v, sun: isSun } = lightDir(tod);
  sun.position.copy(v).multiplyScalar(40); sun.target.position.set(0, 0, 0); sun.target.updateMatrixWorld();
  sun.color.set(s.light); sun.intensity = s.li * fade;
  hemi.color.set(s.hemiS); hemi.groundColor.set(s.hemiG); hemi.intensity = s.hi;
  U.night.value = s.night;
  cloudMat.color.set(mixHex('#ffffff', '#55585f', s.night)); cloudMat.emissive.set(mixHex('#ffffff', '#2c2f38', s.night));
  for (const m of mists) m.material.color.set(mixHex('#ffffff', '#8a96b8', s.night));
  for (const hs of halos) hs.material.opacity = Math.pow(s.night, 1.3) * 0.85 + (hs === ENT.crystalHalo ? 0.15 : 0);
  const st = document.documentElement.style;
  st.setProperty('--sky-top', s.skyTop); st.setProperty('--sky-mid', s.skyMid); st.setProperty('--sky-bot', s.skyBot);
  st.setProperty('--hill-far', s.hillFar); st.setProperty('--hill-near', s.hillNear);
  st.setProperty('--star-o', Math.pow(s.night, 1.6).toFixed(3));
  st.setProperty('--disc-c', s.disc);
  sunState = { v, isSun, fade };
  placeDisc();
  const hh = Math.floor(tod), mm = Math.round((tod - hh) * 60);
  const label = `${hh} h ${String(mm).padStart(2, '0')}`;
  const phase = s.night > 0.75 ? 'nuit' : tod < 12 && s.night > 0.1 ? 'aube' : s.night > 0.1 || (tod > 17 && tod < 21) ? 'soir' : 'jour';
  document.getElementById('todout').textContent = label;
  const tr = document.getElementById('tod'); tr.value = tod; tr.setAttribute('aria-valuetext', `${label}, ${phase}`);
  document.getElementById('todico').innerHTML = s.night > 0.5
    ? '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 15.5A8 8 0 0 1 8.5 5a8 8 0 1 0 10.5 10.5z" fill="#cfd8f0" stroke="#273026" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="#f3c879" stroke="#273026" stroke-width="1.6"/><g stroke="#273026" stroke-width="1.6" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.7 1.7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/></g></svg>';
  shadowDirty = true;
  if (!silent) invalidate();
}
let sunState = null;
function placeDisc() {
  if (!sunState) return;
  const { r } = basis(view.az, view.el);
  const v = sunState.v; const hl = Math.hypot(v.x, v.z) || 1;
  const sx = (v.x * r.x + v.z * r.z) / hl;
  const elev = Math.asin(clamp(v.y, -1, 1));
  const st = document.documentElement.style;
  st.setProperty('--disc-x', (50 + sx * 40).toFixed(1) + '%');
  st.setProperty('--disc-y', (36 - (elev / (Math.PI / 2)) * 40).toFixed(1) + '%');
  st.setProperty('--disc-o', (sunState.fade * (sunState.isSun ? 1 : 0.9)).toFixed(2));
}
function buildHills() {
  const svg = document.getElementById('hills');
  const ridge = (base, amp, step, treeH, seed) => {
    let d = `M0 340 L0 ${base}`; let x = 0; rs = seed;
    while (x <= 1000) {
      const y = base + Math.sin(x / 140 + seed) * amp + Math.sin(x / 47 + seed * 2) * amp * 0.3;
      if (rnd() < 0.55) { const h = treeH * R(0.6, 1.2); d += ` L${x.toFixed(0)} ${y.toFixed(0)} L${(x + step * 0.5).toFixed(0)} ${(y - h).toFixed(0)} L${(x + step).toFixed(0)} ${y.toFixed(0)}`; }
      else d += ` L${(x + step).toFixed(0)} ${y.toFixed(0)}`;
      x += step;
    }
    return d + ' L1000 340 Z';
  };
  svg.querySelector('.far').setAttribute('d', ridge(170, 34, 16, 26, 3));
  svg.querySelector('.near').setAttribute('d', ridge(250, 22, 22, 36, 11));
  rs = 99;
}

/* =========================================================================
   Boucle de rendu À LA DEMANDE
   ========================================================================= */
let rafId = 0, timerId = 0, needsRender = true, lastTick = clock(), lastAmb = clock();
const anims = new Set();
function kick() { if (MANUAL) return; if (!rafId) { if (timerId) { clearTimeout(timerId); timerId = 0; } rafId = requestAnimationFrame(tick); } }
function invalidate() { needsRender = true; kick(); }
function animate(dur, fn, o = {}) {
  return new Promise((res) => { anims.add({ t0: clock() + D(o.delay || 0), dur: D(dur), fn, gl: o.gl !== false, res }); kick(); });
}
const ambientActive = () => ambientOn && !RM && !document.hidden;
function tick(now, noRender) {
  rafId = 0;
  const dt = Math.min(0.05, (now - lastTick) / 1000) / SLOW; lastTick = now;
  let busy = false;
  if (camTween) {
    const t = clamp((now - camTween.t0) / camTween.dur, 0, 1);
    view.az = lerp(camTween.from, camTween.to, ease.inOutCubic(t));
    if (t >= 1) camTween = null;
    busy = true; needsRender = true; placeDisc();
  }
  if (anims.size) {
    busy = true;
    for (const a of [...anims]) {
      const t = (now - a.t0) / a.dur; if (t < 0) continue;
      a.fn(Math.min(1, t)); if (a.gl) needsRender = true;
      if (t >= 1) { anims.delete(a); a.res(); }
    }
  }
  if (parts.list.length) { updateParticles(dt); busy = true; needsRender = true; }
  if (view.shake > 0) { view.shake = Math.max(0, view.shake - dt * 0.9); busy = true; needsRender = true; }
  if (ambientActive() && (busy || now - lastAmb >= AMB_MS - 2)) {
    const adt = Math.min(0.1, (now - lastAmb) / 1000) / SLOW; lastAmb = now;
    stepVillager(ENT.solene, adt); stepVillager(ENT.milo, adt);
    for (const c of clouds) c.x += c.speed * adt;
    updateFlecks(adt);
    needsRender = true;
  }
  if (needsRender && !noRender) { render(); needsRender = false; }
  if (busy && !MANUAL) rafId = requestAnimationFrame(tick);
  else if (ambientActive() && !MANUAL) { timerId = setTimeout(() => { timerId = 0; kick(); }, Math.max(0, AMB_MS - (performance.now() - lastAmb))); }
}
function render() {
  const t0 = performance.now();
  updateCamera();
  if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; perf.shadowUpdates++; }
  renderer.render(scene, cam);
  updateOverlay();
  const t1 = performance.now();
  perf.renders++; perf.stamps.push(t1); perf.cpuMs.push(t1 - t0);
  if (perf.stamps.length > 4000) { perf.stamps.splice(0, 2000); perf.cpuMs.splice(0, 2000); }
  if (!perf.firstRender) { perf.firstRender = t1; if (QS.get('warm') !== '0') renderer.compileAsync(scene, cam).then(() => { perf.warmed = performance.now(); }); }
  if (DEBUG) updateDebug();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastAmb = clock(); invalidate(); } });

/* =========================================================================
   Sélection : raycasting, contour (coque inversée), libellé
   ========================================================================= */
const outlineMat = (color, thick) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uT: { value: thick } },
  vertexShader: `uniform float uT;
    void main(){
      vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
      vec3 p = position + sign(position) * (uT / s);
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
  side: THREE.BackSide,
});
const OUT_OUTER = outlineMat(0x273026, 0.075), OUT_INNER = outlineMat(0xfff4d6, 0.045);
let selected = null;
function setOutline(ent, on) {
  if (!ent) return;
  if (on && !ent.outline) {
    ent.outline = [];
    for (const kind of ['solid', 'glow']) {
      const m = ent.meshes[kind]; if (!m) continue;
      for (const mat of [OUT_OUTER, OUT_INNER]) {
        const o = new THREE.InstancedMesh(BOX, mat, m.count); o.instanceMatrix = m.instanceMatrix; o.frustumCulled = false;
        m.add(o); ent.outline.push(o);
      }
    }
  }
  if (ent.outline) for (const o of ent.outline) o.visible = on;
}
const selEl = document.getElementById('sel');
function select(ent, announce = true) {
  if (selected === ent) return;
  if (selected) setOutline(selected, false);
  selected = ent || null;
  if (selected) {
    setOutline(selected, true);
    selEl.querySelector('strong').textContent = selected.name;
    selEl.querySelector('span').textContent = selected.desc;
    const tg = selEl.querySelector('.tag'); tg.textContent = selected.tag; tg.hidden = !selected.tag;
    selEl.hidden = false;
    if (announce) say(`${selected.name}. ${selected.desc}.`);
    if (!RM && selected.kind !== 'villager') hop(selected.group);
    if (!RM) selEl.animate([{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: D(180), easing: 'ease-out' });
  } else selEl.hidden = true;
  invalidate();
}
function hop(g) {
  const base = g.userData.baseScale || (g.userData.baseScale = g.scale.clone());
  return animate(320, (t) => {
    const s = 1 + Math.sin(t * Math.PI) * 0.07 * (1 - t);
    g.scale.set(base.x / Math.sqrt(s), base.y * s, base.z / Math.sqrt(s));
  });
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y) {
  ndc.set((x / view.W) * 2 - 1, -(y / view.H) * 2 + 1);
  updateCamera(); ray.setFromCamera(ndc, cam);
  const vis = pickables.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
  const hit = ray.intersectObjects(vis, false)[0];
  select(hit ? hit.object.userData.entity : null);
}
const _v = new THREE.Vector3();
function toScreen(v) { _v.copy(v).project(cam); return [(_v.x + 1) / 2 * view.W, (1 - _v.y) / 2 * view.H]; }
function entAnchor(ent, out = new THREE.Vector3()) {
  if (ent.anchor) return out.copy(ent.anchor);
  out.set(0, (ent.anchorY ?? ent.top) + 0.25, 0);
  return ent.group.localToWorld(out);
}
const floats = new Set();
function updateOverlay() {
  if (selected) {
    const [x, y] = toScreen(entAnchor(selected));
    const w = selEl.offsetWidth, h = selEl.offsetHeight;
    const cx = clamp(x, w / 2 + 8, view.W - w / 2 - 8), cy = Math.max(y - 10, view.availTop + h + 4);
    selEl.style.setProperty('--ax', clamp(x - cx, -w / 2 + 16, w / 2 - 16).toFixed(1) + 'px');
    selEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -100%)`;
  }
  for (const f of floats) { const [x, y] = toScreen(f.world); f.el.style.left = x + 'px'; f.el.style.top = (y + f.dy) + 'px'; }
}

// pointeur : toucher = sélection, balayage horizontal = rotation
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y, dtm = performance.now() - down.t; down = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dtm < 700) { rotate(dx > 0 ? -1 : 1); return; }
  if (Math.hypot(dx, dy) < 12) pickAt(e.clientX, e.clientY);
});

/* =========================================================================
   HUD et ressources
   ========================================================================= */
const res = { energie: 128, materiaux: 42, confiance: 7 };
const shown = { ...res };
const resEl = { energie: document.getElementById('r-energie'), materiaux: document.getElementById('r-materiaux'), confiance: document.getElementById('r-confiance') };
const ICONS = {
  energie: ['en', resEl.energie.querySelector('.ico svg').outerHTML],
  materiaux: ['ma', resEl.materiaux.querySelector('.ico svg').outerHTML],
  confiance: ['co', resEl.confiance.querySelector('.ico svg').outerHTML],
};
function bumpCounter(k, add) {
  const el = resEl[k], num = el.querySelector('.num');
  const from = shown[k], to = from + add; shown[k] = to;
  if (RM) { num.textContent = to; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 600); return; }
  animate(260, (t) => { num.textContent = Math.round(lerp(from, to, ease.outCubic(t))); }, { gl: false });
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.13)', offset: 0.35 }, { transform: 'scale(0.97)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: D(340), easing: 'ease-out' });
}
function hudTarget(k) { const r = resEl[k].querySelector('.ico').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
const overlay = document.getElementById('overlay');
const live = document.getElementById('live');
function say(t) { live.textContent = ''; setTimeout(() => (live.textContent = t), 30); }

/* =========================================================================
   MOMENT 1 — Quête terminée : les ressources jaillissent de la Tour-relais
   ========================================================================= */
let busyQuest = false;
async function momentQuest() {
  if (busyQuest) return; busyQuest = true;
  const gains = [['energie', 5, 15], ['materiaux', 3, 6], ['confiance', 1, 1]]; // [ressource, icônes, valeur]
  for (const [k, , v] of gains) res[k] += v;
  say('Quête terminée : plus 15 Énergie, plus 6 Matériaux, plus 1 Confiance.');
  const tower = ENT.tower;
  if (RM) {
    for (const [k, , v] of gains) bumpCounter(k, v);
    busyQuest = false; return;
  }
  // la tour se tasse puis pulse, onde turquoise au sol
  const g = tower.group;
  animate(520, (t) => {
    const s = t < 0.18 ? 1 - 0.1 * ease.outQuad(t / 0.18) : 0.9 + 0.1 * ease.outBack((t - 0.18) / 0.82) + Math.sin((t - 0.18) * 14) * 0.03 * (1 - t);
    g.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  });
  const ring = FX.ring; ring.visible = true;
  animate(800, (t) => { const s = 1 + ease.outCubic(t) * 4.5; ring.scale.set(s, s, s); ring.material.opacity = 0.9 * (1 - t); }).then(() => { ring.visible = false; });
  const halo = ENT.crystalHalo, baseOp = halo.material.opacity;
  animate(700, (t) => { const k = Math.sin(t * Math.PI); halo.material.opacity = baseOp + k * 0.9; halo.scale.setScalar(2.2 + k * 2); });
  // étincelles 3D autour du cristal
  for (let q = 0; q < 14; q++) { const a = rnd() * Math.PI * 2; spawn({ x: wx(10), y: 5.3, z: wz(1), vx: Math.cos(a) * R(1, 2.4), vy: R(1.5, 3.5), vz: Math.sin(a) * R(1, 2.4), g: -5, drag: 1.5, life: R(0.6, 0.9), size: R(0.12, 0.2), color: q % 2 ? 0x9ff0e6 : 0xfff2c4 }); }
  // icônes DOM : jaillissement puis arc vers le HUD
  updateCamera();
  const [sx, sy] = toScreen(new THREE.Vector3(wx(10), 5.3, wz(1)));
  const flights = []; let i = 0;
  for (const [k, n, v] of gains) for (let q = 0; q < n; q++) flights.push({ k, share: v / n, i: i++ });
  const total = flights.length;
  await Promise.all(flights.map((f) => new Promise((done) => {
    const el = document.createElement('div'); el.className = 'fly ico ' + ICONS[f.k][0]; el.innerHTML = ICONS[f.k][1];
    el.style.opacity = '0'; overlay.appendChild(el);
    const ang = -Math.PI / 2 + (f.i / (total - 1) - 0.5) * 2.4 + R(-0.15, 0.15), rad = R(48, 78);
    const bx = clamp(sx + Math.cos(ang) * rad, 26, view.W - 26), by = clamp(sy + Math.sin(ang) * rad, view.availTop + 20, view.H);
    const delay = f.i * 55, burst = 260, fly = R(560, 700);
    const [tx, ty] = hudTarget(f.k);
    const cx = (bx + tx) / 2 + R(-40, 40), cy = Math.min(by, ty) - R(60, 120);
    animate(burst, (t) => {
      const e = ease.outCubic(t), sc = t < 0.6 ? ease.outBack(t / 0.6) * 1.1 : 1.1 - (t - 0.6) * 0.25;
      el.style.opacity = '1'; el.style.transform = `translate(${lerp(sx, bx, e)}px, ${lerp(sy, by, e)}px) scale(${sc})`;
    }, { gl: false, delay }).then(() => animate(fly, (t) => {
      const e = ease.inCubic(t) * 0.75 + t * 0.25, u = 1 - e;
      const x = u * u * bx + 2 * u * e * cx + e * e * tx, y = u * u * by + 2 * u * e * cy + e * e * ty;
      el.style.transform = `translate(${x}px, ${y}px) scale(${1 - e * 0.35}) rotate(${e * 30}deg)`;
    }, { gl: false })).then(() => { el.remove(); bumpCounter(f.k, f.share); done(); });
  })));
  busyQuest = false;
}

/* =========================================================================
   MOMENT 2 — Construire : l'atelier tombe, s'écrase, rebondit, poussière
   ========================================================================= */
let built = false;
async function momentBuild() {
  if (built) return; built = true; updateButtons();
  res.materiaux -= 12; bumpCounter('materiaux', -12);
  const w = ENT.workshop, g = w.group, plot = ENT.plot;
  say('Atelier construit sur le terrain à bâtir. Moins 12 Matériaux.');
  if (selected === plot) select(null, false);
  if (RM) { plot.group.visible = false; g.visible = true; g.position.y = 0; g.scale.set(1, 1, 1); shadowDirty = true; invalidate(); select(w, false); return; }
  const blob = FX.blob; blob.visible = true; blob.material.opacity = 0;
  g.visible = true; const H0 = 13;
  await animate(560, (t) => {
    const e = ease.inQuad(t);
    g.position.y = H0 * (1 - e);
    g.scale.set(0.94, 1.08, 0.94);
    blob.material.opacity = 0.35 + e * 0.65; blob.scale.setScalar(0.5 + e * 0.55);
    shadowDirty = true;
  });
  // impact
  plot.group.visible = false;
  view.shake = 0.18;
  const cx = g.position.x, cz = g.position.z;
  for (let q = 0; q < 30; q++) {
    const a = (q / 30) * Math.PI * 2 + R(-0.1, 0.1), sp = R(1.6, 3.2);
    spawn({ x: cx + Math.cos(a) * 1.0, y: R(0.05, 0.3), z: cz + Math.sin(a) * 1.0, vx: Math.cos(a) * sp, vy: R(0.4, 1.4), vz: Math.sin(a) * sp, g: -0.6, drag: 3.2, life: R(0.8, 1.2), size: R(0.24, 0.42), grow: 0.6, color: pick([0xf2e6c8, 0xe7d4b0, 0xd8bf96]) });
  }
  for (let q = 0; q < 12; q++) { const a = rnd() * Math.PI * 2; spawn({ x: cx + Math.cos(a) * 0.8, y: 0.1, z: cz + Math.sin(a) * 0.8, vx: Math.cos(a) * R(1, 2.5), vy: R(2, 4), vz: Math.sin(a) * R(1, 2.5), g: -12, life: R(0.6, 0.9), size: R(0.12, 0.18), floor: 0.03, color: pick([P.soilTop, P.grass, P.woodD]) }); }
  blob.visible = false;
  await animate(700, (t) => {
    // squash & stretch amorti (volume conservé)
    const s = 1 - 0.32 * Math.exp(-t * 6) * Math.cos(t * 17);
    g.position.y = 0;
    g.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    shadowDirty = true;
  });
  g.scale.set(1, 1, 1); shadowDirty = true; invalidate();
}

/* =========================================================================
   MOMENT 3 — Récolter : la parcelle mûre se vide, particules, « +3 » flottant
   ========================================================================= */
let busyHarvest = false;
async function momentHarvest() {
  const p = [ENT['p-ble'], ENT['p-courge']].find((e) => !e.harvested);
  if (!p || busyHarvest) return; busyHarvest = true;
  p.harvested = true; updateButtons();
  res.energie += 3;
  p.desc = 'Récoltée, prête à ressemer'; p.tag = 'Libre';
  if (selected === p) { selEl.querySelector('span').textContent = p.desc; selEl.querySelector('.tag').textContent = p.tag; }
  say(`${p.name} récoltée : plus 3 Énergie.`);
  const im = p.meshes.solid;
  const hide = (c) => { for (const i of c.idx) { _m.makeScale(1e-4, 1e-4, 1e-4); im.setMatrixAt(i, _m); } };
  const center = p.group.position;
  if (RM) {
    p.crops.forEach(hide); im.instanceMatrix.needsUpdate = true; shadowDirty = true; invalidate();
    floatText('+3', 'Énergie', new THREE.Vector3(center.x, 1.2, center.z), true);
    bumpCounter('energie', 3); busyHarvest = false; return;
  }
  const order = [...p.crops].sort((a, b) => (a.x - a.z) - (b.x - b.z));
  const flash = FX.flash; flash.visible = true; flash.position.set(center.x, 0.08, center.z);
  animate(1000, (t) => { flash.material.opacity = Math.sin(Math.min(1, t * 1.4) * Math.PI) * 0.85; const s = 0.9 + t * 0.5; flash.scale.set(s, s, s); }).then(() => { flash.visible = false; });
  const golden = p.stage === 'ble' ? [P.wheat, P.wheatD, 0xfff0b8] : [P.squash, P.squashD, P.leaf];
  const _t = new THREE.Matrix4();
  await Promise.all(order.map((c, n) => animate(300, (t) => {
    const lift = ease.outQuad(Math.min(1, t * 1.6)) * 0.6, sc = t < 0.25 ? 1 + t * 0.8 : 1.2 - 1.2 * ease.inQuad((t - 0.25) / 0.75);
    for (let q = 0; q < c.idx.length; q++) {
      _t.copy(c.base[q]); const e = _t.elements;
      // remonte et rapetisse autour de son propre centre
      e[0] *= sc; e[1] *= sc; e[2] *= sc; e[4] *= sc; e[5] *= sc; e[6] *= sc; e[8] *= sc; e[9] *= sc; e[10] *= sc;
      e[13] += lift;
      im.setMatrixAt(c.idx[q], _t);
    }
    im.instanceMatrix.needsUpdate = true;
    if (t > 0 && !c.spawned) {
      c.spawned = true;
      const wxp = center.x + c.x, wzp = center.z + c.z;
      for (let q = 0; q < 5; q++) spawn({ x: wxp, y: 0.35, z: wzp, vx: R(-1.4, 1.4), vy: R(3.0, 5.4), vz: R(-1.4, 1.4), g: -11, life: R(0.75, 1.1), size: R(0.13, 0.22), floor: 0.0, color: pick(golden) });
    }
  }, { delay: n * 30 })));
  for (const c of p.crops) { hide(c); c.spawned = false; } im.instanceMatrix.needsUpdate = true; shadowDirty = true;
  floatText('+3', 'Énergie', new THREE.Vector3(center.x, 1.0, center.z));
  await animate(520, () => {}, { gl: false });
  bumpCounter('energie', 3);
  busyHarvest = false;
}
function floatText(big, small, world, still) {
  const el = document.createElement('div'); el.className = 'float'; el.innerHTML = `${big} <small>${small}</small>`; overlay.appendChild(el);
  const f = { el, world, dy: 0 }; floats.add(f); updateOverlay();
  animate(still ? 1400 : 1150, (t) => {
    if (still) { el.style.opacity = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25; return; }
    f.dy = -ease.outCubic(t) * 56;
    const s = t < 0.2 ? ease.outBack(t / 0.2) : 1;
    el.style.transform = `translate(-50%,-50%) scale(${s})`;
    el.style.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    updateOverlay();
  }, { gl: false }).then(() => { floats.delete(f); el.remove(); });
}

/* =========================================================================
   Remise à zéro (pour rejouer les moments)
   ========================================================================= */
function resetWorld() {
  built = false; ENT.workshop.group.visible = false; ENT.plot.group.visible = true; ENT.workshop.group.position.y = 0;
  for (const id of ['p-ble', 'p-courge']) {
    const p = ENT[id]; p.harvested = false; p.desc = 'Prête à récolter'; p.tag = 'Mûre';
    const im = p.meshes.solid; for (const c of p.crops) c.idx.forEach((i, q) => im.setMatrixAt(i, c.base[q])); im.instanceMatrix.needsUpdate = true;
  }
  if (selected === ENT.workshop) select(null, false);
  shadowDirty = true; updateButtons(); invalidate();
}
function updateButtons() {
  document.getElementById('bBuild').disabled = built;
  document.getElementById('bHarvest').disabled = ENT['p-ble'].harvested && ENT['p-courge'].harvested;
}

/* =========================================================================
   Debug / mesures
   ========================================================================= */
function updateDebug() {
  const d = document.getElementById('dbg'); d.hidden = false;
  const now = performance.now(); const last = perf.stamps.filter((s) => s > now - 1000).length;
  d.textContent = `rendus/s ${last}  total ${perf.renders}\nappels ${renderer.info.render.calls}  tri ${renderer.info.render.triangles}\nombres maj ${perf.shadowUpdates}  dpr ${DPR}`;
}

/* =========================================================================
   Démarrage
   ========================================================================= */
const FX = {};
function buildFX() {
  const flat = (geo, mat, x, z) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.visible = false; scene.add(m); return m; };
  FX.ring = flat(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0x7fe0d6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), wx(10), wz(1));
  FX.blob = flat(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: TEX_BLOB, transparent: true, depthWrite: false, opacity: 0 }), wx(1.5), wz(9.5));
  FX.flash = flat(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: TEX_HALO, color: 0xffd98a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }), 0, 0);
  // maillages factices pour précompiler les shaders de contour
  for (const mat of [OUT_OUTER, OUT_INNER]) { const d = new THREE.InstancedMesh(BOX, mat, 1); d.visible = false; scene.add(d); }
}
buildHills();
buildWorld();
buildFX();
buildFlecks();
buildParticles();
// Liste accessible des lieux (sélection au clavier)
const places = document.getElementById('places');
for (const e of entities.values()) {
  if (!e.selectable) continue;
  const b = document.createElement('button'); b.textContent = 'Sélectionner : ' + e.name;
  b.addEventListener('focus', () => { if (e.group.visible) select(e); });
  b.addEventListener('click', () => { if (e.group.visible) select(e); });
  places.appendChild(b);
}
document.getElementById('rotL').onclick = () => rotate(-1);
document.getElementById('rotR').onclick = () => rotate(1);
document.getElementById('bQuest').onclick = momentQuest;
document.getElementById('bBuild').onclick = momentBuild;
document.getElementById('bHarvest').onclick = momentHarvest;
document.getElementById('reset').onclick = resetWorld;
const ambBtn = document.getElementById('amb');
function syncAmb() { ambBtn.setAttribute('aria-pressed', String(ambientOn && !RM)); ambBtn.disabled = RM; if (RM) ambBtn.title = 'Désactivé : mouvement réduit'; }
ambBtn.onclick = () => { ambientOn = !ambientOn; syncAmb(); lastAmb = clock(); invalidate(); };
mqRM.addEventListener?.('change', (e) => { RM = e.matches; syncAmb(); invalidate(); });
const todIn = document.getElementById('tod');
todIn.addEventListener('input', () => setTime(Number(todIn.value)));
document.getElementById('now').onclick = () => {
  const d = new Date(); const target = d.getHours() + d.getMinutes() / 60;
  if (RM) return setTime(target);
  const from = tod; let delta = target - from; if (Math.abs(delta) > 12) delta -= Math.sign(delta) * 24;
  animate(900, (t) => setTime(from + delta * ease.inOutCubic(t), true));
};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'q' || e.key === 'Q') rotate(-1);
  if (e.key === 'e' || e.key === 'E') rotate(1);
  if (e.key === 'Escape') select(null);
});
addEventListener('resize', fit);
syncAmb();
const startH = QS.has('t') ? Number(QS.get('t')) : (() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; })();
setTime(startH, true);
fit();
updateButtons();
if (QS.get('sel')) select(entities.get(QS.get('sel')), false);
async function advance(ms) {
  // avance l'horloge virtuelle par pas de 16 ms (les promesses des animations se résolvent entre les pas)
  const steps = Math.max(1, Math.round(ms / 16));
  for (let k = 0; k < steps; k++) { vnow += 16; tick(vnow, true); await Promise.resolve(); await Promise.resolve(); }
  needsRender = true; tick(vnow);
}
if (MANUAL) { vnow = 1000; lastTick = lastAmb = vnow; tick(vnow); }
window.__api = { advance, quest: momentQuest, build: momentBuild, harvest: momentHarvest, reset: resetWorld, setTime, rotate, select: (id) => select(entities.get(id) || null, false), pickAt, renderer, perf, view, toScreen, entities, entAnchor, setAmbient: (v) => { ambientOn = v; syncAmb(); invalidate(); } };

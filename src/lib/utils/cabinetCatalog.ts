import * as THREE from 'three';
import { DRESSING_CATEGORY, type CabinetDef } from './furnitureCatalog';
import type { CabinetFinish } from '$lib/models/types';
import { handleFinish, topFinish } from './cabinetFinishes';

/**
 * Kitchen and dressing-room units: catalog entries plus a parametric 3D builder.
 * All sizes are in cm. Fronts face +Z, backs sit on -Z (same as the rest of the catalog).
 */

// ── 3D builder ────────────────────────────────────────────────────────────

const DRESS_D = 55;

function mat(color: THREE.ColorRepresentation, roughness = 0.65, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1)), m);
  mesh.position.set(x, y + h / 2, z); // y is the bottom of the box
  group.add(mesh);
  return mesh;
}

interface Palette { noHandles: boolean; doors?: number; open: boolean; body: THREE.Material; front: THREE.Material; top: THREE.Material; handle: THREE.Material; plinth: THREE.Material; dark: THREE.Material; }

function palette(color: string, dressing: boolean, finish?: CabinetFinish): Palette {
  const base = new THREE.Color(color);
  const body = base.clone().multiplyScalar(0.82);
  const topDef = topFinish(finish?.top);
  const top = dressing ? base.clone().multiplyScalar(0.95) : new THREE.Color(topDef.hex || color);
  const handleDef = handleFinish(finish?.handle);
  const handleColor = handleDef.hex || color;
  return {
    body: mat(body, 0.8), front: mat(base, 0.55), top: dressing ? mat(top, 0.35, 0.1) : mat(top, topDef.roughness, topDef.metalness),
    handle: mat(handleColor, 0.3, handleDef.id === 'none' ? 0.05 : 0.8), plinth: mat('#2b2b2b', 0.9), dark: mat('#1a1a1a', 0.4, 0.6),
    noHandles: handleDef.id === 'none',
    doors: finish?.doors && finish.doors > 0 ? Math.min(4, Math.floor(finish.doors)) : undefined,
    open: !!finish?.open,
  };
}

const GAP = 0.4;

/** A flat door/drawer front on the +Z face, with a handle. `hx`,`hy` are centre-of-front coordinates. */
function front(g: THREE.Group, p: Palette, cx: number, y: number, fw: number, fh: number, zFace: number, handle: 'v' | 'h' | 'none' = 'v', handleSide: 'l' | 'r' = 'r'): void {
  box(g, fw - GAP, fh - GAP, 1.8, cx, y + GAP / 2, zFace + 0.9, p.front);
  if (handle === 'none' || p.noHandles) return;
  if (handle === 'h') {
    box(g, Math.min(fw * 0.5, 16), 1.2, 1.6, cx, y + fh - 5, zFace + 2.4, p.handle);
  } else {
    const hx = cx + (handleSide === 'r' ? -1 : 1) * (fw / 2 - 3);
    box(g, 1.2, Math.min(fh * 0.35, 18), 1.6, hx, y + fh * 0.5 - Math.min(fh * 0.35, 18) / 2, zFace + 2.4, p.handle);
  }
}

function doorsAcross(g: THREE.Group, p: Palette, w: number, y: number, fh: number, zFace: number, maxDoor = 60): void {
  const n = p.doors ?? Math.max(1, Math.ceil(w / maxDoor));
  const fw = w / n;
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + fw * (i + 0.5);
    const hingeLeft = i % 2 === 0; // matches the handle side: handles on the right => hinge on the left
    if (!p.open) { front(g, p, cx, y, fw, fh, zFace, 'v', hingeLeft ? 'r' : 'l'); continue; }
    // Open: swing the door about its hinge edge, outward (+Z).
    const hingeX = cx + (hingeLeft ? -fw / 2 : fw / 2);
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, 0, 0);
    front(pivot, p, cx - hingeX, y, fw, fh, zFace, 'v', hingeLeft ? 'r' : 'l');
    pivot.rotation.y = (hingeLeft ? -1 : 1) * (100 * Math.PI) / 180;
    g.add(pivot);
  }
}

function drawersStack(g: THREE.Group, p: Palette, w: number, y: number, totalH: number, zFace: number, count: number, cx = 0): void {
  const fh = totalH / count;
  for (let i = 0; i < count; i++) front(g, p, cx, y + fh * i, w, fh, zFace, 'h');
}

const PLINTH = 10;
const TOP = 3;

function baseCarcass(g: THREE.Group, p: Palette, w: number, d: number, h: number, withTop = true): { y0: number; frontH: number; zFace: number } {
  box(g, w - 1, PLINTH, d - 6, 0, 0, -2, p.plinth);
  const carcassH = h - PLINTH - (withTop ? TOP : 0);
  box(g, w, carcassH, d - 2, 0, PLINTH, -1, p.body);
  if (withTop) box(g, w + 0.2, TOP, d + 2, 0, h - TOP, 0, p.top);
  return { y0: PLINTH, frontH: carcassH, zFace: d / 2 - 1 };
}

function lShape(g: THREE.Group, p: Palette, w: number, d: number, h: number, arm: number, opts: { plinth: boolean; top: boolean; elevated: boolean }): void {
  // Two arms: back arm along -Z side, side arm along +X side.
  const y0 = opts.plinth ? PLINTH : 0;
  const topH = opts.top ? TOP : 0;
  const bodyH = h - y0 - topH;
  box(g, w, bodyH, arm, 0, y0, -d / 2 + arm / 2, p.body);
  box(g, arm, bodyH, d, w / 2 - arm / 2, y0, 0, p.body);
  if (opts.plinth) {
    box(g, w - 2, PLINTH, arm - 6, 0, 0, -d / 2 + arm / 2 - 2, p.plinth);
    box(g, arm - 6, PLINTH, d - 2, w / 2 - arm / 2 - 2, 0, 0, p.plinth);
  }
  if (opts.top) {
    box(g, w + 0.2, topH, arm + 2, 0, h - topH, -d / 2 + arm / 2, p.top);
    box(g, arm + 2, topH, d, w / 2 - arm / 2, h - topH, 0, p.top);
  }
  // Fronts: along the open sides (+Z of back arm to the left of the side arm; -X face of the side arm).
  const leftW = w - arm;
  front(g, p, -w / 2 + leftW / 2, y0, leftW, bodyH, -d / 2 + arm, 'v', 'r');
  const sideLen = d - arm;
  const side = new THREE.Group();
  front(side, p, 0, y0, sideLen, bodyH, 0, 'v', 'r');
  side.rotation.y = -Math.PI / 2;
  side.position.set(w / 2 - arm, 0, -d / 2 + arm + sideLen / 2);
  g.add(side);
}

export function createCabinetModel(def: CabinetDef & { finish?: CabinetFinish }): THREE.Group {
  const g = new THREE.Group();
  const { width: w, depth: d, height: h } = def;
  const p = palette(def.color, def.category === DRESSING_CATEGORY, def.finish);

  switch (def.kind) {
    case 'base': {
      const c = baseCarcass(g, p, w, d, h);
      doorsAcross(g, p, w, c.y0, c.frontH, c.zFace);
      break;
    }
    case 'drawers': {
      const c = baseCarcass(g, p, w, d, h);
      drawersStack(g, p, w, c.y0, c.frontH, c.zFace, 3);
      break;
    }
    case 'sink': {
      const c = baseCarcass(g, p, w, d, h);
      front(g, p, 0, c.y0 + c.frontH * 0.8, w, c.frontH * 0.2, c.zFace, 'h'); // false drawer front
      doorsAcross(g, p, w, c.y0, c.frontH * 0.8, c.zFace);
      const basinW = Math.min(w * 0.55, 60);
      box(g, basinW, 1, d * 0.6, -w * 0.12, h, 0, mat('#cfd4da', 0.25, 0.8));
      box(g, 2.5, 22, 2.5, -w * 0.12, h, -d * 0.36, p.handle); // tap
      break;
    }
    case 'hob': {
      const c = baseCarcass(g, p, w, d, h);
      front(g, p, 0, c.y0 + c.frontH * 0.75, w, c.frontH * 0.25, c.zFace, 'h');
      doorsAcross(g, p, w, c.y0, c.frontH * 0.75, c.zFace);
      const hobW = Math.min(w - 6, 58), hobD = Math.min(d - 8, 50);
      box(g, hobW, 0.6, hobD, 0, h, 0, p.dark);
      const burner = new THREE.CylinderGeometry(4.5, 4.5, 0.4, 20);
      const bm = mat('#555', 0.4, 0.7);
      const pts: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
      for (const [sx, sz] of pts) {
        const b = new THREE.Mesh(burner, bm);
        b.position.set(sx * hobW * 0.24, h + 0.8, sz * hobD * 0.24);
        g.add(b);
      }
      break;
    }
    case 'corner_base': {
      lShape(g, p, w, d, h, 60, { plinth: true, top: true, elevated: false });
      break;
    }
    case 'island': {
      const c = baseCarcass(g, p, w, d, h, false);
      doorsAcross(g, p, w, c.y0, c.frontH, c.zFace);
      // Back panel (island is seen from both sides)
      box(g, w - GAP, c.frontH - GAP, 1.8, 0, c.y0, -d / 2 + 1.9, p.front);
      box(g, w + 4, TOP, d + 8, 0, h - TOP, 0, p.top);
      break;
    }
    case 'filler': {
      box(g, w, h - PLINTH, d - 2, 0, PLINTH, -1, p.front);
      box(g, w, PLINTH, d - 6, 0, 0, -2, p.plinth);
      break;
    }
    case 'wall': {
      box(g, w, h, d, 0, 0, 0, p.body);
      doorsAcross(g, p, w, 0, h, d / 2, 50);
      break;
    }
    case 'wall_corner': {
      lShape(g, p, w, d, h, 35, { plinth: false, top: false, elevated: true });
      break;
    }
    case 'hood': {
      // Chimney hood: slanted canopy + flue
      const canopy = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.32, w * 0.5, 14, 4, 1), mat('#9aa0a6', 0.3, 0.8));
      canopy.rotation.y = Math.PI / 4;
      canopy.scale.z = d / w;
      canopy.position.set(0, 7, 0);
      g.add(canopy);
      box(g, w * 0.3, h - 14, d * 0.45, 0, 14, -d * 0.25, mat('#9aa0a6', 0.3, 0.8));
      break;
    }
    case 'tall': {
      const c = baseCarcass(g, p, w, d, h, false);
      const lowH = c.frontH * 0.62;
      doorsAcross(g, p, w, c.y0, lowH, c.zFace);
      doorsAcross(g, p, w, c.y0 + lowH, c.frontH - lowH, c.zFace);
      break;
    }
    case 'tall_oven': {
      const c = baseCarcass(g, p, w, d, h, false);
      front(g, p, 0, c.y0, w, 22, c.zFace, 'h');
      front(g, p, 0, c.y0 + 22, w, 22, c.zFace, 'h');
      // Oven + microwave niches
      const ovenY = c.y0 + 44 + 30;
      box(g, w - 6, 60, 1.5, 0, ovenY, c.zFace + 0.6, p.dark);
      box(g, w - 12, 8, 1, 0, ovenY + 55, c.zFace + 1.6, mat('#777', 0.3, 0.8));
      const microY = ovenY + 66;
      box(g, w - 6, 38, 1.5, 0, microY, c.zFace + 0.6, p.dark);
      front(g, p, 0, microY + 38 + 2, w, c.y0 + c.frontH - (microY + 38 + 2), c.zFace, 'v');
      break;
    }
    case 'fridge_tall': {
      // Housing with a fridge in the lower niche and a cabinet above.
      const c = baseCarcass(g, p, w, d, h, false);
      const nicheH = 178;
      box(g, w - 4, nicheH, d - 10, 0, c.y0, -1, mat('#d9dde2', 0.35, 0.5));
      box(g, 1, nicheH * 0.5, 1, w * 0.3, c.y0 + nicheH * 0.35, d / 2 - 4, p.handle);
      front(g, p, 0, c.y0 + nicheH + 2, w, h - c.y0 - nicheH - 2, c.zFace, 'v');
      break;
    }
    // ── Dressing room ──────────────────────────────────────────────────
    case 'hang': {
      box(g, w, h, d - 2, 0, 0, -1, p.body);
      doorsAcross(g, p, w, PLINTH, h - PLINTH, d / 2 - 1, 60);
      break;
    }
    case 'shelves': {
      // Open shelving: sides, back, 7 shelves
      box(g, 2, h, d, -w / 2 + 1, 0, 0, p.front);
      box(g, 2, h, d, w / 2 - 1, 0, 0, p.front);
      box(g, w, h, 1, 0, 0, -d / 2 + 0.5, p.body);
      const n = 7;
      for (let i = 0; i <= n; i++) box(g, w - 4, 2, d - 2, 0, (h - 2) * (i / n), 0, p.front);
      break;
    }
    case 'dress_drawers': {
      box(g, w, PLINTH, d - 6, 0, 0, -2, p.plinth);
      box(g, w, h - PLINTH, d - 2, 0, PLINTH, -1, p.body);
      drawersStack(g, p, w, PLINTH, h - PLINTH, d / 2 - 1, 5);
      break;
    }
    case 'shoes': {
      box(g, 2, h, d, -w / 2 + 1, 0, 0, p.front);
      box(g, 2, h, d, w / 2 - 1, 0, 0, p.front);
      box(g, w, h, 1, 0, 0, -d / 2 + 0.5, p.body);
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const s = box(g, w - 4, 1.5, d - 2, 0, (h - 1.5) * (i / n), 0, p.front);
        s.rotation.x = -0.12;
      }
      break;
    }
    case 'dress_corner': {
      lShape(g, p, w, d, h, DRESS_D, { plinth: false, top: false, elevated: false });
      break;
    }
    case 'dress_island': {
      box(g, w, PLINTH, d - 6, 0, 0, 0, p.plinth);
      box(g, w, h - PLINTH - TOP, d - 2, 0, PLINTH, 0, p.body);
      box(g, w + 2, TOP, d + 2, 0, h - TOP, 0, p.top);
      drawersStack(g, p, w, PLINTH, h - PLINTH - TOP, d / 2 - 1, 4);
      box(g, w - GAP, h - PLINTH - TOP - GAP, 1.8, 0, PLINTH, -d / 2 + 0.1, p.front);
      break;
    }
    case 'vanity': {
      // Table with two side drawer stacks and a knee space
      const legW = 38;
      for (const s of [-1, 1]) {
        box(g, legW, h - TOP, d - 2, s * (w / 2 - legW / 2), 0, 0, p.body);
        drawersStack(g, p, legW, 2, h - TOP - 4, d / 2 - 1, 3, s * (w / 2 - legW / 2));
      }
      box(g, w + 2, TOP, d + 2, 0, h - TOP, 0, p.top);
      break;
    }
    default:
      box(g, w, h, d, 0, 0, 0, p.body);
  }
  return g;
}


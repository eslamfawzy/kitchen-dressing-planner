import { createDefaultProject } from '$lib/stores/project';
import type { Project } from '$lib/models/types';
import { planLayout, type LayoutOptions } from './cabinetLayout';

const uid = () => Math.random().toString(36).slice(2, 10);
const WALL = 15;

interface Room { name: string; x0: number; y0: number; options: Omit<LayoutOptions, 'startSide'> & { startSide?: LayoutOptions['startSide'] }; }

export const STARTER_ROOMS: Room[] = [
  { name: 'Kitchen', x0: 100, y0: 100, options: { kind: 'kitchen', shape: 'L', width: 420, depth: 320, island: false, wallUnits: true } },
  { name: 'Dressing', x0: 700, y0: 100, options: { kind: 'dressing', shape: 'U', width: 320, depth: 280, island: false, wallUnits: false } },
];

/** A new project that already contains a kitchen and a dressing room, ready to edit. */
export function createStarterProject(name = 'Kitchen & Dressing'): Project {
  const project = createDefaultProject(name);
  const floor = project.floors[0];
  for (const room of STARTER_ROOMS) {
    const { x0, y0 } = room;
    const { width, depth } = room.options;
    const h = WALL / 2;
    const c = [
      { x: x0 - h, y: y0 - h }, { x: x0 + width + h, y: y0 - h },
      { x: x0 + width + h, y: y0 + depth + h }, { x: x0 - h, y: y0 + depth + h },
    ];
    for (let i = 0; i < 4; i++) {
      floor.walls.push({ id: uid(), start: { ...c[i] }, end: { ...c[(i + 1) % 4] }, thickness: WALL, height: 280, startHeight: 280, endHeight: 280, color: '#444444' });
    }
    const plan = planLayout({ startSide: 0, ...room.options });
    for (const it of plan.items) {
      floor.furniture.push({
        id: uid(), catalogId: it.catalogId, position: { x: x0 + it.x, y: y0 + it.y }, rotation: it.rotation,
        scale: { x: 1, y: 1, z: 1 }, ...(it.width !== undefined ? { width: it.width } : {}),
      });
    }
  }
  return project;
}

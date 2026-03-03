import { create } from 'zustand';

export type BlockType = 'dirt' | 'grass' | 'stone' | 'wood' | 'leaves' | 'bear' | 'glass' | 'bed';
export type ActiveTool = BlockType | 'hand' | 'sword' | 'shotgun';
export type Limb = 
  'head' | 'neck' | 
  'leftArm' | 'leftForearm' | 'leftHand' | 
  'rightArm' | 'rightForearm' | 'rightHand' | 
  'leftThigh' | 'leftCalf' | 'leftFoot' | 
  'rightThigh' | 'rightCalf' | 'rightFoot';
export type MobType = 'fleshy' | 'zombie' | 'human';

export interface Block {
  pos: [number, number, number];
  type: BlockType;
}

export interface AvatarConfig {
  headSize: number;
  torsoWidth: number;
  torsoHeight: number;
  torsoDepth: number;
  armWidth: number;
  armLength: number;
  legWidth: number;
  legLength: number;
  skinColor: string;
  shirtColor: string;
  pantsColor: string;
  eyeColor: string;
}

const defaultAvatar: AvatarConfig = {
  headSize: 0.5,
  torsoWidth: 0.5,
  torsoHeight: 0.75,
  torsoDepth: 0.25,
  armWidth: 0.25,
  armLength: 0.75,
  legWidth: 0.25,
  legLength: 0.75,
  skinColor: '#ffccaa',
  shirtColor: '#00aaff',
  pantsColor: '#0000aa',
  eyeColor: '#000000',
};

export interface MobData {
  id: string;
  pos: [number, number, number];
  type: MobType;
  grabbedBy?: string | null;
  health: number;
  missingLimbs?: string[];
}

interface GameState {
  blocks: Record<string, Block>;
  addBlock: (x: number, y: number, z: number, type: BlockType) => void;
  removeBlock: (x: number, y: number, z: number) => void;
  activeBlockType: ActiveTool;
  setActiveBlockType: (type: ActiveTool) => void;
  isThirdPerson: boolean;
  toggleThirdPerson: () => void;
  setThirdPerson: (val: boolean) => void;
  joystickMove: { x: number; y: number };
  setJoystickMove: (val: { x: number; y: number }) => void;
  actionJump: boolean;
  setActionJump: (val: boolean) => void;
  actionPlace: boolean;
  setActionPlace: (val: boolean) => void;
  actionBreak: boolean;
  setActionBreak: (val: boolean) => void;
  avatarConfig: AvatarConfig;
  setAvatarConfig: (config: Partial<AvatarConfig>) => void;
  isEditingAvatar: boolean;
  setIsEditingAvatar: (val: boolean) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (val: boolean) => void;
  sandboxMode: boolean;
  setSandboxMode: (val: boolean) => void;
  mobs: MobData[];
  addMob: (pos: [number, number, number], type: MobType) => void;
  updateMob: (id: string, data: Partial<MobData>) => void;
  removeMob: (id: string) => void;
  cutMobLimb: (id: string, limb: string) => void;
  actionSpawnMob: boolean;
  setActionSpawnMob: (val: boolean) => void;
  actionSpawnZombie: boolean;
  setActionSpawnZombie: (val: boolean) => void;
  actionSpawnHuman: boolean;
  setActionSpawnHuman: (val: boolean) => void;
  missingLimbs: Limb[];
  addMissingLimb: (limb: Limb) => void;
  grabbedBy: string | null;
  setGrabbedBy: (id: string | null) => void;
  dragTarget: [number, number, number] | null;
  setDragTarget: (pos: [number, number, number] | null) => void;
  playerPos: [number, number, number];
  setPlayerPos: (pos: [number, number, number]) => void;
  health: number;
  setHealth: (h: number | ((prev: number) => number)) => void;
  isDead: boolean;
  setIsDead: (d: boolean) => void;
  bloodParticles: { id: string; pos: [number, number, number]; vel: [number, number, number] }[];
  addBlood: (pos: [number, number, number], count: number) => void;
  removeBlood: (id: string) => void;
  zombieBites: number;
  addZombieBite: () => void;
}

const generateWorld = () => {
  const blocks: Record<string, Block> = {};
  for (let x = -10; x < 10; x++) {
    for (let z = -10; z < 10; z++) {
      blocks[`${x},0,${z}`] = { pos: [x, 0, z], type: 'grass' };
      blocks[`${x},-1,${z}`] = { pos: [x, -1, z], type: 'dirt' };
      blocks[`${x},-2,${z}`] = { pos: [x, -2, z], type: 'stone' };
    }
  }
  // Add a tree
  blocks[`0,1,0`] = { pos: [0, 1, 0], type: 'wood' };
  blocks[`0,2,0`] = { pos: [0, 2, 0], type: 'wood' };
  blocks[`0,3,0`] = { pos: [0, 3, 0], type: 'wood' };
  for (let x = -2; x <= 2; x++) {
    for (let z = -2; z <= 2; z++) {
      if (x === 0 && z === 0) continue;
      blocks[`${x},3,${z}`] = { pos: [x, 3, z], type: 'leaves' };
      blocks[`${x},4,${z}`] = { pos: [x, 4, z], type: 'leaves' };
    }
  }
  blocks[`0,4,0`] = { pos: [0, 4, 0], type: 'leaves' };
  blocks[`0,5,0`] = { pos: [0, 5, 0], type: 'leaves' };

  return blocks;
};

export const useStore = create<GameState>((set) => ({
  blocks: generateWorld(),
  addBlock: (x, y, z, type) => set((state) => {
    const key = `${x},${y},${z}`;
    if (state.blocks[key]) return state;
    return { blocks: { ...state.blocks, [key]: { pos: [x, y, z], type } } };
  }),
  removeBlock: (x, y, z) => set((state) => {
    const key = `${x},${y},${z}`;
    if (!state.blocks[key]) return state;
    const newBlocks = { ...state.blocks };
    delete newBlocks[key];
    return { blocks: newBlocks };
  }),
  activeBlockType: 'wood',
  setActiveBlockType: (type) => set({ activeBlockType: type }),
  isThirdPerson: false,
  toggleThirdPerson: () => set((state) => ({ isThirdPerson: !state.isThirdPerson })),
  setThirdPerson: (val) => set({ isThirdPerson: val }),
  joystickMove: { x: 0, y: 0 },
  setJoystickMove: (val) => set({ joystickMove: val }),
  actionJump: false,
  setActionJump: (val) => set({ actionJump: val }),
  actionPlace: false,
  setActionPlace: (val) => set({ actionPlace: val }),
  actionBreak: false,
  setActionBreak: (val) => set({ actionBreak: val }),
  avatarConfig: defaultAvatar,
  setAvatarConfig: (config) => set((state) => ({ avatarConfig: { ...state.avatarConfig, ...config } })),
  isEditingAvatar: false,
  setIsEditingAvatar: (val) => set({ isEditingAvatar: val }),
  isMenuOpen: false,
  setIsMenuOpen: (val) => set({ isMenuOpen: val }),
  sandboxMode: false,
  setSandboxMode: (val) => set({ sandboxMode: val }),
  mobs: [],
  addMob: (pos, type) => set((state) => ({ mobs: [...state.mobs, { id: Math.random().toString(), pos, type, health: 100 }] })),
  updateMob: (id, data) => set((state) => ({ mobs: state.mobs.map(m => m.id === id ? { ...m, ...data } : m) })),
  removeMob: (id) => set((state) => ({ mobs: state.mobs.filter(m => m.id !== id) })),
  cutMobLimb: (id, limb) => set((state) => ({
    mobs: state.mobs.map(m => m.id === id ? { ...m, missingLimbs: [...(m.missingLimbs || []), limb] } : m)
  })),
  actionSpawnMob: false,
  setActionSpawnMob: (val) => set({ actionSpawnMob: val }),
  actionSpawnZombie: false,
  setActionSpawnZombie: (val) => set({ actionSpawnZombie: val }),
  actionSpawnHuman: false,
  setActionSpawnHuman: (val) => set({ actionSpawnHuman: val }),
  missingLimbs: [],
  addMissingLimb: (limb) => set((state) => ({ missingLimbs: [...state.missingLimbs, limb] })),
  grabbedBy: null,
  setGrabbedBy: (id) => set({ grabbedBy: id }),
  dragTarget: null,
  setDragTarget: (pos) => set({ dragTarget: pos }),
  playerPos: [0, 10, 0],
  setPlayerPos: (pos) => set({ playerPos: pos }),
  health: 100,
  setHealth: (h) => set((state) => {
    const newHealth = typeof h === 'function' ? h(state.health) : h;
    if (newHealth <= 0 && !state.isDead) {
      return { health: 0, isDead: true, grabbedBy: 'death' }; // Use grabbedBy to force ragdoll
    }
    return { health: newHealth };
  }),
  isDead: false,
  setIsDead: (d) => set({ isDead: d }),
  bloodParticles: [],
  addBlood: (pos, count) => set((state) => {
    const newBlood = Array.from({ length: count }).map(() => ({
      id: Math.random().toString(),
      pos: [pos[0] + (Math.random()-0.5)*0.5, pos[1] + (Math.random()-0.5)*0.5, pos[2] + (Math.random()-0.5)*0.5] as [number,number,number],
      vel: [(Math.random()-0.5)*5, Math.random()*5, (Math.random()-0.5)*5] as [number,number,number]
    }));
    const combined = [...state.bloodParticles, ...newBlood];
    return { bloodParticles: combined.slice(-100) };
  }),
  removeBlood: (id) => set((state) => ({ bloodParticles: state.bloodParticles.filter(b => b.id !== id) })),
  zombieBites: 0,
  addZombieBite: () => set((state) => {
    const newBites = state.zombieBites + 1;
    if (newBites >= 1 && Math.random() < (newBites * 0.33)) {
      // Trigger infection
      setTimeout(() => {
        useStore.setState({ grabbedBy: 'infected' });
      }, 3000);
    }
    return { zombieBites: newBites };
  }),
}));

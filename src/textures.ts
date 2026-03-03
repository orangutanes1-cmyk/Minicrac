import * as THREE from 'three';

const createNoiseTexture = (baseColor: string, noiseColor: string, size = 16) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    if (Math.random() > 0.5) {
      ctx.fillStyle = noiseColor;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
};

const createGrassSideTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#8B4513'; // Dirt brown
  ctx.fillRect(0, 0, 16, 16);
  
  ctx.fillStyle = '#228B22'; // Grass green
  ctx.fillRect(0, 0, 16, 4);
  
  for (let i = 0; i < 16; i++) {
    if (Math.random() > 0.3) {
      ctx.fillRect(i, 4, 1, Math.floor(Math.random() * 3) + 1);
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
};

const createCharacterTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  // Base brown bear color
  ctx.fillStyle = '#8B5A2B'; 
  ctx.fillRect(0, 0, 64, 64);
  
  // Lighter belly/snout
  ctx.fillStyle = '#CD853F';
  ctx.fillRect(20, 32, 24, 16);
  
  // Eyes (white)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(16, 20, 8, 8);
  ctx.fillRect(40, 20, 8, 8);
  
  // Pupils (blue)
  ctx.fillStyle = '#00BFFF';
  ctx.fillRect(20, 24, 4, 4);
  ctx.fillRect(40, 24, 4, 4);
  
  // Nose
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(28, 32, 8, 4);
  
  // Flower on head
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(44, 8, 8, 8);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(46, 10, 4, 4);
  
  // Leaf on head
  ctx.fillStyle = '#32CD32';
  ctx.fillRect(28, 0, 8, 8);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
};

export const textures = {
  dirt: createNoiseTexture('#8B4513', '#A0522D'),
  grass: createNoiseTexture('#228B22', '#32CD32'),
  grassSide: createGrassSideTexture(),
  stone: createNoiseTexture('#808080', '#A9A9A9'),
  wood: createNoiseTexture('#8B4513', '#5C4033'),
  leaves: createNoiseTexture('#006400', '#228B22'),
  character: createCharacterTexture(),
};

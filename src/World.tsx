import { useStore, BlockType } from './store';
import { textures } from './textures';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

const geometry = new THREE.BoxGeometry(1, 1, 1);

const materialMap = {
  dirt: new THREE.MeshBasicMaterial({ map: textures.dirt }),
  grass: [
    new THREE.MeshBasicMaterial({ map: textures.grassSide }), // right
    new THREE.MeshBasicMaterial({ map: textures.grassSide }), // left
    new THREE.MeshBasicMaterial({ map: textures.grass }),     // top
    new THREE.MeshBasicMaterial({ map: textures.dirt }),      // bottom
    new THREE.MeshBasicMaterial({ map: textures.grassSide }), // front
    new THREE.MeshBasicMaterial({ map: textures.grassSide }), // back
  ],
  stone: new THREE.MeshBasicMaterial({ map: textures.stone }),
  wood: new THREE.MeshBasicMaterial({ map: textures.wood }),
  leaves: new THREE.MeshBasicMaterial({ map: textures.leaves, transparent: true, opacity: 0.8, depthWrite: false }),
  glass: new THREE.MeshBasicMaterial({ color: '#88ccff', transparent: true, opacity: 0.4 }),
  bed: [
    new THREE.MeshBasicMaterial({ color: '#ffffff' }), // right
    new THREE.MeshBasicMaterial({ color: '#ffffff' }), // left
    new THREE.MeshBasicMaterial({ color: '#ff4444' }), // top (red blanket)
    new THREE.MeshBasicMaterial({ color: '#8b4513' }), // bottom (wood)
    new THREE.MeshBasicMaterial({ color: '#ffffff' }), // front
    new THREE.MeshBasicMaterial({ color: '#ffffff' }), // back
  ],
  bear: new THREE.MeshBasicMaterial({ color: '#8b4513' }),
};

const BlockGroup = ({ type, blocks }: { type: BlockType, blocks: any[] }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      const dummy = new THREE.Object3D();
      blocks.forEach((block, i) => {
        dummy.position.set(block.pos[0], block.pos[1], block.pos[2]);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <instancedMesh 
      key={blocks.length}
      ref={meshRef} 
      args={[geometry, materialMap[type] as any, blocks.length]} 
      name="world"
      frustumCulled={false}
    />
  );
};

export const World = () => {
  const blocks = useStore((state) => state.blocks);

  const blocksByType = useMemo(() => {
    const grouped: Record<string, any[]> = {
      dirt: [], grass: [], stone: [], wood: [], leaves: [], glass: [], bed: [], bear: []
    };
    Object.values(blocks).forEach(block => {
      if (grouped[block.type]) {
        grouped[block.type].push(block);
      }
    });
    return grouped;
  }, [blocks]);

  return (
    <group name="world-group">
      {/* Visuals - Instanced for performance */}
      {(Object.keys(blocksByType) as BlockType[]).map(type => (
        <BlockGroup key={type} type={type} blocks={blocksByType[type]} />
      ))}
      
      {/* Physics - Individual RigidBodies for fast updates */}
      {Object.entries(blocks).map(([key, block]) => (
        <RigidBody key={key} type="fixed" position={block.pos}>
          <CuboidCollider args={[0.5, 0.5, 0.5]} />
        </RigidBody>
      ))}
      
      {/* Invisible safety floor */}
      <RigidBody type="fixed" position={[0, -15, 0]}>
        <CuboidCollider args={[1000, 0.5, 1000]} />
      </RigidBody>
    </group>
  );
};

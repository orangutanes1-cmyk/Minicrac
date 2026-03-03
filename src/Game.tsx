import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky } from '@react-three/drei';
import { Player } from './Player';
import { World } from './World';
import { UI } from './UI';
import { useStore } from './store';
import { Mob } from './Mob';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const BloodParticles = () => {
  const bloodParticles = useStore(s => s.bloodParticles);
  const removeBlood = useStore(s => s.removeBlood);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child: any) => {
      if (child.userData.vel) {
        child.position.add(child.userData.vel.clone().multiplyScalar(delta));
        child.userData.vel.y -= 9.8 * delta; // Gravity
        if (child.position.y < -1) {
          removeBlood(child.userData.id);
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {bloodParticles.map(p => (
        <mesh key={p.id} position={p.pos} userData={{ id: p.id, vel: new THREE.Vector3(...p.vel) }}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#8B0000" />
        </mesh>
      ))}
    </group>
  );
};

const Mobs = () => {
  const mobs = useStore((state) => state.mobs);
  return (
    <group name="mobs">
      {mobs.map((mob) => (
        <Mob key={mob.id} id={mob.id} pos={mob.pos} type={mob.type} />
      ))}
    </group>
  );
};

export const Game = () => {
  return (
    <div className="w-full h-screen bg-sky-300 relative overflow-hidden touch-none">
      <Canvas dpr={[1, 1.5]} camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        
        <Physics gravity={[0, -9.81, 0]}>
          <Player />
          <World />
          <Mobs />
          <BloodParticles />
        </Physics>
      </Canvas>
      <UI />
    </div>
  );
};

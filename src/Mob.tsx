import { useFrame } from '@react-three/fiber';
import { useRef, useState, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useStore } from './store';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { Line } from '@react-three/drei';
import { LimbBody } from './RagdollPlayer';

const VerletRope = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
  const numSegments = 15;
  const points = useRef<THREE.Vector3[]>(Array.from({ length: numSegments + 1 }, () => new THREE.Vector3()));
  const oldPoints = useRef<THREE.Vector3[]>(Array.from({ length: numSegments + 1 }, () => new THREE.Vector3()));
  const lineRef = useRef<any>(null);

  useFrame((state, delta) => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dist = s.distanceTo(e);
    const segmentLength = (dist * 1.05) / numSegments; // 5% slack
    
    // Initialize points if they are all at 0,0,0
    if (points.current[1].lengthSq() === 0) {
      for (let i = 0; i <= numSegments; i++) {
        points.current[i].copy(s).lerp(e, i / numSegments);
        oldPoints.current[i].copy(points.current[i]);
      }
    }

    points.current[0].copy(s);
    points.current[numSegments].copy(e);

    // Verlet integration
    for (let i = 1; i < numSegments; i++) {
      const p = points.current[i];
      const oldP = oldPoints.current[i];
      const temp = p.clone();
      
      // Add gravity and damping
      const vel = p.clone().sub(oldP).multiplyScalar(0.99);
      p.add(vel).add(new THREE.Vector3(0, -20 * delta * delta, 0));
      oldP.copy(temp);

      // Floor collision
      if (p.y < 0.1) {
        p.y = 0.1;
        oldP.x = p.x; // Friction
        oldP.z = p.z;
      }
    }

    // Constraints
    for (let iter = 0; iter < 10; iter++) {
      for (let i = 0; i < numSegments; i++) {
        const p1 = points.current[i];
        const p2 = points.current[i + 1];
        const diff = p2.clone().sub(p1);
        const dist = diff.length();
        if (dist === 0) continue;
        const diffFactor = (segmentLength - dist) / dist;
        const offset = diff.multiplyScalar(diffFactor * 0.5);
        if (i !== 0) p1.sub(offset);
        if (i + 1 !== numSegments) p2.add(offset);
      }
    }

    if (lineRef.current) {
      lineRef.current.geometry.setPositions(points.current.flatMap(p => [p.x, p.y, p.z]));
    }
  });

  return (
    <Line ref={lineRef} points={points.current} color="#8B5A40" lineWidth={8} />
  );
};

export const Mob = ({ pos, id, type }: { pos: [number, number, number], id: string, type: 'fleshy' | 'zombie' | 'human' }) => {
  const mobData = useStore(s => s.mobs.find(m => m.id === id));
  const isPlayerRagdoll = useStore(s => s.grabbedBy === 'recovering' || s.isDead);
  
  if (!mobData) return null;

  if (type === 'fleshy') return <FleshyMob pos={pos} id={id} />;
  
  if (mobData.health <= 0 || (isPlayerRagdoll && type === 'zombie')) {
    return <RagdollMob pos={pos} id={id} type={type} isDead={mobData.health <= 0} />;
  }

  if (type === 'zombie') return <ZombieMob pos={pos} id={id} />;
  if (type === 'human') return <HumanMob pos={pos} id={id} />;
  return null;
};

const RagdollMob = ({ pos, id, type, isDead }: { pos: [number, number, number], id: string, type: 'zombie' | 'human', isDead: boolean }) => {
  const torsoRef = useRef<any>(null);
  const playerPos = useStore(s => s.playerPos);
  const setHealth = useStore(s => s.setHealth);
  const addBlood = useStore(s => s.addBlood);
  const addZombieBite = useStore(s => s.addZombieBite);
  
  const skinColor = type === 'zombie' ? '#4A8B4A' : '#F5D0C5';
  const shirtColor = type === 'zombie' ? '#00A8A8' : '#88CCFF';
  const pantsColor = type === 'zombie' ? '#4A5A8B' : '#333333';

  useFrame(() => {
    if (!torsoRef.current || isDead) return;

    // Crawl towards player if not dead
    const currentPos = torsoRef.current.translation();
    const pPos = new THREE.Vector3(...playerPos);
    const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(pPos);

    if (dist < 15) {
      const dir = pPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
      dir.y = 0;
      
      // Apply crawling impulse
      if (Math.random() < 0.1) {
        torsoRef.current.applyImpulse({ x: dir.x * 0.5, y: 0.2, z: dir.z * 0.5 }, true);
      }

      // Attack
      if (dist < 2 && Math.random() < 0.05 && type === 'zombie') {
        setHealth(h => h - 5);
        addBlood(playerPos, 5);
        addZombieBite();
      }
    }
  });

  return (
    <group userData={{ mobId: id }}>
      <RigidBody ref={torsoRef} position={pos} colliders="cuboid" mass={1} linearDamping={0.5} angularDamping={0.5}>
        <mesh>
          <boxGeometry args={[0.5, 0.75, 0.25]} />
          <meshBasicMaterial color={shirtColor} />
        </mesh>
      </RigidBody>

      <LimbBody
        parentRef={torsoRef}
        parentAnchor={[0, 0.375, 0]}
        childAnchor={[0, -0.25, 0]}
        args={[0.5, 0.5, 0.5]}
        color={skinColor}
        initialPos={[pos[0], pos[1] + 0.625, pos[2]]}
      />

      <LimbBody
        parentRef={torsoRef}
        parentAnchor={[-0.375, 0.375, 0]}
        childAnchor={[0, 0.375, 0]}
        args={[0.25, 0.75, 0.25]}
        color={skinColor}
        initialPos={[pos[0] - 0.375, pos[1], pos[2]]}
      />

      <LimbBody
        parentRef={torsoRef}
        parentAnchor={[0.375, 0.375, 0]}
        childAnchor={[0, 0.375, 0]}
        args={[0.25, 0.75, 0.25]}
        color={skinColor}
        initialPos={[pos[0] + 0.375, pos[1], pos[2]]}
      />

      <LimbBody
        parentRef={torsoRef}
        parentAnchor={[-0.125, -0.375, 0]}
        childAnchor={[0, 0.375, 0]}
        args={[0.25, 0.75, 0.25]}
        color={pantsColor}
        initialPos={[pos[0] - 0.125, pos[1] - 0.75, pos[2]]}
      />

      <LimbBody
        parentRef={torsoRef}
        parentAnchor={[0.125, -0.375, 0]}
        childAnchor={[0, 0.375, 0]}
        args={[0.25, 0.75, 0.25]}
        color={pantsColor}
        initialPos={[pos[0] + 0.125, pos[1] - 0.75, pos[2]]}
      />
    </group>
  );
};

const HumanMob = ({ pos, id }: { pos: [number, number, number], id: string }) => {
  const rigidBody = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const playerPos = useStore(s => s.playerPos);
  const mobData = useStore(s => s.mobs.find(m => m.id === id));
  const dragTarget = useStore(s => s.dragTarget);
  const addBlock = useStore(s => s.addBlock);
  const mobs = useStore(s => s.mobs);
  const updateMob = useStore(s => s.updateMob);
  const addBlood = useStore(s => s.addBlood);

  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  const [state, setState] = useState<'idle' | 'building' | 'attacking' | 'helping'>('idle');
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);
  const [targetMobId, setTargetMobId] = useState<string | null>(null);

  useFrame((stateCtx) => {
    if (!rigidBody.current || !groupRef.current || !mobData) return;

    const currentPos = rigidBody.current.translation();
    
    if (mobData.grabbedBy && dragTarget) {
      const target = new THREE.Vector3(...dragTarget);
      const current = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
      const dir = target.sub(current).normalize();
      rigidBody.current.applyImpulse(dir.multiplyScalar(0.8), true);
      return;
    }

    const time = stateCtx.clock.elapsedTime;

    // State machine
    if (Math.random() < 0.01) {
      const rand = Math.random();
      if (rand < 0.3) {
        setState('building');
        setTargetPos(new THREE.Vector3(currentPos.x + (Math.random()-0.5)*10, currentPos.y, currentPos.z + (Math.random()-0.5)*10));
      } else if (rand < 0.6) {
        setState('attacking');
        const zombies = mobs.filter(m => m.type === 'zombie' && m.health > 0);
        if (zombies.length > 0) {
          setTargetMobId(zombies[Math.floor(Math.random() * zombies.length)].id);
        } else {
          setState('idle');
        }
      } else if (rand < 0.8) {
        setState('helping');
      } else {
        setState('idle');
        setTargetPos(new THREE.Vector3(currentPos.x + (Math.random()-0.5)*5, currentPos.y, currentPos.z + (Math.random()-0.5)*5));
      }
    }

    let dir = new THREE.Vector3(0, 0, 0);
    let speed = 2;

    if (state === 'building' && targetPos) {
      const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(targetPos);
      if (dist > 1) {
        dir = targetPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
      } else {
        // Build something
        if (Math.random() < 0.05) {
          const blockTypes = ['wood', 'glass', 'bed'] as any[];
          const type = blockTypes[Math.floor(Math.random() * blockTypes.length)];
          addBlock(Math.round(currentPos.x + (Math.random()-0.5)*2), Math.round(currentPos.y), Math.round(currentPos.z + (Math.random()-0.5)*2), type);
        }
        setState('idle');
      }
    } else if (state === 'attacking' && targetMobId) {
      const targetMob = mobs.find(m => m.id === targetMobId);
      if (targetMob && targetMob.health > 0) {
        const tPos = new THREE.Vector3(...targetMob.pos);
        const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(tPos);
        if (dist > 1.5) {
          dir = tPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
          speed = 3; // Run
        } else {
          // Attack
          if (Math.random() < 0.1) {
            updateMob(targetMobId, { health: targetMob.health - 20 });
            addBlood(targetMob.pos, 5);
          }
        }
      } else {
        setState('idle');
      }
    } else if (state === 'helping') {
      const pPos = new THREE.Vector3(...playerPos);
      const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(pPos);
      if (dist > 3) {
        dir = pPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
      } else {
        // Just follow player
        dir.set(0, 0, 0);
      }
    } else if (state === 'idle' && targetPos) {
      const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(targetPos);
      if (dist > 1) {
        dir = targetPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
        speed = 1; // Walk slowly
      }
    }

    dir.y = 0;
    const velocity = rigidBody.current.linvel();
    
    if (dir.lengthSq() > 0) {
      rigidBody.current.setLinvel({ x: dir.x * speed, y: velocity.y, z: dir.z * speed }, true);
      const angle = Math.atan2(dir.x, dir.z);
      groupRef.current.rotation.y = angle;
    } else {
      rigidBody.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }

    // Walking animation
    const isMoving = dir.lengthSq() > 0;
    const swing = isMoving ? Math.sin(time * 10 * (speed/2)) * 0.5 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing;
    if (rightArmRef.current) {
      if (state === 'attacking' && dir.lengthSq() === 0) {
        rightArmRef.current.rotation.x = -Math.PI / 2; // Attack pose
      } else {
        rightArmRef.current.rotation.x = swing;
      }
    }
  });

  return (
    <RigidBody ref={rigidBody} position={pos} colliders={false} mass={1} type="dynamic" enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.4]} friction={0} />
      <group ref={groupRef} position={[0, -0.9, 0]} userData={{ mobId: id }}>
        {/* Legs */}
        {!mobData.missingLimbs?.includes('leftLeg') && (
          <mesh ref={leftLegRef} position={[-0.125, 0.375, 0]} userData={{ mobId: id, limb: 'leftLeg' }}>
            <boxGeometry args={[0.25, 0.75, 0.25]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        )}
        {!mobData.missingLimbs?.includes('rightLeg') && (
          <mesh ref={rightLegRef} position={[0.125, 0.375, 0]} userData={{ mobId: id, limb: 'rightLeg' }}>
            <boxGeometry args={[0.25, 0.75, 0.25]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        )}

        {/* Torso */}
        <mesh position={[0, 1.125, 0]} userData={{ mobId: id, limb: 'torso' }}>
          <boxGeometry args={[0.5, 0.75, 0.25]} />
          <meshBasicMaterial color="#88CCFF" />
        </mesh>

        {/* Arms */}
        {!mobData.missingLimbs?.includes('leftArm') && (
          <group ref={leftArmRef} position={[-0.375, 1.5, 0]} userData={{ mobId: id, limb: 'leftArm' }}>
            <mesh position={[0, -0.375, 0]}>
              <boxGeometry args={[0.25, 0.75, 0.25]} />
              <meshBasicMaterial color="#F5D0C5" />
            </mesh>
          </group>
        )}
        {!mobData.missingLimbs?.includes('rightArm') && (
          <group ref={rightArmRef} position={[0.375, 1.5, 0]} userData={{ mobId: id, limb: 'rightArm' }}>
            <mesh position={[0, -0.375, 0]}>
              <boxGeometry args={[0.25, 0.75, 0.25]} />
              <meshBasicMaterial color="#F5D0C5" />
              {/* Sword */}
              <mesh position={[0, -0.375, 0.2]} rotation={[Math.PI/2, 0, 0]}>
                <boxGeometry args={[0.05, 0.8, 0.1]} />
                <meshBasicMaterial color="#cccccc" />
              </mesh>
            </mesh>
          </group>
        )}

        {/* Head */}
        {!mobData.missingLimbs?.includes('head') && (
          <group position={[0, 1.75, 0]} userData={{ mobId: id, limb: 'head' }}>
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshBasicMaterial color="#F5D0C5" />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.125, 0.0625, 0.26]}>
              <boxGeometry args={[0.125, 0.0625, 0.02]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0.125, 0.0625, 0.26]}>
              <boxGeometry args={[0.125, 0.0625, 0.02]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
};

const ZombieMob = ({ pos, id }: { pos: [number, number, number], id: string }) => {
  const rigidBody = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const playerPos = useStore(s => s.playerPos);
  const setHealth = useStore(s => s.setHealth);
  const isDead = useStore(s => s.isDead);
  const addBlood = useStore(s => s.addBlood);
  const mobData = useStore(s => s.mobs.find(m => m.id === id));
  const dragTarget = useStore(s => s.dragTarget);

  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  useFrame((stateCtx) => {
    if (!rigidBody.current || !groupRef.current || isDead || !mobData) return;

    const currentPos = rigidBody.current.translation();
    
    if (mobData.grabbedBy && dragTarget) {
      // Being dragged
      const target = new THREE.Vector3(...dragTarget);
      const current = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
      const dir = target.sub(current).normalize();
      rigidBody.current.applyImpulse(dir.multiplyScalar(0.8), true);
      return;
    }

    const pPos = new THREE.Vector3(...playerPos);
    const dist = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z).distanceTo(pPos);

    if (dist < 15) {
      // Move towards player
      const dir = pPos.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)).normalize();
      dir.y = 0; // Don't fly
      
      const velocity = rigidBody.current.linvel();
      rigidBody.current.setLinvel({ x: dir.x * 2, y: velocity.y, z: dir.z * 2 }, true);
      
      // Look at player
      const angle = Math.atan2(pPos.x - currentPos.x, pPos.z - currentPos.z);
      groupRef.current.rotation.y = angle;

      // Walking animation
      const time = stateCtx.clock.elapsedTime;
      const swing = Math.sin(time * 10) * 0.5;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      
      // Zombie arms always up
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 2;

      // Attack
      if (dist < 1.5 && Math.random() < 0.05) {
        setHealth(h => h - 5);
        addBlood(playerPos, 5);
        useStore.getState().addZombieBite();
      }
    } else {
      const velocity = rigidBody.current.linvel();
      rigidBody.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }
  });

  return (
    <RigidBody ref={rigidBody} position={pos} colliders={false} mass={1} type="dynamic" enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.4]} friction={0} />
      <group ref={groupRef} position={[0, -0.9, 0]} userData={{ mobId: id }}>
        {/* Legs */}
        {!mobData.missingLimbs?.includes('leftLeg') && (
          <mesh ref={leftLegRef} position={[-0.125, 0.375, 0]} userData={{ mobId: id, limb: 'leftLeg' }}>
            <boxGeometry args={[0.25, 0.75, 0.25]} />
            <meshBasicMaterial color="#4A5A8B" /> {/* Blue pants */}
          </mesh>
        )}
        {!mobData.missingLimbs?.includes('rightLeg') && (
          <mesh ref={rightLegRef} position={[0.125, 0.375, 0]} userData={{ mobId: id, limb: 'rightLeg' }}>
            <boxGeometry args={[0.25, 0.75, 0.25]} />
            <meshBasicMaterial color="#4A5A8B" />
          </mesh>
        )}

        {/* Torso */}
        <mesh position={[0, 1.125, 0]} userData={{ mobId: id, limb: 'torso' }}>
          <boxGeometry args={[0.5, 0.75, 0.25]} />
          <meshBasicMaterial color="#00A8A8" /> {/* Cyan shirt */}
        </mesh>

        {/* Arms */}
        {!mobData.missingLimbs?.includes('leftArm') && (
          <group ref={leftArmRef} position={[-0.375, 1.5, 0]} userData={{ mobId: id, limb: 'leftArm' }}>
            <mesh position={[0, -0.375, 0]}>
              <boxGeometry args={[0.25, 0.75, 0.25]} />
              <meshBasicMaterial color="#4A8B4A" /> {/* Green skin */}
            </mesh>
          </group>
        )}
        {!mobData.missingLimbs?.includes('rightArm') && (
          <group ref={rightArmRef} position={[0.375, 1.5, 0]} userData={{ mobId: id, limb: 'rightArm' }}>
            <mesh position={[0, -0.375, 0]}>
              <boxGeometry args={[0.25, 0.75, 0.25]} />
              <meshBasicMaterial color="#4A8B4A" />
            </mesh>
          </group>
        )}

        {/* Head */}
        {!mobData.missingLimbs?.includes('head') && (
          <group position={[0, 1.75, 0]} userData={{ mobId: id, limb: 'head' }}>
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshBasicMaterial color="#4A8B4A" />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.125, 0.0625, 0.26]}>
              <boxGeometry args={[0.125, 0.0625, 0.02]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0.125, 0.0625, 0.26]}>
              <boxGeometry args={[0.125, 0.0625, 0.02]} />
              <meshBasicMaterial color="#000000" />
            </mesh>
          </group>
        )}
      </group>
    </RigidBody>
  );
};

const FleshyMob = ({ pos, id }: { pos: [number, number, number], id: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [state, setState] = useState<'idle' | 'grabbing' | 'eating' | 'cooldown'>('idle');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<'player' | 'mob' | null>(null);
  
  const playerPos = useStore(s => s.playerPos);
  const setGrabbedBy = useStore(s => s.setGrabbedBy);
  const setDragTarget = useStore(s => s.setDragTarget);
  const addMissingLimb = useStore(s => s.addMissingLimb);
  const grabbedBy = useStore(s => s.grabbedBy);
  const addBlood = useStore(s => s.addBlood);
  const setHealth = useStore(s => s.setHealth);
  const isDead = useStore(s => s.isDead);
  
  const mobs = useStore(s => s.mobs);
  const updateMob = useStore(s => s.updateMob);
  const removeMob = useStore(s => s.removeMob);

  const [mouthPos, setMouthPos] = useState<[number, number, number]>(pos);
  const [ropeTargetPos, setRopeTargetPos] = useState<[number, number, number]>(pos);

  const ropeLength = useMemo(() => 5 + Math.random() * 10, []);
  const eatDuration = useMemo(() => 3000 + Math.random() * 2000, []);

  useFrame((stateCtx) => {
    if (!groupRef.current) return;

    // Bobbing up and down
    groupRef.current.position.y = pos[1] + Math.sin(stateCtx.clock.elapsedTime * 2 + pos[0]) * 0.2 + 1;
    // Slowly rotate
    groupRef.current.rotation.y += 0.01;

    const currentMouthPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(currentMouthPos);
    currentMouthPos.y -= 0.5;
    setMouthPos([currentMouthPos.x, currentMouthPos.y, currentMouthPos.z]);

    if (state === 'idle') {
      // Find closest target
      let closestDist = Infinity;
      let closestTarget: { id: string, type: 'player' | 'mob', pos: THREE.Vector3 } | null = null;

      if (!grabbedBy && !isDead) {
        const pPos = new THREE.Vector3(...playerPos);
        const dist = currentMouthPos.distanceTo(pPos);
        if (dist < ropeLength) {
          closestDist = dist;
          closestTarget = { id: 'player', type: 'player', pos: pPos };
        }
      }

      mobs.forEach(mob => {
        if (mob.id !== id && !mob.grabbedBy) {
          const mPos = new THREE.Vector3(...mob.pos);
          const dist = currentMouthPos.distanceTo(mPos);
          if (dist < ropeLength && dist < closestDist) {
            closestDist = dist;
            closestTarget = { id: mob.id, type: 'mob', pos: mPos };
          }
        }
      });

      if (closestTarget) {
        setState('grabbing');
        setTargetId(closestTarget.id);
        setTargetType(closestTarget.type);
        if (closestTarget.type === 'player') {
          setGrabbedBy(id);
        } else {
          updateMob(closestTarget.id, { grabbedBy: id });
        }
      }
    }

    if (state === 'grabbing' && targetId) {
      let currentTargetPos = new THREE.Vector3();
      let isTargetValid = false;

      if (targetType === 'player' && grabbedBy === id) {
        currentTargetPos.set(...playerPos);
        isTargetValid = true;
        setDragTarget([currentMouthPos.x, currentMouthPos.y, currentMouthPos.z]);
      } else if (targetType === 'mob') {
        const mob = mobs.find(m => m.id === targetId);
        if (mob && mob.grabbedBy === id) {
          currentTargetPos.set(...mob.pos);
          isTargetValid = true;
          setDragTarget([currentMouthPos.x, currentMouthPos.y, currentMouthPos.z]);
        }
      }

      if (isTargetValid) {
        setRopeTargetPos([currentTargetPos.x, currentTargetPos.y, currentTargetPos.z]);
        const dist = currentMouthPos.distanceTo(currentTargetPos);
        if (dist < 0.8) {
          setState('eating');
          setTimeout(() => {
            if (targetType === 'player') {
              const limbs = [
                'head', 'neck', 
                'leftArm', 'leftForearm', 'leftHand', 
                'rightArm', 'rightForearm', 'rightHand', 
                'leftThigh', 'leftCalf', 'leftFoot', 
                'rightThigh', 'rightCalf', 'rightFoot'
              ];
              const randomLimb = limbs[Math.floor(Math.random() * limbs.length)] as any;
              addMissingLimb(randomLimb);
              setHealth(h => h - 25);
              addBlood(playerPos, 20);
              setGrabbedBy('recovering');
            } else if (targetType === 'mob') {
              removeMob(targetId);
              addBlood([currentTargetPos.x, currentTargetPos.y, currentTargetPos.z], 20);
            }
            setDragTarget(null);
            setTargetId(null);
            setTargetType(null);
            setState('cooldown');
            setTimeout(() => setState('idle'), 5000);
          }, eatDuration);
        }
      } else {
        // Target escaped or died
        setState('idle');
        setTargetId(null);
        setTargetType(null);
        setDragTarget(null);
      }
    }
  });

  return (
    <>
      <group ref={groupRef} position={pos} userData={{ mobId: id }}>
        {/* Main Body (Fleshy sack) */}
        <mesh position={[0, 0.5, 0]}>
          <capsuleGeometry args={[0.4, 0.6, 4, 16]} />
          <meshBasicMaterial color="#8B5A40" /> {/* Brownish fleshy color */}
        </mesh>
        
        {/* Top Fins/Spikes */}
        <mesh position={[0, 1.1, 0]}>
          <coneGeometry args={[0.6, 0.5, 8]} />
          <meshBasicMaterial color="#6B3E2E" />
        </mesh>
        
        {/* Side Spikes */}
        {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((rot, i) => (
          <mesh key={i} position={[Math.cos(rot)*0.4, 0.5, Math.sin(rot)*0.4]} rotation={[0, -rot, Math.PI/2]}>
            <coneGeometry args={[0.1, 0.4, 4]} />
            <meshBasicMaterial color="#5A2E1E" />
          </mesh>
        ))}

        {/* Maw / Mouth at bottom */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.4, 0.4, 16]} />
          <meshBasicMaterial color="#4A0E0E" /> {/* Dark red inside */}
        </mesh>

        {/* Teeth */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle)*0.25, -0.2, Math.sin(angle)*0.25]} rotation={[Math.PI, angle, 0]}>
              <coneGeometry args={[0.05, 0.2, 4]} />
              <meshBasicMaterial color="#E0D0C0" />
            </mesh>
          );
        })}

        {/* Long Tail/Stinger (Hidden when grabbing to avoid 2 ropes) */}
        {state === 'idle' && (
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.02, 0.05, 4]} />
            <meshBasicMaterial color="#3A1E1E" />
          </mesh>
        )}
      </group>
      {(state === 'grabbing' || state === 'eating') && <VerletRope start={mouthPos} end={ropeTargetPos} />}
    </>
  );
};

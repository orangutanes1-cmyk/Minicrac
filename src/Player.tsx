import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useStore } from './store';
import { textures } from './textures';
import { playSound } from './sounds';
import { RagdollPlayer } from './RagdollPlayer';

const SPEED = 5;
const JUMP_FORCE = 5;

export const Player = () => {
  const grabbedBy = useStore(s => s.grabbedBy);
  if (grabbedBy) return <RagdollPlayer />;
  return <NormalPlayer />;
};

const NormalPlayer = () => {
  const { camera, scene } = useThree();
  const rigidBody = useRef<any>(null);
  const playerMesh = useRef<THREE.Group>(null);
  
  const isThirdPerson = useStore((state) => state.isThirdPerson);
  const joystickMove = useStore((state) => state.joystickMove);
  const actionJump = useStore((state) => state.actionJump);
  const actionPlace = useStore((state) => state.actionPlace);
  const actionBreak = useStore((state) => state.actionBreak);
  const setActionJump = useStore((state) => state.setActionJump);
  const setActionPlace = useStore((state) => state.setActionPlace);
  const setActionBreak = useStore((state) => state.setActionBreak);
  const activeBlockType = useStore((state) => state.activeBlockType);
  const addBlock = useStore((state) => state.addBlock);
  const removeBlock = useStore((state) => state.removeBlock);
  
  const avatarConfig = useStore((state) => state.avatarConfig);
  const isEditingAvatar = useStore((state) => state.isEditingAvatar);

  const actionSpawnMob = useStore((state) => state.actionSpawnMob);
  const setActionSpawnMob = useStore((state) => state.setActionSpawnMob);
  const actionSpawnZombie = useStore((state) => state.actionSpawnZombie);
  const setActionSpawnZombie = useStore((state) => state.setActionSpawnZombie);
  const actionSpawnHuman = useStore((state) => state.actionSpawnHuman);
  const setActionSpawnHuman = useStore((state) => state.setActionSpawnHuman);
  const addMob = useStore((state) => state.addMob);
  const isMenuOpen = useStore((state) => state.isMenuOpen);
  const setPlayerPos = useStore((state) => state.setPlayerPos);
  const missingLimbs = useStore((state) => state.missingLimbs);
  const initialPos = useMemo(() => useStore.getState().playerPos, []);

  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const fpWeaponRef = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Group>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const cameraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') setKeys((k) => ({ ...k, w: true }));
      if (e.code === 'KeyA') setKeys((k) => ({ ...k, a: true }));
      if (e.code === 'KeyS') setKeys((k) => ({ ...k, s: true }));
      if (e.code === 'KeyD') setKeys((k) => ({ ...k, d: true }));
      if (e.code === 'Space') setKeys((k) => ({ ...k, space: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') setKeys((k) => ({ ...k, w: false }));
      if (e.code === 'KeyA') setKeys((k) => ({ ...k, a: false }));
      if (e.code === 'KeyS') setKeys((k) => ({ ...k, s: false }));
      if (e.code === 'KeyD') setKeys((k) => ({ ...k, d: false }));
      if (e.code === 'Space') setKeys((k) => ({ ...k, space: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (isEditingAvatar || isMenuOpen) return;

    if (isMobile) {
      let lastTouchX = 0;
      let lastTouchY = 0;
      let activeTouchId: number | null = null;

      const handleTouchStart = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const target = touch.target as HTMLElement;
          // Only start camera drag if we didn't touch a button or joystick
          if (!target.closest('button') && !target.closest('.joystick')) {
            activeTouchId = touch.identifier;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            break;
          }
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === activeTouchId) {
            const deltaX = touch.clientX - lastTouchX;
            const deltaY = touch.clientY - lastTouchY;
            
            cameraEuler.current.y -= deltaX * 0.007; // Increased sensitivity
            cameraEuler.current.x -= deltaY * 0.007; // Increased sensitivity
            // Removed vertical limit for "sin limites"
            
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            break;
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchId) {
            activeTouchId = null;
            break;
          }
        }
      };

      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);

      return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      };
    } else {
      const handleMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === document.body) {
          cameraEuler.current.y -= e.movementX * 0.003; // Increased sensitivity
          cameraEuler.current.x -= e.movementY * 0.003; // Increased sensitivity
          // Removed vertical limit for "sin limites"
        }
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isMobile, isEditingAvatar, isMenuOpen]);

  const handleInteract = (type: 'place' | 'break' | 'spawnMob' | 'spawnZombie' | 'spawnHuman') => {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Check for mob hits first if using a weapon
    if (type === 'place' && (activeBlockType === 'shotgun' || activeBlockType === 'sword')) {
      const mobHit = intersects.find(i => {
        let obj = i.object;
        while (obj) {
          if (obj.userData && obj.userData.mobId) return true;
          obj = obj.parent as THREE.Object3D;
        }
        return false;
      });

      if (mobHit) {
        let obj = mobHit.object;
        let mobId = null;
        let limb = null;
        while (obj) {
          if (obj.userData && obj.userData.mobId) {
            mobId = obj.userData.mobId;
            limb = obj.userData.limb;
            break;
          }
          obj = obj.parent as THREE.Object3D;
        }

        if (mobId) {
          const damage = activeBlockType === 'shotgun' ? 50 : 25;
          useStore.getState().updateMob(mobId, { health: useStore.getState().mobs.find(m => m.id === mobId)!.health - damage });
          useStore.getState().addBlood([mobHit.point.x, mobHit.point.y, mobHit.point.z], damage / 2);
          
          if (limb && Math.random() < 0.5) {
            useStore.getState().cutMobLimb(mobId, limb);
          }
        }
      }

      setIsAttacking(true);
      setTimeout(() => setIsAttacking(false), 300);
      playSound(activeBlockType === 'shotgun' ? 'boom' : 'break');
      
      if (activeBlockType === 'shotgun') {
        // Add recoil
        cameraEuler.current.x += 0.1;
      }
      return;
    }

    // Filter out player mesh and find first valid block intersection
    const hit = intersects.find(i => {
      let obj = i.object;
      while (obj) {
        if (obj.name === 'player') return false;
        if (obj.name === 'world') return true; 
        obj = obj.parent as THREE.Object3D;
      }
      return false;
    });

    if (hit && hit.face) {
      if (type === 'place') {
        if (activeBlockType === 'hand') {
          // Hand breaks blocks instead of placing
          const breakPos = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.1));
          removeBlock(Math.round(breakPos.x), Math.round(breakPos.y), Math.round(breakPos.z));
          playSound('break');
        } else if (activeBlockType === 'sword' || activeBlockType === 'shotgun') {
          // Handled above, but if we missed a mob and hit a block, just play animation
          setIsAttacking(true);
          setTimeout(() => setIsAttacking(false), 300);
          playSound(activeBlockType === 'shotgun' ? 'boom' : 'break');
          if (activeBlockType === 'shotgun') cameraEuler.current.x += 0.1;
        } else {
          const placePos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.1));
          addBlock(Math.round(placePos.x), Math.round(placePos.y), Math.round(placePos.z), activeBlockType as any);
          playSound('place');
        }
      } else if (type === 'break') {
        const breakPos = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.1));
        removeBlock(Math.round(breakPos.x), Math.round(breakPos.y), Math.round(breakPos.z));
        playSound('break');
      } else if (type === 'spawnMob') {
        const placePos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.1));
        addMob([Math.round(placePos.x), Math.round(placePos.y) + 0.5, Math.round(placePos.z)], 'fleshy');
      } else if (type === 'spawnZombie') {
        const placePos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.1));
        addMob([Math.round(placePos.x), Math.round(placePos.y) + 0.5, Math.round(placePos.z)], 'zombie');
      } else if (type === 'spawnHuman') {
        const placePos = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.1));
        addMob([Math.round(placePos.x), Math.round(placePos.y) + 0.5, Math.round(placePos.z)], 'human');
      }
    } else if (type === 'place' && activeBlockType !== 'hand' && activeBlockType !== 'sword' && activeBlockType !== 'shotgun') {
      // Place in mid-air
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const placePos = camera.position.clone().add(dir.multiplyScalar(3));
      addBlock(Math.round(placePos.x), Math.round(placePos.y), Math.round(placePos.z), activeBlockType as any);
      playSound('place');
    }
  };

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (isEditingAvatar || isMenuOpen) return;

      if (!isMobile && document.pointerLockElement !== document.body) {
        document.body.requestPointerLock();
        return;
      }
      if (document.pointerLockElement === document.body && !isMobile) {
        if (e.button === 0) handleInteract('break');
        if (e.button === 2) handleInteract('place');
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [camera, activeBlockType, scene, isMobile, isEditingAvatar, isMenuOpen]);

  useEffect(() => {
    if (actionPlace) {
      handleInteract('place');
      setActionPlace(false);
    }
    if (actionBreak) {
      handleInteract('break');
      setActionBreak(false);
    }
    if (actionSpawnMob) {
      handleInteract('spawnMob');
      setActionSpawnMob(false);
    }
    if (actionSpawnZombie) {
      handleInteract('spawnZombie');
      setActionSpawnZombie(false);
    }
    if (actionSpawnHuman) {
      handleInteract('spawnHuman');
      setActionSpawnHuman(false);
    }
  }, [actionPlace, actionBreak, actionSpawnMob, actionSpawnZombie, actionSpawnHuman, activeBlockType, camera, scene]);

  useFrame(() => {
    if (!rigidBody.current) return;

    // Check if falling off map
    const pos = rigidBody.current.translation();
    setPlayerPos([pos.x, pos.y, pos.z]);

    if (pos.y < -15) {
      rigidBody.current.setTranslation({ x: 0, y: 10, z: 0 }, true);
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    camera.quaternion.setFromEuler(cameraEuler.current);

    const velocity = rigidBody.current.linvel();
    const frontVector = new THREE.Vector3(0, 0, 0);
    const sideVector = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3(0, 0, 0);

    if (!isEditingAvatar && !isMenuOpen) {
      // Keyboard movement
      frontVector.set(0, 0, Number(keys.s) - Number(keys.w));
      sideVector.set(Number(keys.a) - Number(keys.d), 0, 0);

      // Joystick movement
      if (joystickMove.y !== 0) frontVector.set(0, 0, joystickMove.y);
      if (joystickMove.x !== 0) sideVector.set(-joystickMove.x, 0, 0);
    }

    const moveRotation = new THREE.Euler(0, camera.rotation.y, 0);
    direction.subVectors(frontVector, sideVector);
    
    let isMoving = false;
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(SPEED).applyEuler(moveRotation);
      isMoving = true;
    }

    rigidBody.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    // Jump
    const isGrounded = Math.abs(velocity.y) < 0.1; // Simple grounded check
    if (!isEditingAvatar && !isMenuOpen && (keys.space || actionJump) && isGrounded) {
      rigidBody.current.setLinvel({ x: velocity.x, y: JUMP_FORCE, z: velocity.z });
      setActionJump(false);
      playSound('jump');
    }

    // Animations
    if (playerMesh.current) {
      playerMesh.current.position.set(pos.x, pos.y, pos.z);
      playerMesh.current.rotation.y = camera.rotation.y + Math.PI;

      const time = performance.now() / 1000;
      const swing = isMoving ? Math.sin(time * 10) * 0.5 : 0;

      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      
      if (leftArmRef.current) {
        if (isAttacking && activeBlockType === 'sword') {
          leftArmRef.current.rotation.x = -Math.PI / 2; // Attack pose
        } else {
          leftArmRef.current.rotation.x = -swing;
        }
      }
      
      if (rightArmRef.current) {
        if (isAttacking && activeBlockType === 'shotgun') {
          rightArmRef.current.rotation.x = -Math.PI / 2; // Attack pose
        } else {
          rightArmRef.current.rotation.x = swing;
        }
      }
    }

    if (isThirdPerson || isEditingAvatar) {
      // Offset backwards relative to camera's rotation
      const offset = new THREE.Vector3(0, 0, 4);
      offset.applyEuler(cameraEuler.current);
      camera.position.copy(new THREE.Vector3(pos.x, pos.y + 0.8, pos.z).add(offset));
    } else {
      camera.position.set(pos.x, pos.y + 0.8, pos.z);
      
      if (fpWeaponRef.current) {
        fpWeaponRef.current.position.copy(camera.position);
        fpWeaponRef.current.quaternion.copy(camera.quaternion);
        
        // Weapon sway/bobbing
        const time = performance.now() / 1000;
        const bobX = isMoving ? Math.sin(time * 10) * 0.05 : 0;
        const bobY = isMoving ? Math.abs(Math.cos(time * 10)) * 0.05 : 0;
        
        fpWeaponRef.current.translateX(0.4 + bobX);
        fpWeaponRef.current.translateY(-0.4 + bobY);
        fpWeaponRef.current.translateZ(-0.6);
        
        if (isAttacking) {
          if (activeBlockType === 'sword') {
            fpWeaponRef.current.rotation.x -= Math.PI / 4;
            fpWeaponRef.current.rotation.y += Math.PI / 4;
          } else if (activeBlockType === 'shotgun') {
            fpWeaponRef.current.rotation.x += 0.2;
            fpWeaponRef.current.translateZ(0.2); // Recoil pushback
          } else if (activeBlockType !== 'hand') {
            fpWeaponRef.current.rotation.x -= 0.2;
          }
        }
      }
    }
  });

  const {
    headSize, torsoWidth, torsoHeight, torsoDepth,
    armWidth, armLength, legWidth, legLength,
    skinColor, shirtColor, pantsColor, eyeColor
  } = avatarConfig;

  const thighLen = legLength * 0.45;
  const calfLen = legLength * 0.45;
  const footLen = legLength * 0.1;
  const upperArmLen = armLength * 0.45;
  const forearmLen = armLength * 0.45;
  const handLen = armLength * 0.1;
  const neckLen = headSize * 0.2;

  const hasLeftThigh = !missingLimbs.includes('leftThigh');
  const hasLeftCalf = hasLeftThigh && !missingLimbs.includes('leftCalf');
  const hasLeftFoot = hasLeftCalf && !missingLimbs.includes('leftFoot');

  const hasRightThigh = !missingLimbs.includes('rightThigh');
  const hasRightCalf = hasRightThigh && !missingLimbs.includes('rightCalf');
  const hasRightFoot = hasRightCalf && !missingLimbs.includes('rightFoot');

  const hasLeftArm = !missingLimbs.includes('leftArm');
  const hasLeftForearm = hasLeftArm && !missingLimbs.includes('leftForearm');
  const hasLeftHand = hasLeftForearm && !missingLimbs.includes('leftHand');

  const hasRightArm = !missingLimbs.includes('rightArm');
  const hasRightForearm = hasRightArm && !missingLimbs.includes('rightForearm');
  const hasRightHand = hasRightForearm && !missingLimbs.includes('rightHand');

  const hasNeck = !missingLimbs.includes('neck');
  const hasHead = hasNeck && !missingLimbs.includes('head');

  const BoneStump = ({ position }: { position: [number, number, number] }) => (
    <mesh position={position}>
      <cylinderGeometry args={[0.03, 0.03, 0.1]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );

  // Base Y is -0.9 (bottom of the 1.8m tall capsule)
  const bottomY = -0.9;

  return (
    <>
      <RigidBody ref={rigidBody} colliders={false} mass={1} type="dynamic" position={initialPos} enabledRotations={[false, false, false]} ccd={true}>
        <CapsuleCollider args={[0.5, 0.4]} friction={0} />
      </RigidBody>
      
      {/* Character Mesh (visible in third person or editing) */}
      <group ref={playerMesh} name="player" visible={isThirdPerson || isEditingAvatar}>
        <group position={[0, bottomY, 0]}>
          {/* Left Leg Group */}
          <group ref={leftLegRef} position={[-torsoWidth/4, legLength, 0]}>
            {hasLeftThigh ? (
              <>
                <mesh position={[0, -thighLen/2, 0]}>
                  <boxGeometry args={[legWidth, thighLen, torsoDepth]} />
                  <meshBasicMaterial color={pantsColor} />
                </mesh>
                {hasLeftCalf ? (
                  <>
                    <mesh position={[0, -thighLen - calfLen/2, 0]}>
                      <boxGeometry args={[legWidth, calfLen, torsoDepth]} />
                      <meshBasicMaterial color={skinColor} />
                    </mesh>
                    {hasLeftFoot ? (
                      <mesh position={[0, -thighLen - calfLen - footLen/2, footLen/2]}>
                        <boxGeometry args={[legWidth, footLen, footLen*2]} />
                        <meshBasicMaterial color="#333333" />
                      </mesh>
                    ) : (
                      <BoneStump position={[0, -thighLen - calfLen, 0]} />
                    )}
                  </>
                ) : (
                  <BoneStump position={[0, -thighLen, 0]} />
                )}
              </>
            ) : (
              <BoneStump position={[0, 0, 0]} />
            )}
          </group>

          {/* Right Leg Group */}
          <group ref={rightLegRef} position={[torsoWidth/4, legLength, 0]}>
            {hasRightThigh ? (
              <>
                <mesh position={[0, -thighLen/2, 0]}>
                  <boxGeometry args={[legWidth, thighLen, torsoDepth]} />
                  <meshBasicMaterial color={pantsColor} />
                </mesh>
                {hasRightCalf ? (
                  <>
                    <mesh position={[0, -thighLen - calfLen/2, 0]}>
                      <boxGeometry args={[legWidth, calfLen, torsoDepth]} />
                      <meshBasicMaterial color={skinColor} />
                    </mesh>
                    {hasRightFoot ? (
                      <mesh position={[0, -thighLen - calfLen - footLen/2, footLen/2]}>
                        <boxGeometry args={[legWidth, footLen, footLen*2]} />
                        <meshBasicMaterial color="#333333" />
                      </mesh>
                    ) : (
                      <BoneStump position={[0, -thighLen - calfLen, 0]} />
                    )}
                  </>
                ) : (
                  <BoneStump position={[0, -thighLen, 0]} />
                )}
              </>
            ) : (
              <BoneStump position={[0, 0, 0]} />
            )}
          </group>

          {/* Torso */}
          <mesh position={[0, legLength + torsoHeight/2, 0]}>
            <boxGeometry args={[torsoWidth, torsoHeight, torsoDepth]} />
            <meshBasicMaterial color={shirtColor} />
          </mesh>

          {/* Left Arm Group */}
          <group ref={leftArmRef} position={[-(torsoWidth/2 + armWidth/2), legLength + torsoHeight, 0]}>
            {hasLeftArm ? (
              <>
                <mesh position={[0, -upperArmLen/2, 0]}>
                  <boxGeometry args={[armWidth, upperArmLen, torsoDepth]} />
                  <meshBasicMaterial color={skinColor} />
                </mesh>
                {hasLeftForearm ? (
                  <>
                    <mesh position={[0, -upperArmLen - forearmLen/2, 0]}>
                      <boxGeometry args={[armWidth, forearmLen, torsoDepth]} />
                      <meshBasicMaterial color={skinColor} />
                    </mesh>
                    {hasLeftHand ? (
                      <mesh position={[0, -upperArmLen - forearmLen - handLen/2, 0]}>
                        <boxGeometry args={[armWidth, handLen, torsoDepth]} />
                        <meshBasicMaterial color={skinColor} />
                      </mesh>
                    ) : (
                      <BoneStump position={[0, -upperArmLen - forearmLen, 0]} />
                    )}
                  </>
                ) : (
                  <BoneStump position={[0, -upperArmLen, 0]} />
                )}
              </>
            ) : (
              <BoneStump position={[0, 0, 0]} />
            )}
          </group>

          {/* Right Arm Group */}
          <group ref={rightArmRef} position={[torsoWidth/2 + armWidth/2, legLength + torsoHeight, 0]}>
            {hasRightArm ? (
              <>
                <mesh position={[0, -upperArmLen/2, 0]}>
                  <boxGeometry args={[armWidth, upperArmLen, torsoDepth]} />
                  <meshBasicMaterial color={skinColor} />
                </mesh>
                {hasRightForearm ? (
                  <>
                    <mesh position={[0, -upperArmLen - forearmLen/2, 0]}>
                      <boxGeometry args={[armWidth, forearmLen, torsoDepth]} />
                      <meshBasicMaterial color={skinColor} />
                    </mesh>
                    {hasRightHand ? (
                      <>
                        <mesh position={[0, -upperArmLen - forearmLen - handLen/2, 0]}>
                          <boxGeometry args={[armWidth, handLen, torsoDepth]} />
                          <meshBasicMaterial color={skinColor} />
                        </mesh>
                        {/* Sword */}
                        {activeBlockType === 'sword' && (
                          <group ref={swordRef} position={[0, -armLength, 0.2]} rotation={[Math.PI/2, 0, 0]}>
                            <mesh position={[0, 0.4, 0]}>
                              <boxGeometry args={[0.05, 0.8, 0.1]} />
                              <meshBasicMaterial color="#A0A0A0" />
                            </mesh>
                            <mesh position={[0, 0, 0]}>
                              <boxGeometry args={[0.2, 0.05, 0.1]} />
                              <meshBasicMaterial color="#8B4513" />
                            </mesh>
                            <mesh position={[0, -0.15, 0]}>
                              <boxGeometry args={[0.05, 0.3, 0.1]} />
                              <meshBasicMaterial color="#8B4513" />
                            </mesh>
                          </group>
                        )}
                      </>
                    ) : (
                      <BoneStump position={[0, -upperArmLen - forearmLen, 0]} />
                    )}
                  </>
                ) : (
                  <BoneStump position={[0, -upperArmLen, 0]} />
                )}
              </>
            ) : (
              <BoneStump position={[0, 0, 0]} />
            )}
          </group>

          {/* Neck & Head */}
          <group position={[0, legLength + torsoHeight, 0]}>
            {hasNeck ? (
              <>
                <mesh position={[0, neckLen/2, 0]}>
                  <boxGeometry args={[headSize*0.4, neckLen, headSize*0.4]} />
                  <meshBasicMaterial color={skinColor} />
                </mesh>
                {hasHead ? (
                  <group position={[0, neckLen + headSize/2, 0]}>
                    <mesh>
                      <boxGeometry args={[headSize, headSize, headSize]} />
                      <meshBasicMaterial color={skinColor} />
                    </mesh>
                    {/* Eyes */}
                    <mesh position={[-headSize/4, headSize/8, headSize/2 + 0.01]}>
                      <boxGeometry args={[headSize/4, headSize/8, 0.02]} />
                      <meshBasicMaterial color={eyeColor} />
                    </mesh>
                    <mesh position={[headSize/4, headSize/8, headSize/2 + 0.01]}>
                      <boxGeometry args={[headSize/4, headSize/8, 0.02]} />
                      <meshBasicMaterial color={eyeColor} />
                    </mesh>
                  </group>
                ) : (
                  <BoneStump position={[0, neckLen, 0]} />
                )}
              </>
            ) : (
              <BoneStump position={[0, 0, 0]} />
            )}
          </group>
        </group>
      </group>
      {/* First Person Weapon View */}
      {!isThirdPerson && !isEditingAvatar && activeBlockType !== 'hand' && (
        <group ref={fpWeaponRef}>
          {activeBlockType === 'sword' ? (
            <mesh rotation={[Math.PI/2, 0, 0]}>
              <boxGeometry args={[0.05, 0.8, 0.1]} />
              <meshBasicMaterial color="#cccccc" />
            </mesh>
          ) : activeBlockType === 'shotgun' ? (
            <group>
              <mesh position={[0, 0, -0.2]}>
                <boxGeometry args={[0.05, 0.05, 0.6]} />
                <meshBasicMaterial color="#333333" />
              </mesh>
              <mesh position={[0, -0.05, 0]}>
                <boxGeometry args={[0.05, 0.1, 0.2]} />
                <meshBasicMaterial color="#8B4513" />
              </mesh>
            </group>
          ) : (
            <mesh scale={[0.3, 0.3, 0.3]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial map={textures[activeBlockType as keyof typeof textures]} />
            </mesh>
          )}
        </group>
      )}
    </>
  );
};

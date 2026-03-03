import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, useSphericalJoint } from '@react-three/rapier';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useStore } from './store';

export const LimbBody = ({ parentRef, parentAnchor, childAnchor, args, color, initialPos, children, onRef }: any) => {
  const childRef = useRef<any>(null);
  useSphericalJoint(parentRef, childRef, [parentAnchor, childAnchor]);
  useEffect(() => {
    if (onRef) onRef(childRef);
  }, [childRef, onRef]);
  return (
    <>
      <RigidBody ref={childRef} position={initialPos} colliders="cuboid" mass={0.2} linearDamping={0.5} angularDamping={0.5}>
        <mesh>
          <boxGeometry args={args} />
          <meshBasicMaterial color={color} />
        </mesh>
      </RigidBody>
      {children && children(childRef)}
    </>
  );
};

export const RagdollPlayer = () => {
  const { camera } = useThree();
  const torsoRef = useRef<any>(null);
  const headRef = useRef<any>(null);
  const avatarConfig = useStore((state) => state.avatarConfig);
  const missingLimbs = useStore((state) => state.missingLimbs);
  const dragTarget = useStore((state) => state.dragTarget);
  const setPlayerPos = useStore((state) => state.setPlayerPos);
  const isDead = useStore((state) => state.isDead);
  const health = useStore((state) => state.health);
  const setHealth = useStore((state) => state.setHealth);
  const grabbedBy = useStore((state) => state.grabbedBy);
  const setGrabbedBy = useStore((state) => state.setGrabbedBy);
  const setAvatarConfig = useStore((state) => state.setAvatarConfig);
  const isThirdPerson = useStore((state) => state.isThirdPerson);
  const initialPos = useMemo(() => useStore.getState().playerPos, []);

  // Camera state
  const cameraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
  }, []);

  useEffect(() => {
    if (isMobile) {
      let lastTouchX = 0;
      let lastTouchY = 0;
      let activeTouchId: number | null = null;

      const handleTouchStart = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const target = touch.target as HTMLElement;
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
            cameraEuler.current.y -= deltaX * 0.007;
            cameraEuler.current.x -= deltaY * 0.007;
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
          cameraEuler.current.y -= e.movementX * 0.003;
          cameraEuler.current.x -= e.movementY * 0.003;
        }
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isMobile]);

  useEffect(() => {
    if (grabbedBy === 'recovering' && !isDead) {
      // Stay in ragdoll for a few seconds, then get up or die
      const recoveryTime = 3000 + (100 - health) * 50; // More damage = longer recovery
      
      const timer = setTimeout(() => {
        // Probability of dying increases with damage
        const deathProb = (100 - health) * 0.005; // 0.5% per missing health point
        if (Math.random() < deathProb) {
          setHealth(0); // Die
        } else {
          setGrabbedBy(null); // Get up
        }
      }, recoveryTime);
      
      return () => clearTimeout(timer);
    } else if (grabbedBy === 'infected' && !isDead) {
      // Turn into zombie
      const timer = setTimeout(() => {
        setAvatarConfig({
          skinColor: '#4A8B4A', // Zombie skin
          shirtColor: '#00A8A8', // Zombie shirt
          pantsColor: '#4A5A8B', // Zombie pants
          eyeColor: '#000000',
        });
        setGrabbedBy(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [grabbedBy, isDead, health, setHealth, setGrabbedBy, setAvatarConfig]);

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

  useFrame(() => {
    if (!torsoRef.current) return;
    const pos = torsoRef.current.translation();
    setPlayerPos([pos.x, pos.y, pos.z]);

    if (dragTarget && !isDead) {
      const target = new THREE.Vector3(...dragTarget);
      const current = new THREE.Vector3(pos.x, pos.y, pos.z);
      const dir = target.sub(current).normalize();
      torsoRef.current.applyImpulse(dir.multiplyScalar(0.8), true);
    }

    // Convulsion system
    if (!isDead && !dragTarget && health > 0) {
      // The lower the health, the higher the convulsion chance and force
      const convulsionChance = (100 - health) * 0.001;
      if (Math.random() < convulsionChance) {
        const force = (100 - health) * 0.05;
        torsoRef.current.applyImpulse({
          x: (Math.random() - 0.5) * force,
          y: Math.random() * force,
          z: (Math.random() - 0.5) * force
        }, true);
      }
    }

    // Camera follow
    if (isThirdPerson) {
      camera.quaternion.setFromEuler(cameraEuler.current);
      const offset = new THREE.Vector3(0, 3, 6);
      offset.applyEuler(cameraEuler.current);
      camera.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z).add(offset), 0.1);
    } else {
      if (headRef.current && headRef.current.current) {
        const hPos = headRef.current.current.translation();
        const hRot = headRef.current.current.rotation();
        camera.position.set(hPos.x, hPos.y, hPos.z);
        camera.quaternion.copy(hRot);
        // Look slightly forward from head
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
        camera.lookAt(camera.position.clone().add(forward));
      } else {
        camera.position.set(pos.x, pos.y + 0.5, pos.z);
      }
    }
  });

  return (
    <group>
      <RigidBody ref={torsoRef} position={initialPos} colliders="cuboid" mass={1} linearDamping={0.5} angularDamping={0.5}>
        <mesh>
          <boxGeometry args={[torsoWidth, torsoHeight, torsoDepth]} />
          <meshBasicMaterial color={shirtColor} />
        </mesh>
      </RigidBody>

      {hasNeck && (
        <LimbBody
          parentRef={torsoRef}
          parentAnchor={[0, torsoHeight / 2, 0]}
          childAnchor={[0, -neckLen / 2, 0]}
          args={[headSize * 0.4, neckLen, headSize * 0.4]}
          color={skinColor}
          initialPos={[initialPos[0], initialPos[1] + torsoHeight / 2 + neckLen / 2, initialPos[2]]}
        >
          {(neckRef: any) => hasHead && (
            <LimbBody
              parentRef={neckRef}
              parentAnchor={[0, neckLen / 2, 0]}
              childAnchor={[0, -headSize / 2, 0]}
              args={[headSize, headSize, headSize]}
              color={skinColor}
              initialPos={[initialPos[0], initialPos[1] + torsoHeight / 2 + neckLen + headSize / 2, initialPos[2]]}
              onRef={(r: any) => headRef.current = r}
            />
          )}
        </LimbBody>
      )}

      {hasLeftArm && (
        <LimbBody
          parentRef={torsoRef}
          parentAnchor={[-torsoWidth / 2, torsoHeight / 2, 0]}
          childAnchor={[armWidth / 2, upperArmLen / 2, 0]}
          args={[armWidth, upperArmLen, torsoDepth]}
          color={skinColor}
          initialPos={[initialPos[0] - torsoWidth / 2 - armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen / 2, initialPos[2]]}
        >
          {(upperArmRef: any) => hasLeftForearm && (
            <LimbBody
              parentRef={upperArmRef}
              parentAnchor={[0, -upperArmLen / 2, 0]}
              childAnchor={[0, forearmLen / 2, 0]}
              args={[armWidth, forearmLen, torsoDepth]}
              color={skinColor}
              initialPos={[initialPos[0] - torsoWidth / 2 - armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen - forearmLen / 2, initialPos[2]]}
            >
              {(forearmRef: any) => hasLeftHand && (
                <LimbBody
                  parentRef={forearmRef}
                  parentAnchor={[0, -forearmLen / 2, 0]}
                  childAnchor={[0, handLen / 2, 0]}
                  args={[armWidth, handLen, torsoDepth]}
                  color={skinColor}
                  initialPos={[initialPos[0] - torsoWidth / 2 - armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen - forearmLen - handLen / 2, initialPos[2]]}
                />
              )}
            </LimbBody>
          )}
        </LimbBody>
      )}

      {hasRightArm && (
        <LimbBody
          parentRef={torsoRef}
          parentAnchor={[torsoWidth / 2, torsoHeight / 2, 0]}
          childAnchor={[-armWidth / 2, upperArmLen / 2, 0]}
          args={[armWidth, upperArmLen, torsoDepth]}
          color={skinColor}
          initialPos={[initialPos[0] + torsoWidth / 2 + armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen / 2, initialPos[2]]}
        >
          {(upperArmRef: any) => hasRightForearm && (
            <LimbBody
              parentRef={upperArmRef}
              parentAnchor={[0, -upperArmLen / 2, 0]}
              childAnchor={[0, forearmLen / 2, 0]}
              args={[armWidth, forearmLen, torsoDepth]}
              color={skinColor}
              initialPos={[initialPos[0] + torsoWidth / 2 + armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen - forearmLen / 2, initialPos[2]]}
            >
              {(forearmRef: any) => hasRightHand && (
                <LimbBody
                  parentRef={forearmRef}
                  parentAnchor={[0, -forearmLen / 2, 0]}
                  childAnchor={[0, handLen / 2, 0]}
                  args={[armWidth, handLen, torsoDepth]}
                  color={skinColor}
                  initialPos={[initialPos[0] + torsoWidth / 2 + armWidth / 2, initialPos[1] + torsoHeight / 2 - upperArmLen - forearmLen - handLen / 2, initialPos[2]]}
                />
              )}
            </LimbBody>
          )}
        </LimbBody>
      )}

      {hasLeftThigh && (
        <LimbBody
          parentRef={torsoRef}
          parentAnchor={[-torsoWidth / 4, -torsoHeight / 2, 0]}
          childAnchor={[0, thighLen / 2, 0]}
          args={[legWidth, thighLen, torsoDepth]}
          color={pantsColor}
          initialPos={[initialPos[0] - torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen / 2, initialPos[2]]}
        >
          {(thighRef: any) => hasLeftCalf && (
            <LimbBody
              parentRef={thighRef}
              parentAnchor={[0, -thighLen / 2, 0]}
              childAnchor={[0, calfLen / 2, 0]}
              args={[legWidth, calfLen, torsoDepth]}
              color={skinColor}
              initialPos={[initialPos[0] - torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen - calfLen / 2, initialPos[2]]}
            >
              {(calfRef: any) => hasLeftFoot && (
                <LimbBody
                  parentRef={calfRef}
                  parentAnchor={[0, -calfLen / 2, 0]}
                  childAnchor={[0, footLen / 2, 0]}
                  args={[legWidth, footLen, footLen * 2]}
                  color="#333333"
                  initialPos={[initialPos[0] - torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen - calfLen - footLen / 2, initialPos[2] + footLen / 2]}
                />
              )}
            </LimbBody>
          )}
        </LimbBody>
      )}

      {hasRightThigh && (
        <LimbBody
          parentRef={torsoRef}
          parentAnchor={[torsoWidth / 4, -torsoHeight / 2, 0]}
          childAnchor={[0, thighLen / 2, 0]}
          args={[legWidth, thighLen, torsoDepth]}
          color={pantsColor}
          initialPos={[initialPos[0] + torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen / 2, initialPos[2]]}
        >
          {(thighRef: any) => hasRightCalf && (
            <LimbBody
              parentRef={thighRef}
              parentAnchor={[0, -thighLen / 2, 0]}
              childAnchor={[0, calfLen / 2, 0]}
              args={[legWidth, calfLen, torsoDepth]}
              color={skinColor}
              initialPos={[initialPos[0] + torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen - calfLen / 2, initialPos[2]]}
            >
              {(calfRef: any) => hasRightFoot && (
                <LimbBody
                  parentRef={calfRef}
                  parentAnchor={[0, -calfLen / 2, 0]}
                  childAnchor={[0, footLen / 2, 0]}
                  args={[legWidth, footLen, footLen * 2]}
                  color="#333333"
                  initialPos={[initialPos[0] + torsoWidth / 4, initialPos[1] - torsoHeight / 2 - thighLen - calfLen - footLen / 2, initialPos[2] + footLen / 2]}
                />
              )}
            </LimbBody>
          )}
        </LimbBody>
      )}
    </group>
  );
};

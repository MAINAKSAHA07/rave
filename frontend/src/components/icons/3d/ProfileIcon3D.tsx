'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import IconCanvas from './IconCanvas';

function ProfileGeometry() {
    const groupRef = useRef<Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.5;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Head */}
            <mesh position={[0, 0.4, 0]}>
                <sphereGeometry args={[0.5, 32, 16]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.2} />
            </mesh>
            {/* Body */}
            <mesh position={[0, -0.6, 0]}>
                <capsuleGeometry args={[0.55, 0.8, 4, 16]} />
                <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} />
            </mesh>
        </group>
    );
}

export default function ProfileIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <ProfileGeometry />
        </IconCanvas>
    );
}

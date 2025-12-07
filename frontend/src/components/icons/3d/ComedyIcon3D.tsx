'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import IconCanvas from './IconCanvas';

function ComedyGeometry() {
    const groupRef = useRef<Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.5;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Face */}
            <mesh>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial color="#facc15" roughness={0.3} metalness={0.2} />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.3, 0.2, 0.9]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.3, 0.2, 0.9]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Smile (Torus section) */}
            <mesh position={[0, -0.2, 0.85]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.4, 0.05, 16, 32, Math.PI]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
        </group>
    );
}

export default function ComedyIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <ComedyGeometry />
        </IconCanvas>
    );
}

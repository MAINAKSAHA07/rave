'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import IconCanvas from './IconCanvas';

function FoodGeometry() {
    const groupRef = useRef<Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Bottom Bun */}
            <mesh position={[0, -0.6, 0]}>
                <cylinderGeometry args={[1.1, 1.1, 0.4, 32]} />
                <meshStandardMaterial color="#d97706" />
            </mesh>
            {/* Patty */}
            <mesh position={[0, -0.1, 0]}>
                <cylinderGeometry args={[1.15, 1.15, 0.4, 32]} />
                <meshStandardMaterial color="#78350f" />
            </mesh>
            {/* Cheese */}
            <mesh position={[0, 0.2, 0]}>
                <boxGeometry args={[2.4, 0.1, 2.4]} />
                <meshStandardMaterial color="#fcd34d" />
            </mesh>
            {/* Top Bun */}
            <mesh position={[0, 0.6, 0]}>
                <sphereGeometry args={[1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial color="#d97706" />
            </mesh>
        </group>
    );
}

export default function FoodIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <FoodGeometry />
        </IconCanvas>
    );
}

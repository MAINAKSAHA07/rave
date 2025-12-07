'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import IconCanvas from './IconCanvas';

function CartGeometry() {
    const groupRef = useRef<Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Bag Body */}
            <mesh position={[0, -0.2, 0]}>
                <boxGeometry args={[1.2, 1.2, 0.5]} />
                <meshStandardMaterial color="#fca5a5" roughness={0.5} />
            </mesh>
            {/* Handle */}
            <mesh position={[0, 0.6, 0]}>
                <torusGeometry args={[0.3, 0.05, 16, 32, Math.PI]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.8} />
            </mesh>
        </group>
    );
}

export default function CartIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <CartGeometry />
        </IconCanvas>
    );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function HomeGeometry({ color = "#14b8a6" }: { color?: string }) {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.01;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <group>
            {/* Base */}
            <mesh ref={meshRef} position={[0, -0.5, 0]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Roof - attached to group or separate, let's keep it simple: just the cube for modern look or add cone */}
            <mesh position={[0, 0.75, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[1.2, 1, 4]} />
                <meshStandardMaterial color="#ec4899" roughness={0.3} metalness={0.8} />
            </mesh>
        </group>
    );
}

export default function HomeIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <HomeGeometry />
        </IconCanvas>
    );
}

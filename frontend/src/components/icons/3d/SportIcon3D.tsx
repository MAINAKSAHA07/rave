'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function SportGeometry() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += 0.02;
            meshRef.current.rotation.y += 0.02;
            meshRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 2)) * 0.5; // Bounce
        }
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color="#f97316" roughness={0.4} metalness={0.6} wireframe={false} />
            <mesh scale={[1.01, 1.01, 1.01]}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial color="#ffffff" wireframe />
            </mesh>
        </mesh>
    );
}

export default function SportIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <SportGeometry />
        </IconCanvas>
    );
}

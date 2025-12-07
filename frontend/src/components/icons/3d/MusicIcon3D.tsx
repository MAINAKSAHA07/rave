'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function MusicGeometry() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += 0.01;
            meshRef.current.rotation.y += 0.015;
        }
    });

    return (
        <mesh ref={meshRef}>
            <torusKnotGeometry args={[0.8, 0.25, 100, 16]} />
            <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.9} />
        </mesh>
    );
}

export default function MusicIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <MusicGeometry />
        </IconCanvas>
    );
}

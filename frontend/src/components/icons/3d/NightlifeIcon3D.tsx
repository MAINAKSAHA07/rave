'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function NightlifeGeometry() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y -= 0.005;
            meshRef.current.rotation.x += 0.002;
        }
    });

    // Using Icosahedron as a "Disco Ball" or abstract moon
    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={1} flatShading />
        </mesh>
    );
}

export default function NightlifeIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <NightlifeGeometry />
        </IconCanvas>
    );
}

'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function ConcertGeometry() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005;
            meshRef.current.rotation.z += 0.005;
            meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1); // Pulse
        }
    });

    return (
        <mesh ref={meshRef}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#ec4899" roughness={0.1} metalness={0.9} />
        </mesh>
    );
}

export default function ConcertIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <ConcertGeometry />
        </IconCanvas>
    );
}

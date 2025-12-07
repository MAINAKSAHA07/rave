'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import IconCanvas from './IconCanvas';

function TicketGeometry() {
    const meshRef = useRef<Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2 + 0.5;
            meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime) * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[1.6, 0.8, 0.05]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.4} metalness={0.1} />
        </mesh>
    );
}

export default function TicketIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <TicketGeometry />
        </IconCanvas>
    );
}

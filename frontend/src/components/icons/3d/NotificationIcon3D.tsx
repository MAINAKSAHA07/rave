'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import IconCanvas from './IconCanvas';

function NotificationGeometry() {
    const groupRef = useRef<Group>(null);

    useFrame((state) => {
        if (groupRef.current) {
            // Swing animation
            groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 3) * 0.2;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Bell Body */}
            <mesh position={[0, -0.2, 0]}>
                <cylinderGeometry args={[0.2, 0.8, 0.8, 32]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* Bell Top */}
            <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                <meshStandardMaterial color="#fcd34d" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* Bell Clapper */}
            <mesh position={[0, -0.6, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshStandardMaterial color="#b45309" />
            </mesh>
            {/* Handle */}
            <mesh position={[0, 0.3, 0]}>
                <torusGeometry args={[0.1, 0.05, 16, 32]} />
                <meshStandardMaterial color="#fcd34d" />
            </mesh>
        </group>
    );
}

export default function NotificationIcon3D({ className }: { className?: string }) {
    return (
        <IconCanvas className={className}>
            <NotificationGeometry />
        </IconCanvas>
    );
}

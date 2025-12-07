'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Center } from '@react-three/drei';
import { Suspense } from 'react';

interface IconCanvasProps {
    children: React.ReactNode;
    className?: string;
    intensity?: number;
}

export default function IconCanvas({ children, className = "w-full h-full", intensity = 1 }: IconCanvasProps) {
    return (
        <div className={className}>
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 45 }}>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={intensity} />
                    <pointLight position={[-10, -10, -10]} intensity={intensity * 0.5} />

                    <Center>
                        {children}
                    </Center>

                    <Environment preset="city" />
                </Suspense>
            </Canvas>
        </div>
    );
}

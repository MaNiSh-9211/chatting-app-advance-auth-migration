import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';

interface AnimatedSphereProps {
    mousePos: { x: number; y: number };
}

const AnimatedSphere: React.FC<AnimatedSphereProps> = ({ mousePos }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (meshRef.current) {
            // Rotate based on mouse position
            const targetRotationX = (mousePos.y - window.innerHeight / 2) * 0.00005;
            const targetRotationY = (mousePos.x - window.innerWidth / 2) * 0.00005;

            meshRef.current.rotation.x += (targetRotationX - meshRef.current.rotation.x) * 0.05;
            meshRef.current.rotation.y += (targetRotationY - meshRef.current.rotation.y) * 0.05;

            // Floating animation
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
        }

        if (groupRef.current) {
            groupRef.current.rotation.y += 0.002;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Main Sphere - Bigger for Hero */}
            <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
                <Sphere ref={meshRef} args={[2.2, 64, 64]} position={[0, 0, 0]}>
                    <MeshDistortMaterial
                        color="#7c3aed"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0.2}
                        metalness={0.9}
                        envMapIntensity={1}
                    />
                </Sphere>
            </Float>

            {/* Inner glow sphere */}
            <Sphere args={[1.8, 32, 32]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color="#ec4899"
                    emissive="#ec4899"
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.2}
                />
            </Sphere>

            {/* Orbiting particles - More for main hero */}
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                const radius = 3.5;
                const radiusY = 1.0;
                return (
                    <Sphere
                        key={i}
                        args={[0.08, 16, 16]}
                        position={[
                            Math.cos(angle) * radius,
                            Math.sin(angle * 3) * 0.8,
                            Math.sin(angle) * radius,
                        ]}
                    >
                        <meshStandardMaterial
                            color={i % 2 === 0 ? "#3b82f6" : "#ec4899"}
                            emissive={i % 2 === 0 ? "#3b82f6" : "#ec4899"}
                            emissiveIntensity={1}
                        />
                    </Sphere>
                );
            })}
        </group>
    );
};

interface Hero3DMainProps {
    mousePos: { x: number; y: number };
}

export const Hero3DMain: React.FC<Hero3DMainProps> = ({ mousePos }) => {
    return (
        <div className="hero-3d-main-container" style={{ width: '100%', height: '100%' }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
            >
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ec4899" />
                <directionalLight position={[0, 5, 5]} intensity={1} />

                <AnimatedSphere mousePos={mousePos} />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    enableRotate={false}
                />

                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

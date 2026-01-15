import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- Configuration ---
const GRID_ROWS = 60;
const GRID_COLS = 80;
const SPACING = 1.0;

// Physics - Smooth ripple on hover
const RIPPLE_SPEED = 2.0;
const RIPPLE_FREQUENCY = 0.8;
const INFLUENCE_RADIUS = 15.0;
const WAVE_AMPLITUDE = 3.0;

// Colors
const BASE_COLOR = { r: 0.1, g: 0.9, b: 0.9 };
const HOVER_COLOR = { r: 0.8, g: 0.0, b: 0.6 };

const FabricGrid = ({ mousePos }: { mousePos: { x: number; y: number } }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const mouse = useMemo(() => new THREE.Vector2(), []);
    const { camera } = useThree();

    // Initialize Geometry Data
    const { initialPositions, indices, initialColors } = useMemo(() => {
        const positions = [];
        const indices = [];
        const colors = [];

        const startX = -(GRID_COLS * SPACING) / 2;
        const startY = -(GRID_ROWS * SPACING) / 2;

        for (let i = 0; i < GRID_ROWS; i++) {
            for (let j = 0; j < GRID_COLS; j++) {
                const x = startX + j * SPACING;
                const y = startY + i * SPACING;
                const z = 0;

                positions.push(x, y, z);
                colors.push(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b);

                const currentIndex = i * GRID_COLS + j;
                if (j < GRID_COLS - 1) indices.push(currentIndex, currentIndex + 1);
                if (i < GRID_ROWS - 1) indices.push(currentIndex, currentIndex + GRID_COLS);
            }
        }

        return {
            initialPositions: new Float32Array(positions),
            indices: new Uint16Array(indices),
            initialColors: new Float32Array(colors)
        };
    }, []);

    useFrame((state) => {
        if (!pointsRef.current || !linesRef.current || !planeRef.current) return;

        const time = state.clock.elapsedTime;

        // Update mouse NDC
        mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
        mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;

        // Use raycaster to find intersection with the tilted plane for PERFECT hovering
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(planeRef.current);

        let cursorX = 0;
        let cursorY = 0;
        let isHovering = false;

        if (intersects.length > 0) {
            // Get local coordinates on the plane
            const localPoint = planeRef.current.worldToLocal(intersects[0].point.clone());
            cursorX = localPoint.x;
            cursorY = localPoint.y;
            isHovering = true;
        }

        const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
        const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
        const linePositions = linesRef.current.geometry.attributes.position.array as Float32Array;
        const lineColors = linesRef.current.geometry.attributes.color.array as Float32Array;

        for (let i = 0; i < initialPositions.length; i += 3) {
            const ix = initialPositions[i];
            const iy = initialPositions[i + 1];

            // Distance calculation in local space
            const dx = ix - cursorX;
            const dy = iy - cursorY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let z = 0;
            let intensity = 0;

            if (isHovering && dist < INFLUENCE_RADIUS) {
                const t = 1 - dist / INFLUENCE_RADIUS;
                const falloff = t * t * (3 - 2 * t);
                const ripple = Math.sin(dist * RIPPLE_FREQUENCY - time * RIPPLE_SPEED) * WAVE_AMPLITUDE;
                z = ripple * falloff;
                intensity = falloff;
            }

            positions[i + 2] = z;
            linePositions[i + 2] = z;

            const r = BASE_COLOR.r + (HOVER_COLOR.r - BASE_COLOR.r) * intensity;
            const g = BASE_COLOR.g + (HOVER_COLOR.g - BASE_COLOR.g) * intensity;
            const b = BASE_COLOR.b + (HOVER_COLOR.b - BASE_COLOR.b) * intensity;

            colors[i] = r;
            colors[i + 1] = g;
            colors[i + 2] = b;

            lineColors[i] = r;
            lineColors[i + 1] = g;
            lineColors[i + 2] = b;
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true;
        pointsRef.current.geometry.attributes.color.needsUpdate = true;
        linesRef.current.geometry.attributes.position.needsUpdate = true;
        linesRef.current.geometry.attributes.color.needsUpdate = true;
    });

    return (
        // Tilt direction: Top further away, bottom closer
        // This makes top look denser (more cells) and bottom look less dense
        <group rotation={[Math.PI / 4, 0, 0]} position={[0, -5, 0]}>
            <mesh ref={planeRef} visible={false}>
                <planeGeometry args={[GRID_COLS * SPACING, GRID_ROWS * SPACING]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[initialPositions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        args={[initialColors, 3]}
                    />
                </bufferGeometry>
                <PointMaterial
                    transparent
                    vertexColors
                    size={0.15}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            <lineSegments ref={linesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[initialPositions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        args={[initialColors, 3]}
                    />
                    <bufferAttribute
                        attach="index"
                        args={[indices, 1]}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    vertexColors
                    linewidth={1}
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                />
            </lineSegments>
        </group>
    );
};

interface MatrixBackgroundProps {
    mousePos: { x: number; y: number };
}

export const MatrixBackground: React.FC<MatrixBackgroundProps> = ({ mousePos }) => {
    return (
        <div
            className="matrix-background-container"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
                background: '#000000',
                overflow: 'hidden'
            }}
        >
            <Canvas
                camera={{ fov: 60, position: [0, 0, 40] }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]}
            >
                <FabricGrid mousePos={mousePos} />
            </Canvas>
        </div>
    );
};

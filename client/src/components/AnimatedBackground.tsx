import React, { useEffect, useRef } from 'react';

export const AnimatedBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width;
        let height = canvas.height;

        // --- Elements ---

        // Stars
        const starCount = 100;
        const stars: Array<{ x: number; y: number; radius: number; alpha: number; speed: number }> = [];

        const createStars = () => {
            stars.length = 0;
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height * 0.7, // Stars mostly in top 70%
                    radius: Math.random() * 1.5,
                    alpha: Math.random(),
                    speed: Math.random() * 0.05
                });
            }
        };

        // Falling Stars
        let fallingStar = {
            x: 0,
            y: 0,
            length: 0,
            speed: 0,
            opacity: 0,
            active: false
        };

        const triggerFallingStar = () => {
            if (fallingStar.active) return;
            fallingStar.x = Math.random() * width;
            fallingStar.y = Math.random() * height * 0.4;
            fallingStar.length = Math.random() * 80 + 20;
            fallingStar.speed = Math.random() * 5 + 5;
            fallingStar.opacity = 1;
            fallingStar.active = true;
        };

        // Particles (Existing floating particles, adapted)
        let particles: Array<{
            x: number;
            y: number;
            radius: number;
            speedX: number;
            speedY: number;
            opacity: number;
        }> = [];

        const createParticles = () => {
            particles = [];
            const particleCount = 30;
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: Math.random() * 0.5 + 0.2,
                });
            }
        };

        // Resize Handler
        const resizeCanvas = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            createStars();
            createParticles();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);


        // --- Drawing Functions ---

        const drawNightSky = () => {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#020024'); // Deep dark blue/black
            gradient.addColorStop(0.4, '#090979'); // Dark blue
            gradient.addColorStop(1, '#00d4ff'); // Lighter blue near horizon (or swap for dark)
            // Let's go for a proper night desert look
            const nightGradient = ctx.createLinearGradient(0, 0, 0, height);
            nightGradient.addColorStop(0, '#000000');
            nightGradient.addColorStop(0.5, '#050a14');
            nightGradient.addColorStop(1, '#0a101f');

            ctx.fillStyle = nightGradient;
            ctx.fillRect(0, 0, width, height);
        };

        // User requested to KEEP the mesh but remove lines.
        // We will make the mesh huge and very soft.
        const drawMesh = (time: number) => {
            // Subtle rotating hues
            const hue1 = (time * 0.01) % 360;
            const hue2 = (time * 0.015 + 180) % 360;

            const gradient1 = ctx.createRadialGradient(
                width * 0.2 + Math.sin(time * 0.001) * 100,
                height * 0.3 + Math.cos(time * 0.001) * 50,
                0,
                width * 0.2,
                height * 0.3,
                width * 1.0 // Huge radius to blend lines
            );
            gradient1.addColorStop(0, `hsla(${hue1}, 70%, 40%, 0.1)`);
            gradient1.addColorStop(1, 'transparent');

            const gradient2 = ctx.createRadialGradient(
                width * 0.8 - Math.sin(time * 0.0015) * 100,
                height * 0.7 - Math.cos(time * 0.0015) * 50,
                0,
                width * 0.8,
                height * 0.7,
                width * 0.9
            );
            gradient2.addColorStop(0, `hsla(${hue2}, 70%, 40%, 0.08)`);
            gradient2.addColorStop(1, 'transparent');

            ctx.globalCompositeOperation = 'screen'; // Blend mode to make it glowy not muddy
            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = gradient2;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over'; // Reset
        };

        const drawStars = (time: number) => {
            ctx.fillStyle = 'white';
            stars.forEach(star => {
                const twinkle = Math.abs(Math.sin((time * 0.002) + star.x));
                const currentAlpha = star.alpha * (0.5 + 0.5 * twinkle);
                ctx.globalAlpha = currentAlpha;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        };

        const drawMoon = () => {
            // Moon position
            const mx = width * 0.85;
            const my = height * 0.15;
            const moonRadius = 40;

            // Glow
            const glow = ctx.createRadialGradient(mx, my, moonRadius, mx, my, moonRadius * 3);
            glow.addColorStop(0, 'rgba(255, 255, 230, 0.2)');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(mx, my, moonRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            // Moon body
            ctx.fillStyle = '#ffffe0'; // Light yellow white
            ctx.beginPath();
            ctx.arc(mx, my, moonRadius, 0, Math.PI * 2);
            ctx.fill();

            // Craters (subtle)
            ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
            ctx.beginPath();
            ctx.arc(mx - 10, my + 5, 8, 0, Math.PI * 2);
            ctx.arc(mx + 15, my - 10, 5, 0, Math.PI * 2);
            ctx.arc(mx + 5, my + 15, 6, 0, Math.PI * 2);
            ctx.fill();
        };

        const drawFallingStar = () => {
            if (!fallingStar.active) {
                if (Math.random() < 0.005) { // 0.5% chance per frame
                    triggerFallingStar();
                }
                return;
            }

            fallingStar.x -= fallingStar.speed; // Move left
            fallingStar.y += fallingStar.speed * 0.5; // Move down
            fallingStar.opacity -= 0.01;

            if (fallingStar.opacity <= 0) {
                fallingStar.active = false;
                return;
            }

            const gradient = ctx.createLinearGradient(
                fallingStar.x, fallingStar.y,
                fallingStar.x + fallingStar.length, fallingStar.y - fallingStar.length * 0.5
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${fallingStar.opacity})`);
            gradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(fallingStar.x, fallingStar.y);
            ctx.lineTo(fallingStar.x + fallingStar.length, fallingStar.y - fallingStar.length * 0.5);
            ctx.stroke();
        };

        const drawDunes = () => {
            // Dunes in the background - darker
            ctx.fillStyle = '#050510'; // Very dark silhouette
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(0, height * 0.85);

            // Curve 1
            ctx.bezierCurveTo(
                width * 0.25, height * 0.8,
                width * 0.5, height * 0.9,
                width * 0.75, height * 0.82
            );
            // Curve 2
            ctx.bezierCurveTo(
                width * 0.8, height * 0.8,
                width * 0.9, height * 0.75,
                width, height * 0.8
            );

            ctx.lineTo(width, height);
            ctx.fill();

            // Dunes in foreground - slightly lighter for depth (still silhouette)
            ctx.fillStyle = '#0a0a1a';
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(0, height * 0.9);

            ctx.bezierCurveTo(
                width * 0.2, height * 0.95,
                width * 0.5, height * 0.85,
                width, height * 0.92
            );

            ctx.lineTo(width, height);
            ctx.fill();
        };

        const drawCactus = (x: number, y: number, scale: number) => {
            ctx.fillStyle = '#020205'; // Almost black silhouette
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);

            // Main stem
            const w = 15;
            const h = 60;

            // Main body
            ctx.beginPath();
            ctx.roundRect(-w / 2, -h, w, h, 10);
            ctx.fill();

            // Left arm
            ctx.beginPath();
            ctx.moveTo(-w / 2, -h * 0.6);
            ctx.quadraticCurveTo(-w * 2, -h * 0.6, -w * 2, -h * 0.8);
            ctx.quadraticCurveTo(-w * 2, -h * 0.9, -w * 2 + w / 1.5, -h * 0.9);
            ctx.lineTo(-w / 2, -h * 0.5);
            ctx.fill();

            // Right arm
            ctx.beginPath();
            ctx.moveTo(w / 2, -h * 0.7);
            ctx.quadraticCurveTo(w * 2.5, -h * 0.7, w * 2.5, -h * 0.9);
            ctx.quadraticCurveTo(w * 2.5, -h * 1, w * 2.5 - w / 1.5, -h * 1);
            ctx.lineTo(w / 2, -h * 0.6);
            ctx.fill();

            ctx.restore();
        };

        const drawDesertElements = () => {
            drawDunes();
            // Draw some cacti on the dunes
            // Left side
            drawCactus(width * 0.15, height * 0.92, 1.2);
            drawCactus(width * 0.12, height * 0.94, 0.8);

            // Right side
            drawCactus(width * 0.85, height * 0.88, 1.0);
        };

        const drawParticles = () => {
            particles.forEach((particle) => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;

                if (particle.x < 0 || particle.x > width) particle.speedX *= -1;
                if (particle.y < 0 || particle.y > height) particle.speedY *= -1;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(168, 85, 247, ${particle.opacity})`; // Keep original purple glow
                ctx.fill();
            });
        };

        let animationFrameId: number;

        const animate = (time: number) => {
            ctx.clearRect(0, 0, width, height);

            drawNightSky();
            drawStars(time);
            drawMoon();
            drawFallingStar();

            // Mesh goes here to blend with sky but behind desert
            drawMesh(time);

            drawParticles();
            drawDesertElements();

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="animated-background-canvas"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -1,
                pointerEvents: 'none',
            }}
        />
    );
};


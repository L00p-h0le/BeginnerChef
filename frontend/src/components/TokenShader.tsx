import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- TYPES ---
export type TokenType = 'ETH' | 'SOL' | 'BTC' | 'USDC';

interface TokenConfig {
    bgColor?: string;
    gradient?: [string, string];
    ringColor: string;
    edgeColor: number; // Hexadecimal number
    metalness: number;
    roughness: number;
    svg: string;
}

// --- OFFICIAL BRAND CONFIGURATIONS ---
const TOKEN_CONFIGS: Record<TokenType, TokenConfig> = {
    ETH: {
        bgColor: '#1E222D',
        ringColor: 'rgba(255, 255, 255, 0.15)',
        edgeColor: 0x2A2E3D, // Dark Gunmetal Titanium
        metalness: 0.85,
        roughness: 0.2,
        svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 417"><path fill="%23FFFFFF" opacity="0.9" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/><path fill="%23FFFFFF" opacity="0.6" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/><path fill="%23FFFFFF" opacity="0.8" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.601 128.038-180.32z"/><path fill="%23FFFFFF" opacity="0.5" d="M127.962 416.905V312.186L0 236.586z"/><path fill="%23FFFFFF" opacity="0.75" d="M127.961 288.158l127.962-75.837-127.962-58.163z"/><path fill="%23FFFFFF" opacity="0.4" d="M0 212.321l127.962 75.837V154.158z"/></svg>`
    },
    SOL: {
        gradient: ['#9945FF', '#14F195'],
        ringColor: 'rgba(255, 255, 255, 0.25)',
        edgeColor: 0x211338, // Anodized Violet Rim
        metalness: 0.75,
        roughness: 0.25,
        svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="%23FFFFFF" d="M120 380h310l-40 45H80zM80 233.5h310l40 45H120zM120 87h310l-40 45H80z"/></svg>`
    },
    BTC: {
        bgColor: '#F7931A',
        ringColor: 'rgba(255, 255, 255, 0.3)',
        edgeColor: 0xD4AF37, // Polished Gold Rim
        metalness: 0.9,
        roughness: 0.18,
        svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64"><path fill="%23FFFFFF" d="M46.1 27.4c.6-4.3-2.6-6.6-7.1-8.1l1.5-5.8-3.5-.9-1.4 5.7c-.9-.2-1.9-.4-2.8-.6l1.4-5.7-3.5-.9-1.5 5.8c-.8-.2-1.5-.3-2.3-.5l-4.9-1.2-.9 3.8s2.6.6 2.6.6c1.4.4 1.7 1.3 1.6 2.1l-1.6 6.5c.1 0 .2.1.3.1l-.3-.1-2.3 9.1c-.2.5-.7 1.2-1.8.9 0 0-2.6-.6-2.6-.6l-1.8 4.2 4.6 1.2c.9.2 1.7.5 2.6.7l-1.5 6.1 3.5.9 1.5-5.9c1 .3 1.9.5 2.8.7l-1.5 5.9 3.5.9 1.5-6.1c6 1.1 10.5.7 12.4-4.8 1.5-4.4-.1-7-3.3-8.6 2.3-.6 4.1-2.2 4.5-5.6zm-8.1 11.9c-1.1 4.4-8.5 2-10.9 1.4l1.9-7.8c2.4.6 10.2 1.8 9 6.4zm1.1-12c-1 4-7.2 2-9.2 1.5l1.8-7.1c2 .5 8.5 1.5 7.4 5.6z"/></svg>`
    },
    USDC: {
        bgColor: '#2775CA',
        ringColor: 'rgba(255, 255, 255, 0.25)',
        edgeColor: 0xC0C7D0, // Platinum Silver Rim
        metalness: 0.95,
        roughness: 0.15,
        svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="1.5 1.5 13 13"><path fill="%23ffffff" d="M10.01105 9.062c0 -1.062 -0.64 -1.426 -1.92 -1.578 -0.914 -0.1215 -1.0965 -0.364 -1.0965 -0.789 0 -0.425 0.305 -0.698 0.914 -0.698 0.5485 0 0.8535 0.182 1.0055 0.6375 0.0158 0.04405 0.04475 0.0822 0.08295 0.10925 0.03815 0.0271 0.0837 0.04185 0.13055 0.04225h0.4875c0.02815 0.00075 0.05615 -0.0042 0.08235 -0.0146 0.02615 -0.0104 0.04995 -0.02605 0.0699 -0.0459 0.01995 -0.01985 0.0357 -0.0436 0.0462 -0.0697 0.01055 -0.02615 0.01565 -0.05415 0.01505 -0.0823v-0.03c-0.0596 -0.32955 -0.22635 -0.6302 -0.47435 -0.85525 -0.248 -0.22505 -0.5634 -0.36185 -0.89715 -0.38925V4.571005c0 -0.1215 -0.0915 -0.2125 -0.2435 -0.243h-0.4575c-0.1215 0 -0.213 0.091 -0.2435 0.243V5.269c-0.9145 0.121 -1.493 0.728 -1.493 1.487 0 1.001 0.609 1.3955 1.889 1.5475 0.8535 0.1515 1.1275 0.334 1.1275 0.8195 0 0.485 -0.4265 0.819 -1.0055 0.819 -0.7925 0 -1.0665 -0.3335 -1.158 -0.789 -0.03 -0.121 -0.122 -0.182 -0.2135 -0.182h-0.518c-0.02815 -0.0007 -0.0561 0.00435 -0.0822 0.0148 -0.02615 0.0104 -0.04985 0.02605 -0.0698 0.0459 -0.0199 0.01985 -0.03555 0.04355 -0.04605 0.06965 -0.0105 0.0261 -0.0156 0.05405 -0.01495 0.08215v0.03c0.1215 0.759 0.6095 1.305 1.615 1.457v0.7285c0 0.121 0.0915 0.2125 0.2435 0.2425h0.4575c0.1215 0 0.213 -0.091 0.2435 -0.2425V10.67c0.9145 -0.1515 1.5235 -0.789 1.5235 -1.6085v0.0005Z"></path><path fill="%23ffffff" d="M6.446 12.2485c-2.37698 -0.85 -3.59598 -3.49 -2.71198 -5.8265 0.457 -1.275 1.46248 -2.2455 2.71198 -2.701 0.122 -0.0605 0.1825 -0.1515 0.1825 -0.3035v-0.425c0 -0.121 -0.0605 -0.212 -0.1825 -0.2425 -0.0305 0 -0.0915 0 -0.122 0.03 -0.68575 0.21416 -1.3224 0.561865 -1.87327 1.023085 -0.550855 0.461225 -1.00503 1.026855 -1.336385 1.664315 -0.331355 0.6375 -0.53334 1.3342 -0.59432 2.05005 -0.06098 0.71585 0.020245 1.4367 0.238995 2.12105 0.548 1.7 1.8585 3.005 3.56498 3.551 0.122 0.0605 0.244 0 0.274 -0.1215 0.0305 -0.03 0.0305 -0.061 0.0305 -0.1215v-0.425c0 -0.091 -0.091 -0.212 -0.1825 -0.273Zm3.23 -9.468c-0.122 -0.061 -0.244 0 -0.274 0.121 -0.0305 0.0305 -0.0305 0.061 -0.0305 0.1215v0.425c0 0.1215 0.091 0.2425 0.1825 0.3035 2.377 0.85 3.596 3.49 2.712 5.8265 -0.457 1.275 -1.4625 2.2455 -2.712 2.701 -0.122 0.0605 -0.1825 0.1515 -0.1825 0.3035v0.425c0 0.121 0.0605 0.212 0.1825 0.2425 0.0305 0 0.0915 0 0.122 -0.03 0.6858 -0.21415 1.32245 -0.56185 1.8733 -1.0231 0.55085 -0.4612 1.00505 -1.02685 1.3364 -1.6643 0.33135 -0.6375 0.53335 -1.3342 0.5943 -2.05005 0.061 -0.71585 -0.02025 -1.4367 -0.239 -2.12105 -0.548 -1.73 -1.889 -3.035 -3.565 -3.581Z"></path></svg>`
    }
};

export const TokenShader: React.FC = () => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [activeToken, setActiveToken] = useState<TokenType>('ETH');

    const materialsRef = useRef<THREE.Material[] | null>(null);
    const edgeMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // Scene & Camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 0, 7.5);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        container.appendChild(renderer.domElement);

        // Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.2;

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(5, 8, 5);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xf4f1ea, 1.0);
        fillLight.position.set(-5, -2, -2);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
        rimLight.position.set(0, 5, -5);
        scene.add(rimLight);

        // Helper: Canvas Texture Generator
        const createCoinFaceTexture = (config: TokenConfig): THREE.CanvasTexture => {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

            const texture = new THREE.CanvasTexture(canvas);
            const img = new Image();

            img.onload = () => {
                if (config.gradient) {
                    const grad = ctx.createLinearGradient(0, 1024, 1024, 0);
                    grad.addColorStop(0, config.gradient[0]);
                    grad.addColorStop(1, config.gradient[1]);
                    ctx.fillStyle = grad;
                } else if (config.bgColor) {
                    ctx.fillStyle = config.bgColor;
                }
                ctx.fillRect(0, 0, 1024, 1024);

                ctx.lineWidth = 14;
                ctx.strokeStyle = config.ringColor;
                ctx.beginPath();
                ctx.arc(512, 512, 450, 0, Math.PI * 2);
                ctx.stroke();

                const size = 420;
                ctx.drawImage(img, (1024 - size) / 2, (1024 - size) / 2, size, size);
                texture.needsUpdate = true;
            };

            img.src = config.svg;
            return texture;
        };

        // Mesh Creation
        const geometry = new THREE.CylinderGeometry(1.7, 1.7, 0.22, 128, 1);
        const initialConfig = TOKEN_CONFIGS.ETH;

        const edgeMaterial = new THREE.MeshPhysicalMaterial({
            color: initialConfig.edgeColor,
            metalness: initialConfig.metalness,
            roughness: initialConfig.roughness,
            clearcoat: 0.3,
            clearcoatRoughness: 0.1
        });
        edgeMaterialRef.current = edgeMaterial;

        const faceMaterial = new THREE.MeshStandardMaterial({
            map: createCoinFaceTexture(initialConfig),
            roughness: 0.25,
            metalness: 0.1
        });

        const materials: THREE.Material[] = [edgeMaterial, faceMaterial, faceMaterial];
        materialsRef.current = materials;

        const tokenMesh = new THREE.Mesh(geometry, materials);
        const tokenGroup = new THREE.Group();
        tokenGroup.add(tokenMesh);
        scene.add(tokenGroup);

        // Animation Loop
        let animationFrameId: number;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            tokenMesh.rotation.x = time * 0.22;
            tokenMesh.rotation.z = Math.sin(time * 0.5) * 0.10;
            tokenGroup.position.y = Math.sin(time * 0.9) * 0.06 + 0.3; // Shifted up for padding

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Resize Handler
        const handleResize = () => {
            if (!container) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup phase
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            geometry.dispose();
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Handler to Switch Token Types
    const switchToken = (type: TokenType) => {
        setActiveToken(type);
        const config = TOKEN_CONFIGS[type];
        if (!config || !materialsRef.current || !edgeMaterialRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const texture = new THREE.CanvasTexture(canvas);
        const img = new Image();

        img.onload = () => {
            if (config.gradient) {
                const grad = ctx.createLinearGradient(0, 1024, 1024, 0);
                grad.addColorStop(0, config.gradient[0]);
                grad.addColorStop(1, config.gradient[1]);
                ctx.fillStyle = grad;
            } else if (config.bgColor) {
                ctx.fillStyle = config.bgColor;
            }
            ctx.fillRect(0, 0, 1024, 1024);

            ctx.lineWidth = 14;
            ctx.strokeStyle = config.ringColor;
            ctx.beginPath();
            ctx.arc(512, 512, 450, 0, Math.PI * 2);
            ctx.stroke();

            const size = 420;
            ctx.drawImage(img, (1024 - size) / 2, (1024 - size) / 2, size, size);
            texture.needsUpdate = true;

            // Update Top & Bottom Face Textures
            (materialsRef.current![1] as THREE.MeshStandardMaterial).map = texture;
            (materialsRef.current![2] as THREE.MeshStandardMaterial).map = texture;
            materialsRef.current![1].needsUpdate = true;
            materialsRef.current![2].needsUpdate = true;
        };

        img.src = config.svg;

        // Update Edge Rim
        edgeMaterialRef.current.color.setHex(config.edgeColor);
        edgeMaterialRef.current.metalness = config.metalness;
        edgeMaterialRef.current.roughness = config.roughness;
        edgeMaterialRef.current.needsUpdate = true;
    };

    const tokens: TokenType[] = ['ETH', 'SOL', 'BTC', 'USDC'];

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                cursor: 'grab'
            }}
        >
            {/* Token Switcher Control Bar */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '0px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(12px)',
                    padding: '5px',
                    borderRadius: '30px',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                    zIndex: 10
                }}
            >
                {tokens.map((token) => (
                    <button
                        key={token}
                        onClick={() => switchToken(token)}
                        style={{
                            background: activeToken === token ? '#ffffff' : 'transparent',
                            border: 'none',
                            color: activeToken === token ? '#111111' : '#666666',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontWeight: activeToken === token ? 600 : 500,
                            cursor: 'pointer',
                            fontSize: '12px',
                            letterSpacing: '0.5px',
                            boxShadow: activeToken === token ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                            transition: 'all 0.25s ease'
                        }}
                    >
                        {token}
                    </button>
                ))}
            </div>
        </div>
    );
};
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface FluidOrbProps {
    audioLevel: number;
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'speaking' | 'listening' | 'agentic' | 'error';
}

export const FluidOrb: React.FC<FluidOrbProps> = ({ audioLevel, status }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const frameIdRef = useRef<number>(0);
    const smoothAudioRef = useRef<number>(0);
    const statusRef = useRef<string>('disconnected');

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float time;
        uniform float audioLevel;
        uniform float isSpeaking;
        uniform float isListening;
        varying vec2 vUv;
        
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        float smooth_noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(noise(i), noise(i + vec2(1,0)), f.x),
                mix(noise(i + vec2(0,1)), noise(i + vec2(1,1)), f.x), f.y);
        }
        
        void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            float dist = length(uv);
            if (dist > 1.0) discard;
            
            vec3 white = vec3(1.0);
            vec3 lightBlue = vec3(0.6, 0.88, 1.0);
            vec3 skyBlue = vec3(0.4, 0.75, 0.98);
            vec3 deepBlue = vec3(0.25, 0.6, 0.95);
            
            float t = time * 0.035;
            float audioT = audioLevel * 0.5;
            
            float w1 = smooth_noise(uv * 1.5 + vec2(t, t * 0.4));
            float w2 = smooth_noise(uv * 2.0 + vec2(-t * 0.6 + audioT, t * 0.5));
            float w3 = smooth_noise(uv * 2.2 + vec2(t * 0.3, -t * 0.4 + audioT));
            
            // Base light blue
            vec3 color = lightBlue;
            
            // === MORE WHITE ON TOP ===
            // Strong white gradient from top
            float topWhite = smoothstep(-0.2, 0.8, uv.y);
            color = mix(color, white, topWhite * 0.6);
            
            // Additional white wisps in upper area
            float whiteMask = w1 * 0.4 + uv.y * 0.25 + 0.3;
            color = mix(color, white, smoothstep(0.35, 0.6, whiteMask) * 0.5);
            
            // Extra pure white at very top
            float pureTop = smoothstep(0.3, 0.9, uv.y);
            color = mix(color, white, pureTop * 0.4);
            
            // Blue bottom (fixed but with movement)
            float bottomBlue = smoothstep(0.2, -0.4, uv.y);
            color = mix(color, skyBlue, bottomBlue * 0.5 + w2 * 0.15);
            color = mix(color, deepBlue, smoothstep(0.1, -0.6, uv.y) * 0.3);
            
            // Speaking glow
            float speakGlow = isSpeaking * audioLevel * 0.12;
            color += vec3(0.05, 0.12, 0.2) * speakGlow;
            
            // Listening ripple
            float ripple = sin(dist * 8.0 - time * 2.5 * audioLevel) * isListening * audioLevel * 0.08;
            color += white * max(0.0, ripple);
            
            // Wispy overlay
            color = mix(color, white * 0.98, w3 * 0.1);
            
            color *= 0.95 + audioLevel * 0.08;
            
            float edge = smoothstep(1.0, 0.83, dist);
            gl_FragColor = vec4(color, edge * 0.96);
        }
    `;

    useEffect(() => {
        if (!containerRef.current) return;
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 2;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(40, 40);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const geometry = new THREE.PlaneGeometry(1.95, 1.95);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                isSpeaking: { value: 0 },
                isListening: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            transparent: true
        });
        materialRef.current = material;

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        meshRef.current = mesh;

        const animate = (t: number) => {
            if (materialRef.current) {
                materialRef.current.uniforms.time.value = t * 0.001;
                const curr = materialRef.current.uniforms.audioLevel.value;
                materialRef.current.uniforms.audioLevel.value += (smoothAudioRef.current - curr) * 0.08;
                materialRef.current.uniforms.isSpeaking.value = statusRef.current === 'speaking' ? 1.0 : 0.0;
                materialRef.current.uniforms.isListening.value = statusRef.current === 'listening' ? 1.0 : 0.0;
            }

            if (meshRef.current) {
                const audio = smoothAudioRef.current;
                const breath = Math.sin(t * 0.0006) * 0.006;
                const pulse = statusRef.current === 'speaking'
                    ? audio * 0.08 * (Math.sin(t * 0.006) * 0.5 + 0.5)
                    : audio * 0.1;
                meshRef.current.scale.setScalar(1.0 + breath + pulse);
            }

            renderer.render(scene, camera);
            frameIdRef.current = requestAnimationFrame(animate);
        };
        animate(0);

        return () => {
            cancelAnimationFrame(frameIdRef.current);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    useEffect(() => { smoothAudioRef.current = audioLevel; }, [audioLevel]);
    useEffect(() => { statusRef.current = status; }, [status]);

    return <div ref={containerRef} className="w-10 h-10 flex items-center justify-center pointer-events-none" />;
};

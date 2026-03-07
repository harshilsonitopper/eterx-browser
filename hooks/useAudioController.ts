import { useState, useRef, useEffect, useCallback } from 'react';
import { SidebarGeminiService } from '../services/GeminiService';

export type VoiceName = 'Aoede' | 'Charon' | 'Fenrir' | 'Kore' | 'Puck';

export function useAudioController() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
    const [voice, setVoice] = useState<VoiceName>('Aoede');

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioUrlMap, setAudioUrlMap] = useState<Record<string, string>>({}); // Maps turnId to object URL

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            Object.values(audioUrlMap).forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            setActiveTurnId(null);
        }
    }, []);

    const playStreamText = useCallback(async (text: string, turnId: string) => {
        try {
            // Unmount current audio if any
            stopAudio();
            
            // If already generated, just play from cache
            if (audioUrlMap[turnId]) {
                const audio = new Audio(audioUrlMap[turnId]);
                audioRef.current = audio;
                
                audio.onended = () => {
                    setIsPlaying(false);
                    setActiveTurnId(null);
                };
                
                audio.play();
                setIsPlaying(true);
                setActiveTurnId(turnId);
                return;
            }

            // Generate fresh audio
            setIsLoading(true);
            setActiveTurnId(turnId);

            // Strip markdown, code blocks, etc. for cleaner speech
            const cleanText = text
                .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                .replace(/\*\*/g, '') // Remove bold
                .replace(/#/g, '') // Remove headers
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Extract text from links
                .trim();

            const base64Audio = await SidebarGeminiService.generateSpeech(cleanText, voice);
            
            if (!base64Audio) {
                throw new Error("No audio generated");
            }

            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);

            setAudioUrlMap(prev => ({ ...prev, [turnId]: url }));

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                setIsPlaying(false);
                setActiveTurnId(null);
            };

            audio.play();
            setIsPlaying(true);
            setIsLoading(false);

        } catch (error) {
            console.error("Audio Playback Error:", error);
            setIsLoading(false);
            setActiveTurnId(null);
        }
    }, [voice, audioUrlMap, stopAudio]);

    const togglePlayback = useCallback((text: string, turnId: string) => {
        if (activeTurnId === turnId && isPlaying) {
            stopAudio();
        } else {
            playStreamText(text, turnId);
        }
    }, [activeTurnId, isPlaying, playStreamText, stopAudio]);

    return {
        isPlaying,
        isLoading,
        activeTurnId,
        voice,
        setVoice,
        togglePlayback,
        stopAudio
    };
}

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionOptions {
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
}

export const useSpeechRecognition = (options: SpeechRecognitionOptions = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);

    // Browser compat
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const startListening = useCallback(() => {
        if (!SpeechRecognition) {
            setError('Speech recognition not supported in this browser.');
            return;
        }

        // Prevent multiple instances
        if (isListening || recognitionRef.current) {
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = options.continuous ?? false;
        recognition.interimResults = options.interimResults ?? true; // Default to true for better UI
        recognition.lang = options.lang || 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: any) => {
            let finalTrans = '';
            let interTrans = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTrans += event.results[i][0].transcript;
                } else {
                    interTrans += event.results[i][0].transcript;
                }
            }

            if (finalTrans) {
                setTranscript(prev => prev + finalTrans + ' ');
            }
            setInterimTranscript(interTrans);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech error:', event.error);
            // Don't stop on 'no-speech' error in continuous mode, just ignore
            if (event.error === 'no-speech' && options.continuous) {
                return;
            }
            setError(event.error);
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.onend = () => {
            // In continuous mode, some implementations might stop automatically. 
            // Logic to restart could go here if truly "always on" is needed, but risk loop.
            setIsListening(false);
            recognitionRef.current = null;
        };

        recognition.start();
    }, [isListening, options.continuous, options.interimResults, options.lang]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        error
    };
};

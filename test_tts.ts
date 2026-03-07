import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_API_KEY || process.env.VITE_SIDEBAR_API_KEY_1 || process.env.VITE_SEARCH_API_KEY_1;

async function testTTS(modelName: string) {
    if (!API_KEY) {
        console.error("No API KEY found!");
        return;
    }
    
    console.log("Testing model:", modelName);
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    try {
        const result = await ai.models.generateContent({
            model: modelName,
            contents: 'Repeat exactly: Welcome to EterX. Advanced cognition engine is online.',
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Aura"
                        }
                    }
                }
            }
        });
        
        console.log(`[${modelName}] Success!`);
        const inlineData = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (inlineData) {
            fs.writeFileSync('test_audio.wav', Buffer.from(inlineData.inlineData.data, 'base64'));
            console.log("Saved test_audio.wav");
        }
        
    } catch (e: any) {
        console.error(`[${modelName}] Failed:`, e.message);
    }
}

testTTS('gemini-2.5-flash-preview-tts');

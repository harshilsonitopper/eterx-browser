
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for document result
export interface ParsedDocument {
    text: string;
    type: string;
    metadata?: any;
}

// Minimal polyfill for browser environment since pdf-parse/mammoth are node-centric
// For a browser-based Electron app, we might need a different approach or IPC.
// However, assuming we can use some browser-compatible logic or simple text extraction for now.

export const DocumentLoaderService = {

    /**
     * Reads a file and returns its text content
     */
    async loadFile(file: File): Promise<ParsedDocument> {
        const type = file.type;
        const name = file.name.toLowerCase();

        console.log(`[DocumentLoader] Processing ${name} (${type})`);

        try {
            if (name.endsWith('.pdf')) {
                // PDF Parsing in Browser (using pdfjs-dist if available, or basic text extraction)
                // For now, let's assume we handle it as text or need a specialized library loaded in index.html
                // Since 'pdf-parse' is Node.js only, we'll try a basic array buffer read or throw for now
                // REAL IMPLEMENTATION: Needs 'pdfjs-dist' for browser side
                return { text: `[PDF Parsing requires pdfjs-dist integration. File: ${name}]`, type: 'pdf' };
            }

            if (name.endsWith('.docx')) {
                // Mammoth is better suited for Node, but can run in browser
                // import mammoth from 'mammoth'; 
                // We'll skip complex implementation for this 'mock' phase and just read text if possible
                return { text: `[Word Doc Parsing requires mammoth integration. File: ${name}]`, type: 'docx' };
            }

            if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
                return await this.readTextFile(file);
            }

            if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.json')) {
                return await this.readTextFile(file);
            }

            return { text: `[Unsupported file type: ${type}]`, type: 'unknown' };

        } catch (e: any) {
            console.error("File load error:", e);
            return { text: "Error reading file: " + e.message, type: 'error' };
        }
    },

    readTextFile(file: File): Promise<ParsedDocument> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    text: e.target?.result as string || '',
                    type: 'text',
                    metadata: { name: file.name, size: file.size }
                });
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
};

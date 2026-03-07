export class ColorExtractionService {

    // --- Helper: Get Luminance (Perceived Brightness) 0-255 ---
    private static getLuminance(r: number, g: number, b: number): number {
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // --- Helper: RGB to HSL ---
    private static rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    // --- Helper: HSL to RGB String ---
    private static hslToRgbString(h: number, s: number, l: number): string {
        s /= 100; l /= 100;
        const k = (n: number) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const r = Math.round(f(0) * 255);
        const g = Math.round(f(8) * 255);
        const b = Math.round(f(4) * 255);
        return `rgb(${r},${g},${b})`;
    }

    static async extractDominantColor(imageUrl: string): Promise<{ primary: string, secondary: string, accent: string, textGradient: string }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve({
                        primary: '#ffffff', secondary: '#f0f0f0', accent: '#2196F3',
                        textGradient: 'linear-gradient(to right, #4f46e5, #8b5cf6, #4f46e5)'
                    });
                    return;
                }

                canvas.width = 50;
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);

                const imageData = ctx.getImageData(0, 0, 50, 50).data;

                let rSum = 0, gSum = 0, bSum = 0;
                let maxSat = -1;
                let vibrantColor = { r: 139, g: 92, b: 246 };
                let bgLuminanceSum = 0;

                for (let i = 0; i < imageData.length; i += 4 * 5) { // Sample more frequently (step 5)
                    const r = imageData[i];
                    const g = imageData[i + 1];
                    const b = imageData[i + 2];

                    rSum += r;
                    gSum += g;
                    bSum += b;
                    bgLuminanceSum += this.getLuminance(r, g, b);

                    const hsl = this.rgbToHsl(r, g, b);

                    // Find vibrant candidates
                    // Ignore overly dark/white pixels for vibrancy processing
                    if (hsl.s > maxSat && hsl.l > 20 && hsl.l < 85) {
                        maxSat = hsl.s;
                        vibrantColor = { r, g, b };
                    }
                }

                const count = (imageData.length / 4) / 5;
                const avgR = Math.floor(rSum / count);
                const avgG = Math.floor(gSum / count);
                const avgB = Math.floor(bSum / count);
                const avgLuminance = bgLuminanceSum / count;

                const isDarkBg = avgLuminance < 128; // Tipping point

                // --- SMART PALETTE GENERATION ---

                const primary = `rgb(${avgR},${avgG},${avgB})`;

                // Get HSL of the most vibrant color found
                const vibHsl = this.rgbToHsl(vibrantColor.r, vibrantColor.g, vibrantColor.b);

                // Enforce Visibility for Secondary/Accent (Text Colors)
                let textLuminanceTarget = isDarkBg ? 85 : 30; // High brightness for dark bg, Low brightness for light bg

                // Secondary: Vibrant but readable
                const secondary = this.hslToRgbString(vibHsl.h, Math.max(50, vibHsl.s), textLuminanceTarget);

                // Accent: Shifted hue or complementary
                const accent = this.hslToRgbString((vibHsl.h + 30) % 360, Math.max(60, vibHsl.s), textLuminanceTarget);

                // Gradient: Mix the readable colors
                // adding a "white" or "black" midpoint for gloss
                const midPoint = isDarkBg ? '#ffffff' : '#000000';

                // NOTE: We don't include midpoint in gradient to keep it "color rich", 
                // but we rely on the luminance shift we just did.
                const textGradient = `linear-gradient(135deg, ${secondary}, ${accent}, ${secondary})`;

                resolve({ primary, secondary, accent, textGradient });
            };

            img.onerror = () => {
                resolve({
                    primary: '#000000', secondary: '#333333', accent: '#2196F3',
                    textGradient: 'linear-gradient(to right, #4f46e5, #8b5cf6, #4f46e5)'
                });
            };
        });
    }
}

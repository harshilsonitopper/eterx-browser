import { SearchService } from './SearchService';

export const WALLPAPER_CATEGORIES = [
    { id: 'nature', label: 'Nature', prompt: 'breathtaking nature landscape 4k wallpaper realistic' },
    { id: 'space', label: 'Space', prompt: 'deep space nebula stars planets 4k wallpaper digital art' },
    { id: 'abstract', label: 'Abstract', prompt: 'abstract colorful fluid 3d shapes 4k wallpaper' },
    { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'futuristic cyberpunk city neon lights 4k wallpaper' },
    { id: 'architecture', label: 'Architecture', prompt: 'modern minimal architecture 4k wallpaper' },
    { id: 'minimalist', label: 'Minimalist', prompt: 'minimalist aesthetic gradient 4k wallpaper' },
    { id: 'fantasy', label: 'Fantasy', prompt: 'fantasy landscape magical world digital art 4k wallpaper' },
    { id: 'anime', label: 'Anime Style', prompt: 'anime scenery makoto shinkai style breathtaking sky 4k wallpaper' },
    { id: 'vaporwave', label: 'Vaporwave', prompt: 'vaporwave aesthetic retro 80s neon purple grid 4k wallpaper' },
    { id: 'pixelart', label: 'Pixel Art', prompt: 'pixel art landscape scenic detailed 4k wallpaper' },
    { id: 'lowpoly', label: 'Low Poly', prompt: 'low poly landscape 3d render vibrant colors 4k wallpaper' },
    { id: 'oilpaint', label: 'Oil Painting', prompt: 'oil painting style landscape impressionist texture 4k wallpaper' },
    { id: 'watercolor', label: 'Watercolor', prompt: 'watercolor painting artistic soft colors 4k wallpaper' },
    { id: 'neonnoir', label: 'Neon Noir', prompt: 'neon noir rain city night futuristic dark 4k wallpaper' },
];

export class WallpaperService {
    /**
     * Simulates "generating" a wallpaper by finding a high-quality image 
     * matching the "AI art" aesthetic for the given category.
     */
    static async generateWallpaper(categoryId: string): Promise<string | null> {
        try {
            const category = WALLPAPER_CATEGORIES.find(c => c.id === categoryId);
            if (!category) return null;

            // Use the search service to find images
            // We add "random" parameters or variation to the search if possible, 
            // but for now we'll fetch a batch and pick a random one.
            const results = await SearchService.searchImages(category.prompt);

            if (results && results.length > 0) {
                // Pick a random image from the top 5 to keep quality high but add variety
                const randomIndex = Math.floor(Math.random() * Math.min(results.length, 5));
                return results[randomIndex].link; // Return the direct image URL
            }

            return null;
        } catch (error) {
            console.error("Failed to generate wallpaper:", error);
            // Fallback to random picsum image if search fails
            return `https://picsum.photos/3840/2160?random=${Date.now()}`;
        }
    }
}

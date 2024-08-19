// raindropApi.ts
import { requestUrl, RequestUrlResponse } from 'obsidian';
import { moment } from 'obsidian';

export interface RaindropBookmark {
    title: string;
    link: string;
    collection: {
        $id: number;
        title: string;
    };
    tags: string[];
}

export class NoApiKeyError extends Error {
    constructor() {
        super('No API Key Specified');
        this.name = 'NoApiKeyError';
    }
}

interface FilterOptions {
    dateType: 'created' | 'modified';
    date: string;
    tags: string[];
    collection: string;
}

export async function fetchRaindropBookmarks(apiKey: string, options: FilterOptions): Promise<RaindropBookmark[]> {
    if (!apiKey) {
        throw new NoApiKeyError();
    }

    let searchQuery = `${options.dateType}:${options.date}`;

    if (options.tags.length > 0) {
        searchQuery += ` ${options.tags.map(tag => `#${tag}`).join(' ')}`;
    }

    if (options.collection) {
        searchQuery += ` collection:"${options.collection}"`;
    }

    const timestamp = Date.now(); // Add this line for cache-busting

    try {
        const response: RequestUrlResponse = await requestUrl({
            url: `https://api.raindrop.io/rest/v1/raindrops/0?search=${encodeURIComponent(searchQuery)}&_=${timestamp}`,
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.status !== 200) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data = JSON.parse(response.text);
        return data.items;
    } catch (error) {
        if (error instanceof NoApiKeyError) {
            throw error;
        } else {
            throw new Error(`Raindrop API Error: ${error.message}`);
        }
    }
}
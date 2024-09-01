// raindropApi.ts
import { requestUrl, RequestUrlResponse } from 'obsidian';

export interface RaindropBookmark {
    id: number;
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

async function fetchCollectionDetails(apiKey: string, collectionId: number): Promise<{ $id: number; title: string }> {
    if (collectionId <= 0) {
        return { $id: collectionId, title: 'Unsorted' };
    }

    const response: RequestUrlResponse = await requestUrl({
        url: `https://api.raindrop.io/rest/v1/collection/${collectionId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    if (response.status !== 200) {
        throw new Error(`API returned status ${response.status} for collection fetch`);
    }

    const data = JSON.parse(response.text);
    return {
        $id: data.item._id,
        title: data.item.title
    };
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

    const timestamp = Date.now(); // For cache-busting

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
        const bookmarksPromises = data.items.map(async (item: any): Promise<RaindropBookmark> => {
            let collection = { $id: 0, title: 'Unsorted' };
            if (item.collection && item.collection.$id && item.collection.$id > 0) {
                collection = await fetchCollectionDetails(apiKey, item.collection.$id);
            }

            return {
                id: item._id,
                title: item.title,
                link: item.link,
                collection: collection,
                tags: item.tags || []
            };
        });

        return Promise.all(bookmarksPromises);
    } catch (error) {
        if (error instanceof NoApiKeyError) {
            throw error;
        } else {
            throw new Error(`Raindrop API Error: ${error.message}`);
        }
    }
}
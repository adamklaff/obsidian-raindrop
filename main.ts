// main.ts
import { Plugin, MarkdownPostProcessorContext, MarkdownView } from 'obsidian';
import { RaindropBookmarksSettings, DEFAULT_SETTINGS, RaindropBookmarksSettingTab } from './settings';
import { fetchRaindropBookmarks, RaindropBookmark, NoApiKeyError } from './raindropApi';
import { moment } from 'obsidian';

export default class RaindropBookmarksPlugin extends Plugin {
    settings: RaindropBookmarksSettings;
    private refreshInterval: number;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new RaindropBookmarksSettingTab(this.app, this));
        this.registerMarkdownCodeBlockProcessor('raindrop', this.raindropProcessor.bind(this));

        // Set up interval to refresh active document every minute
        this.refreshInterval = window.setInterval(() => {
            this.refreshActiveDocument();
        }, 60000); // 60000 ms = 1 minute

        // Register the interval so it's properly cleared when the plugin is disabled
        this.registerInterval(this.refreshInterval);

        // Optional: Add a command to manually trigger refresh
        this.addCommand({
            id: 'refresh-raindrop-blocks',
            name: 'Refresh Raindrop Blocks in Active Document',
            callback: async () => {
                await this.refreshActiveDocument();
            }
        });
    }

    async onunload() {
        window.clearInterval(this.refreshInterval);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async raindropProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const options = this.parseOptions(source, ctx);

        if (!options.date) {
            el.createEl('p', { text: 'No Results' });
            return;
        }

        try {
            const bookmarks = await fetchRaindropBookmarks(this.settings.apiKey, options);
            this.renderBookmarks(bookmarks, el);
        } catch (error) {
            if (error instanceof NoApiKeyError) {
                el.createEl('p', { text: 'No API Key Specified' });
            } else {
                el.createEl('p', { text: `Error: ${error.message}` });
            }
        }
    }

    async refreshActiveDocument() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            const content = editor.getValue();
            if (content.includes('```raindrop')) {
                // Force a re-render of the document
                this.app.workspace.trigger('editor-change', editor, editor);
            }
        }
    }

    private parseOptions(source: string, ctx: MarkdownPostProcessorContext) {
        const lines = source.split('\n').map(line => line.trim());
        const options = {
            dateType: 'created' as 'created',
            date: null as string | null,
            tags: [] as string[],
            collection: ''
        };

        lines.forEach(line => {
            if (line.startsWith('created:')) {
                const [_, value] = line.split(':').map(part => part.trim());
                if (value === '{daily}') {
                    const fileName = ctx.sourcePath.split('/').pop();
                    options.date = fileName ? fileName.replace('.md', '') : null;
                    // Validate the date format
                    if (!options.date || !moment(options.date, 'YYYY-MM-DD', true).isValid()) {
                        options.date = null;
                    }
                } else {
                    options.date = null; // Invalid input, will result in "No Results"
                }
            } else if (line.startsWith('#')) {
                options.tags.push(line.substring(1));
            } else if (line.startsWith('@')) {
                options.collection = line.substring(1);
            }
        });

        return options;
    }

    private renderBookmarks(bookmarks: RaindropBookmark[], el: HTMLElement) {
        if (bookmarks.length === 0) {
            el.createEl('p', { text: 'No Results' });
            return;
        }

        const ul = el.createEl('ul');
        bookmarks.forEach(bookmark => {
            const li = ul.createEl('li');
            const a = li.createEl('a', {
                text: bookmark.title,
                href: bookmark.link
            });
            a.setAttribute('target', '_blank');

            const collectionName = bookmark.collection?.title || "Unsorted";
            let details = ` (Collection: ${collectionName}`;

            if (bookmark.tags && bookmark.tags.length > 0) {
                details += `, Tags: ${bookmark.tags.join(', ')}`;
            }

            details += ')';
            li.appendText(details);
        });
    }
}
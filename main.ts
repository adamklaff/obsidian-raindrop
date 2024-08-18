// main.ts
import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { RaindropBookmarksSettings, DEFAULT_SETTINGS, RaindropBookmarksSettingTab } from './settings';

export default class RaindropBookmarksPlugin extends Plugin {
    settings: RaindropBookmarksSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new RaindropBookmarksSettingTab(this.app, this));
        this.registerMarkdownCodeBlockProcessor('raindrop', this.raindropProcessor.bind(this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    raindropProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        el.createEl('p', { text: 'Raindrop Bookmarks placeholder (API key: ' + this.settings.apiKey + ')' });
    }
}
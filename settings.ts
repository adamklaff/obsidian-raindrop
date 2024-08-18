// settings.ts
import { App, PluginSettingTab, Setting } from 'obsidian';
import RaindropBookmarksPlugin from './main';

export interface RaindropBookmarksSettings {
    apiKey: string;
}

export const DEFAULT_SETTINGS: RaindropBookmarksSettings = {
    apiKey: ''
}

export class RaindropBookmarksSettingTab extends PluginSettingTab {
    plugin: RaindropBookmarksPlugin;

    constructor(app: App, plugin: RaindropBookmarksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Raindrop Bookmarks Settings' });

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Enter your Raindrop API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));
    }
}
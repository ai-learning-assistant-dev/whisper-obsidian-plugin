import Whisper from "main";
import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import { SettingsManager } from "./SettingsManager";

export class WhisperSettingsTab extends PluginSettingTab {
	private plugin: Whisper;
	private settingsManager: SettingsManager;
	private createNewFileInput: Setting;
	private saveAudioFileInput: Setting;
	private apiKeyInput: Setting;
	private apiUrlInput: Setting;
	private localServiceUrlInput: Setting;

	constructor(app: App, plugin: Whisper) {
		super(app, plugin);
		this.plugin = plugin;
		this.settingsManager = plugin.settingsManager;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		this.createHeader();
		this.createServiceTypeSetting();
		this.createApiKeySetting();
		this.createApiUrlSetting();
		this.createLocalServiceUrlSetting();
		this.createModelSetting();
		this.createPromptSetting();
		this.createLanguageSetting();
		this.createLocalServiceSettings();
		this.createSaveAudioFileToggleSetting();
		this.createSaveAudioFilePathSetting();
		this.createNewFileToggleSetting();
		this.createNewFilePathSetting();
		this.createDebugModeToggleSetting();
		this.updateSettingVisibility();
	}

	private getUniqueFolders(): TFolder[] {
		const files = this.app.vault.getMarkdownFiles();
		const folderSet = new Set<TFolder>();

		for (const file of files) {
			const parentFolder = file.parent;
			if (parentFolder && parentFolder instanceof TFolder) {
				folderSet.add(parentFolder);
			}
		}

		return Array.from(folderSet);
	}

	private createHeader(): void {
		this.containerEl.createEl("h2", { text: "Settings for Whisper." });
	}

	private createTextSetting(
		name: string,
		desc: string,
		placeholder: string,
		value: string,
		onChange: (value: string) => Promise<void>
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) =>
				text
					.setPlaceholder(placeholder)
					.setValue(value)
					.onChange(async (value) => await onChange(value))
			);
	}

	private createServiceTypeSetting(): void {
		new Setting(this.containerEl)
			.setName("Service Type")
			.setDesc("Choose between OpenAI API or Local Service")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useLocalService)
					.onChange(async (value) => {
						this.plugin.settings.useLocalService = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
						this.updateSettingVisibility();
					})
			);
	}

	private createApiKeySetting(): void {
		this.apiKeyInput = new Setting(this.containerEl)
			.setName("API Key")
			.setDesc("Enter your OpenAI API key")
			.addText((text) =>
				text
					.setPlaceholder("sk-...xxxx")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);
	}

	private createApiUrlSetting(): void {
		this.apiUrlInput = new Setting(this.containerEl)
			.setName("API URL")
			.setDesc("Specify the endpoint that will be used to make requests to")
			.addText((text) =>
				text
					.setPlaceholder("https://api.your-custom-url.com")
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);
	}

	private createLocalServiceUrlSetting(): void {
		this.localServiceUrlInput = new Setting(this.containerEl)
			.setName("Local Service URL")
			.setDesc("URL of your local Whisper service")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:9000")
					.setValue(this.plugin.settings.localServiceUrl)
					.onChange(async (value) => {
						this.plugin.settings.localServiceUrl = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);
	}

	private createModelSetting(): void {
		this.createTextSetting(
			"Model",
			"Specify the machine learning model to use for generating text",
			"whisper-1",
			this.plugin.settings.model,
			async (value) => {
				this.plugin.settings.model = value;
				await this.settingsManager.saveSettings(this.plugin.settings);
			}
		);
	}

	private createPromptSetting(): void {
		this.createTextSetting(
			"Prompt",
			"Optional: Add words with their correct spellings to help with transcription. Make sure it matches the chosen language.",
			"Example: ZyntriQix, Digique Plus, CynapseFive",
			this.plugin.settings.prompt,
			async (value) => {
				this.plugin.settings.prompt = value;
				await this.settingsManager.saveSettings(this.plugin.settings);
			}
		);
	}

	private createLanguageSetting(): void {
		this.createTextSetting(
			"Language",
			"Specify the language of the message being whispered",
			"en",
			this.plugin.settings.language,
			async (value) => {
				this.plugin.settings.language = value;
				await this.settingsManager.saveSettings(this.plugin.settings);
			}
		);
	}

	private createSaveAudioFileToggleSetting(): void {
		new Setting(this.containerEl)
			.setName("Save recording")
			.setDesc(
				"Turn on to save the audio file after sending it to the Whisper API"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.saveAudioFile)
					.onChange(async (value) => {
						this.plugin.settings.saveAudioFile = value;
						if (!value) {
							this.plugin.settings.saveAudioFilePath = "";
						}
						await this.settingsManager.saveSettings(
							this.plugin.settings
						);
						this.saveAudioFileInput.setDisabled(!value);
					})
			);
	}

	private createSaveAudioFilePathSetting(): void {
		this.saveAudioFileInput = new Setting(this.containerEl)
			.setName("Recordings folder")
			.setDesc(
				"Specify the path in the vault where to save the audio files"
			)
			.addText((text) =>
				text
					.setPlaceholder("Example: folder/audio")
					.setValue(this.plugin.settings.saveAudioFilePath)
					.onChange(async (value) => {
						this.plugin.settings.saveAudioFilePath = value;
						await this.settingsManager.saveSettings(
							this.plugin.settings
						);
					})
			)
			.setDisabled(!this.plugin.settings.saveAudioFile);
	}

	private createNewFileToggleSetting(): void {
		new Setting(this.containerEl)
			.setName("Save transcription")
			.setDesc(
				"Turn on to create a new file for each recording, or leave off to add transcriptions at your cursor"
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.createNewFileAfterRecording)
					.onChange(async (value) => {
						this.plugin.settings.createNewFileAfterRecording =
							value;
						if (!value) {
							this.plugin.settings.createNewFileAfterRecordingPath =
								"";
						}
						await this.settingsManager.saveSettings(
							this.plugin.settings
						);
						this.createNewFileInput.setDisabled(!value);
					});
			});
	}

	private createNewFilePathSetting(): void {
		this.createNewFileInput = new Setting(this.containerEl)
			.setName("Transcriptions folder")
			.setDesc(
				"Specify the path in the vault where to save the transcription files"
			)
			.addText((text) => {
				text.setPlaceholder("Example: folder/note")
					.setValue(
						this.plugin.settings.createNewFileAfterRecordingPath
					)
					.onChange(async (value) => {
						this.plugin.settings.createNewFileAfterRecordingPath =
							value;
						await this.settingsManager.saveSettings(
							this.plugin.settings
						);
					});
			});
	}

	private createDebugModeToggleSetting(): void {
		new Setting(this.containerEl)
			.setName("Debug Mode")
			.setDesc(
				"Turn on to increase the plugin's verbosity for troubleshooting."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.debugMode)
					.onChange(async (value) => {
						this.plugin.settings.debugMode = value;
						await this.settingsManager.saveSettings(
							this.plugin.settings
						);
					});
			});
	}

	private createLocalServiceSettings(): void {
		// Encode setting
		new Setting(this.containerEl)
			.setName("Encode Audio")
			.setDesc("Enable audio encoding for local service")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.encode)
					.onChange(async (value) => {
						this.plugin.settings.encode = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);

		// VAD Filter setting
		new Setting(this.containerEl)
			.setName("VAD Filter")
			.setDesc("Enable Voice Activity Detection filter")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.vadFilter)
					.onChange(async (value) => {
						this.plugin.settings.vadFilter = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);

		// Translate setting
		new Setting(this.containerEl)
			.setName("Translate")
			.setDesc("Translate audio to English instead of transcribing")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.translate)
					.onChange(async (value) => {
						this.plugin.settings.translate = value;
						await this.settingsManager.saveSettings(this.plugin.settings);
					})
			);
	}

	private updateSettingVisibility(): void {
		const isLocalService = this.plugin.settings.useLocalService;
		
		// Show/hide OpenAI API settings
		this.apiKeyInput.settingEl.style.display = isLocalService ? 'none' : '';
		this.apiUrlInput.settingEl.style.display = isLocalService ? 'none' : '';
		
		// Show/hide Local Service settings
		this.localServiceUrlInput.settingEl.style.display = isLocalService ? '' : 'none';
		
		// Local service specific settings are handled by createLocalServiceSettings
		const localServiceSettings = this.containerEl.querySelectorAll('.setting-item');
		localServiceSettings.forEach((setting, index) => {
			// Hide encode, vadFilter, translate settings if not using local service
			if (index >= localServiceSettings.length - 3) {
				(setting as HTMLElement).style.display = isLocalService ? '' : 'none';
			}
		});
	}
}

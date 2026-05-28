import * as vscode from 'vscode';
import { BaklibI18nHoverProvider } from './hoverProvider';
import { clearLocaleIndexCache } from './localeIndex';
import { registerOpenLocaleKeyCommand } from './openLocaleKey';
import { clearSettingsSchemaCache } from './settingsSchema';

export function activate(context: vscode.ExtensionContext): void {
  registerOpenLocaleKeyCommand(context);

  const provider = new BaklibI18nHoverProvider();

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [{ language: 'liquid' }, { language: 'json' }],
      provider
    )
  );

  const invalidate = () => {
    clearLocaleIndexCache();
    clearSettingsSchemaCache();
  };

  const localeWatcher = vscode.workspace.createFileSystemWatcher(
    '**/locales/**/*.json'
  );
  localeWatcher.onDidChange(invalidate);
  localeWatcher.onDidCreate(invalidate);
  localeWatcher.onDidDelete(invalidate);
  context.subscriptions.push(localeWatcher);

  const schemaWatcher = vscode.workspace.createFileSystemWatcher(
    '**/config/settings_schema.json'
  );
  schemaWatcher.onDidChange(invalidate);
  schemaWatcher.onDidCreate(invalidate);
  schemaWatcher.onDidDelete(invalidate);
  context.subscriptions.push(schemaWatcher);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('baklibThemeI18nHover')) {
        invalidate();
      }
    })
  );
}

export function deactivate(): void {
  clearLocaleIndexCache();
  clearSettingsSchemaCache();
}

import * as vscode from 'vscode';
import { BaklibI18nHoverProvider } from './hoverProvider';
import { clearLocaleIndexCache } from './localeIndex';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new BaklibI18nHoverProvider();

  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [{ language: 'liquid' }, { language: 'json' }],
      provider
    )
  );

  const watcher = vscode.workspace.createFileSystemWatcher(
    '**/locales/**/*.json'
  );
  const invalidate = () => clearLocaleIndexCache();
  watcher.onDidChange(invalidate);
  watcher.onDidCreate(invalidate);
  watcher.onDidDelete(invalidate);
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('baklibThemeI18nHover')) {
        clearLocaleIndexCache();
      }
    })
  );
}

export function deactivate(): void {
  clearLocaleIndexCache();
}

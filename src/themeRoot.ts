import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function findThemeRoot(startFile: string, configRoot?: string): string | undefined {
  if (configRoot?.trim()) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    const abs = path.isAbsolute(configRoot)
      ? configRoot
      : path.join(workspaceRoot, configRoot);
    if (fs.existsSync(path.join(abs, 'locales'))) {
      return abs;
    }
  }

  let dir = path.dirname(startFile);
  while (dir !== path.dirname(dir)) {
    const locales = path.join(dir, 'locales');
    if (
      fs.existsSync(locales) &&
      fs.readdirSync(locales).some((file) => file.endsWith('.json'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return undefined;
}

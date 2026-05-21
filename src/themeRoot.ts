import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { hasSettingsSchema } from './settingsSchema';

export function findThemeRoot(startFile: string, configRoot?: string): string | undefined {
  if (configRoot?.trim()) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    const abs = path.isAbsolute(configRoot)
      ? configRoot
      : path.join(workspaceRoot, configRoot);
    if (hasSettingsSchema(abs)) {
      return abs;
    }
  }

  let dir = path.dirname(startFile);
  while (dir !== path.dirname(dir)) {
    if (hasSettingsSchema(dir)) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return undefined;
}

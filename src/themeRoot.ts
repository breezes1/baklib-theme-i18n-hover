import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { hasSettingsSchema } from './settingsSchema';

/** 将配置或命令参数中的 themeRoot 解析为绝对路径（支持多根工作区） */
export function resolveAbsoluteThemeRoot(themeRoot: string): string {
  const trimmed = themeRoot.trim();
  if (path.isAbsolute(trimmed)) {
    return path.resolve(trimmed);
  }

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const candidate = path.resolve(folder.uri.fsPath, trimmed);
    if (hasSettingsSchema(candidate)) {
      return candidate;
    }
  }

  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  return path.resolve(workspaceRoot, trimmed);
}

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

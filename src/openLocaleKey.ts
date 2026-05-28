import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { findJsonKeyRangeInText } from './jsonKeyLocation';
import {
  localeFileUri,
  normalizeOpenLocaleKeyArgs,
  OPEN_LOCALE_KEY_COMMAND,
  OpenLocaleKeyArgs,
} from './localePaths';

function textRangeToVscodeRange(
  doc: vscode.TextDocument,
  range: {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
  }
): vscode.Range {
  return new vscode.Range(
    range.startLine,
    range.startCharacter,
    range.endLine,
    range.endCharacter
  );
}

async function findRangeViaDocumentSymbols(
  document: vscode.TextDocument,
  jsonPath: string
): Promise<vscode.Range | undefined> {
  const segments = jsonPath.split('.').filter(Boolean);
  if (!segments.length) {
    return undefined;
  }

  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri
  );
  if (!symbols?.length) {
    return undefined;
  }

  let bucket = symbols;
  let found: vscode.DocumentSymbol | undefined;

  for (const segment of segments) {
    const sym = bucket.find((item) => item.name === segment);
    if (!sym) {
      break;
    }
    found = sym;
    bucket = sym.children ?? [];
  }

  if (!found) {
    return undefined;
  }

  return found.selectionRange ?? found.range;
}

function findRangeInDocument(
  document: vscode.TextDocument,
  jsonPath: string
): vscode.Range | undefined {
  const textRange = findJsonKeyRangeInText(document.getText(), jsonPath);
  if (!textRange) {
    return undefined;
  }
  return textRangeToVscodeRange(document, textRange);
}

function findOpenDocument(fsPath: string): vscode.TextDocument | undefined {
  const normalized = path.resolve(fsPath);
  return vscode.workspace.textDocuments.find(
    (doc) => path.resolve(doc.uri.fsPath) === normalized
  );
}

function waitForOpenDocument(fsPath: string, timeoutMs: number): Promise<void> {
  const normalized = path.resolve(fsPath);
  if (findOpenDocument(normalized)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      disposable.dispose();
      resolve();
    }, timeoutMs);

    const disposable = vscode.workspace.onDidOpenTextDocument((doc) => {
      if (path.resolve(doc.uri.fsPath) === normalized) {
        clearTimeout(timer);
        disposable.dispose();
        resolve();
      }
    });
  });
}

/**
 * 悬停索引用 fs 读盘，不受工作区限制；打开编辑器走 VS Code API，工作区外可能失败，故做多级回退。
 */
async function openLocaleDocument(uri: vscode.Uri): Promise<vscode.TextDocument | undefined> {
  const fsPath = path.resolve(uri.fsPath);

  if (!fs.existsSync(fsPath)) {
    return undefined;
  }

  const fileUri = vscode.Uri.file(fsPath);
  const existing = findOpenDocument(fsPath);
  if (existing) {
    return existing;
  }

  try {
    return await vscode.workspace.openTextDocument(fileUri);
  } catch {
    // 常见于 locale 在当前工作区文件夹之外（扩展用 fs 仍能读到）
  }

  try {
    await vscode.commands.executeCommand('vscode.open', fileUri);
    await waitForOpenDocument(fsPath, 2500);
    const opened = findOpenDocument(fsPath);
    if (opened) {
      return opened;
    }
  } catch {
    // continue
  }

  try {
    const content = fs.readFileSync(fsPath, 'utf8');
    return await vscode.workspace.openTextDocument({
      language: 'json',
      content,
    });
  } catch {
    return undefined;
  }
}

export async function openLocaleKeyAtPath(args: OpenLocaleKeyArgs): Promise<void> {
  const uri = localeFileUri(
    args.themeRoot,
    args.localesPath,
    args.lang,
    args.bucket
  );

  const document = await openLocaleDocument(uri);
  if (!document) {
    void vscode.window.showWarningMessage(
      fs.existsSync(uri.fsPath)
        ? `无法打开语言文件：${uri.fsPath}`
        : `未找到语言文件：${uri.fsPath}`
    );
    return;
  }

  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    preserveFocus: false,
  });

  const range =
    (await findRangeViaDocumentSymbols(document, args.jsonPath)) ??
    findRangeInDocument(document, args.jsonPath);

  if (!range) {
    return;
  }

  const position = range.start;
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

export function registerOpenLocaleKeyCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      OPEN_LOCALE_KEY_COMMAND,
      async (raw: unknown) => {
        const args = normalizeOpenLocaleKeyArgs(raw);
        if (!args) {
          return;
        }
        await openLocaleKeyAtPath(args);
      }
    )
  );
}

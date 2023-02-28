import * as vscode from 'vscode';
import path = require('path');
import { RemoteFileExplorer } from './remotefileexplorer';
import { SettingViewProvider } from './settings';
import { SftpModel, SftpNode } from './sftpModel';

let putStatusBarItem: vscode.StatusBarItem;
let getStatusBarItem: vscode.StatusBarItem;

let model: SftpModel;

export function activate(context: vscode.ExtensionContext) {
  console.log('GetNPut is now active!');

  model = new SftpModel(context);

  const remoteFileExplorer = new RemoteFileExplorer(context, model);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingViewProvider.viewType,
      new SettingViewProvider(context)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('getnput.cwd', async () => {
      const sftp = await model.connect();

      try {
        const cwd = await sftp.cwd();
        vscode.window.showInformationMessage(
          `Current working directory: ${cwd}`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
        console.log(err);
      } finally {
        await sftp.end();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'getnput.put',
      async (resource: vscode.Uri) => {
        console.log(resource);

        if (vscode.window.activeTextEditor === undefined) {
          vscode.window.showErrorMessage('GetNPut: No file open');
          return;
        }

        const ans = await vscode.window.showInformationMessage(
          `Do you want to write remote file? Will overwrite existing files.`,
          'Yes',
          'No'
        );

        if (ans !== 'Yes') {
          return;
        }

        const relative = path.relative(
          vscode.workspace.workspaceFolders![0].uri.path,
          resource
            ? resource.fsPath
            : vscode.window.activeTextEditor?.document.uri.path
        );

        const remoteDir = path.join(
          context.workspaceState.get('getnput.remoteDir') as string,
          relative
        );

        console.log(
          'Putting:',
          vscode.window.activeTextEditor?.document.uri.path,
          'at',
          remoteDir
        );

        vscode.window.showInformationMessage(
          `Putting: ${relative} at ${remoteDir}`
        );

        try {
          await model.put(
            resource
              ? resource.fsPath
              : vscode.window.activeTextEditor?.document.uri.path
          );
          vscode.window.showInformationMessage(`Put ${relative}`);

          remoteFileExplorer.refresh();
        } catch (err: any) {
          console.log(err);
          vscode.window.showErrorMessage(`Error: ${err.message}`);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('getnput.get', async (node?) => {
      let filePath;

      if (typeof node === 'undefined') {
        filePath = path.relative(
          vscode.workspace.workspaceFolders![0].uri.path,
          vscode.window.activeTextEditor?.document.uri.path ?? ''
        );
      } else if ('resource' in node) {
        filePath = node.resource.path;
      } else if ('path' in node) {
        filePath = path.relative(
          vscode.workspace.workspaceFolders![0].uri.path,
          node.path
        );
      }

      console.log(filePath);

      const ans = await vscode.window.showInformationMessage(
        `Do you want to write local file? Will overwrite existing files.`,
        'Yes',
        'No'
      );

      if (ans !== 'Yes') {
        return;
      }

      vscode.window.showInformationMessage(`Getting: ${filePath}`);

      try {
        await model.get(
          filePath ?? vscode.window.activeTextEditor?.document.uri.path ?? ''
        );

        vscode.window.showInformationMessage(`Got ${filePath}`);
      } catch (err: any) {
        console.log(err);
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    })
  );

  putStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  getStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  getStatusBarItem.command = 'getnput.get';
  context.subscriptions.push(getStatusBarItem);
  getStatusBarItem.text = '$(arrow-down)';
  getStatusBarItem.tooltip = 'GetNPut: Get File';
  getStatusBarItem.show();

  putStatusBarItem.command = 'getnput.put';
  context.subscriptions.push(putStatusBarItem);
  putStatusBarItem.text = '$(arrow-up) GnP';
  putStatusBarItem.tooltip = 'GetNPut: Put File';
  putStatusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {}

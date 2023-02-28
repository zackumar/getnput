// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');
import { RemoteFileExplorer } from './remotefileexplorer';
import { SettingViewProvider } from './settings';
import { SftpModel, SftpModelProps } from './sftpModel';
import { readFileSync } from 'fs';
import { off } from 'process';

let putStatusBarItem: vscode.StatusBarItem;
let getStatusBarItem: vscode.StatusBarItem;

const sftp = new Client('getnput');

let model: SftpModel;

export function getSftpConfig(
  context: vscode.ExtensionContext
): SftpModelProps {
  const privateKeyValue = context.workspaceState.get('getnput.privateKey');
  const privateKey = privateKeyValue
    ? readFileSync(privateKeyValue as string)
    : undefined;

  const config = {
    host: context.workspaceState.get('getnput.host') as string,
    port: context.workspaceState.get('getnput.port') as number,
    username: context.workspaceState.get('getnput.username') as string,
    password: context.workspaceState.get('getnput.password') as string,
    privateKey,
    passphrase: context.workspaceState.get('getnput.passphrase') as string,
    remoteDir: context.workspaceState.get('getnput.remoteDir') as string,
  };

  return config;
}

export function activate(context: vscode.ExtensionContext) {
  model = new SftpModel(context);

  const remoteFileExplorer = new RemoteFileExplorer(
    context,
    getSftpConfig(context)
  );

  const provider = new SettingViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingViewProvider.viewType,
      provider
    )
  );

  console.log('GetNPut is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand('getnput.cwd', async () => {
      await sftp.connect(getSftpConfig(context));

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
    vscode.commands.registerCommand('getnput.put', async () => {
      if (vscode.window.activeTextEditor === undefined) {
        vscode.window.showErrorMessage('GetNPut: No file open');
        return;
      }

      await sftp.connect(getSftpConfig(context));

      const relative = path.relative(
        vscode.workspace.workspaceFolders![0].uri.path,
        vscode.window.activeTextEditor?.document.uri.path ?? ''
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
        if (!(await sftp.exists(remoteDir))) {
          await sftp.mkdir(path.dirname(remoteDir), true);
        }

        const msg = await sftp.fastPut(
          vscode.window.activeTextEditor?.document.uri.path,
          remoteDir
        );
        vscode.window.showInformationMessage(`Uploaded ${relative}`);
        console.log(msg);

        remoteFileExplorer.refresh();
      } catch (err: any) {
        console.log(err);
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      } finally {
        await sftp.end();
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

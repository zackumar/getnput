// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');
import * as test from './test';
import { RemoteFileExplorer } from './remotefileexplorer';
import { SettingViewProvider } from './settings';
import { getHosts, SftpModel } from './sftpModel';

let putStatusBarItem: vscode.StatusBarItem;
let getStatusBarItem: vscode.StatusBarItem;

const sftp = new Client('getnput');

let model: SftpModel;

export function activate(context: vscode.ExtensionContext) {
  context.workspaceState.update('getnput.host', test.host);
  const host = context.workspaceState.get('getnput.host') as string;

  model = new SftpModel({
    host: host,
    username: test.username,
    privateKey: test.privateKey,
    remoteDir: test.workingDir,
  });

  const remoteFileExplorer = new RemoteFileExplorer(context, {
    host: host,
    username: test.username,
    privateKey: test.privateKey,
    remoteDir: test.workingDir,
  });

  const provider = new SettingViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingViewProvider.viewType,
      provider
    )
  );

  console.log('GetNPut is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand('getnput.cwd', async () => {
      await sftp.connect({
        host: test.host,
        username: test.username,
        password: test.password,
        privateKey: test.privateKey,
      });

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

      await sftp.connect({
        host: test.host,
        username: test.username,
        password: test.password,
        privateKey: test.privateKey,
      });

      const relative = path.relative(
        vscode.workspace.workspaceFolders![0].uri.path,
        vscode.window.activeTextEditor?.document.uri.path ?? ''
      );

      const remoteDir = path.join(test.workingDir, relative);

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

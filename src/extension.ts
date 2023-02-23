// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import {sftp}  from 'ssh2-sftp-client';
import Client = require('ssh2-sftp-client');
import { createReadStream, readdirSync, readFileSync } from 'fs';
import path = require('path');
import { host, password, privateKey, username } from './test';

let putStatusBarItem: vscode.StatusBarItem;
let getStatusBarItem: vscode.StatusBarItem;

const sftp = new Client('getnput');

export function activate(context: vscode.ExtensionContext) {
  console.log('GetNPut is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand('getnput.cwd', async () => {
      await sftp.connect({
        host: host,
        username: username,
        password: password,
        privateKey: privateKey,
      });

      try {
        const cwd = await sftp.cwd();
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
        host: host,
        username: username,
        password: password,
        privateKey: privateKey,
      });

      const sCwd = await sftp.cwd();

      const relative = path.relative(
        vscode.workspace.workspaceFolders![0].uri.path,
        vscode.window.activeTextEditor?.document.uri.path ?? ''
      );

      console.log(
        'Putting:',
        vscode.window.activeTextEditor?.document.uri.path,
        'at',
        path.join(sCwd, relative)
      );

      vscode.window.showInformationMessage(
        `Putting: ${relative} at ${path.join(sCwd, relative)}`
      );

      let data = readFileSync(
        vscode.window.activeTextEditor?.document.uri.path
      );

      try {
        const exists = await !sftp.exists(path.join(sCwd, relative));
        console.log(exists);
        if (!exists) {
          console.log('test');
          await sftp.mkdir(path.dirname(path.join(sCwd, relative)), true);
        }

        const msg = await sftp.put(data, path.join(sCwd, relative));
        vscode.window.showInformationMessage(`Uploaded ${relative}`);
        console.log(msg);
      } catch (err: any) {
        console.log(err);
        console.log('test');
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

import { readFileSync } from 'fs';
import path = require('path');
import os = require('os');
import * as vscode from 'vscode';
const sshConfig = require('ssh-config');

export class SettingViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'sftpSettings';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>GetNPut Settings</title>
			</head>
			<body>
				<form>
          <label for="host">Host:</label>
          <input id="host" type="text" name="host" placeholder="Host" />
          <label for="port">Port:</label>
          <input id="port" type="text" name="port" placeholder="Port" />
          <label for="user">User:</label>
          <input id="user" type="text" name="user" placeholder="User" />
          <label for="password">Password:</label>
          <input id="password" type="text" name="password" placeholder="Password" />
          <label for="privateKey">Private Key:</label>
          <input id="privateKey" type="text" name="privateKey" placeholder="Private Key" />
          <label for="remoteDir">Remote Dir:</label>
          <input id="remoteDir" type="text" name="remoteDir" placeholder="Remote Dir" />
          <input type="submit" value="Submit" />
        </form>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

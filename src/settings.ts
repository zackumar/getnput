import * as vscode from 'vscode';
import { getSftpConfig } from './extension';

type ConnectionProps =
  | {
      type: 'connect';
      host: string;
      port: string;
      username: string;
      password?: string;
      privateKey?: string;
      passphrase?: string;
      remoteDir: string;
      authType: 'password' | 'privateKey';
    }
  | { type: 'filePicker' }
  | { type: 'disconnect' };

export class SettingViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'sftpSettings';

  private _view?: vscode.WebviewView;

  constructor(private context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message: ConnectionProps) => {
        switch (message.type) {
          case 'connect':
            this.context.workspaceState.update('getnput.host', message.host);
            this.context.workspaceState.update('getnput.port', message.port);
            this.context.workspaceState.update(
              'getnput.username',
              message.username
            );
            this.context.workspaceState.update(
              'getnput.password',
              message.password
            );
            this.context.workspaceState.update(
              'getnput.privateKey',
              message.privateKey
            );
            this.context.workspaceState.update(
              'getnput.passphrase',
              message.passphrase
            );
            this.context.workspaceState.update(
              'getnput.remoteDir',
              message.remoteDir
            );
            this.context.workspaceState.update(
              'getnput.authType',
              message.authType
            );

            webviewView.webview.html = this._getHtmlForWebview(
              webviewView.webview
            );

            vscode.commands.executeCommand('getnput.refresh');

            break;
          case 'filePicker':
            const file = await vscode.window.showOpenDialog();
            if (file) {
              webviewView.webview.postMessage({
                type: 'filePicker',
                path: file[0].fsPath,
              });
            }
            break;
          case 'disconnect':
            console.log('disconnecting...');

            this.context.workspaceState.update('getnput.host', undefined);
            this.context.workspaceState.update('getnput.port', undefined);
            this.context.workspaceState.update('getnput.username', undefined);
            this.context.workspaceState.update('getnput.password', undefined);
            this.context.workspaceState.update('getnput.privateKey', undefined);
            this.context.workspaceState.update('getnput.passphrase', undefined);
            this.context.workspaceState.update('getnput.remoteDir', undefined);
            this.context.workspaceState.update('getnput.authType', undefined);

            webviewView.webview.html = this._getHtmlForWebview(
              webviewView.webview
            );
            break;
        }
      }
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css')
    );

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        '@vscode/codicons',
        'dist',
        'codicon.css'
      )
    );

    const scriptConnectUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'connect.js')
    );

    const scriptDisconnectUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'disconnect.js')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${
          webview.cspSource
        }; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

        <link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${codiconsUri}" rel="stylesheet">
        

				<title>GetNPut Settings</title>
			</head>
			<body>

				${
          !this.context.workspaceState.get('getnput.host')
            ? `<form id="connectForm">
          <label for="host">Host:</label>
          <input id="host" type="text" name="host" placeholder="Host" required/>
          
          <label for="port">Port:</label>
          <input id="port" type="text" name="port" placeholder="Port" value="22" />

          <div class="py-5">
          <p>Authentication Method:</p>
          <div class="row">
            <input type="radio" id="password" name="authType" value="password" checked>
            <label for="password">Password</label><br>
          </div>
          <div class="row">
            <input type="radio" id="privateKey" name="authType" value="privateKey">
            <label for="privateKey">Private Key</label><br>
          </div>
          </div>

          <div class="auth">
            <label for="user">Username:</label>
            <input id="user" type="text" name="user" placeholder="Username" required/>
    
            <div id="passwordSection" disabled>
              <label for="password" class="authPadding">Password:</label>
              <input id="password" type="password" name="password" placeholder="Password" required/>
            </div>

            <div id="privateKeySection" hidden>
              <label for="privateKey" class="authPadding">Private Key:</label>
              <div class="row">
                <input id="privateKey" type="text" name="privateKey" placeholder="Private Key" required disabled/>
                <button id="filePicker" type="button" class="icon" style="width: 25%;height: 28px;"><i class="codicon codicon-folder" alt="open file"></i></button>
              </div>
              <label for="passphrase" class="authPadding">Passphrase:</label>
              <input id="passphrase" type="password" name="passphrase" placeholder="Passphrase" disabled/>
            </div>
          </div>

          <label for="remoteDir">Remote working directory:</label>
          <input id="remoteDir" type="text" name="remoteDir" placeholder="Remote directory" required/>

          <button id="submit" type="submit">Submit</button>
          </div>
        </form>

        <script defer nonce="${nonce}" src="${scriptConnectUri}"></script>`
            : `
        <h1>Connected!</h1>
        <p>Host: ${this.context.workspaceState.get('getnput.host')}</p>
        <button id="disconnect">Disconnect</button>

        <script defer nonce="${nonce}" src="${scriptDisconnectUri}"></script>
        `
        }
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

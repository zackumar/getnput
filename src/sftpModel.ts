import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  unlinkSync,
} from 'fs';
import { isEmptyDir } from './utils';

export interface SftpNode {
  resource: vscode.Uri;
  isDirectory: boolean;
}

export interface SftpModelProps extends Client.ConnectOptions {
  remoteDir: string;
}

const TEMP_DIR = '.getnput';

export class SftpModel {
  private props: SftpModelProps;

  private remoteDir: string;

  private remoteFiles: vscode.Uri[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.props = getSftpConfig(context);
    this.remoteDir = this.props.remoteDir ?? '/';

    //Handle remote file changes
    vscode.workspace.onDidCloseTextDocument(async (document) => {
      this.remoteFiles.forEach(async (uri) => {
        if (document.uri.path === uri.path) {
          try {
            console.log('Closing file:', uri.path);
            unlinkSync(uri.path);
            if (await isEmptyDir(path.dirname(uri.path))) {
              rmdirSync(path.dirname(uri.path));
            }

            this.remoteFiles = this.remoteFiles.filter((item) => {
              return item.path !== uri.path;
            });
          } catch (e) {
            console.error(e);
          }
        }
      });
    });

    vscode.workspace.onDidSaveTextDocument((document) => {
      this.remoteFiles.forEach(async (uri) => {
        if (document.uri.path === uri.path) {
          this.put(uri.path, true);
        }
      });
    });
  }

  public async connect() {
    const sftp = new Client('getnput');
    const config = getSftpConfig(this.context);
    this.remoteDir = config.remoteDir ?? '/';
    await sftp.connect(config);
    return sftp;
  }

  public async roots() {
    const sftp = await this.connect();
    const list = await sftp.list(this.remoteDir);
    sftp.end();
    return list.map((item) => {
      return {
        resource: vscode.Uri.parse(item.name),
        isDirectory: item.type === 'd',
      } as SftpNode;
    });
  }

  public async getChildren(node: SftpNode) {
    const sftp = await this.connect();
    const list = await sftp.list(
      path.join(this.remoteDir, node.resource.fsPath)
    );
    sftp.end();
    return list.map((item) => {
      return {
        resource: vscode.Uri.parse(`${node.resource.fsPath}/${item.name}`),
        isDirectory: item.type === 'd',
      } as SftpNode;
    });
  }

  public async put(filePath: string, isTemp = false) {
    const sftp = await this.connect();
    if (!sftp) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Putting file...',
      },
      async () => {
        const relative = !isTemp
          ? path.relative(
              vscode.workspace.workspaceFolders![0].uri.path,
              filePath
            )
          : path.relative(
              path.join(
                vscode.workspace.workspaceFolders![0].uri.path,
                TEMP_DIR
              ),
              filePath
            );

        const remotePath = path.join(this.remoteDir, relative);

        if (lstatSync(filePath).isDirectory()) {
          await sftp.uploadDir(filePath, remotePath);
        } else {
          if (!(await sftp.exists(path.dirname(remotePath)))) {
            await sftp.mkdir(path.dirname(remotePath), true);
          }

          await sftp.put(filePath, remotePath);
        }

        return await sftp.end();
      }
    );
  }

  public async get(filePath: string, dest?: string) {
    const sftp = await this.connect();
    if (!sftp) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Getting file...',
      },
      async () => {
        const remotePath = path.join(this.remoteDir, filePath);
        const localPath = path.join(
          vscode.workspace.workspaceFolders![0].uri.path,
          filePath
        );

        if ((await sftp.stat(remotePath)).isDirectory) {
          await sftp.downloadDir(remotePath, localPath);
        } else {
          if (!existsSync(path.dirname(dest ?? localPath))) {
            mkdirSync(path.dirname(dest ?? localPath), { recursive: true });
          }
          await sftp.get(remotePath, dest ?? localPath);
        }

        return await sftp.end();
      }
    );
  }

  public async delete(node: SftpNode) {
    const sftp = await this.connect();
    if (!sftp) {
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Getting file...',
      },
      async () => {
        const remotePath = path.join(this.remoteDir, node.resource.path);
        if (node.isDirectory) {
          await sftp.rmdir(remotePath, true);
        } else {
          await sftp.delete(remotePath);
        }

        return await sftp.end();
      }
    );
  }

  public async openRemoteFile(filePath: string) {
    const newFilePath = path.join(
      vscode.workspace.workspaceFolders![0].uri.path,
      TEMP_DIR,
      filePath
    );
    const uri = vscode.Uri.file(newFilePath);

    await this.get(filePath, newFilePath);
    await vscode.window.showTextDocument(uri, { preview: false });

    this.remoteFiles.push(uri);
  }

  public async cleanTempDir() {
    const tempDir = path.join(
      vscode.workspace.workspaceFolders![0].uri.path,
      TEMP_DIR
    );

    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  }

  public hasHost() {
    return !!this.context.workspaceState.get('getnput.host');
  }
}

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

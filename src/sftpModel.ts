import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');
import { existsSync, lstatSync, mkdirSync, readFileSync } from 'fs';

export interface SftpNode {
  resource: vscode.Uri;
  isDirectory: boolean;
}

export interface SftpModelProps extends Client.ConnectOptions {
  remoteDir: string;
}

export class SftpModel {
  private props: SftpModelProps;

  private remoteDir: string;

  constructor(private context: vscode.ExtensionContext) {
    this.props = getSftpConfig(context);
    this.remoteDir = this.props.remoteDir ?? '/';
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

  public async put(filePath: string) {
    const sftp = await this.connect();

    const relative = path.relative(
      vscode.workspace.workspaceFolders![0].uri.path,
      filePath
    );

    const remotePath = path.join(this.remoteDir, relative);

    console.log(lstatSync(filePath).isDirectory(), filePath);

    if (lstatSync(filePath).isDirectory()) {
      await sftp.uploadDir(filePath, remotePath);
    } else {
      if (!(await sftp.exists(path.dirname(remotePath)))) {
        await sftp.mkdir(path.dirname(remotePath), true);
      }

      await sftp.put(filePath, remotePath);
    }

    await sftp.end();
  }

  public async get(filePath: string) {
    const sftp = await this.connect();

    const remotePath = path.join(this.remoteDir, filePath);
    const localPath = path.join(
      vscode.workspace.workspaceFolders![0].uri.path,
      filePath
    );

    console.log(filePath, remotePath);

    if ((await sftp.stat(remotePath)).isDirectory) {
      await sftp.downloadDir(remotePath, localPath);
    } else {
      if (!existsSync(path.dirname(localPath))) {
        mkdirSync(path.dirname(localPath), { recursive: true });
      }
      await sftp.get(remotePath, localPath);
    }

    await sftp.end();
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

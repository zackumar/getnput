import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');
import { readFileSync } from 'fs';
const sshConfig = require('ssh-config');
import os = require('os');
import { getSftpConfig } from './extension';

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

  constructor(context: vscode.ExtensionContext) {
    this.props = getSftpConfig(context);
    this.remoteDir = this.props.remoteDir ?? '/';
  }

  public async connect() {
    const sftp = new Client('getnput');
    await sftp.connect(this.props as Client.ConnectOptions);
    return sftp;
  }

  public async roots() {
    const client = await this.connect();
    const list = await client.list(this.remoteDir);
    return list.map((item) => {
      return {
        resource: vscode.Uri.parse(item.name),
        isDirectory: item.type === 'd',
      } as SftpNode;
    });
  }

  public async getChildren(node: SftpNode) {
    const client = await this.connect();
    const list = await client.list(
      path.join(this.remoteDir, node.resource.fsPath)
    );
    return list.map((item) => {
      return {
        resource: vscode.Uri.parse(`${node.resource.fsPath}/${item.name}`),
        isDirectory: item.type === 'd',
      } as SftpNode;
    });
  }
}

export function getHosts(config: string = '/.ssh/config') {
  return sshConfig
    .parse(
      readFileSync(path.join(os.homedir(), config), {
        encoding: 'utf-8',
      })
    )
    .map((item: any) => {
      return {
        host: item.value,
        username: item.config.find((i: any) => i.param === 'User')?.value,
        privateKey: item.config.find((i: any) => i.param === 'IdentityFile')
          ?.value,
        port: item.config.find((i: any) => i.param === 'Port')?.value,
      } as Client.ConnectOptions;
    });
}

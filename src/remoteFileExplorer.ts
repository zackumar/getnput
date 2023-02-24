import * as vscode from 'vscode';
import Client = require('ssh2-sftp-client');
import path = require('path');

export interface SftpNode {
  resource: vscode.Uri;
  isDirectory: boolean;
}

export type SftpModelProps =
  | {
      host: string;
      user: string;
      port?: number;
      password: string;
      remoteDir?: string;
    }
  | {
      host: string;
      user: string;
      port?: number;
      privateKey: Buffer;
      remoteDir?: string;
    };

export class SftpModel {
  private host: string;
  private user: string;
  private port: number;
  private password?: string;
  private privateKey?: Buffer;

  private remoteDir: string;

  constructor(props: SftpModelProps) {
    this.host = props.host;
    this.user = props.user;
    this.port = props.port ?? 22;

    this.remoteDir = props.remoteDir ?? '/';

    if ('password' in props) {
      this.password = props.password;
    } else {
      this.privateKey = props.privateKey;
    }
  }

  public async connect() {
    const sftp = new Client('getnput');
    await sftp.connect({
      host: this.host,
      username: this.user,
      password: this.password,
      privateKey: this.privateKey,
      port: this.port,
    });
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
    console.log(node);

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

export class RemoteFileSystemProvider
  implements vscode.TreeDataProvider<SftpNode>
{
  private model: SftpModel;
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  constructor(props: SftpModelProps) {
    this.model = new SftpModel(props);
  }

  public refresh(): any {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SftpNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return {
      resourceUri: element.resource,
      collapsibleState: element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : void 0,
    };
  }
  getChildren(
    element?: SftpNode | undefined
  ): SftpNode[] | Promise<SftpNode[]> {
    return element ? this.model.getChildren(element) : this.model.roots();
  }
  getParent?(element: SftpNode): vscode.ProviderResult<SftpNode> {
    const parent = element.resource.with({
      path: path.dirname(element.resource.path),
    });
    return parent.path !== '//'
      ? { resource: parent, isDirectory: true }
      : undefined;
  }
}

export class RemoteFileExplorer {
  treeDataProvider: RemoteFileSystemProvider;

  constructor(context: vscode.ExtensionContext, props: SftpModelProps) {
    this.treeDataProvider = new RemoteFileSystemProvider(props);
    context.subscriptions.push(
      vscode.window.createTreeView('sftpExplorer', {
        treeDataProvider: this.treeDataProvider,
      })
    );

    vscode.commands.registerCommand('getnput.refresh', () =>
      this.treeDataProvider.refresh()
    );
  }

  public refresh() {
    this.treeDataProvider.refresh();
  }
}

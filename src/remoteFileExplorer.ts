import path = require('path');
import * as vscode from 'vscode';
import { SftpModel, SftpNode } from './sftpModel';

export class RemoteFileSystemProvider
  implements vscode.TreeDataProvider<SftpNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  constructor(private model: SftpModel) {}

  public refresh(): any {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SftpNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return {
      contextValue: 'sftpNode',
      resourceUri: element.resource,
      collapsibleState: element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : void 0,
      command: element.isDirectory
        ? void 0
        : {
            title: 'Open Remote File',
            command: 'getnput.openRemoteFile',
            arguments: [element.resource],
          },
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

  constructor(context: vscode.ExtensionContext, model: SftpModel) {
    this.treeDataProvider = new RemoteFileSystemProvider(model);
    context.subscriptions.push(
      vscode.window.createTreeView('sftpExplorer', {
        treeDataProvider: this.treeDataProvider,
      })
    );

    vscode.commands.registerCommand('getnput.refresh', () =>
      this.treeDataProvider.refresh()
    );

    vscode.commands.registerCommand(
      'getnput.openRemoteFile',
      async (resource) => {
        await model.openRemoteFile(resource.path);
      }
    );
  }

  public refresh() {
    this.treeDataProvider.refresh();
  }
}

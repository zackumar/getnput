import path = require('path');
import * as vscode from 'vscode';
import { SftpModel, SftpModelProps, SftpNode } from './sftpModel';

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

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
    const view = vscode.window.createTreeView('sftpExplorer', {
      treeDataProvider: this.treeDataProvider,
    });
    context.subscriptions.push(view);

    vscode.commands.registerCommand('getnput.refresh', () =>
      this.treeDataProvider.refresh()
    );

    vscode.commands.registerCommand(
      'getnput.openRemoteFile',
      async (resource) => {
        await model.openRemoteFile(resource.path);
      }
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'getnput.delete',
        async (node: SftpNode) => {
          const ans = await vscode.window.showInformationMessage(
            `Do you want to delete remote ${
              !node.isDirectory ? 'file' : 'directory'
            }? This cannot be undone.`,
            'Yes',
            'No'
          );

          if (ans !== 'Yes') {
            return;
          }

          try {
            await model.delete(node);
            vscode.window.showInformationMessage(
              `Deleted ${node.resource.path}`
            );
            this.refresh();
          } catch (err: any) {
            console.log(err);
            vscode.window.showErrorMessage(`Error: ${err.message}`);
          }
        }
      )
    );
  }

  public refresh() {
    this.treeDataProvider.refresh();
  }
}

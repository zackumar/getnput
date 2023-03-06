(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById('disconnect').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'disconnect',
    });
  });

  document.getElementById('edit').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'edit',
    });
  });
})();

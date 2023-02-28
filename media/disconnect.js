(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById('disconnect').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'disconnect',
    });
  });
})();

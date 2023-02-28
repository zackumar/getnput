(function () {
  const vscode = acquireVsCodeApi();

  const passwordSection = document.getElementById('passwordSection');
  const privateKeySection = document.getElementById('privateKeySection');

  const form = document.querySelector('form');
  const psPass = document.querySelector('#passwordSection>#password');
  const pkKey = document.querySelector('#privateKeySection>.row>#privateKey');
  const pkPass = document.querySelector('#privateKeySection>#passphrase');

  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'filePicker':
        pkKey.value = message.path;
        break;
    }
  });

  document.querySelector('#connectForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    vscode.postMessage({
      type: 'connect',
      host: formData.get('host'),
      port: formData.get('port'),
      username: formData.get('user'),
      password: formData.get('password') ?? undefined,
      privateKey: formData.get('privateKey') ?? undefined,
      passphrase: formData.get('passphrase') ?? undefined,
      remoteDir: formData.get('remoteDir'),
      authType: formData.get('authType'),
    });
  });

  document.querySelector('#filePicker').addEventListener('click', (e) => {
    vscode.postMessage({
      type: 'filePicker',
    });
  });

  document.querySelectorAll('input[name="authType"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      showAuthType(e.target.value);
    });
  });

  function showAuthType(type) {
    if (type === 'password') {
      passwordSection.style.display = 'block';
      psPass.removeAttribute('disabled');

      privateKeySection.style.display = 'none';
      pkKey.setAttribute('disabled', 'disabled');
      pkPass.setAttribute('disabled', 'disabled');
    } else {
      passwordSection.style.display = 'none';
      psPass.setAttribute('disabled', 'disabled');

      privateKeySection.style.display = 'block';
      pkKey.removeAttribute('disabled');
      pkPass.removeAttribute('disabled');
    }
  }
})();

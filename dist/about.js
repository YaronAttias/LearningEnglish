(() => {
  const dialog = document.getElementById('about-dialog');
  const opener = document.getElementById('about-open');
  opener.addEventListener('click', () => {
    dialog.showModal();
    document.body.classList.add('about-is-open');
  });
  for (const id of ['about-close', 'about-done']) {
    document.getElementById(id).addEventListener('click', () => dialog.close());
  }
  dialog.addEventListener('close', () => {
    document.body.classList.remove('about-is-open');
    opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
})();
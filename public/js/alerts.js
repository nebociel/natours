/* eslint-disable */

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) {
    el.classList.add('alert--hidden');
    el.addEventListener('animationend', function handler() {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
      el.removeEventListener('animationend', handler); // Clean up the event listener
    });
  }
};

// type is 'success' or 'error'
export const showAlert = (type, msg, time = 7) => {
  hideAlert();

  // Adding a cancel button to the alert
  const markup = `
    <div class="alert alert--${type} alert--hidden">
      ${msg}
      <button class="alert__cancel-btn">×</button>
    </div>`;

  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  const alertEl = document.querySelector('.alert');
  // Force reflow/repaint before removing the 'alert--hidden' class
  void alertEl.offsetWidth;
  alertEl.classList.remove('alert--hidden');

  // Set a timeout to automatically hide the alert
  const timeout = window.setTimeout(hideAlert, time * 1000);

  // Add an event listener to the cancel button
  document.querySelector('.alert__cancel-btn').addEventListener('click', () => {
    hideAlert();
    clearTimeout(timeout); // Clear the timeout when the alert is manually closed
  });
};

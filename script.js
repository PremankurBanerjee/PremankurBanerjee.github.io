const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

if (tabButtons.length && tabPanels.length) {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
    });
  });
}

const subtabButtons = document.querySelectorAll('.subtab-btn');
const subtabPanels = document.querySelectorAll('.skills-subpanel');

if (subtabButtons.length && subtabPanels.length) {
  subtabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.subtab;

      subtabButtons.forEach(btn => btn.classList.remove('active'));
      subtabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`subtab-${target}`)?.classList.add('active');
    });
  });
}

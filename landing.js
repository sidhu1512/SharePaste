document.addEventListener('mousemove', (e) => {
  const spotlight = document.querySelector('.spotlight');
  if (spotlight) {
    const x = e.clientX;
    const y = e.clientY;

    spotlight.style.top = `${y - 300}px`;
    spotlight.style.left = `${x}px`;
  }
});

const HorisontalScroll = (element, direction, speed) => {
  (fill = (_) => {
    element.innerText += `   ${element.innerText}`;
    element.offsetWidth < window.innerWidth && fill();
  })();

  const elements = [element.cloneNode(true), element.cloneNode(true)];

  element.style.display = "none";

  for (let el of elements) {
    element.parentNode.appendChild(el);
  }

  elements[1].style.left = elements[0].offsetWidth + "px";

  const settings = {
    left: {
      speed: -speed,
      reset: (el) => {
        if (el.offsetLeft <= -el.offsetWidth)
          el.style.left = el.offsetWidth + "px";
      },
    },
    right: {
      speed: speed,
      reset: (el) => {
        if (el.offsetLeft >= el.offsetWidth)
          el.style.left = -el.offsetWidth + "px";
      },
    },
  };

  const chosen = settings[direction];

  const step = (_) => {
    for (let el of elements) {
      el.style.left = el.offsetLeft + chosen.speed + "px";
      chosen.reset(el);
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

HorisontalScroll(document.querySelector(".background-title-1"), "left", 3);

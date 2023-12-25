/* 個人部落格-跑馬燈 */

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

HorisontalScroll(document.querySelector(".Files-Title"), "left", 1);

/* 留言板-跑馬燈 */

const HorisontalScrolll = (element, direction, speed) => {
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

HorisontalScroll(document.querySelector(".Board-Comment"), "left", 1);

/* 廣告-跑馬燈 */

const HorisontalScrollll = (element, direction, speed) => {
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

HorisontalScroll(document.querySelector(".AD-Recommend"), "left", 1);

/* GSAP ICO TEST */

/*gsap.to(".gsap_test", {
  scrollTrigger: ".gsap_test",
  y: 500,
  rotateZ: 900,
  duration: 3,
});*/

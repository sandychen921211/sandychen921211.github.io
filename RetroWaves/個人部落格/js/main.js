/*global $ */
$(document).ready(function () {
  "use strict";

  $(".menu > ul > li:has( > .mega-menu), .menu > ul > li:has( > ul)").addClass(
    "menu-dropdown-icon"
  );
  //Checks if li has sub (ul) and adds class for toggle icon - just an UI

  $(
    ".menu > ul > li > .mega-menu:not(:has(ul)), .menu > ul > li > ul:not(:has(ul))"
  ).addClass("normal-sub");
  //Checks if drodown menu's li elements have anothere level (ul), if not the dropdown is shown as regular dropdown, not a mega menu (thanks Luka Kladaric)

  $(".menu > ul").before('<a href="#" class="menu-mobile">Navigation</a>');

  //Adds menu-mobile class (for mobile toggle menu) before the normal menu
  //Mobile menu is hidden if width is more then 992px, but normal menu is displayed
  //Normal menu is hidden if width is below 992px, and jquery adds mobile menu
  //Done this way so it can be used with wordpress without any trouble

  $(".menu > ul > li").hover(
    function (e) {
      if ($(window).outerWidth() > 992) {
        $(this).children(".mega-menu").fadeIn(150);
        $(this).children("ul").fadeIn(150);
        e.preventDefault();
      }
    },
    function (e) {
      if ($(window).outerWidth() > 992) {
        $(this).children(".mega-menu").fadeOut(150);
        $(this).children("ul").fadeOut(150);
        e.preventDefault();
      }
    }
  );
  //If width is more than 992px dropdowns are displayed on hover

  //the following hides the menu when a click is registered outside
  $(document).on("click", function (e) {
    if ($(e.target).parents(".menu").length === 0)
      $(".menu > ul").removeClass("show-on-mobile");
  });

  $(".menu > ul > li").click(function () {
    //no more overlapping menus
    //hides other children menus when a list item with children menus is clicked
    var thisMenu = $(this).children("ul");
    var thisMegaMenu = $(this).children(".mega-menu");

    // Don't need this function right now

    //         if(thisMenu) {
    //             var prevState = thisMenu.css('display');
    //             thisMenu.fadeOut();
    //             $('.menu-dropdown-icon.clicked').removeClass('clicked');
    //             if ($(window).outerWidth() < 992) {
    //                 if(prevState !== 'block') {
    //                     thisMenu.fadeIn(150);
    //                     $('.mega-menu').not(thisMenu).hide();
    //                     thisMenu.parent('.menu-dropdown-icon').addClass('clicked');
    //                 } else {
    //                     thisMenu.parent('.menu-dropdown-icon.clicked').removeClass('clicked');
    //                 }

    //             }
    //         }

    if (thisMegaMenu) {
      var prevState = thisMegaMenu.css("display");
      thisMegaMenu.fadeOut();
      $(".menu-dropdown-icon.clicked").removeClass("clicked");
      if ($(window).outerWidth() < 992) {
        if (prevState !== "block") {
          thisMegaMenu.fadeIn(150);
          $(".mega-menu").not(thisMegaMenu).hide();
          thisMegaMenu.parent(".menu-dropdown-icon").addClass("clicked");
        } else {
          thisMegaMenu
            .parent(".menu-dropdown-icon.clicked")
            .removeClass("clicked");
        }
      }
    }
  });
  //If width is less or equal to 992px dropdowns (BS4 Medium size)

  $(".menu-mobile").click(function (e) {
    $(".menu > ul").toggleClass("show-on-mobile");
    e.preventDefault();
  });
  //when clicked on mobile-menu, normal menu is shown as a list, classic rwd menu story (thanks mwl from stackoverflow)
});

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

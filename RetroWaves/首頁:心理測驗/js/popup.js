const myTimeout = setTimeout(myGreeting, 500);

function myGreeting() {
  $(".popup").addClass("popup_show");
}

function myStopFunction() {
  clearTimeout(myTimeout);
}
$("#close").click(function () {
  $(".popup").css("display", "none");
});

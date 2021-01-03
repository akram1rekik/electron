'use strict';

/**
*	app.js
*	It contains basic global scripts for dashboard.html/optimizer.html
*/

/* Menu Handler
 * -------------------------------------------------- */
const { remote } = require('electron');
var win = remote.getCurrentWindow();

document.getElementById('minimize').onclick = function minimize() {
	win.minimize();
}

document.getElementById('close').onclick = function close() {
	win.close();
}

/* Preloader
 * -------------------------------------------------- */
var body = document.body;
body.classList.add("ss-preload");

// Get a reference to the splash dialog
var splash = document.querySelector(".preloader");

// When the window is loaded....
window.addEventListener("load", function() {
    
    // seconds later, hide the splash
    setTimeout(function(){
      splash.classList.add("hidden");
    }, 300);
});

/* Popovers
 * -------------------------------------------------- */	
var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-toggle="popover"]'))
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl)
})

var popover = new bootstrap.Popover(document.querySelector('.i-info'), {
  trigger: 'focus'
})
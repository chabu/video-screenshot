"use strict";

window.addEventListener("contextmenu", (event) => {
	event.stopPropagation();
}, {
	capture: true,
	passive: true,
});

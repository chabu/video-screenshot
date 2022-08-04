"use strict";

let forRestore = {};
let forCapture = {};
let currentVideo = null;
let currentNearby = null;
let currentForefront = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
	if (msg.cmd === null) {
		return;
	} else if (msg.cmd === "forefrontVideo") {
		// step 2 of 6
		forefrontVideo();
	} else if (msg.cmd === "processImage") {
		// step 4 of 6
		processImage(msg.dataUrl, msg.urlType);
	} else if (msg.cmd === "restoreVideo") {
		// step 6 of 6
		restoreVideo();
	} else if (msg.cmd === "notice") {
		window.alert(msg.data);
	}
});

function forefrontVideo() {
	let video = document.querySelector("video[src^='blob:']");
	if (video === null) {
		throw Error();
	}

	let html = document.documentElement;
	let tabWidth = html.clientWidth;
	let tabHeight = html.clientHeight;
	let tabAspectRatio = tabWidth / tabHeight;

	let videoWidth = video.videoWidth;
	let videoHeight = video.videoHeight;
	let videoAspectRatio = videoWidth / videoHeight;

	forRestore.position = video.style.position;
	forRestore.width = video.style.width;
	forRestore.height = video.style.height;

	if (video.previousElementSibling === null) {
		forRestore.appendParent = true;
		currentNearby = video.parentNode;
	} else {
		forRestore.appendParent = false;
		currentNearby = video.previousElementSibling;
	}

	let div = document.createElement("div");
	div.style.position = "absolute";
	div.style.top = "0";
	div.style.left = "0";
	div.style.zIndex = "2100000000";
	div.style.width = "100%";
	div.style.height = "100vh";
	div.style.border = "none";
	div.style.backgroundColor = "rgb(0, 0, 0)";
	div.style.padding = "0";
	div.style.margin = "0";

	window.scroll(0, 0);

	if (document.fullscreenElement !== null) {
		currentForefront =
			document.fullscreenElement.appendChild(div);
	} else {
		currentForefront =
			document.body.appendChild(div);
	}

	div.appendChild(video); // move

	video.style.position = "static";
	if (tabAspectRatio < videoAspectRatio) {
		video.style.width = "100%";
		video.style.height = "auto";
	} else {
		video.style.width = "auto";
		video.style.height = "100%";
	}

	let rect = video.getBoundingClientRect();

	forCapture.elemX = rect.x;
	forCapture.elemY = rect.y;
	forCapture.elemWidth = rect.width;
	forCapture.elemHeight = rect.height;
	forCapture.videoWidth = videoWidth;
	forCapture.videoHeight = videoHeight;
	forCapture.currentTime = video.currentTime;
	forCapture.baseURI = video.baseURI;

	currentVideo = video;
}

async function processImage(dataUrl, urlType) {
	let img = new Image();
	img.loading = "eager";
	img.decoding = "async";
	img.src = dataUrl;

	await img.decode();

	let pixelRatio = window.devicePixelRatio;
	let elemX = forCapture.elemX * pixelRatio;
	let elemY = forCapture.elemY * pixelRatio;
	let elemWidth = forCapture.elemWidth * pixelRatio;
	let elemHeight = forCapture.elemHeight * pixelRatio;

	let videoWidth = forCapture.videoWidth;
	let videoHeight = forCapture.videoHeight;

	let canvas = document.createElement("canvas");
	canvas.width = videoWidth;
	canvas.height = videoHeight;

	let context = canvas.getContext("2d", {
		alpha: false,
		desynchronized: true
	});
	context.drawImage(img,
		elemX, elemY, elemWidth, elemHeight,
		0, 0, videoWidth, videoHeight
	);

	let encodedImage = canvas.toDataURL(urlType);

	await chrome.runtime.sendMessage({
		cmd: "completeProcessImage",
		data: encodedImage,
		currentTime: forCapture.currentTime,
		baseURI: forCapture.baseURI
	});
}

function restoreVideo() {
	currentVideo.style.width = forRestore.width;
	currentVideo.style.height = forRestore.height;
	currentVideo.style.position = forRestore.position;

	if (forRestore.appendParent) {
		currentNearby.prepend(currentVideo);
	} else {
		currentNearby.after(currentVideo);
	}

	currentForefront.remove();
}

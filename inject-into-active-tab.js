"use strict";

const forRestore = {};
const forCapture = {};
let currentVideo = null;
let currentNearby = null;
let currentForefront = null;

chrome.runtime.onMessage.addListener((msg) => {
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
	const video = document.querySelector("video[src^='blob:']");
	if (video === null) {
		throw Error();
	}

	const html = document.documentElement;
	const tabWidth = html.clientWidth;
	const tabHeight = html.clientHeight;
	const tabAspectRatio = tabWidth / tabHeight;

	const videoWidth = video.videoWidth;
	const videoHeight = video.videoHeight;
	const videoAspectRatio = videoWidth / videoHeight;

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

	const div = document.createElement("div");
	div.style.position = "fixed";
	div.style.top = "0";
	div.style.left = "0";
	div.style.zIndex = "2000000000";
	div.style.width = "100%";
	div.style.height = "100vh";
	div.style.border = "none";
	div.style.backgroundColor = "rgb(0 0 0)";
	div.style.padding = "0";
	div.style.margin = "0";

	window.scroll(0, 0);

	if (document.fullscreenElement !== null) {
		currentForefront = document.fullscreenElement.appendChild(div);
	} else {
		currentForefront = document.body.appendChild(div);
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

	const rect = video.getBoundingClientRect();

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

function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = (e) => reject(e);
		img.src = src;
	});
}

async function processImage(dataUrl, urlType) {
	const img = await loadImage(dataUrl);

	const pixelRatio = window.devicePixelRatio;
	const elemX = forCapture.elemX * pixelRatio;
	const elemY = forCapture.elemY * pixelRatio;
	const elemWidth = forCapture.elemWidth * pixelRatio;
	const elemHeight = forCapture.elemHeight * pixelRatio;

	const videoWidth = forCapture.videoWidth;
	const videoHeight = forCapture.videoHeight;

	const canvas = document.createElement("canvas");
	canvas.width = videoWidth;
	canvas.height = videoHeight;

	const context = canvas.getContext("2d", {
		alpha: false,
		desynchronized: true
	});

	context.imageSmoothingQuality = "high";

	context.drawImage(img,
		elemX, elemY, elemWidth, elemHeight,
		0, 0, videoWidth, videoHeight
	);

	const encodedImage = canvas.toDataURL(urlType);

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

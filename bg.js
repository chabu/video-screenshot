"use strict";

const delayCapture = 50; // in ms
const captureVisibleTabFormat = "png"; // or "jpeg"
const canvasToDataUrlType = "image/jpeg"; // or "image/png"

// step 1 of 6
chrome.action.onClicked.addListener(async (tab) => {
	await chrome.scripting.executeScript({
		target: {tabId: tab.id},
		func: forefrontVideo
	});

	chrome.alarms.create("doRemainingProcesses", {
		when: Date.now() + delayCapture
	});
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
	// step 3 of 6
	if (alarm.name === "doRemainingProcesses") {
		let dataUrl = await chrome.tabs.captureVisibleTab({
			format: captureVisibleTabFormat
		});

		let tabs = await chrome.tabs.query({
			active: true,
			currentWindow: true
		});
		if (tabs.length < 1) {
			throw Error();
		}
		let tabId = tabs[0].id;

		await chrome.scripting.executeScript({
			target: {tabId: tabId},
			func: processImage,
			args: [dataUrl, canvasToDataUrlType]
		});

		await chrome.scripting.executeScript({
			target: {tabId: tabId},
			func: restoreVideo
		});
	}
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
	// step 5 of 6
	if (msg.cmd === "completeProcessImage") {
		let second = msg.currentTime;

		let suffix;
		if (second < 3600) {
			let m = Math.floor(second / 60);
			let s = Math.floor(second) % 60;
			suffix = `m${m}s${s}`;
		} else {
			let h = Math.floor(second / 3600) % 24;
			let m = Math.floor(second / 60) % 60;
			let s = Math.floor(second) % 60;
			suffix = `h${h}m${m}s${s}`;
		}

		let url = new URL(msg.baseURI);
		let name = url.pathname.split("/").pop();
		let filename = `${url.hostname}-${name}-${suffix}`;

		if (msg.data === "data:,") {
			await chrome.scripting.executeScript({
				target: {tabId: sender.tab.id},
				func: windowAlert,
				args: ["empty data detected"]
			});
		} else if (msg.data.startsWith("data:image/jpeg;")) {
			await chrome.downloads.download({
				url: msg.data,
				filename: `${filename}.jpg`
			});
		} else if (msg.data.startsWith("data:image/png;")) {
			await chrome.downloads.download({
				url: msg.data,
				filename: `${filename}.png`
			});
		} else {
			await chrome.scripting.executeScript({
				target: {tabId: sender.tab.id},
				func: windowAlert,
				args: ["unknown data detected"]
			});
		}
	}
});

function windowAlert(msg) {
	window.alert(msg);
}

// step 2 of 6
function forefrontVideo() {
	let video = document.querySelector("video[src]");
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

	let forRestore = {
		position: video.style.position,
		width: video.style.width,
		height: video.style.height,
	};

	if (video.previousElementSibling === null) {
		forRestore.appendParent = true;
		video.parentNode.classList.add("my-nearby");
	} else {
		forRestore.appendParent = false;
		video.previousElementSibling.classList.add("my-nearby");
	}

	let div = document.createElement("div");
	div.classList.add("my-forefront");
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

	document.body.appendChild(div);
	div.appendChild(video);

	video.style.position = "static";
	if (tabAspectRatio < videoAspectRatio) {
		video.style.width = "100%";
		video.style.height = "auto";
	} else {
		video.style.width = "auto";
		video.style.height = "100%";
	}

	let rect = video.getBoundingClientRect();

	let forCapture = {
		elemX: rect.x,
		elemY: rect.y,
		elemWidth: rect.width,
		elemHeight: rect.height,
		videoWidth: videoWidth,
		videoHeight: videoHeight,
		currentTime: video.currentTime,
		baseURI: video.baseURI,
	};

	sessionStorage.setItem("my-capture",
		JSON.stringify(forCapture)
	);

	sessionStorage.setItem("my-restore",
		JSON.stringify(forRestore)
	);
}

// step 4 of 6
function processImage(dataUrl, canvasToDataUrlType) {
	let img = document.createElement("img");
	img.loading = "eager";
	img.decoding = "sync";

	img.addEventListener("load", () => {
		let forCapture = JSON.parse(
			 sessionStorage.getItem("my-capture")
		);

		let pixelRatio = window.devicePixelRatio;
		let elemX = Number(forCapture.elemX) * pixelRatio;
		let elemY = Number(forCapture.elemY) * pixelRatio;
		let elemWidth = Number(forCapture.elemWidth) * pixelRatio;
		let elemHeight = Number(forCapture.elemHeight) * pixelRatio;

		let videoWidth = Number(forCapture.videoWidth);
		let videoHeight = Number(forCapture.videoHeight);

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

		let encodedImage = canvas.toDataURL(canvasToDataUrlType);

		chrome.runtime.sendMessage({
			cmd: "completeProcessImage",
			data: encodedImage,
			currentTime: forCapture.currentTime,
			baseURI: forCapture.baseURI,
		});
	});

	img.src = dataUrl;
}

// step 6 of 6
function restoreVideo() {
	let forRestore = JSON.parse(
		sessionStorage.getItem("my-restore")
	);

	sessionStorage.removeItem("my-restore");
	sessionStorage.removeItem("my-capture");

	let video = document.querySelector("video[src]");
	let nearby = document.querySelector(".my-nearby");
	let forefront = document.querySelector(".my-forefront");

	if (video === null) {
		throw Error();
	}

	video.style.position = forRestore.position;
	video.style.width = forRestore.width;
	video.style.height = forRestore.height;

	if (nearby !== null) {
		nearby.classList.remove("my-nearby");
		if (forRestore.appendParent) {
			nearby.prepend(video);
		} else {
			nearby.after(video);
		}
	}

	forefront.remove();
}

"use strict";

const elemFilenamePrefix = document.querySelector("input[name=filenamePrefix]");
const elemTimeOffset = document.querySelector("input[name=timeOffset]");

loadStoredData();

elemFilenamePrefix.addEventListener("change", async () => {
	await chrome.storage.local.set({
		filenamePrefix: elemFilenamePrefix.value
	});
});

elemTimeOffset.addEventListener("change", async () => {
	const timeOffset = Number(elemTimeOffset.value);
	if (Number.isNaN(timeOffset)) {
		return;
	}
	await chrome.storage.local.set({
		timeOffset: timeOffset
	});
});

const buttons = document.querySelectorAll("button[type=button]");
for (const button of buttons) {
	if (button.name === "invokeTakeScreenshot") {
		button.addEventListener("click", async () => {
			await chrome.runtime.sendMessage({
				cmd: "invokeTakeScreenshot"
			});
		});
	} else if (button.name === "resetFilenamePrefix") {
		button.addEventListener("click", async () => {
			await chrome.storage.local.remove("filenamePrefix");
			elemFilenamePrefix.value = "";
		});
	} else if (button.name === "zeroAdjust") {
		button.addEventListener("click", async () => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const [injected] = await chrome.scripting.executeScript({
				func: zeroAdjust,
				target: {tabId: tab.id},
			});
			elemTimeOffset.value = (-injected.result).toFixed(2);
			elemTimeOffset.dispatchEvent(new Event("change"));
		});
	} else if (button.name === "videoSpeed") {
		button.addEventListener("click", async () => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			await chrome.scripting.executeScript({
				func: videoSpeed,
				args: [Number(button.value)],
				target: {tabId: tab.id},
			});
		});
	} else if (button.name === "seek") {
		button.addEventListener("click", async () => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			await chrome.scripting.executeScript({
				func: seek,
				args: [Number(button.value)],
				target: {tabId: tab.id},
			});
		});
	} else if (button.name === "playOrPause") {
		button.addEventListener("click", async () => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			await chrome.scripting.executeScript({
				func: playOrPause,
				args: [Number(button.value)],
				target: {tabId: tab.id},
			});
		});
	} else if (button.name === "injectScript") {
		button.addEventListener("click", async () => {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			await chrome.scripting.executeScript({
				files: [button.value],
				target: {tabId: tab.id},
			});
		});
	}
}

async function loadStoredData() {
	const storLocal = await chrome.storage.local.get({
		filenamePrefix: "",
		timeOffset: 0,
	});
	elemFilenamePrefix.value = storLocal.filenamePrefix;
	elemTimeOffset.value = storLocal.timeOffset;
}

function zeroAdjust() {
	const videos = document.querySelectorAll("video");
	const strmVideo = Array.from(videos).findLast(
		(video) => video.currentSrc.startsWith("blob:")
	);
	return strmVideo.currentTime;
}

function videoSpeed(rate) {
	const videos = document.querySelectorAll("video");
	const strmVideo = Array.from(videos).findLast(
		(video) => video.currentSrc.startsWith("blob:")
	);
	strmVideo.playbackRate = rate;
}

function seek(divisor) {
	const videos = document.querySelectorAll("video");
	const strmVideo = Array.from(videos).findLast(
		(video) => video.currentSrc.startsWith("blob:")
	);
	strmVideo.currentTime += 1 / divisor;
}

function playOrPause() {
	const videos = document.querySelectorAll("video");
	const strmVideo = Array.from(videos).findLast(
		(video) => video.currentSrc.startsWith("blob:")
	);
	if (strmVideo.paused) {
		strmVideo.play();
	} else {
		strmVideo.pause();
	}
}

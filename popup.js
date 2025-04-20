"use strict";

assignStoredValues();

const buttons = document.querySelectorAll("button[type=button]");
for (const button of buttons) {
	if (button.name === "invokeTakeScreenshot") {
		button.addEventListener("click", async () => {
			await chrome.runtime.sendMessage({
				cmd: button.name
			});
		});
	} else if (button.name === "saveFilenamePrefix") {
		button.addEventListener("click", async () => {
			const filenamePrefixElem = document.querySelector("input[name=filenamePrefix]");
			await chrome.storage.local.set({
				filenamePrefix: filenamePrefixElem.value
			});
		});
	} else if (button.name === "clearFilenamePrefix") {
		button.addEventListener("click", async () => {
			await chrome.storage.local.remove("filenamePrefix");
			const filenamePrefixElem = document.querySelector("input[name=filenamePrefix]");
			filenamePrefixElem.value = "";
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

async function assignStoredValues() {
	const storageLocal = await chrome.storage.local.get({
		filenamePrefix: "",
	});

	const filenamePrefixElem = document.querySelector("input[name=filenamePrefix]");
	filenamePrefixElem.value = storageLocal.filenamePrefix;
}

function videoSpeed(delta) {
	const videos = document.querySelectorAll("video");
	const strmVideo = Array.from(videos).findLast(
		(video) => video.currentSrc.startsWith("blob:")
	);
	if (delta === 0) {
		strmVideo.playbackRate = 1.0;
	} else {
		strmVideo.playbackRate += delta;
	}
}

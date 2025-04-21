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
	} else if (button.name === "resetTimeOffset") {
		button.addEventListener("click", async () => {
			await chrome.storage.local.remove("timeOffset");
			elemTimeOffset.value = 0;
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

async function loadStoredData() {
	const storLocal = await chrome.storage.local.get({
		filenamePrefix: "",
		timeOffset: 0,
	});

	elemFilenamePrefix.value = storLocal.filenamePrefix;
	elemTimeOffset.value = storLocal.timeOffset;
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

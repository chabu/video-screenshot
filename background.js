"use strict";

const delayCapture = 50; // in ms
const captureVisibleTabFormat = "png"; // or "jpeg"
const canvasToDataUrlType = "image/png"; // or "image/jpeg"

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "shot",
		title: "Take a screenshot of the video",
	});
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	takeScreenshot(tab.id);
});

// step 1 of 6
async function takeScreenshot(tabId) {
	await chrome.tabs.sendMessage(tabId, {
		cmd: null
	}).catch(async () => {
		// execute only once
		await chrome.scripting.executeScript({
			files: ["inject-into-active-tab.js"],
			target: {tabId: tabId},
		});
	});

	await chrome.tabs.sendMessage(tabId, {
		cmd: "forefrontVideo"
	});

	// step 3 of 6
	setTimeout(async () => {
		const dataUrl = await chrome.tabs.captureVisibleTab({
			format: captureVisibleTabFormat,
			quality: 100,
		});

		await chrome.tabs.sendMessage(tabId, {
			cmd: "processImage",
			dataUrl: dataUrl,
			urlType: canvasToDataUrlType,
		});

		await chrome.tabs.sendMessage(tabId, {
			cmd: "restoreVideo"
		});
	}, delayCapture);
}

chrome.runtime.onMessage.addListener(async (msg, sender) => {
	if (msg.cmd === "invokeTakeScreenshot") {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		takeScreenshot(tab.id);
	} else if (msg.cmd === "completeProcessImage") { // step 5 of 6
		const storLocal = await chrome.storage.local.get({
			filenamePrefix: "",
			timeOffset: 0,
		});

		const second = msg.currentTime + storLocal.timeOffset;

		let suffix;
		if (second < 3600) {
			const m = Math.floor(second / 60);
			const s = Math.floor(second) % 60;
			suffix = `m${m}s${s}`;
		} else {
			const h = Math.floor(second / 3600) % 24;
			const m = Math.floor(second / 60) % 60;
			const s = Math.floor(second) % 60;
			suffix = `h${h}m${m}s${s}`;
		}

		const filename = storLocal.filenamePrefix + suffix;

		if (msg.data === "data:,") {
			await chrome.tabs.sendMessage(sender.tab.id, {
				cmd: "notice",
				data: "empty data",
			});
		} else if (msg.data.startsWith("data:image/jpeg;")) {
			await chrome.downloads.download({
				url: msg.data,
				filename: `${filename}.jpg`,
			});
		} else if (msg.data.startsWith("data:image/png;")) {
			await chrome.downloads.download({
				url: msg.data,
				filename: `${filename}.png`,
			});
		} else {
			await chrome.tabs.sendMessage(sender.tab.id, {
				cmd: "notice",
				data: "unknown data",
			});
		}
	}
});

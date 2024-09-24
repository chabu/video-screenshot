"use strict";

const delayCapture = 50; // in ms
const captureVisibleTabFormat = "png"; // or "jpeg"
const canvasToDataUrlType = "image/png"; // or "image/jpeg"

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "shot",
		title: "Take a screenshot of the video"
	});
});

chrome.action.onClicked.addListener((tab) => {
	doAllProcesses(tab.id);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	doAllProcesses(tab.id);
});

// step 1 of 6
async function doAllProcesses(tabId) {
	await chrome.tabs.sendMessage(tabId, {
		cmd: null
	}).catch(async () => {
		// execute only once
		await chrome.scripting.executeScript({
			target: {tabId: tabId},
			files: ["inject-into-active-tab.js"]
		});
	});

	await chrome.tabs.sendMessage(tabId, {
		cmd: "forefrontVideo"
	});

	// step 3 of 6
	setTimeout(async () => {
		const dataUrl = await chrome.tabs.captureVisibleTab({
			format: captureVisibleTabFormat,
			quality: 100
		});

		await chrome.tabs.sendMessage(tabId, {
			cmd: "processImage",
			dataUrl: dataUrl,
			urlType: canvasToDataUrlType
		});

		await chrome.tabs.sendMessage(tabId, {
			cmd: "restoreVideo"
		});
	}, delayCapture);
}

chrome.runtime.onMessage.addListener(async (msg, sender) => {
	// step 5 of 6
	if (msg.cmd === "completeProcessImage") {
		const second = msg.currentTime;

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

		const filename = `ep0${suffix}`;

		if (msg.data === "data:,") {
			await chrome.tabs.sendMessage(sender.tab.id, {
				cmd: "notice",
				data: "empty data detected"
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
			await chrome.tabs.sendMessage(sender.tab.id, {
				cmd: "notice",
				data: "unknown data detected"
			});
		}
	}
});

const delayCapture = 50; // in ms
const captureVisibleTabFormat = "png"; // or "jpeg"
const canvasToDataUrlType = "image/jpeg"; // or "image/png"

chrome.action.onClicked.addListener((tab) => {
	doAllProcesses(tab.id);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
	doAllProcesses(tab.id);
});

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "1",
		title: "Take a screenshot of videos"
	});
});

// step 1 of 6
async function doAllProcesses(tabId) {
	await chrome.tabs.sendMessage(tabId, {
		cmd: null
	}).catch(async () => {
		// execute only once
		await chrome.scripting.executeScript({
			target: {tabId: tabId},
			files: ["cs.js"]
		});
	});

	await chrome.tabs.sendMessage(tabId, {
		cmd: "forefrontVideo"
	});

	chrome.alarms.create("doRemainingProcesses", {
		when: Date.now() + delayCapture
	});
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
	// step 3 of 6
	if (alarm.name === "doRemainingProcesses") {
		let dataUrl = await chrome.tabs.captureVisibleTab({
			format: captureVisibleTabFormat,
			quality: 100
		});

		let tabs = await chrome.tabs.query({
			active: true,
			currentWindow: true
		});
		if (tabs.length < 1) {
			throw Error();
		}
		let tabId = tabs[0].id;

		await chrome.tabs.sendMessage(tabId, {
			cmd: "processImage",
			dataUrl: dataUrl,
			urlType: canvasToDataUrlType
		});

		await chrome.tabs.sendMessage(tabId, {
			cmd: "restoreVideo"
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
			await chrome.tabs.sendMessage(tabId, {
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
			await chrome.tabs.sendMessage(tabId, {
				cmd: "notice",
				data: "unknown data detected"
			});
		}
	}
});

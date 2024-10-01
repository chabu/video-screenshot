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
	}
}

async function assignStoredValues() {
	const storageLocal = await chrome.storage.local.get({
		filenamePrefix: "",
	});

	const filenamePrefixElem = document.querySelector("input[name=filenamePrefix]");

	filenamePrefixElem.value = storageLocal.filenamePrefix;
}

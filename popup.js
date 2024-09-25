"use strict";

//assignStoredValues();

const nodes = document.querySelectorAll("button[type=button]");

for (const node of nodes) {
	if (node.name === "invokeTakeScreenshot") {
		node.addEventListener("click", async () => {
			await chrome.runtime.sendMessage({
				cmd: node.name
			});
		});
	} else if (node.name === "dummyCommand") {
		
	}
}

async function assignStoredValues() {
	
}

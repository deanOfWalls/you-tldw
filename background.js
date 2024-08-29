chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.transcript && message.instructions) {
        console.log("Received transcript message:", message);

        // Open a new tab to ChatGPT
        chrome.tabs.create({ url: 'https://chatgpt.com/' }, function(tab) {
            console.log("New tab created with ID:", tab.id);

            // Wait for the new tab to fully load
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log("Tab fully loaded. Injecting script...");

                    chrome.tabs.onUpdated.removeListener(listener);

                    // Inject the script into the new tab with the passed transcript and instructions
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (transcriptText, userInstructions) => {
                            console.log("Script injected into ChatGPT tab.");
                            console.log("Transcript:", transcriptText);
                            console.log("Instructions:", userInstructions);

                            // Assign variables to the window object
                            window.chatgptTranscript = transcriptText;
                            window.chatgptInstructions = userInstructions;

                            const retryInterval = 500; // Retry every 500ms
                            const maxRetries = 10; // Try up to 10 times

                            function tryFindInputBox(retries = 0) {
                                // Find the input box
                                const inputBox = document.querySelector('textarea');
                                if (inputBox) {
                                    console.log("Input box found.");
                                    inputBox.value = window.chatgptInstructions + "\n\n" + window.chatgptTranscript;
                                    inputBox.dispatchEvent(new Event('input', { bubbles: true }));

                                    // Find the submit button and click it
                                    const submitButton = document.querySelector('button[data-testid="send-button"]');
                                    if (submitButton) {
                                        submitButton.click();
                                        console.log("Submit button clicked.");
                                    } else {
                                        console.error("Submit button not found.");
                                    }
                                } else {
                                    if (retries < maxRetries) {
                                        console.log(`Input box not found. Retrying... (${retries + 1}/${maxRetries})`);
                                        setTimeout(() => tryFindInputBox(retries + 1), retryInterval);
                                    } else {
                                        console.error("Input box not found after max retries.");
                                    }
                                }
                            }

                            tryFindInputBox();
                        },
                        args: [message.transcript, message.instructions],
                    }).catch(err => console.error("Script injection failed: ", err));
                }
            });
        });
    } else {
        console.error("Received a message without transcript or instructions.");
    }
});

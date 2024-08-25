chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.transcript) {
        console.log("Received transcript message:", message);

        // Open a new tab to ChatGPT
        chrome.tabs.create({ url: 'https://chatgpt.com/' }, function(tab) {
            console.log("New tab created with ID:", tab.id);

            // Wait for the new tab to fully load
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    console.log("Tab fully loaded. Injecting script...");

                    chrome.tabs.onUpdated.removeListener(listener);

                    // Inject the script into the new tab
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: (transcriptText, userInstructions) => {
                            console.log("Script injected into ChatGPT tab.");

                            // Find the input box
                            const inputBox = document.querySelector('textarea');
                            if (inputBox) {
                                console.log("Input box found.");
                                inputBox.value = `${userInstructions}\n\n${transcriptText}`;
                                
                                // Trigger Enter key press to submit
                                const event = new KeyboardEvent('keydown', {
                                    key: 'Enter',
                                    code: 'Enter',
                                    keyCode: 13,
                                    which: 13,
                                    bubbles: true
                                });
                                inputBox.dispatchEvent(event);
                                console.log("Enter key event dispatched.");

                                // Wait for 500ms before clicking the submit button
                                setTimeout(() => {
                                    const submitButton = document.querySelector('button[data-testid="send-button"]');
                                    
                                    if (submitButton) {
                                        submitButton.click();
                                        console.log("Submit button clicked.");
                                    } else {
                                        console.error("Submit button not found.");
                                    }
                                }, 500); // Adjust the delay time as needed

                            } else {
                                console.error("Input box not found in ChatGPT.");
                            }
                        },
                        args: [message.transcript, message.instructions],
                    }).catch(err => console.error("Script injection failed: ", err));
                }
            });
        });
    }
});

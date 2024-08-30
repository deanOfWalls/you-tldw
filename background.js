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

                    // Inject the script into the new tab
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: async (transcriptText, userInstructions) => {
                            console.log("Script injected into ChatGPT tab.");
                            console.log("Transcript:", transcriptText);
                            console.log("Instructions:", userInstructions);

                            // Ensure we have the correct data before proceeding
                            if (!transcriptText || !userInstructions) {
                                console.error("Transcript or instructions are undefined.");
                                return;
                            }

                            // Find the input box and insert the text
                            const insertText = async () => {
                                // Wait for the input box to be present
                                await new Promise(resolve => setTimeout(resolve, 3000));  // Increased timer to 3 seconds
                                const inputBox = document.querySelector('textarea');
                                if (inputBox) {
                                    console.log("Input box found.");
                                    
                                    inputBox.value = ""; // Clear the input box before inserting
                                    const combinedText = `${userInstructions}\n\n\`\`\`\n${transcriptText}\n\`\`\``;
                                    console.log("Combined Text to be inserted:", combinedText);
                                    inputBox.value = combinedText;
                                    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                                    console.log("Text inserted into input box.");

                                    // Simulate pressing Enter to submit the input
                                    await new Promise(resolve => setTimeout(resolve, 2000));  // Additional wait time before simulating Enter key press
                                    const event = new KeyboardEvent('keydown', {
                                        key: 'Enter',
                                        code: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true
                                    });
                                    inputBox.dispatchEvent(event);
                                    console.log("Enter key event dispatched.");

                                    // Click the submit button
                                    await new Promise(resolve => setTimeout(resolve, 2000));  // Additional wait time before clicking the submit button
                                    const submitButton = document.querySelector('button[data-testid="send-button"]');
                                    if (submitButton) {
                                        submitButton.click();
                                        console.log("Submit button clicked.");
                                    } else {
                                        console.error("Submit button not found.");
                                    }
                                } else {
                                    console.error("Input box not found in ChatGPT.");
                                }
                            };

                            await insertText();
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

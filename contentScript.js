// Utility function to wait for an element to appear
function waitForElement(selector, timeout = 10000) {  // Increased timeout to 10 seconds
    return new Promise((resolve, reject) => {
        const start = Date.now();

        (function check() {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - start > timeout) {
                reject(`Timeout: Element with selector ${selector} not found`);
            } else {
                setTimeout(check, 200); // Increased check interval to reduce resource usage
            }
        })();
    });
}

// Function to check if the transcript button is available
async function isTranscriptAvailable() {
    console.log("Checking if transcript button is available...");

    try {
        const transcriptButton = await waitForElement('#primary-button > ytd-button-renderer > yt-button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill', 2000);
        return !!transcriptButton; // If the button is found, transcript is available
    } catch (error) {
        console.log("Transcript button not found.");
        return false; // No transcript button found, so no transcript available
    }
}

// Function to open the transcript when YouTLDW or Pencil button is clicked
async function openTranscriptOnDemand() {
    try {
        const moreButton = await waitForElement('#expand', 2000);
        if (moreButton) {
            console.log('"More" button found and clicked');
            moreButton.click();

            const transcriptButton = await waitForElement('#primary-button > ytd-button-renderer > yt-button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill', 2000);
            if (transcriptButton) {
                console.log('Transcript button found and clicked');
                transcriptButton.click();
            } else {
                console.error('Transcript button not found after clicking "More"');
            }
        } else {
            console.error('"More" button not found');
        }
    } catch (error) {
        console.error('Error in openTranscriptOnDemand:', error);
    }
}

// Function to handle the transcript actions
function handleTranscript(customInstructions = "Summarize in bullet point: ") {
    console.log("handleTranscript function started.");
    openTranscriptOnDemand();

    // Adjust the delay here to ensure the transcript is fully loaded before we proceed
    setTimeout(() => {
        const transcript = getTranscript();
        if (transcript) {
            console.log("Transcript:", transcript);
            // Wrap the transcript in a code block
            const wrappedTranscript = `\`\`\`\n${transcript}\n\`\`\``;
            // Send the transcript with the custom instructions
            chrome.runtime.sendMessage({ transcript: wrappedTranscript, instructions: customInstructions });
        } else {
            showNotFoundModal(); // Show a modal if the transcript is not found
        }
    }, 1500); // Slightly increased delay to ensure transcript is loaded
}

// Function to extract the transcript text
function getTranscript() {
    console.log("Attempting to extract transcript...");
    const transcriptContainer = document.querySelector('ytd-transcript-renderer');
    if (transcriptContainer) {
        console.log('Transcript container found');
        let transcriptText = '';
        const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-list-renderer .segment');
        if (segments.length > 0) {
            segments.forEach(segment => {
                transcriptText += segment.innerText + ' ';
            });
            return transcriptText.trim();
        } else {
            return null; // No segments found, return null
        }
    } else {
        return null; // No transcript container found, return null
    }
}

// Function to show a modal explaining no transcript was found
function showNotFoundModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = '#ffffff';
    modal.style.border = 'none';
    modal.style.borderRadius = '8px';
    modal.style.zIndex = '10000';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    modal.style.width = '300px';

    // Create a container for the close button and input
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'flex-end'; // Aligns the X button to the right
    header.style.alignItems = 'center'; // Vertically centers the content in the header
    header.style.marginBottom = '10px';

    // Create the close button (X)
    const closeButton = document.createElement('span');
    closeButton.innerText = '✖';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.color = '#333333';

    // Add event listener to close the modal when the X button is clicked
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Create the message element
    const message = document.createElement('p');
    message.innerText = 'No transcript was found for this video.';
    message.style.color = '#000000'; // Black text
    message.style.margin = '0';
    message.style.padding = '10px';
    message.style.textAlign = 'center'; // Center align the message

    // Append the close button and message to the modal
    header.appendChild(closeButton);
    modal.appendChild(header);
    modal.appendChild(message);

    // Append the modal to the body
    document.body.appendChild(modal);
}

// Function to create and show the modal for custom prompt input
function showCustomPromptModal() {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.padding = '20px';
    modal.style.backgroundColor = '#ffffff'; // Set the modal background back to white
    modal.style.border = 'none'; // Remove the border
    modal.style.borderRadius = '8px';
    modal.style.zIndex = '10000';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    modal.style.width = '400px'; // Increased width of the modal

    // Create a container for the close button and input
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'flex-end'; // Aligns the X button to the right
    header.style.alignItems = 'center'; // Vertically centers the content in the header
    header.style.marginBottom = '10px';

    // Create the close button (X)
    const closeButton = document.createElement('span');
    closeButton.innerText = '✖';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.color = '#333333'; // Set the X button color to dark grey for better contrast

    // Add event listener to close the modal when the X button is clicked
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Create the input element for custom prompt
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter your custom prompt';
    input.style.width = 'calc(100% - 20px)'; // Add padding to the input box
    input.style.padding = '10px';
    input.style.marginBottom = '20px'; // Add margin at the bottom to separate it from the OK button
    input.style.border = '1px solid #cccccc';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = '#ffffff'; // Keep the input box background white
    input.style.color = '#000000'; // Set the text color inside the input to black

    // Function to submit the input (used for both button click and Enter key)
    const submitInput = () => {
        const customPrompt = input.value.trim();
        if (customPrompt) {
            handleTranscript(customPrompt);
        }
        document.body.removeChild(modal);
    };

    // Add event listener to detect Enter key press
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            submitInput();
        }
    });

    // Create a container for the OK button
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center'; // Center the OK button horizontally
    buttonContainer.style.marginTop = '10px'; // Add some space above the button

    // Create the OK button
    const okButton = document.createElement('button');
    okButton.innerText = 'OK';
    okButton.style.padding = '10px 20px';
    okButton.style.backgroundColor = '#ff0000';
    okButton.style.color = '#ffffff';
    okButton.style.border = 'none';
    okButton.style.borderRadius = '4px';
    okButton.style.cursor = 'pointer';

    // Add event listener to process the custom prompt and close the modal when OK is clicked
    okButton.addEventListener('click', submitInput);

    // Append the close button to the header
    header.appendChild(closeButton);

    // Append the input, OK button, and other elements to the modal
    modal.appendChild(header);
    modal.appendChild(input);
    buttonContainer.appendChild(okButton); // Add the OK button to the container
    modal.appendChild(buttonContainer); // Add the container to the modal

    // Append the modal to the body
    document.body.appendChild(modal);
}

// Function to add the overlay buttons based on transcript availability
async function addOverlayButtons() {
    try {
        const subscribeButton = await waitForElement('#subscribe-button-shape > button');

        if (subscribeButton) {
            // Check if the transcript is available by checking for the presence of the transcript button
            const transcriptAvailable = await isTranscriptAvailable();

            if (transcriptAvailable) {
                const overlayButton = document.createElement('button');
                const settingsButton = document.createElement('button');

                // Create spans for YouTLDW button text styling
                const spanYou = document.createElement('span');
                spanYou.innerText = 'You';
                spanYou.style.color = '#000000'; // Black color for 'You'

                const spanTLDW = document.createElement('span');
                spanTLDW.innerText = 'TLDW';
                spanTLDW.style.color = '#ff0000'; // Red color for 'TLDW'

                overlayButton.appendChild(spanYou);
                overlayButton.appendChild(spanTLDW);

                // Match font style, size, and weight to Subscribe button
                overlayButton.style.fontFamily = subscribeButton.style.fontFamily || 'Roboto, Arial, sans-serif';
                overlayButton.style.fontSize = subscribeButton.style.fontSize || '14px';
                overlayButton.style.fontWeight = subscribeButton.style.fontWeight || '500';
                overlayButton.style.padding = '5px 10px';
                overlayButton.style.backgroundColor = '#ffffff'; // White background to match the Subscribe button
                overlayButton.style.border = '1px solid #cccccc'; // Match border style
                overlayButton.style.borderRadius = '4px';
                overlayButton.style.cursor = 'pointer';
                overlayButton.style.marginLeft = '10px';

                overlayButton.addEventListener('click', () => {
                    console.log('Overlay button clicked');
                    handleTranscript(); // Call the function to start transcript extraction when clicked
                });

                // Settings button with pencil icon
                settingsButton.innerText = '✏️';
                settingsButton.style.fontSize = '18px'; // Adjust size as needed
                settingsButton.style.marginLeft = '10px';
                settingsButton.style.backgroundColor = '#ffffff'; // White background to match the YouTLDW button
                settingsButton.style.border = '1px solid #cccccc'; // Match border style
                settingsButton.style.borderRadius = '4px';
                settingsButton.style.cursor = 'pointer';
                settingsButton.style.padding = '5px 10px';

                settingsButton.addEventListener('click', () => {
                    console.log('Settings button clicked');
                    showCustomPromptModal(); // Show the custom prompt modal when clicked
                });

                // Insert the buttons to the right of the subscribe button
                subscribeButton.parentNode.insertBefore(overlayButton, subscribeButton.nextSibling);
                subscribeButton.parentNode.insertBefore(settingsButton, overlayButton.nextSibling);
                console.log('Overlay and settings buttons added to the right of the subscribe button');
            } else {
                const notFoundButton = document.createElement('button');
                notFoundButton.innerText = 'Not Found';
                notFoundButton.style.fontFamily = subscribeButton.style.fontFamily || 'Roboto, Arial, sans-serif';
                notFoundButton.style.fontSize = '14px';
                notFoundButton.style.fontWeight = '500';
                notFoundButton.style.padding = '5px 10px';
                notFoundButton.style.backgroundColor = '#ff0000'; // Red background to indicate an issue
                notFoundButton.style.color = '#ffffff';
                notFoundButton.style.border = '1px solid #cccccc';
                notFoundButton.style.borderRadius = '4px';
                notFoundButton.style.cursor = 'pointer';
                notFoundButton.style.marginLeft = '10px';

                notFoundButton.addEventListener('click', () => {
                    console.log('Not Found button clicked');
                    showNotFoundModal();
                });

                // Insert the Not Found button to the right of the subscribe button
                subscribeButton.parentNode.insertBefore(notFoundButton, subscribeButton.nextSibling);
                console.log('Not Found button added to the right of the subscribe button');
            }
        } else {
            console.error('Subscribe button not found, cannot add overlay button.');
        }
    } catch (error) {
        console.error('Error in addOverlayButtons:', error);
    }
}

// Start the process by adding the overlay buttons
addOverlayButtons();

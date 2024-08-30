// Utility function to wait for an element to appear using MutationObserver
function waitForElement(selector, timeout = 30000) {  // Increased timeout to 30 seconds
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutations, observerInstance) => {
            const element = document.querySelector(selector);
            if (element) {
                observerInstance.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        setTimeout(() => {
            observer.disconnect();
            reject(`Timeout: Element with selector ${selector} not found`);
        }, timeout);
    });
}

// Function to send the message to the background script
function sendTranscriptToBackground(transcript, instructions) {
    chrome.runtime.sendMessage({ transcript, instructions });
}

// Function to open the transcript when TL;DW button is clicked
async function openTranscriptOnDemand(customInstructions = "Summarize in bullet point:") {
    try {
        // Step 1: Check if the transcript container is already visible
        let transcriptContainer = document.querySelector('ytd-transcript-renderer');
        if (transcriptContainer) {
            const transcript = getTranscript();
            if (transcript) {
                console.log('Transcript:', transcript);
                console.log('Instructions:', customInstructions);
                sendTranscriptToBackground(transcript, customInstructions);
                return; // Exit the function as we've already found and handled the transcript
            } else {
                console.error("Transcript could not be scraped.");
                showNotFoundModal();
                return;
            }
        }

        // Step 2: If the transcript container isn't visible, check for the 'Show Transcript' button
        const transcriptButton = document.querySelector('button[aria-label="Show transcript"]');
        if (transcriptButton) {
            transcriptButton.click();
            transcriptContainer = await waitForElement('ytd-transcript-renderer', 5000);
            if (transcriptContainer) {
                const transcript = getTranscript();
                if (transcript) {
                    console.log('Transcript:', transcript);
                    console.log('Instructions:', customInstructions);
                    sendTranscriptToBackground(transcript, customInstructions);
                } else {
                    console.error("Transcript could not be scraped after loading.");
                    showNotFoundModal();
                }
            } else {
                showNotFoundModal();
            }
            return; // Exit the function after handling the transcript
        }

        // Step 3: If the 'Show Transcript' button isn't visible, check for the '...More' button
        const moreButton = document.querySelector('#expand');
        if (moreButton) {
            moreButton.click();
            const transcriptButton = await waitForElement('button[aria-label="Show transcript"]', 5000);
            if (transcriptButton) {
                transcriptButton.click();
                transcriptContainer = await waitForElement('ytd-transcript-renderer', 5000);
                if (transcriptContainer) {
                    const transcript = getTranscript();
                    if (transcript) {
                        console.log('Transcript:', transcript);
                        console.log('Instructions:', customInstructions);
                        sendTranscriptToBackground(transcript, customInstructions);
                    } else {
                        console.error("Transcript could not be scraped after loading.");
                        showNotFoundModal();
                    }
                } else {
                    showNotFoundModal();
                }
            } else {
                showNotFoundModal();
            }
        } else {
            showNotFoundModal();
        }
    } catch (error) {
        console.error('Error in openTranscriptOnDemand:', error);
        showNotFoundModal();
    }
}

// Function to get the transcript text
function getTranscript() {
    const transcriptContainer = document.querySelector('ytd-transcript-renderer');
    if (transcriptContainer) {
        let transcriptText = '';
        const segments = transcriptContainer.querySelectorAll('ytd-transcript-segment-list-renderer .segment');
        segments.forEach(segment => {
            transcriptText += segment.innerText + ' ';
        });
        return transcriptText.trim();
    } else {
        return null;
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

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'flex-end';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';

    const closeButton = document.createElement('span');
    closeButton.innerText = '✖';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.color = '#333333';
    

    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    const message = document.createElement('p');
    message.innerText = 'No transcript was found for this video.';
    message.style.color = '#000000';
    message.style.margin = '0';
    message.style.padding = '10px';
    message.style.textAlign = 'center';

    header.appendChild(closeButton);
    modal.appendChild(header);
    modal.appendChild(message);
    document.body.appendChild(modal);
}

// Function to show the custom prompt modal
function showCustomPromptModal() {
    const modal = document.createElement('div');
    modal.className = 'custom-prompt-modal';
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
    modal.style.width = '320px'; // Increased width slightly
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';

    // Close button (X)
    const closeButton = document.createElement('span');
    closeButton.innerText = '✖';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.color = '#333333';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';   // Adjusted top position to fit inside modal
    closeButton.style.right = '5px'; // Adjusted right position to fit inside modal
    closeButton.style.fontFamily = '"Roboto", "Arial", sans-serif';

    closeButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter your custom instructions...';
    input.style.width = 'calc(100% - 20px)';
    input.style.padding = '10px';
    input.style.marginBottom = '10px';
    input.style.border = '1px solid #cccccc';
    input.style.borderRadius = '4px';
    input.style.fontFamily = '"Roboto", "Arial", sans-serif';
    input.autofocus = true; // Set input field to be active by default

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitButton.click(); // Trigger submit when Enter key is pressed
        }
    });

    const submitButton = document.createElement('button');
    submitButton.innerText = 'Submit';
    submitButton.style.padding = '10px 20px';
    submitButton.style.backgroundColor = '#ff0000';
    submitButton.style.color = '#ffffff';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontFamily = '"Roboto", "Arial", sans-serif';
    submitButton.style.marginTop = '10px';

    submitButton.addEventListener('click', () => {
        const customInstructions = input.value || 'Please summarize this video:';
        openTranscriptOnDemand(customInstructions);
        document.body.removeChild(modal);
    });

    modal.appendChild(closeButton);
    modal.appendChild(input);
    modal.appendChild(submitButton);
    document.body.appendChild(modal);

    // Focus the input field as soon as the modal is displayed
    input.focus();
}

// Function to add the overlay buttons in place of the YouTube home button
async function addOverlayButtons() {
    // Ensure we're not on the base domain or a /shorts/ URL
    if (window.location.pathname === '/' || window.location.pathname.startsWith('/shorts/')) {
        console.log("YouTube Shorts or base YouTube page detected. Skipping overlay button injection.");
        return;
    }

    // Selector for the YouTube home button
    const logoSelector = '#logo';

    try {
        let parentContainer = await retryUntilFound(logoSelector, 1000, 30);  // Retry every 1 second, up to 30 times

        if (parentContainer) {
            // Replace the YouTube logo with our buttons
            insertButtons(parentContainer);
            // Hide the original YouTube logo
            parentContainer.style.display = 'none';
        } else {
            console.error('No parent container found for the buttons.');
        }

        // Observe DOM changes to re-inject buttons if needed
        const observer = new MutationObserver((mutationsList, observer) => {
            const parentContainer = document.querySelector(logoSelector);
            if (parentContainer && !document.querySelector('.youtldw-button')) {
                insertButtons(parentContainer);
                parentContainer.style.display = 'none'; // Hide the YouTube logo again
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    } catch (error) {
        console.error('Error in addOverlayButtons:', error);
    }
}

// Helper function to retry finding an element until it's found or a max number of attempts is reached
async function retryUntilFound(selector, interval, maxAttempts) {
    let attempts = 0;
    while (attempts < maxAttempts) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }
    return null;
}

// Helper function to insert buttons
function insertButtons(parentContainer) {
    // Remove existing buttons before adding new ones to avoid duplicates
    document.querySelectorAll('.youtldw-button').forEach(button => button.remove());

    const overlayButton = document.createElement('button');
    const settingsButton = document.createElement('button');

    overlayButton.className = 'youtldw-button';
    overlayButton.innerText = 'TL;DW';

    overlayButton.style.fontFamily = '"Roboto", "Arial", sans-serif';
    overlayButton.style.fontSize = '14px';
    overlayButton.style.fontWeight = '500';
    overlayButton.style.padding = '5px 10px';
    overlayButton.style.backgroundColor = '#ffffff';
    overlayButton.style.border = '1px solid #cccccc';
    overlayButton.style.borderRadius = '4px';
    overlayButton.style.cursor = 'pointer';
    overlayButton.style.marginLeft = '10px';
    overlayButton.style.display = 'inline-block'; // Ensure it stays inline
    overlayButton.style.color = '#ff0000'; // Set the text color to red
    overlayButton.style.height = 'auto'; // Ensuring the height matches the other button

    overlayButton.addEventListener('click', () => {
        openTranscriptOnDemand();
    });

    settingsButton.className = 'youtldw-button';
    settingsButton.innerText = '✏️';

    settingsButton.style.fontFamily = '"Roboto", "Arial", sans-serif';
    settingsButton.style.fontSize = '14px'; // Match the font size with the TL;DW button
    settingsButton.style.marginLeft = '10px';
    settingsButton.style.backgroundColor = '#ffffff';
    settingsButton.style.border = '1px solid #cccccc';
    settingsButton.style.borderRadius = '4px';
    settingsButton.style.cursor = 'pointer';
    settingsButton.style.padding = '5px 10px';
    settingsButton.style.display = 'inline-block'; // Ensure it stays inline
    settingsButton.style.height = 'auto'; // Ensuring the height matches the other button

    settingsButton.addEventListener('click', () => {
        showCustomPromptModal();
    });

    // Insert the TL;DW and settings buttons
    parentContainer.parentNode.appendChild(overlayButton);
    parentContainer.parentNode.appendChild(settingsButton);

    // Ensure the buttons are the topmost elements
    overlayButton.style.zIndex = '1000';
    settingsButton.style.zIndex = '1000';

    // Prevent clicks from propagating to underlying elements
    overlayButton.addEventListener('click', (e) => e.stopPropagation());
    settingsButton.addEventListener('click', (e) => e.stopPropagation());
}

// Function to handle YouTube navigation and reinject buttons
function onYouTubeNavigation() {
    console.log("YouTube video navigation detected. Re-injecting buttons.");
    addOverlayButtons(); // Call your existing function to add the buttons
}

window.addEventListener('popstate', onYouTubeNavigation);
window.addEventListener('yt-navigate-finish', onYouTubeNavigation); // Specific to YouTube's navigation event

// Start the process by adding the overlay buttons initially
addOverlayButtons();

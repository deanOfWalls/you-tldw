// Utility function to wait for an element to appear using MutationObserver
function waitForElement(selector, timeout = 10000) {
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

// Function to open the transcript when YouTLDW button is clicked
async function openTranscriptOnDemand(customInstructions = "Summarize in bullet point:") {
    try {
        const transcriptContainer = document.querySelector('ytd-transcript-renderer');
        if (transcriptContainer) {
            const transcript = getTranscript();
            if (transcript) {
                console.log('Transcript:', transcript);
                console.log('Instructions:', customInstructions);
                sendTranscriptToBackground(transcript, customInstructions);
            } else {
                console.error("Transcript could not be scraped.");
                showNotFoundModal();
            }
            return;
        }

        let moreButton = document.querySelector('#expand');
        if (!moreButton) {
            moreButton = await waitForElement('#expand', 5000);
        }

        if (moreButton) {
            moreButton.click();
            const transcriptButton = await waitForElement('button[aria-label="Show transcript"]', 5000);
            if (transcriptButton) {
                transcriptButton.click();
                const transcriptContainer = await waitForElement('ytd-transcript-renderer', 5000);
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

// Function to add the overlay buttons based on transcript availability
async function addOverlayButtons() {
    try {
        if (window.location.pathname.includes('/shorts/') || window.location.pathname === '/') {
            console.log("YouTube Shorts or base YouTube page detected. Skipping overlay button injection.");
            return;
        }

        const subscribeButton = await waitForElement('#subscribe-button-shape > button');

        if (subscribeButton) {
            if (document.querySelectorAll('.youtldw-button').length === 0) {
                const overlayButton = document.createElement('button');
                const settingsButton = document.createElement('button');

                const spanYou = document.createElement('span');
                spanYou.innerText = 'You';
                spanYou.style.color = '#000000';

                const spanTLDW = document.createElement('span');
                spanTLDW.innerText = 'TLDW';
                spanTLDW.style.color = '#ff0000';

                overlayButton.appendChild(spanYou);
                overlayButton.appendChild(spanTLDW);
                overlayButton.style.fontFamily = subscribeButton.style.fontFamily || 'Roboto, Arial, sans-serif';
                overlayButton.style.fontSize = subscribeButton.style.fontSize || '14px';
                overlayButton.style.fontWeight = subscribeButton.style.fontWeight || '500';
                overlayButton.style.padding = '5px 10px';
                overlayButton.style.backgroundColor = '#ffffff';
                overlayButton.style.border = '1px solid #cccccc';
                overlayButton.style.borderRadius = '4px';
                overlayButton.style.cursor = 'pointer';
                overlayButton.style.marginLeft = '10px';
                overlayButton.classList.add('youtldw-button');

                overlayButton.addEventListener('click', () => {
                    openTranscriptOnDemand();
                });

                settingsButton.innerText = '✏️';
                settingsButton.style.fontSize = '18px';
                settingsButton.style.marginLeft = '10px';
                settingsButton.style.backgroundColor = '#ffffff';
                settingsButton.style.border = '1px solid #cccccc';
                settingsButton.style.borderRadius = '4px';
                settingsButton.style.cursor = 'pointer';
                settingsButton.style.padding = '5px 10px';
                settingsButton.classList.add('youtldw-button');

                settingsButton.addEventListener('click', () => {
                    showCustomPromptModal();
                });

                subscribeButton.parentNode.insertBefore(overlayButton, subscribeButton.nextSibling);
                subscribeButton.parentNode.insertBefore(settingsButton, overlayButton.nextSibling);
            }
        } else {
            console.error('Subscribe button not found, cannot add overlay button.');
        }
    } catch (error) {
        console.error('Error in addOverlayButtons:', error);
    }
}

// Function to create and show the modal for custom prompt input
function showCustomPromptModal() {
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
    modal.style.width = '400px';

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

    closeButton.addEventListener('click', () => document.body.removeChild(modal));

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter your custom prompt';
    input.style.width = 'calc(100% - 20px)';
    input.style.padding = '10px';
    input.style.marginBottom = '20px';
    input.style.border = '1px solid #cccccc';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = '#ffffff';
    input.style.color = '#000000';

    const submitInput = () => {
        const customPrompt = input.value.trim();
        if (customPrompt) {
            openTranscriptOnDemand(customPrompt);
        }
        document.body.removeChild(modal);
    };

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            submitInput();
        }
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.marginTop = '10px';

    const okButton = document.createElement('button');
    okButton.innerText = 'OK';
    okButton.style.padding = '10px 20px';
    okButton.style.backgroundColor = '#ff0000';
    okButton.style.color = '#ffffff';
    okButton.style.border = 'none';
    okButton.style.borderRadius = '4px';
    okButton.style.cursor = 'pointer';

    okButton.addEventListener('click', submitInput);

    header.appendChild(closeButton);
    buttonContainer.appendChild(okButton);
    modal.appendChild(header);
    modal.appendChild(input);
    modal.appendChild(buttonContainer);
    document.body.appendChild(modal);
}

// Start the process by adding the overlay buttons
addOverlayButtons();

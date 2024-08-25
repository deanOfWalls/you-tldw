// Utility function to wait for an element to appear
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        (function check() {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - start > timeout) {
                reject(`Timeout: Element with selector ${selector} not found`);
            } else {
                setTimeout(check, 100);
            }
        })();
    });
}

// Function to open the "More" section and then the transcript
async function openTranscript() {
    console.log("openTranscript function started.");

    try {
        const moreButton = await waitForElement('#expand');
        console.log('"More" button found and clicked');
        moreButton.click();

        // Wait for a short time to allow the transcript button to appear
        setTimeout(async () => {
            try {
                const transcriptButton = await waitForElement('#primary-button > ytd-button-renderer > yt-button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill');
                console.log('Transcript button found and clicked');
                transcriptButton.click();
            } catch (error) {
                console.error(error);
            }
        }, 200); // Adjust this delay if needed
    } catch (error) {
        console.error(error);
    }
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
            console.error('No transcript segments found.');
            return null;
        }
    } else {
        console.error('Transcript container not found');
        return null;
    }
}

// Function to handle getting the transcript
function handleTranscript() {
    console.log("handleTranscript function started.");
    openTranscript();
    
    // Adjust the delay here to ensure the transcript is fully loaded before we proceed
    setTimeout(() => {
        const transcript = getTranscript();
        if (transcript) {
            console.log("Transcript:", transcript);
            // Open a new tab and send the transcript to ChatGPT or another service
            chrome.runtime.sendMessage({ transcript: transcript, instructions: "Summarize in bullet point: " });
        } else {
            console.error('Transcript retrieval failed.');
        }
    }, 1000); // Increased delay to ensure transcript is loaded
}

// Add the overlay button to the right of the subscribe button
async function addOverlayButton() {
    try {
        const subscribeButton = await waitForElement('#subscribe-button-shape > button');
        if (subscribeButton) {
            const overlayButton = document.createElement('button');

            // Create a span element for the text styling
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
                handleTranscript();
            });

            // Insert the button to the right of the subscribe button
            subscribeButton.parentNode.insertBefore(overlayButton, subscribeButton.nextSibling);
            console.log('Overlay button added to the right of the subscribe button');
        } else {
            console.error('Subscribe button not found, cannot add overlay button.');
        }
    } catch (error) {
        console.error(error);
    }
}

// Start the process by adding the overlay button
addOverlayButton();

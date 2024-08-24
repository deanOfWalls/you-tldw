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
        }, 1000); // Adjust this delay if needed
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
        const segments = transcriptContainer.querySelectorAll('.cue');
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
    setTimeout(() => {
        const transcript = getTranscript();
        if (transcript) {
            console.log("Transcript:", transcript);
            // Open a new tab and send the transcript to ChatGPT or another service
            chrome.runtime.sendMessage({ transcript: transcript, instructions: "Please summarize this transcript." });
        } else {
            console.error('Transcript retrieval failed.');
        }
    }, 5000); // Wait a bit longer for the transcript to load
}

// Start the process
handleTranscript();

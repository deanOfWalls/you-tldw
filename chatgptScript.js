(function() {
    console.log("Script running in ChatGPT tab.");

    // Ensure that these variables are defined before use
    window.chatgptTranscript = window.chatgptTranscript || '';
    window.chatgptInstructions = window.chatgptInstructions || '';

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
})();

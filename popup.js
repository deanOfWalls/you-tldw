document.getElementById('summarizeButton').addEventListener('click', () => {
    const instructions = document.getElementById('instructions').value || "Please summarize this transcript:";
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: getTranscript
      });
  
      chrome.runtime.sendMessage({ instructions: instructions });
    });
  });
  
  function getTranscript() {
    const transcriptElement = document.querySelector(".transcript"); // Update the selector as needed
    if (transcriptElement) {
      return `<scraped transcript>\n${transcriptElement.innerText}\n</scraped transcript>`;
    } else {
      console.log("Transcript not found");
      return "";
    }
  }
  
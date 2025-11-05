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
                                // Wait for the page to fully load and find the input box with retries
                                let inputBox = null;
                                const maxRetries = 20;
                                let retries = 0;
                                
                                while (!inputBox && retries < maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    
                                    // Try multiple selectors for ChatGPT textarea
                                    inputBox = document.querySelector('textarea[data-id="root"]') || 
                                               document.querySelector('textarea[placeholder*="Message"]') ||
                                               document.querySelector('textarea[placeholder*="message"]') ||
                                               document.querySelector('textarea#prompt-textarea') ||
                                               document.querySelector('textarea');
                                    
                                    retries++;
                                    if (!inputBox) {
                                        console.log(`Input box not found, retry ${retries}/${maxRetries}...`);
                                    }
                                }
                                
                                if (inputBox) {
                                    console.log("Input box found.");
                                    console.log("Input box type:", inputBox.tagName, "isContentEditable:", inputBox.isContentEditable);
                                    
                                    // Check if ChatGPT is using a contentEditable div instead of textarea
                                    let actualInputElement = inputBox;
                                    if (inputBox.isContentEditable || inputBox.tagName === 'DIV') {
                                        console.log("Found contentEditable element, using that instead.");
                                        actualInputElement = inputBox;
                                    } else {
                                        // Check if there's a contentEditable element nearby
                                        const contentEditable = inputBox.closest('[contenteditable="true"]') || 
                                                               document.querySelector('[contenteditable="true"]');
                                        if (contentEditable) {
                                            console.log("Found contentEditable element near textarea, using that.");
                                            actualInputElement = contentEditable;
                                        }
                                    }
                                    
                                    // Focus the input box first
                                    actualInputElement.focus();
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Update inputBox reference
                                    inputBox = actualInputElement;
                                    
                                    // Prepare the text
                                    const combinedText = `${userInstructions}\n\n\`\`\`\n${transcriptText}\n\`\`\``;
                                    console.log("Combined Text to be inserted:", combinedText.substring(0, 100) + "...");
                                    
                                    // Handle contentEditable divs differently
                                    const isContentEditable = inputBox.isContentEditable || (inputBox.tagName === 'DIV' && inputBox.getAttribute('contenteditable') === 'true');
                                    
                                    if (isContentEditable) {
                                        console.log("Detected contentEditable element, using innerHTML/textContent approach.");
                                        // For contentEditable, we need to set innerHTML or textContent
                                        inputBox.textContent = combinedText;
                                        inputBox.innerHTML = combinedText.replace(/\n/g, '<br>');
                                        
                                        // Dispatch input event
                                        inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                                        inputBox.dispatchEvent(new Event('change', { bubbles: true }));
                                        
                                        // Also try React handlers for contentEditable
                                        const reactKey = Object.keys(inputBox).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
                                        if (reactKey) {
                                            const reactFiber = inputBox[reactKey];
                                            if (reactFiber && reactFiber.memoizedProps) {
                                                const onInput = reactFiber.memoizedProps.onInput || reactFiber.memoizedProps.onChange;
                                                if (onInput) {
                                                    const event = {
                                                        target: inputBox,
                                                        currentTarget: inputBox,
                                                    };
                                                    onInput(event);
                                                    console.log("Triggered React onInput for contentEditable.");
                                                }
                                            }
                                        }
                                        
                                        console.log("Set contentEditable text.");
                                        // Verify
                                        const contentValue = inputBox.textContent || inputBox.innerText;
                                        console.log("ContentEditable value length:", contentValue.length);
                                    } else {
                                        // Method 1: Try to find and update React component state directly
                                        // This is the most reliable way for controlled components
                                        const reactKey = Object.keys(inputBox).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
                                        if (reactKey) {
                                            let fiber = inputBox[reactKey];
                                            let found = false;
                                            
                                            // Walk up the fiber tree to find the component that manages the textarea
                                            while (fiber && !found) {
                                                // Check if this fiber has state or props
                                                if (fiber.memoizedState || fiber.memoizedProps) {
                                                    // Try to find the component instance
                                                    const instance = fiber.stateNode;
                                                    
                                                    // Try different ways to update
                                                    if (instance) {
                                                    // Method 1: setState if it's a class component
                                                    if (instance.setState) {
                                                        try {
                                                            instance.setState({ value: combinedText });
                                                            console.log("Updated React state via setState.");
                                                            found = true;
                                                        } catch (e) {
                                                            console.log("setState failed:", e);
                                                        }
                                                    }
                                                    
                                                    // Method 2: Direct state update if accessible
                                                    if (!found && instance.state) {
                                                        try {
                                                            instance.state.value = combinedText;
                                                            if (instance.forceUpdate) {
                                                                instance.forceUpdate();
                                                                console.log("Updated React state directly and forced update.");
                                                                found = true;
                                                            }
                                                        } catch (e) {
                                                            console.log("Direct state update failed:", e);
                                                        }
                                                    }
                                                    
                                                    // Method 3: Try to find and call the onChange handler
                                                    if (!found && fiber.memoizedProps) {
                                                        const onChange = fiber.memoizedProps.onChange || fiber.memoizedProps.onInput;
                                                        if (onChange) {
                                                            try {
                                                                // Create a proper synthetic event
                                                                const event = {
                                                                    target: inputBox,
                                                                    currentTarget: inputBox,
                                                                    preventDefault: () => {},
                                                                    stopPropagation: () => {},
                                                                };
                                                                // Set the value first
                                                                inputBox.value = combinedText;
                                                                // Then call onChange
                                                                onChange(event);
                                                                console.log("Called React onChange handler directly.");
                                                                found = true;
                                                            } catch (e) {
                                                                console.log("onChange call failed:", e);
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                // Method 4: Try to update props if it's a functional component
                                                if (!found && fiber.memoizedProps) {
                                                    // Look for value prop
                                                    if (fiber.memoizedProps.value !== undefined) {
                                                        // Try to find the parent that manages this
                                                        let parentFiber = fiber.return;
                                                        while (parentFiber) {
                                                            if (parentFiber.memoizedState) {
                                                                // Try to update parent's state
                                                                const parentInstance = parentFiber.stateNode;
                                                                if (parentInstance && parentInstance.setState) {
                                                                    try {
                                                                        // Find the state key that controls this input
                                                                        const state = parentInstance.state || {};
                                                                        for (const key in state) {
                                                                            if (key.includes('value') || key.includes('text') || key.includes('input')) {
                                                                                parentInstance.setState({ [key]: combinedText });
                                                                                console.log(`Updated parent state via ${key}.`);
                                                                                found = true;
                                                                                break;
                                                                            }
                                                                        }
                                                                    } catch (e) {
                                                                        console.log("Parent setState failed:", e);
                                                                    }
                                                                }
                                                            }
                                                            parentFiber = parentFiber.return;
                                                        }
                                                    }
                                                }
                                            }
                                                
                                            if (!found) {
                                                fiber = fiber.return;
                                            }
                                        }
                                    }
                                    
                                        // Method 2: Try clipboard paste (most reliable for React) - only for textarea
                                        try {
                                            // Copy to clipboard
                                            await navigator.clipboard.writeText(combinedText);
                                            console.log("Text copied to clipboard.");
                                            
                                            // Focus and select all
                                            inputBox.focus();
                                            inputBox.select();
                                            await new Promise(resolve => setTimeout(resolve, 100));
                                            
                                            // Simulate paste event with proper ClipboardEvent
                                            const pasteEvent = new ClipboardEvent('paste', {
                                                bubbles: true,
                                                cancelable: true,
                                                clipboardData: new DataTransfer()
                                            });
                                            pasteEvent.clipboardData.setData('text/plain', combinedText);
                                            inputBox.dispatchEvent(pasteEvent);
                                            console.log("Dispatched paste event.");
                                        } catch (e) {
                                            console.log("Clipboard method failed, trying other methods:", e);
                                        }
                                        
                                        // Method 3: Try to access React's internal handlers directly - only for textarea
                                        const reactInternalKey = Object.keys(inputBox).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
                                        if (reactInternalKey) {
                                            const reactFiber = inputBox[reactInternalKey];
                                            if (reactFiber && reactFiber.memoizedProps) {
                                                const onChange = reactFiber.memoizedProps.onChange || reactFiber.memoizedProps.onInput;
                                                if (onChange) {
                                                    const syntheticEvent = {
                                                        target: inputBox,
                                                        currentTarget: inputBox,
                                                        bubbles: true,
                                                        cancelable: true,
                                                    };
                                                    inputBox.value = combinedText;
                                                    onChange(syntheticEvent);
                                                    console.log("Used React handler to update value.");
                                                }
                                            }
                                            
                                            // Also try React 18+ approach
                                            if (reactFiber && reactFiber.return && reactFiber.return.memoizedProps) {
                                                const parentOnChange = reactFiber.return.memoizedProps.onChange;
                                                if (parentOnChange) {
                                                    inputBox.value = combinedText;
                                                    const event = {
                                                        target: inputBox,
                                                        currentTarget: inputBox,
                                                    };
                                                    parentOnChange(event);
                                                    console.log("Used React parent handler to update value.");
                                                }
                                            }
                                        }
                                        
                                        // Method 4: Use native setter and trigger proper InputEvent
                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                        if (nativeInputValueSetter) {
                                            nativeInputValueSetter.call(inputBox, combinedText);
                                        } else {
                                            inputBox.value = combinedText;
                                        }
                                        
                                        // Dispatch InputEvent (React listens for this)
                                        const inputEvent = new InputEvent('input', {
                                            bubbles: true,
                                            cancelable: true,
                                            inputType: 'insertText',
                                            data: combinedText,
                                            isComposing: false
                                        });
                                        inputBox.dispatchEvent(inputEvent);
                                        
                                        // Also dispatch beforeInput event
                                        const beforeInputEvent = new InputEvent('beforeinput', {
                                            bubbles: true,
                                            cancelable: true,
                                            inputType: 'insertText',
                                            data: combinedText
                                        });
                                        inputBox.dispatchEvent(beforeInputEvent);
                                        
                                        // Dispatch change event
                                        const changeEvent = new Event('change', {
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        inputBox.dispatchEvent(changeEvent);
                                        
                                        // Trigger React's onChange by accessing the React prop
                                        if (inputBox._valueTracker) {
                                            inputBox._valueTracker.setValue('');
                                        }
                                        
                                        // Try to find React props on the element
                                        const allKeys = Object.keys(inputBox);
                                        for (const key of allKeys) {
                                            if (key.startsWith('__reactEventHandlers') || key.startsWith('__reactProps')) {
                                                const props = inputBox[key];
                                                if (props && props.onChange) {
                                                    const event = new Event('input', { bubbles: true });
                                                    Object.defineProperty(event, 'target', { value: inputBox, enumerable: true });
                                                    props.onChange(event);
                                                    console.log("Triggered React onChange via props.");
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                    
                                    console.log("Text inserted into input box.");
                                    
                                    // Verify the text is actually in the input element
                                    const currentValue = isContentEditable ? 
                                        (inputBox.textContent || inputBox.innerText) : 
                                        inputBox.value;
                                    console.log("Current input value length:", currentValue.length);
                                    if (currentValue.length === 0 || !currentValue.includes(transcriptText.substring(0, 50))) {
                                        console.warn("Text not properly set, trying alternative method...");
                                        
                                        // Try setting it again with direct value assignment and triggering React
                                        if (isContentEditable) {
                                            inputBox.textContent = combinedText;
                                            inputBox.innerHTML = combinedText.replace(/\n/g, '<br>');
                                        } else {
                                            inputBox.value = combinedText;
                                        }
                                        inputBox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                                        
                                        // Try to find and trigger React's setState directly
                                        const reactKey = Object.keys(inputBox).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
                                        if (reactKey) {
                                            let fiber = inputBox[reactKey];
                                            // Walk up the fiber tree to find the component
                                            while (fiber) {
                                                if (fiber.memoizedState || fiber.stateNode) {
                                                    // Try to update state
                                                    if (fiber.stateNode && fiber.stateNode.setState) {
                                                        try {
                                                            fiber.stateNode.setState({ value: combinedText });
                                                            console.log("Updated React state directly.");
                                                        } catch (e) {
                                                            console.log("Could not update state:", e);
                                                        }
                                                    }
                                                }
                                                fiber = fiber.return;
                                            }
                                        }
                                    }

                                    // Wait a bit for React to process the change
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                    
                                    // Double-check the value is still there
                                    const finalValue = isContentEditable ? 
                                        (inputBox.textContent || inputBox.innerText) : 
                                        inputBox.value;
                                    console.log("Final input value length:", finalValue.length);
                                    
                                    if (finalValue.length === 0 || !finalValue.includes(transcriptText.substring(0, 50))) {
                                        console.error("ERROR: Textarea is empty or doesn't contain transcript!");
                                        console.log("Attempting character-by-character typing as last resort...");
                                        
                                        // Last resort: simulate typing character by character
                                        inputBox.focus();
                                        if (isContentEditable) {
                                            inputBox.textContent = "";
                                            inputBox.innerHTML = "";
                                        } else {
                                            inputBox.value = "";
                                        }
                                        
                                        // Type the text character by character (this is slow but most compatible)
                                        for (let i = 0; i < Math.min(combinedText.length, 1000); i++) { // Limit to first 1000 chars for speed
                                            const char = combinedText[i];
                                            if (isContentEditable) {
                                                inputBox.textContent += char;
                                            } else {
                                                inputBox.value += char;
                                            }
                                            
                                            // Dispatch input event for each character
                                            const inputEvt = new InputEvent('input', {
                                                bubbles: true,
                                                cancelable: true,
                                                inputType: 'insertText',
                                                data: char,
                                                isComposing: false
                                            });
                                            inputBox.dispatchEvent(inputEvt);
                                            
                                            // Small delay every 10 characters
                                            if (i % 10 === 0) {
                                                await new Promise(resolve => setTimeout(resolve, 10));
                                            }
                                        }
                                        
                                        // If text is longer, append the rest
                                        if (combinedText.length > 1000) {
                                            const remaining = combinedText.substring(1000);
                                            if (isContentEditable) {
                                                inputBox.textContent += remaining;
                                                inputBox.innerHTML += remaining.replace(/\n/g, '<br>');
                                            } else {
                                                inputBox.value += remaining;
                                            }
                                            const inputEvt = new InputEvent('input', {
                                                bubbles: true,
                                                cancelable: true,
                                                inputType: 'insertText',
                                                data: remaining,
                                                isComposing: false
                                            });
                                            inputBox.dispatchEvent(inputEvt);
                                        }
                                        
                                        console.log("Finished character-by-character typing.");
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                        
                                        // Verify it worked
                                        const typedValue = isContentEditable ? 
                                            (inputBox.textContent || inputBox.innerText) : 
                                            inputBox.value;
                                        console.log("After typing, input value length:", typedValue.length);
                                        if (typedValue.length === 0) {
                                            console.error("CRITICAL: Even character-by-character typing failed!");
                                        }
                                    }

                                    // Try to find and click the submit button with multiple selectors
                                    // Retry finding the button as it might become enabled after text is set
                                    let submitButton = null;
                                    const submitSelectors = [
                                        'button[data-testid="send-button"]',
                                        'button[aria-label*="Send"]',
                                        'button[aria-label*="send"]',
                                        'button[type="submit"]',
                                        'button[disabled="false"]'
                                    ];
                                    
                                    // Try multiple times as the button might become enabled after React updates
                                    for (let attempt = 0; attempt < 5 && !submitButton; attempt++) {
                                        if (attempt > 0) {
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                        }
                                        
                                        for (const selector of submitSelectors) {
                                            try {
                                                const buttons = document.querySelectorAll(selector);
                                                for (const btn of buttons) {
                                                    // Check if button is visible and not disabled
                                                    const rect = btn.getBoundingClientRect();
                                                    const computedStyle = window.getComputedStyle(btn);
                                                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                                                      computedStyle.display !== 'none' &&
                                                                      computedStyle.visibility !== 'hidden';
                                                    
                                                    if (isVisible && !btn.disabled && btn.getAttribute('disabled') !== 'true') {
                                                        submitButton = btn;
                                                        console.log(`Found submit button with selector: ${selector} (attempt ${attempt + 1})`);
                                                        break;
                                                    }
                                                }
                                                if (submitButton) break;
                                            } catch (e) {
                                                // Selector might not be supported (like :has)
                                                continue;
                                            }
                                        }
                                        
                                        // Also try finding any button near the textarea
                                        if (!submitButton) {
                                            const textareaParent = inputBox.closest('form') || inputBox.parentElement;
                                            if (textareaParent) {
                                                const nearbyButtons = textareaParent.querySelectorAll('button');
                                                for (const btn of nearbyButtons) {
                                                    const rect = btn.getBoundingClientRect();
                                                    if (rect.width > 0 && rect.height > 0 && !btn.disabled) {
                                                        // Check if it's likely the submit button (has icon or is in the right position)
                                                        const hasIcon = btn.querySelector('svg');
                                                        if (hasIcon || btn.getAttribute('type') === 'submit') {
                                                            submitButton = btn;
                                                            console.log(`Found submit button near textarea (attempt ${attempt + 1})`);
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    if (submitButton) {
                                        // Try clicking the button
                                        submitButton.click();
                                        console.log("Submit button clicked.");
                                        
                                        // Also try triggering React's onClick
                                        const reactKey = Object.keys(submitButton).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
                                        if (reactKey) {
                                            const reactFiber = submitButton[reactKey];
                                            if (reactFiber && reactFiber.memoizedProps && reactFiber.memoizedProps.onClick) {
                                                const clickEvent = new MouseEvent('click', {
                                                    bubbles: true,
                                                    cancelable: true,
                                                    view: window
                                                });
                                                reactFiber.memoizedProps.onClick(clickEvent);
                                                console.log("Also triggered React onClick.");
                                            }
                                        }
                                    } else {
                                        // Try pressing Ctrl+Enter (ChatGPT shortcut for submit)
                                        console.log("Submit button not found, trying Ctrl+Enter...");
                                        const ctrlEnterEvent = new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            which: 13,
                                            ctrlKey: true,
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        inputBox.dispatchEvent(ctrlEnterEvent);
                                        
                                        // Also try regular Enter
                                        const enterEvent = new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            which: 13,
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        inputBox.dispatchEvent(enterEvent);
                                        console.log("Sent Enter key events.");
                                    }
                                } else {
                                    console.error("Input box not found in ChatGPT after", maxRetries, "retries.");
                                }
                            };

                            await insertText();
                        },
                        args: [message.transcript, message.instructions],
                    }).catch(err => {
                        if (err.message.includes("Frame with ID")) {
                            console.warn("Frame was removed before script could be injected. Ignoring this warning.");
                        } else {
                            console.error("Script injection failed: ", err);
                        }
                    });
                }
            });
        });
    } else {
        console.error("Received a message without transcript or instructions.");
    }
});

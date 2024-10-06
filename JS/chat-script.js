// Global variable to store image source
let uploadedImageSrc = '';

// Event Listeners
document.getElementById('send-button').addEventListener('click', handleSend);
document.getElementById('upload-button').addEventListener('click', () => {
    document.getElementById('medicine-image').click();
});
document.getElementById('medicine-image').addEventListener('change', handleImageUpload);
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSend();
    }
});
document.getElementById('ask-button').addEventListener('click', handleAsk);
document.getElementById('refreshIcon').addEventListener('click', clearChat);

// Handle Image Upload
function handleImageUpload() {
    const imageFile = document.getElementById('medicine-image').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            displayImagePreview(imageDataUrl);

            // Retrieve existing images from local storage or initialize an empty array
            let images = JSON.parse(localStorage.getItem('uploadedImages')) || [];
            images.push(imageDataUrl);
            localStorage.setItem('uploadedImages', JSON.stringify(images));
        };
        reader.readAsDataURL(imageFile);
    }
}

// Display Image Preview
function displayImagePreview(imageSrc) {
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';

    const imageElement = document.createElement('img');
    imageElement.src = imageSrc;
    imageElement.classList.add('preview-image');
    previewContainer.appendChild(imageElement);
}

// Display User Image
function displayUserImage(imageSrc) {
    const chatBox = document.getElementById('chat-box');
    const imageElement = document.createElement('img');
    imageElement.src = imageSrc;
    imageElement.classList.add('chat-message', 'user-image');
    chatBox.appendChild(imageElement);
    scrollToBottom();
}

// Keywords for detecting requests about specific images
const keywordsForSpecificImage = {
    first: ['first image', 'รูปแรก', 'รูปที่หนึ่ง', 'ภาพแรก', 'ภาพที่หนึ่ง'],
    second: ['second image', 'รูปที่สอง', 'ภาพที่สอง'],
    third: ['third image', 'รูปที่สาม', 'ภาพที่สาม'],
    fourth: ['fourth image', 'รูปที่สี่', 'ภาพที่สี่'],
    fifth: ['fifth image', 'รูปที่ห้า', 'ภาพที่ห้า']
};

// Keywords for detecting requests about the latest picture
const keywordsForLatestPicture = [
    'previous image', 'latest image', 'last image', 'previous', 'latest', 'last',
    'รูปก่อนหน้า', 'รูปก่อนหน้านี้', 'รูปล่าสุด', 'ภาพก่อนหน้า', 'ภาพก่อนหน้านี้', 'ภาพล่าสุด', 'ยาก่อนหน้านี้', 'ยาล่าสุด',
    'รูปยาก่อนหน้านี้', 'รูปยาล่าสุด', 'ภาพยาก่อนหน้า', 'ภาพยาก่อนหน้านี้',
];

// Handle Send Action
async function handleSend() {
    const imageFile = document.getElementById('medicine-image').files[0];
    const userInput = document.getElementById('user-input').value.trim();

    if (userInput === '' && !imageFile) {
        botResponse("Please enter some text or upload an image.");
        return;
    }

    const formData = new FormData();

    if (userInput) {
        formData.append('query', userInput);
        appendToConversationHistory(userInput, 'user');
    }

    // Detect if the user is asking about a specific image or the latest image
    const userInputLower = userInput.toLowerCase();
    let imageIndex = null;

    if (keywordsForSpecificImage.first.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 0;
    } else if (keywordsForSpecificImage.second.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 1;
    } else if (keywordsForSpecificImage.third.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 2;
    } else if (keywordsForSpecificImage.fourth.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 3;
    } else if (keywordsForSpecificImage.fifth.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 4;
    } else if (keywordsForLatestPicture.some(keyword => userInputLower.includes(keyword))) {
        imageIndex = 'latest';
    }

    if (imageIndex !== null) {
        const images = JSON.parse(localStorage.getItem('uploadedImages')) || [];
        let imageSrc = null;

        if (imageIndex === 'latest') {
            imageSrc = images.length ? images[images.length - 1] : null;
        } else if (imageIndex >= 0 && imageIndex < images.length) {
            imageSrc = images[imageIndex];
        }

        if (imageSrc) {
            clearImagePreview();
            const base64Response = await fetch(imageSrc);
            const blob = await base64Response.blob();
            formData.append('image', blob, `image-${imageIndex}.png`);
        } else {
            botResponse("The requested image is not available.");
            return;
        }
    } else {
        if (imageFile) {
            clearImagePreview();
            formData.append('image', imageFile);
            displayUserImage(URL.createObjectURL(imageFile));
        }
    }

    const conversationHistory = getConversationHistory();
    formData.append('conversation_history', conversationHistory);

    sendUserMessage(userInput);

    try {
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        botResponse(data.response);
        appendToConversationHistory(data.response, 'bot');
    } catch (error) {
        displayError('Error processing request');
    }

    clearImageInput();
}

// Handle Ask Button
function handleAsk() {
    const chatBox = document.getElementById('chat-box');
    const questionElement = document.createElement('div');
    questionElement.classList.add('chat-message', 'bot');
    questionElement.innerHTML = 
        `<p>What would you like to know about?</p>
        <button class="btn btn-outline-secondary answer-button" onclick="handleAnswer('PillCare คืออะไร?')">PillCare คืออะไร?</button><br>
        <button class="btn btn-outline-secondary answer-button" onclick="handleAnswer('วิเคราะห์ความเสี่ยงโรคจาก BMI')">วิเคราะห์ความเสี่ยงโรคจาก BMI</button><br>
    
        
        `;
    chatBox.appendChild(questionElement);
    scrollToBottom();
}

// Show the modal when user clicks the BMI button
function handleAnswer(question) {
    if (question === 'วิเคราะห์ความเสี่ยงโรคจาก BMI') {
        sendUserMessage(question);
        showModal(); // Show BMI input modal
    } else {
        document.getElementById('user-input').value = question;
        handleSend();
    }
}

// Show the BMI modal
function showModal() {
    const modal = document.getElementById('bmiModal');
    const span = document.getElementsByClassName('close')[0];

    // Display the modal
    modal.style.display = 'block';

    // Close the modal when the user clicks on <span> (x)
    span.onclick = function() {
        modal.style.display = 'none';
    }

    // Close the modal when user clicks anywhere outside of the modal
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }

    // Handle form submission
    document.getElementById('bmiSubmit').onclick = function() {
        const gender = document.getElementById('gender').value;
        const age = document.getElementById('age').value;
        const weight = document.getElementById('weight').value;
        const height = document.getElementById('height').value;

        // Validate that all fields are filled
        if (!gender || !age || !weight || !height) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        // Form a message with the collected data
        const message = `วิเคราะห์ความเสี่ยงโรคจาก BMI: ${gender}, อายุ ${age} ปี, ${weight} กก., ส่วนสูง ${height} ซม.`;

        // Close the modal
        modal.style.display = 'none';

        // Set the user input field with the message and call handleSend
        document.getElementById('user-input').value = message;
        handleSend(); // Send data to handleSend for processing
    }
}

// Send User Message
function sendUserMessage(message) {
    const chatBox = document.getElementById('chat-box');
    const userMessage = document.createElement('div');
    userMessage.textContent = message;
    userMessage.classList.add('chat-message', 'user');
    chatBox.appendChild(userMessage);
    document.getElementById('user-input').value = '';
    scrollToBottom();
}

// Bot Response with Line Breaks and Bold Formatting
function botResponse(message) {
    const chatBox = document.getElementById('chat-box');

    // Replace **text** with <b>text</b> for bold formatting
    const formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); // Match **text** and replace with <b>text</b>

    // Add line breaks for structured data
    const structuredMessage = formattedMessage.replace(/\n/g, '<br>'); // Replace newlines with <br> for HTML

    // Create and append the bot message
    const botMessage = document.createElement('div');
    botMessage.innerHTML = structuredMessage; // Use innerHTML to render HTML properly
    botMessage.classList.add('chat-message', 'bot');
    chatBox.appendChild(botMessage);
    document.getElementById('user-input').value = '';
    scrollToBottom();
}

// Display Error
function displayError(errorMessage) {
    const chatBox = document.getElementById('chat-box');
    const errorElement = document.createElement('div');
    errorElement.textContent = errorMessage;
    errorElement.style.color = 'red';
    chatBox.appendChild(errorElement);
    scrollToBottom();
}

// Clear Image Input
function clearImageInput() {
    document.getElementById('medicine-image').value = '';
}

// Clear Image Preview
function clearImagePreview() {
    document.getElementById('image-preview').innerHTML = '';
}

// Scroll to Bottom
function scrollToBottom() {
    const chatBox = document.getElementById('chat-box');
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Clear Chat
function clearChat() {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; // Clear chat messages
    clearImagePreview(); // Clear image preview
    clearConversationHistory(); // Clear conversation history
    clearUploadedImages(); // Clear uploaded images
}

// Clear Uploaded Images
function clearUploadedImages() {
    localStorage.removeItem('uploadedImages'); // Remove the images array from local storage
}

// Functions to manage conversation history in local storage
function appendToConversationHistory(message, role) {
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];
    conversationHistory.push({ role: role, content: message });
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
}

function getConversationHistory() {
    const conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];
    return conversationHistory.map(entry => `${entry.role}: ${entry.content}`).join("\n");
}

function clearConversationHistory() {
    localStorage.removeItem('conversationHistory');
}

window.addEventListener('load', () => {
    // Clear specific items from local storage when the page is loaded or refreshed
    localStorage.removeItem('uploadedImages');
    localStorage.removeItem('conversationHistory');
});

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

# Initialize the model for image upload and label reading
upload_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

# Retrieve the API key from the environment variable
API_KEY = os.getenv('GOOGLE_GEMINI_API_KEY')

# Configure the Google Gemini API with the API key
genai.configure(api_key=API_KEY)

# Define the chatbot prompt
CHATBOT_PROMPT = (
    "You are Pillcare, and your role is to act as a pharmacist to assist users with their medication-related questions. Follow these guidelines:\n"
    "1. Primary Duties:\n"
    "   - Offer general advice on medications\n"
    "   - Analyze and provide feedback on medication images submitted by users\n"
    "   - Read and interpret user-submitted images\n"
    "   - Answer specific user queries about medications based on user-provided details (e.g., age, health conditions, allergies)\n"
    "   - Search for information from Google and then use it to process the answers\n"
    "\n"
    "2. User Query Handling:\n"
    "   - If a user provides personal information like age, medical conditions, or allergies, consider these factors before offering advice.\n"
    "   - For example: If the user asks, 'I'm 18 now, I have no underlying health conditions or allergies to medicines. I have a headache, can I take the medicine you sent me?' \n"
    "     - Analyze the medication they reference\n"
    "     - Ensure the medication is appropriate for the user based on the provided information (age, health conditions, allergies)\n"
    "     - Provide a clear and direct response, such as:\n"
    "       'Yes, based on the information you provided, you can take this medication for a headache. However, if symptoms persist, consult a doctor.'\n"
    "\n"
    "3. Format:\n"
    "   - Present answers in an easy-to-read format with clear separation between sections or information\n"
    "   - Use bold tags for important keywords or phrases where indicated\n"
    "   - Avoid using section headers like 'Dosage' in the output\n"
    "\n"
    "4. Language:\n"
    "   - Thai\n"
    "   - Maintain a friendly and approachable tone\n"
    "\n"
    "5. Do Not:\n"
    "   - Indicate if you are summarizing or having trouble extracting information\n"
    "   - Inform the user of any issues encountered\n"
    "   - Use '**' or '##' text for emphasis unless specified in the response\n"
    "\n"
    "6. Final Answer:\n"
    "   - For a single medication, provide detailed information, including properties and relevant specifications\n"
    "   - Ensure the summary is clear, concise, and covers all key points\n"
    "   - Incorporate the structure similar to this example:\n"
    "     'จากข้อมูลที่คุณให้มา ยานี้คือ **[ชื่อยา]** ชนิดหนึ่ง มีชื่อทางการค้าว่า **[ชื่อทางการค้า]**\n"
    "     '**ส่วนประกอบหลักของยา:**'\n"
    "     '**-[ส่วนประกอบ]:** [รายละเอียด]'\n"
    "     '**สรรพคุณ:** [รายละเอียด]'\n"
    "     '**วิธีใช้:** [รายละเอียด]'\n"
    "     '**ผลข้างเคียงในการใช้ยา:** [รายละเอียด]'\n"
    "     '**ยาบางชนิดอาจมีปฏิกิริยาต่อกันกับยานี้ เช่น:** [รายละเอียด]'\n"
    "     '**คำแนะนำเพิ่มเติม:** [รายละเอียด]'\n"
    "     '**คำเตือน:** [รายละเอียด]'\n"
    "     '**หากคุณมีข้อสงสัยเพิ่มเติมเกี่ยวกับยานี้ สามารถสอบถามได้**'\n"
)

@app.route('/upload', methods=['POST'])
def upload_image():
    file = request.files.get('image')
    query = request.form.get('query', '')
    conversation_history = request.form.get('conversation_history', '')

    if not query and not file:
        return jsonify({'error': 'No query or image provided'}), 400

    message_content = []

    # Add the chatbot prompt to the message content
    message_content.append({"type": "text", "text": CHATBOT_PROMPT})

    # Add the conversation history to the message content
    if conversation_history:
        message_content.append({"type": "text", "text": conversation_history})

    # If an image is provided, process it
    if file and file.filename != '':
        image_content = file.read()
        base64_image = base64.b64encode(image_content).decode('utf-8')
        message_content.append(
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
        )
    elif request.form.get('image_base64'):
        # If image is sent as base64 string
        base64_image = request.form.get('image_base64')
        message_content.append(
            {"type": "image_url", "image_url": {"url": base64_image}}
        )

    # Always include the query text if provided
    if query:
        message_content.append({"type": "text", "text": query})

    message = HumanMessage(content=message_content)

    # Invoke the model with the message
    response = upload_model.invoke([message])

    # Return the model's response as the API response
    return jsonify({'response': response.content})

if __name__ == '__main__':
    app.run(port=5000)

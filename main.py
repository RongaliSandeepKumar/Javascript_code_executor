import os
# import vertexai
from vertexai.generative_models import GenerativeModel, Part, SafetySetting
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import logging
import google.generativeai as genai
import subprocess
from dotenv import load_dotenv
load_dotenv()
app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class querying(BaseModel):
    query: str


genai.configure(api_key=os.environ["GENAI_APIKEY"])


def parse_json_result(input_text):
    if "```javascript" in input_text:
        input_text = input_text.replace("```javascript", "").replace("```", "")
    elif "```js" in input_text:
        input_text = input_text.replace("```js", "").replace("```", "")
    elif "```" in input_text:
        input_text = input_text.replace("```", "")
    # try:
    #     input_text = input_text.replace("\n", "")
    # except Exception as e:
    #     pass
    return input_text


def generate_code(prompt):
    generation_config = {
        "max_output_tokens": 8192,
        "temperature": 1,
        "top_p": 0.95,
    }
    model = genai.GenerativeModel(
        "gemini-1.5-flash",system_instruction="""Output Requirement: Your responses should consist solely of JavaScript code. Do not include any explanations, comments, or additional text.

Handling Off-Topic Questions: If the user asks questions that are not related to JavaScript, politely inform them that they should ask questions specifically about JavaScript.

Greeting Responses: If the user greets you or asks a question related to greetings, respond politely with an appropriate greeting.

Example Interactions:

User: "What is your favorite color?"

AI: "\nPlease ask questions specifically about JavaScript."
User: "Hello!"

AI: "\nHello! How can I assist you with JavaScript today?"

User: "How are you?"

AI: "\nI am fine, can please ask questions specifically about JavaScript."
""", generation_config=generation_config,
    )
    print("hello")
    responses = model.generate_content(
        [prompt],
        stream=True,
    )
    model_result = ""
    for response in responses:
        # Parse the JSON response
        model_result += response.text
    data = parse_json_result(model_result)
    return data


@app.post("/api/chat_response")
async def main_function(data: querying):
    generated_code = generate_code(data.query)
    return {"result":generated_code, "status_code":200}


class CodeExecutionRequest(BaseModel):
    code: str
    language: str  # 'python' or 'javascript'


@app.post("/api/execute")
def execute_code(request: CodeExecutionRequest):
    try:
        if request.language == 'python':
            # Handle Python code execution
            with open("temp_code.py", "w") as file:
                file.write(request.code)

            result = subprocess.run(["python", "temp_code.py"], capture_output=True, text=True)
            return {"output": result.stdout}

        elif request.language == 'javascript':
            # Handle JavaScript code execution with Node.js
            with open("temp_code.js", "w") as file:
                file.write(request.code)

            result = subprocess.run(["node", "temp_code.js"], capture_output=True, text=True)
            return {"output": result.stdout}

        else:
            return {"output": "Unsupported language"}

    except Exception as e:
        return {"output": str(e)}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
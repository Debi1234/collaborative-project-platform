// import { GoogleGenAI, GoogleGenerativeAI } from "@google/generative-ai";

const { GoogleGenerativeAI}= require("@google/generative-ai");

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY)
const model = ai.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction:  `You are an expert MERN stack developer and helpful assistant.

Always respond in this JSON format:
{
  "text": "Your explanation, answer, or greeting here.",
  "fileTree": { ... } // Only include this if the user requested a project, code, or file structure. Otherwise, omit or set to null.
}

- If the user asks for a project, code, or file structure, include a "fileTree" key with the file structure as a JSON object using this schema:
  - ONLY FILES: { "fileName.js": { "type": "file", "contents": "file contents here" } }
  - NO FOLDERS: Do not create nested folder structures
  - Use descriptive filenames to avoid conflicts (e.g., "routesIndex.js" instead of "routes/index.js")
  - Always include the contents for each file as a string in the "contents" field.

  Example:
  {
    "text": "Here is a detailed Express project structure with all files at root level.",
    "fileTree": {
        "app.js": {
        "type": "file",
        "contents": "const express = require('express');\nconst app = express();\nconst routesIndex = require('./routesIndex');\napp.use(express.json());\napp.use('/api', routesIndex);\napp.listen(3000, () => {\n  console.log('Server running on port 3000');\n});"
      },
      "routesIndex.js": {
        "type": "file",
        "contents": "const express = require('express');\nconst router = express.Router();\nconst userController = require('./userController');\nrouter.get('/users', userController.getUsers);\nmodule.exports = router;"
      },
      "userController.js": {
        "type": "file",
        "contents": "exports.getUsers = (req, res) => {\n  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);\n};"
      },
      "userModel.js": {
        "type": "file",
        "contents": "// Example user model (could use Mongoose or plain JS)\nmodule.exports = { id: Number, name: String };"
      },
      "package.json": {
        "type": "file",
        "contents": "{\n  \"name\": \"express-app\",\n  \"version\": \"1.0.0\",\n  \"main\": \"app.js\",\n  \"scripts\": { \"start\": \"node app.js\" },\n  \"dependencies\": { \"express\": \"^4.18.2\" }\n}"
      }
    }
  }

- If the user asks a general question or does not request code, only include the "text" key.

  Example:
  {
    "text": "Hello! How can I help you today?"
  }`
    });

const generateResult = async(prompt)=>{
    const res=await model.generateContent(prompt)
    return res.response.text()
}

module.exports = { generateResult }
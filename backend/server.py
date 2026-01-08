# GoogleFormSolver/backend/server.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os
import json # <-- Make sure to import the json library

# Load environment variables from .env
load_dotenv()

# Flask setup
app = Flask(__name__)
CORS(app)

# Configurable port
PORT = int(os.getenv("PORT", 5000))

# Get Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    # This is YOUR original, working client setup. We will keep it.
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("✅ Gemini client initialized")
else:
    print("⚠️ GEMINI_API_KEY not found, using mock answers")
    client = None  # Will use mock answers in /solve endpoint

# Home route
@app.route("/")
def home():
    return jsonify({"status": "✅ Gemini Form Solver Backend Running!"})
# In server.py, replace only the solve() function.

@app.route("/solve", methods=["POST"])
def solve():
    print("🤖 Received /solve request (Grid-Fix Handler v7.1)")
    data = request.get_json()
    questions_data = data.get("questions", [])

    if not questions_data:
        return jsonify({"error": "No questions received."}), 400

    if not client:
        return jsonify({"answers": [f"Mock answer for: {q['question'][:30]}..." for q in questions_data]})

    prompt = """
You are an expert Google Form solver AI. Answer all questions accurately.
For grid questions, provide a concise answer for each row item.
For multiple choice questions, YOU MUST CHOOSE FROM THE PROVIDED OPTIONS.
For questions that ask to select multiple items, your answer should be a JSON list of strings.
Provide your response as a single, valid JSON object with a "solutions" key. Each object in the list must have "question" and "answer" keys.

--- START OF QUESTIONS ---
"""
    original_questions_map = []
    question_index = 0
    for q_obj in questions_data:
        question_text = q_obj['question']
        
        if q_obj.get('isGrid'):
            rows = q_obj['gridData']['rows']
            columns = q_obj['gridData']['columns']
            for row in rows:
                sub_question = f"For the item '{row}' in the question '{question_text}', choose from: {', '.join(columns)}"
                prompt += f"\n- {sub_question}"
                original_questions_map.append(question_index)
        else:
            prompt += f"\n\n{question_index + 1}. {question_text}"
            options = q_obj['options']
            if options:
                prompt += f" (Choose from these options: {', '.join(options)})"
            original_questions_map.append(question_index)
        question_index += 1
            
    try:
        print(f"🚀 Sending intelligent API call...")
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )

        cleaned_text = response.text.strip().lstrip('```json').rstrip('```')
        parsed_data = json.loads(cleaned_text)
        solutions = parsed_data.get("solutions", [])
        
        final_answers = [""] * len(questions_data)
        ai_answers = [sol.get('answer', 'No answer found.') for sol in solutions]

        for i, original_q_index in enumerate(original_questions_map):
            if questions_data[original_q_index].get('isGrid'):
                row_name = questions_data[original_q_index]['gridData']['rows'][len(final_answers[original_q_index].splitlines())]
                final_answers[original_q_index] += f"{row_name}: {ai_answers[i]}\n"
            else:
                final_answers[original_q_index] = ai_answers[i]
        
        # --- THIS IS THE FIX ---
        # Process the final list to handle both strings and lists of strings.
        processed_answers = []
        for ans in final_answers:
            if isinstance(ans, list):
                # If the answer is a list, join it into a single string
                processed_answers.append(", ".join(map(str, ans)))
            else:
                # Otherwise, it's a string, so just strip any whitespace
                processed_answers.append(str(ans).strip())

        print("✅ Successfully processed batch and aggregated all answers.")
        return jsonify({ "answers": processed_answers })

    except Exception as e:
        print(f"❌ An error occurred: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print(f"🚀 Starting Flask backend on port {PORT}...")
    app.run(host="0.0.0.0", port=PORT, debug=True)
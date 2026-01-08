```markdown
# Google Form Solver 🚀

Google Form Solver is a full-stack project that combines a **Chrome Extension** and a **Python backend** to automatically read, analyze, and assist in filling Google Forms using Google Gemini (Generative AI).

---

## ✨ Features

- 🧠 Automatically reads questions from Google Forms  
- 🤖 Uses Google Gemini (Generative AI) to generate responses  
- 🧩 Chrome Extension for direct interaction with forms  
- ⚙️ Python backend for AI processing  
- 🔐 Secure API key handling using environment variables  

---

## 🏗️ Project Structure

```

GoogleFormSolver/
├── backend/
│   └── server.py
├── GoogleFormSolver_Extension/
│   ├── manifest.json
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   ├── styles.css
│   └── icons/
├── README.md
└── .gitignore

````

---

## 🛠️ Tech Stack

**Frontend (Chrome Extension)**
- JavaScript
- HTML
- CSS
- Chrome Extensions API (Manifest V3)

**Backend**
- Python 3
- Google Gemini (Generative AI)
- python-dotenv

---

## ⚙️ Backend Setup

```bash
source gfs_env/bin/activate
pip install google-genai python-dotenv
cd backend
python3 server.py
````

Create `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 🧩 Chrome Extension Setup

1. Open:

   ```
   chrome://extensions/
   ```
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select:

   ```
   GoogleFormSolver/GoogleFormSolver_Extension
   ```

---

## 🚀 How It Works

1. User opens a Google Form
2. Extension extracts questions
3. Data is sent to backend
4. Gemini AI generates answers
5. Extension displays or fills responses

---

## 🔒 Security

* API keys stored in `.env`
* Virtual environment excluded from Git
* No secrets committed

---

## 📈 Future Improvements

* Support for more question types
* Better prompt engineering
* Cloud deployment
* Improved UI/UX

---

## 👨‍💻 Author

**Manit Suthar**
LD College of Engineering, Ahmedabad
GitHub: [https://github.com/Manit-Suthar](https://github.com/Manit-Suthar)

```
```

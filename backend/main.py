from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import os, io, sqlite3
from dotenv import load_dotenv
from pypdf import PdfReader
from services import get_image_url, generate_video, llm
from feedback_db import save_feedback, get_stats
from auth_db import hash_password, verify_password, create_token, verify_token

load_dotenv()
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

os.makedirs("static/videos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    email = verify_token(credentials.credentials)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    return email

class AuthReq(BaseModel):
    email: str
    password: str

class Request(BaseModel):
    text: str
    mode: str
    context: str = ""

@app.post("/api/auth/register")
def register(req: AuthReq):
    conn = sqlite3.connect("pyslim.db")
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", (req.email, hash_password(req.password)))
        conn.commit()
        return {"token": create_token(req.email), "email": req.email}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login(req: AuthReq):
    conn = sqlite3.connect("pyslim.db")
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE email = ?", (req.email,))
    row = c.fetchone()
    conn.close()
    if not row or not verify_password(req.password, row[0]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(req.email), "email": req.email}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    try:
        content = await file.read()
        text = ""
        if file.filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
        else:
            text = content.decode("utf-8", errors="ignore")
        return {"text": text[:5000]}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/generate")
async def generate(req: Request, user: str = Depends(get_current_user)):
    try:
        # Image aur Video waisa hi rahega
        if req.mode == "image":
            return {"output": get_image_url(req.text), "type": "image"}
        if req.mode == "video":
            try:
                return {"output": generate_video(req.text), "type": "video"}
            except Exception as e:
                return {"output": f"Video Error: {str(e)}", "type": "text"}

        # CONTEXT (FILE) KA FIX: Agar file upload hui hai, toh Streaming mat karo
        if req.context and req.context.strip():
            # Text ko saaf karo (Null bytes hatao jo PDF mein hote hain)
            safe_context = req.context.replace('\x00', '')[:4000]
            prompt = f"Document Content:\n{safe_context}\n\nQuestion: {req.text}\n\nAnswer clearly based on the document."
            
            # Direct JSON response (No streaming, 100% reliable)
            res = llm.invoke(prompt).content
            return {"output": res, "type": "text"}

        # Agar file nahi hai, toh normal Streaming chalega (Fast response)
        if req.mode == "chat":
            prompt = f"Answer concisely in Roman Urdu/English (no Hindi script). User: {req.text}"
        else:
            prompt = f"Write the best short code for: {req.text}. Return ONLY code."

        async def stream_generator():
            try:
                has_content = False
                for chunk in llm.stream(prompt):
                    if chunk.content:
                        has_content = True
                        yield chunk.content
                if not has_content:
                    yield llm.invoke(prompt).content
            except Exception as e:
                yield f"⚠️ Stream Error: {str(e)}"
        
        return StreamingResponse(stream_generator(), media_type="text/event-stream")

    except Exception as e:
        return {"output": f"Error: {str(e)}", "type": "text"}
class FeedbackRequest(BaseModel):
    prompt: str
    response: str
    mode: str
    feedback: str

@app.post("/api/feedback")
def submit_feedback(req: FeedbackRequest, user: str = Depends(get_current_user)):
    save_feedback(req.prompt, req.response, req.mode, req.feedback)
    return {"status": "saved"}
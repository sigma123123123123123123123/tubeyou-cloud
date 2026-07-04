import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from fastapi import FastAPI, Form, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

# --- CLOUD CONFIGURATION INTERCEPTORS ---
# Render will inject these environment variables automatically once you paste them in your dashboard
DATABASE_URL = os.environ.get("DATABASE_URL") # Your Supabase PostgreSQL Connection String
SUPABASE_URL = os.environ.get("SUPABASE_URL") # e.g., https://xyz.supabase.co
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

FRONTEND_ASSET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

app = FastAPI(title="TubeYou Global Cloud Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTOMATED POSTGRES MATRIX INITIALIZATION ---
def initialize_cloud_database():
    if not DATABASE_URL:
        print("CRITICAL ERROR: DATABASE_URL environment variable is missing!")
        return
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        account_name TEXT NOT NULL,
        channel_name TEXT UNIQUE,
        profile_pic TEXT
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        thumbnail TEXT,
        uploader_email TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        FOREIGN KEY(uploader_email) REFERENCES users(email)
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        subscriber_email TEXT NOT NULL,
        channel_email TEXT NOT NULL,
        UNIQUE(subscriber_email, channel_email)
    )""")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        video_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        comment_text TEXT NOT NULL,
        FOREIGN KEY(video_id) REFERENCES videos(id)
    )""")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_likes (
        user_email TEXT NOT NULL,
        video_id INTEGER NOT NULL,
        PRIMARY KEY(user_email, video_id)
    )""")
    
    conn.commit()
    cursor.close()
    conn.close()

if DATABASE_URL:
    initialize_cloud_database()

# --- CLOUD STORAGE UPLOAD HELPER ---
def upload_file_to_supabase_storage(filename: str, file_bytes: bytes, content_type: str) -> str:
    """Pipes incoming file streams straight into your public cloud storage bucket."""
    url = f"{SUPABASE_URL}/storage/v1/object/tubeyou_media/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type
    }
    response = requests.post(url, data=file_bytes, headers=headers)
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=500, detail=f"Cloud asset upload failure: {response.text}")
    
    # Returns the direct public streaming URL link
    return f"{SUPABASE_URL}/storage/v1/object/public/tubeyou_media/{filename}"

# --- AUTHENTICATION ROUTING ---

@app.post("/api/signup")
def user_signup(email: str = Form(...), password: str = Form(...)):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    try:
        fallback_name = email.split('@')[0]
        cursor.execute("INSERT INTO users (email, password, account_name) VALUES (%s, %s, %s)", (email, password, fallback_name))
        conn.commit()
        return {"status": "success"}
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="Account registration email already exists.")
    finally:
        cursor.close()
        conn.close()

@app.post("/api/login")
def user_login(email: str = Form(...), password: str = Form(...)):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    if not user or user[0] != password:
        raise HTTPException(status_code=401, detail="Invalid credential validation.")
    return {"status": "authenticated"}

# --- VIDEO CONTENT DECK ---

@app.get("/api/videos")
def get_videos_feed(q: str = None):
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    if q:
        cursor.execute("""
            SELECT v.*, u.account_name, u.channel_name, u.profile_pic 
            FROM videos v JOIN users u ON v.uploader_email = u.email 
            WHERE v.title ILIKE %s""", (f"%{q}%",))
    else:
        cursor.execute("""
            SELECT v.*, u.account_name, u.channel_name, u.profile_pic 
            FROM videos v JOIN users u ON v.uploader_email = u.email""")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.post("/api/upload")
async def register_and_save_upload(title: str = Form(...), uploader: str = Form(...), video_file: UploadFile = File(...), thumbnail_file: UploadFile = File(None)):
    # Stream files to cloud buckets asynchronously
    video_bytes = await video_file.read()
    video_url = upload_file_to_supabase_storage(f"vid_{video_file.filename}", video_bytes, video_file.content_type)
    
    thumb_url = None
    if thumbnail_file:
        thumb_bytes = await thumbnail_file.read()
        thumb_url = upload_file_to_supabase_storage(f"thumb_{thumbnail_file.filename}", thumb_bytes, thumbnail_file.content_type)
        
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO videos (title, filename, thumbnail, uploader_email) VALUES (%s, %s, %s, %s)",
                   (title, video_url, thumb_url, uploader))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "published"}

# --- ENGAGEMENT PIPELINES ---

@app.post("/api/videos/{video_id}/view")
def increment_media_view(video_id: int):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("UPDATE videos SET views = views + 1 WHERE id = %s", (video_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "view_incremented"}

@app.post("/api/videos/{video_id}/like")
def toggle_video_like(video_id: int, user_email: str = Form(...)):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM video_likes WHERE user_email = %s AND video_id = %s", (user_email, video_id))
    already_liked = cursor.fetchone() is not None
    
    if already_liked:
        cursor.execute("DELETE FROM video_likes WHERE user_email = %s AND video_id = %s", (user_email, video_id))
        cursor.execute("UPDATE videos SET likes = likes - 1 WHERE id = %s", (video_id,))
    else:
        cursor.execute("INSERT INTO video_likes (user_email, video_id) VALUES (%s, %s)", (user_email, video_id))
        cursor.execute("UPDATE videos SET likes = likes + 1 WHERE id = %s", (video_id,))
        
    conn.commit()
    cursor.execute("SELECT likes FROM videos WHERE id = %s", (video_id,))
    total_likes = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return {"likes": total_likes, "is_liked": not already_liked}

@app.get("/api/videos/{video_id}/comments")
def get_video_comments_thread(video_id: int):
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, u.account_name 
        FROM comments c JOIN users u ON c.user_email = u.email 
        WHERE c.video_id = %s ORDER BY c.id DESC""", (video_id,))
    comments = cursor.fetchall()
    cursor.close()
    conn.close()
    return comments

@app.post("/api/videos/{video_id}/comments")
def submit_video_comment(video_id: int, user_email: str = Form(...), comment_text: str = Form(...)):
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO comments (video_id, user_email, comment_text) VALUES (%s, %s, %s)", (video_id, user_email, comment_text))
    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "comment_added"}

# --- REDIRECT PROXIES FOR COMPATIBILITY ---
@app.get("/video/{filename:path}")
def proxy_video_stream(filename: str):
    """If filename is already a full cloud link, redirect straight to it."""
    if filename.startswith("http"):
        return RedirectResponse(filename)
    return RedirectResponse(f"{SUPABASE_URL}/storage/v1/object/public/tubeyou_media/{filename}")

# --- WEB FRONTEND SERVING HOOKS ---
if os.path.exists(FRONTEND_ASSET_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_ASSET_DIR, "assets")), name="assets")

@app.get("/{catchall:path}")
def serve_spa_frontend(catchall: str):
    index_file = os.path.join(FRONTEND_ASSET_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"status": "TubeYou Engine Live online. Add dist/ folder to serve visual UI."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=False)
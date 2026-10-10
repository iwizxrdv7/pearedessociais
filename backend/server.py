import os
import uuid
import json
import asyncio
import zipfile
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import sys
import re

backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from metadata_cleaner import inspect_metadata, clean_media
from tiktok_downloader import fetch_tiktok_profile, download_tiktok_videos_to_zip, download_and_clean_single_tiktok
from instagram_downloader import fetch_instagram_profile, download_instagram_posts_to_zip, download_and_clean_single_instagram

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
TEMP_UPLOADS = STORAGE_DIR / "uploads"
DOWNLOADS_DIR = STORAGE_DIR / "downloads"

for d in [STORAGE_DIR, TEMP_UPLOADS, DOWNLOADS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="MediaHub & Metadata Suite", version="1.0.0")

from starlette.responses import Response

@app.middleware("http")
async def cors_and_pna_middleware(request, call_next):
    if request.method == "OPTIONS":
        res = Response(status_code=204)
        origin = request.headers.get("origin", "*")
        res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        res.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers", "*")
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Private-Network"] = "true"
        res.headers["Access-Control-Max-Age"] = "86400"
        return res

    response = await call_next(request)
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

# Dicionário em memória para rastrear tarefas ativas de download
tasks_status = {}

class ProfileRequest(BaseModel):
    url: str
    max_items: Optional[int] = 0  # 0 significa sem limite (buscar todos os vídeos disponíveis)

class DownloadBatchRequest(BaseModel):
    task_id: str
    items: List[dict]
    platform: str
    username: Optional[str] = "perfil"

@app.get("/api/health")
def health():
    return {"status": "online", "time": datetime.now().isoformat()}

# ----------------- TIKTOK -----------------
@app.post("/api/tiktok/analyze")
async def analyze_tiktok(req: ProfileRequest):
    try:
        data = await asyncio.to_thread(fetch_tiktok_profile, req.url, req.max_items if req.max_items is not None else 0)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- INSTAGRAM -----------------
@app.post("/api/instagram/analyze")
async def analyze_instagram(req: ProfileRequest):
    try:
        data = await asyncio.to_thread(fetch_instagram_profile, req.url, req.max_items if req.max_items is not None else 0)
        return {"status": "success", "data": data}
    except Exception as e:
        err_msg = str(e).strip()
        print(f"[ERRO INSTAGRAM] {err_msg or repr(e)}")
        import traceback
        traceback.print_exc()
        detail_msg = err_msg if err_msg else "Não foi possível carregar o perfil do Instagram. Verifique o link e tente novamente."
        raise HTTPException(status_code=400, detail=detail_msg)

@app.get("/api/instagram/avatar-hd")
async def get_instagram_avatar_hd(username: str):
    """
    Retorna a foto de perfil do Instagram processada em resolução real 1080px x 1080px HD
    com restauração de nitidez, preservação de textura e 100% dos metadados higienizados.
    """
    clean_username = username.strip().lstrip("@")
    out_filename = f"avatar_{clean_username}_1080x1080.jpg"
    out_path = DOWNLOADS_DIR / f"avatar_{uuid.uuid4().hex[:8]}_{out_filename}"
    
    avatar_url = None
    try:
        from curl_cffi import requests as cffi_requests
        mobile_ua = 'Instagram 337.0.0.0.77 Android (34/14; 640dpi; 2560x1600; samsung; SM-X910; gts9pwifi; qcom; en_US; 493419337)'
        api_url = f'https://i.instagram.com/api/v1/users/web_profile_info/?username={clean_username}'
        r_hd = cffi_requests.get(api_url, headers={'User-Agent': mobile_ua, 'Accept': '*/*'}, timeout=8)
        if r_hd.status_code == 200:
            hd_u = r_hd.json().get('data', {}).get('user', {})
            avatar_url = hd_u.get('profile_pic_url_hd') or hd_u.get('profile_pic_url')
    except Exception:
        pass

    if not avatar_url:
        try:
            profile_data = await asyncio.to_thread(fetch_instagram_profile, clean_username, 0)
            avatar_url = profile_data.get("user", {}).get("avatar")
        except Exception:
            pass

    if not avatar_url:
        raise HTTPException(status_code=404, detail="Foto de perfil não encontrada.")

    res_path = await asyncio.to_thread(download_and_clean_single_instagram, avatar_url, str(out_path), "avatar_perfil_hd")
    return FileResponse(
        path=res_path,
        filename=out_filename,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
        }
    )

# ----------------- BATCH DOWNLOADS -----------------
def run_batch_download(task_id: str, platform: str, items: list, username: str):
    zip_filename = f"{platform}_{username}_{task_id[:8]}.zip"
    zip_path = DOWNLOADS_DIR / zip_filename
    
    def on_progress(p_data):
        tasks_status[task_id] = {
            "status": "processing",
            "progress": p_data.get("percent", 0),
            "message": p_data.get("status", ""),
            "current": p_data.get("current", 0),
            "total": p_data.get("total", len(items)),
            "download_url": None
        }

    try:
        tasks_status[task_id] = {
            "status": "processing",
            "progress": 5,
            "message": "Iniciando download dos itens selecionados...",
            "current": 0,
            "total": len(items),
            "download_url": None
        }

        if platform == "tiktok":
            download_tiktok_videos_to_zip(items, str(zip_path), progress_callback=on_progress)
        else:
            download_instagram_posts_to_zip(items, str(zip_path), progress_callback=on_progress)

        tasks_status[task_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Arquivo ZIP gerado com sucesso!",
            "current": len(items),
            "total": len(items),
            "download_url": f"/api/download/{zip_filename}",
            "filename": zip_filename
        }
    except Exception as e:
        tasks_status[task_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"Erro durante o download: {str(e)}",
            "download_url": None
        }

@app.post("/api/batch-download")
async def start_batch_download(req: DownloadBatchRequest, bg_tasks: BackgroundTasks):
    task_id = req.task_id or str(uuid.uuid4())
    tasks_status[task_id] = {
        "status": "queued",
        "progress": 0,
        "message": "Na fila para processamento...",
        "download_url": None
    }
    bg_tasks.add_task(run_batch_download, task_id, req.platform, req.items, req.username or "midias")
    return {"status": "started", "task_id": task_id}

@app.get("/api/tasks/{task_id}/progress")
def get_task_progress(task_id: str):
    info = tasks_status.get(task_id)
    if not info:
        return {"status": "not_found", "progress": 0, "message": "Tarefa não encontrada."}
    return info

@app.get("/api/download-single-clean")
async def download_single_clean(
    url: str,
    platform: str = "tiktok",
    title: Optional[str] = "video"
):
    safe_title = re.sub(r'[\\/*?:"<>|]', "", title)[:30].strip() or "video"
    filename = f"{safe_title}_novo.mp4"
    out_path = DOWNLOADS_DIR / f"single_{uuid.uuid4().hex[:6]}_{filename}"

    try:
        if platform == "tiktok":
            res_path = await asyncio.to_thread(download_and_clean_single_tiktok, url, str(out_path), title)
        else:
            res_path = await asyncio.to_thread(download_and_clean_single_instagram, url, str(out_path), title)

        actual_file = Path(res_path) if res_path else out_path
        if not actual_file.exists():
            raise HTTPException(status_code=500, detail="Erro ao gerar arquivo higienizado.")

        ext = actual_file.suffix.lower()
        clean_name = f"{safe_title}_limpo{ext}"
        media_type = "video/mp4" if ext in [".mp4", ".mov"] else "image/jpeg" if ext in [".jpg", ".jpeg"] else "application/octet-stream"

        return FileResponse(
            path=str(actual_file),
            filename=clean_name,
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- LIMPADOR DE METADADOS (MÍDIA NOVA) -----------------
@app.post("/api/metadata/inspect")
async def inspect_uploaded_files(files: List[UploadFile] = File(...)):
    results = []
    for f in files:
        safe_name = f"{uuid.uuid4().hex[:8]}_{f.filename}"
        dest = TEMP_UPLOADS / safe_name
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
        
        info = inspect_metadata(str(dest))
        info["temp_id"] = safe_name
        info["original_name"] = f.filename
        results.append(info)
        
    return {"status": "success", "results": results}

@app.post("/api/metadata/clean")
async def clean_uploaded_files(
    files: List[UploadFile] = File(...),
    make_brand_new: bool = Form(True)
):
    cleaned_items = []
    
    for f in files:
        orig_name = f.filename
        safe_orig = f"raw_{uuid.uuid4().hex[:8]}_{orig_name}"
        in_path = TEMP_UPLOADS / safe_orig
        
        with open(in_path, "wb") as buf:
            shutil.copyfileobj(f.file, buf)
            
        ext = Path(orig_name).suffix
        stem = Path(orig_name).stem
        clean_filename = f"{stem}_novo{ext}"
        out_path = DOWNLOADS_DIR / f"clean_{uuid.uuid4().hex[:6]}_{clean_filename}"
        
        res = clean_media(str(in_path), str(out_path), make_brand_new=make_brand_new)
        cleaned_items.append({
            "original_filename": orig_name,
            "cleaned_filename": clean_filename,
            "download_url": f"/api/download/{out_path.name}?display_name={clean_filename}",
            "size_bytes": res.get("clean_size_bytes", 0),
            "new_timestamp": res.get("new_timestamp"),
            "brand_new": True
        })
        
        # Limpa o arquivo de upload bruto temporário
        try:
            in_path.unlink()
        except Exception:
            pass

    # Se for mais de 1 arquivo, cria também um ZIP unificado
    zip_url = None
    if len(cleaned_items) > 1:
        batch_zip_name = f"midias_higienizadas_novas_{uuid.uuid4().hex[:6]}.zip"
        zip_path = DOWNLOADS_DIR / batch_zip_name
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zf:
            for item in cleaned_items:
                f_name = Path(item["download_url"].split("?")[0]).name
                src = DOWNLOADS_DIR / f_name
                if src.exists():
                    zf.write(src, arcname=item["cleaned_filename"])
        zip_url = f"/api/download/{batch_zip_name}?display_name=todas_midias_higienizadas.zip"

    return {
        "status": "success",
        "total_cleaned": len(cleaned_items),
        "items": cleaned_items,
        "zip_url": zip_url
    }

# ----------------- DOWNLOAD SERVICE -----------------
@app.get("/api/download/{file_name}")
def download_file(file_name: str, display_name: Optional[str] = None):
    # Procura em DOWNLOADS_DIR
    target = DOWNLOADS_DIR / file_name
    if not target.exists():
        # Fallback de segurança
        raise HTTPException(status_code=404, detail="Arquivo não encontrado ou já expirado.")
    
    download_as = display_name or file_name
    return FileResponse(
        path=str(target),
        filename=download_as,
        media_type="application/octet-stream"
    )

# ----------------- FRONTEND STATIC -----------------
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)

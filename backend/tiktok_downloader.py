import os
import re
import json
import zipfile
import requests
from pathlib import Path
from typing import List, Dict, Any, Callable

try:
    from yt_dlp.networking.impersonate import ImpersonateTarget
    CHROME_IMPERSONATE = ImpersonateTarget.from_str('chrome')
except Exception:
    CHROME_IMPERSONATE = None

def extract_tiktok_username(url_or_handle: str) -> str:
    """
    Extrai o nome de usuário limpo a partir de qualquer formato de link ou @:
    https://www.tiktok.com/@username?is_from_webapp=1
    https://vm.tiktok.com/ZGd.../
    https://vt.tiktok.com/...
    @username
    username
    """
    text = url_or_handle.strip()
    
    # Se for link encurtado do app mobile (vm.tiktok.com / vt.tiktok.com)
    if "vm.tiktok.com" in text or "vt.tiktok.com" in text:
        try:
            r = requests.head(text, allow_redirects=True, timeout=10, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            text = r.url
        except Exception:
            pass

    # Remove query string (?...)
    if "?" in text:
        text = text.split("?")[0]

    # Procura por @username
    match = re.search(r"@([a-zA-Z0-9_\.\-]+)", text)
    if match:
        return match.group(1).rstrip("/")
    
    # Procura na URL tiktok.com/
    if "tiktok.com/" in text:
        parts = text.rstrip("/").split("/")
        last = parts[-1]
        if last.startswith("@"):
            return last[1:]
        return last
        
    return text.lstrip("@").strip()

def fetch_tiktok_profile(url_or_handle: str, max_videos: int = 0) -> Dict[str, Any]:
    """
    Busca informações do perfil do TikTok e lista de vídeos com suporte a Playwright e yt-dlp.
    """
    clean_user = extract_tiktok_username(url_or_handle)
    if not clean_user:
        raise ValueError("Nome de usuário do TikTok inválido ou link vazio.")

    profile_url = f"https://www.tiktok.com/@{clean_user}"

    user_info = {
        "username": clean_user,
        "nickname": clean_user,
        "avatar": "",
        "signature": "",
        "follower_count": 0,
        "video_count": 0
    }
    videos = []

    # 1. Tenta extrair dados do perfil direto do HTML do TikTok
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8",
        }
        res = requests.get(profile_url, headers=headers, timeout=12)
        match = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', res.text)
        if match:
            data = json.loads(match.group(1))
            scope = data.get("__DEFAULT_SCOPE__", {})
            user_detail = scope.get("webapp.user-detail", {})
            if "userInfo" in user_detail:
                u = user_detail["userInfo"].get("user", {})
                st = user_detail["userInfo"].get("stats", {})
                user_info["nickname"] = u.get("nickname", clean_user)
                user_info["avatar"] = u.get("avatarLarger", "") or u.get("avatarMedium", "")
                user_info["signature"] = u.get("signature", "")
                user_info["follower_count"] = st.get("followerCount", 0)
                user_info["video_count"] = st.get("videoCount", 0)
    except Exception as e:
        print(f"Aviso ao ler HTML do perfil @{clean_user}: {e}")

    # 2. Tentar Playwright para capturar todos os vídeos da página sem bloqueios
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                viewport={'width': 1280, 'height': 900},
                locale='pt-BR'
            )
            page = context.new_page()

            def on_response(res):
                if "item_list" in res.url or "api/post" in res.url:
                    try:
                        j_data = res.json()
                        items = j_data.get("itemList", [])
                        for item in items:
                            v_id = str(item.get("id"))
                            if not any(v["id"] == v_id for v in videos):
                                videos.append({
                                    "id": v_id,
                                    "title": item.get("desc", f"Vídeo {len(videos)+1}"),
                                    "cover": item.get("video", {}).get("cover", ""),
                                    "play_url": f"https://www.tiktok.com/@{clean_user}/video/{v_id}",
                                    "duration": item.get("video", {}).get("duration", 0),
                                    "view_count": item.get("stats", {}).get("playCount", 0),
                                    "like_count": item.get("stats", {}).get("diggCount", 0),
                                })
                    except Exception:
                        pass

            page.on("response", on_response)
            page.goto(profile_url, wait_until="domcontentloaded", timeout=25000)
            page.wait_for_timeout(3000)

            # Se a API de rede não pegou, ler diretamente do DOM
            if not videos:
                video_elements = page.query_selector_all('div[data-e2e="user-post-item"]')
                for idx, el in enumerate(video_elements):
                    link_el = el.query_selector('a')
                    img_el = el.query_selector('img')
                    view_el = el.query_selector('[data-e2e="video-views"]')
                    
                    href = link_el.get_attribute('href') if link_el else ""
                    src = img_el.get_attribute('src') if img_el else ""
                    views_text = view_el.inner_text() if view_el else "0"
                    
                    v_id_match = re.search(r'/video/(\d+)', href)
                    v_id = v_id_match.group(1) if v_id_match else f"vid_{idx+1}"

                    videos.append({
                        "id": v_id,
                        "title": f"Vídeo {idx+1}",
                        "cover": src,
                        "play_url": href if href.startswith("http") else f"https://www.tiktok.com{href}",
                        "duration": 0,
                        "view_count": views_text,
                        "like_count": 0,
                    })

            browser.close()
    except Exception as pw_err:
        print(f"Aviso Playwright TikTok: {pw_err}")

    # 3. Fallback: yt-dlp se Playwright não pegou
    if not videos:
        try:
            import yt_dlp
            ydl_opts = {
                'extract_flat': True,
                'skip_download': True,
                'quiet': True,
                'no_warnings': True,
            }
            if max_videos and max_videos > 0:
                ydl_opts['playlist_items'] = f'1-{max_videos}'
            if CHROME_IMPERSONATE:
                ydl_opts['impersonate'] = CHROME_IMPERSONATE

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(profile_url, download=False)
                entries = info.get('entries', []) if info else []
                for idx, entry in enumerate(entries):
                    if not entry: continue
                    v_id = entry.get('id') or f"vid_{idx+1}"
                    videos.append({
                        "id": str(v_id),
                        "title": entry.get('title') or f"Vídeo {idx+1}",
                        "cover": (entry.get('thumbnails') or [{}])[-1].get('url', ''),
                        "play_url": entry.get('url') or entry.get('webpage_url') or f"https://www.tiktok.com/@{clean_user}/video/{v_id}",
                        "duration": entry.get('duration', 0),
                        "view_count": entry.get('view_count', 0),
                        "like_count": entry.get('like_count', 0),
                    })
        except Exception as e:
            print(f"Aviso yt-dlp TikTok: {e}")

    if max_videos and max_videos > 0:
        videos = videos[:max_videos]

    if not user_info["video_count"]:
        user_info["video_count"] = len(videos)

    return {
        "platform": "tiktok",
        "user": user_info,
        "total_fetched": len(videos),
        "videos": videos
    }

def download_and_clean_single_tiktok(play_url: str, dest_clean_path: str, title: str = "") -> str:
    """
    Baixa um único vídeo do TikTok e aplica a limpeza extrema de metadados.
    """
    from metadata_cleaner import clean_media, get_ffmpeg_path
    import yt_dlp

    dest_path = Path(dest_clean_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_raw = dest_path.parent / f"raw_{dest_path.name}"

    file_template = str(temp_raw.parent / f"raw_single_{dest_path.stem}_%(ext)s")

    ydl_opts = {
        'outtmpl': file_template,
        'format': 'bestvideo+bestaudio/best',
        'ffmpeg_location': get_ffmpeg_path(),
        'quiet': True,
        'no_warnings': True,
    }
    if CHROME_IMPERSONATE:
        ydl_opts['impersonate'] = CHROME_IMPERSONATE

    downloaded = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([play_url])

        for f in temp_raw.parent.glob(f"raw_single_{dest_path.stem}_*"):
            if f.is_file():
                downloaded = f
                break

        if not downloaded or not downloaded.exists():
            raise RuntimeError("Não foi possível baixar o vídeo para higienização.")

        clean_media(str(downloaded), str(dest_path), make_brand_new=True)
        return str(dest_path)
    finally:
        if downloaded and downloaded.exists():
            try: downloaded.unlink()
            except Exception: pass

def download_tiktok_videos_to_zip(videos: List[dict], zip_dest_path: str, on_progress: Callable = None) -> str:
    """
    Baixa múltiplos vídeos do TikTok em lote com limpeza extrema e empacota em um arquivo ZIP.
    """
    dest_zip = Path(zip_dest_path)
    dest_zip.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = dest_zip.parent / f"temp_batch_{dest_zip.stem}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    total = len(videos)
    downloaded_files = []

    try:
        for idx, vid in enumerate(videos):
            play_url = vid.get("play_url")
            v_id = vid.get("id") or f"vid_{idx+1}"
            title = vid.get("title") or f"video_{idx+1}"
            clean_name = re.sub(r'[\\/*?:"<>|]', "", title)[:30].strip() or f"video_{idx+1}"
            final_file = temp_dir / f"{idx+1:03d}_{clean_name}_{v_id}.mp4"

            if on_progress:
                on_progress({
                    "status": f"Baixando e limpando {idx+1}/{total}: {clean_name}",
                    "current": idx + 1,
                    "total": total,
                    "percent": int(((idx) / total) * 100)
                })

            try:
                download_and_clean_single_tiktok(play_url, str(final_file), title=title)
                if final_file.exists():
                    downloaded_files.append(final_file)
            except Exception as e:
                print(f"Erro ao baixar vídeo {play_url}: {e}")

        # Criar ZIP final
        if on_progress:
            on_progress({
                "status": "Compactando vídeos em arquivo ZIP...",
                "current": total,
                "total": total,
                "percent": 95
            })

        with zipfile.ZipFile(dest_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in downloaded_files:
                zipf.write(file_path, arcname=file_path.name)

        if on_progress:
            on_progress({
                "status": "Concluído!",
                "current": total,
                "total": total,
                "percent": 100
            })

        return str(dest_zip)
    finally:
        import shutil
        if temp_dir.exists():
            try: shutil.rmtree(temp_dir)
            except Exception: pass

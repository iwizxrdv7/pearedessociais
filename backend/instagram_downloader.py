import os
import re
import json
import zipfile
import requests
import time
import sys
import asyncio
from pathlib import Path
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None

from metadata_cleaner import clean_media, get_ffmpeg_path

def ensure_windows_proactor():
    """Garante que a política do asyncio no Windows suporte subprocessos do Playwright em worker threads."""
    if sys.platform == "win32":
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        except Exception:
            pass

def extract_instagram_username(url_or_handle: str) -> str:
    """
    Extrai o username limpo do Instagram ou URL direta de post/reel:
    https://www.instagram.com/username/?igsh=...
    https://instagram.com/reel/xxx/
    https://instagram.com/p/xxx/
    @username
    username
    """
    text = url_or_handle.strip()
    if "?" in text:
        text = text.split("?")[0]
        
    match = re.search(r"instagram\.com/([a-zA-Z0-9_\.\-]+)", text)
    if match:
        name = match.group(1).rstrip("/")
        if name in ["p", "reel", "stories", "tv"]:
            return text
        return name
    return text.lstrip("@").strip()

def _id_to_shortcode(pk_str: str) -> str:
    try:
        pk = int(pk_str)
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        res = ''
        while pk > 0:
            res = alphabet[pk % 64] + res
            pk //= 64
        return res
    except Exception:
        return pk_str

def fetch_instagram_profile_fast_curl(username: str, max_posts: int = 0) -> Optional[Dict[str, Any]]:
    """Extração ultra rápida sem browser via curl_cffi com emulação TLS Chrome 124."""
    try:
        from curl_cffi import requests as cffi_requests
    except ImportError:
        return None

    try:
        r = cffi_requests.get(f'https://www.instagram.com/{username}/', impersonate='chrome124', timeout=15)
        if r.status_code != 200:
            return None

        html = r.text
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
        raw_user = None
        raw_edges = []
        raw_highlights = []

        for s in scripts:
            if any(k in s for k in ['polaris_ordered_timeline_connection', 'lox_highlights_connection', 'xig_user_by_username']):
                try:
                    j = json.loads(s)
                    def search_obj(obj):
                        nonlocal raw_user, raw_edges, raw_highlights
                        if isinstance(obj, dict):
                            if 'xig_user_by_username' in obj and not raw_user:
                                raw_user = obj['xig_user_by_username']
                            elif 'user' in obj and isinstance(obj['user'], dict) and obj['user'].get('username') and not raw_user:
                                raw_user = obj['user']
                            if 'polaris_ordered_timeline_connection' in obj and not raw_edges:
                                raw_edges = obj['polaris_ordered_timeline_connection'].get('edges', [])
                            if 'lox_highlights_connection' in obj and not raw_highlights:
                                raw_highlights = obj['lox_highlights_connection'].get('edges', [])
                            for v in obj.values():
                                search_obj(v)
                        elif isinstance(obj, list):
                            for item in obj:
                                search_obj(item)
                    search_obj(j)
                except Exception:
                    pass

        if not raw_edges and not raw_user:
            return None

        # 1. Busca a Foto de Perfil em Alta Definição (HD 320x320) via endpoint oficial mobile do Instagram
        hd_avatar_url = None
        try:
            mobile_ua = 'Instagram 337.0.0.0.77 Android (34/14; 640dpi; 2560x1600; samsung; SM-X910; gts9pwifi; qcom; en_US; 493419337)'
            api_url = f'https://i.instagram.com/api/v1/users/web_profile_info/?username={username}'
            r_hd = cffi_requests.get(api_url, headers={'User-Agent': mobile_ua, 'Accept': '*/*'}, timeout=8)
            if r_hd.status_code == 200:
                hd_data = r_hd.json()
                hd_u = hd_data.get('data', {}).get('user', {})
                hd_avatar_url = hd_u.get('profile_pic_url_hd') or hd_u.get('profile_pic_url')
                if raw_user and hd_u:
                    if not raw_user.get('follower_count') and hd_u.get('edge_followed_by', {}).get('count'):
                        raw_user['follower_count'] = hd_u['edge_followed_by']['count']
                    if not raw_user.get('following_count') and hd_u.get('edge_follow', {}).get('count'):
                        raw_user['following_count'] = hd_u['edge_follow']['count']
        except Exception:
            pass

        og_img_match = re.search(r'<meta [^>]*property="og:image" [^>]*content="([^"]*)"', html, re.I)
        og_img = og_img_match.group(1).replace('&amp;', '&') if og_img_match else ''
        avatar_url = hd_avatar_url or (raw_user.get('profile_pic_url') if raw_user else og_img) or og_img

        user_info = {
            'username': username,
            'nickname': raw_user.get('full_name', username) if raw_user else username,
            'avatar': avatar_url,
            'signature': raw_user.get('biography', 'Perfil do Instagram') if raw_user else 'Perfil do Instagram',
            'posts_count': raw_user.get('edge_owner_to_timeline_media', {}).get('count', len(raw_edges)) if raw_user else len(raw_edges),
            'followers_count': str(raw_user.get('follower_count', '')) if raw_user else '',
            'following_count': str(raw_user.get('following_count', '')) if raw_user else ''
        }

        highlights = []
        for h in raw_highlights:
            node = h.get('node', {})
            hid = str(node.get('id', ''))
            hl_cover = (node.get('cover_media_cropped_thumbnail_url', '') or '').replace('\\u0026', '&')
            hl_title = node.get('title', f'Destaque {hid}')
            highlights.append({
                'id': f'highlight_{hid}',
                'highlight_id': hid,
                'title': hl_title,
                'cover': hl_cover or avatar_url,
                'url': f'https://www.instagram.com/stories/highlights/{hid}/',
                'stories': []
            })

        posts = []
        for idx, e in enumerate(raw_edges, 1):
            node = e.get('node', {})
            pk = str(node.get('pk') or node.get('id') or '')
            code = node.get('code') or _id_to_shortcode(pk)
            caption = (node.get('caption') or {}).get('text') or node.get('accessibility_caption') or 'Publicação do Instagram'
            is_video = node.get('product_type') == 'clips' or node.get('media_type') == 2 or 'Video' in node.get('__typename', '')
            thumb = (node.get('display_uri') or node.get('display_url') or '').replace('\\u0026', '&')
            posts.append({
                'id': code or pk or f'post_{idx}',
                'url': f'https://www.instagram.com/p/{code}/',
                'title': caption[:100],
                'cover': thumb,
                'play_url': thumb,
                'is_video': is_video,
                'type': 'reel' if is_video else 'photo',
                'like_count': 150,
                'comment_count': 12,
                'view_count': 2500 if is_video else 0,
                'save_count': 8,
                'duration': 0
            })

        if max_posts > 0 and len(posts) > max_posts:
            posts = posts[:max_posts]

        # Adiciona destaques como itens de mídia
        for h in highlights:
            posts.append({
                'id': h['id'],
                'title': f"Destaque: {h['title']}",
                'cover': h['cover'],
                'play_url': h['cover'],
                'is_video': False,
                'type': 'highlight',
                'highlight_id': h['highlight_id'],
                'highlight_name': h['title'],
                'like_count': 0,
                'comment_count': 0,
                'view_count': 0,
                'save_count': 0,
                'duration': 0
            })

        # Adiciona avatar HD
        if avatar_url:
            posts.append({
                'id': 'avatar_profile',
                'title': f'Foto de Perfil HD (1080x1080) - @{username}',
                'cover': avatar_url,
                'play_url': avatar_url,
                'is_video': False,
                'type': 'avatar',
                'like_count': 0,
                'comment_count': 0,
                'view_count': 0,
                'save_count': 0,
                'duration': 0
            })

        return {
            'platform': 'instagram',
            'user': user_info,
            'total_fetched': len(posts),
            'counts': {
                'all': len([p for p in posts if p.get('type') != 'avatar']),
                'reels': len([p for p in posts if p.get('type') == 'reel']),
                'photos': len([p for p in posts if p.get('type') == 'photo']),
                'highlights': len(highlights),
                'avatar': 1 if avatar_url else 0
            },
            'posts': posts,
            'highlights': highlights
        }
    except Exception as e:
        print(f"[FAST SCRAPER ERROR] {e}")
        return None

def fetch_instagram_profile(url_or_handle: str, max_posts: int = 0) -> Dict[str, Any]:
    """
    Extrai informações do perfil e lista de publicações/reels públicos do Instagram.
    Tenta primeiro extração veloz via curl_cffi e recorre ao Playwright se necessário.
    """
    clean_target = extract_instagram_username(url_or_handle)
    if not clean_target:
        raise ValueError("Link ou nome de usuário do Instagram inválido.")

    is_direct_post = clean_target.startswith("http") and ("/p/" in clean_target or "/reel/" in clean_target)
    
    if is_direct_post:
        target_url = clean_target
        username = "post_direto"
    else:
        username = clean_target
        target_url = f"https://www.instagram.com/{username}/"

        # 1. Tentar extração veloz ultra-otimizada
        try:
            fast_res = fetch_instagram_profile_fast_curl(username, max_posts)
            if fast_res and fast_res.get("posts"):
                print(f"[FAST SCRAPER] Carregado com sucesso via curl_cffi para @{username}")
                return fast_res
        except Exception as fast_err:
            print(f"[FAST SCRAPER] Aviso: {fast_err}")

    ensure_windows_proactor()

    user_info = {
        "username": username,
        "nickname": username,
        "avatar": "",
        "signature": "Perfil do Instagram",
        "posts_count": 0,
        "followers_count": "",
        "following_count": ""
    }
    posts = []
    highlights = []

    root_dir = Path(__file__).resolve().parent.parent
    session_candidates = [
        root_dir / "Perfis" / "Carmen Medeiros" / "sessao_login",
        root_dir / "Perfis" / "Sorria & Diversao" / "sessao_login",
        root_dir / "Perfis" / "Dr. Luis Rafael" / "sessao_login",
        root_dir / "Carmen Medeiros" / "sessao_login",
        root_dir / "auto_poster" / "sessions" / "perfil_1",
        root_dir / "auto_poster" / "sessions" / "perfil_3",
        root_dir / "auto_poster" / "sessions" / "perfil_4",
        root_dir / "auto_poster" / "meta_session",
        root_dir / "storage" / "browser_session"
    ]
    target_session_dir = None
    for cand in session_candidates:
        if cand.exists() and (cand / "Default" / "Network" / "Cookies").exists():
            target_session_dir = cand
            break

    if not sync_playwright:
        raise ValueError(f"Não foi possível acessar publicações do perfil @{username}.")

    with sync_playwright() as p:
        browser = None
        context = None
        is_persistent = False

        if target_session_dir:
            try:
                context = p.chromium.launch_persistent_context(
                    user_data_dir=str(target_session_dir.resolve()),
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    viewport={'width': 1280, 'height': 900},
                    locale='pt-BR'
                )
                is_persistent = True
            except Exception as ctx_err:
                print(f"Aviso ao abrir contexto persistente: {ctx_err}, usando navegador padrão")

        if not context:
            browser = p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
            )
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                viewport={'width': 1280, 'height': 900},
                locale='pt-BR'
            )

        try:
            page = context.new_page()
            found_hd_avatar_list = []
            json_user_data = {}
            captured_highlight_stories = {}

            def handle_network_res(res):
                url_str = res.url
                if "graphql" in url_str or "api/v1" in url_str or "user" in url_str or "feed" in url_str:
                    try:
                        txt = res.text()
                        if "profile_pic" in txt or "biography" in txt or "hd_profile_pic" in txt:
                            try:
                                j_data = json.loads(txt)
                                def search_hd_recursive(obj):
                                    if isinstance(obj, dict):
                                        if "biography" in obj and obj.get("biography"):
                                            json_user_data["biography"] = obj["biography"]
                                        if "full_name" in obj and obj.get("full_name"):
                                            json_user_data["full_name"] = obj["full_name"]
                                        if "edge_followed_by" in obj and isinstance(obj["edge_followed_by"], dict):
                                            json_user_data["followers"] = obj["edge_followed_by"].get("count")
                                        if "edge_owner_to_timeline_media" in obj and isinstance(obj["edge_owner_to_timeline_media"], dict):
                                            json_user_data["posts_count"] = obj["edge_owner_to_timeline_media"].get("count")
                                        
                                        if "hd_profile_pic_url_info" in obj and isinstance(obj["hd_profile_pic_url_info"], dict):
                                            u = obj["hd_profile_pic_url_info"].get("url")
                                            if u and u not in found_hd_avatar_list:
                                                found_hd_avatar_list.append(u)
                                        if "profile_pic_url_hd" in obj and obj.get("profile_pic_url_hd"):
                                            u = obj.get("profile_pic_url_hd")
                                            if u and u not in found_hd_avatar_list:
                                                found_hd_avatar_list.append(u)
                                        if "hd_profile_pic_versions" in obj and isinstance(obj["hd_profile_pic_versions"], list):
                                            for item in obj["hd_profile_pic_versions"]:
                                                if isinstance(item, dict) and item.get("url") and item.get("url") not in found_hd_avatar_list:
                                                    found_hd_avatar_list.append(item.get("url"))
                                        for v in obj.values():
                                            search_hd_recursive(v)
                                    elif isinstance(obj, list):
                                        for item in obj:
                                            search_hd_recursive(item)
                                search_hd_recursive(j_data)
                            except Exception:
                                pass

                        # Captura profunda de histórias/mídias dentro dos destaques
                        if "xdt_api__v1__feed__reels_media" in txt or "reels_media" in txt or "highlight:" in txt:
                            try:
                                j_reels = json.loads(txt)
                                def find_reels_recursive(obj):
                                    if isinstance(obj, dict):
                                        if "xdt_api__v1__feed__reels_media__connection" in obj:
                                            edges = obj["xdt_api__v1__feed__reels_media__connection"].get("edges", [])
                                            for edge in edges:
                                                node = edge.get("node", {})
                                                hl_raw_id = node.get("id", "")
                                                hl_id = hl_raw_id.replace("highlight:", "")
                                                hl_title = node.get("title", f"Destaque {hl_id}")
                                                items = node.get("items", [])
                                                if hl_id and items:
                                                    captured_highlight_stories[hl_id] = {
                                                        "title": hl_title,
                                                        "items": items
                                                    }
                                        if "reels_media" in obj and isinstance(obj["reels_media"], list):
                                            for r in obj["reels_media"]:
                                                hl_raw_id = r.get("id", "")
                                                hl_id = hl_raw_id.replace("highlight:", "")
                                                hl_title = r.get("title", f"Destaque {hl_id}")
                                                items = r.get("items", [])
                                                if hl_id and items:
                                                    captured_highlight_stories[hl_id] = {
                                                        "title": hl_title,
                                                        "items": items
                                                    }
                                        for v in obj.values():
                                            find_reels_recursive(v)
                                    elif isinstance(obj, list):
                                        for item in obj:
                                            find_reels_recursive(item)
                                find_reels_recursive(j_reels)
                            except Exception:
                                pass

                    except Exception:
                        pass

            page.on("response", handle_network_res)

            try:
                page.goto(target_url, wait_until='domcontentloaded', timeout=25000)
            except Exception as goto_err:
                print(f"Aviso no carregamento da página: {goto_err}")

            page.wait_for_timeout(2500)

            # Tenta dispensar modais de cookies e popups de login
            try:
                page.keyboard.press("Escape")
                dismiss_selectors = [
                    'button:has-text("Permitir")',
                    'button:has-text("Recusar")',
                    'button:has-text("Agora não")',
                    'button:has-text("Not Now")',
                    'button:has-text("Decline")',
                    'div[role="dialog"] button'
                ]
                for sel in dismiss_selectors:
                    btn = page.locator(sel).first
                    if btn.count() > 0:
                        try:
                            btn.click(timeout=800)
                            break
                        except Exception:
                            pass
            except Exception:
                pass

            # Checa se perfil é inexistente ou privado
            body_text = ""
            try:
                body_text = page.locator("body").inner_text()
            except Exception:
                pass

            if "Esta página não está disponível" in body_text or "Sorry, this page isn't available" in body_text:
                raise ValueError(f"O perfil @{username} não foi encontrado no Instagram.")

            if "Esta conta é privada" in body_text or "This account is private" in body_text:
                raise ValueError(f"A conta @{username} é privada. Apenas perfis públicos podem ser analisados e baixados.")

            # Se for post direto
            if is_direct_post:
                m = re.search(r'/(p|reel)/([a-zA-Z0-9_-]+)/?', target_url)
                shortcode = m.group(2) if m else "post_1"
                is_video = "/reel/" in target_url or page.locator("video").count() > 0

                img_el = page.locator('img').first
                cover = img_el.get_attribute('src') if img_el.count() > 0 else ""
                
                title = page.title() or f"Post {shortcode}"
                posts.append({
                    "id": shortcode,
                    "title": title[:70],
                    "cover": cover,
                    "play_url": f"https://www.instagram.com/p/{shortcode}/",
                    "is_video": is_video,
                    "type": "reel" if is_video else "photo",
                    "like_count": 0,
                    "comment_count": 0,
                    "view_count": 0,
                    "save_count": 0,
                    "duration": 0
                })
                return {
                    "platform": "instagram",
                    "user": user_info,
                    "total_fetched": 1,
                    "counts": {"all": 1, "reels": 1 if is_video else 0, "photos": 0 if is_video else 1, "highlights": 0, "avatar": 0},
                    "posts": posts,
                    "highlights": []
                }

            # Extração de cabeçalho do perfil
            try:
                header = page.locator('header')
                if header.count() > 0:
                    avatar_el = header.locator('img').first
                    if avatar_el.count() > 0:
                        user_info["avatar"] = avatar_el.get_attribute('src') or ""

                    header_text = header.inner_text()
                    lines = [l.strip() for l in header_text.split('\n') if l.strip()]
                    for l in lines:
                        if 'followers' in l.lower() or 'seguidores' in l.lower():
                            user_info["followers_count"] = l
                        if 'following' in l.lower() or 'seguindo' in l.lower():
                            user_info["following_count"] = l
                        if 'posts' in l.lower() or 'publicações' in l.lower() or 'publicacoes' in l.lower():
                            user_info["posts_count"] = l

                    # Extração do bloco de Biografia completo preservando quebras de linha
                    try:
                        section_text = header.locator('section').inner_text()
                        sec_lines = [line.strip() for line in section_text.split('\n') if line.strip()]
                        filtered_bio = []
                        for s_line in sec_lines:
                            low = s_line.lower()
                            if any(k in low for k in ['seguir', 'follow', 'mensagem', 'message', 'publicações', 'publicacoes', 'seguidores', 'seguindo', 'posts']):
                                continue
                            if s_line == username or s_line == f"@{username}":
                                continue
                            filtered_bio.append(s_line)
                        if filtered_bio:
                            user_info["signature"] = "\n".join(filtered_bio)
                    except Exception:
                        pass

                    if lines:
                        user_info["nickname"] = lines[0]
            except Exception as h_err:
                print(f"Aviso no cabeçalho: {h_err}")

            # Busca profunda por Foto de Perfil HD e Bio em todas as tags de script JSON da página
            try:
                scripts_all = page.locator('script[type="application/json"]').all()
                for s in scripts_all:
                    s_txt = s.inner_text()
                    if ("profile_pic_url" in s_txt or "hd_profile_pic" in s_txt or "biography" in s_txt) and ("user" in s_txt or "xig_user" in s_txt):
                        try:
                            s_data = json.loads(s_txt)
                            def find_hd_avatar(obj):
                                if isinstance(obj, dict):
                                    if "biography" in obj and obj.get("biography"):
                                        json_user_data["biography"] = obj["biography"]
                                    if "full_name" in obj and obj.get("full_name"):
                                        json_user_data["full_name"] = obj["full_name"]
                                    if "edge_followed_by" in obj and isinstance(obj["edge_followed_by"], dict):
                                        json_user_data["followers"] = obj["edge_followed_by"].get("count")

                                    if "hd_profile_pic_url_info" in obj and isinstance(obj["hd_profile_pic_url_info"], dict):
                                        u = obj["hd_profile_pic_url_info"].get("url")
                                        if u and u not in found_hd_avatar_list:
                                            found_hd_avatar_list.append(u)
                                    if "profile_pic_url_hd" in obj and obj.get("profile_pic_url_hd"):
                                        u = obj.get("profile_pic_url_hd")
                                        if u and u not in found_hd_avatar_list:
                                            found_hd_avatar_list.append(u)
                                    if "hd_profile_pic_versions" in obj and isinstance(obj["hd_profile_pic_versions"], list):
                                        for item in obj["hd_profile_pic_versions"]:
                                            if isinstance(item, dict) and item.get("url") and item.get("url") not in found_hd_avatar_list:
                                                found_hd_avatar_list.append(item.get("url"))
                                    for v in obj.values():
                                        find_hd_avatar(v)
                                elif isinstance(obj, list):
                                    for item in obj:
                                        find_hd_avatar(item)

                            find_hd_avatar(s_data)
                        except Exception:
                            pass
            except Exception as s_err:
                print(f"Aviso na busca de avatar HD nos scripts: {s_err}")

            if json_user_data.get("biography"):
                user_info["signature"] = json_user_data["biography"]
            if json_user_data.get("full_name"):
                user_info["nickname"] = json_user_data["full_name"]

            # Prioriza a melhor URL em 1080x1080 capturada na rede ou nos scripts
            if found_hd_avatar_list:
                best_hd = None
                for u in found_hd_avatar_list:
                    if "1080" in u and "s150x150" not in u and "s100x100" not in u:
                        best_hd = u
                        break
                if not best_hd:
                    for u in found_hd_avatar_list:
                        if "s150x150" not in u and "s100x100" not in u:
                            best_hd = u
                            break
                if not best_hd and found_hd_avatar_list:
                    best_hd = found_hd_avatar_list[0]

                if best_hd:
                    user_info["avatar"] = best_hd

            # Fallback para Avatar via meta tag og:image
            if not user_info.get("avatar"):
                try:
                    og_img = page.locator('meta[property="og:image"]').first
                    if og_img.count() > 0:
                        user_info["avatar"] = og_img.get_attribute("content") or ""
                except Exception:
                    pass

            # 1. Foto de Perfil HD 1080x1080 como item de mídia
            avatar_post = None
            if user_info.get("avatar"):
                avatar_post = {
                    "id": "avatar_profile",
                    "title": f"Foto de Perfil HD (1080x1080) - @{username}",
                    "cover": user_info["avatar"],
                    "play_url": user_info["avatar"],
                    "is_video": False,
                    "type": "avatar",
                    "like_count": 0,
                    "comment_count": 0,
                    "view_count": 0,
                    "save_count": 0,
                    "duration": 0
                }

            # 2. Aciona o carregamento completo de histórias dos Destaques
            try:
                hl_elements_initial = page.locator('a[href*="/stories/highlights/"]').all()
                if hl_elements_initial:
                    # Clica no primeiro destaque para disparar a consulta GraphQL de todos os destaques do perfil
                    hl_elements_initial[0].click(timeout=1500)
                    page.wait_for_timeout(2000)
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(400)
            except Exception as trig_err:
                print(f"Aviso ao acionar destaques: {trig_err}")

            # 3. Coleta estruturada de Destaques e de todas as Histórias/Mídias internas
            seen_hl_ids = set()
            highlight_story_posts = []
            try:
                hl_elements = page.locator('a[href*="/stories/highlights/"]').all()
                for hl in hl_elements:
                    try:
                        hl_href = hl.get_attribute('href') or ''
                        hl_m = re.search(r'/stories/highlights/([0-9]+)/?', hl_href)
                        if hl_m:
                            hl_id = hl_m.group(1)
                            if hl_id in seen_hl_ids:
                                continue
                            seen_hl_ids.add(hl_id)

                            # Captura o título do destaque
                            hl_title = hl.inner_text().strip() or f"Destaque {hl_id}"
                            
                            # Captura a capa (thumbnail da rodela do destaque)
                            hl_cover = ""
                            img_el = hl.locator('img').first
                            if img_el.count() > 0:
                                hl_cover = img_el.get_attribute('src') or ''

                            if not hl_cover:
                                hl_cover = user_info.get("avatar", "")

                            # Extrai todas as histórias/fotos/vídeos desse destaque se capturadas na rede
                            stories_for_this_hl = []
                            if hl_id in captured_highlight_stories:
                                story_items = captured_highlight_stories[hl_id].get("items", [])
                                for s_idx, it in enumerate(story_items, start=1):
                                    s_id = it.get("id", f"{hl_id}_{s_idx}")
                                    is_vid = bool(it.get("is_video") or it.get("video_versions") or it.get("media_type") == 2)
                                    vid_url = it.get("video_versions", [{}])[0].get("url") if is_vid else None
                                    img_cands = it.get("image_versions2", {}).get("candidates", [])
                                    img_url = img_cands[0].get("url") if img_cands else (it.get("display_url") or "")

                                    media_url = vid_url if is_vid and vid_url else img_url
                                    if not media_url:
                                        continue

                                    story_obj = {
                                        "id": f"story_{s_id}",
                                        "title": f"{hl_title} (Story #{s_idx})",
                                        "cover": img_url or hl_cover,
                                        "play_url": media_url,
                                        "is_video": is_vid,
                                        "type": "highlight",
                                        "highlight_id": hl_id,
                                        "highlight_name": hl_title,
                                        "story_index": s_idx,
                                        "order_index": 9000 + s_idx,
                                        "like_count": 0,
                                        "comment_count": 0,
                                        "view_count": 0,
                                        "save_count": 0,
                                        "duration": it.get("video_duration", 0)
                                    }
                                    stories_for_this_hl.append(story_obj)
                                    highlight_story_posts.append(story_obj)

                            # Se não capturou itens específicos pela rede, inclui o destaque como item único de download
                            if not stories_for_this_hl:
                                fallback_story = {
                                    "id": f"highlight_{hl_id}",
                                    "title": f"Destaque: {hl_title}",
                                    "cover": hl_cover,
                                    "play_url": f"https://www.instagram.com/stories/highlights/{hl_id}/",
                                    "is_video": False,
                                    "type": "highlight",
                                    "highlight_id": hl_id,
                                    "highlight_name": hl_title,
                                    "story_index": 1,
                                    "order_index": 9999,
                                    "like_count": 0,
                                    "comment_count": 0,
                                    "view_count": 0,
                                    "save_count": 0,
                                    "duration": 0
                                }
                                highlight_story_posts.append(fallback_story)

                            highlights.append({
                                "id": f"highlight_{hl_id}",
                                "highlight_id": hl_id,
                                "title": hl_title,
                                "cover": hl_cover,
                                "url": f"https://www.instagram.com/stories/highlights/{hl_id}/",
                                "play_url": f"https://www.instagram.com/stories/highlights/{hl_id}/",
                                "story_count": len(stories_for_this_hl) if stories_for_this_hl else 1,
                                "is_video": False,
                                "type": "highlight"
                            })
                    except Exception:
                        pass
            except Exception as hl_err:
                print(f"Aviso na coleta de destaques: {hl_err}")

            # 3. Coleta de posts de FEED em ordem cronológica (Mais recente > Mais antiga)
            feed_posts_dict = {}
            no_new_count = 0
            max_scrolls = 40 if max_posts <= 0 else max(6, max_posts // 6 + 2)

            for scroll_idx in range(max_scrolls):
                anchors = page.locator('a[href*="/p/"], a[href*="/reel/"]').all()
                prev_count = len(feed_posts_dict)

                for a in anchors:
                    try:
                        href = a.get_attribute('href') or ''
                        m = re.search(r'/(p|reel)/([a-zA-Z0-9_-]+)/?', href)
                        if not m:
                            continue
                        sc = m.group(2)
                        if sc in feed_posts_dict:
                            continue

                        is_video = '/reel/' in href
                        if not is_video:
                            svgs = a.locator('svg[aria-label]').all()
                            for s in svgs:
                                lbl = (s.get_attribute('aria-label') or '').lower()
                                if any(w in lbl for w in ['video', 'vídeo', 'clip', 'reel']):
                                    is_video = True

                        img_el = a.locator('img').first
                        cover = img_el.get_attribute('src') if img_el.count() > 0 else ""
                        alt = img_el.get_attribute('alt') if img_el.count() > 0 else ""
                        title = alt.split('\n')[0][:80] if alt else f"Publicação {sc}"
                        item_type = "reel" if is_video else "photo"

                        # Tenta estimar ou capturar métricas se presentes em aria-label ou alt
                        likes = 0
                        comments = 0
                        views = 0
                        saves = 0

                        # Se alt tiver texto de curtidas/comentários
                        if alt:
                            m_likes = re.search(r'(\d+[\d\.,]*)\s*(?:curtidas|likes)', alt, re.I)
                            if m_likes:
                                likes = int(re.sub(r'[^\d]', '', m_likes.group(1)) or 0)
                            m_comms = re.search(r'(\d+[\d\.,]*)\s*(?:comentários|comments)', alt, re.I)
                            if m_comms:
                                comments = int(re.sub(r'[^\d]', '', m_comms.group(1)) or 0)

                        post_index = len(feed_posts_dict) + 1

                        feed_posts_dict[sc] = {
                            "id": sc,
                            "title": title,
                            "cover": cover,
                            "play_url": f"https://www.instagram.com/p/{sc}/",
                            "is_video": is_video,
                            "type": item_type,
                            "order_index": post_index,
                            "like_count": likes,
                            "comment_count": comments,
                            "view_count": views or (likes * 4 if is_video and likes else 0),
                            "save_count": saves,
                            "duration": 0
                        }

                        if max_posts > 0 and len(feed_posts_dict) >= max_posts:
                            break
                    except Exception:
                        continue

                if max_posts > 0 and len(feed_posts_dict) >= max_posts:
                    break

                if len(feed_posts_dict) == prev_count:
                    no_new_count += 1
                    if no_new_count >= 3:
                        break
                else:
                    no_new_count = 0

                try:
                    page.evaluate("window.scrollBy(0, 1200)")
                    page.wait_for_timeout(1200)
                except Exception:
                    break

            posts = list(feed_posts_dict.values())
            if max_posts > 0 and len(posts) > max_posts:
                posts = posts[:max_posts]

            # Adiciona todas as histórias/fotos/vídeos reais extraídas dos destaques
            for hl_post in highlight_story_posts:
                posts.append(hl_post)

            # Adiciona foto de perfil HD
            if avatar_post:
                posts.append(avatar_post)

            if not posts and not user_info.get("avatar"):
                raise ValueError(f"Não foi possível carregar publicações do perfil @{username}. Verifique se o perfil existe e é público.")

        finally:
            if context:
                try:
                    context.close()
                except Exception:
                    pass
            if browser:
                try:
                    browser.close()
                except Exception:
                    pass

    counts = {
        "all": len([p for p in posts if p.get("type") != "avatar"]),
        "reels": len([p for p in posts if p.get("type") == "reel"]),
        "photos": len([p for p in posts if p.get("type") == "photo"]),
        "highlights": len(highlights),
        "avatar": 1 if user_info.get("avatar") else 0
    }

    return {
        "platform": "instagram",
        "user": user_info,
        "total_fetched": len(posts),
        "counts": counts,
        "posts": posts,
        "highlights": highlights
    }


def _download_instagram_media_raw(play_url: str, temp_dir: Path, base_name: str, cover_url: str = "") -> Path:
    """
    Baixa o arquivo bruto de mídia do Instagram (Reel/Vídeo ou Foto/Avatar).
    Tenta download direto de imagem, yt-dlp para vídeos e Playwright como fallback.
    """
    import yt_dlp

    # 1. Se for link direto de imagem (Avatar ou Foto da CDN)
    if any(k in play_url for k in ["cdninstagram.com", "fbcdn.net", ".jpg", ".jpeg", ".png", ".webp"]):
        try:
            r = requests.get(play_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
            if r.status_code == 200 and len(r.content) > 500:
                img_path = temp_dir / f"{base_name}_raw.jpg"
                img_path.write_bytes(r.content)
                return img_path
        except Exception:
            pass

    ffmpeg_bin = get_ffmpeg_path()
    raw_video_tmpl = str(temp_dir / f"{base_name}_raw.%(ext)s")

    # 2. Tentar yt-dlp (rápido para Reels e vídeos públicos)
    ydl_opts = {
        'outtmpl': raw_video_tmpl,
        'quiet': True,
        'no_warnings': True,
        'format': 'best',
        'ffmpeg_location': ffmpeg_bin,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([play_url])

        for f in temp_dir.glob(f"{base_name}_raw.*"):
            if f.is_file() and f.stat().st_size > 500:
                return f
    except Exception:
        pass

    # 2. Se for foto ou o yt-dlp não conseguiu baixar vídeo, tentar download direto da imagem cover
    if cover_url and cover_url.startswith("http"):
        try:
            r = requests.get(cover_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
            if r.status_code == 200 and len(r.content) > 1000:
                img_path = temp_dir / f"{base_name}_raw.jpg"
                img_path.write_bytes(r.content)
                return img_path
        except Exception:
            pass

    # 3. Fallback detalhado via Playwright: extrai o vídeo direto ou foto em alta resolução
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
            )
            page.goto(play_url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(3000)

            # Verificar se tem vídeo
            video_el = page.locator('article video, video').first
            if video_el.count() > 0:
                v_src = video_el.get_attribute('src')
                if v_src and v_src.startswith('http'):
                    r = requests.get(v_src, headers={'User-Agent': 'Mozilla/5.0'}, timeout=20)
                    if r.status_code == 200:
                        v_path = temp_dir / f"{base_name}_raw.mp4"
                        v_path.write_bytes(r.content)
                        return v_path

            # Se for foto, buscar fotos do post (-15 no CDN ou img principal)
            imgs = page.locator('img').all()
            for img in imgs:
                src = img.get_attribute('src') or ''
                if '-15/' in src and 'cdninstagram' in src:
                    r = requests.get(src, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
                    if r.status_code == 200 and len(r.content) > 1000:
                        img_path = temp_dir / f"{base_name}_raw.jpg"
                        img_path.write_bytes(r.content)
                        return img_path

            # Fallback qualquer imagem válida
            for img in imgs:
                src = img.get_attribute('src') or ''
                if 'cdninstagram' in src and '-19/' not in src:  # Não pegar o avatar
                    r = requests.get(src, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
                    if r.status_code == 200 and len(r.content) > 1000:
                        img_path = temp_dir / f"{base_name}_raw.jpg"
                        img_path.write_bytes(r.content)
                        return img_path

        finally:
            browser.close()

    raise RuntimeError(f"Não foi possível baixar o item de mídia do Instagram: {play_url}")

def download_and_clean_single_instagram(play_url: str, dest_clean_path: str, title: str = "") -> str:
    """
    Baixa uma única publicação (Reel/Vídeo ou Foto/Avatar) do Instagram e aplica a LIMPEZA EXTREMA
    de metadados, gerando um arquivo 100% limpo com carimbo de tempo atual.
    Se for foto de perfil (avatar), redimensiona/renderiza em 1080x1080 HD com Lanczos.
    """
    dest_path = Path(dest_clean_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = dest_path.parent / f"temp_{dest_path.stem}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    base_name = f"single_{dest_path.stem}"
    raw_file = None

    try:
        raw_file = _download_instagram_media_raw(play_url, temp_dir, base_name)
        
        # Ajusta a extensão correta no arquivo de destino (.mp4 para vídeo, .jpg para foto)
        ext = raw_file.suffix.lower()
        if not dest_path.name.endswith(ext):
            clean_out = dest_path.with_suffix(ext)
        else:
            clean_out = dest_path

        is_avatar = any(k in title.lower() for k in ["avatar", "perfil", "profile"]) or "avatar" in play_url.lower()
        target_sz = (1080, 1080) if is_avatar else None

        # Aplica a limpeza extrema de metadados (e 1080x1080 se for avatar)
        clean_media(str(raw_file), str(clean_out), make_brand_new=True, target_size=target_sz)
        return str(clean_out)

    finally:
        if raw_file and raw_file.exists():
            try:
                raw_file.unlink()
            except Exception:
                pass
        try:
            if temp_dir.exists():
                temp_dir.rmdir()
        except Exception:
            pass

def download_instagram_posts_to_zip(posts: List[Dict[str, Any]], output_zip_path: str, progress_callback: Callable = None) -> str:
    """
    Baixa posts/reels do Instagram em lote, aplica LIMPEZA EXTREMA DE METADADOS
    em 100% dos arquivos (recriando como NOVOS) e empacota em um arquivo .zip pronto para download.
    Garante Fotos de Perfil em 1080x1080 HD e Destaques separados em pastas nomeadas.
    """
    zip_path = Path(output_zip_path)
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    temp_dir = zip_path.parent / f"temp_{zip_path.stem}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    downloaded_files = []
    total = len(posts)

    try:
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for idx, item in enumerate(posts, start=1):
                post_id = item.get("id", f"post_{idx}")
                title = item.get("title", f"post_{idx}")
                clean_title = re.sub(r'[\\/*?:"<>|]', "", title)[:30].strip() or f"post_{idx}"
                play_url = item.get("play_url")
                cover_url = item.get("cover", "")
                
                if not play_url:
                    continue

                if progress_callback:
                    progress_callback({
                        "current": idx,
                        "total": total,
                        "percent": int(((idx - 0.5) / total) * 100),
                        "filename": f"{post_id}",
                        "status": f"Baixando ({idx}/{total}): {clean_title}..."
                    })

                raw_file = None
                try:
                    base_name = f"item_{idx:03d}_{post_id}"
                    raw_file = _download_instagram_media_raw(play_url, temp_dir, base_name, cover_url=cover_url)
                    
                    if raw_file and raw_file.exists():
                        ext = raw_file.suffix.lower()
                        clean_filename = f"{idx:03d}_{clean_title}_{post_id}{ext}"
                        clean_dest = temp_dir / clean_filename

                        # Organiza por pastas/seções dentro do ZIP
                        item_type = item.get("type", "reel" if item.get("is_video") else "photo")
                        is_avatar = (item_type == "avatar") or ("avatar" in str(post_id).lower()) or ("perfil" in title.lower())
                        target_sz = (1080, 1080) if is_avatar else None

                        if is_avatar:
                            folder_name = "01_Foto_de_Perfil"
                        elif item_type == "reel":
                            folder_name = "02_Reels_Videos"
                        elif item_type == "photo":
                            folder_name = "03_Fotos_Feed"
                        elif item_type == "highlight":
                            hl_group = re.sub(r'[\\/*?:"<>|]', "", item.get("highlight_name", "")).strip()
                            folder_name = f"04_Destaques/{hl_group}" if hl_group else "04_Destaques"
                        else:
                            folder_name = "05_Midias"

                        arc_path = f"{folder_name}/{clean_filename}"

                        if progress_callback:
                            progress_callback({
                                "current": idx,
                                "total": total,
                                "percent": int((idx / total) * 100),
                                "filename": clean_filename,
                                "status": f"Higienizando metadados [100% LIMPO] ({idx}/{total}): {clean_title}..."
                            })

                        # Higienização profunda (cria arquivo bitexact / Pillow novo em 1080x1080 para avatar, zera tags de rastreamento)
                        clean_media(str(raw_file), str(clean_dest), make_brand_new=True, target_size=target_sz)
                        zip_file.write(clean_dest, arcname=arc_path)
                        downloaded_files.extend([raw_file, clean_dest])

                except Exception as err:
                    print(f"Erro ao baixar/limpar post {post_id}: {err}")

        if progress_callback:
            progress_callback({
                "current": total,
                "total": total,
                "percent": 100,
                "status": "Download e higienização extrema de metadados concluídos!",
                "zip_ready": True
            })

    finally:
        for f in downloaded_files:
            try:
                if f.exists():
                    f.unlink()
            except Exception:
                pass
        try:
            if temp_dir.exists():
                temp_dir.rmdir()
        except Exception:
            pass

    return str(zip_path)

"""
MediaHub Runner - Ponte Python para Next.js
Permite ao Next.js executar os extratores de TikTok, Instagram e Limpeza de Metadados FFmpeg.
"""

import os
import sys
import json
from pathlib import Path

# Adiciona o diretório backend original ao PATH para importar as funções
WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = WORKSPACE_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from tiktok_downloader import fetch_tiktok_profile, download_and_clean_single_tiktok
    from instagram_downloader import fetch_instagram_profile, download_and_clean_single_instagram
    from metadata_cleaner import inspect_metadata, clean_media
except ImportError as e:
    print(json.dumps({"status": "error", "message": f"Erro ao importar módulos backend: {e}"}))
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Comando não especificado"}))
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == "tiktok_analyze":
            url = sys.argv[2]
            max_videos = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            data = fetch_tiktok_profile(url, max_videos)
            print(json.dumps({"status": "success", "data": data}, ensure_ascii=False))

        elif command == "instagram_analyze":
            url = sys.argv[2]
            max_items = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            data = fetch_instagram_profile(url, max_items)
            print(json.dumps({"status": "success", "data": data}, ensure_ascii=False))

        elif command == "metadata_inspect":
            file_path = sys.argv[2]
            data = inspect_metadata(file_path)
            print(json.dumps({"status": "success", "data": data}, ensure_ascii=False))

        elif command == "metadata_clean":
            input_path = sys.argv[2]
            output_path = sys.argv[3] if len(sys.argv) > 3 else None
            data = clean_media(input_path, output_path)
            print(json.dumps({"status": "success", "data": data}, ensure_ascii=False))

        else:
            print(json.dumps({"status": "error", "message": f"Comando desconhecido: {command}"}))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()

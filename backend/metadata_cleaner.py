import os
import subprocess
import json
import datetime
import time
from pathlib import Path
from PIL import Image, ExifTags

def get_ffmpeg_path():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def inspect_metadata(file_path: str) -> dict:
    """
    Inspeciona metadados de fotos ou vídeos e retorna detalhes de privacidade/autoria encontrados.
    """
    path = Path(file_path)
    ext = path.suffix.lower()
    stat = path.stat()
    
    file_info = {
        "filename": path.name,
        "extension": ext,
        "size_bytes": stat.st_size,
        "original_modified": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "is_video": ext in [".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".flv"],
        "is_image": ext in [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp"],
        "metadata_found": {},
        "risk_indicators": []
    }
    
    if file_info["is_image"]:
        try:
            with Image.open(file_path) as img:
                exif = img.getexif()
                if exif:
                    for tag_id, value in exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        # Converte bytes ou tipos complexos para string
                        if isinstance(value, bytes):
                            try:
                                value = value.decode("utf-8", errors="ignore").strip()
                            except Exception:
                                value = f"<{len(value)} bytes>"
                        file_info["metadata_found"][tag_name] = str(value)
                    
                    # Checagem de GPS e dados de câmera
                    if "GPSInfo" in file_info["metadata_found"]:
                        file_info["risk_indicators"].append("Coordenadas GPS de localização detectadas")
                    if "Model" in file_info["metadata_found"] or "Make" in file_info["metadata_found"]:
                        camera = f"{file_info['metadata_found'].get('Make', '')} {file_info['metadata_found'].get('Model', '')}".strip()
                        file_info["risk_indicators"].append(f"Dispositivo de captura: {camera}")
                    if "DateTimeOriginal" in file_info["metadata_found"] or "DateTime" in file_info["metadata_found"]:
                        dt = file_info["metadata_found"].get("DateTimeOriginal") or file_info["metadata_found"].get("DateTime")
                        file_info["risk_indicators"].append(f"Data e hora original de captura: {dt}")
                    if "Software" in file_info["metadata_found"]:
                        file_info["risk_indicators"].append(f"Software utilizado: {file_info['metadata_found']['Software']}")
                
                # Checar se tem dados IPTC / XMP
                if hasattr(img, "info") and img.info:
                    for k in ["icc_profile", "photoshop", "xmp", "comment"]:
                        if k in img.info:
                            file_info["metadata_found"][f"profile_{k}"] = "Presente no cabeçalho"
        except Exception as e:
            file_info["metadata_found"]["error"] = f"Erro ao ler imagem: {str(e)}"

    elif file_info["is_video"]:
        ffmpeg_bin = get_ffmpeg_path()
        # Usar ffprobe se disponível, ou ffprobe embutido
        try:
            cmd = [
                ffmpeg_bin, "-i", file_path,
                "-f", "ffmetadata", "-"
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")
            # FFmpeg cospe metadata em stderr ou stdout dependendo do formato
            lines = res.stderr.splitlines() + res.stdout.splitlines()
            metadata_block = False
            for line in lines:
                line_s = line.strip()
                if "Metadata:" in line_s:
                    metadata_block = True
                    continue
                if metadata_block:
                    if line.startswith("  ") and ":" in line:
                        parts = line_s.split(":", 1)
                        k = parts[0].strip()
                        v = parts[1].strip()
                        file_info["metadata_found"][k] = v
                        if k.lower() in ["creation_time", "date"]:
                            file_info["risk_indicators"].append(f"Data de gravação: {v}")
                        elif k.lower() in ["encoder", "software"]:
                            file_info["risk_indicators"].append(f"Encoder/Software: {v}")
                        elif k.lower() in ["location", "gps", "location-eng"]:
                            file_info["risk_indicators"].append(f"Localização/GPS: {v}")
                        elif k.lower() in ["make", "model"]:
                            file_info["risk_indicators"].append(f"Câmera/Aparelho: {v}")
                    elif not line.startswith("  "):
                        metadata_block = False
        except Exception as e:
            file_info["metadata_found"]["probe_error"] = str(e)

    if not file_info["risk_indicators"] and file_info["metadata_found"]:
        file_info["risk_indicators"].append(f"{len(file_info['metadata_found'])} tags de metadados encontradas")

    return file_info

def clean_media(input_path: str, output_path: str, make_brand_new: bool = True, target_size: tuple = None) -> dict:
    """
    Limpa completamente os metadados de imagens ou vídeos.
    No modo 'make_brand_new':
    - Remove dados EXIF/câmera/GPS
    - Define novos cabeçalhos e carimbo com a data/hora ATUAL
    - Atualiza os atributos de arquivo no SO (Windows mtime/atime) para a data de hoje/agora.
    - Se target_size for especificado (ex: (1080, 1080)), redimensiona com interpolação Lanczos em alta definição.
    """
    in_p = Path(input_path)
    out_p = Path(output_path)
    ext = in_p.suffix.lower()
    
    now = datetime.datetime.now()
    now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    now_timestamp = time.time()
    
    is_video = ext in [".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".flv"]
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp"]
    
    out_p.parent.mkdir(parents=True, exist_ok=True)
    
    if is_image:
        # Re-criação da imagem eliminando dados EXIF e perfis residuais
        with Image.open(input_path) as img:
            # Preserva modo de cores (RGB ou RGBA para transparência)
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
            if has_alpha:
                clean_img = Image.new("RGBA", img.size)
                clean_img.paste(img)
                if target_size and clean_img.size != target_size:
                    clean_img = clean_img.resize(target_size, Image.Resampling.LANCZOS)
                save_format = "PNG" if ext in [".png"] else "WEBP" if ext in [".webp"] else "PNG"
            else:
                clean_img = Image.new("RGB", img.size)
                clean_img.paste(img)
                if target_size and clean_img.size != target_size:
                    orig_w, orig_h = clean_img.size
                    if orig_w >= target_size[0] and orig_h >= target_size[1]:
                        clean_img = clean_img.resize(target_size, Image.Resampling.LANCZOS)
                    else:
                        # Super-Resolução e Restauração de Nitidez Avançada via OpenCV & Pillow
                        try:
                            import cv2
                            import numpy as np
                            from PIL import ImageEnhance

                            img_cv = cv2.cvtColor(np.array(clean_img), cv2.COLOR_RGB2BGR)
                            denoised = cv2.bilateralFilter(img_cv, d=5, sigmaColor=30, sigmaSpace=30)
                            inter_sz = (int(orig_w * 2), int(orig_h * 2))
                            step1 = cv2.resize(denoised, inter_sz, interpolation=cv2.INTER_CUBIC)
                            step2 = cv2.resize(step1, target_size, interpolation=cv2.INTER_LANCZOS4)

                            # Unsharp Masking no espaço de cores LAB (apenas na luminância)
                            lab = cv2.cvtColor(step2, cv2.COLOR_BGR2LAB)
                            l_channel, a_channel, b_channel = cv2.split(lab)
                            clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8))
                            l_clahe = clahe.apply(l_channel)
                            gaussian = cv2.GaussianBlur(l_clahe, (0, 0), sigmaX=1.5)
                            unsharp = cv2.addWeighted(l_clahe, 1.5, gaussian, -0.5, 0)

                            enhanced_bgr = cv2.cvtColor(cv2.merge([unsharp, a_channel, b_channel]), cv2.COLOR_LAB2BGR)
                            enhanced_pil = Image.fromarray(cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB))
                            
                            # Realce de micro-detalhes
                            enh_sharp = ImageEnhance.Sharpness(enhanced_pil)
                            clean_img = enh_sharp.enhance(1.2)
                        except Exception:
                            clean_img = clean_img.resize(target_size, Image.Resampling.LANCZOS)

                save_format = "JPEG" if ext in [".jpg", ".jpeg"] else "PNG" if ext in [".png"] else img.format or "JPEG"

            # Salvar sem carregar exif anterior com qualidade máxima 100%
            clean_img.save(str(out_p), format=save_format, quality=100)

    elif is_video:
        ffmpeg_bin = get_ffmpeg_path()
        # Comando para remover metadados de streams, de container, legendas e dados GPS
        # -map_metadata -1: limpa metadados globais
        # -map_metadata:s -1: limpa metadados de cada stream
        # -dn: remove stream de dados (GPS, telemetria)
        # -sn: remove legendas com rastros se houver
        # -c copy: cópia direta e ultra rápida, 0% perda de qualidade
        # -metadata creation_time=now_iso: atualiza criação para a data atual
        cmd = [
            ffmpeg_bin, "-y",
            "-i", str(in_p),
            "-map", "0:v?",
            "-map", "0:a?",
            "-dn",
            "-sn",
            "-map_metadata", "-1",
            "-map_metadata:s:v", "-1",
            "-map_metadata:s:a", "-1",
            "-metadata", "comment=",
            "-metadata", "aigc_info=",
            "-metadata", "vid_md5=",
            "-metadata", "title=",
            "-metadata", "artist=",
            "-metadata", f"creation_time={now_iso}",
            "-fflags", "+bitexact",
            "-flags:v", "+bitexact",
            "-flags:a", "+bitexact",
            "-c", "copy",
            str(out_p)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="ignore")
        if res.returncode != 0:
            raise RuntimeError(f"Erro no FFmpeg ao limpar vídeo: {res.stderr}")

    else:
        # Formato não mapeado diretamente: apenas copia
        import shutil
        shutil.copy2(str(in_p), str(out_p))

    # Atualiza a data e hora do arquivo no sistema de arquivos para o momento ATUAL
    try:
        os.utime(str(out_p), (now_timestamp, now_timestamp))
    except Exception:
        pass

    clean_stat = out_p.stat()
    return {
        "status": "success",
        "output_filename": out_p.name,
        "output_path": str(out_p),
        "clean_size_bytes": clean_stat.st_size,
        "new_timestamp": now_iso,
        "brand_new": True
    }

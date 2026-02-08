from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import re

from yt_dlp import YoutubeDL


def is_valid_youtube_url(url: str) -> bool:
    patterns = [
        r"^https?://(www\.)?youtube\.com/watch\?v=[\w-]+",
        r"^https?://youtu\.be/[\w-]+",
        r"^https?://(www\.)?youtube\.com/shorts/[\w-]+",
    ]
    return any(re.match(p, url) for p in patterns)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get("url", [None])[0]
        fmt = query.get("format", ["mp4"])[0]

        if not url:
            self._send_json(400, {"error": "URL requerida"})
            return

        if not is_valid_youtube_url(url):
            self._send_json(400, {"error": "URL de YouTube no valida"})
            return

        try:
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
                "no_color": True,
            }

            if fmt == "audio":
                ydl_opts["format"] = "bestaudio[ext=m4a]/bestaudio"
            else:
                ydl_opts["format"] = "best[ext=mp4]/best"

            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            result = {
                "title": info.get("title", "video"),
                "thumbnail": info.get("thumbnail"),
                "duration": info.get("duration", 0),
                "uploader": info.get("uploader", ""),
                "download_url": info.get("url"),
                "ext": info.get("ext", "mp4" if fmt == "mp4" else "m4a"),
                "filesize": info.get("filesize") or info.get("filesize_approx"),
            }

            if not result["download_url"]:
                # Some videos return formats list instead of direct url
                formats = info.get("formats", [])
                if formats:
                    chosen = formats[-1]
                    result["download_url"] = chosen.get("url")
                    result["ext"] = chosen.get("ext", result["ext"])
                    result["filesize"] = chosen.get("filesize") or chosen.get("filesize_approx")

            self._send_json(200, result)

        except Exception as e:
            raw_error = str(e)
            if "Private video" in raw_error or "Sign in" in raw_error:
                error_msg = "Este video es privado o requiere iniciar sesion."
            elif "Video unavailable" in raw_error:
                error_msg = "Este video no esta disponible."
            elif "not made this video available in your country" in raw_error:
                error_msg = "Este video tiene restriccion geografica y no se puede descargar desde nuestro servidor. Proba con otro video."
            elif "age" in raw_error.lower():
                error_msg = "Este video tiene restriccion de edad."
            elif "copyright" in raw_error.lower():
                error_msg = "Este video fue bloqueado por derechos de autor."
            else:
                error_msg = "No se pudo obtener el video. Intenta de nuevo mas tarde."

            self._send_json(500, {"error": error_msg})

    def _send_json(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

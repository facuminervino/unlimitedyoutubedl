"use client";

import { useState } from "react";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  uploader: string;
  download_url: string;
  ext: string;
  filesize: number | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFilesize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
  ];
  return patterns.some((p) => p.test(url.trim()));
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "audio">("mp4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [video, setVideo] = useState<VideoInfo | null>(null);

  async function handleSearch() {
    setError("");
    setVideo(null);

    if (!url.trim()) {
      setError("Por favor, pega un link de YouTube.");
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setError("Ese link no parece ser de YouTube. Asegurate de copiar el link completo del video.");
      return;
    }

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const res = await fetch(
        `/api/info?url=${encodeURIComponent(url.trim())}&format=${format}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo obtener el video. Puede que sea privado o esté restringido.");
        return;
      }

      if (!data.download_url) {
        setError("No se encontro un link de descarga para este video.");
        return;
      }

      setVideo(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("La busqueda tardo demasiado. Intenta de nuevo.");
      } else {
        setError("No se pudo conectar al servidor. Revisa tu conexion a internet.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!video) return;
    const link = document.createElement("a");
    link.href = video.download_url;
    link.download = `${sanitizeFilename(video.title)}.${video.ext}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Descargador de YouTube
          </h1>
          <p className="text-gray-500 text-sm">
            Sin publicidad. Sin limites de tamano.
          </p>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Link del video
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleSearch()}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-400"
            disabled={loading}
          />

          {/* Format Toggle */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setFormat("mp4")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                format === "mp4"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setFormat("audio")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                format === "audio"
                  ? "bg-red-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Solo Audio
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full mt-4 py-3 rounded-xl bg-red-600 text-white font-medium text-base hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Buscando video...
              </span>
            ) : (
              "Obtener video"
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Video Preview */}
        {video && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-4">
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-40 h-24 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                  {video.title}
                </h2>
                <p className="text-gray-500 text-xs mt-1">{video.uploader}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {video.duration > 0 && formatDuration(video.duration)}
                  {video.filesize ? ` · ${formatFilesize(video.filesize)}` : ""}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full mt-4 py-3 rounded-xl bg-green-600 text-white font-medium text-base hover:bg-green-700 transition-colors"
            >
              {format === "mp4" ? "Descargar Video" : "Descargar Audio"}
            </button>

            <p className="text-gray-400 text-xs mt-3 text-center">
              Si el video se reproduce en vez de descargarse, hace clic derecho y selecciona &quot;Guardar como...&quot;
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

#!/usr/bin/env python3
"""Generate a game/app icon with ModelScope API-Inference (text-to-image).

Usage:
    python tools/gen_icon.py --prompt "..." --out tools/icon-master.png

Env:
    Reads a Bearer token from MODELSCOPE_SDK_TOKEN, MODELSCOPE_API_KEY or
    MODELSCOPE_TOKEN (first non-empty wins). Uses stdlib only.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1").rstrip("/")
DEFAULT_MODEL = "Tongyi-MAI/Z-Image-Turbo"


def token() -> str:
    value = os.getenv("MODELSCOPE_SDK_TOKEN") or os.getenv("MODELSCOPE_API_KEY") or os.getenv("MODELSCOPE_TOKEN")
    if not value:
        raise SystemExit("缺少 ModelScope token：请设置 MODELSCOPE_SDK_TOKEN / MODELSCOPE_API_KEY / MODELSCOPE_TOKEN")
    return value


def request(path: str, *, method: str, payload: dict | None = None, extra_headers: dict | None = None) -> dict:
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token()}",
    }
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if extra_headers:
        headers.update(extra_headers)
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(BASE_URL + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise SystemExit(f"HTTP {exc.code}: {detail}") from exc


def iter_urls(node):
    """Yield every http(s)/data:image URL found anywhere in the parsed JSON."""
    if isinstance(node, str):
        if node.startswith(("http://", "https://", "data:image/")):
            yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from iter_urls(value)
    elif isinstance(node, list):
        for value in node:
            yield from iter_urls(value)


def generate(model: str, prompt: str, size: str) -> Path:
    created = request(
        "/images/generations",
        method="POST",
        payload={"model": model, "prompt": prompt, "size": size, "n": 1},
        extra_headers={
            "X-ModelScope-Async-Mode": "true",
            "X-ModelScope-Task-Type": "image_generation",
        },
    )
    task_id = created.get("task_id") or created.get("id")
    result = created
    if task_id and not created.get("data"):
        result = poll(str(task_id))

    urls = list(iter_urls(result))
    if not urls:
        raise SystemExit(f"未在任务结果中找到图片 URL：{json.dumps(result, ensure_ascii=False)[:2000]}")

    url = urls[0]
    if url.startswith("data:image/"):
        head, _, body = url.partition(",")
        mime = head.split(":", 1)[1].split(";", 1)[0]
        ext = "png" if "png" in mime else ("jpg" if "jpeg" in mime else "bin")
        raw = base64.b64decode(body)
    else:
        ext = "png"
        req = urllib.request.Request(url, headers={"Accept": "image/*"})
        with urllib.request.urlopen(req, timeout=180) as resp:
            raw = resp.read()

    out_dir = Path("tools").resolve()
    out = out_dir / f"icon-master-{int(time.time())}.{ext}"
    out.write_bytes(raw)
    return out


def poll(task_id: str) -> dict:
    headers = {"Authorization": f"Bearer {token()}", "Accept": "application/json", "X-ModelScope-Task-Type": "image_generation"}
    deadline = time.time() + int(os.getenv("MODELSCOPE_IMAGE_TIMEOUT", "300"))
    last = {}
    while time.time() < deadline:
        req = urllib.request.Request(f"{BASE_URL}/tasks/{task_id}", headers=headers, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                last = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise SystemExit(f"任务查询失败 HTTP {exc.code}: {exc.read().decode('utf-8', errors='ignore')}") from exc
        status = str(last.get("task_status") or last.get("status") or "").lower()
        if list(iter_urls(last)):
            return last
        if status in {"failed", "error", "canceled", "cancelled"}:
            raise SystemExit(f"文生图任务失败：{json.dumps(last, ensure_ascii=False)[:2000]}")
        time.sleep(3)
    raise SystemExit(f"文生图任务超时：{json.dumps(last, ensure_ascii=False)[:2000]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--size", default="1024x1024")
    args = parser.parse_args()
    out = generate(args.model, args.prompt, args.size)
    print(json.dumps({"ok": True, "model": args.model, "file": str(out)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

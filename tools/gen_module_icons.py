# -*- coding: utf-8 -*-
"""Batch-generate the mobile "More" panel module icons via ModelScope T2I."""
import base64
import io
import json
import os
import pathlib
import time
import urllib.error
import urllib.request

from PIL import Image

BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1").rstrip("/")
MODEL = "Tongyi-MAI/Z-Image-Turbo"
TOKEN = os.getenv("MODELSCOPE_SDK_TOKEN") or os.getenv("MODELSCOPE_API_KEY") or os.getenv("MODELSCOPE_TOKEN")
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "assets" / "images" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)
GEN_SIZE = "1024x1024"
EXPORT = 128
STYLE = ("手游功能按钮图标，正方形，扁平化国风卡牌风：深蓝渐变圆角底、金色描边，"
         "中心一个简洁、粗轮廓、易辨识的符号，大量留白，小尺寸也清晰，"
         "无任何文字、字母、数字、水印。主题：")

ITEMS = [
    ("dongfu", "云雾缭绕的仙山洞府石门"),
    ("feisheng", "向上飞升的金色光柱与仙人剪影"),
    ("zhuansheng", "金色轮回转轮符号"),
    ("tanxian", "金色罗盘指南针"),
    ("mijing", "发光的漩涡传送门"),
    ("wujinta", "高耸入云的九层宝塔"),
    ("daditu", "摊开的山水卷轴地图"),
    ("dongtian", "漂浮在云海上的仙岛"),
    ("beibao", "系带行囊背包"),
    ("lingchong", "金光闪闪的灵兽蛋"),
    ("lingchongyang", "可爱的灵兽爪印"),
    ("shichang", "金色天平和古风货摊"),
    ("fangshi", "古风坊市牌楼"),
    ("youshang", "背着货囊的行商剪影"),
    ("liandan", "冒着青烟的青铜丹炉"),
    ("lianqi", "铁砧和锻造锤"),
    ("qianghua", "金色铠甲战盔"),
    ("zhifu", "朱砂符纸和符文"),
    ("zhenfa", "发光的八卦阵法"),
    ("zongmen", "巍峨的仙门牌坊"),
    ("xianmeng", "飘扬的盟约旗帜"),
    ("renwu", "写着任务的竹简卷轴"),
    ("xiuxian", "骰子和纸牌"),
]

if not TOKEN:
    raise SystemExit("缺少 MODELSCOPE_SDK_TOKEN / MODELSCOPE_API_KEY / MODELSCOPE_TOKEN")


def request(path, *, method, payload=None, extra_headers=None):
    headers = {"Accept": "application/json", "Authorization": "Bearer " + TOKEN}
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
        raise RuntimeError("HTTP %s: %s" % (exc.code, detail))


def iter_urls(node):
    if isinstance(node, str):
        if node.startswith(("http://", "https://", "data:image/")):
            yield node
    elif isinstance(node, dict):
        for v in node.values():
            yield from iter_urls(v)
    elif isinstance(node, list):
        for v in node:
            yield from iter_urls(v)


def poll(task_id):
    headers = {"Accept": "application/json", "Authorization": "Bearer " + TOKEN,
               "X-ModelScope-Task-Type": "image_generation"}
    deadline = time.time() + 300
    last = {}
    while time.time() < deadline:
        req = urllib.request.Request(BASE_URL + "/tasks/" + task_id, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=120) as resp:
            last = json.loads(resp.read().decode("utf-8"))
        urls = list(iter_urls(last))
        if urls:
            return urls[0]
        status = str(last.get("task_status") or last.get("status") or "").lower()
        if status in {"failed", "error", "canceled", "cancelled"}:
            raise RuntimeError("task failed: " + json.dumps(last, ensure_ascii=False)[:500])
        time.sleep(3)
    raise RuntimeError("task timeout: " + json.dumps(last, ensure_ascii=False)[:500])


def generate(prompt):
    created = request("/images/generations", method="POST",
                      payload={"model": MODEL, "prompt": prompt, "size": GEN_SIZE, "n": 1},
                      extra_headers={"X-ModelScope-Async-Mode": "true",
                                     "X-ModelScope-Task-Type": "image_generation"})
    task_id = created.get("task_id") or created.get("id")
    url = None
    if task_id and not created.get("data"):
        url = poll(str(task_id))
    else:
        url = next(iter_urls(created), None)
    if not url:
        raise RuntimeError("no image url in result")
    if url.startswith("data:image/"):
        head, _, body = url.partition(",")
        return base64.b64decode(body)
    req = urllib.request.Request(url, headers={"Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def main():
    for i, (slug, subject) in enumerate(ITEMS, 1):
        out = OUT_DIR / (slug + ".png")
        if out.exists():
            print("[%d/%d] skip %s" % (i, len(ITEMS), slug), flush=True)
            continue
        prompt = STYLE + subject
        ok = False
        for attempt in range(1, 5):
            try:
                raw = generate(prompt)
                im = Image.open(io.BytesIO(raw)).convert("RGBA")
                im = im.resize((EXPORT, EXPORT), Image.Resampling.LANCZOS)
                im.save(out, "PNG", optimize=True)
                print("[%d/%d] ok %s (%d bytes)" % (i, len(ITEMS), slug, out.stat().st_size), flush=True)
                ok = True
                break
            except Exception as exc:
                print("[%d/%d] retry %s: %s" % (i, len(ITEMS), slug, exc), flush=True)
                time.sleep(3)
        if not ok:
            print("[%d/%d] FAIL %s" % (i, len(ITEMS), slug), flush=True)
        time.sleep(1.5)


if __name__ == "__main__":
    main()
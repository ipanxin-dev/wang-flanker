from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import streamlit as st


ROOT = Path(__file__).parent
DOCS_INDEX = ROOT / "docs" / "index.html"
DATA_DIR = ROOT / "data"


st.set_page_config(
    page_title="Flanker 方向判断任务",
    layout="centered",
    initial_sidebar_state="collapsed",
)


def load_backup_json(uploaded_files) -> tuple[pd.DataFrame, pd.DataFrame]:
    trial_rows = []
    summary_rows = []
    for uploaded_file in uploaded_files:
        payload = json.load(uploaded_file)
        source = uploaded_file.name
        for row in payload.get("events", []):
            row["source_file"] = source
            trial_rows.append(row)
        summary = payload.get("summary")
        if summary:
            summary["source_file"] = source
            summary_rows.append(summary)
    return pd.DataFrame(trial_rows), pd.DataFrame(summary_rows)


st.title("Flanker 方向判断任务")
st.caption("jsPsych / Streamlit 部署版")

st.markdown(
    """
    正式收数建议使用 `docs/` 里的 jsPsych 静态网页版本，并按 README 配置 GitHub Pages + Google Apps Script。
    Streamlit 这个页面主要用于本地说明、部署检查和备用 JSON 汇总。
    """
)

st.subheader("推荐入口")
st.code("docs/index.html", language="text")
st.markdown(
    """
    本地测试：

    ```bash
    cd docs
    python3 -m http.server 8765
    ```

    然后打开 `http://localhost:8765/`。
    """
)

st.subheader("部署检查")
checks = {
    "docs/index.html": DOCS_INDEX.exists(),
    "docs/experiment.js": (ROOT / "docs" / "experiment.js").exists(),
    "docs/style.css": (ROOT / "docs" / "style.css").exists(),
    "google_apps_script.gs": (ROOT / "google_apps_script.gs").exists(),
}
for label, ok in checks.items():
    st.write(("✅" if ok else "❌") + f" `{label}`")

st.subheader("备用 JSON 汇总")
uploaded = st.file_uploader(
    "如果学生下载了备用 JSON，可以在这里批量上传汇总。",
    type=["json"],
    accept_multiple_files=True,
)

if uploaded:
    trials, summaries = load_backup_json(uploaded)
    st.write(f"已读取 {len(uploaded)} 个文件，{len(trials)} 行 trial 数据，{len(summaries)} 行 summary 数据。")
    if not summaries.empty:
        st.dataframe(summaries, use_container_width=True)
        st.download_button(
            "下载 summary CSV",
            summaries.to_csv(index=False).encode("utf-8-sig"),
            "flanker_summary.csv",
            "text/csv",
        )
    if not trials.empty:
        st.dataframe(trials.head(30), use_container_width=True)
        st.download_button(
            "下载 trials CSV",
            trials.to_csv(index=False).encode("utf-8-sig"),
            "flanker_trials.csv",
            "text/csv",
        )

# Flanker jsPsych / Streamlit 部署版

这是一个中文 Arrow Flanker 方向判断任务项目，部署方式按之前 OSPAN 项目保持一致：正式收数建议使用 `docs/` 里的 jsPsych 静态网页版本，并通过 Google Apps Script 自动写入 Google Sheet；Streamlit 应用保留为本地说明和备用入口。

jsPsych 版本更适合涉及反应时的研究，因为刺激呈现、按键记录和 trial 时间控制主要发生在被试自己的浏览器里，不依赖 Streamlit 的服务端 rerun。

## 功能

- 首页填写姓名、学号，阅读简介和课堂用途说明
- 练习阶段：10 trials，有正确/错误反馈
- 正式实验：96 trials，其中 48 congruent、48 incongruent
- 正式实验分 3 个 block，每段 32 trials，中间休息
- fixation 500-1000 ms 随机，刺激最长 2500 ms，反应后空屏 300-700 ms 随机
- 输出 trial-level RT、accuracy、condition、target direction、response、timeout
- 输出 summary：正确率、平均正确 RT、congruent/incongruent RT、Flanker effect
- 可选：自动同步到 Google Sheets，集中收集所有学生数据
- 备用：结束页可下载 JSON 数据

## 推荐部署：GitHub Pages + jsPsych

本仓库的 `docs/` 目录是静态 jsPsych 实验页，可以直接用 GitHub Pages 发布。

1. 打开 GitHub 仓库 Settings。
2. 进入 Pages。
3. Source 选择 Deploy from a branch。
4. Branch 选择 `main`，Folder 选择 `/docs`。
5. 保存后等待 GitHub 生成 Pages 链接。

发布后，学生只需要打开 GitHub Pages 链接完成任务。结束时数据会通过 Google Apps Script 写入 Google Sheet。

## 配置 Google Sheets 收集数据

1. 新建一个 Google Sheet，用于收集 Flanker 数据。
2. 在 Google Sheet 中打开 Extensions -> Apps Script。
3. 删除默认内容，把 `google_apps_script.gs` 的全部内容粘进去。
4. 保存脚本。
5. 点 Deploy -> New deployment。
6. 类型选择 Web app。
7. Execute as 选择 Me。
8. Who has access 选择 Anyone。
9. 点 Deploy，并授权。
10. 复制 Web app URL。
11. 打开 `docs/experiment.js`，把顶部配置改成你的 Google Sheet ID 和 Apps Script Web App URL。

需要修改的位置：

```js
const CONFIG = {
  sheetId: "PASTE_YOUR_GOOGLE_SHEET_ID_HERE",
  webhookUrl: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
  // ...
};
```

部署好后，Google Sheet 会自动生成两个工作表：

- `trials`：trial-level 数据
- `summary`：每名学生一行的汇总数据

## 本地运行

### jsPsych 静态版

```bash
cd docs
python3 -m http.server 8765
```

然后打开：

```text
http://localhost:8765/
```

### Streamlit 备用版

```bash
pip install -r requirements.txt
streamlit run app.py
```

浏览器会自动打开本地页面；如果没有自动打开，请访问终端里显示的 `http://localhost:8501`。

## 数据输出

自动提交的 payload 包含：

- `events`：每个 Flanker trial 一行
- `summary`：每名学生一个汇总对象

如果 Google Apps Script URL 尚未配置或提交失败，结束页会显示“下载备用数据”。备用 JSON 也包含同样的 `events` 和 `summary`。

## 发给学生的话术

请打开以下链接完成“方向判断任务”。开始前请填写姓名和学号。任务约 8-10 分钟，请在安静环境中一次性完成，中途不要刷新或关闭页面。完成后请停留在结束页，等老师确认数据已收到。

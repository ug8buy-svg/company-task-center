# 公司任務中心 — Claude 開發規則

## 專案背景
- 系統名稱：公司任務中心
- Supabase 專案：company-task-center（Tokyo Region）
- Project URL：https://qvmhcglheoeudxzqrlyv.supabase.co

---

## 溝通原則（摘自規劃書第七章）

- 我是專案管理者，不是工程師，請用白話解釋技術內容
- 改完程式請告訴我改了什麼，不要只丟 diff
- 修改重要檔案前提醒我先 git commit
- 有多種做法時，列 1-2 個讓我選
- 不確定需求時直接問，不要自己猜
- 改一個東西不要順便改其他地方

---

## Supabase 操作偏好

- 已透過 `npx supabase login` 完成登入，專案已 link
- 執行 SQL 請直接用終端機：`npx supabase db query --linked`
- 不要叫我到網頁 SQL Editor 貼上執行
- 查詢資料表結構或驗證結果也用同樣方式

---

## 重要禁忌

- 絕對不要 `DROP TABLE`（任何資料表都不行）
- 不要動 `.env` 檔案
- 不要把 `service_role key` 寫進前端代碼
- 不要在未確認的情況下修改已完成階段的資料表結構

---

## 目前進度

| 階段 | 內容 | 狀態 | 完成日期 |
|------|------|------|----------|
| 01 | 11 張資料表結構建立 | 已完成 | 2026/05/26 |
| 02 | LINE 登入系統 | 待開始 | — |
| 03 | 老闆待辦清單 | 待開始 | — |
| 04 | 專案進度看板 | 待開始 | — |
| 05 | 展覽清點表 | 待開始 | — |
| 06 | 會議記錄 | 待開始 | — |
| 07 | LINE 通知 | 待開始 | — |

---

## 資料表清單（已建立）

`users` / `boss_todos` / `boss_notes` / `projects` / `milestones` /
`exhibitions` / `checklists` / `checklist_items` / `meetings` /
`meeting_entries` / `notification_settings`

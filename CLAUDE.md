# review-system（員工評價系統）/ Claude 開發備忘

> 給未來 session 的 Claude 看。改這個系統前先讀完。

## 架構
- 後端：NestJS（`review-system-backend`，`src/modules/*`）。前端：Vite + React + TypeScript（`review-system-frontend`）。
- Supabase：`nztrqjtmorptosbgqcah`。
- Render workspace `tea-d6vo0ch4tr6s73do3h30`：backend `srv-d76hvthr0fns73cb24a0`、frontend（static）`srv-d76i0lnfte5s73ekd85g`，網址 https://review-system-frontend-ol7b.onrender.com 。
- 前端 axios interceptor **沒有**解包（跟 market 不同）：`res.data` 才是 body。
- 新 clone 後要先 `git config user.email/user.name` 才能 commit；push 前先 `npm run build` 確認可編譯。

## 使用者分兩種端，除錯時先分清楚 ★
- **公關端**（Louis／公關部，需 PR 權限）：`/reviews`、`/reviews/new`、`/google-alerts`、`/service-evaluations`、`/screenshot-appeals`…
- **門市端**（門市員工）：`/my-service-evaluation`（服務評鑑好評截圖上傳）、`/my-reviews`、`/review/respond/:token`（免登入回覆評價）。
- 使用者說「上傳壞了」時，先問清楚是哪一端、哪個上傳（新增評價附件／門市好評截圖／洗評論／改善書），不要用公關帳號測完就說沒問題。

## 已知地雷
- **前端沒有 ErrorBoundary**：任何 render 錯誤＝整頁白屏。
- **AI 解析出來的值不可信**：例如 review_screenshots 的 `star_count` 曾被判成 9。
  畫星等一律用 `src/utils/stars.ts` 的 `starStr()`（夾 0~5），不要直接 `'★'.repeat(n) + '☆'.repeat(5-n)`（n>5 會丟 RangeError → 白屏）。2026-11-06 修過。
- `employees` 的 `total_reviews / positive_count / negative_count / other_count / avg_response_hours` 是**快取欄位**，評價 soft delete（`deleted_at`）不會自動扣，要手動修。
- `FileUpload` 元件自己管 state；外部要預先帶檔案要用 `initialFiles` prop。

## 測試守則
- **不要建立負評測試資料**：會通知員工／公關。真的要重現，用正評＋自己當對象，事後**刪掉並把自己的快取計數歸零**。
- 測試完一定清乾淨（reviews / review_attachments / review_responses）。

## 功能備忘
- Google 負評告警 → 「新增評價」會帶 `location.state.prefill`（內容、來源、門市、店長代理人、canvas 生成的白底 Google 評論截圖）。
- 店長／代理人對照：`settingsApi.storeProxyHandlers()`（依人事名單）。
- 改善書：reviews 的 `improvement_note / improvement_images / improvement_at`，`POST /reviews/:id/improvement`。
- 服務評鑑 score-export 每人含 `verified_screenshot_count`、`negative_review_count`，market 店務目標 ④ 會用（每人 20 則＋每負評再 20）。

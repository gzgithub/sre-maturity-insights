# SRE 成熟度自評問卷系統：設計文件（v0.2 spec, implemented as app v0.1）

This file records the design spec. The authoritative content is transcribed into code:

- Questions (§5) → `src/data/questions.ts` + `src/locales/*/questions.json`
- Capability nodes and wording (§6) → `src/data/nodes.ts` + `src/locales/*/recommendations.json`
- Scoring (§4) → `src/lib/scoring.ts`; recommendation rules (§6.2) → `src/lib/recommend.ts`
- Share URL (§9) → `src/lib/shareUrl.ts`; data model (§11.1) → `assessment_submissions`
- Privacy (§11.3) → `src/locales/*/legal.json`, page `/privacy`

## 0. 重點摘要

1. 同一套題庫、兩種問法（manager / engineer）。
2. 20 題：14 題情境題、6 題實證題（q04、q08、q11、q14、q17、q20，權重 1.5）。
3. 三道評分防線：實證題加權、落差提示（情境平均 − 實證 ≥ 1.5）、木桶限制（整體 ≤ 最弱維度 + 1 級）。
4. 建議引擎：能力節點 N1–N17 加前置條件；輸出「現在做／下一步／暫緩（含原因）」。
5. 看結果前須填姓名與 Email 並同意；資料存後端，評分在瀏覽器計算。
6. 分享網址只含角色與答案：`/r?v=1&lang=zh-TW&role=m&team=5to15&svc=hybrid&a=<20 chars 0-4>`，摘要版。
7. i18n：zh-TW（來源）、en；預留 zh-CN、ja。

## 4. 等級門檻

校正線 `< 1.75` → L1；`< 2.50` → L2；`< 3.25` → L3；其餘 L4。「我不確定」記 1 分並列為透明度缺口（答案值 0）。

## 6.2 排序規則

1. 受阻節點不推薦，列入暫緩並說明缺哪個前置。
2. 止血優先：q11 或 q19 ≤ 2 且 N9 為候選 → N9 第一。
3. 基礎鏈 N1 → N5 取第一個候選。
4. 其餘候選依觸發題最低分升冪，同分取編號小者。
5. 最多三條；暫緩取觸發題最低分最小者，同分取未達前置鏈最長者。
6. `team = lt5`：PRR（q18 L4）與全面自助化（q16 L4）不作為「下一級」，註記「小團隊可略過」。
7. 沒有候選也沒有受阻 → 顯示「目前沒有未達成的基礎節點」。

## 附錄 A：驗收測試向量

T1–T10 與 T12 實作於 `src/lib/assessment.test.ts`。T11（切換語系不遺失答案）以瀏覽器流程驗證。

## 14. 待確認事項

營運者名稱與聯絡信箱、保存期間、節點對應文章、同意文案審閱、zh-CN／ja 翻譯審校。

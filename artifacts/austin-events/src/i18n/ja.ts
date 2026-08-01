/**
 * Japanese (JA) static UI strings for the Tokyo site.
 * All dynamic/event text is translated at runtime via /api/translate.
 * These strings cover fixed UI copy: headlines, labels, buttons, empty states.
 */
export const JA = {
  // Hero section
  bestOf:             (city: string) => `${city}のベスト、あなたのために`,
  stopScrolling:      "スクロールを止めよう。",
  startExperiencing:  (city: string) => `体験しよう、${city}を。`,
  heroSubtext:        "毎週日曜日、AIが東京中のイベント情報をくまなくチェック。今週の厳選イベントをお届けします（日曜〜土曜）。",
  curatorQuote:       "「AIを使って東京のイベント情報を徹底リサーチ。今週の厳選イベントをまとめました。ぜひ楽しんでください！🗼」",

  // Nav / header
  subscribe:          "登録",

  // Category labels
  catAll:             "すべて",
  catTech:            "テック",
  catArts:            "アート",
  catSports:          "スポーツ",
  catCivics:          "市民",
  catWellness:        "ウェルネス",

  // Event badges
  specialEvent:       "注目イベント",

  // Empty state
  noEvents:           (cat: string) => `今週の${cat}イベントはありません`,
  checkBack:          (cat: string) => `次号で${cat}のイベントをお楽しみに`,
  viewAllEvents:      "すべてのイベントを見る →",

  // Subscribe section
  subscribeHeading:   "週刊ニュースレターを受け取る",
  subscribeSubtext:   "東京の厳選イベント情報を毎週お届けします。",
} as const;

export type JaKey = keyof typeof JA;

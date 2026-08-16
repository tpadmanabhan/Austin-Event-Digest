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

  // Spotlight section headers & labels
  businessSpotlight:  "ビジネススポットライト",
  communitySpotlight: "コミュニティスポットライト",
  visitWebsite:       "ウェブサイトを見る",
  applyNow:           "今すぐ申し込む",
  applyBy:            (date: string) => `申込締切: ${date}`,

  // Empty state
  noEvents:           (cat: string) => `今週の${cat}イベントはありません`,
  checkBack:          (cat: string) => `次号で${cat}のイベントをお楽しみに`,
  viewAllEvents:      "すべてのイベントを見る →",

  // Subscribe section (digest page bottom banner)
  subscribeHeading:   "次号もお見逃しなく",
  subscribeSubtext:   (city: string) => `来週の厳選${city}イベントをメールでお届けします。`,

  // Subscribe form (inline form component)
  subscribeFormHeading: "週刊ニュースレターを受け取る",
  emailPlaceholder:     "メールアドレス",
  subscribeCta:         "無料で登録する",
  subscribing:          "登録中...",
  noSpam:               "スパムなし。いつでも配信停止できます。",
  subscribedTitle:      "登録完了！",
  subscribedDesc:       "今週日曜日のダイジェストをお楽しみに。",

  // Home page digest preview section
  insideLatestIssue:  "最新号の内容",
  snackPeekSubtext:   "今週号の厳選イベントをご紹介します。",
  readFullEdition:    "全号を読む",

  // Digest page navigation & section headings
  backToAllEditions:        "← 全号一覧へ",
  thisWeeksCuratedEvents:   "今週の厳選イベント",
  eventsNearestFirst:       "イベント — 近い順",

  // Unsubscribe page
  unsubscribeTitle:           "配信設定",
  unsubscribeManagingFor:     "配信設定を管理:",
  unsubscribeNoEmail:         "このリンクにメールアドレスが見つかりません。",
  unsubscribeKeepSubscribed:  "✓ 配信を続ける",
  unsubscribeButton:          "すべてのメールを配信停止",
  unsubscribingButton:        "停止中...",
  unsubscribeFootnote:        (url: string) => `いつでも再登録できます — `,
  unsubscribeFootnoteLink:    "登録ページへ",
  unsubscribeSuccessTitle:    "配信停止しました",
  unsubscribeSuccessBody:     (digestName: string) => `のメーリングリストから削除されました。今後はメールをお送りしません。`,
  unsubscribeSuccessBack:     "イベントページに戻る",
  unsubscribeSuccessResubLink:"再登録はこちら",
  unsubscribeSuccessResubPre: "気が変わったら？",
  unsubscribeErrorTitle:      "エラーが発生しました",
  unsubscribeErrorBody:       "リクエストを処理できませんでした。再度お試しいただくか、",
  unsubscribeErrorContact:    "こちらからお問い合わせください",
  unsubscribeTryAgain:        "もう一度試す",
} as const;

export type JaKey = keyof typeof JA;

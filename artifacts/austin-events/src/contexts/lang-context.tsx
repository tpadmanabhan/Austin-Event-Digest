import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ja";

export const T = {
  en: {
    howItWorks: "How it works",
    launchShort: "Suggest",
    launchFull: "Suggest a city",
    footerTagline: "Local guides. More time together.",
    langToggle: "日本語",

    heroBadge: "A guide to your city",
    heroH1a: "In Real Life,",
    heroH1b: "Near You",
    heroSub: "We put what's happening near you in your inbox — and we let anyone run one for their own neighborhood.",
    heroSlogan: "Stop scrolling. Start living.",
    heroMission: "We bring local events and useful neighborhood information into one considered city guide. The AustinCares Daily Deals edition is",
    heroMissionLive: "LIVE",
    heroMissionSuffix: "This will be coming to a city near you.",
    heroLuddite: "A Luddite's Dream",
    heroLudditeDesc: "Let's build tools that enhance human skills, not replace them. Focus on technologies in service of people, not the reverse.",
    heroCta: "Suggest a city",
    heroLiveNow: "Live now ·",
    heroNotify: "Want to be notified about feature updates?",

    statCities: "Cities live",
    statCategories: "Event categories",
    statSources: "Data sources",

    howBadge: "How it works",
    howH2: "Bring an events newsletter to your city",
    howSub: "Start with a simple request. Our team reviews each city.",
    comingSoon: "Coming soon",

    step1Title: "Request your city",
    step1Desc: "Submit your city name and email address. No password or account is needed.",
    step2Title: "Team review",
    step2Desc: "Our team reviews your request and follows up about next steps.",
    step3Title: "Plan a city launch",
    step3Desc: "If your city is selected, we work with you on its newsletter. Launching is not automatic.",
    catBadge: "Categories",
    catH2: "Five categories, dozens of sources",
    catSub: "Pick the categories that define your city. We pull from the top platforms automatically.",
    catTechDesc: "Startup meetups, AI demos, developer nights, and founder events.",
    catArtsDesc: "Live music, concerts, galleries, theater, film, and cultural events.",
    catSportsDesc: "Fitness groups, sports meetups, outdoor adventures, and watch parties.",
    catWellnessDesc: "Yoga classes, meditation circles, hiking groups, and outdoor fitness.",
    catCivicsDesc: "City council meetings, neighborhood events, volunteer drives, and community org.",
    catJustWorks: "And it all just works",
    feat1: "Weekly digest auto-generated",
    feat2: "Subscribers managed for you",
    feat3: "One-click newsletter send",
    feat4: "Helpful details for planning a visit",

    liveBadge: "Live cities",
    liveH2: "Live cities",
    liveSub: "Explore the city editions currently available. Your city can be suggested for review.",
    liveYourCityNext: "Your city could be next",
    liveJoinMinutes: "Request your city for team review",
    liveYourCityFirst: "Suggest a city for review",
    liveStartWave: "Send a request to start the conversation",

    ctaH2: "Which city should we get to know?",
    ctaSub: "Tell us your city and email. Our team will review your request and follow up.",
    ctaButton: "Request your city",
    ctaNoCard: "Suggestions are reviewed by our team.",
    spockHero: "Spock, our robot helper, assists our team with researching local events and drafting city guides. People review every request.",
    spockCta: "Spock helps our team research events, organize guides, and draft weekly newsletters. Humans review city requests and publishing.",

    modalTitle: "Get occasional IRL notes",
    modalDesc: "Leave your email to hear about new city editions and meaningful updates from In Real Life.",
    modalDone: "You're on the list!",
    modalDoneDesc1: "We've sent a confirmation to",
    modalDoneDesc2: "We'll be in touch as features roll out.",
    modalClose: "Close",
    modalEmailLabel: "Your email address",
    modalSubmit: "Keep me posted",
    modalSending: "Sending...",
    modalNoSpam: "No spam, ever. Unsubscribe anytime.",
    modalErrGeneric: "Something went wrong. Please try again.",
    modalErrNetwork: "Network error. Please try again.",
  },
  ja: {
    howItWorks: "仕組み",
    launchShort: "提案",
    launchFull: "街を提案する",
    footerTagline: "街を知り、人と過ごす。",
    langToggle: "English",

    heroBadge: "街を知るためのガイド",
    heroH1a: "リアルな体験を、",
    heroH1b: "あなたの近くで",
    heroSub: "街のイベントや地域の情報を、都市ごとのガイドでご紹介します。",
    heroSlogan: "スクロールをやめて、生き始めよう。",
    heroMission: "地域のイベントや役立つ情報を、街ごとのガイドにまとめています。AustinCares のお得情報版は",
    heroMissionLive: "ライブ",
    heroMissionSuffix: "近くの街にも来る予定です。",
    heroLuddite: "ラッダイトの夢",
    heroLudditeDesc: "人間のスキルを高めるツールを作ろう、それらを置き換えるのではなく。テクノロジーを人に奉仕させることに集中しよう、その逆ではなく。",
    heroCta: "街を提案する",
    heroLiveNow: "公開中 ·",
    heroNotify: "機能アップデートの通知を受け取りますか？",

    statCities: "稼働中の都市",
    statCategories: "イベントカテゴリー",
    statSources: "データソース",

    howBadge: "仕組み",
    howH2: "あなたの街にイベントニュースレターを",
    howSub: "まずはリクエストを送信。チームが各都市を確認します。",
    comingSoon: "近日公開",

    step1Title: "都市をリクエスト",
    step1Desc: "都市名とメールアドレスだけを送信。パスワードやアカウントは不要です。",
    step2Title: "チームによる確認",
    step2Desc: "チームがリクエストを確認し、次のステップについてご連絡します。",
    step3Title: "都市版の計画",
    step3Desc: "選ばれた都市のニュースレターを一緒に計画します。自動的には公開されません。",
    step4Title: "信頼できる仲間とカープールを",
    step4Desc: "近日公開 — 知り合い同士でイベントへの乗り合いを調整。",

    catBadge: "カテゴリー",
    catH2: "5つのカテゴリー、多数のソース",
    catSub: "あなたの街を定義するカテゴリーを選択。主要プラットフォームから自動で収集します。",
    catTechDesc: "スタートアップ勉強会、AIデモ、開発者ナイト、起業家向けイベント。",
    catArtsDesc: "ライブ音楽、コンサート、ギャラリー、演劇、映画、文化イベント。",
    catSportsDesc: "フィットネスグループ、スポーツ交流会、アウトドア冒険、観戦パーティー。",
    catWellnessDesc: "ヨガクラス、瞑想サークル、ハイキンググループ、アウトドアフィットネス。",
    catCivicsDesc: "市議会、地域イベント、ボランティア活動、コミュニティ組織。",
    catJustWorks: "すべてが自動で動く",
    feat1: "ウィークリーダイジェストを自動生成",
    feat2: "購読者の管理も自動化",
    feat3: "ワンクリックでニュースレター送信",
    feat4: "出かけるための役立つ情報",

    liveBadge: "稼働中の都市",
    liveH2: "稼働中の都市",
    liveSub: "現在公開中の都市版をご覧ください。新しい街の提案はチームが確認します。",
    liveYourCityNext: "あなたの街が次かも",
    liveJoinMinutes: "都市をリクエストしてチームの確認を受ける",
    liveYourCityFirst: "街をチームに提案する",
    liveStartWave: "リクエストを送って相談を始めましょう",

    ctaH2: "次は、どの街を知りたいですか？",
    ctaSub: "都市名とメールアドレスをお知らせください。チームが確認してご連絡します。",
    ctaButton: "都市をリクエスト",
    ctaNoCard: "提案はチームが確認します。",
    spockHero: "ロボットのSpockが、地域イベントの調査や都市ガイドの下書きでチームを手伝います。リクエストはすべて人が確認します。",
    spockCta: "Spockはイベント調査、ガイドの整理、週刊ニュースレターの下書きを手伝います。都市リクエストと公開内容は人が確認します。",

    modalTitle: "IRLからのお知らせ",
    modalDesc: "メールアドレスを登録すると、新しい都市版や大切なお知らせをお届けします。",
    modalDone: "登録完了！",
    modalDoneDesc1: "確認メールを送信しました：",
    modalDoneDesc2: "機能が公開され次第ご連絡します。",
    modalClose: "閉じる",
    modalEmailLabel: "メールアドレス",
    modalSubmit: "お知らせを受け取る",
    modalSending: "送信中...",
    modalNoSpam: "スパムなし。いつでも配信停止できます。",
    modalErrGeneric: "エラーが発生しました。もう一度お試しください。",
    modalErrNetwork: "ネットワークエラーです。もう一度お試しください。",
  },
} as const;

export type Translations = typeof T.en;

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: Translations;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  toggleLang: () => {},
  t: T.en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  const toggleLang = () => {
    setLang(prev => prev === "en" ? "ja" : "en");
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, t: T[lang] as Translations }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

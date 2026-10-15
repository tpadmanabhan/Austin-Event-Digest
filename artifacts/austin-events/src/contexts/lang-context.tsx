import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ja";

export const T = {
  en: {
    howItWorks: "How it works",
    launchShort: "Launch",
    launchFull: "Launch your city",
    footerTagline: "Helping cities connect in real life.",
    langToggle: "日本語",

    heroBadge: "🚀 Something for everyone",
    heroH1a: "In Real Life,",
    heroH1b: "Near You",
    heroSub: "We put what's happening near you in your inbox — and we let anyone run one for their own neighborhood.",
    heroSlogan: "Stop scrolling. Start living.",
    heroMission: "We help solve personalized event discovery and the logistics to get there. And because life is expensive, we surface local deals so living stays affordable. The AustinCares Daily Deals feature is now",
    heroMissionLive: "LIVE",
    heroMissionSuffix: "This will be coming to a city near you.",
    heroLuddite: "A Luddite's Dream",
    heroLudditeDesc: "Let's build tools that enhance human skills, not replace them. Focus on technologies in service of people, not the reverse.",
    heroCta: "Launch your city",
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
    feat4: "RSVP & carpool coordination",

    liveBadge: "Live cities",
    liveH2: "Live cities",
    liveSub: "These cities are already sending weekly newsletters. Yours could be next.",
    liveYourCityNext: "Your city could be next",
    liveJoinMinutes: "Request your city for team review",
    liveYourCityFirst: "Your city could be first",
    liveStartWave: "Send a request to start the conversation",

    ctaH2: "Ready to launch your city?",
    ctaSub: "Tell us your city and email. Our team will review your request and follow up.",
    ctaButton: "Request your city",
    ctaNoCard: "No credit card required.",
    spockHero: "Spock, our robot helper, assists our team with researching local events and drafting city guides. People review every request.",
    spockCta: "Spock helps our team research events, organize guides, and draft weekly newsletters. Humans review city requests and publishing.",

    modalTitle: "Stay in the loop",
    modalDesc: "Get notified when new features launch on EventCarpooling.com — carpooling tools, new city editions, and more.",
    modalDone: "You're on the list!",
    modalDoneDesc1: "We've sent a confirmation to",
    modalDoneDesc2: "We'll be in touch as features roll out.",
    modalClose: "Close",
    modalEmailLabel: "Your email address",
    modalSubmit: "Notify me about feature updates",
    modalSending: "Sending...",
    modalNoSpam: "No spam, ever. Unsubscribe anytime.",
    modalErrGeneric: "Something went wrong. Please try again.",
    modalErrNetwork: "Network error. Please try again.",
  },
  ja: {
    howItWorks: "仕組み",
    launchShort: "立ち上げる",
    launchFull: "あなたの街を立ち上げる",
    footerTagline: "都市を、リアルなつながりで。",
    langToggle: "English",

    heroBadge: "🚀 新しいものを始めています",
    heroH1a: "リアルな体験を、",
    heroH1b: "あなたの近くで",
    heroSub: "私たちは単なるイベントアプリではありません。人々がコミュニティで本当の友人を見つける方法を再構築しています。",
    heroSlogan: "スクロールをやめて、生き始めよう。",
    heroMission: "パーソナライズされたイベント発見と、そこへ行くための手段を解決します。あなたのコミュニティの変革エージェントになろう。生活費が高いので、地元のお得情報を提供し、生活を手頃に保ちます。AustinCares デイリーディールズ機能は今",
    heroMissionLive: "ライブ",
    heroMissionSuffix: "近くの街にも来る予定です。",
    heroLuddite: "ラッダイトの夢",
    heroLudditeDesc: "人間のスキルを高めるツールを作ろう、それらを置き換えるのではなく。テクノロジーを人に奉仕させることに集中しよう、その逆ではなく。",
    heroCta: "あなたの街を立ち上げる",
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
    feat4: "RSVP・カープール調整",

    liveBadge: "稼働中の都市",
    liveH2: "稼働中の都市",
    liveSub: "すでにウィークリーニュースレターを送信中の都市です。次はあなたの街かも。",
    liveYourCityNext: "あなたの街が次かも",
    liveJoinMinutes: "都市をリクエストしてチームの確認を受ける",
    liveYourCityFirst: "あなたの街が最初になれる",
    liveStartWave: "リクエストを送って相談を始めましょう",

    ctaH2: "あなたの街を立ち上げる準備はできましたか？",
    ctaSub: "都市名とメールアドレスをお知らせください。チームが確認してご連絡します。",
    ctaButton: "都市をリクエスト",
    ctaNoCard: "クレジットカード不要。",
    spockHero: "ロボットのSpockが、地域イベントの調査や都市ガイドの下書きでチームを手伝います。リクエストはすべて人が確認します。",
    spockCta: "Spockはイベント調査、ガイドの整理、週刊ニュースレターの下書きを手伝います。都市リクエストと公開内容は人が確認します。",

    modalTitle: "最新情報を受け取る",
    modalDesc: "カープールツール、新都市版など、EventCarpooling.comの新機能リリース時に通知を受け取りましょう。",
    modalDone: "登録完了！",
    modalDoneDesc1: "確認メールを送信しました：",
    modalDoneDesc2: "機能が公開され次第ご連絡します。",
    modalClose: "閉じる",
    modalEmailLabel: "メールアドレス",
    modalSubmit: "機能アップデートを通知する",
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

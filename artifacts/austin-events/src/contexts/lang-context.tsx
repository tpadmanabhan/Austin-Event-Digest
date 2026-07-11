import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ja";

export const T = {
  en: {
    howItWorks: "How it works",
    launchShort: "Launch",
    launchFull: "Launch your city",
    footerTagline: "Helping cities connect in real life.",
    langToggle: "🇯🇵 日本語",

    heroBadge: "🚀 We're Launching Something New",
    heroH1a: "In Real Life,",
    heroH1b: "by AI",
    heroSub: "We're not just an events app. We're rebuilding how people find real friends in their communities.",
    heroSlogan: "Stop scrolling. Start living.",
    heroMission: "We help solve personalized event discovery and the logistics to get there. Be the change agent in your community.",
    heroLuddite: "A Luddite's Dream",
    heroLudditeDesc: "Let's build tools that enhance human skills, not replace them. Focus on technologies in service of people, not the reverse.",
    heroCta: "Launch your city",
    heroLiveNow: "Live now ·",
    heroNotify: "Want to be notified about feature updates?",

    statCities: "Cities live",
    statCategories: "Event categories",
    statSources: "Data sources",

    howBadge: "How it works",
    howH2: "From zero to newsletter in minutes",
    howSub: "Four steps to give your city its own events digest.",
    comingSoon: "Coming soon",

    step1Title: "Pick your city",
    step1Desc: "Choose any city and we set up a dedicated subdomain at yourCity.eventcarpooling.com.",
    step2Title: "Choose your categories",
    step2Desc: "Select which event types matter most — Tech, Arts, Sports, Wellness, or Civics.",
    step3Title: "Go live",
    step3Desc: "We automatically discover events from top sources and send a polished weekly digest.",
    step4Title: "Establish Carpooling with Your Trusted Network",
    step4Desc: "Coming soon — coordinate rides to events with people you already know and trust.",

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
    liveJoinMinutes: "Join the platform and launch in minutes",
    liveYourCityFirst: "Your city could be first",
    liveStartWave: "Launch today and start the newsletter wave",

    gameBadge: "New Feature",
    gameH2a: "Superconnector",
    gameH2b: "Gamification",
    gameComingSoon: "✨ Coming Soon!",
    gameDesc: "City operators will earn XP, climb leaderboards, unlock badges, and compete in weekly challenges — turning community building into a game.",
    gameChip1: "XP & Ranks",
    gameChip2: "Streaks",
    gameChip3: "Badges",
    gameChip4: "Weekly Challenges",
    gameChip5: "City Leaderboard",

    rideH2: "The Ride",
    rideBadge: "Upcoming Feature",
    rideDesc: "A community rides safety net matching people who can't drive with trusted neighbors who can — so seniors reach their appointments, students make it to class, and no one misses what matters because they couldn't get there.",
    rideChip1: "Medical Appointments",
    rideChip2: "School & Classes",
    rideChip3: "Groceries & Pharmacy",
    rideChip4: "Job Interviews",

    japanH2: "Japan Launch",
    japanDesc: "EventCarpooling.com is expanding to Japan — bringing the same weekly event digest, carpool RSVP, and city community features that power Austin to cities across Japan. Local organizers will be able to launch their own city newsletter, curate weekly events, grow a subscriber base, and earn XP on the global leaderboard.",
    japanStrong: "Tokyo, Osaka, Kyoto — watch this space.",

    ctaH2: "Ready to launch your city?",
    ctaSub: "Join the platform and give your city the newsletter it deserves. Setup takes under five minutes.",
    ctaButton: "Get started — it's free",
    ctaNoCard: "No credit card required.",

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
    langToggle: "🇺🇸 English",

    heroBadge: "🚀 新しいものを始めています",
    heroH1a: "リアルな体験を、",
    heroH1b: "AIで",
    heroSub: "私たちは単なるイベントアプリではありません。人々がコミュニティで本当の友人を見つける方法を再構築しています。",
    heroSlogan: "スクロールをやめて、生き始めよう。",
    heroMission: "パーソナライズされたイベント発見と、そこへ行くための手段を解決します。あなたのコミュニティの変革エージェントになろう。",
    heroLuddite: "ラッダイトの夢",
    heroLudditeDesc: "人間のスキルを高めるツールを作ろう、置き換えるのではなく。テクノロジーを人に奉仕させることに集中しよう、その逆ではなく。",
    heroCta: "あなたの街を立ち上げる",
    heroLiveNow: "公開中 ·",
    heroNotify: "機能アップデートの通知を受け取りますか？",

    statCities: "稼働中の都市",
    statCategories: "イベントカテゴリー",
    statSources: "データソース",

    howBadge: "仕組み",
    howH2: "数分でゼロからニュースレターを立ち上げ",
    howSub: "4ステップであなたの街独自のイベントダイジェストを。",
    comingSoon: "近日公開",

    step1Title: "都市を選ぶ",
    step1Desc: "任意の都市を選択すると、yourCity.eventcarpooling.comの専用サブドメインが設定されます。",
    step2Title: "カテゴリーを選ぶ",
    step2Desc: "テック、アート、スポーツ、ウェルネス、シビックスなど、重要なイベントタイプを選択。",
    step3Title: "公開する",
    step3Desc: "主要ソースからイベントを自動で発見し、洗練されたウィークリーダイジェストを送信。",
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
    liveJoinMinutes: "プラットフォームに参加して数分で立ち上げ",
    liveYourCityFirst: "あなたの街が最初になれる",
    liveStartWave: "今日立ち上げてニュースレターの波を起こそう",

    gameBadge: "新機能",
    gameH2a: "スーパーコネクター",
    gameH2b: "ゲーミフィケーション",
    gameComingSoon: "✨ 近日公開！",
    gameDesc: "都市オペレーターはXPを獲得し、リーダーボードを登り、バッジを解除し、ウィークリーチャレンジで競い合います — コミュニティ構築をゲームに変えます。",
    gameChip1: "XP & ランク",
    gameChip2: "ストリーク",
    gameChip3: "バッジ",
    gameChip4: "ウィークリーチャレンジ",
    gameChip5: "都市リーダーボード",

    rideH2: "ザ・ライド",
    rideBadge: "近日公開機能",
    rideDesc: "運転できない人と信頼できる近隣ドライバーをつなぐコミュニティの乗り物セーフティネット — 高齢者が診察に行け、学生が授業に出られ、大切な場所に誰も取り残されません。",
    rideChip1: "医療の受診",
    rideChip2: "通学・授業",
    rideChip3: "食料品・薬局",
    rideChip4: "就職面接",

    japanH2: "日本上陸",
    japanDesc: "EventCarpooling.comが日本に進出します — オースティンを支える毎週のイベントダイジェスト、カープールRSVP、都市コミュニティ機能を日本全国の都市へ。地域オーガナイザーは独自の都市ニュースレターを立ち上げ、週次イベントを厳選し、購読者を増やし、グローバルリーダーボードでXPを獲得できます。",
    japanStrong: "東京、大阪、京都 — ご注目ください。",

    ctaH2: "あなたの街を立ち上げる準備はできましたか？",
    ctaSub: "プラットフォームに参加して、あなたの街にふさわしいニュースレターを。セットアップはわずか5分以内。",
    ctaButton: "無料で始める",
    ctaNoCard: "クレジットカード不要。",

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

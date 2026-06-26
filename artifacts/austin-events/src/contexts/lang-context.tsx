import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "ja";

export const T = {
  en: {
    howItWorks: "How it works",
    launchShort: "Launch",
    launchFull: "Launch your city",
    footerTagline: "Helping cities connect in real life.",
    langToggle: "🇯🇵 日本語",

    heroBadge: "Automated city newsletters, powered by real data",
    heroH1a: "Your city or neighborhood deserves its own events newsletter.",
    heroH1b: "Be the Superconnector!",
    heroSub: "Launch a weekly events digest for any city in minutes. We automatically discover events from Luma, Meetup, Eventbrite, Bandsintown, and more — then send a beautifully curated email to your subscribers. Carpooling functionality will be enabled with your trusted network!",
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

    heroBadge: "AIが自動収集する、あなたの街のイベントニュースレター",
    heroH1a: "あなたの街やコミュニティに、独自のイベントニュースレターを。",
    heroH1b: "スーパーコネクターになろう！",
    heroSub: "数分で任意の都市向けウィークリーイベントダイジェストを開始。LumaやMeetup、Eventbrite、Bandsintownなど複数のソースから自動でイベントを収集し、洗練されたメールを購読者に届けます。信頼できる仲間とのカープール機能も近日登場！",
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
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem("ec-lang") as Lang) || "en";
    } catch {
      return "en";
    }
  });

  const toggleLang = () => {
    setLang(prev => {
      const next: Lang = prev === "en" ? "ja" : "en";
      try { localStorage.setItem("ec-lang", next); } catch {}
      return next;
    });
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

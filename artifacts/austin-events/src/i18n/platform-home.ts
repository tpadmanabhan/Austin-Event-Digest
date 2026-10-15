import type { Lang } from "../contexts/lang-context";

export const PLATFORM_HOME_COPY: Record<Lang, {
  heroKicker: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  heroFootnote: string;
  collageLabel: string;
  newEdition: string;
  baselineLead: string;
  baselineTail: string;
  directoryEyebrow: string;
  directoryTitle: string;
  directoryHighlight: string;
  directoryDescription: string;
  customNewsletterIntro: string;
  customNewsletterLink: string;
  customNewsletterEnding: string;
  newBadge: string;
  recentlyAdded: string;
  localEthics: string;
  cityExplore: string;
  directoryError: string;
  tryAgain: string;
  requestNoteTitle: string;
  requestNote: string;
  requestButton: string;
  caresEyebrow: string;
  caresTitle: string;
  caresHighlight: string;
  caresDescription: string;
  caresLink: string;
  ethicsEyebrow: string;
  ethicsTitle: string;
  ethicsHighlight: string;
  ethicsDescription: string;
  ethicsLink: string;
  closingEyebrow: string;
  closingTitle: string;
  closingHighlight: string;
  closingDescription: string;
  noAutomaticLaunch: string;
}> = {
  en: {
    heroKicker: "A local editor in your inbox",
    heroTitle: "Event Newsletter",
    heroHighlight: "in an Hour.",
    heroDescription: "A simple way to find worthwhile things happening nearby. Browse your city’s edition, or ask us to bring one to yours.",
    heroFootnote: "No account needed. Requests are reviewed by our team.",
    collageLabel: "Views from Boston, Houston, Miami and Sacramento",
    newEdition: "01 / NEW EDITION",
    baselineLead: "Made for your corner of the world",
    baselineTail: "Local events, useful reads, neighborly finds",
    directoryEyebrow: "The city editions",
    directoryTitle: "Find your",
    directoryHighlight: "nearby.",
    directoryDescription: "Choose a city for its local newsletter, event guide and city-specific reading.",
    customNewsletterIntro: "We can build custom Event Newsletters around your city’s voice and interests—like ",
    customNewsletterLink: "Raj’s Austin Events",
    customNewsletterEnding: ".",
    newBadge: "New",
    recentlyAdded: "Recently added",
    localEthics: "Local AI Ethics",
    cityExplore: "Explore the {city} edition",
    directoryError: "The directory is taking a moment. Showing the available editions.",
    tryAgain: "Try again",
    requestNoteTitle: "Not seeing your city?",
    requestNote: "Tell us where you are and we’ll review a city request.",
    requestButton: "Request your city",
    caresEyebrow: "AUSTIN · WEEKLY DEALS",
    caresTitle: "Good things nearby.",
    caresHighlight: "Good prices, too.",
    caresDescription: "AustinCares gathers local deals to help make life in Austin a little more affordable.",
    caresLink: "Explore AustinCares",
    ethicsEyebrow: "LOCAL AI ETHICS",
    ethicsTitle: "Technology belongs",
    ethicsHighlight: "local conversation.",
    ethicsDescription: "Each city edition brings AI questions back to the people, places and public choices around us.",
    ethicsLink: "Explore city-by-city resources",
    closingEyebrow: "A good place to begin",
    closingTitle: "Your city has",
    closingHighlight: "a story to tell.",
    closingDescription: "Request a city edition. Our team will review your note and follow up about next steps.",
    noAutomaticLaunch: "No password or account needed. A request does not automatically launch a city.",
  },
  ja: {
    heroKicker: "街の編集者が、あなたの受信箱に",
    heroTitle: "イベントニュース",
    heroHighlight: "1時間でお届け。",
    heroDescription: "近くで開催される、価値あるイベントを簡単にチェック。各都市のニュースレターを見るか、あなたの街の版づくりをご相談ください。",
    heroFootnote: "アカウントは不要です。リクエストはチームが確認します。",
    collageLabel: "ボストン、ヒューストン、マイアミ、サクラメントの風景",
    newEdition: "01 / 新しい都市版",
    baselineLead: "あなたの街にぴったりの情報",
    baselineTail: "地域のイベント、役立つ記事、近所の発見",
    directoryEyebrow: "各都市のニュースレター",
    directoryTitle: "街の情報を",
    directoryHighlight: "あなたの近くに。",
    directoryDescription: "各都市のニュースレター、イベントガイド、地域に役立つ読みものをご覧ください。",
    customNewsletterIntro: "街の個性や関心に合わせたイベントニュースレターを制作できます。例：",
    customNewsletterLink: "Rajのオースティン版",
    customNewsletterEnding: "。",
    newBadge: "新着",
    recentlyAdded: "最近追加された都市",
    localEthics: "地域のAI倫理",
    cityExplore: "{city}の都市版を見る",
    directoryError: "都市一覧の読み込みに時間がかかっています。表示できる都市をご案内します。",
    tryAgain: "再読み込み",
    requestNoteTitle: "お住まいの都市が見つかりませんか？",
    requestNote: "都市名をお知らせください。チームがリクエストを確認します。",
    requestButton: "都市をリクエスト",
    caresEyebrow: "オースティン · 毎週のお得情報",
    caresTitle: "近くで、いいことを。",
    caresHighlight: "お得な情報も。",
    caresDescription: "AustinCaresはオースティンの地域のお得情報を集め、暮らしを少し手頃にするお手伝いをします。",
    caresLink: "AustinCaresを見る",
    ethicsEyebrow: "地域のAI倫理",
    ethicsTitle: "テクノロジーの未来も",
    ethicsHighlight: "地域の対話から。",
    ethicsDescription: "各都市版では、AIをめぐる問いを地域の人々や場所、公共の選択と結びつけます。",
    ethicsLink: "都市ごとの情報を見る",
    closingEyebrow: "ここから始めましょう",
    closingTitle: "あなたの街には",
    closingHighlight: "伝えたい物語がある。",
    closingDescription: "都市版のリクエストをお送りください。チームが確認し、次のステップをご連絡します。",
    noAutomaticLaunch: "パスワードやアカウントは不要です。リクエストだけで都市版が自動公開されることはありません。",
  },
};

export const CITY_REQUEST_MODAL_COPY: Record<Lang, {
  title: string;
  savedTitle: string;
  description: string;
  savedDescription: string;
  cityLabel: string;
  cityPlaceholder: string;
  emailLabel: string;
  submit: string;
  submitting: string;
  noAccount: string;
  spockNote: string;
  requested: string;
  acknowledgementSent: string;
  acknowledgementFailed: string;
  notificationSent: string;
  notificationFailed: string;
  duplicate: string;
  noAutomaticLaunch: string;
  close: string;
  invalidRequest: string;
  rateLimited: string;
  requestNotConfirmed: string;
  connectionError: string;
  genericError: string;
}> = {
  en: {
    title: "Launch your city",
    savedTitle: "Request saved",
    description: "Tell us your city and email. Our team will review your request and follow up about next steps.",
    savedDescription: "Thank you. Your city request is saved for the team to review.",
    cityLabel: "City name",
    cityPlaceholder: "San Antonio",
    emailLabel: "Email address",
    submit: "Submit request",
    submitting: "Submitting request…",
    noAccount: "No password or account needed. Requests are reviewed manually.",
    spockNote: "Spock helps our team research events and draft guides; a person reviews your request.",
    requested: "has been requested. We’ll use",
    acknowledgementSent: "An acknowledgement email was accepted by our email service. Please check your inbox and spam folder; delivery can take a few minutes.",
    acknowledgementFailed: "Your request is saved, but your acknowledgement email could not be confirmed. Your request remains recorded for review.",
    notificationSent: "The admin notification was accepted by our email service.",
    notificationFailed: "Your request is saved, but the admin notification could not be confirmed. Please don’t resubmit; your request remains recorded for review.",
    duplicate: "This request was already recorded. No duplicate admin notification was sent.",
    noAutomaticLaunch: "Submitting a request does not automatically launch a city or create an account.",
    close: "Close",
    invalidRequest: "Enter a city name and a valid email address.",
    rateLimited: "Too many city requests. Please try again in an hour.",
    requestNotConfirmed: "We could not confirm that your request was saved. Please try again. Repeating the same request will not send another notification.",
    connectionError: "Connection error. Please try again with the same city and email; this will not send duplicate notifications.",
    genericError: "Your request could not be saved. Please try again.",
  },
  ja: {
    title: "都市版をリクエスト",
    savedTitle: "リクエストを受け付けました",
    description: "都市名とメールアドレスをお知らせください。チームが内容を確認し、次のステップをご連絡します。",
    savedDescription: "リクエストを保存しました。チームが確認します。",
    cityLabel: "都市名",
    cityPlaceholder: "サンアントニオ",
    emailLabel: "メールアドレス",
    submit: "リクエストを送信",
    submitting: "送信中…",
    noAccount: "パスワードやアカウントは不要です。リクエストはチームが確認します。",
    spockNote: "Spockがイベントの調査やガイドの下書きを手伝い、リクエストは担当者が確認します。",
    requested: "のリクエストを受け付けました。確認のご連絡は",
    acknowledgementSent: "受付確認メールを送信しました。届くまで数分かかることがあります。受信トレイをご確認ください。",
    acknowledgementFailed: "リクエストは保存されていますが、受付確認メールを確認できませんでした。リクエストはチームの確認用に記録されています。",
    notificationSent: "チームへの通知をメールサービスが受け付けました。",
    notificationFailed: "リクエストは保存されていますが、チームへの通知を確認できませんでした。再送信は不要です。リクエストは記録されています。",
    duplicate: "このリクエストはすでに記録されています。チームへの重複通知は送信されていません。",
    noAutomaticLaunch: "リクエストを送信しても、都市版やアカウントが自動作成されることはありません。",
    close: "閉じる",
    invalidRequest: "都市名と有効なメールアドレスを入力してください。",
    rateLimited: "リクエストが集中しています。1時間後にもう一度お試しください。",
    requestNotConfirmed: "保存を確認できませんでした。同じ都市名とメールアドレスで再試行してください。重複通知は送信されません。",
    connectionError: "接続できませんでした。同じ都市名とメールアドレスで再試行してください。重複通知は送信されません。",
    genericError: "リクエストを保存できませんでした。もう一度お試しください。",
  },
};

export const JAPANESE_CITY_COPY: Record<string, { city: string; name: string; alt: string }> = {
  boston: { city: "ボストン", name: "ボストンのイベント", alt: "ボストンの街並み" },
  atlanta: { city: "アトランタ", name: "アトランタのイベント", alt: "アトランタの街並みのイラスト" },
  sanfrancisco: { city: "サンフランシスコ", name: "サンフランシスコのイベント", alt: "サンフランシスコの湾越しの街並み" },
  austin: { city: "オースティン", name: "Rajのオースティン版イベント", alt: "日没時のオースティンのスカイライン" },
  sacramento: { city: "サクラメント", name: "サクラメントのイベント", alt: "サクラメントの街並み" },
  miami: { city: "マイアミ", name: "マイアミのイベント", alt: "マイアミの水辺とビーチ沿いのスカイライン" },
  houston: { city: "ヒューストン", name: "ヒューストンのイベント", alt: "夕暮れのヒューストンのスカイライン" },
  tokyo: { city: "東京", name: "東京のイベント", alt: "夕暮れに輝く東京のスカイライン" },
  stlouis: { city: "セントルイス", name: "セントルイスのイベント", alt: "セントルイスの街並み" },
  portland: { city: "ポートランド", name: "ポートランドのイベント", alt: "ウィラメット川に映るポートランドのスカイライン" },
  bulverde: { city: "ブルベルデ", name: "ブルベルデのイベント", alt: "テキサス・ヒルカントリーの風景" },
  dc: { city: "ワシントンD.C.", name: "ワシントンD.C.のイベント", alt: "ワシントンD.C.の街並み" },
};

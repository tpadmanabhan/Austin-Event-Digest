import type { Lang } from "../contexts/lang-context";

export const PLATFORM_HOME_COPY: Record<Lang, {
  heroKicker: string;
  heroTitle: string;
  heroHighlight: string;
  heroTagline: string;
  heroDescription: string;
  heroFootnote: string;
  collageLabel: string;
  editionLabel: string;
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
    heroKicker: "IN REAL LIFE · YOUR CITY, MORE CLOSELY",
    heroTitle: "Make room",
    heroHighlight: "for the real.",
    heroTagline: "Good things happen when we show up.",
    heroDescription: "A thoughtful guide to worthwhile events, local stories and city newsletters—made to help you step out and feel more at home where you live.",
    heroFootnote: "Browse a city edition. No account needed.",
    collageLabel: "Views from Boston, Houston, Miami and Sacramento",
    editionLabel: "01 / CITY EDITION",
    baselineLead: "A little closer to where you are",
    baselineTail: "Local events · considered reads · shared places",
    directoryEyebrow: "A growing set of city editions",
    directoryTitle: "Your city,",
    directoryHighlight: "in the picture.",
    directoryDescription: "Explore locally grounded event guides and newsletters, shaped by the places and people that make each city itself.",
    customNewsletterIntro: "Every edition has its own point of view. See how that looks in ",
    customNewsletterLink: "Raj’s Austin Events",
    customNewsletterEnding: ".",
    newBadge: "New",
    localEthics: "Local AI Ethics",
    cityExplore: "Explore the {city} edition",
    directoryError: "The directory is taking a moment. Showing the available editions.",
    tryAgain: "Try again",
    requestNoteTitle: "Your city isn’t here yet?",
    requestNote: "Let us know where you are. Our team reviews every city request.",
    requestButton: "Suggest a city",
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
    closingEyebrow: "A note from your neighborhood",
    closingTitle: "Let’s make your",
    closingHighlight: "city feel closer.",
    closingDescription: "Tell us which city you’d like to see. We’ll read your request and follow up about what might come next.",
    noAutomaticLaunch: "No account needed. A request is reviewed by a person and does not launch a city automatically.",
  },
  ja: {
    heroKicker: "IN REAL LIFE · 街を、もっと身近に",
    heroTitle: "街と出会う",
    heroHighlight: "きっかけを。",
    heroTagline: "出かけると、街は少し近くなる。",
    heroDescription: "街で見つけた、心に残るイベントや地域の読みものを。暮らす場所をもっと知り、誰かと同じ時間を過ごすためのガイドです。",
    heroFootnote: "都市版をご覧ください。アカウントは不要です。",
    collageLabel: "ボストン、ヒューストン、マイアミ、サクラメントの風景",
    editionLabel: "01 / 都市版",
    baselineLead: "いつもの街を、少し新しく",
    baselineTail: "地域のイベント · 読みもの · 人が集う場所",
    directoryEyebrow: "街ごとのエディション",
    directoryTitle: "あなたの街を、",
    directoryHighlight: "もっと知る。",
    directoryDescription: "街の人や場所に根ざしたイベントガイドとニュースレターを、各都市のエディションからご覧ください。",
    customNewsletterIntro: "街ごとに異なる視点を大切にしています。たとえば",
    customNewsletterLink: "Rajのオースティン版",
    customNewsletterEnding: "。",
    newBadge: "新着",
    localEthics: "地域のAI倫理",
    cityExplore: "{city}の都市版を見る",
    directoryError: "都市一覧の読み込みに時間がかかっています。表示できる都市をご案内します。",
    tryAgain: "再読み込み",
    requestNoteTitle: "あなたの街が見つかりませんか？",
    requestNote: "街の名前をお知らせください。チームが一件ずつ確認します。",
    requestButton: "街を提案する",
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
    closingEyebrow: "街から届く、小さな便り",
    closingTitle: "あなたの街を、",
    closingHighlight: "もっと身近に。",
    closingDescription: "見てみたい街をお知らせください。担当者が内容を確認し、今後についてご連絡します。",
    noAutomaticLaunch: "アカウントは不要です。リクエストは担当者が確認し、都市版が自動公開されることはありません。",
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
  la: { city: "ロサンゼルス", name: "ロサンゼルスのイベント", alt: "ロサンゼルス近郊、ポイント・デュームから望む太平洋" },
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
  osaka: { city: "大阪", name: "大阪のイベント", alt: "夜の道頓堀と大阪の街の灯り" },
};

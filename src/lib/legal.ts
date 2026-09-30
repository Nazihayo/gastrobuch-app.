import type { Locale } from "./i18n/dictionaries";

// Long-form legal copy lives here rather than in dictionaries.ts, which is
// typed as short single-line strings. Kept honest and specific to what this
// app actually does — no generic boilerplate claims it can't back up.

type LegalSection = { heading: string; body: string };
type LegalPage = { title: string; updated: string; intro: string; sections: LegalSection[] };

export const privacyContent: Record<Locale, LegalPage> = {
  de: {
    title: "Datenschutz",
    updated: "Stand: 2026",
    intro:
      "GastroHub ist ein internes Werkzeug zur Restaurantführung (Buchhaltung, Bestellungen, Kundenverwaltung). Diese Seite beschreibt, welche Daten gespeichert werden und wie — ohne Marketing-Floskeln.",
    sections: [
      {
        heading: "Welche Daten werden gespeichert",
        body: "Konto-E-Mail, Restaurantname, Land und Sprache, Tagesumsätze und Einkäufe, Personal (Name, Stunden, Stundenlohn), Lagerartikel, laufende Fixkosten, Rezeptkosten, Kundendaten (Name, Telefon, Adresse) für Telefon-/Lieferbestellungen, HACCP-Temperaturprotokolle und Checklisten sowie Monatsziele.",
      },
      {
        heading: "Wo die Daten liegen",
        body: "Alle Daten liegen in der Supabase-Datenbank (PostgreSQL), die für dieses Projekt eingerichtet ist. Der Zugriff ist per Row-Level-Security strikt auf Nutzer beschränkt, die dem jeweiligen Restaurant zugeordnet sind — kein anderer Nutzer kann diese Daten sehen.",
      },
      {
        heading: "Weitergabe an Dritte",
        body: "Es findet keine Weitergabe an Dritte, keine Werbung und kein Tracking statt. Es werden keine Analyse- oder Marketing-Cookies gesetzt — nur ein technisches Cookie zur Sprachauswahl und die von Supabase gesetzten Sitzungs-Cookies für die Anmeldung.",
      },
      {
        heading: "Verantwortlichkeit",
        body: "Dies ist ein selbst betriebenes Werkzeug, kein Produkt eines registrierten Unternehmens. Für die rechtskonforme Verarbeitung von Kunden- und Mitarbeiterdaten in deiner Gerichtsbarkeit (z. B. DSGVO) bist du als Betreiber deines Restaurants selbst verantwortlich.",
      },
      {
        heading: "Kontakt",
        body: "Fragen zu deinen Daten richtest du an die E-Mail-Adresse, mit der du dich angemeldet hast.",
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: 2026",
    intro:
      "GastroHub أداة داخلية لإدارة المطاعم (محاسبة، طلبات، إدارة عملاء). الصفحة دي بتشرح بالظبط إيه البيانات المحفوظة وإزاي — من غير كلام تسويقي.",
    sections: [
      {
        heading: "إيه البيانات المحفوظة",
        body: "إيميل الحساب، اسم المطعم، الدولة واللغة، المبيعات والمشتريات اليومية، بيانات الموظفين (الاسم، الساعات، سعر الساعة)، أصناف المخزون، المصاريف الثابتة، تكلفة الوصفات، بيانات العملاء (الاسم، التليفون، العنوان) لطلبات التليفون/التوصيل، سجلات درجة الحرارة والتشيك ليست الخاصة بالهايجين (HACCP)، وأهداف الشهر.",
      },
      {
        heading: "فين البيانات محفوظة",
        body: "كل البيانات محفوظة في قاعدة بيانات Supabase (PostgreSQL) المُعدّة لهذا المشروع. الوصول مقيّد بشكل صارم عن طريق Row-Level-Security للمستخدمين المرتبطين بالمطعم بس — مفيش مستخدم تاني يقدر يشوف البيانات دي.",
      },
      {
        heading: "المشاركة مع أطراف تالتة",
        body: "مفيش أي مشاركة مع أطراف تالتة، مفيش إعلانات، ومفيش تتبّع (tracking). مفيش كوكيز تحليل أو تسويق — بس كوكي تقني واحد لحفظ اللغة، وكوكيز الجلسة اللي بيحطها Supabase عشان تسجيل الدخول.",
      },
      {
        heading: "المسؤولية",
        body: "دي أداة مُدارة ذاتيًا، مش منتج شركة مسجّلة. الالتزام القانوني بمعالجة بيانات العملاء والموظفين حسب بلدك (زي GDPR في أوروبا) هو مسؤوليتك إنت كصاحب المطعم.",
      },
      {
        heading: "التواصل",
        body: "أي سؤال عن بياناتك ابعته على نفس الإيميل اللي سجّلت بيه.",
      },
    ],
  },
  en: {
    title: "Privacy",
    updated: "Last updated: 2026",
    intro:
      "GastroHub is an internal restaurant management tool (bookkeeping, orders, customer management). This page describes exactly what data is stored and how — no marketing language.",
    sections: [
      {
        heading: "What data is stored",
        body: "Account email, restaurant name, country and language, daily sales and purchases, staff (name, hours, hourly rate), inventory items, recurring fixed costs, recipe costs, customer data (name, phone, address) for phone/delivery orders, HACCP temperature logs and checklists, and monthly goals.",
      },
      {
        heading: "Where the data lives",
        body: "All data lives in the Supabase database (PostgreSQL) set up for this project. Access is strictly limited via Row Level Security to users associated with that specific restaurant — no other user can see this data.",
      },
      {
        heading: "Sharing with third parties",
        body: "There is no sharing with third parties, no advertising, and no tracking. No analytics or marketing cookies are set — only one technical cookie for language preference and the session cookies Supabase sets for sign-in.",
      },
      {
        heading: "Responsibility",
        body: "This is a self-run tool, not the product of a registered company. Lawful processing of customer and staff data under your jurisdiction (e.g. GDPR) is your own responsibility as the restaurant's operator.",
      },
      {
        heading: "Contact",
        body: "Questions about your data go to the email address you signed up with.",
      },
    ],
  },
};

export const termsContent: Record<Locale, LegalPage> = {
  de: {
    title: "Nutzungsbedingungen",
    updated: "Stand: 2026",
    intro:
      "Mit der Nutzung von GastroHub akzeptierst du die folgenden Punkte.",
    sections: [
      {
        heading: "Keine Steuer- oder Rechtsberatung",
        body: "Alle Berechnungen (USt., Personalkosten, Break-even, Gewinn) sind automatische Schätzungen zur Orientierung. Sie ersetzen keine Steuererklärung und keine Beratung durch Steuerberater, Lohnbüro oder Hygienefachkraft.",
      },
      {
        heading: "Keine Garantie",
        body: "Das Werkzeug wird ohne Garantie auf Verfügbarkeit oder Fehlerfreiheit bereitgestellt. Trage wichtige Zahlen zusätzlich an anderer Stelle ein, bis du Vertrauen in die Verlässlichkeit gewonnen hast.",
      },
      {
        heading: "Deine Verantwortung",
        body: "Du bist verantwortlich für die Richtigkeit der eingegebenen Daten und für die Einhaltung aller gesetzlichen Pflichten deines Restaurants (Steuer, Arbeitsrecht, Lebensmittelhygiene, Datenschutz gegenüber deinen Kunden und Mitarbeitern).",
      },
      {
        heading: "Kündigung",
        body: "Du kannst dein Konto jederzeit durch eine formlose Nachricht an die Betreiberadresse löschen lassen.",
      },
    ],
  },
  ar: {
    title: "شروط الاستخدام",
    updated: "آخر تحديث: 2026",
    intro: "باستخدامك لـ GastroHub إنت موافق على النقط الجاية.",
    sections: [
      {
        heading: "مش استشارة ضريبية أو قانونية",
        body: "كل الحسابات (الضريبة، تكلفة العمالة، نقطة التعادل، الربح) تقديرات آلية للتوجيه بس. مش بديل عن الإقرار الضريبي ولا استشارة محاسب أو مكتب رواتب أو مختص هايجين.",
      },
      {
        heading: "من غير ضمان",
        body: "الأداة دي متاحة من غير ضمان استمرارية أو خلوها من الأخطاء. احتفظ بنسخة من الأرقام المهمة في مكان تاني لحد ما تثق في موثوقيتها.",
      },
      {
        heading: "مسؤوليتك",
        body: "إنت المسؤول عن صحة البيانات اللي بتدخلها وعن الالتزام بكل القوانين الخاصة بمطعمك (الضريبة، قانون العمل، سلامة الغذاء، خصوصية عملائك وموظفينك).",
      },
      {
        heading: "إلغاء الحساب",
        body: "تقدر تطلب حذف حسابك في أي وقت برسالة بسيطة لإيميل المسؤول عن التطبيق.",
      },
    ],
  },
  en: {
    title: "Terms of use",
    updated: "Last updated: 2026",
    intro: "By using GastroHub you accept the following points.",
    sections: [
      {
        heading: "Not tax or legal advice",
        body: "All calculations (VAT, labor cost, break-even, profit) are automatic estimates for guidance only. They do not replace a tax return or advice from an accountant, payroll office, or food-hygiene professional.",
      },
      {
        heading: "No warranty",
        body: "This tool is provided with no guarantee of uptime or being error-free. Keep important figures recorded elsewhere too until you've built trust in its reliability.",
      },
      {
        heading: "Your responsibility",
        body: "You're responsible for the accuracy of the data you enter and for complying with all legal obligations of your restaurant (tax, labor law, food safety, and privacy toward your customers and staff).",
      },
      {
        heading: "Closing your account",
        body: "You can ask to have your account deleted at any time with a simple message to the operator's email address.",
      },
    ],
  },
};

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <article class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6">
      <header class="space-y-2">
        <h1 class="text-2xl md:text-3xl font-bold dark:text-white">{{ policy.title }}</h1>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ policy.intro }}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ policy.effectiveDate }}
        </p>
      </header>

      <section
        v-for="section in policy.sections"
        :key="section.heading"
        class="space-y-2"
      >
        <h2 class="text-xl font-semibold dark:text-white">{{ section.heading }}</h2>
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="text-sm md:text-base text-gray-700 dark:text-gray-200"
        >
          {{ paragraph }}
        </p>
        <ul
          v-if="section.bullets"
          class="list-disc pl-6 space-y-1 text-sm md:text-base text-gray-700 dark:text-gray-200"
        >
          <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <a
          v-if="section.link"
          :href="section.link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block text-app-primary hover:text-app-primary-2 underline text-sm md:text-base"
        >
          {{ section.link.label }}
        </a>
      </section>

      <section class="space-y-2">
        <h2 class="text-xl font-semibold dark:text-white">{{ policy.externalPoliciesHeading }}</h2>
        <ul class="list-disc pl-6 space-y-1 text-sm md:text-base text-gray-700 dark:text-gray-200">
          <li v-for="link in policy.externalPolicyLinks" :key="link.url">
            <a
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-app-primary hover:text-app-primary-2 underline"
            >
              {{ link.label }}
            </a>
          </li>
        </ul>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
interface PolicySection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  link?: {
    label: string
    url: string
  }
}

interface PolicyContent {
  title: string
  intro: string
  effectiveDate: string
  sections: PolicySection[]
  externalPoliciesHeading: string
  externalPolicyLinks: Array<{
    label: string
    url: string
  }>
}

const { locale } = useI18n()

const jaPolicy: PolicyContent = {
  title: 'プライバシーポリシー',
  intro:
    '合同会社隠岐デジタルラボ（OKi Digital Lab, LLC.）（以下「当社」）は、隠岐航路案内（以下「本アプリ」）における利用者情報の取扱いについて、以下のとおり定めます。',
  effectiveDate: '制定日・最終改定日: 2026年2月9日',
  sections: [
    {
      heading: '1. 取得する情報',
      bullets: [
        '本アプリの利用状況（閲覧ページ、検索条件（出発地・到着地・検索日時）などの統計情報）',
        '端末情報・通信情報（IPアドレス、ブラウザ/OS情報、Cookie等の識別子）',
        '利用者が端末内に保存する情報（設定、お気に入り、検索履歴、時刻表/お知らせキャッシュ）'
      ]
    },
    {
      heading: '2. 利用目的',
      bullets: [
        '本アプリの提供、表示最適化、障害対応のため',
        '時刻表検索・運航情報提供など本機能の実行のため',
        '利用状況の分析、品質改善、機能改善のため',
        '不正利用防止、セキュリティ対策のため',
        'お問い合わせ対応のため'
      ]
    },
    {
      heading: '3. 外部サービスの利用',
      paragraphs: [
        '本アプリでは、以下の外部サービスを利用しています。これらのサービス提供者が、各社のプライバシーポリシーに基づいて情報を取り扱う場合があります。'
      ],
      bullets: [
        'Google Firebase（Firestore / Storage / Analytics / Cloud Functions）',
        'Google Maps Platform',
        'OpenStreetMap（地図タイル）'
      ]
    },
    {
      heading: '4. 第三者提供',
      paragraphs: [
        '当社は、法令に基づく場合を除き、利用者情報を利用者の同意なく第三者に提供しません。'
      ]
    },
    {
      heading: '5. 保存期間',
      bullets: [
        '端末内データ（設定・お気に入り・検索履歴等）は、利用者が削除するまで端末内に保存されます。',
        '統計情報等は、利用目的の達成に必要な期間保管します。'
      ]
    },
    {
      heading: '6. 安全管理措置',
      paragraphs: [
        '当社は、利用者情報の漏えい、滅失または毀損の防止その他安全管理のため、アクセス制御、通信の保護、運用管理等の合理的な安全管理措置を講じます。'
      ]
    },
    {
      heading: '7. 利用者の権利',
      paragraphs: [
        '利用者は、法令の定めに従い、当社が保有する自己の個人情報について、開示、訂正、利用停止、削除等を求めることができます。'
      ]
    },
    {
      heading: '8. 未成年者の利用',
      paragraphs: [
        '未成年者が本アプリを利用する場合は、必要に応じて保護者の同意を得た上でご利用ください。'
      ]
    },
    {
      heading: '9. ポリシーの改定',
      paragraphs: [
        '当社は、法令改正やサービス内容の変更等に応じて、本ポリシーを改定することがあります。重要な変更がある場合は、本アプリまたは当社ウェブサイト上で告知します。'
      ]
    },
    {
      heading: '10. お問い合わせ窓口',
      paragraphs: [
        '本ポリシーに関するお問い合わせは、当社ウェブサイトよりご連絡ください。'
      ],
      link: {
        label: 'https://oki-digilab.com/',
        url: 'https://oki-digilab.com/'
      }
    }
  ],
  externalPoliciesHeading: '外部サービスのプライバシーポリシー',
  externalPolicyLinks: [
    {
      label: 'Google プライバシーポリシー',
      url: 'https://policies.google.com/privacy'
    },
    {
      label: 'Firebase のデータとプライバシー',
      url: 'https://firebase.google.com/support/privacy'
    },
    {
      label: 'OpenStreetMap Foundation Privacy Policy',
      url: 'https://osmfoundation.org/wiki/Privacy_Policy'
    }
  ]
}

const enPolicy: PolicyContent = {
  title: 'Privacy Policy',
  intro:
    'Oki Digital Lab, LLC. (hereinafter referred to as "we", "our", or "us") sets forth the following policy regarding the handling of user information in Oki Route Guide (the "App").',
  effectiveDate: 'Established / Last Updated: February 9, 2026',
  sections: [
    {
      heading: '1. Information We Collect',
      bullets: [
        'App usage information (such as viewed pages and search conditions including departure port, destination port, and search date/time)',
        'Device and communication information (such as IP address, browser/OS information, and identifiers including cookies)',
        'Information stored locally on your device (settings, favorites, search history, timetable/news cache)'
      ]
    },
    {
      heading: '2. Purposes of Use',
      bullets: [
        'To provide, optimize display, and troubleshoot the App',
        'To execute core features such as timetable search and service-status delivery',
        'To analyze usage and improve quality and features',
        'To prevent unauthorized use and support security operations',
        'To respond to inquiries'
      ]
    },
    {
      heading: '3. Use of Third-Party Services',
      paragraphs: [
        'The App uses the following third-party services. These providers may process information in accordance with their own privacy policies.'
      ],
      bullets: [
        'Google Firebase (Firestore / Storage / Analytics / Cloud Functions)',
        'Google Maps Platform',
        'OpenStreetMap (map tiles)'
      ]
    },
    {
      heading: '4. Provision to Third Parties',
      paragraphs: [
        'Except as required by law, we do not provide user information to third parties without your consent.'
      ]
    },
    {
      heading: '5. Retention Period',
      bullets: [
        'Locally stored data (settings, favorites, search history, etc.) remains on your device until you delete it.',
        'Analytics data is retained for the period necessary to fulfill its purposes.'
      ]
    },
    {
      heading: '6. Security Measures',
      paragraphs: [
        'We implement reasonable security measures, including access control, communication protection, and operational safeguards, to prevent leakage, loss, or damage of user information.'
      ]
    },
    {
      heading: '7. Your Rights',
      paragraphs: [
        'In accordance with applicable laws, you may request disclosure, correction, suspension of use, or deletion of your personal information retained by us.'
      ]
    },
    {
      heading: '8. Use by Minors',
      paragraphs: [
        'If minors use the App, they should do so with guardian consent when required.'
      ]
    },
    {
      heading: '9. Changes to This Policy',
      paragraphs: [
        'We may revise this policy due to legal updates or service changes. Material changes will be announced in the App or on our website.'
      ]
    },
    {
      heading: '10. Contact',
      paragraphs: [
        'For inquiries regarding this policy, please contact us via our website.'
      ],
      link: {
        label: 'https://oki-digilab.com/',
        url: 'https://oki-digilab.com/'
      }
    }
  ],
  externalPoliciesHeading: 'Third-Party Privacy Policies',
  externalPolicyLinks: [
    {
      label: 'Google Privacy Policy',
      url: 'https://policies.google.com/privacy'
    },
    {
      label: 'Firebase Data Processing and Privacy',
      url: 'https://firebase.google.com/support/privacy'
    },
    {
      label: 'OpenStreetMap Foundation Privacy Policy',
      url: 'https://osmfoundation.org/wiki/Privacy_Policy'
    }
  ]
}

const policy = computed(() => {
  return String(locale.value).startsWith('en') ? enPolicy : jaPolicy
})

useHead(() => ({
  title: String(locale.value).startsWith('en')
    ? 'Privacy Policy | Oki Route Guide'
    : 'プライバシーポリシー | 隠岐航路案内'
}))
</script>

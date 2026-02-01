export const getPortBadgeClass = (badge: string) => {
  switch (badge) {
    case '西ノ島町':
    case 'Nishinoshima':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:ring-emerald-700'
    case '海士町':
    case 'Ama':
      return 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900 dark:text-sky-200 dark:ring-sky-700'
    case '知夫村':
    case 'Chibu':
      return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900 dark:text-red-200 dark:ring-red-700'
    case '隠岐の島町':
    case 'Okinoshima':
    case 'Okinoshima Town':
      return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:ring-amber-700'
    case '松江市':
    case 'Matsue':
    case '境港市':
    case 'Sakaiminato':
      return 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-500'
    default:
      return 'bg-app-surface-2 text-app-muted ring-app-border/70'
  }
}

export const getPortBadgeClass = (badge: string) => {
  switch (badge) {
    case '西ノ島町':
    case 'Nishinoshima':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800'
    case '海士町':
    case 'Ama':
      return 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800'
    case '知夫村':
    case 'Chibu':
      return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800'
    case '隠岐の島町':
    case 'Okinoshima':
    case 'Okinoshima Town':
      return 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800'
    case 'Matsue':
    case 'Sakaiminato':
      return 'bg-gray-100 text-gray-700 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-700'
    case '港':
    case 'Port':
      return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800'
    case '停留所':
    case 'Stop':
      return 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:ring-indigo-800'
    case '空港':
    case 'Airport':
      return 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-800'
    default:
      return 'bg-app-surface-2 text-app-muted ring-app-border/70'
  }
}

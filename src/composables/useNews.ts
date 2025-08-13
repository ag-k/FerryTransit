import { ref, computed } from "vue";
import type { News } from "~/types";

export const useNews = () => {
  const newsList = ref<News[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // お知らせの取得
  const fetchNews = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // まずキャッシュから取得を試みる
      const cachedNews = await getCachedNews();
      if (cachedNews) {
        newsList.value = cachedNews;
      }

      // Firebase Storageから最新データを取得（クライアントサイドのみ）
      if (import.meta.client) {
        try {
          const response = await fetch(
            "https://firebasestorage.googleapis.com/v0/b/oki-ferryguide.firebasestorage.app/o/data%2Fnews.json?alt=media",
            {
              method: "GET",
              mode: "cors",
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              newsList.value = data;
              // キャッシュに保存
              if (data.length > 0) {
                await setCachedNews(data);
              }
              error.value = null;
            }
          } else if (response.status === 404) {
            // データが未公開の場合
            console.log("News data not published yet");
            newsList.value = [];
            error.value = null;
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (fetchError: any) {
          // ネットワークエラーなどの場合
          console.error("Failed to fetch from Storage:", fetchError);
          throw fetchError;
        }
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
      error.value = "お知らせの取得に失敗しました";

      // エラー時はキャッシュから取得
      const cachedNews = await getCachedNews();
      if (cachedNews) {
        newsList.value = cachedNews;
        error.value = null; // キャッシュがある場合はエラーを表示しない
      }
    } finally {
      isLoading.value = false;
    }
  };

  // 公開されたお知らせのみフィルタ
  const publishedNews = computed(() => {
    const now = new Date();
    return newsList.value.filter((news) => {
      // 公開状態の確認
      if (news.status !== "published") {
        // 予約投稿の場合は公開日時をチェック
        if (news.status === "scheduled") {
          const publishDate = new Date(news.publishDate);
          return publishDate <= now;
        }
        return false;
      }
      return true;
    });
  });

  // 固定されたお知らせ
  const pinnedNews = computed(() => {
    return publishedNews.value
      .filter((news) => news.isPinned)
      .sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
  });

  // 通常のお知らせ（固定以外）
  const regularNews = computed(() => {
    return publishedNews.value
      .filter((news) => !news.isPinned)
      .sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
  });

  // カテゴリ別フィルタ
  const getNewsByCategory = (category: string) => {
    return publishedNews.value
      .filter((news) => news.category === category)
      .sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
  };

  // 最新のお知らせ（指定件数）
  const getLatestNews = (count: number = 5) => {
    return publishedNews.value
      .slice(0, count)
      .sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
  };

  // キャッシュからお知らせを取得
  const getCachedNews = async (): Promise<News[] | null> => {
    try {
      if (import.meta.client) {
        const cached = localStorage.getItem("ferry_news_cache");
        const cacheTime = localStorage.getItem("ferry_news_cache_time");

        if (cached && cacheTime) {
          const cacheAge = Date.now() - parseInt(cacheTime);
          // 30分以内のキャッシュは有効
          if (cacheAge < 30 * 60 * 1000) {
            return JSON.parse(cached);
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get cached news:", error);
      return null;
    }
  };

  // お知らせをキャッシュに保存
  const setCachedNews = async (news: News[]) => {
    try {
      if (import.meta.client) {
        localStorage.setItem("ferry_news_cache", JSON.stringify(news));
        localStorage.setItem("ferry_news_cache_time", Date.now().toString());
      }
    } catch (error) {
      console.error("Failed to cache news:", error);
    }
  };

  // お知らせの閲覧数をカウント（クライアント側では実装しない）
  const incrementViewCount = async (newsId: string) => {
    // 閲覧数のカウントは管理画面側で実装
    console.log("View news:", newsId);
  };

  // カテゴリーのラベルを取得
  const getCategoryLabel = (category: string) => {
    const { $i18n } = useNuxtApp();

    const labels: Record<string, string> = {
      announcement: $i18n.t("news.category.announcement", "お知らせ"),
      maintenance: $i18n.t("news.category.maintenance", "メンテナンス"),
      feature: $i18n.t("news.category.feature", "新機能"),
      campaign: $i18n.t("news.category.campaign", "キャンペーン"),
    };

    return labels[category] || category;
  };

  // 優先度のラベルを取得
  const getPriorityLabel = (priority: string) => {
    const { $i18n } = useNuxtApp();

    const labels: Record<string, string> = {
      low: $i18n.t("news.priority.low", "低"),
      medium: $i18n.t("news.priority.medium", "中"),
      high: $i18n.t("news.priority.high", "高"),
      urgent: $i18n.t("news.priority.urgent", "緊急"),
    };

    return labels[priority] || priority;
  };

  // 日付のフォーマット
  const formatDate = (date: string | Date) => {
    const { $i18n } = useNuxtApp();
    const locale = $i18n.locale.value;

    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return {
    // データ
    newsList: readonly(newsList),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // 計算されたプロパティ
    publishedNews,
    pinnedNews,
    regularNews,

    // メソッド
    fetchNews,
    getNewsByCategory,
    getLatestNews,
    incrementViewCount,
    getCategoryLabel,
    getPriorityLabel,
    formatDate,
  };
};

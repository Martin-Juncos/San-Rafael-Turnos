import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const NEWS_SOURCE_NAME = 'TN Salud'
const SCRIPT_JSON_LD_REGEX = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
const REQUEST_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (compatible; SanRafaelTurnosBot/1.0)'
}

const newsCache = {
  items: [],
  fetchedAt: null,
  expiresAt: 0
}

let refreshPromise = null

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const decodeHtmlEntities = (value = '') => (
  String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
)

const cleanText = (value = '') => decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()

const stripHtmlTags = (value = '') => String(value).replace(/<[^>]+>/g, ' ')

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const toAbsoluteUrl = (value) => {
  if (!value) return ''
  try {
    return new URL(value, config.NEWS_SOURCE_URL).toString()
  } catch (_error) {
    return ''
  }
}

const buildNewsIdFromUrl = (value = '') => value
  .replace(/^https?:\/\//, '')
  .replace(/[^a-zA-Z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase()

const getMetaContent = (html, key, attribute = 'property') => {
  const escapedKey = escapeRegex(key)
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escapedKey}["'][^>]*>`, 'i')
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return cleanText(match[1])
    }
  }

  return ''
}

const getCanonicalUrl = (html) => {
  const patterns = [
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return toAbsoluteUrl(match[1])
    }
  }

  return ''
}

const toIsoDate = (value) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const toCategoryLabel = (value = '') => value
  .split('-')
  .filter(Boolean)
  .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
  .join(' ')

const getCategoryFromUrl = (value) => {
  try {
    const parsed = new URL(value)
    const segments = parsed.pathname
      .split('/')
      .map((segment) => segment.trim().toLowerCase())
      .filter(Boolean)

    const healthIndex = segments.indexOf('salud')
    if (healthIndex >= 0 && segments[healthIndex + 1]) {
      return toCategoryLabel(segments[healthIndex + 1])
    }

    return 'Salud'
  } catch (_error) {
    return 'Salud'
  }
}

const collectItemLists = (node, target = []) => {
  if (!node) return target

  if (Array.isArray(node)) {
    node.forEach((item) => collectItemLists(item, target))
    return target
  }

  if (typeof node !== 'object') return target

  if (String(node['@type'] || '').toLowerCase() === 'itemlist') {
    target.push(node)
  }

  Object.values(node).forEach((value) => collectItemLists(value, target))
  return target
}

const collectNodesByType = (node, type, target = []) => {
  if (!node) return target

  if (Array.isArray(node)) {
    node.forEach((item) => collectNodesByType(item, type, target))
    return target
  }

  if (typeof node !== 'object') return target

  const nodeType = String(node['@type'] || '').toLowerCase()
  if (nodeType.includes(type.toLowerCase())) {
    target.push(node)
  }

  Object.values(node).forEach((value) => collectNodesByType(value, type, target))
  return target
}

const parseJsonLdNodes = (html) => {
  const scripts = [...html.matchAll(SCRIPT_JSON_LD_REGEX)].map((match) => match[1])
  const parsedNodes = []

  scripts.forEach((script) => {
    const raw = script?.trim()
    if (!raw) return
    try {
      parsedNodes.push(JSON.parse(raw))
    } catch (_error) {
    }
  })

  return parsedNodes
}

const extractArticleUrls = (html) => {
  const scripts = parseJsonLdNodes(html)
  const urls = []

  scripts.forEach((parsed) => {
    const lists = collectItemLists(parsed)

    lists.forEach((list) => {
      const listElements = list.itemListElement || list.ItemListElement || []
      listElements.forEach((item) => {
        const rawUrl = typeof item === 'string'
          ? item
          : (
              item?.url ||
              (typeof item?.item === 'string' ? item.item : '') ||
              item?.item?.url ||
              item?.item?.['@id'] ||
              ''
            )

        const absolute = toAbsoluteUrl(rawUrl)
        if (absolute.includes('/salud/')) {
          urls.push(absolute)
        }
      })
    })
  })

  return [...new Set(urls)]
}

const fetchHtml = async (url) => {
  let response
  try {
    response = await globalThis.fetch(url, {
      method: 'GET',
      headers: REQUEST_HEADERS,
      signal: AbortSignal.timeout(config.NEWS_FETCH_TIMEOUT_MS)
    })
  } catch (_error) {
    throw new AppError(
      'No se pudo consultar la fuente de noticias',
      502,
      'news_source_unreachable'
    )
  }

  if (!response.ok) {
    throw new AppError(
      'La fuente de noticias no respondio correctamente',
      502,
      'news_source_invalid_response'
    )
  }

  return response.text()
}

const buildArticleSummary = async (articleUrl) => {
  const articleHtml = await fetchHtml(articleUrl)

  const title = cleanText(
    getMetaContent(articleHtml, 'og:title') ||
    getMetaContent(articleHtml, 'twitter:title')
  )
  const description = cleanText(
    getMetaContent(articleHtml, 'description', 'name') ||
    getMetaContent(articleHtml, 'og:description')
  )
  const imageUrl = toAbsoluteUrl(
    getMetaContent(articleHtml, 'og:image') ||
    getMetaContent(articleHtml, 'twitter:image')
  )
  const publishedAt = toIsoDate(
    getMetaContent(articleHtml, 'article:published_time') ||
    getMetaContent(articleHtml, 'og:updated_time') ||
    getMetaContent(articleHtml, 'article:modified_time')
  )
  const canonicalUrl = getCanonicalUrl(articleHtml) || toAbsoluteUrl(articleUrl)

  if (!title || !canonicalUrl || !imageUrl) return null

  const slug = buildNewsIdFromUrl(canonicalUrl)

  return {
    id: slug || canonicalUrl,
    category: getCategoryFromUrl(canonicalUrl),
    title,
    description: description || 'Sin resumen disponible.',
    imageUrl,
    articleUrl: canonicalUrl,
    publishedAt
  }
}

const normalizeImageFromValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return toAbsoluteUrl(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeImageFromValue(item)
      if (normalized) return normalized
    }
    return ''
  }

  if (typeof value === 'object') {
    return toAbsoluteUrl(value.url || value.contentUrl || value['@id'] || '')
  }

  return ''
}

const extractParagraphsFromHtml = (html) => {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  const block = articleMatch?.[1] || html
  const paragraphMatches = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]

  return paragraphMatches
    .map((match) => cleanText(stripHtmlTags(match[1])))
    .filter((paragraph) => paragraph.length >= 30)
}

const splitTextIntoParagraphs = (value = '') => {
  const normalized = cleanText(value)
  if (!normalized) return []

  const byLineBreaks = normalized
    .split(/\n{2,}|\r\n\r\n/)
    .map((paragraph) => cleanText(paragraph))
    .filter((paragraph) => paragraph.length > 0)

  if (byLineBreaks.length > 1) {
    return byLineBreaks
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u)
    .map((sentence) => cleanText(sentence))
    .filter((sentence) => sentence.length > 0)

  if (sentences.length <= 4) {
    return [normalized]
  }

  const grouped = []
  for (let index = 0; index < sentences.length; index += 4) {
    grouped.push(sentences.slice(index, index + 4).join(' '))
  }

  return grouped
}

const buildArticleDetail = async (articleUrl) => {
  const articleHtml = await fetchHtml(articleUrl)
  const canonicalUrl = getCanonicalUrl(articleHtml) || toAbsoluteUrl(articleUrl)
  const jsonLdNodes = parseJsonLdNodes(articleHtml)
  const newsArticle = collectNodesByType(jsonLdNodes, 'newsarticle', [])[0] || {}

  const title = cleanText(
    newsArticle.headline ||
    getMetaContent(articleHtml, 'og:title') ||
    getMetaContent(articleHtml, 'twitter:title')
  )
  const description = cleanText(
    newsArticle.description ||
    getMetaContent(articleHtml, 'description', 'name') ||
    getMetaContent(articleHtml, 'og:description')
  )
  const imageUrl = normalizeImageFromValue(newsArticle.image) || toAbsoluteUrl(
    getMetaContent(articleHtml, 'og:image') ||
    getMetaContent(articleHtml, 'twitter:image')
  )
  const publishedAt = toIsoDate(
    newsArticle.datePublished ||
    getMetaContent(articleHtml, 'article:published_time') ||
    newsArticle.dateModified ||
    getMetaContent(articleHtml, 'og:updated_time')
  )

  const category = toCategoryLabel(
    (Array.isArray(newsArticle.articleSection)
      ? newsArticle.articleSection[0]
      : newsArticle.articleSection
    ) || ''
  ) || getCategoryFromUrl(canonicalUrl)

  const contentParagraphs = splitTextIntoParagraphs(newsArticle.articleBody || '')

  const fallbackParagraphs = extractParagraphsFromHtml(articleHtml)
  const paragraphs = contentParagraphs.length > 0 ? contentParagraphs : fallbackParagraphs

  if (!title || !canonicalUrl) {
    throw new AppError(
      'No se pudo obtener el contenido completo de la noticia',
      502,
      'news_detail_parse_error'
    )
  }

  return {
    id: buildNewsIdFromUrl(canonicalUrl) || canonicalUrl,
    category,
    title,
    description: description || 'Sin resumen disponible.',
    imageUrl,
    publishedAt,
    articleUrl: canonicalUrl,
    content: paragraphs
  }
}

const mapWithConcurrency = async (items, concurrency, mapper) => {
  if (!items.length) return []

  const normalizedConcurrency = clamp(concurrency, 1, items.length)
  const results = new Array(items.length).fill(null)
  let nextIndex = 0

  const worker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      try {
        results[currentIndex] = await mapper(items[currentIndex], currentIndex)
      } catch (_error) {
        results[currentIndex] = null
      }
    }
  }

  await Promise.all(
    Array.from({ length: normalizedConcurrency }, () => worker())
  )

  return results
}

const fetchFreshNewsItems = async () => {
  const coverHtml = await fetchHtml(config.NEWS_SOURCE_URL)
  const articleUrls = extractArticleUrls(coverHtml)

  if (articleUrls.length === 0) {
    throw new AppError(
      'No se encontraron noticias en la fuente configurada',
      502,
      'news_source_parse_error'
    )
  }

  const maxCandidates = clamp(config.NEWS_MAX_ITEMS * 2, 1, articleUrls.length)
  const candidateUrls = articleUrls.slice(0, maxCandidates)
  const summaries = await mapWithConcurrency(candidateUrls, 4, async (url) => buildArticleSummary(url))

  const unique = []
  const seen = new Set()

  summaries.forEach((item) => {
    if (!item) return
    if (seen.has(item.articleUrl)) return
    seen.add(item.articleUrl)
    unique.push(item)
  })

  if (unique.length === 0) {
    throw new AppError(
      'No se pudieron obtener noticias en este momento',
      502,
      'news_source_no_items'
    )
  }

  return unique.slice(0, config.NEWS_MAX_ITEMS)
}

const refreshNewsCache = async () => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const items = await fetchFreshNewsItems()
    const now = Date.now()
    newsCache.items = items
    newsCache.fetchedAt = new Date(now).toISOString()
    newsCache.expiresAt = now + (config.NEWS_CACHE_TTL_MINUTES * 60 * 1000)
    return newsCache
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

const buildResponsePayload = ({ limit, stale }) => ({
  source: NEWS_SOURCE_NAME,
  sourceUrl: config.NEWS_SOURCE_URL,
  refreshEveryMinutes: config.NEWS_CACHE_TTL_MINUTES,
  fetchedAt: newsCache.fetchedAt,
  stale,
  items: newsCache.items.slice(0, limit)
})

export const listNews = async ({ limit = 6 } = {}) => {
  const normalizedLimit = clamp(
    Number(limit) || 6,
    1,
    config.NEWS_MAX_ITEMS
  )
  const now = Date.now()
  const hasCache = newsCache.items.length > 0 && Boolean(newsCache.fetchedAt)

  if (hasCache && now < newsCache.expiresAt) {
    return buildResponsePayload({ limit: normalizedLimit, stale: false })
  }

  if (hasCache && now >= newsCache.expiresAt) {
    refreshNewsCache().catch(() => {})
    return buildResponsePayload({ limit: normalizedLimit, stale: true })
  }

  await refreshNewsCache()
  return buildResponsePayload({ limit: normalizedLimit, stale: false })
}

export const getNewsById = async (id) => {
  const normalizedId = String(id || '').trim().toLowerCase()
  if (!normalizedId) {
    throw new AppError('Noticia no valida', 400, 'invalid_news_id')
  }

  const hasCache = newsCache.items.length > 0 && Boolean(newsCache.fetchedAt)
  if (!hasCache) {
    await refreshNewsCache()
  }

  let summary = newsCache.items.find((item) => item.id === normalizedId)
  if (!summary) {
    await refreshNewsCache()
    summary = newsCache.items.find((item) => item.id === normalizedId)
  }

  if (!summary) {
    throw new AppError('Noticia no encontrada', 404, 'news_not_found')
  }

  return buildArticleDetail(summary.articleUrl)
}

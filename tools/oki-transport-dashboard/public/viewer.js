const params = new URLSearchParams(window.location.search)
const documentUrl = params.get('url') || ''
const title = params.get('title') || documentUrl || '資料'
const source = params.get('source') || ''
const page = params.get('page') || ''

const elements = {
  backBtn: document.querySelector('#backBtn'),
  title: document.querySelector('#viewerTitle'),
  source: document.querySelector('#viewerSource'),
  url: document.querySelector('#viewerUrl'),
  content: document.querySelector('#viewerContent')
}

elements.backBtn.addEventListener('click', () => {
  if (history.length > 1) {
    history.back()
    return
  }
  window.location.href = '/'
})

render()

function render() {
  document.title = `${title} - 資料ビューア`
  elements.title.textContent = title
  elements.source.textContent = [source, page].filter(Boolean).join(' / ') || '資料'

  if (!isAllowedUrl(documentUrl)) {
    elements.url.removeAttribute('href')
    elements.content.innerHTML = '<div class="viewer-message">資料URLが指定されていません。</div>'
    return
  }

  elements.url.href = documentUrl
  elements.url.textContent = '直接開く'

  if (isImageUrl(documentUrl)) {
    const image = document.createElement('img')
    image.className = 'viewer-image'
    image.src = documentUrl
    image.alt = title
    elements.content.replaceChildren(image)
    return
  }

  const frame = document.createElement('iframe')
  frame.className = 'viewer-frame'
  frame.src = documentUrl
  frame.title = title
  elements.content.replaceChildren(frame, fallbackMessage())
}

function fallbackMessage() {
  const message = document.createElement('div')
  message.className = 'viewer-message floating'
  message.textContent = '表示できない場合は右上の「直接開く」を使ってください。'
  return message
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isImageUrl(value) {
  try {
    return /\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i.test(new URL(value).pathname)
  } catch {
    return false
  }
}

export function initI18n(
  messages: Record<string, Record<string, string>>,
  pageTitles: Record<string, string>,
) {
  let lang = localStorage.getItem('aibubu-lang') || 'zh'
  const toggle = document.getElementById('langToggle')!

  function setLang(l: string) {
    lang = l
    localStorage.setItem('aibubu-lang', l)
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
    toggle.textContent = l === 'zh' ? 'EN' : '中'
    document.title = pageTitles[l]
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')!
      if (messages[l][key] != null) el.innerHTML = messages[l][key]
    })
  }

  toggle.addEventListener('click', () => setLang(lang === 'zh' ? 'en' : 'zh'))
  setLang(lang)

  return { setLang, getLang: () => lang }
}

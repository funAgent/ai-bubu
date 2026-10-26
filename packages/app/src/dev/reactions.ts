// A dev-only entry: exercise production stores/renderers without a native Tauri window.
if (import.meta.env.DEV) {
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    return nativeFetch(
      url.startsWith('skin://localhost/') ? url.replace('skin://localhost/', '/skins/') : input,
      init,
    )
  }
  const [{ createApp }, { createPinia }, { default: Preview }] = await Promise.all([
    import('vue'),
    import('pinia'),
    import('./ReactionPreview.vue'),
  ])
  createApp(Preview).use(createPinia()).mount('#app')
}
export {}

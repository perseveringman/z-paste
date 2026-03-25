// Stash Browser Extension — Content Script
import type { VaultItemMeta, VaultLoginFields } from '../shared/types'

// ---------------------------------------------------------------------------
// Types for content ↔ background messaging
// ---------------------------------------------------------------------------

interface CredentialItem {
  meta: VaultItemMeta
  fields: VaultLoginFields
}

interface GetCredentialsResponse {
  locked?: boolean
  items: CredentialItem[]
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const ICON_SIZE = 20
const DEBOUNCE_MS = 300
const MAX_DROPDOWN_ITEMS = 5

/** Set of password fields we've already decorated. */
const decoratedFields = new WeakSet<HTMLInputElement>()

/** Currently open dropdown (only one at a time). */
let activeDropdown: HTMLElement | null = null
let activePasswordField: HTMLInputElement | null = null

/** Track fields we filled so we can distinguish from manual typing. */
const filledByUs = new WeakSet<HTMLInputElement>()

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as unknown as T
}

/** Build the inline shield/lock SVG icon. */
function createIcon(): HTMLElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'stash-ext-icon'
  btn.setAttribute('aria-label', 'Stash — autofill credentials')
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M12 11V9a2 2 0 1 0-4 0"/></svg>`
  return btn
}

// ---------------------------------------------------------------------------
// Field detection helpers
// ---------------------------------------------------------------------------

function isVisible(el: HTMLElement): boolean {
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false
  const style = getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

function getPasswordFields(): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="password"]')
  ).filter(isVisible)
}

const USERNAME_PATTERNS = /user|email|login|account|identifier|uname/i

function findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
  const form = passwordField.closest('form')
  const candidates: HTMLInputElement[] = []

  const scope = form ?? document
  scope.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    if (input === passwordField) return
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return
    if (
      input.type === 'text' ||
      input.type === 'email' ||
      USERNAME_PATTERNS.test(input.name || '') ||
      USERNAME_PATTERNS.test(input.id || '') ||
      USERNAME_PATTERNS.test(input.autocomplete || '')
    ) {
      candidates.push(input)
    }
  })

  if (candidates.length === 0) return null

  // Prefer the candidate closest BEFORE the password field in DOM order.
  const all = Array.from(scope.querySelectorAll('input'))
  const pwIdx = all.indexOf(passwordField)
  let best: HTMLInputElement | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    const cIdx = all.indexOf(c)
    const dist = pwIdx - cIdx
    if (dist > 0 && dist < bestDist) {
      bestDist = dist
      best = c
    }
  }
  return best ?? candidates[0]
}

// ---------------------------------------------------------------------------
// Dropdown
// ---------------------------------------------------------------------------

function closeDropdown(): void {
  if (activeDropdown) {
    activeDropdown.classList.add('stash-ext-dropdown-closing')
    const el = activeDropdown
    setTimeout(() => el.remove(), 150)
    activeDropdown = null
    activePasswordField = null
  }
}

function createDropdown(
  items: CredentialItem[],
  passwordField: HTMLInputElement,
  locked: boolean
): HTMLElement {
  closeDropdown()

  const dropdown = document.createElement('div')
  dropdown.className = 'stash-ext-dropdown'

  if (locked) {
    const lockItem = document.createElement('div')
    lockItem.className = 'stash-ext-dropdown-item stash-ext-dropdown-lock'
    lockItem.innerHTML = `
      <div class="stash-ext-dropdown-item-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div class="stash-ext-dropdown-item-text">
        <span class="stash-ext-dropdown-item-title">Unlock Stash</span>
        <span class="stash-ext-dropdown-item-sub">Vault is locked</span>
      </div>
    `
    lockItem.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'openPopup' })
      closeDropdown()
    })
    dropdown.appendChild(lockItem)
  } else if (items.length === 0) {
    const emptyItem = document.createElement('div')
    emptyItem.className = 'stash-ext-dropdown-item stash-ext-dropdown-empty'
    emptyItem.innerHTML = `
      <div class="stash-ext-dropdown-item-text">
        <span class="stash-ext-dropdown-item-title">No matching credentials</span>
        <span class="stash-ext-dropdown-item-sub">${window.location.hostname}</span>
      </div>
    `
    dropdown.appendChild(emptyItem)
  } else {
    const shown = items.slice(0, MAX_DROPDOWN_ITEMS)
    for (const item of shown) {
      const row = document.createElement('div')
      row.className = 'stash-ext-dropdown-item'
      row.innerHTML = `
        <div class="stash-ext-dropdown-item-icon stash-ext-dropdown-favicon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="stash-ext-dropdown-item-text">
          <span class="stash-ext-dropdown-item-title">${escapeHtml(item.meta.title)}</span>
          <span class="stash-ext-dropdown-item-sub">${escapeHtml(item.fields.username)}</span>
        </div>
      `
      row.addEventListener('click', () => {
        fillFields(passwordField, item.fields.username, item.fields.password)
        closeDropdown()
      })
      dropdown.appendChild(row)
    }
  }

  // Position the dropdown below the password field
  const rect = passwordField.getBoundingClientRect()
  dropdown.style.top = `${window.scrollY + rect.bottom + 4}px`
  dropdown.style.left = `${window.scrollX + rect.left}px`
  dropdown.style.minWidth = `${Math.max(rect.width, 280)}px`

  document.body.appendChild(dropdown)
  activeDropdown = dropdown
  activePasswordField = passwordField

  return dropdown
}

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ---------------------------------------------------------------------------
// Autofill
// ---------------------------------------------------------------------------

function setNativeValue(el: HTMLInputElement, value: string): void {
  // Use native setter to work with React / Vue controlled inputs
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillFields(
  passwordField: HTMLInputElement,
  username: string,
  password: string
): void {
  const usernameField = findUsernameField(passwordField)
  if (usernameField) {
    setNativeValue(usernameField, username)
    filledByUs.add(usernameField)
  }
  setNativeValue(passwordField, password)
  filledByUs.add(passwordField)
  passwordField.focus()
}

// ---------------------------------------------------------------------------
// Icon injection
// ---------------------------------------------------------------------------

function injectIcon(passwordField: HTMLInputElement): void {
  if (decoratedFields.has(passwordField)) return
  decoratedFields.add(passwordField)

  // Wrap the input in a relative container so we can position the icon
  const parent = passwordField.parentElement
  if (!parent) return

  const wrapper = document.createElement('div')
  wrapper.className = 'stash-ext-wrapper'

  // Copy relevant layout styles from the input so the wrapper doesn't break flow
  const computed = getComputedStyle(passwordField)
  wrapper.style.display = computed.display === 'block' ? 'block' : 'inline-block'
  wrapper.style.position = 'relative'
  wrapper.style.width = computed.width
  wrapper.style.maxWidth = '100%'

  parent.insertBefore(wrapper, passwordField)
  wrapper.appendChild(passwordField)

  // Ensure the input fills the wrapper
  passwordField.style.width = '100%'
  passwordField.style.boxSizing = 'border-box'
  passwordField.style.paddingRight = `${ICON_SIZE + 16}px`

  const icon = createIcon()
  wrapper.appendChild(icon)

  icon.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    onIconClick(passwordField)
  })
}

async function onIconClick(passwordField: HTMLInputElement): Promise<void> {
  // If dropdown is already open for this field, close it
  if (activePasswordField === passwordField && activeDropdown) {
    closeDropdown()
    return
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'getCredentials',
      url: window.location.href,
    })) as GetCredentialsResponse | undefined

    if (!response) {
      createDropdown([], passwordField, false)
      return
    }

    if (response.locked) {
      createDropdown([], passwordField, true)
    } else {
      createDropdown(response.items ?? [], passwordField, false)
    }
  } catch {
    createDropdown([], passwordField, false)
  }
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function scanFields(): void {
  const fields = getPasswordFields()
  for (const field of fields) {
    injectIcon(field)
  }
}

const debouncedScan = debounce(scanFields, DEBOUNCE_MS)

// ---------------------------------------------------------------------------
// MutationObserver — rescan when DOM changes (SPA navigation, etc.)
// ---------------------------------------------------------------------------

const observer = new MutationObserver(() => {
  debouncedScan()
})

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
})

// ---------------------------------------------------------------------------
// Global listeners
// ---------------------------------------------------------------------------

// Close dropdown on outside click
document.addEventListener(
  'click',
  (e) => {
    if (!activeDropdown) return
    const target = e.target as HTMLElement
    if (
      activeDropdown.contains(target) ||
      target.closest('.stash-ext-icon')
    ) {
      return
    }
    closeDropdown()
  },
  true
)

// Close dropdown on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDropdown()
})

// Reposition dropdown on scroll/resize
function repositionDropdown(): void {
  if (!activeDropdown || !activePasswordField) return
  const rect = activePasswordField.getBoundingClientRect()
  activeDropdown.style.top = `${window.scrollY + rect.bottom + 4}px`
  activeDropdown.style.left = `${window.scrollX + rect.left}px`
}

window.addEventListener('scroll', repositionDropdown, true)
window.addEventListener('resize', repositionDropdown)

// ---------------------------------------------------------------------------
// Message listener — autofill from background / popup
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: { type: string; username?: string; password?: string }, _sender: unknown, sendResponse: (resp: unknown) => void) => {
    if (message.type === 'fill' && message.username && message.password) {
      const passwordFields = getPasswordFields()
      if (passwordFields.length > 0) {
        fillFields(passwordFields[0], message.username, message.password)
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'No password field found' })
      }
    }
    // Return true to keep the message channel open for async sendResponse
    return true
  }
)

// ---------------------------------------------------------------------------
// Save prompt detection
// ---------------------------------------------------------------------------

function handleFormSubmit(e: Event): void {
  const form = e.target as HTMLFormElement
  const passwordField = form.querySelector<HTMLInputElement>('input[type="password"]')
  if (!passwordField) return

  // Only prompt if user typed the password manually (not filled by us)
  if (filledByUs.has(passwordField)) return

  const password = passwordField.value
  if (!password) return

  const usernameField = findUsernameField(passwordField)
  const username = usernameField?.value ?? ''

  chrome.runtime.sendMessage({
    type: 'promptSave',
    url: window.location.href,
    username,
    password,
  })
}

document.addEventListener('submit', handleFormSubmit, true)

// Also catch button-click submissions (forms without explicit submit event)
document.addEventListener(
  'click',
  (e) => {
    const target = e.target as HTMLElement
    if (
      target.tagName === 'BUTTON' ||
      (target.tagName === 'INPUT' &&
        ((target as HTMLInputElement).type === 'submit' ||
          (target as HTMLInputElement).type === 'button'))
    ) {
      const form = target.closest('form')
      if (form) {
        const passwordField = form.querySelector<HTMLInputElement>('input[type="password"]')
        if (passwordField && !filledByUs.has(passwordField) && passwordField.value) {
          const usernameField = findUsernameField(passwordField)
          chrome.runtime.sendMessage({
            type: 'promptSave',
            url: window.location.href,
            username: usernameField?.value ?? '',
            password: passwordField.value,
          })
        }
      }
    }
  },
  true
)

// ---------------------------------------------------------------------------
// Initial scan
// ---------------------------------------------------------------------------

scanFields()
console.log('[stash] content script loaded')

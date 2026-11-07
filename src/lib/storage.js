// localStorage can throw (private mode, blocked site data, quota exceeded).
// These wrappers never throw, so a storage failure cannot break the editor.

export function safeGet(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemove(key) {
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

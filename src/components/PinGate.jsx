import { useState, useEffect, useRef } from 'react'

const PIN_KEY      = 'pin_unlocked_at'
const FAIL_KEY     = 'pin_fail_count'
const LOCKOUT_KEY  = 'pin_lockout_until'
const EXPIRE_MS    = 24 * 60 * 60 * 1000
const LOCKOUT_MS   = 5 * 60 * 1000
const MAX_FAILS    = 5

function isUnlocked() {
  const ts = localStorage.getItem(PIN_KEY)
  if (!ts) return false
  return Date.now() - Number(ts) < EXPIRE_MS
}

function getLockoutRemaining() {
  const until = Number(localStorage.getItem(LOCKOUT_KEY) || 0)
  const remaining = until - Date.now()
  return remaining > 0 ? remaining : 0
}

function recordFail() {
  const count = Number(localStorage.getItem(FAIL_KEY) || 0) + 1
  localStorage.setItem(FAIL_KEY, String(count))
  if (count >= MAX_FAILS) {
    localStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS))
    localStorage.setItem(FAIL_KEY, '0')
  }
  return count
}

function clearFails() {
  localStorage.removeItem(FAIL_KEY)
  localStorage.removeItem(LOCKOUT_KEY)
}

export default function PinGate({ children }) {
  const [unlocked,  setUnlocked]  = useState(isUnlocked)
  const [digits,    setDigits]    = useState(['', '', '', ''])
  const [error,     setError]     = useState(false)
  const [shaking,   setShaking]   = useState(false)
  const [lockout,   setLockout]   = useState(getLockoutRemaining)
  const refs = [useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    if (!unlocked) setTimeout(() => refs[0].current?.focus(), 100)
  }, [unlocked])

  useEffect(() => {
    if (lockout <= 0) return
    const id = setInterval(() => {
      const remaining = getLockoutRemaining()
      setLockout(remaining)
      if (remaining <= 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [lockout])

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    setError(false)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (val && i === 3) verify(next.join(''))
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  function verify(pin) {
    if (getLockoutRemaining() > 0) return
    if (pin === import.meta.env.VITE_PIN_CODE) {
      clearFails()
      localStorage.setItem(PIN_KEY, String(Date.now()))
      setUnlocked(true)
    } else {
      recordFail()
      const remaining = getLockoutRemaining()
      setLockout(remaining)
      setShaking(true)
      setError(true)
      setDigits(['', '', '', ''])
      setTimeout(() => {
        setShaking(false)
        refs[0].current?.focus()
      }, 420)
    }
  }

  if (unlocked) return children

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        className={shaking ? 'pin-shake' : ''}
        style={{
          background: 'var(--card)',
          borderRadius: 20,
          padding: '40px 44px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.25)',
          minWidth: 280,
        }}
      >
        <div style={{ fontSize: 38, lineHeight: 1 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>請輸入 PIN 碼</div>

        <div style={{ display: 'flex', gap: 12 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e  => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--blue)' }}
              onBlur={e   => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)' }}
              style={{
                width: 54, height: 62,
                fontSize: 28, textAlign: 'center',
                border: `2px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 12,
                background: 'var(--bg)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 0.18s',
              }}
            />
          ))}
        </div>

        {lockout > 0 && (
          <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
            錯誤次數過多，請等待 {Math.ceil(lockout / 1000)} 秒後再試
          </p>
        )}
        {!lockout && error && (
          <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 500 }}>
            PIN 碼錯誤，請再試一次
          </p>
        )}
      </div>
    </div>
  )
}

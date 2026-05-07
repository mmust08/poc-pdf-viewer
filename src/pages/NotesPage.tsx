import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  h1: ({ children }) => (
    <h1 style={{
      color: 'var(--clr-text-primary)',
      borderBottom: '1px solid rgba(78, 110, 126, 0.2)',
      paddingBottom: '0.5rem',
      marginTop: '1.5rem',
      marginBottom: '1rem',
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{
      color: 'var(--clr-text-primary)',
      marginTop: '1.75rem',
      marginBottom: '0.75rem',
      fontSize: '1.15rem',
      fontWeight: 600,
    }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      color: 'var(--clr-text-primary)',
      marginTop: '1.25rem',
      marginBottom: '0.5rem',
      fontSize: '1rem',
      fontWeight: 600,
    }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{
      color: 'var(--clr-text-secondary)',
      marginTop: '1rem',
      marginBottom: '0.5rem',
      fontSize: '0.9rem',
      fontWeight: 600,
    }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p style={{ lineHeight: 1.7, marginBottom: '0.85rem', color: 'var(--clr-text-secondary)' }}>
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: 'var(--clr-accent-400)' }} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code
          style={{
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            background: 'rgba(78, 110, 126, 0.06)',
            border: '1px solid rgba(78, 110, 126, 0.16)',
            display: 'block',
            padding: '1rem 1.25rem',
            borderRadius: 10,
            overflowX: 'auto',
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: 'var(--clr-text-primary)',
          }}
          className={className}
        >
          {children}
        </code>
      )
    }
    return (
      <code style={{
        background: 'rgba(78, 110, 126, 0.08)',
        border: '1px solid rgba(78, 110, 126, 0.18)',
        padding: '1px 6px',
        borderRadius: 4,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '0.85em',
        color: 'var(--clr-accent-500)',
      }}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre style={{
      background: 'rgba(78, 110, 126, 0.06)',
      border: '1px solid rgba(78, 110, 126, 0.16)',
      padding: '1rem 1.25rem',
      borderRadius: 10,
      overflowX: 'auto',
      marginBottom: '1rem',
    }}>
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '0.6rem 1rem',
      textAlign: 'left',
      borderBottom: '1px solid rgba(78, 110, 126, 0.2)',
      background: 'rgba(78, 110, 126, 0.06)',
      color: 'var(--clr-accent-500)',
      fontWeight: 600,
      fontSize: '0.82rem',
      letterSpacing: '0.03em',
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '0.6rem 1rem',
      borderBottom: '1px solid var(--clr-border-secondary)',
      color: 'var(--clr-text-secondary)',
      fontSize: '0.875rem',
    }}>
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(78, 110, 126, 0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </tr>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: '3px solid rgba(78, 110, 126, 0.4)',
      marginLeft: 0,
      paddingLeft: '1rem',
      color: 'var(--clr-text-muted)',
      fontStyle: 'italic',
    }}>
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.7, marginBottom: '0.85rem', color: 'var(--clr-text-secondary)' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.7, marginBottom: '0.85rem', color: 'var(--clr-text-secondary)' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.07)', margin: '1.5rem 0' }} />
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--clr-text-primary)', fontWeight: 600 }}>{children}</strong>
  ),
}

export default function NotesPage() {
  const { filename } = useParams<{ filename: string }>()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!filename) {
      setError('No filename specified.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setMarkdown(null)
    fetch(`${import.meta.env.BASE_URL}notes/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load notes file (${res.status})`)
        return res.text()
      })
      .then((text) => {
        setMarkdown(text)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [filename])

  const title = filename ? filename.replace(/\.md$/i, '') : 'Notes'

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '3rem 2rem' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginBottom: '2rem',
            color: 'var(--clr-text-muted)',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--clr-accent-500)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--clr-text-muted)' }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M12 7.5H3M6.5 4L3 7.5L6.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </Link>

        {loading && (
          <p style={{ color: 'var(--clr-text-muted)', marginTop: '2rem', fontSize: '0.9rem' }}>
            Loading {filename}…
          </p>
        )}

        {error && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem 1.25rem',
            background: 'rgba(248, 113, 113, 0.06)',
            border: '1px solid rgba(248, 113, 113, 0.2)',
            borderRadius: 10,
            color: '#f87171',
            fontSize: '0.9rem',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && markdown !== null && (
          <>
            <div style={{
              background: 'var(--clr-surface)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 2.5rem',
              boxShadow: 'var(--shadow-card)',
            }}>
              <h1 style={{
                color: 'var(--clr-text-primary)',
                borderBottom: '1px solid rgba(78, 110, 126, 0.2)',
                paddingBottom: '0.75rem',
                marginTop: 0,
                marginBottom: '1.5rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}>
                {title}
              </h1>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                {markdown}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

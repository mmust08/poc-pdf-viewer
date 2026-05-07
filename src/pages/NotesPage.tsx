import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const pageStyle: React.CSSProperties = {
  background: '#0f172a',
  minHeight: '100vh',
  color: '#e0e0e0',
  fontFamily: 'system-ui, sans-serif',
}

const contentStyle: React.CSSProperties = {
  maxWidth: 860,
  margin: '0 auto',
  padding: '2rem',
}

const backLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '1.5rem',
  color: '#7eb8f7',
  textDecoration: 'none',
  fontSize: '0.95rem',
}

const components: Components = {
  h1: ({ children }) => (
    <h1
      style={{
        color: '#7eb8f7',
        borderBottom: '2px solid #7eb8f7',
        paddingBottom: '0.5rem',
        marginTop: '1.5rem',
        marginBottom: '1rem',
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ color: '#7eb8f7', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ color: '#7eb8f7', marginTop: '1.25rem', marginBottom: '0.5rem' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{ color: '#7eb8f7', marginTop: '1rem', marginBottom: '0.5rem' }}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p style={{ lineHeight: 1.7, marginBottom: '0.85rem' }}>{children}</p>
  ),
  a: ({ href, children }) => (
    <a href={href} style={{ color: '#7eb8f7' }} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code
          style={{
            fontFamily: 'monospace',
            background: '#1e293b',
            display: 'block',
            padding: '1rem',
            borderRadius: 6,
            overflowX: 'auto',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}
          className={className}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        style={{
          background: '#1e293b',
          padding: '2px 6px',
          borderRadius: 3,
          fontFamily: 'monospace',
          fontSize: '0.88em',
        }}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre
      style={{
        background: '#1e293b',
        padding: '1rem',
        borderRadius: 6,
        overflowX: 'auto',
        marginBottom: '1rem',
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9rem',
        }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: '0.6rem 1rem',
        textAlign: 'left',
        borderBottom: '2px solid #2a4080',
        background: '#16213e',
        color: '#7eb8f7',
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: '0.6rem 1rem',
        borderBottom: '1px solid #2a4080',
      }}
    >
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(42,64,128,0.2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </tr>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: '3px solid #2a4080',
        marginLeft: 0,
        paddingLeft: '1rem',
        color: '#aaa',
        fontStyle: 'italic',
      }}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.7, marginBottom: '0.85rem' }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: '1.5rem', lineHeight: 1.7, marginBottom: '0.85rem' }}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid #2a4080', margin: '1.5rem 0' }} />
  ),
  strong: ({ children }) => (
    <strong style={{ color: '#e0e0e0', fontWeight: 600 }}>{children}</strong>
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
    <div style={pageStyle}>
      <div style={contentStyle}>
        <Link to="/" style={backLinkStyle}>
          ← Back
        </Link>

        {loading && (
          <p style={{ color: '#aaa', marginTop: '2rem' }}>Loading {filename}…</p>
        )}

        {error && (
          <div
            style={{
              marginTop: '2rem',
              padding: '1rem 1.5rem',
              background: '#1e293b',
              border: '1px solid #c0392b',
              borderRadius: 6,
              color: '#e74c3c',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && markdown !== null && (
          <>
            <h1
              style={{
                color: '#7eb8f7',
                borderBottom: '2px solid #7eb8f7',
                paddingBottom: '0.5rem',
                marginTop: 0,
                marginBottom: '1.5rem',
              }}
            >
              {title}
            </h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
          </>
        )}
      </div>
    </div>
  )
}

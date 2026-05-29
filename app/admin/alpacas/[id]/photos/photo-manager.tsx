'use client'

import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'

interface StaticPhoto {
  src: string
  alt: string
}

interface UploadPhoto {
  url: string
  alt: string
  uploadedAt: string
}

interface PhotoManagerProps {
  alpacaSlug: string
  alpacaName: string
  staticPhotos: StaticPhoto[]
  uploads: UploadPhoto[]
  blobReady: boolean
}

/**
 * Client component for the per-alpaca photo manager. Handles:
 *   - File picker (multiple, image/*) + Upload button → POST to
 *     /api/admin/alpacas/upload (one request per file, sequential to
 *     keep error reporting per-file).
 *   - Per-uploaded-photo Delete button → DELETE to
 *     /api/admin/alpacas/delete-upload.
 *   - Static gallery photos are listed read-only (no delete button).
 *   - `window.location.reload()` after success so the server-rendered list
 *     reflects the new state (in-memory store is already updated server-side).
 */

export default function PhotoManager({
  alpacaSlug,
  alpacaName,
  staticPhotos,
  uploads,
  blobReady,
}: PhotoManagerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const handleUpload = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setError(null)
      const files = fileRef.current?.files
      if (!files || files.length === 0) {
        setError('Pick at least one image file first.')
        return
      }
      setBusy(true)
      let succeeded = 0
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`)
          const fd = new FormData()
          fd.append('alpacaSlug', alpacaSlug)
          fd.append('file', file)
          const res = await fetch('/api/admin/alpacas/upload', {
            method: 'POST',
            body: fd,
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            setError(
              `${file.name}: ${res.status} ${body?.error ?? res.statusText}`,
            )
            break
          }
          succeeded++
        }
        if (succeeded > 0) {
          setProgress(`Uploaded ${succeeded} file(s). Refreshing…`)
          window.location.reload()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
        setProgress(null)
      }
    },
    [alpacaSlug],
  )

  const handleDelete = useCallback(
    async (url: string) => {
      if (!confirm('Delete this uploaded photo? This cannot be undone.')) return
      setBusy(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ alpacaSlug, url })
        const res = await fetch(`/api/admin/alpacas/delete-upload?${qs}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(`Delete failed: ${res.status} ${body?.error ?? res.statusText}`)
          return
        }
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setBusy(false)
      }
    },
    [alpacaSlug],
  )

  return (
    <main className="mx-auto max-w-3xl p-6">
      <nav className="mb-4 text-sm">
        <Link href="/admin/alpacas" className="text-blue-700 hover:underline">
          &larr; All alpacas
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{alpacaName} &mdash; Photos</h1>
        <p className="mt-1 text-sm text-neutral-600">slug: {alpacaSlug}</p>
      </header>

      {!blobReady && (
        <p className="mb-6 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>BLOB_READ_WRITE_TOKEN not set.</strong> Uploads will return
          503. Configure in Vercel dashboard.
        </p>
      )}

      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="mb-8 rounded border border-neutral-300 bg-neutral-50 p-4"
      >
        <h2 className="mb-2 text-base font-medium">Upload new photos</h2>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          disabled={busy || !blobReady}
          className="block w-full text-sm"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Images only. Max 5 MB each. Multiple files accepted.
        </p>
        <button
          type="submit"
          disabled={busy || !blobReady}
          className="mt-3 rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Working...' : 'Upload'}
        </button>
        {progress && (
          <p className="mt-2 text-xs text-neutral-700" role="status">
            {progress}
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* Static gallery photos (read-only) */}
      <section className="mb-8">
        <h2 className="mb-2 text-base font-medium">
          Static gallery{' '}
          <span className="text-xs text-neutral-500">(typed in code, read-only)</span>
        </h2>
        {staticPhotos.length === 0 ? (
          <p className="text-sm text-neutral-500">No static photos.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {staticPhotos.map((p) => (
              <li
                key={p.src}
                className="overflow-hidden rounded border border-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt} className="aspect-square w-full object-cover" />
                <p className="p-2 text-xs text-neutral-600">{p.alt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Uploaded photos (deletable) */}
      <section>
        <h2 className="mb-2 text-base font-medium">Uploaded photos</h2>
        {uploads.length === 0 ? (
          <p className="text-sm text-neutral-500">No uploads yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {uploads.map((u) => (
              <li
                key={u.url}
                className="overflow-hidden rounded border border-neutral-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.url} alt={u.alt} className="aspect-square w-full object-cover" />
                <div className="p-2">
                  <p className="text-xs text-neutral-600">{u.alt}</p>
                  <p className="text-[10px] text-neutral-400">
                    {new Date(u.uploadedAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(u.url)}
                    disabled={busy}
                    className="mt-2 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

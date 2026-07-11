export function ArtifactLoadingState() {
  return (
    <div className="viewer-shell artifact-loading-shell" role="status">
      <header className="viewer-header" aria-hidden="true">
        <div className="viewer-left">
          <div className="viewer-loading-control" />
          <div className="viewer-loading-title" />
        </div>
        <div className="viewer-actions">
          <div className="viewer-loading-control" />
          <div className="viewer-loading-control" />
          <div className="viewer-loading-share" />
        </div>
      </header>
      <main className="viewer-main">
        <ArtifactContentLoadingState />
      </main>
      <span className="sr-only">Loading artifact…</span>
    </div>
  )
}

export function ArtifactContentLoadingState() {
  return <div className="artifact-content-loading" aria-hidden="true" />
}

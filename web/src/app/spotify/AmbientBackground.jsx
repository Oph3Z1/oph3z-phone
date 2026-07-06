// The signature of the app: the current track's artwork blurred to fill the whole
// screen, cross-fading on every song change. Falls back to a green aurora when
// nothing is playing. Sits behind all content (z-index 0).
export default function AmbientBackground({ artwork }) {
  return (
    <div className="sp-amb" aria-hidden>
      {artwork ? (
        <img key={artwork} className="sp-amb__art" src={artwork} alt="" />
      ) : (
        <div className="sp-amb__aurora" />
      )}
      <div className="sp-amb__scrim" />
      <div className="sp-amb__grain" />
    </div>
  );
}

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
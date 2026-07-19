type PlantillaSlideProps = {
  titulo: string;
  texto: string;
  indiceSlide: number;
  totalSlides: number;
  fondoUrl?: string | null;
  logoUrl?: string | null;
};

type LayoutKind = "cover" | "content" | "quote" | "closing";

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;

function clampText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}

function isPunchyText(titulo: string, texto: string) {
  const combined = `${titulo} ${texto}`;
  return (
    texto.length <= 150 &&
    (/[0-9%$]/.test(combined) ||
      /"|"|dato|tip|clave|cada vez|menos de|más de|mas de|en una frase/i.test(combined))
  );
}

function getLayoutKind(indiceSlide: number, totalSlides: number, titulo: string, texto: string): LayoutKind {
  if (totalSlides <= 1) {
    return "quote";
  }

  if (indiceSlide === 0) {
    return "cover";
  }

  if (indiceSlide === totalSlides - 1) {
    return "closing";
  }

  return isPunchyText(titulo, texto) ? "quote" : "content";
}

function slideLabel(indiceSlide: number) {
  return String(indiceSlide + 1).padStart(2, "0");
}

function BrandLogo({
  logoUrl,
  align = "left",
  prominent = false
}: {
  logoUrl?: string | null;
  align?: "left" | "right";
  prominent?: boolean;
}) {
  const position = align === "left" ? { left: 80 } : { right: 80 };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 64,
        ...position,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: prominent ? 48 : 40,
        width: prominent ? 188 : 150,
        borderRadius: 999,
        border: "1px solid rgba(11, 14, 20, 0.08)",
        background: "rgba(255, 255, 255, 0.78)"
      }}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="Blyndtek"
          style={{
            display: "flex",
            height: prominent ? 30 : 24,
            width: prominent ? 156 : 124,
            objectFit: "contain"
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            fontSize: prominent ? 24 : 18,
            fontWeight: 700,
            color: "#0B0E14"
          }}
        >
          Blyndtek
        </div>
      )}
    </div>
  );
}

function SlideCounter({ indiceSlide, totalSlides }: { indiceSlide: number; totalSlides: number }) {
  if (totalSlides <= 1) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 82,
        bottom: 72,
        display: "flex",
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: "rgba(90, 99, 115, 0.82)"
      }}
    >
      {indiceSlide + 1}/{totalSlides}
    </div>
  );
}

function BackgroundLayer({ fondoUrl }: { fondoUrl?: string | null }) {
  return (
    <>
      {fondoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fondoUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: FRAME_WIDTH,
            height: FRAME_HEIGHT,
            objectFit: "cover"
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(220, 217, 242, 0.90) 0%, rgba(217, 234, 245, 0.82) 44%, rgba(255, 255, 255, 0.92) 100%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -160,
          top: 84,
          display: "flex",
          width: 520,
          height: 520,
          borderRadius: 520,
          background: "rgba(37, 99, 235, 0.10)"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -150,
          bottom: 130,
          display: "flex",
          width: 420,
          height: 420,
          borderRadius: 420,
          background: "rgba(255, 255, 255, 0.45)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.50) 50%, rgba(255,255,255,0.24) 100%)"
        }}
      />
    </>
  );
}

function CoverLayout({ titulo, texto }: { titulo: string; texto: string }) {
  const title = clampText(titulo, 78);
  const subtitle = clampText(texto, 118);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "132px 80px 180px"
      }}
    >
      <div
        style={{
          display: "flex",
          width: 170,
          height: 4,
          marginBottom: 42,
          background: "#2563EB"
        }}
      />
      <div
        style={{
          display: "flex",
          maxWidth: 820,
          fontSize: title.length > 54 ? 88 : 100,
          fontWeight: 700,
          lineHeight: 0.94,
          letterSpacing: "-0.07em",
          color: "#0B0E14",
          whiteSpace: "pre-wrap"
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            display: "flex",
            maxWidth: 610,
            marginTop: 34,
            fontSize: 30,
            fontWeight: 400,
            lineHeight: 1.24,
            color: "#5A6373",
            whiteSpace: "pre-wrap"
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function ContentLayout({
  titulo,
  texto,
  indiceSlide
}: {
  titulo: string;
  texto: string;
  indiceSlide: number;
}) {
  const title = clampText(titulo, 82);
  const body = clampText(texto, 300);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "132px 80px 190px"
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 92,
          top: 140,
          display: "flex",
          fontSize: 132,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.08em",
          color: "rgba(11, 14, 20, 0.07)"
        }}
      >
        {slideLabel(indiceSlide)}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 700,
          fontSize: title.length > 54 ? 48 : 56,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.055em",
          color: "#0B0E14",
          whiteSpace: "pre-wrap"
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 700,
          marginTop: 34,
          fontSize: body.length > 210 ? 31 : 35,
          fontWeight: 400,
          lineHeight: 1.24,
          color: "#5A6373",
          whiteSpace: "pre-wrap"
        }}
      >
        {body}
      </div>
    </div>
  );
}

function QuoteLayout({ titulo, texto }: { titulo: string; texto: string }) {
  const title = clampText(titulo, 70);
  const body = clampText(texto, 190);
  const heroSize = body.length > 130 ? 52 : 64;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "140px 92px 190px",
        textAlign: "center"
      }}
    >
      <div
        style={{
          display: "flex",
          marginBottom: 38,
          fontSize: 76,
          fontWeight: 700,
          lineHeight: 0.8,
          color: "#2563EB"
        }}
      >
        “
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 820,
          fontSize: heroSize,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: "-0.06em",
          color: "#0B0E14",
          whiteSpace: "pre-wrap"
        }}
      >
        {body || title}
      </div>
      {body && title ? (
        <div
          style={{
            display: "flex",
            maxWidth: 620,
            marginTop: 38,
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.2,
            color: "#5A6373",
            whiteSpace: "pre-wrap"
          }}
        >
          {title}
        </div>
      ) : null}
    </div>
  );
}

function ClosingLayout({ titulo, texto }: { titulo: string; texto: string }) {
  const title = clampText(titulo, 82);
  const body = clampText(texto, 230);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "150px 96px 220px"
      }}
    >
      <div
        style={{
          display: "flex",
          width: 74,
          height: 74,
          marginBottom: 48,
          borderRadius: 18,
          background: "#2563EB"
        }}
      />
      <div
        style={{
          display: "flex",
          maxWidth: 760,
          fontSize: title.length > 56 ? 58 : 70,
          fontWeight: 700,
          lineHeight: 0.98,
          letterSpacing: "-0.064em",
          color: "#0B0E14",
          whiteSpace: "pre-wrap"
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 660,
          marginTop: 38,
          fontSize: body.length > 170 ? 31 : 36,
          fontWeight: 400,
          lineHeight: 1.25,
          color: "#5A6373",
          whiteSpace: "pre-wrap"
        }}
      >
        {body}
      </div>
    </div>
  );
}

export function PlantillaSlide({
  titulo,
  texto,
  indiceSlide,
  totalSlides,
  fondoUrl,
  logoUrl
}: PlantillaSlideProps) {
  const safeTitle = titulo.replace(/\s+/g, " ").trim();
  const safeText = texto.replace(/\s+/g, " ").trim();
  const layout = getLayoutKind(indiceSlide, totalSlides, safeTitle, safeText);

  return (
    <div
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        display: "flex",
        background: "#FFFFFF",
        color: "#0B0E14",
        fontFamily: "Inter",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <BackgroundLayer fondoUrl={fondoUrl} />

      {layout === "cover" ? <CoverLayout titulo={safeTitle} texto={safeText} /> : null}
      {layout === "content" ? <ContentLayout titulo={safeTitle} texto={safeText} indiceSlide={indiceSlide} /> : null}
      {layout === "quote" ? <QuoteLayout titulo={safeTitle} texto={safeText} /> : null}
      {layout === "closing" ? <ClosingLayout titulo={safeTitle} texto={safeText} /> : null}

      <BrandLogo logoUrl={logoUrl} align={layout === "cover" ? "right" : "left"} prominent={layout === "closing"} />
      <SlideCounter indiceSlide={indiceSlide} totalSlides={totalSlides} />
    </div>
  );
}

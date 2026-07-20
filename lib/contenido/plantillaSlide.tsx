type TipoPieza = "noticia" | "caso_uso" | "dato_rapido" | "reel" | "historia" | null;

type PlantillaSlideProps = {
  titulo: string;
  texto: string;
  indiceSlide: number;
  totalSlides: number;
  fondoUrl?: string | null;
  logoUrl?: string | null;
  tipoPieza?: TipoPieza;
};

type LayoutKind = "cover" | "content" | "quote" | "closing";
type VisualTone = "light" | "solid" | "photo";

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;
const CASE_STUDY_COLORS = ["#2563EB", "#0B0E14", "#1F44FF", "#174EA6"];

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

function getCaseStudyColor(indiceSlide: number) {
  return CASE_STUDY_COLORS[indiceSlide % CASE_STUDY_COLORS.length];
}

function getToneStyles(tone: VisualTone) {
  if (tone === "solid" || tone === "photo") {
    return {
      title: "#FFFFFF",
      body: "rgba(255, 255, 255, 0.84)",
      muted: "rgba(255, 255, 255, 0.56)",
      accent: "#FFFFFF",
      ghost: "rgba(255, 255, 255, 0.12)"
    };
  }

  return {
    title: "#0B0E14",
    body: "#5A6373",
    muted: "rgba(90, 99, 115, 0.82)",
    accent: "#2563EB",
    ghost: "rgba(11, 14, 20, 0.07)"
  };
}

function BrandLogo({
  logoUrl,
  align = "left",
  prominent = false,
  tone = "light"
}: {
  logoUrl?: string | null;
  align?: "left" | "right";
  prominent?: boolean;
  tone?: VisualTone;
}) {
  const position = align === "left" ? { left: 80 } : { right: 80 };
  const isLightLogo = tone === "solid" || tone === "photo";

  return (
    <div
      style={{
        position: "absolute",
        bottom: tone === "photo" ? 58 : 64,
        ...position,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: prominent ? 48 : 40,
        width: prominent ? 188 : 150,
        borderRadius: isLightLogo ? 0 : 999,
        border: isLightLogo ? "none" : "1px solid rgba(11, 14, 20, 0.08)",
        background: isLightLogo ? "transparent" : "rgba(255, 255, 255, 0.78)",
        opacity: isLightLogo ? 0.9 : 1
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
            objectFit: "contain",
            filter: isLightLogo ? "invert(1)" : "none"
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            fontSize: prominent ? 24 : 18,
            fontWeight: 700,
            color: isLightLogo ? "#FFFFFF" : "#0B0E14"
          }}
        >
          Blyndtek
        </div>
      )}
    </div>
  );
}

function SlideCounter({
  indiceSlide,
  totalSlides,
  tone = "light"
}: {
  indiceSlide: number;
  totalSlides: number;
  tone?: VisualTone;
}) {
  if (totalSlides <= 1) {
    return null;
  }

  const color = tone === "light" ? "rgba(90, 99, 115, 0.82)" : "rgba(255, 255, 255, 0.72)";

  return (
    <div
      style={{
        position: "absolute",
        right: 82,
        bottom: tone === "photo" ? 66 : 72,
        display: "flex",
        fontSize: tone === "photo" ? 20 : 22,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color
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

function SolidBackgroundLayer({ indiceSlide }: { indiceSlide: number }) {
  const background = getCaseStudyColor(indiceSlide);

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180,
          top: -120,
          display: "flex",
          width: 520,
          height: 520,
          borderRadius: 520,
          background: "rgba(255, 255, 255, 0.09)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -220,
          bottom: -180,
          display: "flex",
          width: 620,
          height: 620,
          borderRadius: 620,
          border: "2px solid rgba(255, 255, 255, 0.14)"
        }}
      />
    </>
  );
}

function NoticiaBackgroundLayer({ fondoUrl }: { fondoUrl?: string | null }) {
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
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: "linear-gradient(135deg, #DCD9F2 0%, #D9EAF5 52%, #FFFFFF 100%)"
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          height: 560,
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.70) 34%, rgba(0, 0, 0, 0.96) 72%, rgba(0, 0, 0, 1) 100%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          height: 380,
          background: "#000000"
        }}
      />
    </>
  );
}

function CoverLayout({ titulo, texto, tone = "light" }: { titulo: string; texto: string; tone?: VisualTone }) {
  const title = clampText(titulo, 78);
  const subtitle = clampText(texto, tone === "solid" ? 96 : 118);
  const colors = getToneStyles(tone);

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
          background: colors.accent
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
          color: colors.title,
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
            color: colors.body,
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
  indiceSlide,
  tone = "light"
}: {
  titulo: string;
  texto: string;
  indiceSlide: number;
  tone?: VisualTone;
}) {
  const title = clampText(titulo, 82);
  const body = clampText(texto, 300);
  const colors = getToneStyles(tone);

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
          color: colors.ghost
        }}
      >
        {slideLabel(indiceSlide)}
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 700,
          fontSize: tone === "solid" ? (title.length > 54 ? 46 : 54) : title.length > 54 ? 48 : 56,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.055em",
          color: colors.title,
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
          color: colors.body,
          whiteSpace: "pre-wrap"
        }}
      >
        {body}
      </div>
    </div>
  );
}

function QuoteLayout({ titulo, texto, tone = "light" }: { titulo: string; texto: string; tone?: VisualTone }) {
  const title = clampText(titulo, 70);
  const body = clampText(texto, 190);
  const heroSize = body.length > 130 ? 52 : 64;
  const colors = getToneStyles(tone);

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
          color: colors.accent
        }}
      >
        “
      </div>
      <div
        style={{
          display: "flex",
          maxWidth: 820,
          fontSize: tone === "solid" ? Math.max(heroSize - 6, 46) : heroSize,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: "-0.06em",
          color: colors.title,
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
            color: colors.body,
            whiteSpace: "pre-wrap"
          }}
        >
          {title}
        </div>
      ) : null}
    </div>
  );
}

function ClosingLayout({ titulo, texto, tone = "light" }: { titulo: string; texto: string; tone?: VisualTone }) {
  const title = clampText(titulo, 82);
  const body = clampText(texto, 230);
  const colors = getToneStyles(tone);

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
          background: tone === "solid" ? "rgba(255,255,255,0.18)" : colors.accent
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
          color: colors.title,
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
          color: colors.body,
          whiteSpace: "pre-wrap"
        }}
      >
        {body}
      </div>
    </div>
  );
}

function NoticiaLayout({ titulo }: { titulo: string }) {
  const title = clampText(titulo, 122);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: 380,
        padding: "44px 78px 112px",
        background: "#000000"
      }}
    >
      <div
        style={{
          display: "flex",
          maxWidth: 890,
          fontSize: title.length > 86 ? 40 : 48,
          fontWeight: 700,
          lineHeight: 1.02,
          letterSpacing: "-0.052em",
          color: "#FFFFFF",
          textShadow: "0 2px 16px rgba(0, 0, 0, 0.34)",
          whiteSpace: "pre-wrap"
        }}
      >
        {title}
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
  logoUrl,
  tipoPieza = null
}: PlantillaSlideProps) {
  const safeTitle = titulo.replace(/\s+/g, " ").trim();
  const safeText = texto.replace(/\s+/g, " ").trim();

  if (tipoPieza === "noticia") {
    return (
      <div
        style={{
          width: `${FRAME_WIDTH}px`,
          height: `${FRAME_HEIGHT}px`,
          display: "flex",
          background: "#0B0E14",
          color: "#FFFFFF",
          fontFamily: "DM Sans",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <NoticiaBackgroundLayer fondoUrl={fondoUrl} />
        <NoticiaLayout titulo={safeTitle} />
        <BrandLogo logoUrl={logoUrl} align="left" tone="photo" />
        <SlideCounter indiceSlide={indiceSlide} totalSlides={totalSlides} tone="photo" />
      </div>
    );
  }

  const layout = getLayoutKind(indiceSlide, totalSlides, safeTitle, safeText);
  const tone: VisualTone = tipoPieza === "caso_uso" ? "solid" : "light";

  return (
    <div
      style={{
        width: `${FRAME_WIDTH}px`,
        height: `${FRAME_HEIGHT}px`,
        display: "flex",
        background: tone === "solid" ? getCaseStudyColor(indiceSlide) : "#FFFFFF",
        color: tone === "solid" ? "#FFFFFF" : "#0B0E14",
        fontFamily: "DM Sans",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {tone === "solid" ? <SolidBackgroundLayer indiceSlide={indiceSlide} /> : <BackgroundLayer fondoUrl={fondoUrl} />}

      {layout === "cover" ? <CoverLayout titulo={safeTitle} texto={safeText} tone={tone} /> : null}
      {layout === "content" ? (
        <ContentLayout titulo={safeTitle} texto={safeText} indiceSlide={indiceSlide} tone={tone} />
      ) : null}
      {layout === "quote" ? <QuoteLayout titulo={safeTitle} texto={safeText} tone={tone} /> : null}
      {layout === "closing" ? <ClosingLayout titulo={safeTitle} texto={safeText} tone={tone} /> : null}

      <BrandLogo
        logoUrl={logoUrl}
        align={tone === "solid" ? "left" : layout === "cover" ? "right" : "left"}
        prominent={layout === "closing"}
        tone={tone}
      />
      <SlideCounter indiceSlide={indiceSlide} totalSlides={totalSlides} tone={tone} />
    </div>
  );
}

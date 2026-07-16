import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = {
  height: 630,
  width: 1200,
};

const MARK_PATH =
  "M119 116.5V81.5C119 79.1 117 78.1666 116 77.9999H83C79.8 77.9999 78.3807 80.3333 78.071 81.5V116.5C78.071 117.667 76.752 120.223 72.1038 122.5C67 125 34.9745 143.667 19.3934 153C18.5647 153.333 16.6087 153.5 15.4153 151.5C14.2219 149.5 10.6084 143.333 8.95082 140.5C8.45355 139.333 8.25465 136.6 11.4372 135C14.6197 133.4 36.3005 121 46.7432 115C47.5719 114.167 49.0306 112.1 48.235 110.5C47.4393 108.9 45.9144 108.167 45.2514 108H1.98907C1.32605 108 0 107.6 0 106V91.3892C0 90.5928 0.397815 89 1.98907 89H44.3705C45.6587 89 48.235 88.3 48.235 85.5C48.235 82.7 45.2514 81 43.7596 80.5L9.44809 60.5C8.95082 60.1667 8.25465 59 9.44809 57C10.6415 55 14.918 47.5 16.9071 44C17.2386 43.6667 18.3989 43.3 20.388 44.5C22.377 45.7 59.3406 67.3333 77.5738 77.9999L43.7596 19.4999C43.2623 18.8333 42.8645 17.1999 45.2514 15.9999C47.6383 14.7999 54.5337 10.4999 57.6831 8.49994C58.1803 8.16661 59.5727 8.19994 61.1639 10.9999C62.7552 13.7999 75.7505 36.1666 82.0492 47C84.204 47.6667 88.5137 47.9 88.5137 43.5V1.38477C88.5137 0.923177 89.0109 0 91 0H106C108 0 108.5 0.923177 108.5 1.38477V43.5C108.5 47.9 112.833 47.6667 115 47C121.333 36.1666 134.4 13.7999 136 10.9999C137.6 8.19994 139 8.16661 139.5 8.49994C142.667 10.4999 149.6 14.7999 152 15.9999C154.4 17.1999 154 18.8333 153.5 19.4999L119.5 77.9999C137.833 67.3333 175 45.7 177 44.5C179 43.3 180.167 43.6667 180.5 44C182.5 47.5 186.8 55 188 57C189.2 59 188.5 60.1667 188 60.5L153.5 80.5C152 81 149 82.7 149 85.5C149 88.3 151.59 89 152.886 89H195.5C197.1 89 197.5 90.5928 197.5 91.3892V106C197.5 107.6 196.167 108 195.5 108H152C151.333 108.167 149.8 108.9 149 110.5C148.2 112.1 149.667 114.167 150.5 115C161 121 182.8 133.4 186 135C189.2 136.6 189 139.333 188.5 140.5C186.833 143.333 183.2 149.5 182 151.5C180.8 153.5 178.833 153.333 178 153C162.333 143.667 129.5 125 125 122.5C120.454 119.975 119 117.667 119 116.5Z";

const fontData = Promise.all([
  fetch(new URL("./fonts/tt-neoris-trial-regular.woff", import.meta.url)).then(
    (res) => res.arrayBuffer()
  ),
  fetch(new URL("./fonts/departure-mono-regular.otf", import.meta.url)).then(
    (res) => res.arrayBuffer()
  ),
]);

const base = {
  background: "#0b0b0d",
  color: "#fff",
  display: "flex",
  fontFamily: "TTNeoris",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  width: "100%",
} as const;

const logoText = {
  color: "rgba(255,255,255,0.72)",
  fontFamily: "TTNeoris",
  fontSize: 18,
  fontWeight: 500,
  letterSpacing: "-0.01em",
} as const;

const site = {
  color: "rgba(255,255,255,0.22)",
  fontFamily: "DepartureMono",
  fontSize: 13,
  letterSpacing: "0.04em",
  position: "absolute",
} as const;

function Logo({
  left,
  top,
}: {
  left: number;
  top: number;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 10,
        left,
        position: "absolute",
        top,
      }}
    >
      <svg
        fill="none"
        height="19"
        style={{ color: "#abc4ff" }}
        viewBox="0 0 198 154"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={MARK_PATH} fill="currentColor" />
      </svg>
      <span style={logoText}>Avenire</span>
    </div>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#abc4ff" }}>{children}</span>;
}

function HomepageTemplate() {
  return (
    <div style={base}>
      <svg
        fill="none"
        height="480"
        style={{
          opacity: 0.07,
          position: "absolute",
          right: -80,
          top: -80,
          width: 480,
        }}
        viewBox="0 0 198 154"
        width="480"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={MARK_PATH} fill="white" />
      </svg>
      <Logo left={72} top={56} />
      <div
        style={{
          bottom: 100,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "TTNeoris",
          fontSize: 88,
          fontWeight: 600,
          left: 72,
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          position: "absolute",
        }}
      >
        <span>The AI</span>
        <span>learning</span>
        <Em>workspace</Em>
      </div>
      <div style={{ ...site, bottom: 56, left: 72 }}>avenire.space</div>
    </div>
  );
}

function BlogTemplate({
  category,
  date,
  title,
}: {
  category: string;
  date: string;
  title: string;
}) {
  const lines = title.split(/\n|<br\s*\/?>/i).slice(0, 3);

  return (
    <div style={base}>
      <div
        style={{
          background:
            "radial-gradient(ellipse at 40% 50%, rgba(171,196,255,0.06), transparent 65%)",
          height: 400,
          left: 400,
          position: "absolute",
          top: 115,
          width: 600,
        }}
      />
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          bottom: 0,
          left: 420,
          position: "absolute",
          top: 0,
          width: 1,
        }}
      />
      <Logo left={72} top={56} />
      <div
        style={{
          bottom: 108,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          left: 72,
          position: "absolute",
        }}
      >
        <span
          style={{
            color: "#abc4ff",
            fontFamily: "DepartureMono",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {category}
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.28)",
            fontFamily: "DepartureMono",
            fontSize: 12,
            letterSpacing: "0.06em",
          }}
        >
          {date}
        </span>
      </div>
      <div
        style={{
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "TTNeoris",
          fontSize: 58,
          fontWeight: 600,
          left: 476,
          letterSpacing: "-0.03em",
          lineHeight: 1.07,
          position: "absolute",
          right: 72,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {lines.length > 0
          ? lines.map((line) => <span key={line}>{line}</span>)
          : null}
      </div>
      <div style={{ ...site, bottom: 56, right: 72 }}>avenire.space/blog</div>
    </div>
  );
}

function AnnouncementTemplate({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  const lines = title.split(/\n|<br\s*\/?>/i).slice(0, 2);

  return (
    <div style={base}>
      <div
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(171,196,255,0.065), transparent 58%)",
          inset: 0,
          position: "absolute",
        }}
      />
      <Logo left={72} top={56} />
      <div
        style={{
          alignItems: "center",
          background: "rgba(171,196,255,0.07)",
          border: "1px solid rgba(171,196,255,0.28)",
          borderRadius: 100,
          color: "#abc4ff",
          display: "flex",
          fontFamily: "DepartureMono",
          fontSize: 10,
          gap: 7,
          letterSpacing: "0.14em",
          padding: "6px 14px",
          position: "absolute",
          right: 72,
          textTransform: "uppercase",
          top: 56,
        }}
      >
        <span
          style={{
            background: "#abc4ff",
            borderRadius: "50%",
            height: 5,
            width: 5,
          }}
        />
        New
      </div>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          inset: 0,
          justifyContent: "center",
          padding: "0 120px",
          position: "absolute",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.32)",
            fontFamily: "DepartureMono",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            fontFamily: "TTNeoris",
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.02,
          }}
        >
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div
          style={{
            background: "rgba(171,196,255,0.35)",
            height: 1,
            width: 48,
          }}
        />
      </div>
      <div style={{ ...site, bottom: 56, left: 72 }}>avenire.space</div>
    </div>
  );
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "Feb 23, 2026";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get("template") ?? "home";
  const title =
    searchParams.get("title") ??
    (template === "announcement"
      ? "Interactive AI\nthat learns with you"
      : "The AI\nlearning\nworkspace");
  const category = searchParams.get("category") ?? "AI Learning";
  const date = formatShortDate(searchParams.get("date"));
  const readingTime = searchParams.get("readingTime") ?? "4 min";
  const eyebrow = searchParams.get("eyebrow") ?? "Study widgets";
  const [ttNeoris, departureMono] = await fontData;

  const image =
    template === "blog" ? (
      <BlogTemplate
        category={category}
        date={`${date} · ${readingTime}`}
        title={title}
      />
    ) : template === "announcement" ? (
      <AnnouncementTemplate eyebrow={eyebrow} title={title} />
    ) : (
      <HomepageTemplate />
    );

  return new ImageResponse(image, {
    ...SIZE,
    fonts: [
      {
        data: ttNeoris,
        name: "TTNeoris",
        style: "normal",
        weight: 600,
      },
      {
        data: departureMono,
        name: "DepartureMono",
        style: "normal",
        weight: 400,
      },
    ],
    headers: {
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}

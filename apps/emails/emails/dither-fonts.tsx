import { Font } from "@react-email/components";

export function DitherFonts() {
  return (
    <>
      <Font
        fallbackFontFamily={["Arial", "sans-serif"]}
        fontFamily="IBM Plex Sans Condensed"
        fontStyle="normal"
        fontWeight={500}
        webFont={{
          url: "https://fonts.gstatic.com/s/ibmplexsanscondensed/v15/Gg8gN4UfRSqiPg7Jn2ZI12V4DCEwkj1E4LVeHY5a64vr.ttf",
          format: "truetype",
        }}
      />
      <Font
        fallbackFontFamily={["Arial", "sans-serif"]}
        fontFamily="Inter"
        fontStyle="normal"
        fontWeight={300}
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZg.ttf",
          format: "truetype",
        }}
      />
      <Font
        fallbackFontFamily={["Arial", "sans-serif"]}
        fontFamily="Inter"
        fontStyle="normal"
        fontWeight={400}
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2",
          format: "woff2",
        }}
      />
      <Font
        fallbackFontFamily={["Arial", "sans-serif"]}
        fontFamily="Inter"
        fontStyle="normal"
        fontWeight={500}
        webFont={{
          url: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf",
          format: "truetype",
        }}
      />
    </>
  );
}

/**
 * Register theme-provided custom fonts into the core.
 *
 * Theme format:
 * customFonts: [
 *   {
 *     family: "Inter",
 *     faces: [
 *       { style: "normal", fileName: "Inter-Regular.ttf", data: "<base64>" }
 *     ]
 *   }
 * ]
 *
 * @param {import("./pdf-core").PDFCore} core
 * @param {object} theme
 */
function registerThemeFonts(core, theme) {
  const customFonts = Array.isArray(theme.customFonts) ? theme.customFonts : [];

  customFonts.forEach((familyDef) => {
    if (!familyDef || !familyDef.family) {
      throw new Error("Invalid customFonts family definition");
    }

    const faces = Array.isArray(familyDef.faces) ? familyDef.faces : [];
    faces.forEach((face) => {
      const data = face && (face.data || face.base64);
      const fileName = face && face.fileName;
      const style = (face && face.style) || "normal";

      if (!data || !fileName) {
        throw new Error(`Invalid font face for family "${familyDef.family}"`);
      }

      core.registerFont({
        family: familyDef.family,
        style,
        fileName,
        data,
      });
    });
  });
}

module.exports = {
  registerThemeFonts,
};

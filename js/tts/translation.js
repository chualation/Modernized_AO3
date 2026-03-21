/* TTS Translation Module */

// Global translation cache
window.TTSTranslation = window.TTSTranslation || {};
window.TTSTranslation.cache = {};

window.TTSTranslation.getTranslationCacheKey = function(getCurrentChapterIndex, languagePrefix, titleText, paragraphTexts) {
  const chapterIndex = getCurrentChapterIndex();
  const sourceSignature = `${titleText}\n${paragraphTexts.join("\n")}`;
  return `${chapterIndex}|${languagePrefix}|${sourceSignature}`;
};

window.TTSTranslation.translateTextSegment = async function(sourceText, targetLanguage, getLanguagePrefix) {
  if (!sourceText) {
    return "";
  }

  const tl = getLanguagePrefix(targetLanguage) || targetLanguage;
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=" +
    encodeURIComponent(tl) +
    "&q=" +
    encodeURIComponent(sourceText);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Translation API error:", response.status, response.statusText);
      throw new Error("Translation request failed");
    }

    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      console.warn("Unexpected translation response format");
      throw new Error("Unexpected translation response");
    }

    const translated = data[0]
      .map(function (segment) {
        return Array.isArray(segment) && segment[0] ? segment[0] : "";
      })
      .join("")
      .trim()
      .replace(/\s+/g, " ");

    if (!translated) {
      console.warn("Translation returned empty result");
      return sourceText;
    }

    return translated;
  } catch (error) {
    console.error("Translation error:", error.message);
    return sourceText;
  }
};

window.TTSTranslation.prepareNarrationContent = async function(options) {
  const {
    getSelectedLanguage,
    getLanguagePrefix,
    getSelectedAccent,
    getStoryContentParts,
    buildNarrationFromParts,
    updateStatus,
    getCurrentChapterIndex
  } = options;

  const selectedLanguage = getSelectedLanguage();
  const languagePrefix = getLanguagePrefix(selectedLanguage);
  const contentParts = getStoryContentParts();

  if (!contentParts.paragraphElements.length) {
    return {
      fullText: "",
      currentTextLength: 0,
      paragraphMap: []
    };
  }

  // For English OR English with language-based accent, don't translate
  if (languagePrefix === "en") {
    return buildNarrationFromParts(
      contentParts.titleText,
      contentParts.paragraphElements,
      contentParts.paragraphTexts
    );
  }

  const cacheKey = window.TTSTranslation.getTranslationCacheKey(
    getCurrentChapterIndex,
    languagePrefix,
    contentParts.titleText,
    contentParts.paragraphTexts
  );
  const cachedTranslation = window.TTSTranslation.cache[cacheKey];

  if (cachedTranslation) {
    return buildNarrationFromParts(
      cachedTranslation.titleText,
      contentParts.paragraphElements,
      cachedTranslation.paragraphTexts
    );
  }

  updateStatus(`Translating to ${selectedLanguage.toUpperCase()}...`);

  try {
    const translatedTitle = contentParts.titleText
      ? await window.TTSTranslation.translateTextSegment(contentParts.titleText, languagePrefix, getLanguagePrefix)
      : "";

    const translatedParagraphs = [];
    for (let i = 0; i < contentParts.paragraphTexts.length; i++) {
      const translated = await window.TTSTranslation.translateTextSegment(contentParts.paragraphTexts[i], languagePrefix, getLanguagePrefix);
      translatedParagraphs.push(translated);
    }

    window.TTSTranslation.cache[cacheKey] = {
      titleText: translatedTitle,
      paragraphTexts: translatedParagraphs
    };

    const result = buildNarrationFromParts(
      translatedTitle,
      contentParts.paragraphElements,
      translatedParagraphs
    );
    updateStatus("Ready");
    return result;
  } catch (error) {
    console.error("Translation pipeline error:", error);
    updateStatus("Translation failed. Using original text.");
    return buildNarrationFromParts(
      contentParts.titleText,
      contentParts.paragraphElements,
      contentParts.paragraphTexts
    );
  }
};

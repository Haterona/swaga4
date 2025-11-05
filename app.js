// app.js
(() => {
  "use strict";

  /**
   * Hugging Face router endpoints for different tasks.
   * All endpoints share the same HF token provided by the user.
   */
  const HF_ENDPOINTS = {
    style:
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
    background:
      "https://router.huggingface.co/hf-inference/models/briaai/RMBG-2.0",
    quality:
      "https://router.huggingface.co/hf-inference/models/ai-forever/Real-ESRGAN"
  };

  // DOM references
  const apiKeyInput = document.getElementById("apiKey");
  const foodSelect = document.getElementById("Food type");
  const editSelect = document.getElementById("Edit");
  const photoInput = document.getElementById("photoInput");
  const generateBtn = document.getElementById("generateBtn");
  const outputArea = document.getElementById("outputArea");

  /**
   * Build a descriptive text prompt for style generation (SDXL).
   *
   * @param {string} food - Selected food type.
   * @param {string} editType - Selected processing type.
   * @returns {string} Prompt text.
   */
  function buildPrompt(food, editType) {
    const base =
      `${food} hero shot, ultra realistic, commercial food photography, ` +
      "shot on a dark matte table, shallow depth of field, cinematic lighting";

    if (editType === "Background cleaning") {
      return (
        base +
        ", isolated on a clean soft gradient background, no clutter, product catalog look, web shop ready"
      );
    }

    if (editType === "Quality improvement") {
      return (
        base +
        ", crisp 4k detail, noise-free, high dynamic range, sharp textures, studio-grade retouching"
      );
    }

    // Default for "Style"
    return (
      base +
      ", modern editorial style, subtle color grading, perfect for a sales landing page hero banner"
    );
  }

  /**
   * Convert a File to a base64-encoded string without the data URL prefix.
   *
   * @param {File} file
   * @returns {Promise<string>} Base64 string for the image.
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Unexpected FileReader result type."));
          return;
        }
        const commaIndex = result.indexOf(",");
        if (commaIndex === -1) {
          resolve(result);
        } else {
          resolve(result.slice(commaIndex + 1));
        }
      };

      reader.onerror = () => {
        reject(reader.error || new Error("Failed to read image file."));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Show a loading indicator in the output area.
   */
  function showLoading() {
    outputArea.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "status-text";

    const dot = document.createElement("div");
    dot.className = "status-dot";

    const main = document.createElement("div");
    main.className = "status-main";
    main.textContent = "Generation in progress…";

    const sub = document.createElement("div");
    sub.className = "status-sub";
    sub.textContent = "This may take up to a minute while the models load.";

    wrapper.appendChild(dot);
    wrapper.appendChild(main);
    wrapper.appendChild(sub);

    outputArea.appendChild(wrapper);
  }

  /**
   * Show a user-friendly error message.
   *
   * @param {string} message
   */
  function showError(message) {
    outputArea.innerHTML = "";
    const errorText = document.createElement("div");
    errorText.className = "status-main error";
    errorText.textContent = message;
    outputArea.appendChild(errorText);
  }

  /**
   * Show an image generated from a Blob in the output area.
   *
   * @param {Blob} imageBlob
   * @param {string} alt
   */
  function showImageFromBlob(imageBlob, alt) {
    const objectUrl = URL.createObjectURL(imageBlob);

    outputArea.innerHTML = "";
    const img = document.createElement("img");
    img.src = objectUrl;
    img.alt = alt;

    img.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
    });

    outputArea.appendChild(img);
  }

  /**
   * Show an image using a data URL (e.g. base64 mask) in the output area.
   *
   * @param {string} dataUrl
   * @param {string} alt
   */
  function showImageFromDataUrl(dataUrl, alt) {
    outputArea.innerHTML = "";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = alt;
    outputArea.appendChild(img);
  }

  /**
   * Call Stable Diffusion XL (text-to-image) for "Style" mode.
   *
   * @param {string} apiKey
   * @param {string} prompt
   * @returns {Promise<Blob>}
   */
  async function callStyleGeneration(apiKey, prompt) {
    const response = await fetch(HF_ENDPOINTS.style, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        errorDetail = await response.text();
      } catch {
        // ignore
      }
      const shortDetail =
        errorDetail && errorDetail.length > 160
          ? `${errorDetail.slice(0, 160)}…`
          : errorDetail;
      const baseMessage =
        "Style generation failed (SDXL). The model may be loading or your key may not have access.";
      const fullMessage = shortDetail
        ? `${baseMessage} Details: ${shortDetail}`
        : baseMessage;
      throw new Error(fullMessage);
    }

    return await response.blob();
  }

  /**
   * Call briaai/RMBG-2.0 via image segmentation API.
   * Returns a data URL of the predicted mask (white foreground / black background).
   *
   * @param {string} apiKey
   * @param {File} imageFile
   * @returns {Promise<string>} data URL with the mask PNG.
   */
  async function callBackgroundRemoval(apiKey, imageFile) {
    const base64Image = await fileToBase64(imageFile);

    const response = await fetch(HF_ENDPOINTS.background, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ inputs: base64Image })
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        errorDetail = await response.text();
      } catch {
        // ignore
      }
      const shortDetail =
        errorDetail && errorDetail.length > 160
          ? `${errorDetail.slice(0, 160)}…`
          : errorDetail;
      const baseMessage =
        "Background removal failed (RMBG-2.0). Check access to the model and try again.";
      const fullMessage = shortDetail
        ? `${baseMessage} Details: ${shortDetail}`
        : baseMessage;
      throw new Error(fullMessage);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Background removal returned an empty result.");
    }

    // Pick the segment with the highest score.
    const best = data.reduce((acc, item) =>
      !acc || (item && item.score > acc.score) ? item : acc
    );

    if (!best || !best.mask) {
      throw new Error("Background removal response did not include a mask.");
    }

    return `data:image/png;base64,${best.mask}`;
  }

  /**
   * Call Real-ESRGAN (image-to-image / super-resolution).
   * Uses raw image bytes as input and returns an upscaled image blob.
   *
   * @param {string} apiKey
   * @param {File} imageFile
   * @returns {Promise<Blob>}
   */
  async function callQualityImprovement(apiKey, imageFile) {
    const response = await fetch(HF_ENDPOINTS.quality, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": imageFile.type || "application/octet-stream",
        Accept: "image/png"
      },
      body: imageFile
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        errorDetail = await response.text();
      } catch {
        // ignore
      }
      const shortDetail =
        errorDetail && errorDetail.length > 160
          ? `${errorDetail.slice(0, 160)}…`
          : errorDetail;
      const baseMessage =
        "Quality improvement failed (Real-ESRGAN). The model may not be available on the free Inference API.";
      const fullMessage = shortDetail
        ? `${baseMessage} Details: ${shortDetail}`
        : baseMessage;
      throw new Error(fullMessage);
    }

    return await response.blob();
  }

  /**
   * Main button handler:
   *  - Reads user inputs
   *  - Decides which model to call
   *  - Displays the resulting image or errors
   */
  async function handleGenerateClick() {
    const apiKey = apiKeyInput.value.trim();
    const food = foodSelect.value;
    const editType = editSelect.value;
    const photoFile = photoInput.files && photoInput.files[0];

    if (!apiKey) {
      showError("Please paste your Hugging Face API key before generating.");
      return;
    }

    // For background cleaning and quality improvement we must have a photo.
    if (
      (editType === "Background cleaning" || editType === "Quality improvement") &&
      !photoFile
    ) {
      showError(
        `Please upload a food photo for “${editType}”. Style mode can work without a file.`
      );
      return;
    }

    const prompt = buildPrompt(food, editType);

    showLoading();
    generateBtn.disabled = true;
    const originalBtnHtml = generateBtn.innerHTML;
    generateBtn.innerHTML = "<span>Creating…</span>";

    try {
      if (editType === "Style") {
        // Text-to-image with SDXL
        const imageBlob = await callStyleGeneration(apiKey, prompt);
        showImageFromBlob(
          imageBlob,
          `Styled food image for ${food} using SDXL based on prompt: ${prompt}`
        );
      } else if (editType === "Background cleaning") {
        // Background removal with RMBG-2.0
        const maskDataUrl = await callBackgroundRemoval(apiKey, photoFile);
        showImageFromDataUrl(
          maskDataUrl,
          `Background mask for ${food} created with RMBG-2.0`
        );
      } else if (editType === "Quality improvement") {
        // Super-resolution / enhancement with Real-ESRGAN
        const upscaledBlob = await callQualityImprovement(apiKey, photoFile);
        showImageFromBlob(
          upscaledBlob,
          `Quality-improved ${food} photo upscaled by Real-ESRGAN`
        );
      } else {
        // Fallback to style generation if an unknown option appears.
        const fallbackBlob = await callStyleGeneration(apiKey, prompt);
        showImageFromBlob(
          fallbackBlob,
          `Generated food image for ${food} (fallback style mode)`
        );
      }
    } catch (error) {
      console.error(error);
      showError(
        "Something went wrong while processing the image. Please check your API key, model access and try again."
      );
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalBtnHtml;
    }
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", handleGenerateClick);
  }
})();
::contentReference[oaicite:0]{index=0}

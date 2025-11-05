// app.js
(() => {
  "use strict";

  /**
   * Hugging Face inference endpoint for Stable Diffusion XL base.
   * This endpoint expects a JSON body with an `inputs` string.
   */
  const HF_ENDPOINT =
    "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

  // Grab references to DOM elements once.
  const apiKeyInput = document.getElementById("apiKey");
  const foodSelect = document.getElementById("Food type");
  const editSelect = document.getElementById("Edit");
  const photoInput = document.getElementById("photoInput");
  const generateBtn = document.getElementById("generateBtn");
  const outputArea = document.getElementById("outputArea");

  /**
   * Build a descriptive text prompt based on selected food and processing type.
   * The goal is to encourage high–quality, commercial-grade food photography.
   *
   * @param {string} food - Selected food type (e.g. "Pizza").
   * @param {string} editType - Selected processing type (e.g. "Quality improvement").
   * @returns {string} Descriptive text prompt for the model.
   */
  function buildPrompt(food, editType) {
    const editMap = {
      Style:
        "hero shot in a clean, modern style, studio lighting, high contrast, appetizing presentation",
      "Background cleaning":
        "isolated on a clean, soft gradient background, no clutter, studio tabletop photography",
      "Quality improvement":
        "ultra detailed, crisp focus, high-resolution, professional food photography lighting"
    };

    const editDescription =
      editMap[editType] ||
      "professional food photography, sharp focus, soft studio lighting";

    return `${food} photo, ${editDescription}, perfect for an online sales site hero banner, shot on DSLR, 4k, realistic textures`;
  }

  /**
   * Display a loading status message inside the output area.
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
    sub.textContent = "This may take up to a minute while the model loads.";

    wrapper.appendChild(dot);
    wrapper.appendChild(main);
    wrapper.appendChild(sub);

    outputArea.appendChild(wrapper);
  }

  /**
   * Display a user-friendly error message in the output area.
   *
   * @param {string} message - Error text for the user.
   */
  function showError(message) {
    outputArea.innerHTML = "";
    const errorText = document.createElement("div");
    errorText.className = "status-main error";
    errorText.textContent = message;
    outputArea.appendChild(errorText);
  }

  /**
   * Display the generated image blob in the output area.
   *
   * @param {Blob} imageBlob - Image data returned by the API.
   * @param {string} prompt - Prompt used to generate the image (for accessibility).
   */
  function showImage(imageBlob, prompt) {
    const objectUrl = URL.createObjectURL(imageBlob);

    outputArea.innerHTML = "";
    const img = document.createElement("img");
    img.src = objectUrl;
    img.alt = `Generated food image based on prompt: ${prompt}`;

    // Revoke the temporary URL after the image has loaded to free memory.
    img.addEventListener("load", () => {
      URL.revokeObjectURL(objectUrl);
    });

    outputArea.appendChild(img);
  }

  /**
   * Call the Hugging Face inference API and return the generated image as a Blob.
   *
   * @param {string} apiKey - Hugging Face API token.
   * @param {string} prompt - Text prompt for the model.
   * @returns {Promise<Blob>} Blob containing the generated image.
   */
  async function generateImage(apiKey, prompt) {
    const response = await fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png"
      },
      body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
      // Try to extract any text-based error for easier debugging during development.
      let errorDetail = "";
      try {
        errorDetail = await response.text();
      } catch {
        // Ignore parse errors and fall back to generic message.
      }
      const shortDetail =
        errorDetail && errorDetail.length > 160
          ? `${errorDetail.slice(0, 160)}…`
          : errorDetail;

      const message =
        "Generation failed. The model may be loading or your key may not have access.";
      const combined = shortDetail ? `${message} Details: ${shortDetail}` : message;

      throw new Error(combined);
    }

    return await response.blob();
  }

  /**
   * Handle click on the "Create Image" button:
   *  - Read user inputs
   *  - Build a descriptive prompt
   *  - Call the Hugging Face API
   *  - Render the resulting image or an error state
   */
  async function handleGenerateClick() {
    const apiKey = apiKeyInput.value.trim();
    const food = foodSelect.value;
    const editType = editSelect.value;
    const photoFile = photoInput.files && photoInput.files[0];

    // Basic validation for the API key.
    if (!apiKey) {
      showError("Please paste your Hugging Face API key before generating.");
      return;
    }

    // The photo file is currently not sent to the API in this MVP,
    // but we still read it so it is available for future image-to-image flows.
    if (!photoFile) {
      // Optional gentle reminder; not a hard error.
      console.info(
        "[Food Image Enhancer] No photo selected. Using text prompt only for generation."
      );
    }

    const prompt = buildPrompt(food, editType);

    // Update UI to loading state.
    showLoading();
    generateBtn.disabled = true;
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = "Creating…";

    try {
      const imageBlob = await generateImage(apiKey, prompt);
      showImage(imageBlob, prompt);
    } catch (error) {
      console.error(error);
      showError(
        "Something went wrong while generating the image. Please check your API key, model access, and try again."
      );
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = originalLabel;
    }
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", handleGenerateClick);
  }
})();

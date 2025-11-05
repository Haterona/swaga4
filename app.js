// app.js
(() => {
  "use strict";

  // Один endpoint HF Inference (SDXL)
  const HF_ENDPOINT =
    "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

  // DOM-элементы
  const apiKeyInput = document.getElementById("apiKey");
  const foodSelect = document.getElementById("Food type");
  const editSelect = document.getElementById("Edit");
  const photoInput = document.getElementById("photoInput");
  const generateBtn = document.getElementById("generateBtn");
  const outputArea = document.getElementById("outputArea");

  // Строим промпт под выбранный режим
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

    // Style
    return (
      base +
      ", modern editorial style, subtle color grading, perfect for a sales landing page hero banner"
    );
  }

  // Лоадер
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

  // Ошибка
  function showError(message) {
    outputArea.innerHTML = "";
    const errorText = document.createElement("div");
    errorText.className = "status-main error";
    errorText.textContent = message;
    outputArea.appendChild(errorText);
  }

  // Показать картинку
  function showImage(imageBlob, alt) {
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

  // Вызов HF Inference (SDXL)
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
      let detail = "";
      try {
        detail = await response.text();
      } catch {
        // ignore
      }

      const shortDetail =
        detail && detail.length > 300 ? `${detail.slice(0, 300)}…` : detail;

      const msgParts = [
        `HF Inference error: ${response.status} ${response.statusText}.`,
        shortDetail && `Details: ${shortDetail}`
      ].filter(Boolean);

      throw new Error(msgParts.join(" "));
    }

    return await response.blob();
  }

  // Обработчик кнопки
  async function handleGenerateClick() {
    const apiKey = apiKeyInput.value.trim();
    const food = foodSelect.value;
    const editType = editSelect.value;
    const photoFile = photoInput.files && photoInput.files[0];

    if (!apiKey) {
      showError("Please paste your Hugging Face API key before generating.");
      return;
    }

    // Фото пока никак не отправляем, это просто шаг UX для будущего image-to-image
    if (photoFile) {
      console.info(
        "[Food Image Enhancer] Photo selected, but current MVP uses text prompt only (no img2img)."
      );
    }

    const prompt = buildPrompt(food, editType);

    showLoading();
    generateBtn.disabled = true;
    const originalLabel = generateBtn.textContent;
    generateBtn.textContent = "Creating…";

    try {
      const imageBlob = await generateImage(apiKey, prompt);
      showImage(
        imageBlob,
        `Generated ${food} image (${editType}) with SDXL. Prompt: ${prompt}`
      );
    } catch (err) {
      console.error(err);
      showError(
        err && err.message
          ? err.message
          : "Something went wrong while generating the image."
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

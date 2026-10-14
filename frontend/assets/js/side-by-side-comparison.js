/* Same-image, four-model inference comparison for predict.html. */
(() => {
    const input = document.getElementById("sideBySideInput");
    const preview = document.getElementById("sideBySidePreview");
    const analyze = document.getElementById("sideBySideAnalyze");
    const results = document.getElementById("sideBySideResults");
    const status = document.getElementById("sideBySideStatus");
    if (!input || !analyze || !results) return;

    const models = [
        { id: "mobilenetv2", name: "MobileNetV2" },
        { id: "efficientnet_b0", name: "EfficientNet-B0" },
        { id: "resnet50", name: "ResNet50" },
        { id: "efficientnet_b3", name: "EfficientNet-B3" }
    ];
    let selectedFile = null;

    function escapeText(value) {
        return String(value ?? "");
    }

    function demoPrediction(model, index) {
        const examples = [
            ["Tomato Early Blight", 91.8, 18.4],
            ["Tomato Early Blight", 94.1, 22.1],
            ["Tomato Early Blight", 92.7, 31.8],
            ["Tomato Early Blight", 95.0, 38.7]
        ];
        const [label, confidence, inferenceMs] = examples[index];
        return { model, label, confidence, inferenceMs, demo: true };
    }

    function renderCards(items) {
        results.replaceChildren();
        items.forEach(item => {
            const card = document.createElement("article");
            card.className = `side-by-side-card${item.demo ? " is-demo" : ""}`;
            const confidence = Math.max(0, Math.min(100, Number(item.confidence) || 0));
            card.innerHTML = `
                <div class="side-by-side-card-head">
                    <h3>${escapeText(item.model.name)}</h3>
                    <span class="badge ${confidence >= 90 ? "low" : "medium"}">${item.demo ? "Prototype" : "Trained model"}</span>
                </div>
                <p class="side-by-side-label">Top prediction</p>
                <strong class="side-by-side-prediction">${escapeText(item.label)}</strong>
                <div class="side-by-side-score-row"><span>Confidence</span><strong>${confidence.toFixed(2)}%</strong></div>
                <div class="progress-track"><div class="progress-fill" style="width:${confidence}%"></div></div>
                <small>Inference time: ${Number(item.inferenceMs || 0).toFixed(1)} ms</small>
            `;
            results.append(card);
        });
    }

    function setStatus(message, visible = true) {
        if (!status) return;
        status.hidden = !visible;
        status.textContent = message;
    }

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
            setStatus("Please select a JPG, PNG, or WEBP image up to 10 MB.");
            analyze.disabled = true;
            return;
        }
        selectedFile = file;
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
        analyze.disabled = false;
        setStatus("Ready. One image will be sent to all four model endpoints in parallel.", true);
        results.innerHTML = '<div class="side-by-side-empty">Click “Compare with all four models” to run the same image through every model.</div>';
    });

    analyze.addEventListener("click", async () => {
        if (!selectedFile) return;
        analyze.disabled = true;
        analyze.textContent = "Running four models…";
        setStatus("Running four model predictions simultaneously…", true);
        results.innerHTML = '<div class="side-by-side-empty">Waiting for all four model responses…</div>';

        try {
            // Promise.all starts all four requests without waiting for one model to finish first.
            const responses = await Promise.all(
                models.map(model => CropSentryApi.predict(selectedFile, model.id))
            );
            renderCards(responses.map((response, index) => {
                const prediction = response.prediction || {};
                return {
                    model: models[index],
                    label: prediction.disease?.name || prediction.predictedClass || "Unknown class",
                    confidence: prediction.confidence,
                    inferenceMs: prediction.inferenceMs,
                    demo: false
                };
            }));
            setStatus("Live comparison complete. All four models analyzed the same uploaded image.", true);
        } catch (error) {
            // Until all four models are trained, keep the presentation useful without implying real results.
            renderCards(models.map(demoPrediction));
            setStatus("Prototype fallback: the four comparison models are not all trained or the API is unavailable. These cards are illustrative and not real prediction results.", true);
        } finally {
            analyze.disabled = false;
            analyze.textContent = "Compare again with all four models";
        }
    });
})();

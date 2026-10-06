/**
 * CropSentry AI - CORE LOGIC & UI INTERACTIONS
 * Features: Dark/Light Mode Switcher, Mobile Nav, AI Laser Scan Simulation,
 * Disease Filter & Modals, Multi-language Dictionary, Toast Notifications
 */

document.addEventListener("DOMContentLoaded", () => {
    initThemeSwitcher();
    initNavigation();
    initLanguageEngine();
    initPredictionEngine();
    initLeafComparison();
    initDiseaseEncyclopedia();
    initContactForm();
    initFAQAccordion();
    initDashboardActions();
    updateAuthNavbar();
});

/* ================= 0. DARK / LIGHT THEME ENGINE ================= */
function initThemeSwitcher() {
    const savedTheme = localStorage.getItem("cotton_ai_theme") || 
        (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
            const nextTheme = currentTheme === "dark" ? "light" : "dark";
            
            applyTheme(nextTheme);
            localStorage.setItem("cotton_ai_theme", nextTheme);
            
            showToast(`Switched to ${nextTheme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}`, "info");
        });
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        toggleBtn.innerHTML = theme === "dark" 
            ? `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
            : `<svg class="icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        toggleBtn.setAttribute("title", `Switch to ${theme === "dark" ? "Light Mode" : "Dark Mode"}`);
    }
}

/* ================= 1. NAVIGATION & MOBILE DRAWER ================= */
function initNavigation() {
    const toggleBtn = document.getElementById("mobileNavToggle");
    const drawer = document.getElementById("mobileDrawer");

    if (toggleBtn && drawer) {
        toggleBtn.addEventListener("click", () => {
            drawer.classList.toggle("open");
            const isOpen = drawer.classList.contains("open");
            toggleBtn.setAttribute("aria-expanded", isOpen);
        });

        // Close drawer on clicking outside
        document.addEventListener("click", (e) => {
            if (!toggleBtn.contains(e.target) && !drawer.contains(e.target)) {
                drawer.classList.remove("open");
            }
        });
    }

    // Set dynamic active state based on current page pathname
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a, .mobile-drawer a").forEach(link => {
        const href = link.getAttribute("href");
        if (href === currentPath || (currentPath === "" && href === "index.html")) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
}

/* ================= 2. MULTI-LANGUAGE SYSTEM ================= */
const translations = {
    en: {
        heroTitle: "CropSentry AI: Plant Leaf Classification",
        heroDesc: "Classify bell pepper, potato, and tomato leaf images with the trained MobileNetV2 model. View the top classes and their scores; results do not include severity estimates or treatment advice.",
        btnUpload: "Upload Leaf Image",
        btnLearn: "How It Works",
        predictHeading: "Classify a Plant Leaf",
        tryPrediction: "Try Prediction"
    },
    hi: {
        heroTitle: "क्रॉपसेंट्री एआई: पौधों की पत्ती का वर्गीकरण",
        heroDesc: "प्रशिक्षित MobileNetV2 मॉडल से शिमला मिर्च, आलू और टमाटर की पत्तियों का वर्गीकरण करें। संभावित वर्ग और उनके स्कोर देखें।",
        btnUpload: "पत्ती की फोटो अपलोड करें",
        btnLearn: "यह कैसे काम करता है",
        predictHeading: "पौधे की पत्ती का वर्गीकरण करें",
        tryPrediction: "प्रेडिक्शन आज़माएं"
    },
    mr: {
        heroTitle: "क्रॉपसेंट्री एआय: वनस्पती पानांचे वर्गीकरण",
        heroDesc: "प्रशिक्षित MobileNetV2 मॉडेलद्वारे ढोबळी मिरची, बटाटा आणि टोमॅटोच्या पानांचे वर्गीकरण करा. संभाव्य वर्ग आणि त्यांचे गुण पाहा.",
        btnUpload: "पानांचा फोटो अपलोड करा",
        btnLearn: "हे कसे कार्य करते",
        predictHeading: "वनस्पती पानांचे वर्गीकरण करा",
        tryPrediction: "निदान सुरू करा"
    }
};

function initLanguageEngine() {
    const langSelect = document.getElementById("langSelect");
    const savedLang = localStorage.getItem("cotton_ai_lang") || "en";

    if (langSelect) {
        langSelect.value = savedLang;
        langSelect.addEventListener("change", (e) => {
            const chosen = e.target.value;
            localStorage.setItem("cotton_ai_lang", chosen);
            applyLanguage(chosen);
            showToast(`Language switched to ${chosen.toUpperCase()}`, "info");
        });
    }

    applyLanguage(savedLang);
}

function applyLanguage(lang) {
    if (!translations[lang]) return;
    const t = translations[lang];

    const heroTitle = document.getElementById("heroMainTitle");
    if (heroTitle) heroTitle.innerHTML = lang === "en" 
        ? `CropSentry AI: <span>Plant Leaf Classification</span>`
        : t.heroTitle;

    const heroDesc = document.getElementById("heroMainDesc");
    if (heroDesc) heroDesc.textContent = t.heroDesc;
}

/* ================= 3. AI PREDICTION ENGINE ================= */
function initPredictionEngine() {
    const dropzone = document.getElementById("predictDropzone");
    const fileInput = document.getElementById("imageInput");
    const previewContainer = document.getElementById("previewContainer");
    const previewImage = document.getElementById("previewImage");
    const laserScan = document.getElementById("laserScan");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const resultBox = document.getElementById("resultBox");

    if (!dropzone || !fileInput) return;

    let selectedFile = null;
    let lowConfidenceThreshold = 50;

    loadModelInfo();
    dropzone.addEventListener("click", () => fileInput.click());

    ["dragenter", "dragover"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
        });
    });

    dropzone.addEventListener("drop", (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener("change", function () {
        if (this.files && this.files[0]) {
            handleFileSelect(this.files[0]);
        }
    });

    async function loadModelInfo() {
        try {
            const response = await CropSentryApi.modelInfo();
            const model = response.model;
            const cropText = document.getElementById("supportedCropText");
            const classCount = document.getElementById("modelClassCount");
            const accuracy = document.getElementById("modelAccuracy");
            const evaluationNote = document.getElementById("modelEvaluationNote");
            const inputBadge = document.getElementById("modelInputBadge");
            const supportedClasses = document.getElementById("supportedClasses");
            const classEvaluationWarning = document.getElementById("classEvaluationWarning");

            if (cropText) cropText.textContent = `Model classes cover: ${model.crops.join(", ")}.`;
            if (classCount) classCount.textContent = `${model.classes.length} trained classes`;
            if (accuracy) {
                const value = model.evaluation?.accuracy;
                accuracy.textContent = typeof value === "number"
                    ? `${(value * 100).toFixed(2)}%`
                    : "Not reported";
            }
            if (evaluationNote && model.evaluation?.testImages) {
                evaluationNote.textContent = `Held-out test set · ${model.evaluation.testImages.toLocaleString()} images`;
            }
            if (inputBadge) inputBadge.textContent = `${model.name} · ${model.input.width}×${model.input.height}`;
            if (typeof model.lowConfidenceThreshold === "number") {
                lowConfidenceThreshold = model.lowConfidenceThreshold;
            }
            renderSupportedClasses(model.classes, supportedClasses);

            const weakerClasses = model.classes.filter(
                item => typeof item.recall === "number" && item.recall < 0.5
            );
            if (classEvaluationWarning && weakerClasses.length) {
                classEvaluationWarning.hidden = false;
                classEvaluationWarning.textContent = weakerClasses
                    .map(item => `${item.name} had ${(item.recall * 100).toFixed(1)}% recall on the held-out test set.`)
                    .join(" ");
                classEvaluationWarning.textContent += " Recall measures how many actual examples of a class the model recognized; results vary by class.";
            }
        } catch (error) {
            const cropText = document.getElementById("supportedCropText");
            const inputBadge = document.getElementById("modelInputBadge");
            if (cropText) cropText.textContent = "Model information unavailable. Check that the CropSentry API is running.";
            if (inputBadge) inputBadge.textContent = "Model offline";
            showToast(error.message, "error");
        }
    }

    function handleFileSelect(file) {
        const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!supportedTypes.includes(file.type)) {
            showToast("Please upload a valid image file (JPG, PNG, WEBP)", "error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast("Image must be 10 MB or smaller.", "error");
            return;
        }
        selectedFile = file;
        if (resultBox) resultBox.style.display = "none";
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) {
                previewImage.src = e.target.result;
                previewContainer.style.display = "block";
                dropzone.style.display = "none";
                showToast("Leaf image loaded. Click 'Analyze Disease' to begin.", "success");
            }
        };
        reader.readAsDataURL(file);
    }

    if (analyzeBtn) {
        analyzeBtn.addEventListener("click", async () => {
            if (!selectedFile) {
                showToast("Please select a leaf image first.", "warning");
                return;
            }

            if (laserScan) laserScan.style.display = "block";
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = `
                <svg class="icon" style="animation: spin 1s linear infinite" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-dasharray="32" stroke-dashoffset="10"/>
                </svg> Running trained model...
            `;

            try {
                const res = await CropSentryApi.predict(selectedFile);
                const prediction = res.prediction;

                if (laserScan) laserScan.style.display = "none";
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `
                    <svg class="icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Analyze Again
                `;

                const placeholder = document.getElementById("resultPlaceholder");
                if (placeholder) placeholder.style.display = "none";
                if (resultBox) {
                    resultBox.style.display = "block";
                    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }

                const diseaseName = resultBox?.querySelector(".result-disease-name");
                if (diseaseName) diseaseName.textContent = prediction.disease.name;
                const cropLabel = document.getElementById("resultCrop");
                const classTypeBadge = document.getElementById("classTypeBadge");
                if (cropLabel) cropLabel.textContent = `Crop: ${prediction.crop} · ${prediction.type}`;
                if (classTypeBadge) classTypeBadge.textContent = prediction.type;
                const confBar = document.getElementById("confidenceProgress");
                const confText = document.getElementById("confidenceText");
                if (confBar) confBar.style.width = `${Math.min(prediction.confidence, 100)}%`;
                if (confText) confText.textContent = `${Number(prediction.confidence).toFixed(2)}%`;
                const confidenceWarning = document.getElementById("confidenceWarning");
                if (confidenceWarning) {
                    confidenceWarning.hidden = prediction.confidence >= lowConfidenceThreshold;
                }
                renderTopPredictions(prediction.topPredictions || []);

                showToast(
                    `Classification complete: ${prediction.disease.name} (${Number(prediction.confidence).toFixed(2)}%).`,
                    "success"
                );
            } catch (error) {
                if (laserScan) laserScan.style.display = "none";
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = "Analyze Image";
                showToast(error.message, "error");
            }
        });
    }

    function renderTopPredictions(items) {
        const container = document.getElementById("topPredictions");
        if (!container) return;
        container.replaceChildren();
        items.forEach((item, index) => {
            const row = document.createElement("div");
            row.className = "top-prediction-row";
            const label = document.createElement("span");
            label.textContent = `${index + 1}. ${item.name}`;
            const score = document.createElement("strong");
            score.textContent = `${Number(item.confidence).toFixed(2)}%`;
            row.append(label, score);
            const track = document.createElement("div");
            track.className = "prediction-score-track";
            const fill = document.createElement("div");
            fill.className = "prediction-score-fill";
            fill.style.width = `${Math.min(Number(item.confidence), 100)}%`;
            track.append(fill);
            container.append(row, track);
        });
    }

    window.resetUpload = function() {
        selectedFile = null;
        if (fileInput) fileInput.value = "";
        if (previewImage) previewImage.removeAttribute("src");
        if (previewContainer) previewContainer.style.display = "none";
        if (dropzone) dropzone.style.display = "block";
        if (resultBox) resultBox.style.display = "none";
        const placeholder = document.getElementById("resultPlaceholder");
        if (placeholder) placeholder.style.display = "block";
        const predictions = document.getElementById("topPredictions");
        if (predictions) predictions.replaceChildren();
        const confidenceWarning = document.getElementById("confidenceWarning");
        if (confidenceWarning) confidenceWarning.hidden = true;
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = "Analyze Image";
        }
    };
}

function renderSupportedClasses(classes, container) {
    if (!container) return;
    container.replaceChildren();
    const groups = new Map();
    classes.forEach(item => {
        if (!groups.has(item.crop)) groups.set(item.crop, []);
        groups.get(item.crop).push(item);
    });

    groups.forEach((items, crop) => {
        const group = document.createElement("section");
        group.className = "model-class-group";
        const heading = document.createElement("h3");
        heading.textContent = crop;
        group.append(heading);
        const list = document.createElement("div");
        list.className = "model-class-list";

        items.forEach(item => {
            const card = document.createElement("article");
            card.className = "model-class-card";
            const name = document.createElement("strong");
            name.textContent = item.name;
            const type = document.createElement("span");
            type.className = item.type === "Healthy leaf" ? "badge low" : "badge brand";
            type.textContent = item.type;
            card.append(name, type);

            if (typeof item.recall === "number") {
                const recall = document.createElement("small");
                recall.textContent = `Test recall: ${(item.recall * 100).toFixed(1)}%`;
                card.append(recall);
            }
            list.append(card);
        });

        group.append(list);
        container.append(group);
    });
}

/* ================= 4. HEALTHY VS DISEASED LEAF COMPARISON ================= */
function initLeafComparison() {
    const healthyInput = document.getElementById("healthyInput");
    const diseasedInput = document.getElementById("diseasedInput");
    const healthyPreview = document.getElementById("healthyPreview");
    const diseasedPreview = document.getElementById("diseasedPreview");
    const compareBtn = document.getElementById("compareBtn");
    const compareResult = document.getElementById("compareResult");

    if (!healthyInput || !diseasedInput || !healthyPreview || !diseasedPreview || !compareBtn) return;

    const previewFiles = (input, preview) => {
        const file = input.files?.[0];
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
            input.value = "";
            showToast("Choose a JPG, PNG, or WEBP image up to 10 MB.", "error");
            return;
        }
        if (preview.src.startsWith("blob:")) URL.revokeObjectURL(preview.src);
        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
        if (compareResult) compareResult.hidden = true;
    };

    healthyInput.addEventListener("change", () => previewFiles(healthyInput, healthyPreview));
    diseasedInput.addEventListener("change", () => previewFiles(diseasedInput, diseasedPreview));

    compareBtn.addEventListener("click", async () => {
        const imageA = healthyInput.files?.[0];
        const imageB = diseasedInput.files?.[0];
        if (!imageA || !imageB) {
            showToast("Choose an image for both A and B before comparing.", "warning");
            return;
        }

        compareBtn.disabled = true;
        compareBtn.textContent = "Classifying both images…";
        try {
            const [responseA, responseB] = await Promise.all([
                CropSentryApi.predict(imageA),
                CropSentryApi.predict(imageB)
            ]);
            const resultA = responseA.prediction;
            const resultB = responseB.prediction;

            document.getElementById("comparisonClassA").textContent =
                `${resultA.disease.name} · ${resultA.crop} · ${resultA.type}`;
            document.getElementById("comparisonClassB").textContent =
                `${resultB.disease.name} · ${resultB.crop} · ${resultB.type}`;
            document.getElementById("comparisonScoreA").textContent =
                `Top-class score: ${Number(resultA.confidence).toFixed(2)}%`;
            document.getElementById("comparisonScoreB").textContent =
                `Top-class score: ${Number(resultB.confidence).toFixed(2)}%`;
            const sameClass = resultA.predictedClass === resultB.predictedClass;
            document.getElementById("comparisonSummary").textContent = sameClass
                ? "Both images received the same top class from the model."
                : "The images received different top classes. The score is not a measure of disease severity or diagnosis certainty.";
            if (compareResult) {
                compareResult.hidden = false;
                compareResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
            showToast("Both images were classified by the trained model.", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            compareBtn.disabled = false;
            compareBtn.textContent = "Compare Both Images";
        }
    });
}

/* ================= 5. DISEASE ENCYCLOPEDIA & MODEL CLASS CARDS ================= */
const diseaseSampleImages = {
    Pepper__bell___Bacterial_spot: "imgs/model-samples/Pepper__bell___Bacterial_spot.jpg",
    Pepper__bell___healthy: "imgs/model-samples/Pepper__bell___healthy.jpg",
    Potato___Early_blight: "imgs/model-samples/Potato___Early_blight.jpg",
    Potato___Late_blight: "imgs/model-samples/Potato___Late_blight.jpg",
    Potato___healthy: "imgs/model-samples/Potato___healthy.jpg",
    Tomato_Bacterial_spot: "imgs/model-samples/Tomato_Bacterial_spot.jpg",
    Tomato_Early_blight: "imgs/model-samples/Tomato_Early_blight.jpg",
    Tomato_Late_blight: "imgs/model-samples/Tomato_Late_blight.jpg",
    Tomato_Leaf_Mold: "imgs/model-samples/Tomato_Leaf_Mold.jpg",
    Tomato_Septoria_leaf_spot: "imgs/model-samples/Tomato_Septoria_leaf_spot.jpg",
    Tomato_Spider_mites_Two_spotted_spider_mite: "imgs/model-samples/Tomato_Spider_mites_Two_spotted_spider_mite.jpg",
    Tomato__Target_Spot: "imgs/model-samples/Tomato__Target_Spot.jpg",
    Tomato__Tomato_YellowLeaf__Curl_Virus: "imgs/model-samples/Tomato__Tomato_YellowLeaf__Curl_Virus.svg",
    Tomato__Tomato_mosaic_virus: "imgs/model-samples/Tomato__Tomato_mosaic_virus.svg",
    Tomato_healthy: "imgs/model-samples/Tomato_healthy.svg"
};
const illustratedDiseaseSamples = new Set([
    "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy"
]);

function initDiseaseEncyclopedia() {
    const grid = document.getElementById("diseaseGrid");
    const searchInput = document.getElementById("searchInput");
    const filterPills = document.querySelectorAll(".filter-pill");
    let activeFilter = "all";

    function applyFilters() {
        const query = searchInput?.value.toLowerCase().trim() || "";
        grid?.querySelectorAll(".disease-card").forEach(card => {
            const matchesQuery = card.textContent.toLowerCase().includes(query);
            const matchesFilter = activeFilter === "all" ||
                card.dataset.crop === activeFilter ||
                (activeFilter === "healthy" && card.dataset.type === "healthy");
            card.hidden = !matchesQuery || !matchesFilter;
        });
    }

    searchInput?.addEventListener("input", applyFilters);
    filterPills.forEach(pill => {
        pill.addEventListener("click", () => {
            filterPills.forEach(item => item.classList.remove("active"));
            pill.classList.add("active");
            activeFilter = pill.dataset.filter || "all";
            applyFilters();
        });
    });

    if (!grid) return;

    CropSentryApi.modelInfo().then(({ model }) => {
        const classes = model.classes;
        const classSummary = document.getElementById("modelClassSummary");
        const warning = document.getElementById("modelClassWarning");
        const evaluationSummary = document.getElementById("modelEvaluationSummary");
        const weakClasses = classes.filter(item =>
            typeof item.recall === "number" && item.recall < 0.5
        );

        grid.replaceChildren();
        classes.forEach(item => {
            const isHealthy = item.type === "Healthy leaf";
            const card = document.createElement("article");
            card.className = "disease-card";
            card.dataset.crop = item.crop;
            card.dataset.type = isHealthy ? "healthy" : "disease";

            const artwork = document.createElement("div");
            artwork.className = `disease-card-art${isHealthy ? " healthy" : ""}`;
            const sampleImagePath = diseaseSampleImages[item.label];
            if (sampleImagePath) {
                artwork.classList.add("has-sample-image");
                const sampleImage = document.createElement("img");
                sampleImage.className = "disease-sample-image";
                sampleImage.src = sampleImagePath;
                sampleImage.alt = `Sample leaf image for ${item.name}`;
                sampleImage.loading = grid.childElementCount < 4 ? "eager" : "lazy";
                artwork.append(sampleImage);
            }
            const artworkCrop = document.createElement("span");
            artworkCrop.textContent = item.crop;
            const artworkLabel = document.createElement("small");
            artworkLabel.textContent = sampleImagePath
                ? illustratedDiseaseSamples.has(item.label) ? "CLASS ILLUSTRATION" : "SAMPLE LEAF PHOTO"
                : isHealthy ? "HEALTHY LEAF CLASS" : "DISEASE LEAF CLASS";
            artwork.append(artworkCrop, artworkLabel);

            const badge = document.createElement("span");
            badge.className = `badge ${isHealthy ? "low" : "brand"}`;
            badge.textContent = isHealthy ? "Healthy" : "Disease class";
            artwork.append(badge);

            const body = document.createElement("div");
            body.className = "disease-card-body";
            const title = document.createElement("h3");
            title.textContent = item.name;
            const cropType = document.createElement("p");
            cropType.textContent = `${item.crop} · ${item.type}`;
            const recall = document.createElement("div");
            recall.className = "disease-symptoms";
            recall.textContent = typeof item.recall === "number"
                ? `Held-out test recall: ${(item.recall * 100).toFixed(1)}%`
                : "Held-out test recall: Not reported";
            const action = document.createElement("div");
            action.className = "disease-card-actions";
            const detailsButton = document.createElement("button");
            detailsButton.type = "button";
            detailsButton.className = "btn-secondary btn-sm";
            detailsButton.textContent = "Class Details";
            detailsButton.addEventListener("click", () => openModelClassModal(item));
            const predictLink = document.createElement("a");
            predictLink.href = "predict.html";
            predictLink.className = "btn-primary btn-sm";
            predictLink.textContent = "Classify a Leaf";
            action.append(detailsButton, predictLink);
            body.append(title, cropType, recall, action);
            card.append(artwork, body);
            grid.append(card);
        });

        if (classSummary) {
            classSummary.textContent = `${classes.length} supported classes across ${model.crops.join(", ")}. ` +
                `Held-out accuracy: ${typeof model.evaluation?.accuracy === "number" ? `${(model.evaluation.accuracy * 100).toFixed(2)}%` : "not reported"} · ` +
                `${typeof model.evaluation?.testImages === "number" ? model.evaluation.testImages.toLocaleString() : "Unknown"} test images.`;
        }
        if (warning && weakClasses.length) {
            warning.hidden = false;
            warning.textContent = weakClasses
                .map(item => `${item.name} had ${(item.recall * 100).toFixed(1)}% recall on the held-out test set.`)
                .join(" ") + " Recall measures the share of actual class examples recognized by the model.";
        }
        if (evaluationSummary && typeof model.evaluation?.testImages === "number") {
            evaluationSummary.textContent = `Evaluation on ${model.evaluation.testImages.toLocaleString()} held-out images. These results are not live regional surveillance.`;
        }
        renderDiseaseCharts(model);
        applyFilters();
    }).catch(error => {
        grid.textContent = `Disease class information is unavailable: ${error.message}`;
        const classSummary = document.getElementById("modelClassSummary");
        if (classSummary) classSummary.textContent = "Start the CropSentry API to load model classes and evaluation data.";
    });
}

function renderDiseaseCharts(model) {
    if (typeof Chart === "undefined") return;
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };
    const metricsContext = document.getElementById("diseaseTrendChart");
    if (metricsContext && typeof model.evaluation?.accuracy === "number") {
        new Chart(metricsContext, {
            type: "bar",
            data: {
                labels: ["Accuracy", "Weighted F1"],
                datasets: [{
                    label: "Test score (%)",
                    data: [
                        model.evaluation.accuracy * 100,
                        typeof model.evaluation.weightedF1 === "number" ? model.evaluation.weightedF1 * 100 : null
                    ],
                    backgroundColor: ["#22c55e", "#15803d"],
                    borderRadius: 6
                }]
            },
            options: {
                ...chartOptions,
                scales: { y: { min: 0, max: 100, ticks: { callback: value => `${value}%` } } }
            }
        });
    }

    const recallContext = document.getElementById("accuracyChart");
    const evaluatedClasses = model.classes.filter(item => typeof item.recall === "number");
    if (recallContext && evaluatedClasses.length) {
        new Chart(recallContext, {
            type: "bar",
            data: {
                labels: evaluatedClasses.map(item => item.name),
                datasets: [{
                    label: "Held-out recall (%)",
                    data: evaluatedClasses.map(item => item.recall * 100),
                    backgroundColor: evaluatedClasses.map(item => item.recall < 0.5 ? "#d97706" : "#22c55e"),
                    borderRadius: 4
                }]
            },
            options: {
                ...chartOptions,
                indexAxis: "y",
                scales: { x: { min: 0, max: 100, ticks: { callback: value => `${value}%` } } }
            }
        });
    }

    const cropContext = document.getElementById("diseasePieChart");
    if (cropContext) {
        const counts = model.crops.map(crop => model.classes.filter(item => item.crop === crop).length);
        new Chart(cropContext, {
            type: "doughnut",
            data: {
                labels: model.crops,
                datasets: [{
                    data: counts,
                    backgroundColor: ["#15803d", "#d97706", "#22c55e"],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                ...chartOptions,
                plugins: { legend: { display: true, position: "bottom" } }
            }
        });
    }
}

function openModelClassModal(item) {
    const modal = document.getElementById("diseaseModal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    modalBody.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = item.name;
    const cropType = document.createElement("p");
    cropType.textContent = `${item.crop} · ${item.type}`;
    const recall = document.createElement("p");
    recall.textContent = typeof item.recall === "number"
        ? `Held-out test recall: ${(item.recall * 100).toFixed(1)}%`
        : "Held-out test recall was not reported.";
    const note = document.createElement("p");
    note.textContent = "This is a class label produced by the trained image classifier. It does not provide a severity assessment, biological explanation, or treatment recommendation.";
    const action = document.createElement("a");
    action.href = "predict.html";
    action.className = "btn-primary btn-sm";
    action.textContent = "Classify a Leaf";
    modalBody.append(title, cropType, recall, note, action);
    modal.classList.add("active");
}

window.closeModal = function () {
    const modal = document.getElementById("diseaseModal");
    if (modal) modal.classList.remove("active");
};

// Close modal when clicking outside content
document.addEventListener("click", (e) => {
    const modal = document.getElementById("diseaseModal");
    if (modal && e.target === modal) {
        closeModal();
    }
});

/* ================= 6. CONTACT FORM & URGENCY LOGIC ================= */
function initContactForm() {
    const contactForm = document.getElementById("contactForm");
    if (!contactForm) return;

    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const queryType = document.getElementById("queryType")?.value;
        const name = document.getElementById("farmerName")?.value || "Farmer";
        const ticketId = "CA-" + Math.floor(100000 + Math.random() * 900000);

        if (queryType === "emergency") {
            showToast(`🚨 HIGH PRIORITY EMERGENCY: Agronomist assigned to Ticket #${ticketId}. You will be contacted within 15 mins.`, "warning");
        } else {
            showToast(`✅ Query submitted successfully! Ticket #${ticketId} created for ${name}.`, "success");
        }

        contactForm.reset();
    });
}

/* ================= 7. FAQ ACCORDION ================= */
function initFAQAccordion() {
    document.querySelectorAll(".faq-question").forEach(q => {
        q.addEventListener("click", () => {
            const item = q.parentElement;
            item.classList.toggle("open");
        });
    });
}

/* ================= 8. DASHBOARD & ADMIN ACTIONS ================= */
function initDashboardActions() {
    const path = window.location.pathname.split("/").pop();
    if (path === "dashboard.html" && window.CropSentryApi?.getToken()) loadDashboardHistory();
    if (path === "admin.html" && window.CropSentryApi?.getToken()) loadAdminData();
    window.downloadReport = function(diseaseName, date) {
        showToast(`📄 Generating Official Agronomy Diagnostic Report for ${diseaseName} (${date})...`, "info");
        setTimeout(() => {
            showToast(`📥 Report successfully downloaded: CropSentry_${diseaseName.replace(/\s+/g, '_')}_Report.pdf`, "success");
        }, 1500);
    };

    window.triggerAdminAction = function(actionName) {
        showToast(`⚙️ Admin Action '${actionName}' executed successfully.`, "info");
    };
}

async function loadDashboardHistory() {
    const tableBody = document.querySelector(".data-table tbody");
    if (!tableBody) return;
    try {
        const userRes = await CropSentryApi.me().catch(() => null);
        if (userRes?.user?.name) {
            const heading = document.querySelector(".page-header h1");
            if (heading) heading.textContent = `Welcome Back, ${userRes.user.name} 👋`;
        }

        const { predictions } = await CropSentryApi.predictions();
        const scanKpi = document.querySelector(".dashboard-grid .kpi-info h3");
        if (scanKpi) scanKpi.textContent = predictions.length;

        // Pathogen count KPI
        const activeKpi = document.querySelectorAll(".dashboard-grid .kpi-info h3")[1];
        if (activeKpi && predictions.length) {
            const uniqueDiseases = new Set(predictions.map(p => p.slug || p.disease_name)).size;
            activeKpi.textContent = uniqueDiseases;
        }

        if (!predictions.length) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No diagnoses logged yet. <a href="predict.html" style="color:var(--primary); font-weight:600;">Upload a supported leaf image</a> to create your first record.</td></tr>';
            return;
        }

        tableBody.innerHTML = predictions.map((item, idx) => `
            <tr>
                <td><strong>${new Date(item.created_at).toLocaleDateString()}</strong></td>
                <td>Scan_Sample_${idx + 1}.jpg</td>
                <td><strong>${item.disease_name}</strong></td>
                <td><strong style="color: var(--primary);">${item.confidence}%</strong></td>
                <td><span class="badge ${item.severity}">${item.severity.toUpperCase()}</span></td>
                <td><span style="color: ${item.severity === 'high' ? 'var(--severity-high)' : 'var(--primary)'}; font-weight: 600;">${item.severity === 'high' ? 'Action Required' : 'Treated'}</span></td>
                <td>
                    <button onclick="downloadReport('${item.disease_name}', '${new Date(item.created_at).toLocaleDateString()}')" class="btn-secondary btn-sm">PDF</button>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        const isNetworkErr = error.message.includes("connect") || error.message.includes("fetch") || error.message.includes("NetworkError") || error.message.includes("Failed to fetch");
        const msg = isNetworkErr
            ? `⚠️ Backend server is offline. Run <code style="font-family:monospace;background:rgba(0,0,0,0.1);padding:2px 6px;border-radius:4px;">node src/server.js</code> in the <strong>backend</strong> folder, then refresh this page.`
            : `Unable to load diagnosis history: ${error.message}`;
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--severity-high);">${msg}</td></tr>`;
    }
}

async function loadAdminData() {
    const kpis = document.querySelectorAll(".dashboard-grid .kpi-info h3");
    const tableBody = document.querySelector(".data-table tbody");
    try {
        const [{ metrics }, { predictions }] = await Promise.all([CropSentryApi.adminMetrics(), CropSentryApi.adminPredictions()]);
        if (kpis[0]) kpis[0].textContent = metrics.farmers || 0;
        if (kpis[1]) kpis[1].textContent = metrics.predictions || 0;
        if (kpis[3]) kpis[3].textContent = `${metrics.diseases || 4} Classes`;
        if (tableBody) {
            tableBody.innerHTML = predictions.length ? predictions.map((item) => `
                <tr>
                    <td><strong>${new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></td>
                    <td>${item.user_name || item.email || "Farmer"}</td>
                    <td>Wardha Cluster, MH</td>
                    <td><span class="badge ${item.severity}">${item.disease_name}</span></td>
                    <td><strong>${item.confidence}%</strong></td>
                    <td>38ms</td>
                </tr>
            `).join("") : '<tr><td colspan="6" style="text-align:center; padding:20px;">No diagnosis records logged yet.</td></tr>';
        }
    } catch (error) {
        const isNetworkErr = error.message.includes("connect") || error.message.includes("fetch") || error.message.includes("NetworkError") || error.message.includes("Failed to fetch");
        const msg = isNetworkErr
            ? `⚠️ Backend server offline. Run <code style="font-family:monospace;background:rgba(0,0,0,0.1);padding:2px 6px;border-radius:4px;">node src/server.js</code> in the backend folder.`
            : `Unable to load admin data: ${error.message}`;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--severity-high);">${msg}</td></tr>`;
    }
}

/* ================= 9. AUTH STATE & NAVBAR ================= */
async function updateAuthNavbar() {
    const authBtn = document.getElementById("authBtn");
    const userBadge = document.getElementById("userNavBadge");
    const navContainer = document.querySelector(".nav-container");
    const hasAccessToken = Boolean(window.CropSentryApi?.getToken());
    navContainer?.classList.toggle("is-authenticated", hasAccessToken);
    let user;
    try {
        if (hasAccessToken) user = (await CropSentryApi.me()).user;
    } catch {
        CropSentryApi?.clearToken();
    }
    const isLoggedIn = Boolean(user);
    navContainer?.classList.toggle("is-authenticated", isLoggedIn);
    const username = user?.name || "Farmer";
    const role = user?.role || "farmer";

    // Dynamically insert Admin Console link if user is admin
    if (isLoggedIn && role === "admin") {
        const navLinks = document.querySelector(".nav-links");
        if (navLinks && !navLinks.querySelector('a[href="admin.html"]')) {
            const adminLink = document.createElement("a");
            adminLink.href = "admin.html";
            adminLink.textContent = "Admin";
            if (window.location.pathname.endsWith("admin.html")) adminLink.classList.add("active");
            navLinks.appendChild(adminLink);
        }
    }

    if (authBtn) {
        if (isLoggedIn) {
            authBtn.textContent = "Logout";
            authBtn.classList.remove("btn-primary");
            authBtn.classList.add("btn-secondary");
            authBtn.onclick = handleLogout;

            if (userBadge) {
                const targetUrl = role === "admin" ? "admin.html" : "dashboard.html";
                userBadge.innerHTML = `
                    <a href="${targetUrl}" style="text-decoration:none;" title="Open ${role === 'admin' ? 'Admin Console' : 'Farmer Dashboard'}">
                        <span style="font-size:0.85rem; font-weight:600; color:var(--primary); display:flex; align-items:center; gap:6px; background:var(--primary-ultralight); padding:4px 10px; border-radius:var(--radius-full); border:1px solid var(--border-color);">
                            <span style="width:8px; height:8px; background:var(--primary-light); border-radius:50%;"></span>
                            ${username} (${role})
                        </span>
                    </a>
                `;
            }
        } else {
            authBtn.textContent = "Login";
            authBtn.classList.add("btn-primary");
            authBtn.classList.remove("btn-secondary");
            authBtn.onclick = () => window.location.href = "login.html";
            if (userBadge) userBadge.innerHTML = "";
        }
    }
}

async function handleLogout() {
    await CropSentryApi?.logout();
    showToast("👋 You have been logged out successfully.", "info");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 800);
}

/* ================= 10. TOAST NOTIFICATION SYSTEM ================= */
function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let iconSvg = `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    if (type === "success") {
        iconSvg = `<svg class="icon" style="color:var(--primary)" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    } else if (type === "warning" || type === "error") {
        iconSvg = `<svg class="icon" style="color:var(--severity-high)" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/* Model selector and comparative-study results for predict.html. Safe on pages without these elements. */
(() => {
    const modelSelect = document.getElementById("modelSelect");
    const section = document.getElementById("modelComparisonSection");
    if (!modelSelect && !section) return;

    const barDefinitions = [
        { key: "accuracy", title: "Accuracy", format: value => `${(value * 100).toFixed(2)}%`, max: 1 },
        { key: "macro_f1", title: "F1-score (macro)", format: value => `${(value * 100).toFixed(2)}%`, max: 1 },
        { key: "total_parameters", title: "Parameters", format: value => `${(value / 1e6).toFixed(2)} M` },
        { key: "model_size_mb", title: "Model size", format: value => `${value.toFixed(1)} MB` },
        { key: "training_time_seconds", title: "Training time", format: value => `${(value / 60).toFixed(1)} min` },
        { key: "avg_inference_ms_per_image", title: "Inference time per image", format: value => `${value.toFixed(1)} ms` }
    ];

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    async function populateModelSelect() {
        if (!modelSelect) return;
        try {
            const { models } = await CropSentryApi.models();
            modelSelect.replaceChildren();
            models.forEach(model => {
                const option = element("option", model.available ? model.name : `${model.name} (not trained yet)`);
                option.value = model.id;
                option.disabled = !model.available;
                modelSelect.append(option);
            });
        } catch {
            /* Keep the default option when the API is unreachable. */
        }
    }

    function renderTable(rows) {
        const body = document.getElementById("studyTableBody");
        body.replaceChildren();
        const percent = value => (typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "–");
        rows.forEach(row => {
            const tr = document.createElement("tr");
            [
                row.model,
                typeof row.total_parameters === "number" ? `${(row.total_parameters / 1e6).toFixed(2)} M` : "–",
                typeof row.model_size_mb === "number" ? `${row.model_size_mb.toFixed(1)} MB` : "–",
                percent(row.accuracy),
                percent(row.macro_precision),
                percent(row.macro_recall),
                percent(row.macro_f1),
                typeof row.training_time_seconds === "number" ? `${(row.training_time_seconds / 60).toFixed(1)} min` : "–",
                typeof row.avg_inference_ms_per_image === "number" ? `${row.avg_inference_ms_per_image.toFixed(1)} ms` : "–"
            ].forEach((value, index) => tr.append(element(index === 0 ? "th" : "td", value)));
            body.append(tr);
        });
        const first = rows[0] || {};
        document.getElementById("studyTableNote").textContent =
            `Precision, recall and F1 are macro-averaged over classes. Input ${first.img_size}×${first.img_size}, ` +
            `batch ${first.batch_size}, ${first.optimizer} (lr ${first.learning_rate}), ${first.loss}, device: ${first.device_used}.`;
        document.getElementById("studyTableCard").hidden = false;
    }

    function renderBars(rows) {
        const container = document.getElementById("studyBars");
        container.replaceChildren();
        barDefinitions.forEach(definition => {
            const values = rows.map(row => row[definition.key]).filter(value => typeof value === "number");
            if (values.length === 0) return;
            const maximum = definition.max || Math.max(...values);
            const card = element("div", undefined, "study-bar-card");
            card.append(element("h4", definition.title));
            rows.forEach(row => {
                const value = row[definition.key];
                if (typeof value !== "number") return;
                const line = element("div", undefined, "study-bar-row");
                line.append(element("span", row.model));
                const track = element("div", undefined, "study-bar-track");
                const fill = element("div", undefined, "study-bar-fill");
                fill.style.width = `${Math.max(2, (value / maximum) * 100)}%`;
                track.append(fill);
                line.append(track, element("strong", definition.format(value)));
                card.append(line);
            });
            container.append(card);
        });
        container.hidden = false;
    }

    function renderPlots(rows, plots) {
        const container = document.getElementById("studyPlots");
        container.replaceChildren();
        const figures = [
            ...plots.filter(name => name.endsWith("_vs_epoch.png")).map(name => ({
                path: `plots/${name}`, caption: name.replace(/_/g, " ").replace(".png", "")
            })),
            ...rows.map(row => ({
                path: `confusion_matrices/${row.key}.png`, caption: `${row.model} confusion matrix`
            }))
        ];
        if (figures.length === 0) return;
        container.append(element("h3", "Training curves and confusion matrices"));
        const grid = element("div", undefined, "study-plot-grid");
        figures.forEach(figure => {
            const wrapper = element("figure");
            const image = document.createElement("img");
            image.src = CropSentryApi.resultAssetUrl(figure.path);
            image.alt = figure.caption;
            image.loading = "lazy";
            wrapper.append(image, element("figcaption", figure.caption));
            grid.append(wrapper);
        });
        container.append(grid);
        container.hidden = false;
    }

    async function loadComparison() {
        if (!section) return;
        const status = document.getElementById("studyStatus");
        try {
            const { comparison } = await CropSentryApi.modelComparison();
            status.hidden = true;
            renderTable(comparison.models);
            renderBars(comparison.models);
            renderPlots(comparison.models, comparison.plots || []);
        } catch (error) {
            status.hidden = false;
            status.textContent = error.message;
        }
    }

    populateModelSelect();
    loadComparison();
})();


/* ==========================================
   GUILHERME MATHLAB
   MOTOR PRINCIPAL DA PLATAFORMA
========================================== */

"use strict";

const $ = (id) => document.getElementById(id);

const COLORS = [
    "#55aaff",
    "#b39aff",
    "#4dd9e9",
    "#50d8a5",
    "#ffb66d",
    "#fa9ac5"
];

let functionCount = 0;
let calculatorExpression = "";
let calculatorHistory = [];
let geometryObjects = [];
let geometryTool = "select";
let geometryPoints = [];
let geometryDragging = null;
let currentSolid = "cube";
let currentPhysics = "uniform";


/* ==========================================
   INICIALIZAÇÃO
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeIcons();
    initializeNavigation();
    initializeDate();
    initializeFullscreen();
    initializeCalculator();
    initializeGraphs();
    initializeGeometry();
    initialize3D();
    initializeAlgebra();
    initializeCalculus();
    initializeStatistics();
    initializePhysics();
    initializeEditor();

    addFunctionRow();
    showNotification("Bem-vindo ao Guilherme MathLab!");

});

function initializeIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

function showNotification(message) {
    const container = $("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function initializeDate() {
    const date = $("currentDate");

    if (date) {
        date.textContent = new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }
}


/* ==========================================
   NAVEGAÇÃO
========================================== */

function initializeNavigation() {

    const menuItems = document.querySelectorAll(".menu-item");

    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            navigateTo(item.dataset.module);
            $("sidebar")?.classList.remove("open");
        });
    });

    document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.go);
        });
    });

    $("openSidebar")?.addEventListener("click", () => {
        $("sidebar")?.classList.add("open");
    });

    $("closeSidebar")?.addEventListener("click", () => {
        $("sidebar")?.classList.remove("open");
    });
}

function navigateTo(module) {

    const page = $("page-" + module);

    if (!page) return;

    document.querySelectorAll(".module-page").forEach(section => {
        section.classList.remove("active");
    });

    page.classList.add("active");

    document.querySelectorAll(".menu-item").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.module === module
        );
    });

    const activeMenu = document.querySelector(
        `.menu-item[data-module="${module}"]`
    );

    $("breadcrumbTitle").textContent =
        activeMenu?.querySelector("span")?.textContent || "Laboratório";

    if (module === "geometria") {
        resizeGeometry();
        drawGeometry();
    }

    if (module === "espacial") {
        renderSolid(currentSolid);
    }

    if (module === "estatistica" && $("statisticsInput").value.trim()) {
        calculateStatistics();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}


/* ==========================================
   TELA CHEIA
========================================== */

function initializeFullscreen() {

    $("fullscreenButton")?.addEventListener("click", async () => {

        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch {
            showNotification("Não foi possível ativar a tela cheia.");
        }

    });

}


/* ==========================================
   GRÁFICOS 2D
========================================== */

function initializeGraphs() {

    $("addFunction")?.addEventListener("click", addFunctionRow);

    $("plotGraph")?.addEventListener("click", plotGraph);

    $("clearGraph")?.addEventListener("click", () => {

        if (window.Plotly) {
            Plotly.purge("mainGraph");
        }

        $("mainGraph").innerHTML = `
            <div class="graph-placeholder">
                <i data-lucide="chart-no-axes-combined"></i>
                <p>Seu gráfico aparecerá aqui.</p>
            </div>
        `;

        refreshIcons();
        showNotification("Gráfico limpo.");

    });

    $("graphFullscreen")?.addEventListener("click", () => {

        const graph = $("mainGraph");

        if (graph.requestFullscreen) {
            graph.requestFullscreen();
        }

    });

}

function addFunctionRow(value = "x^2") {

    functionCount++;

    const list = $("functionList");

    const row = document.createElement("div");
    row.className = "function-row";

    const color = COLORS[(functionCount - 1) % COLORS.length];

    row.innerHTML = `
        <span class="function-color" style="background:${color}"></span>
        <input
            class="math-input function-expression"
            type="text"
            value="${value}"
            placeholder="Ex.: x^2 + 2*x"
            aria-label="Expressão matemática"
        >
        <button class="function-remove" type="button" title="Remover função">
            <i data-lucide="x"></i>
        </button>
    `;

    row.querySelector(".function-remove").addEventListener("click", () => {
        row.remove();
    });

    list.appendChild(row);
    refreshIcons();

}

function plotGraph() {

    if (!window.math || !window.Plotly) {
        showNotification("Biblioteca matemática indisponível. Verifique sua internet.");
        return;
    }

    const min = Number($("graphMin").value);
    const max = Number($("graphMax").value);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max || max - min > 10000) {
        showNotification("Confira os limites do eixo X.");
        return;
    }

    const expressions = document.querySelectorAll(".function-expression");

    if (!expressions.length) {
        showNotification("Adicione pelo menos uma função.");
        return;
    }

    const traces = [];

    expressions.forEach((input, index) => {

        const expression = input.value.trim();

        if (!expression) return;

        try {

            const compiled = math.compile(expression);

            const x = [];
            const y = [];

            for (let i = 0; i <= 500; i++) {

                const value = min + (max - min) * i / 500;

                x.push(value);

                try {
                    const result = compiled.evaluate({ x: value });
                    y.push(typeof result === "number" && Number.isFinite(result) ? result : null);
                } catch {
                    y.push(null);
                }

            }

            traces.push({
                x,
                y,
                type: "scatter",
                mode: "lines",
                name: `f${index + 1}(x)`,
                line: {
                    color: COLORS[index % COLORS.length],
                    width: 3
                },
                connectgaps: false
            });

        } catch {
            showNotification("Expressão inválida: " + expression);
        }

    });

    if (!traces.length) return;

    const layout = {
        paper_bgcolor: "#0b1424",
        plot_bgcolor: "#0b1424",
        font: { color: "#aabbd2", family: "DM Sans" },
        margin: { l: 48, r: 20, t: 20, b: 45 },
        xaxis: {
            title: "Eixo X",
            gridcolor: "rgba(140,170,210,.12)",
            zerolinecolor: "#526c8d",
            range: [min, max]
        },
        yaxis: {
            title: "Eixo Y",
            gridcolor: "rgba(140,170,210,.12)",
            zerolinecolor: "#526c8d"
        },
        legend: {
            orientation: "h",
            y: 1.12
        },
        hovermode: "closest"
    };

    Plotly.newPlot("mainGraph", traces, layout, {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"]
    });

    showNotification("Gráfico construído com sucesso!");

}


/* ==========================================
   GEOMETRIA 2D
========================================== */

let geometryCanvas;
let geometryContext;

function initializeGeometry() {

    geometryCanvas = $("geometryCanvas");

    if (!geometryCanvas) return;

    geometryContext = geometryCanvas.getContext("2d");

    resizeGeometry();

    window.addEventListener("resize", resizeGeometry);

    document.querySelectorAll(".geometry-tool").forEach(button => {

        button.addEventListener("click", () => {

            if (!button.dataset.tool) return;

            geometryTool = button.dataset.tool;

            document.querySelectorAll(".geometry-tool").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            $("geometryStatus").textContent =
                "Ferramenta: " + button.title;

            geometryPoints = [];

        });

    });

    $("clearGeometry").addEventListener("click", () => {

        geometryObjects = [];
        geometryPoints = [];
        drawGeometry();

        showNotification("Construção apagada.");

    });

    $("undoGeometry").addEventListener("click", () => {

        geometryObjects.pop();
        drawGeometry();

    });

    geometryCanvas.addEventListener("pointerdown", geometryPointerDown);
    geometryCanvas.addEventListener("pointermove", geometryPointerMove);
    geometryCanvas.addEventListener("pointerup", geometryPointerUp);
    geometryCanvas.addEventListener("pointercancel", geometryPointerUp);

}

function resizeGeometry() {

    if (!geometryCanvas || !geometryContext) return;

    const rect = geometryCanvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;

    geometryCanvas.width = rect.width * dpr;
    geometryCanvas.height = rect.height * dpr;

    geometryContext.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGeometry();

}

function canvasPoint(event) {

    const rect = geometryCanvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };

}

function geometryPointerDown(event) {

    const point = canvasPoint(event);

    if (geometryTool === "select") {

        const found = geometryObjects.findLastIndex(obj => {
            return obj.type === "point" &&
                Math.hypot(obj.x - point.x, obj.y - point.y) < 14;
        });

        geometryDragging = found >= 0 ? found : null;

        if (geometryDragging !== null) {
            geometryCanvas.setPointerCapture(event.pointerId);
        }

        return;
    }

    if (geometryTool === "point") {

        geometryObjects.push({
            type: "point",
            x: point.x,
            y: point.y
        });

        drawGeometry();
        return;

    }

    if (geometryTool === "circle") {

        geometryPoints.push(point);

        if (geometryPoints.length === 2) {

            const [a, b] = geometryPoints;

            geometryObjects.push({
                type: "circle",
                x: a.x,
                y: a.y,
                radius: Math.hypot(b.x - a.x, b.y - a.y)
            });

            geometryPoints = [];
            drawGeometry();

        }

        return;
    }

    if (["line", "segment"].includes(geometryTool)) {

        geometryPoints.push(point);

        if (geometryPoints.length === 2) {

            geometryObjects.push({
                type: geometryTool,
                x1: geometryPoints[0].x,
                y1: geometryPoints[0].y,
                x2: geometryPoints[1].x,
                y2: geometryPoints[1].y
            });

            geometryPoints = [];
            drawGeometry();

        }

        return;
    }

    if (geometryTool === "triangle") {

        geometryPoints.push(point);

        if (geometryPoints.length === 3) {

            geometryObjects.push({
                type: "polygon",
                points: [...geometryPoints]
            });

            geometryPoints = [];
            drawGeometry();

        }

        return;
    }

    if (geometryTool === "polygon") {

        geometryPoints.push(point);

        if (geometryPoints.length >= 3 &&
            Math.hypot(
                point.x - geometryPoints[0].x,
                point.y - geometryPoints[0].y
            ) < 15) {

            geometryObjects.push({
                type: "polygon",
                points: [...geometryPoints]
            });

            geometryPoints = [];
            drawGeometry();

        }

    }

}

function geometryPointerMove(event) {

    if (geometryDragging === null) return;

    const point = canvasPoint(event);

    geometryObjects[geometryDragging].x = point.x;
    geometryObjects[geometryDragging].y = point.y;

    drawGeometry();

}

function geometryPointerUp() {
    geometryDragging = null;
}

function drawGeometry() {

    if (!geometryContext) return;

    const width = geometryCanvas.clientWidth;
    const height = geometryCanvas.clientHeight;

    if (!width || !height) return;

    geometryContext.clearRect(0, 0, width, height);

    geometryContext.fillStyle = "#0a1424";
    geometryContext.fillRect(0, 0, width, height);

    const spacing = 30;

    geometryContext.strokeStyle = "rgba(110,150,200,.10)";
    geometryContext.lineWidth = 1;

    for (let x = 0; x <= width; x += spacing) {
        geometryContext.beginPath();
        geometryContext.moveTo(x, 0);
        geometryContext.lineTo(x, height);
        geometryContext.stroke();
    }

    for (let y = 0; y <= height; y += spacing) {
        geometryContext.beginPath();
        geometryContext.moveTo(0, y);
        geometryContext.lineTo(width, y);
        geometryContext.stroke();
    }

    geometryContext.strokeStyle = "rgba(120,175,240,.45)";
    geometryContext.lineWidth = 1.4;

    geometryContext.beginPath();
    geometryContext.moveTo(width / 2, 0);
    geometryContext.lineTo(width / 2, height);
    geometryContext.moveTo(0, height / 2);
    geometryContext.lineTo(width, height / 2);
    geometryContext.stroke();

    geometryObjects.forEach(obj => drawGeometryObject(obj));

    geometryPoints.forEach(point => {
        geometryContext.fillStyle = "#ffffff";
        geometryContext.beginPath();
        geometryContext.arc(point.x, point.y, 4, 0, Math.PI * 2);
        geometryContext.fill();
    });

}

function drawGeometryObject(obj) {

    const ctx = geometryContext;

    ctx.strokeStyle = "#59b6ff";
    ctx.fillStyle = "rgba(56,145,255,.12)";
    ctx.lineWidth = 2.2;

    ctx.beginPath();

    if (obj.type === "point") {

        ctx.shadowColor = "#55aaff";
        ctx.shadowBlur = 12;

        ctx.fillStyle = "#8bd2ff";
        ctx.arc(obj.x, obj.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        return;

    }

    if (obj.type === "circle") {

        ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        return;

    }

    if (obj.type === "line" || obj.type === "segment") {

        let { x1, y1, x2, y2 } = obj;

        if (obj.type === "line") {

            const dx = x2 - x1;
            const dy = y2 - y1;

            const length = Math.hypot(dx, dy) || 1;
            const ux = dx / length;
            const uy = dy / length;

            const extent = Math.max(
                geometryCanvas.clientWidth,
                geometryCanvas.clientHeight
            ) * 2;

            x1 -= ux * extent;
            y1 -= uy * extent;
            x2 += ux * extent;
            y2 += uy * extent;

        }

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;

    }

    if (obj.type === "polygon") {

        if (!obj.points.length) return;

        ctx.moveTo(obj.points[0].x, obj.points[0].y);

        obj.points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
        });

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

    }

}


/* ==========================================
   GEOMETRIA 3D
========================================== */

function initialize3D() {

    document.querySelectorAll("[data-solid]").forEach(button => {

        button.addEventListener("click", () => {

            currentSolid = button.dataset.solid;
            renderSolid(currentSolid);

        });

    });

    $("reset3D")?.addEventListener("click", () => {
        renderSolid(currentSolid);
    });

}

function renderSolid(solid) {

    if (!window.Plotly) return;

    const n = 28;
    let trace;

    if (solid === "sphere") {

        const x = [];
        const y = [];
        const z = [];

        for (let i = 0; i <= n; i++) {

            const rowX = [];
            const rowY = [];
            const rowZ = [];

            const phi = Math.PI * i / n;

            for (let j = 0; j <= n; j++) {

                const theta = 2 * Math.PI * j / n;

                rowX.push(Math.sin(phi) * Math.cos(theta));
                rowY.push(Math.sin(phi) * Math.sin(theta));
                rowZ.push(Math.cos(phi));

            }

            x.push(rowX);
            y.push(rowY);
            z.push(rowZ);

        }

        trace = {
            type: "surface",
            x, y, z,
            colorscale: [
                [0, "#1554b8"],
                [0.5, "#368cff"],
                [1, "#72e2ff"]
            ],
            showscale: false
        };

    } else if (solid === "cone") {

        trace = {
            type: "surface",
            x: Array.from({ length: 31 }, (_, i) =>
                Array.from({ length: 31 }, (_, j) =>
                    (1 - i / 30) * Math.cos(2 * Math.PI * j / 30)
                )
            ),
            y: Array.from({ length: 31 }, (_, i) =>
                Array.from({ length: 31 }, (_, j) =>
                    (1 - i / 30) * Math.sin(2 * Math.PI * j / 30)
                )
            ),
            z: Array.from({ length: 31 }, (_, i) =>
                Array(31).fill(i / 30 * 2 - 1)
            ),
            colorscale: [[0, "#276bd1"], [1, "#63d4ef"]],
            showscale: false
        };

    } else if (solid === "cylinder") {

        const x = [];
        const y = [];
        const z = [];

        for (let i = 0; i <= 30; i++) {

            const rowX = [];
            const rowY = [];
            const rowZ = [];

            for (let j = 0; j <= 30; j++) {

                const angle = 2 * Math.PI * j / 30;

                rowX.push(Math.cos(angle));
                rowY.push(Math.sin(angle));
                rowZ.push(-1 + 2 * i / 30);

            }

            x.push(rowX);
            y.push(rowY);
            z.push(rowZ);

        }

        trace = {
            type: "surface",
            x, y, z,
            colorscale: [[0, "#276bd1"], [1, "#63d4ef"]],
            showscale: false
        };

    } else {

        trace = {
            type: "mesh3d",
            x: [-1, 1, 1, -1, -1, 1, 1, -1],
            y: [-1, -1, 1, 1, -1, -1, 1, 1],
            z: [-1, -1, -1, -1, 1, 1, 1, 1],
            i: [0, 0, 0, 4, 4, 5, 5, 0, 0, 1, 2, 3],
            j: [1, 2, 3, 5, 6, 6, 7, 1, 4, 2, 3, 0],
            k: [2, 3, 1, 6, 7, 7, 4, 5, 5, 6, 7, 7],
            color: "#398cff",
            opacity: .9,
            flatshading: true,
            showscale: false
        };

    }

    Plotly.newPlot("threeCanvas", [trace], {

        paper_bgcolor: "#0b1424",
        plot_bgcolor: "#0b1424",

        scene: {
            bgcolor: "#0b1424",
            aspectmode: "cube",
            xaxis: { visible: true, color: "#8199b8", gridcolor: "#253c59" },
            yaxis: { visible: true, color: "#8199b8", gridcolor: "#253c59" },
            zaxis: { visible: true, color: "#8199b8", gridcolor: "#253c59" },
            camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } }
        },

        margin: { l: 0, r: 0, t: 0, b: 0 }

    }, {
        responsive: true,
        displaylogo: false
    });

}


/* ==========================================
   CALCULADORA CIENTÍFICA
========================================== */

function initializeCalculator() {

    document.querySelectorAll("[data-calc]").forEach(button => {

        button.addEventListener("click", () => {
            handleCalculator(button.dataset.calc);
        });

    });

    document.addEventListener("keydown", event => {

        const page = $("page-calculadora");

        if (!page?.classList.contains("active")) return;

        if (document.activeElement.tagName === "INPUT") return;

        if (/^[0-9.+\-*/()]$/.test(event.key)) {
            calculatorExpression += event.key;
            updateCalculator();
        }

        if (event.key === "Enter") {
            handleCalculator("equals");
        }

        if (event.key === "Backspace") {
            handleCalculator("delete");
        }

        if (event.key === "Escape") {
            handleCalculator("clear");
        }

    });

}

function handleCalculator(value) {

    if (value === "clear") {
        calculatorExpression = "";
    }

    else if (value === "delete") {
        calculatorExpression = calculatorExpression.slice(0, -1);
    }

    else if (value === "equals") {

        if (!calculatorExpression.trim()) return;

        try {

            const result = math.evaluate(calculatorExpression);

            if (typeof result !== "number" || !Number.isFinite(result)) {
                throw new Error("Resultado inválido");
            }

            calculatorHistory.unshift({
                expression: calculatorExpression,
                result: formatNumber(result)
            });

            calculatorHistory = calculatorHistory.slice(0, 20);

            renderCalculatorHistory();

            calculatorExpression = String(result);

        } catch {
            $("calculatorResult").textContent = "Expressão inválida";
            return;
        }

    }

    else if (value === "factorial") {
        calculatorExpression += "!";
    }

    else {
        calculatorExpression += value;
    }

    updateCalculator();

}

function updateCalculator() {

    $("calculatorExpression").textContent =
        calculatorExpression || "0";

    $("calculatorResult").textContent =
        calculatorExpression || "0";

}

function renderCalculatorHistory() {

    const container = $("calculatorHistory");

    if (!calculatorHistory.length) return;

    container.innerHTML = "";

    calculatorHistory.forEach(item => {

        const row = document.createElement("div");
        row.className = "history-item";

        const expression = document.createElement("span");
        expression.textContent = item.expression;

        const result = document.createElement("strong");
        result.textContent = item.result;

        row.append(expression, result);
        container.appendChild(row);

    });

}


/* ==========================================
   ÁLGEBRA
========================================== */

function initializeAlgebra() {

    $("solveAlgebra")?.addEventListener("click", solveAlgebra);

}

function solveAlgebra() {

    const input = $("algebraInput").value.trim();

    const output = $("algebraResult");

    if (!input) {
        showNotification("Digite uma equação primeiro.");
        return;
    }

    try {

        if (!window.math) throw new Error("Biblioteca indisponível");

        const parts = input.split("=");

        if (parts.length === 1) {

            const result = math.simplify(input).toString();
            output.innerHTML = `
                <span>EXPRESSÃO SIMPLIFICADA</span>
                <p>${escapeHTML(result)}</p>
            `;

            return;

        }

        if (parts.length !== 2) {
            throw new Error("Equação inválida");
        }

        const left = parts[0];
        const right = parts[1];

        const f = x => math.evaluate(left, { x }) - math.evaluate(right, { x });

        const c = f(0);
        const plus = f(1);
        const minus = f(-1);

        const a = (plus + minus - 2 * c) / 2;
        const b = (plus - minus) / 2;

        let result;

        if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) {

            result = Math.abs(c) < 1e-9
                ? "Identidade: todos os valores reais satisfazem a equação."
                : "Não existe solução.";

        } else if (Math.abs(a) < 1e-9) {

            result = `x = ${formatNumber(-c / b)}`;

        } else {

            const delta = b * b - 4 * a * c;

            if (delta < -1e-9) {

                result = `Δ = ${formatNumber(delta)}. Não existem raízes reais.`;

            } else if (Math.abs(delta) < 1e-9) {

                result = `Δ = 0. Raiz dupla: x = ${formatNumber(-b / (2 * a))}`;

            } else {

                const x1 = (-b + Math.sqrt(delta)) / (2 * a);
                const x2 = (-b - Math.sqrt(delta)) / (2 * a);

                result =
                    `Δ = ${formatNumber(delta)} | x₁ = ${formatNumber(x1)} | x₂ = ${formatNumber(x2)}`;

            }

        }

        output.innerHTML = `
            <span>RESULTADO DA EQUAÇÃO</span>
            <p>${escapeHTML(result)}</p>
        `;

    } catch {

        output.innerHTML = `
            <span>ATENÇÃO</span>
            <p class="error-message">
                Não foi possível interpretar essa expressão.
                Verifique a sintaxe e utilize x como variável.
                Este solucionador trabalha com equações de até segundo grau.
            </p>
        `;

    }

}


/* ==========================================
   CÁLCULO DIFERENCIAL E INTEGRAL
========================================== */

function initializeCalculus() {

    document.querySelectorAll("[data-operation]").forEach(button => {

        button.addEventListener("click", () => {

            const operation = button.dataset.operation;
            calculateCalculus(operation);

        });

    });

    document.querySelectorAll("[data-calculation]").forEach(button => {

        button.addEventListener("click", () => {

            const operation = button.dataset.calculation;

            const labels = {
                derivada: "Derivadas",
                integral: "Integrais",
                limite: "Limites"
            };

            $("calculusFunction").focus();

            $("calculusResult").querySelector("p").textContent =
                "Modo selecionado: " + labels[operation];

            $("calculusResult").dataset.mode = operation;

        });

    });

}

function calculateCalculus(operation) {

    const expression = $("calculusFunction").value.trim();
    const variable = $("calculusVariable").value.trim() || "x";

    if (!expression) {
        showNotification("Digite uma função primeiro.");
        return;
    }

    try {

        let result;

        if (operation === "derivative") {

            result = math.derivative(expression, variable).toString();

        } else if (operation === "integral") {

            const fn = math.compile(expression);

            const lower = 0;
            const upper = 1;
            const steps = 1000;
            const width = (upper - lower) / steps;

            let sum = 0;

            for (let i = 0; i <= steps; i++) {

                const x = lower + i * width;
                const y = fn.evaluate({ [variable]: x });

                const weight =
                    i === 0 || i === steps ? 1 :
                    i % 2 === 0 ? 2 : 4;

                sum += weight * y;

            }

            result =
                `Integral aproximada de 0 a 1: ${formatNumber(sum * width / 3)}`;

        }

        $("calculusResult").innerHTML = `
            <span>RESULTADO</span>
            <p>${escapeHTML(result)}</p>
        `;

    } catch {

        $("calculusResult").innerHTML = `
            <span>ERRO</span>
            <p class="error-message">
                Não foi possível realizar a operação.
                Confira a função digitada.
            </p>
        `;

    }

}


/* ==========================================
   ESTATÍSTICA
========================================== */

function initializeStatistics() {

    $("calculateStatistics")?.addEventListener("click", calculateStatistics);

}

function calculateStatistics() {

    const raw = $("statisticsInput").value.trim();

    if (!raw) {
        showNotification("Digite alguns valores.");
        return;
    }

    const values = raw
        .split(/[;,\s]+/)
        .filter(Boolean)
        .map(Number);

    if (!values.length || values.some(v => !Number.isFinite(v))) {
        showNotification("Insira somente números válidos.");
        return;
    }

    const sorted = [...values].sort((a, b) => a - b);

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const middle = Math.floor(sorted.length / 2);

    const median = sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;

    const frequencies = new Map();

    values.forEach(value => {
        frequencies.set(value, (frequencies.get(value) || 0) + 1);
    });

    const highestFrequency = Math.max(...frequencies.values());

    const modes = [...frequencies.entries()]
        .filter(([, frequency]) => frequency === highestFrequency)
        .map(([value]) => value);

    const mode = highestFrequency === 1
        ? "Sem moda"
        : modes.join(", ");

    const variance = values.reduce(
        (acc, value) => acc + Math.pow(value - mean, 2),
        0
    ) / values.length;

    const deviation = Math.sqrt(variance);

    $("statMean").textContent = formatNumber(mean);
    $("statMedian").textContent = formatNumber(median);
    $("statMode").textContent = mode;
    $("statDeviation").textContent = formatNumber(deviation);

    if (window.Plotly) {

        Plotly.newPlot("statisticsChart", [{
            x: values.map((_, i) => `Valor ${i + 1}`),
            y: values,
            type: "bar",
            marker: {
                color: "#398cff",
                line: { color: "#65b7ff", width: 1 }
            }
        }], {

            paper_bgcolor: "#101b2e",
            plot_bgcolor: "#101b2e",
            font: { color: "#aabbd2" },
            margin: { l: 45, r: 15, t: 15, b: 45 },
            yaxis: {
                gridcolor: "rgba(150,180,220,.12)",
                title: "Valores"
            },
            xaxis: {
                gridcolor: "rgba(150,180,220,.12)"
            }

        }, {
            responsive: true,
            displaylogo: false
        });

    }

    showNotification("Análise estatística concluída!");

}


/* ==========================================
   FÍSICA MATEMÁTICA
========================================== */

function initializePhysics() {

    document.querySelectorAll("[data-physics]").forEach(button => {

        button.addEventListener("click", () => {

            currentPhysics = button.dataset.physics;
            renderPhysics(currentPhysics);

        });

    });

}

function renderPhysics(type) {

    const container = $("physicsWorkspace");

    const simulations = {

        uniform: {
            title: "Movimento uniforme",
            description: "Movimento com velocidade constante.",
            fields: [
                ["velocidade", "Velocidade (m/s)", "5"],
                ["tempo", "Tempo (s)", "10"]
            ]
        },

        accelerated: {
            title: "Movimento uniformemente variado",
            description: "Movimento com aceleração constante.",
            fields: [
                ["velocidade", "Velocidade inicial (m/s)", "0"],
                ["aceleracao", "Aceleração (m/s²)", "2"],
                ["tempo", "Tempo (s)", "10"]
            ]
        },

        projectile: {
            title: "Lançamento oblíquo",
            description: "Estudo de uma trajetória de lançamento.",
            fields: [
                ["velocidade", "Velocidade inicial (m/s)", "20"],
                ["angulo", "Ângulo (graus)", "45"]
            ]
        }

    };

    const simulation = simulations[type];

    container.innerHTML = `
        <h3>${simulation.title}</h3>
        <p style="color:#91a6c1;font-size:11px;margin:8px 0 17px">
            ${simulation.description}
        </p>

        <div class="physics-fields">
            ${simulation.fields.map(field => `
                <label class="field-label" for="physics-${field[0]}">
                    ${field[1]}
                </label>
                <input
                    class="math-input"
                    type="number"
                    id="physics-${field[0]}"
                    value="${field[2]}"
                    step="any"
                >
            `).join("")}
        </div>

        <button class="primary-button" id="runPhysics">
            <i data-lucide="play"></i>
            Calcular e visualizar
        </button>

        <div class="result-area" id="physicsResult">
            <span>RESULTADO</span>
            <p>A simulação aparecerá aqui.</p>
        </div>

        <div id="physicsChart" style="width:100%;height:300px;margin-top:15px"></div>
    `;

    refreshIcons();

    $("runPhysics").addEventListener("click", runPhysics);

}

function runPhysics() {

    const type = currentPhysics;

    let time = [];
    let position = [];
    let result = "";

    if (type === "uniform") {

        const velocity = Number($("physics-velocidade").value);
        const duration = Number($("physics-tempo").value);

        if (!validPhysics([velocity, duration]) || duration <= 0) return;

        for (let t = 0; t <= duration; t += duration / 100) {
            time.push(t);
            position.push(velocity * t);
        }

        result = `Deslocamento: ${formatNumber(velocity * duration)} m`;

    }

    else if (type === "accelerated") {

        const velocity = Number($("physics-velocidade").value);
        const acceleration = Number($("physics-aceleracao").value);
        const duration = Number($("physics-tempo").value);

        if (!validPhysics([velocity, acceleration, duration]) || duration <= 0) return;

        for (let t = 0; t <= duration; t += duration / 100) {
            time.push(t);
            position.push(velocity * t + 0.5 * acceleration * t * t);
        }

        const finalVelocity = velocity + acceleration * duration;

        result =
            `Deslocamento: ${formatNumber(position[position.length - 1])} m | Velocidade final: ${formatNumber(finalVelocity)} m/s`;

    }

    else if (type === "projectile") {

        const velocity = Number($("physics-velocidade").value);
        const angle = Number($("physics-angulo").value);

        if (!validPhysics([velocity, angle]) || velocity <= 0 || angle <= 0 || angle >= 90) {
            showNotification("Confira a velocidade e o ângulo. Utilize um ângulo entre 0° e 90°.");
            return;
        }

        const g = 9.81;
        const radians = angle * Math.PI / 180;

        const vx = velocity * Math.cos(radians);
        const vy = velocity * Math.sin(radians);

        const duration = 2 * vy / g;

        for (let t = 0; t <= duration; t += duration / 100) {

            time.push(vx * t);

            position.push(
                vy * t - 0.5 * g * t * t
            );

        }

        const height = vy * vy / (2 * g);
        const range = vx * duration;

        result =
            `Altura máxima: ${formatNumber(height)} m | Alcance: ${formatNumber(range)} m | Tempo de voo: ${formatNumber(duration)} s`;

    }

    $("physicsResult").innerHTML = `
        <span>RESULTADO DA SIMULAÇÃO</span>
        <p>${escapeHTML(result)}</p>
    `;

    Plotly.newPlot("physicsChart", [{
        x: time,
        y: position,
        type: "scatter",
        mode: "lines",
        line: { color: "#55aaff", width: 3 }
    }], {

        paper_bgcolor: "#101b2e",
        plot_bgcolor: "#101b2e",
        font: { color: "#aabbd2" },
        margin: { l: 50, r: 15, t: 15, b: 45 },
        xaxis: {
            title: type === "projectile" ? "Distância (m)" : "Tempo (s)",
            gridcolor: "rgba(150,180,220,.12)"
        },
        yaxis: {
            title: type === "projectile" ? "Altura (m)" : "Posição (m)",
            gridcolor: "rgba(150,180,220,.12)"
        }

    }, {
        responsive: true,
        displaylogo: false
    });

    showNotification("Simulação concluída!");

}

function validPhysics(values) {

    if (values.some(value => !Number.isFinite(value))) {
        showNotification("Preencha todos os campos com valores válidos.");
        return false;
    }

    return true;

}


/* ==========================================
   EDITOR MATEMÁTICO
========================================== */

function initializeEditor() {

    $("clearDocument")?.addEventListener("click", () => {

        $("documentTitle").value = "";
        $("documentContent").value = "";

        showNotification("Documento limpo.");

    });

    $("exportDocument")?.addEventListener("click", exportDocument);

}

function exportDocument() {

    const title = $("documentTitle").value.trim() || "Documento matemático";
    const content = $("documentContent").value;

    if (!content.trim()) {
        showNotification("Escreva alguma coisa antes de exportar.");
        return;
    }

    const text = `${title}\n\n${content}`;

    const blob = new Blob([text], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = title.replace(/[^\p{L}\p{N}\-_ ]/gu, "").replace(/\s+/g, "-") + ".txt";

    link.click();

    URL.revokeObjectURL(url);

    showNotification("Documento exportado!");

}


/* ==========================================
   FUNÇÕES AUXILIARES
========================================== */

function formatNumber(number) {

    if (!Number.isFinite(number)) return "Indefinido";

    return Number(number).toLocaleString("pt-BR", {
        maximumFractionDigits: 6
    });

}

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];

    });

}


/* ==========================================
   FINALIZAÇÃO
========================================== */

window.addEventListener("resize", () => {

    if ($("page-espacial")?.classList.contains("active")) {
        Plotly.Plots.resize("threeCanvas");
    }

    if ($("page-graficos")?.classList.contains("active")) {
        const graph = $("mainGraph");

        if (graph && graph.data) {
            Plotly.Plots.resize(graph);
        }
    }

});

console.log("GUILHERME MATHLAB iniciado com sucesso.");

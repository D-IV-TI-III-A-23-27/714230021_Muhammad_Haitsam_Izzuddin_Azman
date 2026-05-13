// ===== LOADING SCREEN =====
window.addEventListener('load', () => {
    setTimeout(() => document.getElementById('loadingScreen').classList.add('hidden'), 600);
});

// ===== PERFORMANCE: detect mobile & reduce particles =====
const isMobile = window.innerWidth < 768;
const PARTICLE_COUNT = isMobile ? 20 : 45;

// ===== PARTICLE BACKGROUND (optimized) =====
(function() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [], animId, isVisible = true;
    const CONNECT_DIST = isMobile ? 100 : 130;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

    // pause when tab hidden
    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
        if (isVisible) animId = requestAnimationFrame(animate);
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.25;
            this.vy = (Math.random() - 0.5) * 0.25;
            this.r = Math.random() * 1.8 + 0.5;
            this.a = Math.random() * 0.35 + 0.1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

    function animate() {
        if (!isVisible) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 6.2832);
            ctx.fillStyle = `rgba(99,102,241,${p.a})`;
            ctx.fill();
            for (let j = i + 1; j < particles.length; j++) {
                const q = particles[j];
                const dx = p.x - q.x, dy = p.y - q.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < CONNECT_DIST * CONNECT_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - Math.sqrt(d2) / CONNECT_DIST)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        animId = requestAnimationFrame(animate);
    }
    animate();
})();

// ===== SCROLL ANIMATIONS (unified observer) =====
function createStaggerObserver(selector, cls, staggerMs) {
    const els = document.querySelectorAll(selector);
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                const siblings = [...e.target.parentElement.querySelectorAll(selector.split(',').pop().trim())];
                const idx = siblings.indexOf(e.target);
                setTimeout(() => e.target.classList.add(cls), idx * staggerMs);
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
}

// Section headers
const headerObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); headerObs.unobserve(e.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.section-header').forEach(el => headerObs.observe(el));

// Cards with stagger
createStaggerObserver('.overview-card', 'anim-in', 120);
createStaggerObserver('.variant-card', 'anim-in', 150);
createStaggerObserver('.usecase-card', 'anim-in', 100);

// Steps
const stepObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); stepObs.unobserve(e.target); }
    });
}, { threshold: 0.15 });
document.querySelectorAll('.step-item').forEach(el => stepObs.observe(el));

// Comparison table
const tableObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('anim-in');
            // Animate accuracy bars
            setTimeout(() => {
                document.querySelectorAll('.accuracy-fill').forEach(bar => {
                    const w = bar.style.width || '0%';
                    bar.style.setProperty('--target-width', w);
                    bar.style.width = '0%';
                    bar.classList.add('animate');
                });
            }, 300);
            tableObs.unobserve(e.target);
        }
    });
}, { threshold: 0.2 });
document.querySelectorAll('.comparison-table-wrapper').forEach(el => tableObs.observe(el));

// ===== STAT COUNTER =====
const countObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            const target = parseInt(e.target.dataset.target);
            let cur = 0;
            const step = Math.ceil(target / 40);
            const t = setInterval(() => {
                cur += step;
                if (cur >= target) { cur = target; clearInterval(t); }
                e.target.textContent = cur;
            }, 30);
            countObs.unobserve(e.target);
        }
    });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-number[data-target]').forEach(el => countObs.observe(el));

// ===== ARCHITECTURE DIAGRAM =====
(function() {
    const canvas = document.getElementById('archCanvas');
    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('archOverlay');
    const detailPanel = document.getElementById('detailPanel');
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');

    const info = {
        'Training Data': ['Training Data (Input)', 'Data pelatihan berisi pasangan fitur (X) dan label target (y). Data ini digunakan untuk melatih semua weak learner secara berurutan. Kualitas dan kuantitas data sangat mempengaruhi performa model akhir.'],
        'F₀(x) = mean(y)': ['Inisialisasi Model (F₀)', 'Model awal diinisialisasi dengan nilai konstan, biasanya rata-rata dari nilai target untuk regresi atau log-odds untuk klasifikasi. Ini memberikan baseline prediksi sebelum boosting dimulai.'],
        'Hitung Residual': ['Hitung Pseudo-Residuals', 'Pseudo-residuals dihitung sebagai gradient negatif dari loss function: rᵢ = -(∂L/∂F). Untuk MSE loss, residual = yᵢ - F(xᵢ). Residuals menunjukkan arah dan besarnya koreksi yang diperlukan.'],
        'Tree 1': ['Decision Tree 1 (Weak Learner)', 'Decision tree pertama dilatih pada pseudo-residuals. Tree ini biasanya dangkal (depth 3-8) agar tetap menjadi weak learner yang mempelajari pola koreksi.'],
        'Tree 2': ['Decision Tree 2 (Weak Learner)', 'Tree kedua dilatih pada residuals baru setelah Tree 1 ditambahkan. Setiap tree berikutnya fokus pada error yang tersisa, secara bertahap meningkatkan akurasi.'],
        'Tree M': ['Decision Tree M (Terakhir)', 'Tree ke-M adalah tree terakhir. Jumlah total tree (M) adalah hyperparameter yang perlu di-tuning untuk menghindari overfitting maupun underfitting.'],
        'Σ Weighted Sum': ['Penjumlahan Berbobot', 'Semua prediksi dijumlahkan: F(x) = F₀(x) + ν·h₁(x) + ν·h₂(x) + ... + ν·hₘ(x). Learning rate (ν) mengontrol kontribusi setiap tree.'],
        'Loss Function': ['Loss Function', 'Mengukur seberapa baik model memprediksi target (MSE, Log Loss, dll). Gradientnya digunakan untuk menghitung pseudo-residuals di setiap iterasi.'],
        'Final Prediction': ['Prediksi Akhir', 'Output final adalah hasil penjumlahan semua weak learner yang telah di-scale. Model ini mampu menangkap pola kompleks dan non-linear dengan akurasi tinggi.']
    };

    function setup() {
        const r = canvas.parentElement.getBoundingClientRect();
        canvas.width = r.width; canvas.height = r.height;
        const W = canvas.width, H = canvas.height;
        overlay.innerHTML = '';

        const nodes = [
            { l: 'Training Data', x: 0.08, y: 0.5, c: 'node-input' },
            { l: 'F₀(x) = mean(y)', x: 0.25, y: 0.18, c: 'node-sum' },
            { l: 'Hitung Residual', x: 0.25, y: 0.5, c: 'node-residual' },
            { l: 'Tree 1', x: 0.45, y: 0.22, c: 'node-tree' },
            { l: 'Tree 2', x: 0.45, y: 0.5, c: 'node-tree' },
            { l: 'Tree M', x: 0.45, y: 0.78, c: 'node-tree' },
            { l: 'Σ Weighted Sum', x: 0.65, y: 0.5, c: 'node-sum' },
            { l: 'Loss Function', x: 0.65, y: 0.85, c: 'node-loss' },
            { l: 'Final Prediction', x: 0.88, y: 0.5, c: 'node-output' }
        ];

        ctx.clearRect(0, 0, W, H);

        function arrow(x1, y1, x2, y2, col) {
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
            const a = Math.atan2(y2 - y1, x2 - x1);
            ctx.beginPath(); ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4));
            ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4));
            ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        }

        [[0,2,'rgba(20,184,166,0.5)'],[1,2,'rgba(139,92,246,0.4)'],[2,3,'rgba(236,72,153,0.4)'],
         [2,4,'rgba(236,72,153,0.4)'],[2,5,'rgba(236,72,153,0.4)'],[3,6,'rgba(99,102,241,0.4)'],
         [4,6,'rgba(99,102,241,0.4)'],[5,6,'rgba(99,102,241,0.4)'],[6,8,'rgba(245,158,11,0.5)'],
         [6,7,'rgba(239,68,68,0.4)'],[7,2,'rgba(239,68,68,0.3)']
        ].forEach(([f, t, col]) => arrow(nodes[f].x * W, nodes[f].y * H, nodes[t].x * W, nodes[t].y * H, col));

        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(nodes[4].x * W, (nodes[4].y + 0.07) * H);
        ctx.lineTo(nodes[5].x * W, (nodes[5].y - 0.07) * H);
        ctx.strokeStyle = 'rgba(99,102,241,0.3)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(165,180,252,0.6)'; ctx.font = '20px Inter'; ctx.textAlign = 'center';
        ctx.fillText('⋮', nodes[4].x * W, (nodes[4].y + 0.15) * H);
        ctx.fillStyle = 'rgba(252,165,165,0.6)'; ctx.font = '11px Inter';
        ctx.fillText('feedback loop (iterasi)', (nodes[7].x * W + nodes[2].x * W) / 2, nodes[7].y * H + 15);

        nodes.forEach((n, i) => {
            const el = document.createElement('div');
            el.className = `arch-node ${n.c}`;
            el.textContent = n.l;
            el.style.left = `${n.x * 100}%`;
            el.style.top = `${n.y * 100}%`;
            el.style.transform = 'translate(-50%,-50%)';
            el.style.animationDelay = `${i * 0.08}s`;
            el.addEventListener('click', () => {
                overlay.querySelectorAll('.arch-node').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
                const d = info[n.l];
                if (d) { detailTitle.textContent = d[0]; detailDesc.textContent = d[1]; }
            });
            overlay.appendChild(el);
        });
    }

    setup();
    let rTimer;
    window.addEventListener('resize', () => { clearTimeout(rTimer); rTimer = setTimeout(setup, 200); });
    document.getElementById('detailClose').addEventListener('click', () => {
        overlay.querySelectorAll('.arch-node').forEach(e => e.classList.remove('active'));
        detailTitle.textContent = 'Pilih komponen';
        detailDesc.textContent = 'Klik pada salah satu node di diagram arsitektur untuk melihat penjelasan detail.';
    });
})();

// ===== SIMULATION (optimized) =====
(function() {
    const predCanvas = document.getElementById('predictionChart');
    const lossCanvas = document.getElementById('lossChart');
    const predCtx = predCanvas.getContext('2d');
    const lossCtx = lossCanvas.getContext('2d');
    const numS = document.getElementById('numTrees'), lrS = document.getElementById('learningRate'), depS = document.getElementById('treeDepth');
    const numV = document.getElementById('numTreesVal'), lrV = document.getElementById('learningRateVal'), depV = document.getElementById('treeDepthVal');
    const mseEl = document.getElementById('mseValue'), r2El = document.getElementById('r2Value'), treesEl = document.getElementById('treesUsed');

    let data = [];
    function genData() {
        data = [];
        for (let i = 0; i < 30; i++) {
            const x = (i / 29) * 10;
            data.push({ x, y: Math.sin(x) * 3 + Math.cos(x * 0.5) * 2 + (Math.random() - 0.5) * 1.5 });
        }
    }
    genData();

    function fitStump(d, res) {
        let bestTh = 0, bestLoss = Infinity;
        for (let s = 0; s < d.length - 1; s++) {
            const th = (d[s].x + d[s + 1].x) / 2;
            let lSum = 0, lCnt = 0, rSum = 0, rCnt = 0;
            for (let i = 0; i < d.length; i++) {
                if (d[i].x <= th) { lSum += res[i]; lCnt++; } else { rSum += res[i]; rCnt++; }
            }
            if (!lCnt || !rCnt) continue;
            const lM = lSum / lCnt, rM = rSum / rCnt;
            let loss = 0;
            for (let i = 0; i < d.length; i++) loss += (res[i] - (d[i].x <= th ? lM : rM)) ** 2;
            if (loss < bestLoss) { bestLoss = loss; bestTh = th; }
        }
        const finalTh = bestTh;
        let lS2 = 0, lC2 = 0, rS2 = 0, rC2 = 0;
        for (let i = 0; i < d.length; i++) {
            if (d[i].x <= finalTh) { lS2 += res[i]; lC2++; } else { rS2 += res[i]; rC2++; }
        }
        const lM2 = lS2 / (lC2 || 1), rM2 = rS2 / (rC2 || 1);
        return x => x <= finalTh ? lM2 : rM2;
    }

    let rafId;
    function run() {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            const nT = +numS.value, lr = +lrS.value / 10, dp = +depS.value;
            numV.textContent = nT; lrV.textContent = lr.toFixed(1); depV.textContent = dp;
            const yMean = data.reduce((s, d) => s + d.y, 0) / data.length;
            let pred = data.map(() => yMean);
            const losses = [];
            for (let t = 0; t < nT; t++) {
                const res = data.map((d, i) => d.y - pred[i]);
                losses.push(res.reduce((s, r) => s + r * r, 0) / res.length);
                const tree = fitStump(data, res);
                pred = pred.map((p, i) => p + lr * tree(data[i].x));
            }
            const fRes = data.map((d, i) => d.y - pred[i]);
            const fMSE = fRes.reduce((s, r) => s + r * r, 0) / fRes.length;
            losses.push(fMSE);
            const ssR = fRes.reduce((s, r) => s + r * r, 0);
            const ssT = data.reduce((s, d) => s + (d.y - yMean) ** 2, 0);
            mseEl.textContent = fMSE.toFixed(4);
            r2El.textContent = (1 - ssR / ssT).toFixed(4);
            treesEl.textContent = nT;
            drawPred(pred);
            drawLoss(losses);
        });
    }

    function drawPred(pred) {
        const W = predCanvas.width = predCanvas.parentElement.clientWidth - 48, H = predCanvas.height = 280;
        predCtx.clearRect(0, 0, W, H);
        const p = { t: 20, r: 20, b: 40, l: 50 }, pw = W - p.l - p.r, ph = H - p.t - p.b;
        const allY = [...data.map(d => d.y), ...pred];
        const yMin = Math.min(...allY) - 0.5, yMax = Math.max(...allY) + 0.5;
        const sx = (x) => p.l + (x / 10) * pw;
        const sy = (y) => p.t + (1 - (y - yMin) / (yMax - yMin)) * ph;

        predCtx.strokeStyle = 'rgba(255,255,255,0.05)'; predCtx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) { const gy = p.t + (i / 5) * ph; predCtx.beginPath(); predCtx.moveTo(p.l, gy); predCtx.lineTo(p.l + pw, gy); predCtx.stroke(); }

        data.forEach(d => {
            predCtx.beginPath(); predCtx.arc(sx(d.x), sy(d.y), 4, 0, 6.2832);
            predCtx.fillStyle = 'rgba(99,102,241,0.7)'; predCtx.fill();
            predCtx.strokeStyle = 'rgba(99,102,241,1)'; predCtx.lineWidth = 1.5; predCtx.stroke();
        });

        predCtx.beginPath();
        data.forEach((d, i) => { const x = sx(d.x), y = sy(pred[i]); i === 0 ? predCtx.moveTo(x, y) : predCtx.lineTo(x, y); });
        predCtx.strokeStyle = '#f59e0b'; predCtx.lineWidth = 2.5; predCtx.stroke();

        predCtx.fillStyle = 'rgba(99,102,241,0.9)'; predCtx.beginPath(); predCtx.arc(p.l + 10, H - 12, 4, 0, 6.2832); predCtx.fill();
        predCtx.fillStyle = 'rgba(156,163,175,0.8)'; predCtx.font = '11px Inter'; predCtx.textAlign = 'left';
        predCtx.fillText('Data Asli', p.l + 20, H - 8);
        predCtx.strokeStyle = '#f59e0b'; predCtx.lineWidth = 2.5;
        predCtx.beginPath(); predCtx.moveTo(p.l + 100, H - 12); predCtx.lineTo(p.l + 120, H - 12); predCtx.stroke();
        predCtx.fillStyle = 'rgba(156,163,175,0.8)'; predCtx.fillText('Prediksi GB', p.l + 126, H - 8);
    }

    function drawLoss(losses) {
        const W = lossCanvas.width = lossCanvas.parentElement.clientWidth - 48, H = lossCanvas.height = 280;
        lossCtx.clearRect(0, 0, W, H);
        if (losses.length < 2) return;
        const p = { t: 20, r: 20, b: 40, l: 60 }, pw = W - p.l - p.r, ph = H - p.t - p.b;
        const yMax = Math.max(...losses) * 1.1;

        lossCtx.strokeStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i <= 5; i++) {
            const gy = p.t + (i / 5) * ph;
            lossCtx.beginPath(); lossCtx.moveTo(p.l, gy); lossCtx.lineTo(p.l + pw, gy); lossCtx.stroke();
            lossCtx.fillStyle = 'rgba(156,163,175,0.5)'; lossCtx.font = '10px JetBrains Mono'; lossCtx.textAlign = 'right';
            lossCtx.fillText((yMax - (i / 5) * yMax).toFixed(2), p.l - 8, gy + 4);
        }

        const sx = i => p.l + (i / (losses.length - 1)) * pw;
        const sy = l => p.t + (1 - l / yMax) * ph;

        lossCtx.beginPath();
        losses.forEach((l, i) => { i === 0 ? lossCtx.moveTo(sx(i), sy(l)) : lossCtx.lineTo(sx(i), sy(l)); });
        lossCtx.lineTo(sx(losses.length - 1), p.t + ph); lossCtx.lineTo(p.l, p.t + ph); lossCtx.closePath();
        const grad = lossCtx.createLinearGradient(0, p.t, 0, p.t + ph);
        grad.addColorStop(0, 'rgba(236,72,153,0.3)'); grad.addColorStop(1, 'rgba(236,72,153,0.02)');
        lossCtx.fillStyle = grad; lossCtx.fill();

        lossCtx.beginPath();
        losses.forEach((l, i) => { i === 0 ? lossCtx.moveTo(sx(i), sy(l)) : lossCtx.lineTo(sx(i), sy(l)); });
        lossCtx.strokeStyle = '#ec4899'; lossCtx.lineWidth = 2.5; lossCtx.stroke();

        losses.forEach((l, i) => {
            lossCtx.beginPath(); lossCtx.arc(sx(i), sy(l), 4, 0, 6.2832);
            lossCtx.fillStyle = '#ec4899'; lossCtx.fill();
            lossCtx.strokeStyle = 'rgba(236,72,153,0.3)'; lossCtx.lineWidth = 6; lossCtx.stroke();
        });

        lossCtx.fillStyle = 'rgba(156,163,175,0.7)'; lossCtx.font = '11px Inter'; lossCtx.textAlign = 'center';
        lossCtx.fillText('Iterasi', W / 2, H - 5);
    }

    numS.addEventListener('input', run);
    lrS.addEventListener('input', run);
    depS.addEventListener('input', run);
    document.getElementById('resetBtn').addEventListener('click', () => { genData(); run(); });
    run();
    let rTimer;
    window.addEventListener('resize', () => { clearTimeout(rTimer); rTimer = setTimeout(run, 200); });
})();

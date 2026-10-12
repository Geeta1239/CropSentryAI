/**
 * CropSentry AI - MOTION & 3D INTERACTIVITY ENGINE
 * Features: Motion API Staggered Scroll-Reveals, 3D Card Tilt with Specular Glare,
 * Animated Metric Count-Up, Magnetic Micro-interactions
 */

document.addEventListener("DOMContentLoaded", () => {
    initScrollAnimations();
    init3DCardTilt();
    initMetricCounters();
    initMagneticElements();
});

/* ================= 1. MOTION SCROLL-TRIGGERED STAGGER ANIMATIONS ================= */
function initScrollAnimations() {
    const animElements = document.querySelectorAll(
        ".feature-card, .step-card, .disease-card, .kpi-card, .risk-widget, .section-header, .compare-col"
    );

    if (!("IntersectionObserver" in window)) {
        animElements.forEach(el => el.style.opacity = "1");
        return;
    }

    const observerOptions = {
        threshold: 0.12,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                const target = entry.target;
                
                // Use Motion / Web Animations API
                if (typeof target.animate === "function") {
                    target.animate([
                        { opacity: 0, transform: "translateY(35px) scale(0.96)" },
                        { opacity: 1, transform: "translateY(0) scale(1)" }
                    ], {
                        duration: 650,
                        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
                        fill: "forwards",
                        delay: (idx % 4) * 100 // Stagger delay
                    });
                } else {
                    target.style.opacity = "1";
                    target.style.transform = "none";
                }

                obs.unobserve(target);
            }
        });
    }, observerOptions);

    animElements.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(35px)";
        observer.observe(el);
    });
}

/* ================= 2. 3D CARD TILT WITH SPECULAR REFLECTION ================= */
function init3DCardTilt() {
    const tiltCards = document.querySelectorAll(".feature-card, .disease-card, .kpi-card, .hero-upload-card");

    tiltCards.forEach(card => {
        // Create specular glare overlay element
        let glare = card.querySelector(".tilt-glare");
        if (!glare) {
            glare = document.createElement("div");
            glare.className = "tilt-glare";
            card.style.position = "relative";
            card.style.overflow = "hidden";
            card.appendChild(glare);
        }

        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -8; // Max 8 deg
            const rotateY = ((x - centerX) / centerX) * 8;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            card.style.transition = "transform 0.1s ease-out";

            // Update glare position
            const glareX = (x / rect.width) * 100;
            const glareY = (y / rect.height) * 100;
            glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.18) 0%, transparent 60%)`;
            glare.style.opacity = "1";
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)";
            card.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
            if (glare) glare.style.opacity = "0";
        });
    });
}

/* ================= 3. ANIMATED METRIC COUNTER COUNT-UP ================= */
function initMetricCounters() {
    const statItems = document.querySelectorAll(".hero-stat-item strong, .kpi-info h3");

    const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const originalText = el.textContent.trim();
                const match = originalText.match(/([0-9.,]+)/);

                if (match) {
                    const targetNum = parseFloat(match[0].replace(/,/g, ''));
                    const isPercentage = originalText.includes("%");
                    const hasPlus = originalText.includes("+");
                    const prefix = originalText.startsWith("<") ? "< " : "";

                    let start = 0;
                    const duration = 1200;
                    const startTime = performance.now();

                    function updateCounter(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease out cubic
                        const easeOut = 1 - Math.pow(1 - progress, 3);
                        const current = (start + (targetNum - start) * easeOut);

                        if (targetNum % 1 !== 0) {
                            el.textContent = `${prefix}${current.toFixed(1)}${isPercentage ? '%' : ''}${hasPlus ? '+' : ''}`;
                        } else {
                            el.textContent = `${prefix}${Math.round(current).toLocaleString()}${isPercentage ? '%' : ''}${hasPlus ? '+' : ''}`;
                        }

                        if (progress < 1) {
                            requestAnimationFrame(updateCounter);
                        } else {
                            el.textContent = originalText;
                        }
                    }

                    requestAnimationFrame(updateCounter);
                }
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    statItems.forEach(item => counterObserver.observe(item));
}

/* ================= 4. MAGNETIC MICRO-INTERACTIONS ON BUTTONS ================= */
function initMagneticElements() {
    const magneticBtns = document.querySelectorAll(".btn-primary, .btn-gold, .chatbot-fab");

    magneticBtns.forEach(btn => {
        btn.addEventListener("mousemove", (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);

            btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
            btn.style.transition = "transform 0.1s ease-out";
        });

        btn.addEventListener("mouseleave", () => {
            btn.style.transform = "translate(0px, 0px)";
            btn.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
        });
    });
}

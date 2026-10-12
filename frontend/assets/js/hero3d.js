/**
 * CropSentry AI - 3D HOLOGRAPHIC BIO-NEURAL VISUALIZER
 * Powered by Three.js (WebGL Canvas)
 * Features: 3D Organic Leaf Lattice, Synaptic Neural Particles, Mouse Gyro-Parallax
 */

function initHero3D() {
    const canvasContainer = document.getElementById("hero3dCanvas");
    if (!canvasContainer || typeof THREE === "undefined") return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = canvasContainer.clientWidth || 500;
    const height = canvasContainer.clientHeight || 450;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.innerHTML = "";
    canvasContainer.appendChild(renderer.domElement);

    // 2. 3D Leaf Molecular Geometry
    const group = new THREE.Group();
    scene.add(group);

    // Outer 3D Icosahedron Cage (Neural Node Matrix)
    const geoIcosa = new THREE.IcosahedronGeometry(6.5, 2);
    const matWire = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2
    });
    const wireMesh = new THREE.Mesh(geoIcosa, matWire);
    group.add(wireMesh);

    // Inner 3D Torus Knot (Bio-Vascular Core)
    const geoCore = new THREE.TorusKnotGeometry(3.5, 0.8, 100, 16);
    const matCore = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        emissive: 0x052e16,
        roughness: 0.3,
        metalness: 0.8
    });
    const coreMesh = new THREE.Mesh(geoCore, matCore);
    group.add(coreMesh);

    // 3. Floating Spore Particles (Points)
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x4ade80);
    const color2 = new THREE.Color(0xd97706);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 22;
        positions[i + 1] = (Math.random() - 0.5) * 22;
        positions[i + 2] = (Math.random() - 0.5) * 22;

        const mixedColor = Math.random() > 0.3 ? color1 : color2;
        colors[i] = mixedColor.r;
        colors[i + 1] = mixedColor.g;
        colors[i + 2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.25,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x22c55e, 3, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLightAmber = new THREE.PointLight(0xd97706, 2, 50);
    pointLightAmber.position.set(-10, -10, -10);
    scene.add(pointLightAmber);

    // 5. Mouse Parallax Reaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    window.addEventListener("mousemove", (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.001;
        mouseY = (e.clientY - window.innerHeight / 2) * 0.001;
    });

    // 6. Animation Loop
    let clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smooth rotation
        group.rotation.y = elapsedTime * 0.25;
        group.rotation.x = elapsedTime * 0.15;
        
        coreMesh.rotation.z = elapsedTime * 0.3;
        particleSystem.rotation.y = -elapsedTime * 0.08;

        // Smooth mouse damping
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        group.position.x = targetX * 6;
        group.position.y = -targetY * 6;

        renderer.render(scene, camera);
    }

    animate();

    // 7. Resize Handler
    window.addEventListener("resize", () => {
        if (!canvasContainer) return;
        const newW = canvasContainer.clientWidth;
        const newH = canvasContainer.clientHeight;
        if (newW > 0 && newH > 0) {
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initHero3D();
});

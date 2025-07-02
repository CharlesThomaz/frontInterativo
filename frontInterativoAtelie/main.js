//FAZ A IMPORTAÇÃO DA BIBLIOTECA
import * as THREE from 'three';

// --- ELEMENTOS DA UI ---
const infoDisplay = document.getElementById('info-display');
const infoTitle = document.getElementById('info-title');
const infoContent = document.getElementById('info-content');
const closeInfoButton = document.getElementById('close-info');

const interactionPrompt = document.getElementById('interaction-prompt');
const promptText = document.getElementById('prompt-text');

const atelierLabels = {
    login: document.getElementById('label-login'),
    about: document.getElementById('label-about'),
    courses: document.getElementById('label-courses'),
    products: document.getElementById('label-products'),
};

// --- MOBILE CONTROLS ---
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const actionBtn = document.getElementById('action-btn');

closeInfoButton.addEventListener('click', () => {
    infoDisplay.classList.add('hidden');
});

// --- SETUP DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF0F8FF); // AliceBlue, um azul muito claro

const aspectRatio = window.innerWidth / window.innerHeight;
const mapSize = 200; // Tamanho do mapa
const camera = new THREE.OrthographicCamera(
    -mapSize * aspectRatio / 2, mapSize * aspectRatio / 2,
    mapSize / 2, -mapSize / 2,
    1, 1000
);
camera.position.set(0, 150, 0); // Câmera bem acima
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Para sombras mais suaves

// --- LUZES ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(100, 100, 100); // Posição da luz para uma sombra mais pronunciada
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -mapSize / 2;
dirLight.shadow.camera.right = mapSize / 2;
dirLight.shadow.camera.top = mapSize / 2;
dirLight.shadow.camera.bottom = -mapSize / 2;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 500;
dirLight.shadow.camera.updateProjectionMatrix();
scene.add(dirLight);

// --- OBJETOS DO JOGO ---
const atelierCorners = [];
let currentCornerType = null;
let highlightedCorner = null; // Para controlar o cantinho destacado

// Materiais para destaque (Rosa Neon)
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFC0CB, // Rosa claro
    emissive: 0xFF69B4, // Rosa choque
    emissiveIntensity: 1.5 // Intensidade do brilho
});

// --- JOGADOR (CARRINHO) ---
const yarnBall = new THREE.Mesh(
    new THREE.SphereGeometry(3, 32, 32), // Uma esfera para a bola de novelo
    new THREE.MeshStandardMaterial({ color: 0xFFB6C1 }) // Rosa claro para o novelo
);
yarnBall.castShadow = true;

const player = new THREE.Group();
player.add(yarnBall);
player.position.set(0, 2.6, 0);
scene.add(player);

// Propriedades de movimento do jogador
player.velocity = new THREE.Vector3(0, 0, 0);

// --- CRIAÇÃO DO MAPA ---
function createMap() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(mapSize, mapSize),
        new THREE.MeshStandardMaterial({ color: 0xE6E6FA }) // Lavanda, para o chão do ateliê
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xC71585 }); // MediumVioletRed, para os caminhos

    // Caminhos (antes estradas)
    const pathWidth = 20;
    const pathLength = mapSize / 2 - 20; // Ajusta para o tamanho do cantinho

    const horizontalPath = new THREE.Mesh(
        new THREE.BoxGeometry(pathLength * 2, 5.0, pathWidth),
        pathMaterial
    );
    horizontalPath.position.y = 0.1; // Eleva ligeiramente o caminho acima do chão
    horizontalPath.receiveShadow = true;
    scene.add(horizontalPath);

    const verticalPath = new THREE.Mesh(
        new THREE.BoxGeometry(pathWidth, 5.0, pathLength * 2),
        pathMaterial
    );
    verticalPath.position.y = 0.1; // Eleva ligeiramente o caminho acima do chão
    verticalPath.receiveShadow = true;
    scene.add(verticalPath);

    // Cantinhos de Ateliê (antes Garagens)
    const cornerSize = 30;
    const cornerOffset = mapSize / 2 - cornerSize / 2;

    const cornerData = [
        { x: 0, z: cornerOffset, type: 'login', label: 'MEUS PROJETOS', url: 'https://example.com/login', color: 0xDDA0DD }, // Plum
        { x: 0, z: -cornerOffset, type: 'about', label: 'SOBRE O ATELIÊ', url: 'https://example.com/about', color: 0xE6A8D7 }, // Orchid Pink
        { x: cornerOffset, z: 0, type: 'courses', label: 'WORKSHOPS', url: 'https://example.com/courses', color: 0xC8A2C8 }, // Lilac
        { x: -cornerOffset, z: 0, type: 'products', label: 'MATERIAIS', url: 'https://example.com/products', color: 0xB57EDC }, // Medium Purple
    ];

    cornerData.forEach(data => {
        const corner = new THREE.Mesh(
            new THREE.OctahedronGeometry(15, 0), // Estrela (Octahedron) com raio 15 e sem detalhes
            new THREE.MeshStandardMaterial({ color: data.color }) // Usa a cor específica do cantinho
        );
        corner.position.set(data.x, 15, data.z); // Ajusta a posição Y para o centro do octahedron
        corner.receiveShadow = true;
        corner.userData.type = data.type;
        corner.userData.url = data.url;
        corner.userData.label = data.label;
        corner.userData.htmlLabel = atelierLabels[data.type]; // Referência ao elemento HTML do ateliê
        corner.userData.originalMaterial = corner.material;
        scene.add(corner);
        atelierCorners.push(corner);
    });
}

// --- CONTROLES E FÍSICA ---
const keyState = {};
const activeMobileKeys = new Set(); // New Set to track active mobile button presses
const clock = new THREE.Clock();
const playerSpeed = 30;

window.addEventListener('keydown', (e) => { keyState[e.code] = true; });
window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    if (e.code === 'Space' && currentCornerType) { // Interage com Espaço
        openPage(currentCornerType);
    }
});

window.addEventListener('blur', () => {
    // Reset all key states when the window loses focus
    for (const key in keyState) {
        keyState[key] = false;
    }
    activeMobileKeys.clear(); // Clear active mobile keys as well
});

// Mobile controls event listeners
const setupMobileButton = (button, key) => {
    button.addEventListener('touchstart', (e) => { e.preventDefault(); activeMobileKeys.add(key); });
    button.addEventListener('touchend', () => { activeMobileKeys.delete(key); });
    button.addEventListener('touchcancel', () => { activeMobileKeys.delete(key); });
    button.addEventListener('mousedown', (e) => { e.preventDefault(); activeMobileKeys.add(key); });
    button.addEventListener('mouseup', () => { activeMobileKeys.delete(key); });
    button.addEventListener('mouseleave', () => { activeMobileKeys.delete(key); });
};

setupMobileButton(upBtn, 'ArrowUp');
setupMobileButton(downBtn, 'ArrowDown');
setupMobileButton(leftBtn, 'ArrowLeft');
setupMobileButton(rightBtn, 'ArrowRight');

actionBtn.addEventListener('click', () => {
    if (currentCornerType) {
        openPage(currentCornerType);
    }
});

function updatePlayerMovement() {
    const dt = clock.getDelta();
    const moveDirection = new THREE.Vector3(0, 0, 0);

    if (keyState['KeyW'] || keyState['ArrowUp'] || activeMobileKeys.has('ArrowUp')) moveDirection.z = -1;
    if (keyState['KeyS'] || keyState['ArrowDown'] || activeMobileKeys.has('ArrowDown')) moveDirection.z = 1;
    if (keyState['KeyA'] || keyState['ArrowLeft'] || activeMobileKeys.has('ArrowLeft')) moveDirection.x = -1;
    if (keyState['KeyD'] || keyState['ArrowRight'] || activeMobileKeys.has('ArrowRight')) moveDirection.x = 1;
    moveDirection.normalize();

    player.velocity.x = moveDirection.x * playerSpeed;
    player.velocity.z = moveDirection.z * playerSpeed;

    player.position.x += player.velocity.x * dt;
    player.position.z += player.velocity.z * dt;

    // Rotação da bola de novelo (simula rolamento)
    if (moveDirection.lengthSq() > 0.01) { // Só gira se estiver se movendo
        // Calcula a rotação com base na direção do movimento
        const rotationAxis = new THREE.Vector3(-moveDirection.z, 0, moveDirection.x).normalize();
        const rotationAngle = (player.velocity.length() * dt) / (3); // 3 é o raio da esfera
        player.children[0].rotateOnWorldAxis(rotationAxis, rotationAngle);
    }

    // Limita o jogador dentro do mapa
    const halfMap = mapSize / 2 - 5; // Margem para não sair completamente
    player.position.x = Math.max(-halfMap, Math.min(halfMap, player.position.x));
    player.position.z = Math.max(-halfMap, Math.min(halfMap, player.position.z));

    checkCornerInteraction(); // Renomeado
}

const tempV = new THREE.Vector3(); // Vetor temporário para evitar alocações repetidas
function updateCornerLabels() { // Renomeado
    atelierCorners.forEach(corner => {
        const label = corner.userData.htmlLabel;
        if (!label) return;

        // Obtém a posição 3D do cantinho
        corner.updateWorldMatrix(true, false);
        tempV.setFromMatrixPosition(corner.matrixWorld);

        // Projeta a posição 3D para a tela 2D
        tempV.project(camera);

        // Converte para coordenadas de pixel
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        let y = (-tempV.y * 0.5 + 0.5) * window.innerHeight; 

        // Ajuste manual para cada label para evitar sobreposição com header/footer
        // Aumentando os offsets para garantir visibilidade
        if (corner.userData.type === 'login') { // Cantinho de cima (Z positivo)
            y -= 20; // Move mais para cima
        } else if (corner.userData.type === 'about') { // Cantinho de baixo (Z negativo)
            y += 20; // Move mais para baixo
        } else if (corner.userData.type === 'courses') { // Cantinho da direita (X positivo)
            y -= 20; // Pequeno ajuste para cima
        } else if (corner.userData.type === 'products') { // Cantinho da esquerda (X negativo)
            y -= 20; // Pequeno ajuste para cima
        }

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        // Verifica se o cantinho está visível na tela
        const isVisible = tempV.z > -1 && tempV.z < 1; // Dentro do frustum da câmera
        label.classList.toggle('hidden', !isVisible); // Labels are always visible if in camera frustum
    });
}

function checkCornerInteraction() { // Renomeado
    let foundCorner = null; // Armazena o cantinho encontrado
    const playerBox = new THREE.Box3().setFromObject(player);

    for (const corner of atelierCorners) { // Iterar sobre 'atelierCorners'
        const cornerBox = new THREE.Box3().setFromObject(corner);
        if (playerBox.intersectsBox(cornerBox)) {
            foundCorner = corner;
            break;
        }
    }

    if (foundCorner) {
        currentCornerType = foundCorner.userData.type;
        // Destaca o cantinho
        if (highlightedCorner !== foundCorner) {
            if (highlightedCorner) {
                highlightedCorner.material = highlightedCorner.userData.originalMaterial;
            }
            highlightedCorner = foundCorner;
            highlightedCorner.material = highlightMaterial;
        }
        // Mostra o prompt de interação
        promptText.innerText = `Pressione Espaço para acessar ${foundCorner.userData.label}`;
        interactionPrompt.classList.remove('hidden');
    } else {
        currentCornerType = null;
        // Remove o destaque do cantinho
        if (highlightedCorner) {
            highlightedCorner.material = highlightedCorner.userData.originalMaterial;
            highlightedCorner = null;
        }
        // Esconde o prompt de interação
        interactionPrompt.classList.add('hidden');
    }
}

function openPage(type) {
    const corner = atelierCorners.find(g => g.userData.type === type); // Buscar em 'atelierCorners'
    if (corner && corner.userData.url) {
        window.open(corner.userData.url, '_blank');
        infoTitle.innerText = `Acessando ${corner.userData.label}`;
        infoContent.innerText = `Abrindo ${corner.userData.url} em uma nova aba.`;
        infoDisplay.classList.remove('hidden');
    }
}

// --- LOOP PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);
    updatePlayerMovement();
    updateCornerLabels(); // Garante que os rótulos sejam atualizados a cada frame
    renderer.render(scene, camera);
}

// --- INICIALIZAÇÃO ---
createMap();
animate();

// --- REDIMENSIONAMENTO ---
window.addEventListener('resize', () => {
    const newAspectRatio = window.innerWidth / window.innerHeight;
    let viewWidth = mapSize;
    let viewHeight = mapSize;

    if (newAspectRatio > 1) { // Wider than tall
        viewWidth = mapSize * newAspectRatio;
    } else { // Taller than wide
        viewHeight = mapSize / newAspectRatio;
    }

    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    handleMobileControlsVisibility(); // Update mobile controls visibility on resize
});

function handleMobileControlsVisibility() {
    const mobileControls = document.getElementById('mobile-controls');
    if (window.innerWidth <= 768) { // Matches the media query breakpoint
        mobileControls.classList.remove('hidden');
    } else {
        mobileControls.classList.add('hidden');
        // Reset keyState when mobile controls are hidden
        for (const key in keyState) {
            keyState[key] = false;
        }
    }
}

// Initial call to set up mobile controls visibility
handleMobileControlsVisibility();

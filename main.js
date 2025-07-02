//FAZ A IMPORTAÇÃO DA BIBLIOTECA
import * as THREE from 'three';

// --- ELEMENTOS DA UI ---
const infoDisplay = document.getElementById('info-display');
const infoTitle = document.getElementById('info-title');
const infoContent = document.getElementById('info-content');
const closeInfoButton = document.getElementById('close-info');

const interactionPrompt = document.getElementById('interaction-prompt');
const promptText = document.getElementById('prompt-text');

const garageLabels = {
    login: document.getElementById('label-login'),
    about: document.getElementById('label-about'),
    courses: document.getElementById('label-courses'),
    products: document.getElementById('label-products'),
};

closeInfoButton.addEventListener('click', () => {
    infoDisplay.classList.add('hidden');
});

// --- SETUP DA CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4CAF50); // Gramado

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

// --- LUZES ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// --- OBJETOS DO JOGO ---
const garages = [];
let currentGarageType = null;
let highlightedGarage = null; // Para controlar a garagem destacada

// Materiais para destaque (Preto Neon)
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x050505, // Cor base muito escura
    emissive: 0x330033, // Brilho roxo escuro
    emissiveIntensity: 1.5 // Intensidade do brilho
});

// --- JOGADOR (CARRINHO) ---
const carBody = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x0077ff }) // Cor do corpo do carro
);
carBody.castShadow = true;

const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 }); // Rodas pretas
const wheelGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);

const wheel1 = new THREE.Mesh(wheelGeometry, wheelMaterial);
wheel1.rotation.x = Math.PI / 2;
wheel1.position.set(-3, -1, 2);
carBody.add(wheel1);

const wheel2 = wheel1.clone();
wheel2.position.x = 3;
carBody.add(wheel2);

const wheel3 = wheel1.clone();
wheel3.position.z = -2;
carBody.add(wheel3);

const wheel4 = wheel2.clone();
wheel4.position.z = -2;
carBody.add(wheel4);

const player = new THREE.Group();
player.add(carBody);
player.position.set(0, 1, 0);
scene.add(player);

// Propriedades de movimento do jogador
player.velocity = new THREE.Vector3(0, 0, 0);

// --- CRIAÇÃO DO MAPA ---
function createMap() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(mapSize, mapSize),
        new THREE.MeshStandardMaterial({ color: 0x4CAF50 }) // Cor do gramado
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // Estradas
    const roadWidth = 20;
    const roadLength = mapSize / 2 - 20; // Ajusta para o tamanho da garagem

    const horizontalRoad = new THREE.Mesh(
        new THREE.BoxGeometry(roadLength * 2, 0.5, roadWidth),
        roadMaterial
    );
    horizontalRoad.receiveShadow = true;
    scene.add(horizontalRoad);

    const verticalRoad = new THREE.Mesh(
        new THREE.BoxGeometry(roadWidth, 0.5, roadLength * 2),
        roadMaterial
    );
    verticalRoad.receiveShadow = true;
    scene.add(verticalRoad);

    // Garagens
    const garageSize = 30;
    const garageOffset = mapSize / 2 - garageSize / 2;

    const garageData = [
        { x: 0, z: garageOffset, type: 'login', label: 'LOGIN', url: 'https://example.com/login', color: 0xff0000 }, // Vermelho
        { x: 0, z: -garageOffset, type: 'about', label: 'SOBRE NÓS', url: 'https://example.com/about', color: 0x0000ff }, // Azul
        { x: garageOffset, z: 0, type: 'courses', label: 'CURSOS', url: 'https://example.com/courses', color: 0x00ff00 }, // Verde
        { x: -garageOffset, z: 0, type: 'products', label: 'PRODUTOS', url: 'https://example.com/products', color: 0xffff00 }, // Amarelo
    ];

    garageData.forEach(data => {
        const garage = new THREE.Mesh(
            new THREE.BoxGeometry(garageSize, 10, garageSize),
            new THREE.MeshStandardMaterial({ color: data.color }) // Usa a cor específica da garagem
        );
        garage.position.set(data.x, 5, data.z);
        garage.receiveShadow = true;
        garage.userData.type = data.type;
        garage.userData.url = data.url; // Armazena a URL
        garage.userData.label = data.label; // Armazena o label para o popup
        garage.userData.htmlLabel = garageLabels[data.type]; // Referência ao elemento HTML
        garage.userData.originalMaterial = garage.material; // Armazena o material original
        scene.add(garage);
        garages.push(garage);
    });
}

// --- CONTROLES E FÍSICA ---
const keyState = {};
const clock = new THREE.Clock();
const playerSpeed = 30;

window.addEventListener('keydown', (e) => { keyState[e.code] = true; });
window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    if (e.code === 'Space' && currentGarageType) { // Interage com Espaço
        openPage(currentGarageType);
    }
});

function updatePlayerMovement() {
    const dt = clock.getDelta();
    const moveDirection = new THREE.Vector3(0, 0, 0);

    if (keyState['KeyW'] || keyState['ArrowUp']) moveDirection.z = -1;
    if (keyState['KeyS'] || keyState['ArrowDown']) moveDirection.z = 1;
    if (keyState['KeyA'] || keyState['ArrowLeft']) moveDirection.x = -1;
    if (keyState['KeyD'] || keyState['ArrowRight']) moveDirection.x = 1;
    moveDirection.normalize();

    player.velocity.x = moveDirection.x * playerSpeed;
    player.velocity.z = moveDirection.z * playerSpeed;

    player.position.x += player.velocity.x * dt;
    player.position.z += player.velocity.z * dt;

    // Rotação do carrinho
    if (moveDirection.lengthSq() > 0.01) { // Só gira se estiver se movendo
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        player.rotation.y = angle; // Gira o carrinho para a direção do movimento
    }

    // Limita o jogador dentro do mapa
    const halfMap = mapSize / 2 - 5; // Margem para não sair completamente
    player.position.x = Math.max(-halfMap, Math.min(halfMap, player.position.x));
    player.position.z = Math.max(-halfMap, Math.min(halfMap, player.position.z));

    checkGarageInteraction();
}

const tempV = new THREE.Vector3(); // Vetor temporário para evitar alocações repetidas
function updateGarageLabels() {
    garages.forEach(garage => {
        const label = garage.userData.htmlLabel;
        if (!label) return;

        // Obtém a posição 3D da garagem
        garage.updateWorldMatrix(true, false);
        tempV.setFromMatrixPosition(garage.matrixWorld);

        // Projeta a posição 3D para a tela 2D
        tempV.project(camera);

        // Converte para coordenadas de pixel
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        let y = (-tempV.y * 0.5 + 0.5) * window.innerHeight; 

        // Ajuste manual para cada label para evitar sobreposição com header/footer
        // Aumentando os offsets para garantir visibilidade
        if (garage.userData.type === 'login') { // Garagem de cima (Z positivo)
            y -= 20; // Move mais para cima
        } else if (garage.userData.type === 'about') { // Garagem de baixo (Z negativo)
            y += 20; // Move mais para baixo
        } else if (garage.userData.type === 'courses') { // Garagem da direita (X positivo)
            y -= 20; // Pequeno ajuste para cima
        } else if (garage.userData.type === 'products') { // Garagem da esquerda (X negativo)
            y -= 20; // Pequeno ajuste para cima
        }

        label.style.left = `${x}px`;
        label.style.top = `${y}px`;

        // Verifica se a garagem está visível na tela
        const isVisible = tempV.z > -1 && tempV.z < 1; // Dentro do frustum da câmera
        label.classList.toggle('hidden', !isVisible);
    });
}

function checkGarageInteraction() {
    let foundGarage = null; // Armazena a garagem encontrada
    const playerBox = new THREE.Box3().setFromObject(player);

    for (const garage of garages) {
        const garageBox = new THREE.Box3().setFromObject(garage);
        if (playerBox.intersectsBox(garageBox)) {
            foundGarage = garage;
            break;
        }
    }

    if (foundGarage) {
        currentGarageType = foundGarage.userData.type;
        // Destaca a garagem
        if (highlightedGarage !== foundGarage) {
            if (highlightedGarage) {
                highlightedGarage.material = highlightedGarage.userData.originalMaterial;
            }
            highlightedGarage = foundGarage;
            highlightedGarage.material = highlightMaterial;
        }
        // Mostra o prompt de interação
        promptText.innerText = `Pressione Espaço para acessar ${foundGarage.userData.label}`;
        interactionPrompt.classList.remove('hidden');
    } else {
        currentGarageType = null;
        // Remove o destaque da garagem
        if (highlightedGarage) {
            highlightedGarage.material = highlightedGarage.userData.originalMaterial;
            highlightedGarage = null;
        }
        // Esconde o prompt de interação
        interactionPrompt.classList.add('hidden');
    }
}

function openPage(type) {
    const garage = garages.find(g => g.userData.type === type);
    if (garage && garage.userData.url) {
        window.open(garage.userData.url, '_blank');
        infoTitle.innerText = `Acessando ${garage.userData.label}`;
        infoContent.innerText = `Abrindo ${garage.userData.url} em uma nova aba.`;
        infoDisplay.classList.remove('hidden');
    }
}

// --- LOOP PRINCIPAL ---
function animate() {
    requestAnimationFrame(animate);
    updatePlayerMovement();
    updateGarageLabels(); // Garante que os rótulos sejam atualizados a cada frame
    renderer.render(scene, camera);
}

// --- INICIALIZAÇÃO ---
createMap();
animate();

// --- REDIMENSIONAMENTO ---
window.addEventListener('resize', () => {
    const newAspectRatio = window.innerWidth / window.innerHeight;
    camera.left = -mapSize * newAspectRatio / 2;
    camera.right = mapSize * newAspectRatio / 2;
    camera.top = mapSize / 2;
    camera.bottom = -mapSize / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Dispara o evento resize uma vez para configurar a câmera corretamente no carregamento inicial
// window.dispatchEvent(new Event('resize')); // Removido para evitar problemas de inicialização

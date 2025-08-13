// Elementos do DOM
const mainMenu = document.getElementById('main-menu');
const characterSelect = document.getElementById('character-select');
const gameContainer = document.getElementById('game-container');
const singlePlayerBtn = document.getElementById('single-player-btn');
const twoPlayersBtn = document.getElementById('two-players-btn');
const startFightBtn = document.getElementById('start-fight-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');
const gameOverScreen = document.getElementById('game-over');
const winnerText = document.getElementById('winner-text');
const roundScreen = document.getElementById('round-screen');
const roundTextBig = document.getElementById('round-text-big');
const roundText = document.getElementById('round-text');
const timerElement = document.getElementById('timer');
const playerHealthBar = document.getElementById('player-health');
const enemyHealthBar = document.getElementById('enemy-health');
const hitEffectsContainer = document.getElementById('hit-effects-container');
const characterCards = document.querySelectorAll('.character-card');

// Controles touch
const p1LeftBtn = document.getElementById('p1-left');
const p1RightBtn = document.getElementById('p1-right');
const p1UpBtn = document.getElementById('p1-up');
const p1AttackBtn = document.getElementById('p1-attack');
const p2LeftBtn = document.getElementById('p2-left');
const p2RightBtn = document.getElementById('p2-right');
const p2UpBtn = document.getElementById('p2-up');
const p2AttackBtn = document.getElementById('p2-attack');

// Sons
const punchSound = document.getElementById('punch-sound');
const jumpSound = document.getElementById('jump-sound');
const bgMusic = document.getElementById('bg-music');
const roundSound = document.getElementById('round-sound');
const winSound = document.getElementById('win-sound');

// Canvas
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Ajustar tamanho do canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Constantes do jogo
const GRAVITY = 0.7;
const ROUND_TIME = 99; // Segundos
const TOTAL_ROUNDS = 3;
const PLAYER_SPEED = 5;
const JUMP_FORCE = 20;
const ATTACK_DAMAGE = 10;

// Variáveis do jogo
let gameRunning = false;
let gameInterval;
let timerInterval;
let currentRound = 1;
let timer = ROUND_TIME;
let playerScore = 0;
let enemyScore = 0;
let gameMode = '2players'; // 'single' ou '2players'
let lastTime = 0;
let frameCount = 0;
let fps = 0;
let selectedPlayerCharacter = 'ryu';
let selectedEnemyCharacter = 'ken';
let selectingPlayer = 1; // 1 ou 2 para seleção de jogadores

// Spritesheets para os personagens
const spritesheets = {
    ryu: {
        idle: { frames: 4, img: new Image(), src: 'https://i.imgur.com/X1vzLYK.png' },
        walk: { frames: 6, img: new Image(), src: 'https://i.imgur.com/Y6vqQ9x.png' },
        jump: { frames: 3, img: new Image(), src: 'https://i.imgur.com/Z3Qk9fD.png' },
        attack: { frames: 5, img: new Image(), src: 'https://i.imgur.com/V7nH5Wz.png' }
    },
    ken: {
        idle: { frames: 4, img: new Image(), src: 'https://i.imgur.com/Ll5Tk0P.png' },
        walk: { frames: 6, img: new Image(), src: 'https://i.imgur.com/M9vzV2q.png' },
        jump: { frames: 3, img: new Image(), src: 'https://i.imgur.com/J4Q8n0R.png' },
        attack: { frames: 5, img: new Image(), src: 'https://i.imgur.com/K3Qv7Xz.png' }
    }
};

// Carregar sprites
function loadSprites() {
    for (const char in spritesheets) {
        for (const action in spritesheets[char]) {
            spritesheets[char][action].img.src = spritesheets[char][action].src;
        }
    }
}

loadSprites();

// Classe Fighter
class Fighter {
    constructor({ position, velocity, character, name, controls }) {
        this.position = position;
        this.velocity = velocity;
        this.character = character;
        this.width = 80;
        this.height = 150;
        this.name = name;
        this.isGrounded = false;
        this.health = 100;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.facingRight = name === 'player';
        this.controls = controls;
        this.state = 'idle';
        this.animationFrame = 0;
        this.frameCount = 0;
        this.frameDelay = 5;
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            width: 60,
            height: 40,
            offset: 20
        };
    }

    draw() {
        // Selecionar a animação correta
        let animation;
        switch(this.state) {
            case 'walking': animation = spritesheets[this.character].walk; break;
            case 'jumping': animation = spritesheets[this.character].jump; break;
            case 'attacking': animation = spritesheets[this.character].attack; break;
            default: animation = spritesheets[this.character].idle;
        }

        // Calcular frame atual
        this.frameCount++;
        if (this.frameCount >= this.frameDelay) {
            this.animationFrame = (this.animationFrame + 1) % animation.frames;
            this.frameCount = 0;
        }

        // Desenhar sprite
        ctx.save();
        if (!this.facingRight) {
            ctx.translate(this.position.x + this.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(
                animation.img,
                this.animationFrame * this.width, 0,
                this.width, this.height,
                0, this.position.y,
                this.width, this.height
            );
        } else {
            ctx.drawImage(
                animation.img,
                this.animationFrame * this.width, 0,
                this.width, this.height,
                this.position.x, this.position.y,
                this.width, this.height
            );
        }
        ctx.restore();

        // Desenhar hitbox de ataque (para debug)
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(
                this.attackBox.position.x,
                this.attackBox.position.y,
                this.attackBox.width,
                this.attackBox.height
            );
        }
    }

    update() {
        this.draw();
        
        // Atualizar posição
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Atualizar caixa de ataque
        if (this.facingRight) {
            this.attackBox.position.x = this.position.x + this.width - this.attackBox.offset;
        } else {
            this.attackBox.position.x = this.position.x - this.attackBox.width + this.attackBox.offset;
        }
        this.attackBox.position.y = this.position.y + 30;

        // Aplicar gravidade
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 50) {
            this.velocity.y = 0;
            this.position.y = canvas.height - this.height - 50;
            this.isGrounded = true;
            
            if (this.state === 'jumping') {
                this.state = 'idle';
            }
        } else {
            this.velocity.y += GRAVITY;
            this.isGrounded = false;
        }

        // Limites da tela
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > canvas.width) {
            this.position.x = canvas.width - this.width;
        }

        // Cooldown de ataque
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }

    attack() {
        if (this.attackCooldown <= 0) {
            this.isAttacking = true;
            this.state = 'attacking';
            this.attackCooldown = 20;
            this.lastAttackTime = Date.now();
            
            punchSound.currentTime = 0;
            punchSound.play();
            
            setTimeout(() => {
                this.isAttacking = false;
                if (this.isGrounded) {
                    this.state = 'idle';
                }
            }, 200);
        }
    }

    jump() {
        if (this.isGrounded) {
            this.velocity.y = -JUMP_FORCE;
            this.isGrounded = false;
            this.state = 'jumping';
            
            jumpSound.currentTime = 0;
            jumpSound.play();
        }
    }

    reset() {
        this.health = 100;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.state = 'idle';
        
        if (this.name === 'player') {
            this.position.x = 100;
            this.facingRight = true;
        } else {
            this.position.x = canvas.width - 100 - this.width;
            this.facingRight = false;
        }
        
        this.position.y = canvas.height - this.height - 50;
        this.velocity = { x: 0, y: 0 };
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        // Atualizar barra de saúde
        if (this.name === 'player') {
            playerHealthBar.style.width = `${this.health}%`;
            document.querySelector('.player-name').textContent = this.character.toUpperCase();
        } else {
            enemyHealthBar.style.width = `${this.health}%`;
            document.querySelector('.enemy-name').textContent = this.character.toUpperCase();
        }
        
        // Criar efeito de hit
        createHitEffect(this.position.x + this.width/2, this.position.y + this.height/2);
    }
}

// Criar lutadores (serão inicializados após seleção de personagens)
let player;
let enemy;

// Controles
const keys = {
    a: { pressed: false },
    d: { pressed: false },
    w: { pressed: false },
    s: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowRight: { pressed: false },
    ArrowUp: { pressed: false },
    ArrowDown: { pressed: false }
};

// Funções de utilidade
function rectangularCollision(rect1, rect2) {
    return (
        rect1.position.x + rect1.width >= rect2.position.x &&
        rect1.position.x <= rect2.position.x + rect2.width &&
        rect1.position.y + rect1.height >= rect2.position.y &&
        rect1.position.y <= rect2.position.y + rect2.height
    );
}

function attackCollision(attacker, defender) {
    return (
        attacker.attackBox.position.x + attacker.attackBox.width >= defender.position.x &&
        attacker.attackBox.position.x <= defender.position.x + defender.width &&
        attacker.attackBox.position.y + attacker.attackBox.height >= defender.position.y &&
        attacker.attackBox.position.y <= defender.position.y + defender.height
    );
}

function createHitEffect(x, y) {
    const hitEffect = document.createElement('div');
    hitEffect.className = 'hit-effect';
    hitEffect.style.left = `${x - 50}px`;
    hitEffect.style.top = `${y - 50}px`;
    hitEffectsContainer.appendChild(hitEffect);
    
    // Animação
    let opacity = 1;
    let size = 1;
    const effectInterval = setInterval(() => {
        opacity -= 0.05;
        size += 0.05;
        hitEffect.style.opacity = opacity;
        hitEffect.style.transform = `scale(${size})`;
        
        if (opacity <= 0) {
            clearInterval(effectInterval);
            hitEffect.remove();
        }
    }, 30);
}

// Funções do jogo
function updateTimer() {
    timer--;
    timerElement.textContent = timer;
    
    if (timer <= 0) {
        endRound();
    }
}

function showRoundScreen() {
    roundTextBig.textContent = `Round ${currentRound}`;
    roundScreen.style.display = 'flex';
    
    roundSound.currentTime = 0;
    roundSound.play();
    
    setTimeout(() => {
        roundScreen.style.display = 'none';
        startFighting();
    }, 2000);
}

function startFighting() {
    // Iniciar timer
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    
    // Iniciar música de fundo
    bgMusic.currentTime = 0;
    bgMusic.volume = 0.3;
    bgMusic.play();
    
    // Iniciar loop do jogo
    gameRunning = true;
    lastTime = performance.now();
    gameLoop(lastTime);
}

function startRound() {
    // Resetar lutadores
    player.reset();
    enemy.reset();
    
    // Resetar timer
    timer = ROUND_TIME;
    timerElement.textContent = timer;
    
    // Atualizar informações do round
    roundText.textContent = `Round ${currentRound}/${TOTAL_ROUNDS}`;
    
    // Mostrar tela de round
    showRoundScreen();
}

function endRound() {
    gameRunning = false;
    clearInterval(timerInterval);
    bgMusic.pause();
    
    // Determinar vencedor do round
    let roundWinner = null;
    
    if (player.health > enemy.health) {
        playerScore++;
        roundWinner = 'player';
    } else if (enemy.health > player.health) {
        enemyScore++;
        roundWinner = 'enemy';
    }
    
    // Verificar se o jogo acabou
    if (currentRound >= TOTAL_ROUNDS || playerScore >= 2 || enemyScore >= 2) {
        endGame();
    } else {
        currentRound++;
        setTimeout(startRound, 2000);
    }
}

function endGame() {
    // Determinar vencedor final
    let winner = null;
    
    if (playerScore > enemyScore) {
        winner = 'Player 1 (' + player.character.toUpperCase() + ')';
    } else if (enemyScore > playerScore) {
        if (gameMode === 'single') {
            winner = 'CPU (' + enemy.character.toUpperCase() + ')';
        } else {
            winner = 'Player 2 (' + enemy.character.toUpperCase() + ')';
        }
    } else {
        winner = 'Draw';
    }
    
    // Mostrar tela de game over
    if (winner === 'Draw') {
        winnerText.textContent = 'Draw!';
    } else {
        winnerText.textContent = `${winner} Wins!`;
    }
    
    winSound.currentTime = 0;
    winSound.play();
    
    gameOverScreen.style.display = 'flex';
}

function resetGame() {
    currentRound = 1;
    playerScore = 0;
    enemyScore = 0;
    gameOverScreen.style.display = 'none';
    startRound();
}

function returnToMainMenu() {
    gameOverScreen.style.display = 'none';
    gameContainer.style.display = 'none';
    characterSelect.style.display = 'none';
    mainMenu.style.display = 'flex';
    bgMusic.pause();
}

// Game Loop
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    // Calcular FPS
    frameCount++;
    if (timestamp >= lastTime + 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = timestamp;
    }
    
    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar fundo
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar chão
    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    // Atualizar jogadores
    player.update();
    enemy.update();
    
    // Movimentação do player
    player.velocity.x = 0;
    if (keys.a.pressed || keys.ArrowLeft.pressed) {
        player.velocity.x = -PLAYER_SPEED;
        player.facingRight = false;
        if (player.isGrounded) player.state = 'walking';
    } else if (keys.d.pressed || keys.ArrowRight.pressed) {
        player.velocity.x = PLAYER_SPEED;
        player.facingRight = true;
        if (player.isGrounded) player.state = 'walking';
    } else if (player.isGrounded) {
        player.state = 'idle';
    }
    
    // Movimentação do enemy
    if (gameMode === '2players') {
        enemy.velocity.x = 0;
        if (keys.ArrowLeft.pressed) {
            enemy.velocity.x = -PLAYER_SPEED;
            enemy.facingRight = false;
            if (enemy.isGrounded) enemy.state = 'walking';
        } else if (keys.ArrowRight.pressed) {
            enemy.velocity.x = PLAYER_SPEED;
            enemy.facingRight = true;
            if (enemy.isGrounded) enemy.state = 'walking';
        } else if (enemy.isGrounded) {
            enemy.state = 'idle';
        }
    } else {
        // IA simples para modo single player
        if (Math.random() < 0.01 && enemy.isGrounded) {
            enemy.jump();
        }
        
        if (Math.random() < 0.02) {
            enemy.attack();
        }
        
        enemy.velocity.x = 0;
        if (enemy.position.x > player.position.x + 100) {
            enemy.velocity.x = -PLAYER_SPEED * 0.7;
            enemy.facingRight = false;
            if (enemy.isGrounded) enemy.state = 'walking';
        } else if (enemy.position.x < player.position.x - 100) {
            enemy.velocity.x = PLAYER_SPEED * 0.7;
            enemy.facingRight = true;
            if (enemy.isGrounded) enemy.state = 'walking';
        } else if (enemy.isGrounded) {
            enemy.state = 'idle';
        }
    }
    
    // Verificar colisões de ataque
    if (player.isAttacking && attackCollision(player, enemy)) {
        if (Date.now() - player.lastAttackTime < 200) { // Prevenir múltiplos hits
            enemy.takeDamage(ATTACK_DAMAGE);
            if (enemy.health <= 0) {
                endRound();
            }
        }
    }
    
    if (enemy.isAttacking && attackCollision(enemy, player)) {
        if (Date.now() - enemy.lastAttackTime < 200) {
            player.takeDamage(ATTACK_DAMAGE);
            if (player.health <= 0) {
                endRound();
            }
        }
    }
    
    // Continuar o loop
    gameInterval = requestAnimationFrame(gameLoop);
}

// Event Listeners
twoPlayersBtn.addEventListener('click', () => {
    gameMode = '2players';
    selectingPlayer = 1;
    selectedPlayerCharacter = null;
    selectedEnemyCharacter = null;
    document.querySelector('.select-title').textContent = 'Player 1 - Select Your Fighter';
    mainMenu.style.display = 'none';
    characterSelect.style.display = 'flex';
    // Desselecionar todos os cards
    characterCards.forEach(card => card.classList.remove('selected'));
});

singlePlayerBtn.addEventListener('click', () => {
    gameMode = 'single';
    selectingPlayer = 1;
    selectedPlayerCharacter = null;
    selectedEnemyCharacter = null;
    document.querySelector('.select-title').textContent = 'Select Your Fighter';
    mainMenu.style.display = 'none';
    characterSelect.style.display = 'flex';
    // Desselecionar todos os cards
    characterCards.forEach(card => card.classList.remove('selected'));
});

// Seleção de personagens
characterCards.forEach(card => {
    card.addEventListener('click', () => {
        if (gameMode === 'single') {
            // Modo single player - seleciona apenas o jogador
            selectedPlayerCharacter = card.dataset.character;
            // Seleciona um personagem aleatório para o inimigo
            const characters = ['ryu', 'ken'];
            selectedEnemyCharacter = characters[Math.floor(Math.random() * characters.length)];
            // Desselecionar todos e selecionar apenas este
            characterCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        } else {
            // Modo 2 players - alterna entre seleção de player 1 e player 2
            if (selectingPlayer === 1) {
                selectedPlayerCharacter = card.dataset.character;
                selectingPlayer = 2;
                document.querySelector('.select-title').textContent = 'Player 2 - Select Your Fighter';
                // Desselecionar todos e selecionar apenas este
                characterCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            } else {
                selectedEnemyCharacter = card.dataset.character;
                // Desselecionar todos e selecionar apenas este
                characterCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        }
    });
});

startFightBtn.addEventListener('click', () => {
    if ((gameMode === '2players' && selectedPlayerCharacter && selectedEnemyCharacter) || 
        (gameMode === 'single' && selectedPlayerCharacter)) {
        
        // Criar os lutadores com os personagens selecionados
        player = new Fighter({
            position: { x: 100, y: 0 },
            velocity: { x: 0, y: 0 },
            character: selectedPlayerCharacter,
            name: 'player',
            controls: {
                left: 'a',
                right: 'd',
                jump: 'w',
                attack: 's'
            }
        });

        enemy = new Fighter({
            position: { x: canvas.width - 100 - 80, y: 0 }, // 80 é a largura do personagem
            velocity: { x: 0, y: 0 },
            character: selectedEnemyCharacter,
            name: 'enemy',
            controls: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                jump: 'ArrowUp',
                attack: 'ArrowDown'
            }
        });

        // Atualizar nomes na HUD
        document.querySelector('.player-name').textContent = selectedPlayerCharacter.toUpperCase();
        document.querySelector('.enemy-name').textContent = selectedEnemyCharacter.toUpperCase();

        // Iniciar o jogo
        characterSelect.style.display = 'none';
        gameContainer.style.display = 'block';
        startRound();
    } else {
        alert('Please select characters for both players!');
    }
});

playAgainBtn.addEventListener('click', resetGame);
mainMenuBtn.addEventListener('click', returnToMainMenu);

// Controles de teclado
window.addEventListener('keydown', (event) => {
    if (!player || !enemy) return;
    
    switch (event.key) {
        // Player controls
        case 'a':
            keys.a.pressed = true;
            break;
        case 'd':
            keys.d.pressed = true;
            break;
        case 'w':
            if (!keys.w.pressed && player.isGrounded) {
                player.jump();
            }
            keys.w.pressed = true;
            break;
        case 's':
            if (!keys.s.pressed) {
                player.attack();
            }
            keys.s.pressed = true;
            break;
        
        // Enemy controls
        case 'ArrowLeft':
            keys.ArrowLeft.pressed = true;
            break;
        case 'ArrowRight':
            keys.ArrowRight.pressed = true;
            break;
        case 'ArrowUp':
            if (!keys.ArrowUp.pressed && enemy.isGrounded) {
                enemy.jump();
            }
            keys.ArrowUp.pressed = true;
            break;
        case 'ArrowDown':
            if (!keys.ArrowDown.pressed) {
                enemy.attack();
            }
            keys.ArrowDown.pressed = true;
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        // Player controls
        case 'a':
            keys.a.pressed = false;
            break;
        case 'd':
            keys.d.pressed = false;
            break;
        case 'w':
            keys.w.pressed = false;
            break;
        case 's':
            keys.s.pressed = false;
            break;
        
        // Enemy controls
        case 'ArrowLeft':
            keys.ArrowLeft.pressed = false;
            break;
        case 'ArrowRight':
            keys.ArrowRight.pressed = false;
            break;
        case 'ArrowUp':
            keys.ArrowUp.pressed = false;
            break;
        case 'ArrowDown':
            keys.ArrowDown.pressed = false;
            break;
    }
});

// Controles touch
function setupTouchControls() {
    // Player 1
    p1LeftBtn.addEventListener('touchstart', () => { keys.a.pressed = true; });
    p1LeftBtn.addEventListener('touchend', () => { keys.a.pressed = false; });
    p1RightBtn.addEventListener('touchstart', () => { keys.d.pressed = true; });
    p1RightBtn.addEventListener('touchend', () => { keys.d.pressed = false; });
    p1UpBtn.addEventListener('touchstart', () => { 
        if (!keys.w.pressed && player && player.isGrounded) {
            player.jump();
        }
        keys.w.pressed = true; 
    });
    p1UpBtn.addEventListener('touchend', () => { keys.w.pressed = false; });
    p1AttackBtn.addEventListener('touchstart', () => { 
        if (!keys.s.pressed && player) {
            player.attack();
        }
        keys.s.pressed = true; 
    });
    p1AttackBtn.addEventListener('touchend', () => { keys.s.pressed = false; });

    // Player 2
    p2LeftBtn.addEventListener('touchstart', () => { keys.ArrowLeft.pressed = true; });
    p2LeftBtn.addEventListener('touchend', () => { keys.ArrowLeft.pressed = false; });
    p2RightBtn.addEventListener('touchstart', () => { keys.ArrowRight.pressed = true; });
    p2RightBtn.addEventListener('touchend', () => { keys.ArrowRight.pressed = false; });
    p2UpBtn.addEventListener('touchstart', () => { 
        if (!keys.ArrowUp.pressed && enemy && enemy.isGrounded) {
            enemy.jump();
        }
        keys.ArrowUp.pressed = true; 
    });
    p2UpBtn.addEventListener('touchend', () => { keys.ArrowUp.pressed = false; });
    p2AttackBtn.addEventListener('touchstart', () => { 
        if (!keys.ArrowDown.pressed && enemy) {
            enemy.attack();
        }
        keys.ArrowDown.pressed = true; 
    });
    p2AttackBtn.addEventListener('touchend', () => { keys.ArrowDown.pressed = false; });
}

// Inicialização
function init() {
    setupTouchControls();
}

init();
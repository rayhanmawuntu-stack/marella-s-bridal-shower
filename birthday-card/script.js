(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const canvas = $("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const gameScreen = $("#gameScreen");
  const cardScreen = $("#cardScreen");
  const gameFrame = $("#gameFrame");
  const startOverlay = $("#startOverlay");
  const startButton = $("#startButton");
  const jumpButton = $("#jumpButton");
  const skipButton = $("#skipButton");
  const replayButton = $("#replayButton");
  const celebrateButton = $("#celebrateButton");
  const scoreEl = $("#score");
  const highScoreEl = $("#highScore");
  const statusEl = $("#gameStatus");
  const confettiLayer = $("#confettiLayer");

  const params = new URLSearchParams(window.location.search);
  const cardCopy = {
    name: cleanText(params.get("name"), "You", 38),
    from: cleanText(params.get("from"), "Rayhan", 38),
    message: cleanText(
      params.get("message"),
      "I hope this new chapter brings you more calm mornings, loud laughs, lucky surprises, and the kind of happiness that stays.",
      280
    )
  };

  $("#recipientName").textContent = cardCopy.name;
  $("#senderName").textContent = cardCopy.from;
  $("#birthdayMessage").textContent = cardCopy.message;
  document.title = `Happy Birthday, ${cardCopy.name}!`;

  const world = {
    width: 960,
    height: 360,
    groundY: 294,
    speed: 7,
    running: false,
    finished: false,
    score: 0,
    lastTime: 0,
    nextObstacleAt: 600,
    distance: 0,
    giftSpawned: false,
    obstacles: [],
    particles: [],
    clouds: [
      { x: 130, y: 76, s: 1 },
      { x: 520, y: 116, s: .78 },
      { x: 810, y: 58, s: 1.15 }
    ]
  };

  const dino = {
    x: 105,
    y: world.groundY - 58,
    width: 54,
    height: 58,
    velocityY: 0,
    gravity: 1.08,
    jumpPower: -17.4,
    grounded: true,
    blink: 0,
    legFrame: 0
  };

  let animationId = 0;
  let highScore = Number(localStorage.getItem("birthdayRunnerHighScore") || 0);
  updateScoreboard();
  drawIdleScene();

  function cleanText(value, fallback, maxLength) {
    if (!value) return fallback;
    return value.trim().replace(/\s+/g, " ").slice(0, maxLength) || fallback;
  }

  function formatScore(number) {
    return Math.max(0, Math.floor(number)).toString().padStart(5, "0");
  }

  function updateScoreboard() {
    scoreEl.textContent = formatScore(world.score);
    highScoreEl.textContent = formatScore(highScore);
  }

  function resetGame() {
    cancelAnimationFrame(animationId);
    world.running = false;
    world.finished = false;
    world.score = 0;
    world.speed = 7;
    world.lastTime = 0;
    world.nextObstacleAt = 540;
    world.distance = 0;
    world.giftSpawned = false;
    world.obstacles = [];
    world.particles = [];
    dino.y = world.groundY - dino.height;
    dino.velocityY = 0;
    dino.grounded = true;
    gameFrame.classList.remove("is-running");
    startOverlay.classList.remove("is-hidden");
    startButton.textContent = "Start running";
    statusEl.textContent = "Ready when you are.";
    updateScoreboard();
    drawIdleScene();
  }

  function startGame() {
    if (world.running) return;
    world.running = true;
    world.finished = false;
    world.lastTime = performance.now();
    gameFrame.classList.add("is-running");
    startOverlay.classList.add("is-hidden");
    statusEl.textContent = "Run, jump, and find the surprise.";
    animationId = requestAnimationFrame(loop);
  }

  function jump() {
    if (!world.running) {
      startGame();
      return;
    }
    if (dino.grounded) {
      dino.velocityY = dino.jumpPower;
      dino.grounded = false;
      createDust(dino.x + 20, world.groundY - 5, 7);
      playTone(280, .045, "square", .018);
    }
  }

  function loop(now) {
    if (!world.running) return;
    const delta = Math.min(2.2, (now - world.lastTime) / 16.667 || 1);
    world.lastTime = now;
    update(delta);
    draw();
    animationId = requestAnimationFrame(loop);
  }

  function update(delta) {
    world.distance += world.speed * delta;
    world.score += .26 * delta;
    world.speed = Math.min(12.2, 7 + world.score / 110);

    dino.velocityY += dino.gravity * delta;
    dino.y += dino.velocityY * delta;
    if (dino.y >= world.groundY - dino.height) {
      dino.y = world.groundY - dino.height;
      dino.velocityY = 0;
      dino.grounded = true;
    }
    dino.legFrame += .22 * delta;
    dino.blink = (dino.blink + delta) % 230;

    world.clouds.forEach((cloud) => {
      cloud.x -= .42 * cloud.s * delta;
      if (cloud.x < -100) cloud.x = world.width + 80;
    });

    if (!world.giftSpawned && world.score >= 82) {
      world.obstacles.push(makeGift());
      world.giftSpawned = true;
      statusEl.textContent = "A gift! Catch it!";
    } else if (!world.giftSpawned && world.distance >= world.nextObstacleAt) {
      world.obstacles.push(makeCactus());
      world.nextObstacleAt = world.distance + 330 + Math.random() * 250;
    }

    world.obstacles.forEach((obstacle) => {
      obstacle.x -= world.speed * delta;
      if (obstacle.type === "gift") obstacle.bob += .08 * delta;
    });

    for (const obstacle of world.obstacles) {
      if (obstacle.type === "gift" && intersects(dinoHitbox(), giftHitbox(obstacle))) {
        finishGame();
        return;
      }
      if (obstacle.type === "cactus" && intersects(dinoHitbox(), cactusHitbox(obstacle))) {
        gameOver();
        return;
      }
    }

    world.obstacles = world.obstacles.filter((item) => item.x + item.width > -40);

    world.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += .28 * delta;
      particle.life -= delta;
    });
    world.particles = world.particles.filter((particle) => particle.life > 0);

    if (world.score > highScore) {
      highScore = Math.floor(world.score);
      localStorage.setItem("birthdayRunnerHighScore", String(highScore));
    }
    updateScoreboard();
  }

  function makeCactus() {
    const tall = Math.random() > .45;
    return {
      type: "cactus",
      x: world.width + 50,
      y: world.groundY - (tall ? 67 : 48),
      width: tall ? 35 : 51,
      height: tall ? 67 : 48,
      variant: Math.floor(Math.random() * 3)
    };
  }

  function makeGift() {
    return {
      type: "gift",
      x: world.width + 80,
      y: world.groundY - 86,
      width: 58,
      height: 58,
      bob: 0
    };
  }

  function dinoHitbox() {
    return { x: dino.x + 9, y: dino.y + 7, width: 39, height: 47 };
  }

  function cactusHitbox(obstacle) {
    return { x: obstacle.x + 5, y: obstacle.y + 4, width: obstacle.width - 10, height: obstacle.height - 4 };
  }

  function giftHitbox(obstacle) {
    return { x: obstacle.x - 4, y: obstacle.y - 8, width: obstacle.width + 8, height: obstacle.height + 16 };
  }

  function intersects(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function gameOver() {
    world.running = false;
    cancelAnimationFrame(animationId);
    gameFrame.classList.remove("is-running");
    createDust(dino.x + 28, world.groundY - 6, 14);
    draw();
    playTone(110, .18, "sawtooth", .025);
    statusEl.textContent = "So close — try one more time.";
    startButton.textContent = "Try again";
    startOverlay.querySelector("h2").textContent = "The cactus said nope.";
    startOverlay.querySelector("p").textContent = "No worries. Birthdays come with unlimited retries.";
    startOverlay.classList.remove("is-hidden");
    setTimeout(() => {
      world.obstacles = [];
      world.score = 0;
      world.distance = 0;
      world.nextObstacleAt = 520;
      world.giftSpawned = false;
      dino.y = world.groundY - dino.height;
      dino.velocityY = 0;
      dino.grounded = true;
      updateScoreboard();
      drawIdleScene();
    }, 260);
  }

  function finishGame() {
    world.running = false;
    world.finished = true;
    cancelAnimationFrame(animationId);
    localStorage.setItem("birthdayRunnerHighScore", String(Math.max(highScore, Math.floor(world.score))));
    playVictorySound();
    createDust(dino.x + 25, dino.y + 30, 22);
    draw();
    statusEl.textContent = "Surprise unlocked!";
    setTimeout(showCard, 520);
  }

  function showCard() {
    gameScreen.hidden = true;
    cardScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    launchConfetti(90);
  }

  function showGame() {
    cardScreen.hidden = true;
    gameScreen.hidden = false;
    startOverlay.querySelector("h2").textContent = "Help the dino reach the birthday surprise";
    startOverlay.querySelector("p").textContent = "Jump over the cacti and catch the gift.";
    resetGame();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function drawIdleScene() {
    draw(true);
  }

  function draw(isIdle = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawClouds();
    drawGround();
    world.obstacles.forEach(drawObstacle);
    drawDino(isIdle);
    drawParticles();
  }

  function drawClouds() {
    ctx.save();
    ctx.strokeStyle = "#c7c7c7";
    ctx.lineWidth = 3;
    world.clouds.forEach((cloud) => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, 16 * cloud.s, Math.PI, 0);
      ctx.arc(cloud.x + 22 * cloud.s, cloud.y - 8 * cloud.s, 20 * cloud.s, Math.PI, 0);
      ctx.arc(cloud.x + 48 * cloud.s, cloud.y, 15 * cloud.s, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawGround() {
    ctx.save();
    ctx.strokeStyle = "#292929";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, world.groundY + 1);
    ctx.lineTo(world.width, world.groundY + 1);
    ctx.stroke();
    ctx.fillStyle = "#b7b7b7";
    for (let x = -(world.distance % 68); x < world.width; x += 68) {
      ctx.fillRect(x, world.groundY + 18, 22, 3);
      ctx.fillRect(x + 38, world.groundY + 35, 10, 3);
    }
    ctx.restore();
  }

  function drawDino(isIdle) {
    const x = Math.round(dino.x);
    const y = Math.round(dino.y);
    const runningFrame = Math.floor(dino.legFrame) % 2;
    ctx.save();
    ctx.fillStyle = "#292929";
    ctx.fillRect(x + 10, y + 22, 32, 28);
    ctx.fillRect(x + 27, y + 5, 28, 30);
    ctx.fillRect(x + 47, y + 15, 10, 18);
    ctx.fillRect(x + 4, y + 30, 14, 11);
    ctx.fillRect(x, y + 35, 9, 7);
    ctx.fillRect(x + 8, y + 45, 12, 8);
    if (!isIdle && world.running && dino.grounded) {
      if (runningFrame === 0) {
        ctx.fillRect(x + 16, y + 48, 8, 10);
        ctx.fillRect(x + 34, y + 45, 8, 8);
      } else {
        ctx.fillRect(x + 16, y + 45, 8, 8);
        ctx.fillRect(x + 34, y + 48, 8, 10);
      }
    } else {
      ctx.fillRect(x + 16, y + 48, 8, 10);
      ctx.fillRect(x + 34, y + 48, 8, 10);
    }
    ctx.fillStyle = "#fff";
    if (dino.blink < 4) ctx.fillRect(x + 43, y + 13, 6, 2);
    else ctx.fillRect(x + 43, y + 11, 5, 5);
    ctx.fillRect(x + 48, y + 27, 7, 3);
    ctx.restore();
  }

  function drawObstacle(obstacle) {
    if (obstacle.type === "gift") {
      drawGift(obstacle);
      return;
    }
    ctx.save();
    ctx.fillStyle = "#292929";
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y);
    const w = obstacle.width;
    const h = obstacle.height;
    ctx.fillRect(x + w * .38, y, w * .25, h);
    ctx.fillRect(x + w * .16, y + h * .35, w * .22, h * .18);
    ctx.fillRect(x + w * .08, y + h * .18, w * .12, h * .35);
    ctx.fillRect(x + w * .62, y + h * .5, w * .2, h * .16);
    ctx.fillRect(x + w * .77, y + h * .32, w * .12, h * .35);
    ctx.restore();
  }

  function drawGift(obstacle) {
    const bobY = Math.sin(obstacle.bob) * 7;
    const x = Math.round(obstacle.x);
    const y = Math.round(obstacle.y + bobY);
    ctx.save();
    ctx.fillStyle = "#ee5a51";
    ctx.strokeStyle = "#292929";
    ctx.lineWidth = 4;
    ctx.fillRect(x, y + 12, obstacle.width, obstacle.height - 12);
    ctx.strokeRect(x, y + 12, obstacle.width, obstacle.height - 12);
    ctx.fillStyle = "#f8d66d";
    ctx.fillRect(x + 23, y + 12, 12, obstacle.height - 12);
    ctx.fillRect(x, y + 24, obstacle.width, 10);
    ctx.fillStyle = "#292929";
    ctx.fillRect(x + 12, y + 4, 18, 10);
    ctx.fillRect(x + 30, y + 4, 18, 10);
    ctx.restore();
  }

  function createDust(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      world.particles.push({
        x,
        y,
        vx: (Math.random() - .5) * 6,
        vy: -Math.random() * 5,
        size: 2 + Math.random() * 5,
        life: 18 + Math.random() * 16
      });
    }
  }

  function drawParticles() {
    ctx.save();
    ctx.fillStyle = "#8a8a8a";
    world.particles.forEach((particle) => {
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
    ctx.restore();
  }

  function launchConfetti(count = 70) {
    const palette = ["#ee5a51", "#f8d66d", "#ffc4cf", "#88bf9b", "#ffffff"];
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = palette[Math.floor(Math.random() * palette.length)];
      piece.style.setProperty("--fall-duration", `${2.4 + Math.random() * 2.4}s`);
      piece.style.setProperty("--drift", `${-130 + Math.random() * 260}px`);
      piece.style.setProperty("--spin", `${360 + Math.random() * 900}deg`);
      piece.style.animationDelay = `${Math.random() * .45}s`;
      confettiLayer.appendChild(piece);
      setTimeout(() => piece.remove(), 5400);
    }
    playVictorySound();
  }

  let audioContext;
  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioContext = new AudioContext();
    }
    return audioContext;
  }

  function playTone(frequency, duration, type = "sine", gainAmount = .02, delay = 0) {
    const audio = getAudioContext();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, audio.currentTime + delay);
    gain.gain.linearRampToValueAtTime(gainAmount, audio.currentTime + delay + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + delay + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(audio.currentTime + delay);
    oscillator.stop(audio.currentTime + delay + duration + .02);
  }

  function playVictorySound() {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, index) => {
      playTone(note, .22, "triangle", .035, index * .1);
    });
  }

  function handleKeydown(event) {
    if (["Space", "ArrowUp"].includes(event.code)) {
      event.preventDefault();
      if (!cardScreen.hidden) return;
      jump();
    }
  }

  startButton.addEventListener("click", startGame);
  jumpButton.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); });
  canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); jump(); });
  skipButton.addEventListener("click", showCard);
  replayButton.addEventListener("click", showGame);
  celebrateButton.addEventListener("click", () => launchConfetti(110));
  window.addEventListener("keydown", handleKeydown, { passive: false });
  window.addEventListener("resize", drawIdleScene);

  if (params.get("preview") === "card") {
    showCard();
  }
})();

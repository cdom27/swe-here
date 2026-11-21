const contact = document.getElementById("contact");
const controls = document.getElementById("controls");
const toggleMotionButton = document.getElementById("toggle-motion");
const resetContactButton = document.getElementById("reset-contact");
const smallerContactButton = document.getElementById("smaller-contact");
const largerContactButton = document.getElementById("larger-contact");

function revealHeading() {
  document.documentElement.classList.add("fonts-ready");
}

if (document.fonts) {
  document.fonts
    .load('500 2rem "Montagu Slab"')
    .then(revealHeading)
    .catch(revealHeading);
  setTimeout(revealHeading, 2000);
} else {
  revealHeading();
}

contact.addEventListener("dragstart", (event) => {
  event.preventDefault();
});

let pointerX = -1000;
let pointerY = -1000;
let x;
let y;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let wasDragged = false;
let dragPointerId;
let grabOffsetX = 0;
let grabOffsetY = 0;
let lastPointerX = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let suppressClick = false;
let fleeDisabledUntil = 0;
let dragSamples = [];
let rotation = 0;
let scaleX = 1;
let scaleY = 1;
let scaleVelocityX = 0;
let scaleVelocityY = 0;
let sizeScale = 1;
let isPlaying = true;
let defaultX;
let defaultY;

const fleeDistance = 100;
const maxSpeed = 18;
const acceleration = 0.55;
const friction = 0.985;

function keepInViewport() {
  const maxX = Math.max(0, window.innerWidth - contact.offsetWidth);
  const maxY = Math.max(0, window.innerHeight - contact.offsetHeight);
  const nextX = Math.max(0, Math.min(x, maxX));
  const nextY = Math.max(0, Math.min(y, maxY));
  const collisions = {
    horizontal: nextX !== x,
    vertical: nextY !== y,
  };

  x = nextX;
  y = nextY;
  return collisions;
}

function triggerSquash(axis) {
  if (axis === "horizontal") {
    scaleVelocityX -= 0.16;
    scaleVelocityY += 0.2;
  } else {
    scaleVelocityX += 0.2;
    scaleVelocityY -= 0.16;
  }
}

function renderContact() {
  const speed = Math.hypot(velocityX, velocityY);

  if (speed > 0.1) {
    const targetRotation = (Math.atan2(velocityY, velocityX) * 180) / Math.PI;
    const rotationDelta = ((targetRotation - rotation + 540) % 360) - 180;

    rotation += rotationDelta * 0.18;
  }

  scaleVelocityX += (1 - scaleX) * 0.18;
  scaleVelocityY += (1 - scaleY) * 0.18;
  scaleVelocityX *= 0.78;
  scaleVelocityY *= 0.78;
  scaleX += scaleVelocityX;
  scaleY += scaleVelocityY;

  contact.style.left = `${x}px`;
  contact.style.top = `${y}px`;
  contact.style.transform = `rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
}

function renderContactSize() {
  contact.style.setProperty("--contact-size", sizeScale);
}

function updateDragVelocity(clientX, clientY, now) {
  const deltaX = clientX - lastPointerX;
  const deltaY = clientY - lastPointerY;

  if (Math.hypot(deltaX, deltaY) > 4) {
    wasDragged = true;
  }

  dragSamples.push({ x: clientX, y: clientY, time: now });
  dragSamples = dragSamples.filter((sample) => now - sample.time <= 120);

  const firstSample = dragSamples[0];
  if (firstSample && now > firstSample.time) {
    const sampleDuration = now - firstSample.time;
    velocityX = ((clientX - firstSample.x) * 16.67) / sampleDuration;
    velocityY = ((clientY - firstSample.y) * 16.67) / sampleDuration;
  }

  lastPointerX = clientX;
  lastPointerY = clientY;
  lastPointerTime = now;
}

function moveContact() {
  if (!isPlaying) {
    requestAnimationFrame(moveContact);
    return;
  }

  if (isDragging) {
    requestAnimationFrame(moveContact);
    return;
  }

  const bounds = contact.getBoundingClientRect();
  const centerX = x + bounds.width / 2;
  const centerY = y + bounds.height / 2;
  const distanceX = centerX - pointerX;
  const distanceY = centerY - pointerY;
  const distance = Math.hypot(distanceX, distanceY);

  if (performance.now() >= fleeDisabledUntil && distance < fleeDistance) {
    const directionX = distanceX / (distance || 1);
    const directionY = distanceY / (distance || 1);

    velocityX += directionX * acceleration;
    velocityY += directionY * acceleration;
  }

  const speed = Math.hypot(velocityX, velocityY);
  if (speed > maxSpeed) {
    velocityX = (velocityX / speed) * maxSpeed;
    velocityY = (velocityY / speed) * maxSpeed;
  }

  x += velocityX;
  y += velocityY;
  const collisions = keepInViewport();

  if (collisions.horizontal) {
    triggerSquash("horizontal");
  }
  if (collisions.vertical) {
    triggerSquash("vertical");
  }

  const maxX = Math.max(0, window.innerWidth - contact.offsetWidth);
  const maxY = Math.max(0, window.innerHeight - contact.offsetHeight);

  if ((x <= 0 && velocityX < 0) || (x >= maxX && velocityX > 0)) {
    velocityX *= -1;
  }
  if ((y <= 0 && velocityY < 0) || (y >= maxY && velocityY > 0)) {
    velocityY *= -1;
  }

  velocityX *= friction;
  velocityY *= friction;
  renderContact();

  requestAnimationFrame(moveContact);
}

const initialBounds = contact.getBoundingClientRect();
x = initialBounds.left;
y = initialBounds.top;
defaultX = x;
defaultY = y;
contact.style.right = "auto";
contact.style.left = `${x}px`;
contact.style.top = `${y}px`;

document.addEventListener("pointermove", (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;

  if (!isDragging || event.pointerId !== dragPointerId) {
    return;
  }

  x = event.clientX - grabOffsetX;
  y = event.clientY - grabOffsetY;
  const collisions = keepInViewport();
  if (collisions.horizontal) {
    triggerSquash("horizontal");
  }
  if (collisions.vertical) {
    triggerSquash("vertical");
  }
  updateDragVelocity(event.clientX, event.clientY, performance.now());
  renderContact();
});

contact.addEventListener("pointerdown", (event) => {
  showControls();
  isDragging = true;
  wasDragged = false;
  dragPointerId = event.pointerId;

  const bounds = contact.getBoundingClientRect();
  grabOffsetX = event.clientX - bounds.left;
  grabOffsetY = event.clientY - bounds.top;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  lastPointerTime = performance.now();
  dragSamples = [
    {
      x: event.clientX,
      y: event.clientY,
      time: lastPointerTime,
    },
  ];
  velocityX = 0;
  velocityY = 0;

  contact.classList.add("dragging");
  contact.setPointerCapture(event.pointerId);
});

function showControls() {
  controls.classList.add("is-visible");
  controls.style.opacity = "1";
  controls.style.pointerEvents = "auto";
  controls.style.transform = "translateY(0)";
  controls.setAttribute("aria-hidden", "false");
}

function resetContact() {
  x = defaultX;
  y = defaultY;
  sizeScale = 1;
  renderContactSize();
  velocityX = 0;
  velocityY = 0;
  rotation = 0;
  scaleX = 1;
  scaleY = 1;
  scaleVelocityX = 0;
  scaleVelocityY = 0;
  fleeDisabledUntil = performance.now() + 400;
  keepInViewport();
  renderContact();
}

toggleMotionButton.addEventListener("click", () => {
  isPlaying = !isPlaying;
  toggleMotionButton.textContent = isPlaying ? "Pause" : "Play";
  toggleMotionButton.setAttribute("aria-pressed", String(!isPlaying));
});

resetContactButton.addEventListener("click", resetContact);

smallerContactButton.addEventListener("click", () => {
  sizeScale = Math.max(0.65, sizeScale - 0.1);
  renderContactSize();
  keepInViewport();
  renderContact();
});

largerContactButton.addEventListener("click", () => {
  sizeScale = Math.min(7, sizeScale + 0.1);
  renderContactSize();
  keepInViewport();
  renderContact();
});

contact.addEventListener("focus", showControls);
contact.addEventListener("pointerenter", showControls);
contact.addEventListener("pointerover", showControls);
contact.addEventListener("click", showControls);

function endDrag(event) {
  if (!isDragging || event.pointerId !== dragPointerId) {
    return;
  }

  updateDragVelocity(event.clientX, event.clientY, performance.now());
  isDragging = false;
  contact.classList.remove("dragging");

  if (wasDragged) {
    suppressClick = true;
    fleeDisabledUntil = performance.now() + 700;
    velocityX *= 2;
    velocityY *= 2;
  }

  if (contact.hasPointerCapture(event.pointerId)) {
    contact.releasePointerCapture(event.pointerId);
  }
}

document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

contact.addEventListener("click", (event) => {
  if (!suppressClick) {
    return;
  }

  event.preventDefault();
  suppressClick = false;
});

window.addEventListener("resize", keepInViewport);
requestAnimationFrame(moveContact);

const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("show");
    });
  });
}

const bookingForm = document.querySelector(".booking-form");
if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Booking request captured. Next step: connect this form to email, WhatsApp, or your booking backend.");
  });
}

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const prevBtn = document.getElementById("prevImage");
const nextBtn = document.getElementById("nextImage");
const showAllBtn = document.getElementById("showAllPhotos");

const galleryPhotos = Array.from(document.querySelectorAll(".gallery-item"));
let currentIndex = 0;

function openLightbox(index) {
  currentIndex = index;
  lightboxImage.src = galleryPhotos[currentIndex].src;
  lightboxImage.alt = galleryPhotos[currentIndex].alt || "Villa photo";
  lightbox.classList.add("show");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function showImage(index) {
  if (index < 0) index = galleryPhotos.length - 1;
  if (index >= galleryPhotos.length) index = 0;
  currentIndex = index;
  lightboxImage.src = galleryPhotos[currentIndex].src;
  lightboxImage.alt = galleryPhotos[currentIndex].alt || "Villa photo";
}

function closeLightbox() {
  lightbox.classList.remove("show");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImage.src = "";
  document.body.style.overflow = "";
}

galleryPhotos.forEach((photo, index) => {
  photo.addEventListener("click", () => openLightbox(index));
});

if (showAllBtn) {
  showAllBtn.addEventListener("click", () => openLightbox(0));
}

if (nextBtn) {
  nextBtn.addEventListener("click", () => showImage(currentIndex + 1));
}

if (prevBtn) {
  prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
}

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (!lightbox.classList.contains("show")) return;

  if (event.key === "ArrowRight") showImage(currentIndex + 1);
  if (event.key === "ArrowLeft") showImage(currentIndex - 1);
  if (event.key === "Escape") closeLightbox();
});
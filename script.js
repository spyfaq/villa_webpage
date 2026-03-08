function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

function getSectionId(element) {
  const section = element.closest("section[id]");
  return section ? section.id : "none";
}

function sanitizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
    .slice(0, 100);
}

const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("show");
    trackEvent("menu_toggle", {
      menu_id: "primary_navigation",
      menu_state: isOpen ? "open" : "close"
    });
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("show");
    });
  });
}

const bookingForm = document.querySelector(".booking-form");

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

  const imageName = galleryPhotos[currentIndex].getAttribute("src").split("/").pop();
  trackEvent("select_content", {
    content_type: "gallery_image",
    content_id: imageName,
    gallery_position: currentIndex + 1
  });
}

function showImage(index) {
  if (index < 0) index = galleryPhotos.length - 1;
  if (index >= galleryPhotos.length) index = 0;
  currentIndex = index;
  lightboxImage.src = galleryPhotos[currentIndex].src;
  lightboxImage.alt = galleryPhotos[currentIndex].alt || "Villa photo";

  const imageName = galleryPhotos[currentIndex].getAttribute("src").split("/").pop();
  trackEvent("gallery_navigation", {
    image_name: imageName,
    gallery_position: currentIndex + 1
  });
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
  showAllBtn.addEventListener("click", () => {
    trackEvent("view_item_list", {
      item_list_id: "villa_gallery",
      item_list_name: "Photo Gallery"
    });
    openLightbox(0);
  });
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

const trackedSections = new Set();
const sectionsToTrack = document.querySelectorAll("section[id]");

if ("IntersectionObserver" in window && sectionsToTrack.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const sectionId = entry.target.id;
        if (!sectionId || trackedSections.has(sectionId)) return;
        trackedSections.add(sectionId);
        trackEvent("view_section", {
          section_id: sectionId,
          section_name: sanitizeText(sectionId)
        });
      });
    },
    { threshold: 0.5 }
  );

  sectionsToTrack.forEach((section) => sectionObserver.observe(section));
}

const trackedClicks = document.querySelectorAll("[data-track]");
trackedClicks.forEach((element) => {
  element.addEventListener("click", () => {
    const trackType = element.dataset.track;
    const location = element.dataset.trackLocation || getSectionId(element);
    const platform = element.dataset.platform || "website";
    const href = element.getAttribute("href") || "";

    const commonParams = {
      link_text: sanitizeText(element.textContent),
      location,
      platform,
      destination: href
    };

    switch (trackType) {
      case "booking_path":
        trackEvent("select_content", {
          content_type: "booking_option",
          content_id: `${platform}_${location}`,
          ...commonParams
        });
        break;
      case "whatsapp_click":
        trackEvent("contact", {
          method: "whatsapp",
          ...commonParams
        });
        break;
      case "map_open":
      case "map_cta":
        trackEvent("select_content", {
          content_type: "map",
          content_id: location,
          ...commonParams
        });
        break;
      case "contact_cta":
        trackEvent("select_content", {
          content_type: "contact_cta",
          content_id: location,
          ...commonParams
        });
        break;
      case "review_click":
        trackEvent("select_content", {
          content_type: "review_platform",
          content_id: platform,
          ...commonParams
        });
        break;
      default:
        trackEvent(trackType, commonParams);
    }
  });
});

const formFields = bookingForm ? bookingForm.querySelectorAll("input, textarea, select") : [];
let bookingFormStarted = false;

formFields.forEach((field) => {
  field.addEventListener("focus", () => {
    if (bookingFormStarted) return;
    bookingFormStarted = true;
    trackEvent("form_start", {
      form_id: "booking_form",
      form_name: "request_availability"
    });
  }, { once: true });
});

if (bookingForm) {
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const checkIn = bookingForm.querySelector('[name="check_in"]')?.value || "";
    const checkOut = bookingForm.querySelector('[name="check_out"]')?.value || "";
    const guests = bookingForm.querySelector('[name="guests"]')?.value || "";

    trackEvent("generate_lead", {
      currency: "EUR",
      value: 1,
      form_id: "booking_form",
      form_name: "request_availability",
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guests) || undefined
    });

    alert("Booking request captured. Next step: connect this form to email, WhatsApp, or your booking backend.");
  });
}

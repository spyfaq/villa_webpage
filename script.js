function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// Format a Date as YYYY-MM-DD in the visitor's own timezone.
// toISOString() converts to UTC first, which shifts the date back a day for
// every visitor east of UTC (Greece included), so it must not be used here.
function toLocalYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayYmd() {
  return toLocalYmd(new Date());
}

function getSectionId(element) {
  const section = element.closest("section[id]");
  return section ? section.id : "none";
}

// Track QR-code visits based on UTM parameters
(function trackQrLanding() {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');

  if (typeof gtag === 'function' && source === 'qr') {
    gtag('event', 'qr_visit', {
      traffic_type: 'qr',
      qr_source: source,
      qr_medium: medium || '',
      qr_campaign: campaign || '',
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }
})();

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
  const setNavState = (isOpen) => {
    navMenu.classList.toggle("show", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = !navMenu.classList.contains("show");
    setNavState(isOpen);
    trackEvent("menu_toggle", {
      menu_id: "primary_navigation",
      menu_state: isOpen ? "open" : "close"
    });
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setNavState(false));
  });

  // Close on Escape and on clicks outside the menu
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navMenu.classList.contains("show")) {
      setNavState(false);
      navToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!navMenu.classList.contains("show")) return;
    if (navMenu.contains(event.target) || navToggle.contains(event.target)) return;
    setNavState(false);
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
let lastFocusedBeforeLightbox = null;

// Grid thumbnails carry a srcset, so .src resolves to whichever candidate the
// browser picked. The lightbox always wants the large tier from data-full.
function fullSizeSrc(photo) {
  return photo.dataset.full || photo.getAttribute("src");
}

function openLightbox(index) {
  currentIndex = index;
  lastFocusedBeforeLightbox = document.activeElement;
  lightboxImage.src = fullSizeSrc(galleryPhotos[currentIndex]);
  lightboxImage.alt = galleryPhotos[currentIndex].alt || "Villa photo";
  lightbox.classList.add("show");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (lightboxClose) lightboxClose.focus();

  const imageName = fullSizeSrc(galleryPhotos[currentIndex]).split("/").pop();
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
  lightboxImage.src = fullSizeSrc(galleryPhotos[currentIndex]);
  lightboxImage.alt = galleryPhotos[currentIndex].alt || "Villa photo";

  const imageName = fullSizeSrc(galleryPhotos[currentIndex]).split("/").pop();
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
  if (lastFocusedBeforeLightbox instanceof HTMLElement) {
    lastFocusedBeforeLightbox.focus();
    lastFocusedBeforeLightbox = null;
  }
}

// Gallery thumbnails are plain <img>, so expose them to keyboard and
// screen-reader users as the buttons they behave like.
galleryPhotos.forEach((photo, index) => {
  photo.setAttribute("role", "button");
  photo.setAttribute("tabindex", "0");
  photo.addEventListener("click", () => openLightbox(index));
  photo.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox(index);
    }
  });
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
  if (!lightbox || !lightbox.classList.contains("show")) return;

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

const formStatus = document.getElementById("formMessage");

function setFormStatus(message, type) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.remove("form-status--success", "form-status--error");
  if (type) formStatus.classList.add(`form-status--${type}`);
  formStatus.hidden = !message;
}

function clearFormStatus() {
  setFormStatus("", null);
}

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
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const checkIn = bookingForm.querySelector('[name="check_in"]')?.value || "";
    const checkOut = bookingForm.querySelector('[name="check_out"]')?.value || "";
    const guests = bookingForm.querySelector('[name="guests"]')?.value || "";

    const submitBtn = bookingForm.querySelector('button[type="submit"]');

    if (checkIn && checkOut && checkOut <= checkIn) {
      setFormStatus("Check-out date must be after check-in date.", "error");
      return;
    }

    clearFormStatus();

    trackEvent("generate_lead", {
      currency: "EUR",
      value: 1,
      form_id: "booking_form",
      form_name: "request_availability",
      check_in: checkIn,
      check_out: checkOut,
      guests: Number(guests) || undefined
    });

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = "Sending request...";
    }

    try {
      const response = await fetch(bookingForm.action, {
        method: "POST",
        body: new FormData(bookingForm),
        headers: {
          Accept: "application/json"
        }
      });

      if (response.ok) {
        bookingForm.reset();

        if (checkOutField) {
          checkOutField.min = checkInField?.min || todayYmd();
        }

        document.dispatchEvent(new CustomEvent("booking-form-reset-calendar"));

        setFormStatus(
          "Thank you! Your request has been sent successfully. We will contact you soon.",
          "success"
        );

        if (submitBtn) {
          submitBtn.innerText = "Request Sent ✓";
        }

      } else {
        setFormStatus(
          "Something went wrong sending your request. Please try again, or message us on WhatsApp.",
          "error"
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Send Request";
        }
      }

    } catch (error) {
      setFormStatus(
        "Network error — your request was not sent. Please try again, or message us on WhatsApp.",
        "error"
      );
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Request";
      }
    }
  });
}

const checkInField = bookingForm?.querySelector('[name="check_in"]');
const checkOutField = bookingForm?.querySelector('[name="check_out"]');

if (checkInField) {
  const today = todayYmd();
  checkInField.min = today;

  checkInField.addEventListener("change", () => {
    checkOutField.min = checkInField.value;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("availabilityCalendar");
  if (!calendarEl) return;

  const calendarNote = document.querySelector(".calendar-note");
  const bookingSection = document.getElementById("contact");
  const checkInField = bookingForm?.querySelector('[name="check_in"]');
  const checkOutField = bookingForm?.querySelector('[name="check_out"]');

  let selectedStart = null;
  let previewEvent = null;

  function showCalendarNote(message) {
    if (calendarNote) {
      calendarNote.innerHTML  = message;
    }
  }

  function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function scrollToBookingForm() {
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toYmd(date) {
    return toLocalYmd(date);
  }

  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
  }

  function selectionHitsBlockedDates(selectionStart, selectionEnd, calendar) {
    return calendar.getEvents().some((event) => {
      if (!event.start || !event.end) return false;

      const isPreview =
        event.classNames?.includes("selected-range-preview") ||
        event.extendedProps?.isPreview === true;

      if (isPreview) return false;

      return rangesOverlap(selectionStart, selectionEnd, event.start, event.end);
    });
  }

  function buildPreviewEvent(startStr, endStr) {
    return {
      start: startStr,
      end: endStr,
      display: "background",
      className: "selected-range-preview",
      extendedProps: {
        isPreview: true
      }
    };
  }
  
  function setPreview(calendar, startStr, endStr) {
    if (previewEvent) {
      previewEvent.remove();
      previewEvent = null;
    }

    // remove old anchors
    calendar.getEvents().forEach(e => {
      if (e.extendedProps?.isAnchor) e.remove();
    });

    // main range
    previewEvent = calendar.addEvent(buildPreviewEvent(startStr, endStr));

    // START anchor
    calendar.addEvent({
      start: startStr,
      display: "background",
      className: "selected-start-anchor",
      extendedProps: { isAnchor: true }
    });

    // END anchor
    calendar.addEvent({
      start: endStr,
      display: "background",
      className: "selected-end-anchor",
      extendedProps: { isAnchor: true }
    });
  }
  function clearPreview(calendar) {
    if (previewEvent) {
      previewEvent.remove();
      previewEvent = null;
    }

    calendar.getEvents().forEach((event) => {
      if (
        event.extendedProps?.isAnchor ||
        event.extendedProps?.isPreview === true ||
        event.classNames?.includes("selected-range-preview")
      ) {
        event.remove();
      }
    });
  }

  function syncCalendarFromForm() {
    if (!checkInField || !checkOutField) return;

    const checkIn = checkInField.value;
    const checkOut = checkOutField.value;

    if (!checkIn && !checkOut) {
      selectedStart = null;
      clearPreview(calendar);
      showCalendarNote("Select a check-in date, then select a check-out date.");
      return;
    }

    if (checkIn && !checkOut) {
      const nextDay = new Date(`${checkIn}T00:00:00`);
      nextDay.setDate(nextDay.getDate() + 1);

      selectedStart = checkIn;
      setPreview(calendar, checkIn, toYmd(nextDay));
      showCalendarNote(
        `Check-in selected: ${formatDateForDisplay(checkIn)}. Now select your check-out date.`
      );
      return;
    }

    if (checkIn && checkOut) {
      if (checkOut <= checkIn) {
        clearPreview(calendar);
        showCalendarNote("Check-out date must be after check-in date.");
        return;
      }

      const rangeStart = new Date(`${checkIn}T00:00:00`);
      const rangeEnd = new Date(`${checkOut}T00:00:00`);

      if (selectionHitsBlockedDates(rangeStart, rangeEnd, calendar)) {
        clearPreview(calendar);
        showCalendarNote("That stay includes unavailable dates. Please choose different dates.");
        return;
      }

      selectedStart = null;
      calendar.gotoDate(checkIn);
      setPreview(calendar, checkIn, checkOut);
      showCalendarNote(
        `Selected stay: ${formatDateForDisplay(checkIn)} to ${formatDateForDisplay(checkOut)}. <br>Complete your enquiry using the form.`
      );
    }
  }

function revalidateCurrentSelection() {
  if (!checkInField?.value && !checkOutField?.value) return;
  syncCalendarFromForm();
}

document.addEventListener("booking-form-reset-calendar", () => {
  selectedStart = null;
  clearPreview(calendar);
  showCalendarNote("Select a check-in date, then select a check-out date.");
});

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    firstDay: 1,
    height: "auto",
    fixedWeekCount: true,
    showNonCurrentDates: false,
    dayMaxEvents: false,
    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: ""
    },
    eventDisplay: "background",
    displayEventTime: false,

    validRange: {
      start: todayYmd()
    },

    dateClick: function (info) {
      const clickedDate = new Date(`${info.dateStr}T00:00:00`);

      if (!selectedStart) {
        const nextDay = new Date(clickedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        if (selectionHitsBlockedDates(clickedDate, nextDay, calendar)) {
          showCalendarNote("That date is unavailable. Please choose another check-in date.");
          return;
        }

        selectedStart = info.dateStr;

        setPreview(calendar, selectedStart, toYmd(nextDay));

        if (checkInField) checkInField.value = selectedStart;
        if (checkOutField) {
          checkOutField.value = "";
          checkOutField.min = selectedStart;
        }

        showCalendarNote(
          `Check-in selected: ${formatDateForDisplay(selectedStart)}. Now select your check-out date.`
        );
        return;
      }

      if (info.dateStr <= selectedStart) {
        selectedStart = info.dateStr;

        const nextDay = new Date(`${selectedStart}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);

        setPreview(calendar, selectedStart, toYmd(nextDay));

        if (checkInField) checkInField.value = selectedStart;
        if (checkOutField) {
          checkOutField.value = "";
          checkOutField.min = selectedStart;
        }

        showCalendarNote(
          `Check-in updated to ${formatDateForDisplay(selectedStart)}. Now select your check-out date.`
        );
        return;
      }

      const rangeStart = new Date(`${selectedStart}T00:00:00`);
      const rangeEnd = new Date(`${info.dateStr}T00:00:00`);

      if (selectionHitsBlockedDates(rangeStart, rangeEnd, calendar)) {
        showCalendarNote("That stay includes unavailable dates. Please choose different dates.");
        return;
      }

      if (checkInField) checkInField.value = selectedStart;
      if (checkOutField) {
        checkOutField.value = info.dateStr;
        checkOutField.min = selectedStart;
      }

      setPreview(calendar, selectedStart, info.dateStr);

      trackEvent("calendar_date_selection", {
        check_in: selectedStart,
        check_out: info.dateStr,
        location: "availability_calendar"
      });

      showCalendarNote(
        `Selected stay: ${formatDateForDisplay(selectedStart)} to ${formatDateForDisplay(info.dateStr)}. <br>Complete your enquiry using the form.`
      );

      selectedStart = null;
      scrollToBookingForm();
    },

    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const response = await fetch(`/availability.json?v=${Date.now()}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Calendar feed failed");
        }

        const events = await response.json();
        successCallback(events);
        setTimeout(revalidateCurrentSelection, 100);

        if (selectedStart && !checkOutField?.value) {
          showCalendarNote(
            `Check-in selected: ${formatDateForDisplay(selectedStart)}. Now select your check-out date.`
          );
        } else if (!checkInField?.value || !checkOutField?.value) {
          showCalendarNote("Select a check-in date, then select a check-out date.");
        }
      } catch (error) {
        console.error("Calendar load error:", error);
        successCallback([]);
        showCalendarNote(
          "Calendar temporarily unavailable. Please send your dates using the enquiry form."
        );
        failureCallback(error);
      }
    }
  });

  calendar.render();
  syncCalendarFromForm();
  if (checkInField) {
    checkInField.addEventListener("change", () => {
      if (checkOutField && checkOutField.value && checkOutField.value <= checkInField.value) {
        checkOutField.value = "";
      }

      if (checkOutField) {
        checkOutField.min = checkInField.value || "";
      }

      syncCalendarFromForm();
    });
  }

  if (checkOutField) {
    checkOutField.addEventListener("change", () => {
      syncCalendarFromForm();
    });
  }

  // availability.json is regenerated at most a couple of times a day, so
  // refreshing when the tab becomes visible again is enough. window focus fires
  // for the same journey back to the page, so visibilitychange alone covers it.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    calendar.refetchEvents();
    setTimeout(revalidateCurrentSelection, 150);
  });
});
function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
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
  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const checkIn = bookingForm.querySelector('[name="check_in"]')?.value || "";
    const checkOut = bookingForm.querySelector('[name="check_out"]')?.value || "";
    const guests = bookingForm.querySelector('[name="guests"]')?.value || "";

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const formMessage = document.getElementById("formMessage");

    if (checkIn && checkOut && checkOut <= checkIn) {
      alert("Check-out date must be after check-in date.");
      return;
    }

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

        if (formMessage) {
          formMessage.style.display = "block";
        }

        if (submitBtn) {
          submitBtn.innerText = "Request Sent ✓";
        }

      } else {
        alert("Something went wrong. Please try again.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Send Request";
        }
      }

    } catch (error) {
      alert("Network error. Please try again.");
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
  const today = new Date().toISOString().split("T")[0];
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
    return date.toISOString().split("T")[0];
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
      start: new Date().toISOString().split("T")[0]
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

  window.addEventListener("focus", () => {
    calendar.refetchEvents();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      calendar.refetchEvents();
    }
  });

  setInterval(() => {
    calendar.refetchEvents();
  }, 300000);
});
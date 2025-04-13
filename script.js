// Wait for the HTML document to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const menuButton = document.getElementById('mobile-menu-button');
    const mainNav = document.getElementById('main-nav');

    if (menuButton && mainNav) {
        menuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active'); // Toggle the .active class on the nav
            const icon = menuButton.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.classList.remove('fa-bars'); icon.classList.add('fa-times');
                menuButton.setAttribute('aria-label', 'Close Menu');
            } else {
                icon.classList.remove('fa-times'); icon.classList.add('fa-bars');
                menuButton.setAttribute('aria-label', 'Open Menu');
            }
        });
        // Close menu when a link is clicked
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mainNav.classList.contains('active')) {
                     mainNav.classList.remove('active');
                     const icon = menuButton.querySelector('i');
                     icon.classList.remove('fa-times'); icon.classList.add('fa-bars');
                     menuButton.setAttribute('aria-label', 'Open Menu');
                }
            });
        });
    } // End of Mobile Menu Logic

    // --- Generic Modal Open/Close Functionality ---
    const setupModal = (buttonId, modalId) => {
        const startButton = document.getElementById(buttonId);
        const modal = document.getElementById(modalId);
        if (startButton && modal) { // Check if elements exist on *this* page
            const modalCloseButton = modal.querySelector('.modal-close');
            const modalOverlay = modal.querySelector('.modal-overlay');
            const modalContent = modal.querySelector('.modal-content');
            const openModal = () => modal.classList.add('active');
            const closeModal = () => modal.classList.remove('active');
            startButton.addEventListener('click', (event) => { event.preventDefault(); openModal(); });
            if (modalCloseButton) modalCloseButton.addEventListener('click', closeModal);
            if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
            // Prevent modal closing when clicking inside the content
            if (modalContent) modalContent.addEventListener('click', (event) => event.stopPropagation());
        }
    };

    // Setup Modals for each service button (these IDs are on index.html)
    setupModal('netflix-start-btn', 'netflix-modal');
    setupModal('prime-start-btn', 'prime-modal');
    setupModal('spotify-start-btn', 'spotify-modal');
    // --- End of Modal Logic ---


    // --- Generic Order Form WhatsApp Redirect Function (Handles Optional Username) ---
    const setupOrderFormRedirect = (formId, serviceName) => {
        const orderForm = document.getElementById(formId);
        // Check if the specific form exists on *this* page
        if (orderForm) {
            console.log(`Setting up listener for form: ${formId}`); // Debug: Confirm setup runs
            orderForm.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent default form submission
                console.log(`Submit event fired for: ${formId}`); // Debug: Confirm listener fires

                // --- Get Form Elements ---
                const selectedPackageRadio = orderForm.querySelector('input[name="package"]:checked');
                const clientNameInput = orderForm.querySelector('#clientName'); // Assumes ID is 'clientName'
                const selectedPaymentRadio = orderForm.querySelector('input[name="paymentMethod"]:checked');
                // Look for username field, specific to instagram form
                const instaUsernameInput = orderForm.querySelector('#instaUsername');

                // --- Validation ---
                if (!selectedPackageRadio) { alert("Please select a package."); return; }
                // Validate Instagram Username *only if* the input field exists on this form
                if (instaUsernameInput && instaUsernameInput.value.trim() === "") {
                    alert("Please enter your Instagram Username.");
                    instaUsernameInput.focus();
                    return;
                }
                if (!clientNameInput || clientNameInput.value.trim() === "") { alert("Please enter your name."); clientNameInput.focus(); return; }
                if (!selectedPaymentRadio) { alert("Please select a payment method."); return; }

                // --- Get Values After Validation ---
                const duration = selectedPackageRadio.value; // e.g., "5k Likes" or "3 Months"
                const price = selectedPackageRadio.getAttribute('data-price'); // e.g., "50,000 UGX"
                const clientName = clientNameInput.value.trim();
                const paymentMethod = selectedPaymentRadio.value;
                // Get username value only if input exists
                const instagramUsername = instaUsernameInput ? instaUsernameInput.value.trim() : null;
                const whatsappNumber = "256762193386"; // Your number

                // --- Construct WhatsApp Message ---
                let message = `Order for Cartelug:\n\n`;
                message += `*Service:* ${serviceName}\n`;
                 // Add Instagram Username only if it was found and has value
                if (instagramUsername) {
                    message += `*Instagram Username:* ${instagramUsername}\n`;
                }
                message += `*Package:* ${duration}\n`;
                message += `*Price:* ${price}\n`;
                message += `*Payment Method:* ${paymentMethod}\n`;
                message += `*Name:* ${clientName}`;

                console.log("Constructed message:", message); // Debug: Check message
                const encodedMessage = encodeURIComponent(message);
                const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
                console.log("Redirecting to:", whatsappURL); // Debug: Check URL

                // --- Redirect User ---
                window.location.href = whatsappURL;

            });
        } else {
             // console.log(`Form NOT found on this page: ${formId}`); // Optional check
        }
    };

    // Setup Redirects for ALL order forms (assuming these IDs exist on relevant pages)
    setupOrderFormRedirect('netflix-order-form', 'Netflix');
    setupOrderFormRedirect('prime-order-form', 'Prime Video');
    setupOrderFormRedirect('spotify-order-form', 'Spotify');
    setupOrderFormRedirect('instagram-boost-form', 'Instagram Likes Boost');
    // --- End of Order Form Logic ---

    // --- Swiper Initialization for Testimonials --- START OF NEW CODE ---
    // Check if the testimonial swiper container exists on the current page
    const testimonialSwiperContainer = document.querySelector('.testimonial-swiper');
    if (testimonialSwiperContainer) {
        const testimonialSwiper = new Swiper('.testimonial-swiper', {
            // Configuration options
            direction: 'horizontal', // Slide direction
            loop: true,             // Enable continuous loop mode
            slidesPerView: 1,       // Number of slides shown at once
            spaceBetween: 30,       // Space between slides (pixels)
            grabCursor: true,       // Show grab cursor on hover

            // Pagination dots
            pagination: {
                el: '.swiper-pagination', // CSS selector for pagination container
                clickable: true,          // Allow clicks on pagination bullets to navigate
            },

            // Navigation arrows
            navigation: {
                nextEl: '.swiper-button-next', // CSS selector for next arrow
                prevEl: '.swiper-button-prev', // CSS selector for previous arrow
            },

            // Optional: Autoplay configuration
            /*
            autoplay: {
                delay: 5000, // Time in ms between slides (5 seconds)
                disableOnInteraction: false, // Autoplay continues after user interaction (swipe/click)
                pauseOnMouseEnter: true,     // Pause autoplay when mouse hovers over slider
            },
            */
           
            // Accessibility enhancements (recommended)
            a11y: {
                prevSlideMessage: 'Previous slide',
                nextSlideMessage: 'Next slide',
                paginationBulletMessage: 'Go to slide {{index}}',
            },
        });
    }
    // --- Swiper Initialization for Testimonials --- END OF NEW CODE ---


    // --- Footer Year Update ---
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    } // End of Footer Year Logic

}); // End of DOMContentLoaded listener
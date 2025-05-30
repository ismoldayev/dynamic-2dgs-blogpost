document.addEventListener('DOMContentLoaded', () => {
    // --- Table of Contents Active Link Highlighting ---
    const tocLinks = document.querySelectorAll('#table-of-contents ul li a');
    const sections = [];
    tocLinks.forEach(link => {
        const sectionId = link.getAttribute('href')?.substring(1);
        if (sectionId) {
            const section = document.getElementById(sectionId);
            if (section) sections.push(section);
        }
    });

    function updateActiveTocLink() {
        let currentSectionId = '';
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        const offset = window.innerHeight * 0.1;

        for (let i = sections.length - 1; i >= 0; i--) {
            const section = sections[i];
            if (section.offsetTop <= scrollPosition + offset + 1) {
                currentSectionId = section.getAttribute('id');
                break;
            }
        }
        tocLinks.forEach(link => link.classList.remove('active'));
        if (currentSectionId) {
            const activeLink = document.querySelector(`#table-of-contents ul li a[href="#${currentSectionId}"]`);
            if (activeLink) activeLink.classList.add('active');
        }
    }
    window.addEventListener('scroll', updateActiveTocLink);
    setTimeout(updateActiveTocLink, 100); // Initial check

    // --- Video Comparison Slider Logic ---
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    /* Treat clip‑path as broken on iOS */
    const clipPathSupported =
          CSS.supports('(clip-path: inset(0 50% 0 0))') ||
          CSS.supports('(-webkit-clip-path: inset(0 50% 0 0))');
    console.log('clipPathSupported=', clipPathSupported, 'iOS=', isIOS);

    const comparisonContainers = document.querySelectorAll('.comparison-container');

    comparisonContainers.forEach(container => {
        const videoOver = container.querySelector('.comparison-video-over');
        const videoOverWrapper = container.querySelector('.video-over-wrapper');
        const sliderElement = container.querySelector('.comparison-slider');
        const videoUnder = container.querySelector('.comparison-video-under');

        if (!videoOver || !videoOverWrapper || !sliderElement || !videoUnder) {
            console.warn("Comparison container missing required elements (videoOver, videoOverWrapper, sliderElement, or videoUnder):", container);
            return;
        }

        // Initial setup based on the determined strategy
        if (clipPathSupported) { // Desktop and good browsers
            videoOverWrapper.style.clipPath = 'inset(0 50% 0 0)';
            videoOverWrapper.style.webkitClipPath = 'inset(0 50% 0 0)';
            // Ensure wrapper defers to CSS for full width
            videoOverWrapper.style.width = ''; 
            videoOverWrapper.style.right = ''; 
            videoOver.style.clipPath = ''; // Clear any direct clipPath on video
            videoOver.style.webkitClipPath = ''; // Clear any direct clipPath on video
        } else { // Fallback for iOS or browsers where clip-path on video is buggy
            videoOverWrapper.style.width = '50%';
            videoOverWrapper.style.right = 'auto'; // Allow width to take effect
            videoOver.style.clipPath = 'none';
            videoOver.style.webkitClipPath = 'none';
            videoOverWrapper.style.clipPath = ''; // Clear clipPath on wrapper if not supported
            videoOverWrapper.style.webkitClipPath = ''; // Clear clipPath on wrapper if not supported
        }
        
        // Sync playback and volume
        function syncVideos(master, slave) {
            if (master.paused !== slave.paused) {
                if (master.paused) slave.pause(); else slave.play();
            }
            if (Math.abs(master.currentTime - slave.currentTime) > 0.2) { // Sync if more than 0.2s diff
                slave.currentTime = master.currentTime;
            }
            slave.volume = master.volume;
            slave.muted = master.muted;
        }

        videoUnder.addEventListener('play', () => { if(videoOver.paused) videoOver.play(); });
        videoUnder.addEventListener('pause', () => { if(!videoOver.paused) videoOver.pause(); });
        videoUnder.addEventListener('volumechange', () => { videoOver.volume = videoUnder.volume; videoOver.muted = videoUnder.muted; });
        videoUnder.addEventListener('timeupdate', () => { // More robust syncing
            if (Math.abs(videoUnder.currentTime - videoOver.currentTime) > 0.5) { // Sync if more than 0.5s diff
                videoOver.currentTime = videoUnder.currentTime;
            }
        });
         videoOver.addEventListener('timeupdate', () => { // Sync other way too
            if (Math.abs(videoOver.currentTime - videoUnder.currentTime) > 0.5) {
                videoUnder.currentTime = videoOver.currentTime;
            }
        });


        let isDragging = false;

        function updateClip(xPosition) {
            const containerRect = container.getBoundingClientRect();
            let percentage = ((xPosition - containerRect.left) / containerRect.width) * 100;
            percentage = Math.max(0, Math.min(100, percentage)); // Clamp between 0 and 100

            if (clipPathSupported) { // Desktop and good browsers
                videoOverWrapper.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
                videoOverWrapper.style.webkitClipPath  = `inset(0 ${100 - percentage}% 0 0)`;
                // Ensure wrapper defers to CSS (no specific action needed here for update if already full via CSS)
            } else { // Fallback for iOS
                videoOverWrapper.style.width = `${percentage}%`;
                videoOverWrapper.style.right = 'auto'; // Ensure right remains auto for width to apply
            }
            sliderElement.style.left = `${percentage}%`;
        }

        sliderElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            sliderElement.classList.add('dragging'); // Optional: for styling
            // Play both videos if paused when interaction starts
            if(videoUnder.paused) videoUnder.play();
            if(videoOver.paused) videoOver.play();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                sliderElement.classList.remove('dragging');
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateClip(e.clientX);
            }
        });
        
        // Touch events for mobile
        sliderElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            sliderElement.classList.add('dragging');
            if(videoUnder.paused) videoUnder.play();
            if(videoOver.paused) videoOver.play();
            // Prevent page scroll while dragging slider
            e.preventDefault(); 
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                sliderElement.classList.remove('dragging');
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                updateClip(e.touches[0].clientX);
            }
        });


        // Initial clip based on default slider value (if slider input type range was used)
        // updateClip(sliderElement.getBoundingClientRect().left + (sliderElement.value / 100) * container.offsetWidth);
        // For our div slider, initial clip is set by CSS.
    });

    // --- Side-by-Side Video Sync Logic ---
    const sideBySidePairs = document.querySelectorAll('.side-by-side-video-pair');
    sideBySidePairs.forEach(pairContainer => {
        const videoItems = pairContainer.querySelectorAll('.video-item video'); // Get all video elements within .video-item

        if (videoItems.length >= 2) {
            const videoLeft = videoItems[0];
            const videoRight = videoItems[1];

            // Videos will attempt to play due to 'autoplay' attribute in HTML.
            // The Page Visibility API handler will attempt to resume them if paused on focus.

            // Sync playback time (master: videoLeft, slave: videoRight)
            videoLeft.addEventListener('timeupdate', () => {
                if (Math.abs(videoLeft.currentTime - videoRight.currentTime) > 0.2) { // Sync if more than 0.2s diff
                    videoRight.currentTime = videoLeft.currentTime;
                }
            });

            // Sync playback time (master: videoRight, slave: videoLeft) - for redundancy if one seeks
            videoRight.addEventListener('timeupdate', () => {
                if (Math.abs(videoRight.currentTime - videoLeft.currentTime) > 0.2) {
                    videoLeft.currentTime = videoRight.currentTime;
                }
            });
        } else {
            console.warn("Side-by-side video pair container missing required video elements (expected at least 2 videos within .video-item):", pairContainer);
            return; // Skip this pair if not enough videos found
        }
        
        // Optional: if you want them to start playing automatically when they scroll into view
        // You might need an Intersection Observer for that.
        // For now, they are muted and loop, and will play once the button is clicked.
    });

    // JuxtaposeJS init for image sliders (if you keep it)
    // This will find all divs with class 'juxtapose' and initialize them
    // No specific JS needed here if you just include their library and use the class.
    // If you have issues, you might need:
    // if (typeof juxtapose !== 'undefined') {
    //     juxtapose.scan(); 
    // }

    // --- Page Visibility API to handle video autoplay on tab focus ---
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log("Page became visible. Checking autoplay videos...");
            document.querySelectorAll('video[autoplay]').forEach(video => {
                if (video.paused) {
                    const videoIdentifier = video.id || video.src.split('/').pop(); // Get ID or filename
                    console.log('Attempting to resume play for paused autoplay video:', videoIdentifier);
                    video.play().catch(error => {
                        // It's common for these to fail if not directly user-initiated after a long sleep,
                        // but it's worth trying.
                        console.warn('Failed to resume play for video on visibility change:', videoIdentifier, error.name, error.message);
                    });
                }
            });
        } else {
            console.log("Page became hidden.");
            // We could explicitly pause videos here, but since they are looped and muted,
            // and the browser likely handles this, it might be best to leave them
            // to default browser behavior on hidden.
        }
    });
});

// Global function for Juxtapose slider compatibility (if still using its HTML structure)
// This function would be called by an oninput event of a range slider if you were using
// Juxtapose's HTML structure for the slider itself. The new CSS slider is different.
function updateComparison(slider) {
    const container = slider.closest('.comparison-container');
    if (!container) return;
    const videoOver = container.querySelector('.comparison-video-over');
    const sliderHandle = container.querySelector('.comparison-slider'); // The draggable div
    
    const percentage = slider.value; // Assuming slider is an <input type="range">
    videoOver.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    
    // If you are also moving a custom div slider handle based on an input range:
    if (sliderHandle) {
      sliderHandle.style.left = `${percentage}%`;
    }
}
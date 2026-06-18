const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

if (tabButtons.length && tabPanels.length) {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`tab-${target}`)?.classList.add('active');
    });
  });
}

const subtabButtons = document.querySelectorAll('.subtab-btn');
const subtabPanels = document.querySelectorAll('.skills-subpanel');

if (subtabButtons.length && subtabPanels.length) {
  subtabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.subtab;

      subtabButtons.forEach(btn => btn.classList.remove('active'));
      subtabPanels.forEach(panel => panel.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(`subtab-${target}`)?.classList.add('active');
    });
  });
}

const newsList = document.getElementById('newsList');
const seeMoreBtn = document.getElementById('seeMoreBtn');

if (newsList && seeMoreBtn) {
  const checkNewsOverflow = () => {
    const isOverflowing = newsList.scrollHeight > newsList.clientHeight + 5;

    if (!isOverflowing && !newsList.classList.contains('expanded')) {
      seeMoreBtn.classList.add('hidden');
    } else {
      seeMoreBtn.classList.remove('hidden');
    }
  };

  checkNewsOverflow();

  seeMoreBtn.addEventListener('click', () => {
    newsList.classList.toggle('expanded');

    if (newsList.classList.contains('expanded')) {
      seeMoreBtn.textContent = 'show less';
    } else {
      seeMoreBtn.textContent = '...see more';
    }
  });

  window.addEventListener('resize', checkNewsOverflow);
}

/* =========================================================
   AUTOPLAYING AND LOOPING YOUTUBE SEGMENTS
   ========================================================= */

const youtubeSegmentElements =
  document.querySelectorAll(".youtube-segment");

if (youtubeSegmentElements.length > 0) {
  const youtubeSegmentConfigs = [];

  /*
   * Give every player its own automatically generated ID.
   * This prevents multiple videos from being inserted into
   * the same media block.
   */
  youtubeSegmentElements.forEach(function (element, index) {
    const playerHost = document.createElement("div");
    const playerId = `youtube-segment-player-${index}`;

    playerHost.id = playerId;
    playerHost.className = "youtube-player-host";
    element.appendChild(playerHost);

    youtubeSegmentConfigs.push({
      playerId: playerId,
      videoId: element.dataset.videoId,
      startTime: Number(element.dataset.start),
      endTime: Number(element.dataset.end),
      title: element.dataset.title || "Project video"
    });
  });

  const youtubeSegmentPlayers = [];

  function initializeYouTubeSegmentPlayers() {
    youtubeSegmentConfigs.forEach(function (config) {
      let loopInterval = null;

      const player = new YT.Player(config.playerId, {
        videoId: config.videoId,

        playerVars: {
          autoplay: 1,
          controls: 0,
          playsinline: 1,
          rel: 0,
          start: config.startTime,
          enablejsapi: 1
        },

        events: {
          onReady: function (event) {
            const iframe = event.target.getIframe();

            if (iframe) {
              iframe.title = config.title;
            }

            /*
             * Muting is required for reliable browser autoplay.
             */
            event.target.mute();
            event.target.seekTo(config.startTime, true);
            event.target.playVideo();

            /*
             * Return to the selected start time when the video
             * reaches the selected end time.
             */
            loopInterval = window.setInterval(function () {
              const currentTime = event.target.getCurrentTime();

              if (currentTime >= config.endTime) {
                event.target.seekTo(config.startTime, true);
                event.target.playVideo();
              }
            }, 100);
          },

          onStateChange: function (event) {
            if (event.data === YT.PlayerState.ENDED) {
              event.target.seekTo(config.startTime, true);
              event.target.playVideo();
            }
          },

          onError: function (event) {
            console.error(
              `YouTube player error for ${config.videoId}:`,
              event.data
            );

            if (loopInterval) {
              window.clearInterval(loopInterval);
            }
          }
        }
      });

      youtubeSegmentPlayers.push(player);
    });
  }

  window.onYouTubeIframeAPIReady =
    initializeYouTubeSegmentPlayers;

  /*
   * Load the YouTube API only once.
   */
  if (window.YT && typeof window.YT.Player === "function") {
    initializeYouTubeSegmentPlayers();
  } else if (
    !document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )
  ) {
    const youtubeApiScript = document.createElement("script");
    youtubeApiScript.src =
      "https://www.youtube.com/iframe_api";

    document.head.appendChild(youtubeApiScript);
  }
}

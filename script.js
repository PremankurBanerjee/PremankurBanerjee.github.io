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

const youtubeSegmentVideos = [
  {
    elementId: "surfing-player",
    videoId: "LHdclthCQws",
    startTime: 181, // 3:01
    endTime: 204    // 3:24
  },
  {
    elementId: "swimvr-player",
    videoId: "3Orf-ua3N1Y",
    startTime: 111, // 1:51
    endTime: 118    // 1:58
  }
];

const youtubePlayers = [];
let youtubePlayersInitialized = false;

/*
 * YouTube automatically calls this function when its
 * IFrame Player API has finished loading.
 */
window.onYouTubeIframeAPIReady = function () {
  if (youtubePlayersInitialized) return;

  youtubePlayersInitialized = true;

  youtubeSegmentVideos.forEach(function (videoConfig) {
    const playerContainer = document.getElementById(videoConfig.elementId);

    /*
     * Skip this player if its HTML element is not present
     * on the current page.
     */
    if (!playerContainer) return;

    const player = new YT.Player(videoConfig.elementId, {
      videoId: videoConfig.videoId,

      playerVars: {
        autoplay: 1,
        controls: 0,
        playsinline: 1,
        rel: 0,
        start: videoConfig.startTime
      },

      events: {
        onReady: function (event) {
          /*
           * Browsers generally allow autoplay only when
           * the video begins muted.
           */
          event.target.mute();
          event.target.seekTo(videoConfig.startTime, true);
          event.target.playVideo();

          /*
           * Check the timestamp repeatedly. When the player
           * reaches the selected end time, return to the start.
           */
          window.setInterval(function () {
            const currentTime = event.target.getCurrentTime();
            const playerState = event.target.getPlayerState();

            if (
              playerState === YT.PlayerState.PLAYING &&
              currentTime >= videoConfig.endTime
            ) {
              event.target.seekTo(videoConfig.startTime, true);
              event.target.playVideo();
            }
          }, 150);
        },

        /*
         * Fallback in case the full YouTube video reaches
         * its natural ending.
         */
        onStateChange: function (event) {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(videoConfig.startTime, true);
            event.target.playVideo();
          }
        }
      }
    });

    youtubePlayers.push(player);
  });
};

/* Load the YouTube IFrame Player API only once */
if (
  document.getElementById("surfing-player") ||
  document.getElementById("swimvr-player")
) {
  if (window.YT && typeof window.YT.Player === "function") {
    window.onYouTubeIframeAPIReady();
  } else if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const youtubeApiScript = document.createElement("script");
    youtubeApiScript.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(youtubeApiScript);
  }
}




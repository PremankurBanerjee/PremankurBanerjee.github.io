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

/* YouTube segment player for the surfing project */
const SURFING_VIDEO_ID = "LHdclthCQws";
const SURFING_START_TIME = 181;
const SURFING_END_TIME = 204;

let surfingPlayer = null;
let surfingLoopInterval = null;

const surfingPlayerElement = document.getElementById("surfing-player");

if (surfingPlayerElement) {
  /*
   * YouTube calls this function automatically after the
   * IFrame Player API has loaded.
   */
  window.onYouTubeIframeAPIReady = function () {
    surfingPlayer = new YT.Player("surfing-player", {
      videoId: SURFING_VIDEO_ID,

      playerVars: {
        autoplay: 1,
        controls: 0,
        playsinline: 1,
        rel: 0,
        start: SURFING_START_TIME
      },

      events: {
        onReady: function (event) {
          /*
           * Autoplay is much more reliable when the video
           * begins muted.
           */
          event.target.mute();
          event.target.seekTo(SURFING_START_TIME, true);
          event.target.playVideo();

          surfingLoopInterval = window.setInterval(function () {
            if (
              surfingPlayer &&
              typeof surfingPlayer.getCurrentTime === "function" &&
              surfingPlayer.getPlayerState() === YT.PlayerState.PLAYING &&
              surfingPlayer.getCurrentTime() >= SURFING_END_TIME
            ) {
              surfingPlayer.seekTo(SURFING_START_TIME, true);
              surfingPlayer.playVideo();
            }
          }, 200);
        },

        /*
         * Fallback in case YouTube reaches the end state
         * before the interval detects the selected end time.
         */
        onStateChange: function (event) {
          if (event.data === YT.PlayerState.ENDED) {
            event.target.seekTo(SURFING_START_TIME, true);
            event.target.playVideo();
          }
        }
      }
    });
  };

  /* Load the YouTube IFrame Player API */
  const youtubeApiScript = document.createElement("script");
  youtubeApiScript.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(youtubeApiScript);
}



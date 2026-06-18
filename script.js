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
   AUTOPLAYING AND LOOPING YOUTUBE PROJECT VIDEOS
   ========================================================= */

const projectVideoClips = [
  {
    elementId: "surfing-player",
    videoId: "LHdclthCQws",
    startTime: 182, // 3:02
    endTime: 204    // 3:24
  },
  {
    elementId: "swimvr-player",
    videoId: "3Orf-ua3N1Y",
    startTime: 111, // 1:51
    endTime: 118    // 1:58
  }
];

const projectVideoPlayers = [];


/*
 * Load and play one selected section of a video.
 */
function loadProjectVideoClip(player, clip) {
  player.mute();

  player.loadVideoById({
    videoId: clip.videoId,
    startSeconds: clip.startTime,
    endSeconds: clip.endTime
  });
}


/*
 * YouTube calls this automatically after the
 * IFrame Player API has loaded.
 */
window.onYouTubeIframeAPIReady = function () {
  projectVideoClips.forEach(function (clip) {
    const playerElement = document.getElementById(clip.elementId);

    if (!playerElement) {
      console.warn(
        `YouTube player element not found: ${clip.elementId}`
      );
      return;
    }

    const playerVars = {
      autoplay: 1,
      controls: 0,
      playsinline: 1,
      rel: 0,
      enablejsapi: 1
    };

    /*
     * YouTube recommends specifying the website origin
     * when controlling the player through JavaScript.
     */
    if (
      window.location.protocol === "http:" ||
      window.location.protocol === "https:"
    ) {
      playerVars.origin = window.location.origin;
    }

    const player = new YT.Player(clip.elementId, {
      width: "100%",
      height: "100%",
      videoId: clip.videoId,
      playerVars: playerVars,

      events: {
        onReady: function (event) {
          loadProjectVideoClip(event.target, clip);

          /*
           * Timestamp fallback. If YouTube does not emit
           * the ended state exactly at endSeconds, reload
           * the selected segment manually.
           */
          window.setInterval(function () {
            const currentTime = event.target.getCurrentTime();
            const playerState = event.target.getPlayerState();

            if (
              playerState === YT.PlayerState.PLAYING &&
              currentTime >= clip.endTime - 0.1
            ) {
              loadProjectVideoClip(event.target, clip);
            }
          }, 200);
        },

        onStateChange: function (event) {
          /*
           * Restart the selected clip when YouTube reports
           * that playback has ended.
           */
          if (event.data === YT.PlayerState.ENDED) {
            loadProjectVideoClip(event.target, clip);
          }
        },

        onAutoplayBlocked: function () {
          console.warn(
            `Autoplay was blocked for video: ${clip.videoId}`
          );
        },

        onError: function (event) {
          console.error(
            `YouTube error ${event.data} for video ${clip.videoId}`
          );
        }
      }
    });

    projectVideoPlayers.push(player);
  });
};


/*
 * Load the YouTube IFrame API only when this page
 * contains at least one project video.
 */
const hasProjectVideos = projectVideoClips.some(function (clip) {
  return document.getElementById(clip.elementId);
});

if (hasProjectVideos) {
  if (window.YT && typeof window.YT.Player === "function") {
    window.onYouTubeIframeAPIReady();
  } else if (
    !document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )
  ) {
    const youtubeApiScript =
      document.createElement("script");

    youtubeApiScript.src =
      "https://www.youtube.com/iframe_api";

    const firstScript =
      document.getElementsByTagName("script")[0];

    firstScript.parentNode.insertBefore(
      youtubeApiScript,
      firstScript
    );
  }
}

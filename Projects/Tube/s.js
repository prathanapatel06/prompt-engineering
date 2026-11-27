
"use strict";

const YOUTUBE_API_KEY = "HIDDEN";

const SEARCH_URL =
  "https://www.googleapis.com/youtube/v3/search";

const VIDEOS_URL =
  "https://www.googleapis.com/youtube/v3/videos";



const $ = id => document.getElementById(id);

const videoGrid = $("videoGrid");
const searchForm = $("searchForm");
const searchInput = $("searchInput");
const videoModal = $("videoModal");
const videoPlayer = $("videoPlayer");

const requiredElements = [
  "videoGrid",
  "searchForm",
  "searchInput",
  "videoModal",
  "videoPlayer",
  "pageTitle",
  "pageSubtitle",
  "videoCount",
  "emptyState",
  "showHomeBtn",
  "sidebar",
  "logoBtn",
  "closeModal",
  "modalTitle",
  "modalChannel",
  "modalViews",
  "modalDescription",
  "likeBtn",
  "saveBtn",
  "shareBtn",
  "commentForm",
  "commentInput",
  "commentsList",
  "themeBtn",
  "menuBtn"
];

const missingElements = requiredElements.filter(
  id => !$(id)
);

if (missingElements.length) {
  alert(
    "Missing HTML elements: " +
    missingElements.join(", ")
  );

  throw new Error("TUBE HTML elements are missing.");
}


/* =====================================================
   3. WEBSITE STATE
===================================================== */

let currentPage = "Home";
let currentCategory = "All";
let currentSearch = "";

let homeVideos = [];
let searchResults = [];
let categoryVideos = [];

let currentVideo = null;

let activeRequest = 0;

let playbackQueue = [];
let playbackIndex = 0;
let playbackSession = 0;

let youtubePlayer = null;
let youtubeAPIReady = null;


/* =====================================================
   4. LOCAL STORAGE
===================================================== */

function readStorage(key) {
  try {
    const value = JSON.parse(
      localStorage.getItem(key)
    );

    return Array.isArray(value) ? value : [];

  } catch {
    return [];
  }
}

function saveStorage(key, value) {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

let likedVideos = readStorage("tubeLiked");

let watchLaterVideos =
  readStorage("tubeWatchLater");

let historyVideos =
  readStorage("tubeHistory");

let comments = {};

try {
  comments = JSON.parse(
    localStorage.getItem("tubeComments")
  ) || {};
} catch {
  comments = {};
}


/* =====================================================
   5. HELPER FUNCTIONS
===================================================== */

function checkAPIKey() {
  if (
    !YOUTUBE_API_KEY ||
    YOUTUBE_API_KEY === "PASTE_YOUR_API_KEY_HERE"
  ) {
    throw new Error(
      "Please add your YouTube API key at the beginning of s.js."
    );
  }
}


function formatDuration(duration) {
  if (!duration) return "";

  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
  );

  if (!match) return "";

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  if (hours > 0) {
    return (
      hours + ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  return (
    minutes + ":" +
    String(seconds).padStart(2, "0")
  );
}


function formatViews(value) {
  const views = Number(value || 0);

  if (views >= 1_000_000_000) {
    return (
      (views / 1_000_000_000).toFixed(1) +
      "B views"
    );
  }

  if (views >= 1_000_000) {
    return (
      (views / 1_000_000).toFixed(1) +
      "M views"
    );
  }

  if (views >= 1_000) {
    return (
      (views / 1_000).toFixed(1) +
      "K views"
    );
  }

  return views.toLocaleString() + " views";
}


function getCategoryName(categoryId) {
  const categories = {
    "1": "Film",
    "2": "Autos",
    "10": "Music",
    "15": "Pets",
    "17": "Sports",
    "19": "Travel",
    "20": "Gaming",
    "22": "People",
    "23": "Comedy",
    "24": "Entertainment",
    "25": "News",
    "26": "Lifestyle",
    "27": "Education",
    "28": "Technology",
    "29": "Nonprofits"
  };

  return categories[String(categoryId)] || "Other";
}


/* =====================================================
   6. API REQUEST FUNCTION
===================================================== */

async function fetchYouTube(url) {
  const response = await fetch(url);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "YouTube returned an invalid response."
    );
  }

  if (!response.ok) {
    const reason =
      data.error?.errors?.[0]?.reason || "";

    const message =
      data.error?.message || "YouTube API error.";

    if (reason === "quotaExceeded") {
      throw new Error(
        "YouTube API daily quota exceeded. Try again after the quota resets."
      );
    }

    if (reason === "keyInvalid") {
      throw new Error(
        "Your YouTube API key is invalid."
      );
    }

    if (reason === "accessNotConfigured") {
      throw new Error(
        "Enable YouTube Data API v3 in Google Cloud."
      );
    }

    if (response.status === 403) {
      throw new Error(
        "YouTube API access denied. Check your API key, restrictions and quota."
      );
    }

    throw new Error(message);
  }

  return data;
}


/* =====================================================
   7. GET VIDEO DETAILS AND DURATIONS
===================================================== */

async function getVideoDetails(ids) {
  if (!ids.length) return [];

  const params = new URLSearchParams({
    part: "snippet,contentDetails,statistics,status",
    id: ids.join(","),
    key: YOUTUBE_API_KEY
  });

  const data = await fetchYouTube(
    VIDEOS_URL + "?" + params.toString()
  );

  return data.items || [];
}


/* =====================================================
   8. CONVERT YOUTUBE RESULTS
===================================================== */

function convertVideos(items, details) {
  const detailMap = new Map(
    details.map(video => [video.id, video])
  );

  return items.map(item => {
    const id = item.id?.videoId || item.id;

    const detail = detailMap.get(id);

    const snippet =
      detail?.snippet || item.snippet || {};

    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      "";

    return {
      id: id,
      youtubeId: id,

      title:
        snippet.title || "Untitled video",

      channel:
        snippet.channelTitle || "YouTube channel",

      category:
        getCategoryName(snippet.categoryId),

      thumbnail: thumbnail,

      duration: formatDuration(
        detail?.contentDetails?.duration
      ),

      views: formatViews(
        detail?.statistics?.viewCount
      ),

      embeddable:
        detail?.status?.embeddable === true,

      privacyStatus:
        detail?.status?.privacyStatus || ""
    };
  });
}


function isEmbeddable(video) {
  return (
    video.embeddable === true &&
    video.privacyStatus === "public" &&
    Boolean(video.youtubeId) &&
    Boolean(video.thumbnail)
  );
}


/* =====================================================
   9. SEARCH YOUTUBE
===================================================== */

async function searchYouTube(query) {
  checkAPIKey();

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "25",
    regionCode: "IN",
    relevanceLanguage: "en",
    safeSearch: "moderate",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    key: YOUTUBE_API_KEY
  });

  const searchData = await fetchYouTube(
    SEARCH_URL + "?" + params.toString()
  );

  const items = searchData.items || [];

  if (!items.length) return [];

  const ids = items
    .map(item => item.id?.videoId)
    .filter(Boolean);

  const details = await getVideoDetails(ids);

  return convertVideos(items, details)
    .filter(isEmbeddable);
}


/* =====================================================
   10. LOAD HOME VIDEOS
===================================================== */

async function loadHomeVideos() {
  const requestId = ++activeRequest;

  currentPage = "Home";
  currentSearch = "";
  currentCategory = "All";

  searchResults = [];
  categoryVideos = [];

  $("pageTitle").textContent = "Home";

  $("pageSubtitle").textContent =
    "Loading popular videos...";

  renderVideos();

  try {
    checkAPIKey();

    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics,status",
      chart: "mostPopular",
      regionCode: "IN",
      maxResults: "25",
      key: YOUTUBE_API_KEY
    });

    const data = await fetchYouTube(
      VIDEOS_URL + "?" + params.toString()
    );

    if (requestId !== activeRequest) return;

    homeVideos = convertVideos(
      data.items || [],
      data.items || []
    ).filter(isEmbeddable);

    if (!homeVideos.length) {
      throw new Error(
        "No popular embeddable videos were returned. Try searching for a video."
      );
    }

  } catch (error) {
    if (requestId !== activeRequest) return;

    console.error("Home error:", error);

    homeVideos = [];

    showMessage(
      "Unable to load Home videos",
      error.message
    );

    return;
  }

  if (requestId === activeRequest) {
    updatePage();
  }
}


/* =====================================================
   11. SEARCH FUNCTION
===================================================== */

async function performSearch() {
  const query = searchInput.value.trim();

  if (!query) {
    loadHomeVideos();
    return;
  }

  const requestId = ++activeRequest;

  currentSearch = query;
  currentPage = "Home";
  currentCategory = "All";

  searchResults = [];
  categoryVideos = [];

  $("pageTitle").textContent = "Search Results";

  $("pageSubtitle").textContent =
    "Searching YouTube...";

  renderVideos();

  try {
    const results = await searchYouTube(query);

    if (requestId !== activeRequest) return;

    searchResults = results;

    if (!results.length) {
      showMessage(
        "No playable results found",
        "Try a different search phrase."
      );

      return;
    }

  } catch (error) {
    if (requestId !== activeRequest) return;

    console.error("Search error:", error);

    showMessage(
      "Search error",
      error.message
    );

    return;
  }

  if (requestId === activeRequest) {
    updatePage();
  }
}


searchForm.addEventListener("submit", event => {
  event.preventDefault();
  performSearch();
});


/* =====================================================
   12. LOAD CATEGORY VIDEOS
===================================================== */

async function loadCategoryVideos(category) {
  const requestId = ++activeRequest;

  currentPage = category;
  currentSearch = "";
  currentCategory = "All";

  searchResults = [];
  categoryVideos = [];

  $("pageTitle").textContent = category;
  $("pageSubtitle").textContent =
    "Loading " + category + " videos...";

  renderVideos();

  try {
    const results = await searchYouTube(category);

    if (requestId !== activeRequest) return;

    categoryVideos = results;

    if (!results.length) {
      showMessage(
        "No playable videos found",
        "Try another category."
      );

      return;
    }

  } catch (error) {
    if (requestId !== activeRequest) return;

    console.error("Category error:", error);

    showMessage(
      "Unable to load videos",
      error.message
    );

    return;
  }

  if (requestId === activeRequest) {
    updatePage();
  }
}


/* =====================================================
   13. GET CURRENT VIDEO LIST
===================================================== */

function getVisibleVideos() {
  let videos = [];

  if (currentSearch) {
    videos = [...searchResults];

  } else if (
    currentPage === "Home" ||
    currentPage === "Trending"
  ) {
    videos = [...homeVideos];

  } else if (currentPage === "Liked Videos") {
    videos = [...likedVideos];

  } else if (currentPage === "Watch Later") {
    videos = [...watchLaterVideos];

  } else if (currentPage === "History") {
    videos = [...historyVideos];

  } else {
    videos = [...categoryVideos];
  }

  if (currentCategory !== "All") {
    videos = videos.filter(video =>
      video.category === currentCategory
    );
  }

  const seen = new Set();

  return videos.filter(video => {
    if (!video.youtubeId) return false;

    if (seen.has(video.youtubeId)) return false;

    seen.add(video.youtubeId);

    return true;
  });
}


/* =====================================================
   14. EMPTY STATE
===================================================== */

function showMessage(title, message) {
  const heading =
    $("emptyState").querySelector("h2");

  const paragraph =
    $("emptyState").querySelector("p");

  if (heading) heading.textContent = title;

  if (paragraph) paragraph.textContent = message;

  $("emptyState").hidden = false;

  $("showHomeBtn").hidden = false;

  videoGrid.innerHTML = "";
  videoGrid.style.display = "none";

  $("videoCount").textContent = "0 videos";

  $("pageSubtitle").textContent = message;
}


/* =====================================================
   15. RENDER VIDEO LIST
   DESCRIPTIONS REMOVED
===================================================== */

function renderVideos() {
  const videos = getVisibleVideos();

  videoGrid.innerHTML = "";

  videoGrid.style.display = "flex";
  videoGrid.style.flexDirection = "column";
  videoGrid.style.gap = "18px";

  $("videoCount").textContent =
    videos.length + " videos";

  if (!videos.length) {
    const title = currentSearch
      ? "No videos found"
      : "No videos available";

    showMessage(
      title,
      "Try searching for another video."
    );

    return;
  }

  $("emptyState").hidden = true;

  videos.forEach(video => {
    const row = document.createElement("article");

    row.className = "video-row";
    row.tabIndex = 0;

    const thumbnailBox =
      document.createElement("div");

    thumbnailBox.className = "video-thumbnail";

    const image = document.createElement("img");

    image.src = video.thumbnail;
    image.alt = video.title;
    image.loading = "lazy";

    const duration = document.createElement("span");

    duration.className = "video-duration";

    duration.textContent =
      video.duration || "Duration unavailable";

    thumbnailBox.append(image, duration);

    const info = document.createElement("div");

    info.className = "video-info";

    const title = document.createElement("h3");

    title.textContent = video.title;

    const channel = document.createElement("p");

    channel.textContent = video.channel;

    const views = document.createElement("p");

    views.textContent = video.views;

    // Descriptions are intentionally not displayed.
    info.append(title, channel, views);

    row.append(thumbnailBox, info);

    row.addEventListener("click", () => {
      openVideo(video);
    });

    row.addEventListener("keydown", event => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        openVideo(video);
      }
    });

    videoGrid.appendChild(row);
  });
}


/* =====================================================
   16. UPDATE PAGE
===================================================== */

function updatePage() {
  $("pageTitle").textContent =
    currentSearch ? "Search Results" : currentPage;

  if (currentSearch) {
    $("pageSubtitle").textContent =
      "Search results for: " + currentSearch;

  } else if (currentPage === "Home") {
    $("pageSubtitle").textContent =
      "Discover videos you might enjoy";

  } else {
    $("pageSubtitle").textContent =
      "Explore " + currentPage + " videos";
  }

  document.querySelectorAll(".nav-item")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === currentPage
      );
    });

  document.querySelectorAll(".category")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.category === currentCategory
      );
    });

  renderVideos();
}


/* =====================================================
   17. HOME BUTTON
===================================================== */

function goHome() {
  searchInput.value = "";
  loadHomeVideos();
}

$("logoBtn").addEventListener("click", event => {
  event.preventDefault();
  goHome();
});

$("showHomeBtn").addEventListener("click", goHome);


/* =====================================================
   18. SIDEBAR NAVIGATION
===================================================== */

document.querySelectorAll(".nav-item")
  .forEach(button => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      if (!page) return;

      searchInput.value = "";

      currentSearch = "";
      currentCategory = "All";

      $("sidebar").classList.remove("open");

      if (page === "Home") {
        loadHomeVideos();

      } else if (page === "Trending") {
        if (homeVideos.length) {
          currentPage = "Trending";
          updatePage();
        } else {
          loadHomeVideos();
        }

      } else if (
        ["Music", "Gaming", "Education", "Technology", "Sports"]
          .includes(page)
      ) {
        loadCategoryVideos(page);

      } else {
        activeRequest++;
        currentPage = page;
        categoryVideos = [];
        updatePage();
      }
    });
  });


/* =====================================================
   19. CATEGORY FILTERS
===================================================== */

document.querySelectorAll(".category")
  .forEach(button => {
    button.addEventListener("click", () => {
      currentCategory = button.dataset.category;
      updatePage();
    });
  });


/* =====================================================
   20. LOAD YOUTUBE IFRAME API
===================================================== */

function loadYouTubeIframeAPI() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  if (youtubeAPIReady) {
    return youtubeAPIReady;
  }

  youtubeAPIReady = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const previousCallback =
      window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }

      resolve();
    };

    if (!existingScript) {
      const script = document.createElement("script");

      script.src =
        "https://www.youtube.com/iframe_api";

      script.async = true;

      script.onerror = () => {
        youtubeAPIReady = null;

        reject(
          new Error("Unable to load YouTube player API.")
        );
      };

      document.head.appendChild(script);
    }

    setTimeout(() => {
      if (!(window.YT && window.YT.Player)) {
        youtubeAPIReady = null;

        reject(
          new Error("YouTube player API did not load. Check your internet connection.")
        );
      }
    }, 15000);
  });

  return youtubeAPIReady;
}


/* =====================================================
   21. CREATE PLAYER CONTAINER
===================================================== */

function createPlayerContainer() {
  const oldContainer = $("tubePlayerContainer");

  if (oldContainer) {
    oldContainer.remove();
  }

  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  videoPlayer.style.display = "none";

  const container = document.createElement("div");

  container.id = "tubePlayerContainer";

  const playerElement = document.createElement("div");

  playerElement.id = "youtubePlayer";

  container.appendChild(playerElement);

  const status = document.createElement("p");

  status.id = "playerStatus";
  status.textContent = "Loading video...";

  container.appendChild(status);

  videoPlayer.insertAdjacentElement(
    "afterend",
    container
  );

  return container;
}


/* =====================================================
   22. START VIDEO PLAYER
===================================================== */

async function playVideoAt(index, session) {
  if (session !== playbackSession) return;

  if (index >= playbackQueue.length) {
    showPlayerFailure(
      "No playable videos found in these results."
    );

    return;
  }

  playbackIndex = index;

  const video = playbackQueue[index];

  currentVideo = video;

  $("modalTitle").textContent = video.title;
  $("modalChannel").textContent = video.channel;
  $("modalViews").textContent = video.views;

  // Remove description from player.
  $("modalDescription").textContent = "";
  $("modalDescription").hidden = true;

  if (youtubePlayer) {
    try {
      youtubePlayer.destroy();
    } catch (error) {
      console.warn(error);
    }

    youtubePlayer = null;
  }

  const container = createPlayerContainer();

  const status = $("playerStatus");

  status.textContent = "Loading " + video.title + "...";

  try {
    await loadYouTubeIframeAPI();

    if (session !== playbackSession) return;

    youtubePlayer = new YT.Player("youtubePlayer", {
      width: "100%",
      height: "100%",

      videoId: video.youtubeId,

      playerVars: {
        autoplay: 1,
        controls: 1,
        playsinline: 1,
        rel: 0,
        enablejsapi: 1,
        origin: window.location.origin
      },

      events: {
        onReady: event => {
          if (session !== playbackSession) return;

          status.textContent = "";

          event.target.playVideo();
        },

        onStateChange: event => {
          if (session !== playbackSession) return;

          if (event.data === YT.PlayerState.PLAYING) {
            status.textContent = "";
          }
        },

        onError: event => {
          if (session !== playbackSession) return;

          console.warn(
            "YouTube player error:",
            event.data,
            video.youtubeId
          );

          status.textContent =
            "This video cannot play. Trying another result...";

          // Try the next search result automatically.
          setTimeout(() => {
            if (session === playbackSession) {
              playVideoAt(index + 1, session);
            }
          }, 900);
        }
      }
    });

  } catch (error) {
    if (session !== playbackSession) return;

    console.error("Player error:", error);

    status.textContent =
      "Player error. Trying another video...";

    setTimeout(() => {
      if (session === playbackSession) {
        playVideoAt(index + 1, session);
      }
    }, 900);
  }
}


/* =====================================================
   23. PLAYER FAILURE MESSAGE
===================================================== */

function showPlayerFailure(message) {
  const status = $("playerStatus");

  if (status) {
    status.textContent = message;
  }

  const oldLink = $("youtubeFallback");

  if (oldLink) oldLink.remove();

  if (currentVideo) {
    const link = document.createElement("a");

    link.id = "youtubeFallback";

    link.href =
      "https://www.youtube.com/watch?v=" +
      encodeURIComponent(currentVideo.youtubeId);

    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.textContent = "Open this video on YouTube";

    $("tubePlayerContainer").appendChild(link);
  }
}


/* =====================================================
   24. OPEN VIDEO AND PREPARE FALLBACK QUEUE
===================================================== */

function openVideo(video) {
  if (!video || !video.youtubeId) {
    alert("This video does not have a valid YouTube ID.");
    return;
  }

  playbackSession++;

  const session = playbackSession;

  const videos = getVisibleVideos();

  const selectedIndex = videos.findIndex(
    item => item.youtubeId === video.youtubeId
  );

  // Start with the selected video, then try other results.
  playbackQueue = selectedIndex >= 0
    ? [
        ...videos.slice(selectedIndex),
        ...videos.slice(0, selectedIndex)
      ]
    : [video];

  $("videoModal").classList.add("show");

  document.body.style.overflow = "hidden";

  updateActionButtons();

  renderComments();

  // Add this video to viewing history.
  historyVideos = historyVideos.filter(
    item => item.id !== video.id
  );

  historyVideos.unshift(video);

  historyVideos = historyVideos.slice(0, 100);

  saveStorage("tubeHistory", historyVideos);

  playVideoAt(0, session);
}


/* =====================================================
   25. CLOSE PLAYER
===================================================== */

function closeVideo() {
  playbackSession++;

  if (youtubePlayer) {
    try {
      youtubePlayer.destroy();
    } catch (error) {
      console.warn(error);
    }

    youtubePlayer = null;
  }

  const container = $("tubePlayerContainer");

  if (container) {
    container.remove();
  }

  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  videoPlayer.style.display = "";

  videoModal.classList.remove("show");

  document.body.style.overflow = "";

  currentVideo = null;
  playbackQueue = [];
}


$("closeModal").addEventListener(
  "click",
  closeVideo
);


videoModal.addEventListener("click", event => {
  if (event.target === videoModal) {
    closeVideo();
  }
});


document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    videoModal.classList.contains("show")
  ) {
    closeVideo();
  }
});


/* =====================================================
   26. LIKE AND WATCH LATER BUTTONS
===================================================== */

function updateActionButtons() {
  if (!currentVideo) return;

  const liked = likedVideos.some(
    item => item.id === currentVideo.id
  );

  const saved = watchLaterVideos.some(
    item => item.id === currentVideo.id
  );

  $("likeBtn").textContent = liked
    ? "👍 Liked"
    : "👍 Like";

  $("saveBtn").textContent = saved
    ? "✓ Saved"
    : "⏰ Watch Later";
}


/* =====================================================
   27. LIKE VIDEO
===================================================== */

$("likeBtn").addEventListener("click", () => {
  if (!currentVideo) return;

  const exists = likedVideos.some(
    item => item.id === currentVideo.id
  );

  if (exists) {
    likedVideos = likedVideos.filter(
      item => item.id !== currentVideo.id
    );
  } else {
    likedVideos.unshift(currentVideo);
  }

  saveStorage("tubeLiked", likedVideos);

  updateActionButtons();
});


/* =====================================================
   28. WATCH LATER
===================================================== */

$("saveBtn").addEventListener("click", () => {
  if (!currentVideo) return;

  const exists = watchLaterVideos.some(
    item => item.id === currentVideo.id
  );

  if (exists) {
    watchLaterVideos = watchLaterVideos.filter(
      item => item.id !== currentVideo.id
    );
  } else {
    watchLaterVideos.unshift(currentVideo);
  }

  saveStorage(
    "tubeWatchLater",
    watchLaterVideos
  );

  updateActionButtons();
});


/* =====================================================
   29. SHARE VIDEO
===================================================== */

$("shareBtn").addEventListener("click", async () => {
  if (!currentVideo) return;

  const url =
    "https://www.youtube.com/watch?v=" +
    encodeURIComponent(currentVideo.youtubeId);

  try {
    if (navigator.share) {
      await navigator.share({
        title: currentVideo.title,
        text: "Watch this video",
        url: url
      });

    } else {
      await navigator.clipboard.writeText(url);

      alert("Video link copied!");
    }

  } catch (error) {
    if (error.name !== "AbortError") {
      alert("Unable to share the video.");
    }
  }
});


/* =====================================================
   30. COMMENTS
===================================================== */

function renderComments() {
  const list = $("commentsList");

  list.innerHTML = "";

  if (!currentVideo) return;

  const videoComments =
    comments[currentVideo.id] || [];

  if (!videoComments.length) {
    list.textContent =
      "No comments yet. Be the first to comment!";

    return;
  }

  videoComments.forEach(comment => {
    const item = document.createElement("p");

    item.className = "comment";

    item.textContent = "👤 " + comment;

    list.appendChild(item);
  });
}


$("commentForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!currentVideo) return;

  const input = $("commentInput");

  const value = input.value.trim();

  if (!value) return;

  comments[currentVideo.id] ||= [];

  comments[currentVideo.id].push(value);

  localStorage.setItem(
    "tubeComments",
    JSON.stringify(comments)
  );

  input.value = "";

  renderComments();
});


/* =====================================================
   31. DARK MODE
===================================================== */

function updateThemeButton() {
  $("themeBtn").textContent =
    document.body.classList.contains("dark")
      ? "☀️"
      : "🌙";
}


if (localStorage.getItem("tubeTheme") === "dark") {
  document.body.classList.add("dark");
}

updateThemeButton();


$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const theme =
    document.body.classList.contains("dark")
      ? "dark"
      : "light";

  localStorage.setItem("tubeTheme", theme);

  updateThemeButton();
});


/* =====================================================
   32. MOBILE MENU
===================================================== */

$("menuBtn").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});


/* =====================================================
   33. VIDEO LIST AND PLAYER STYLES
===================================================== */

const tubeStyle = document.createElement("style");

tubeStyle.textContent = `
  .video-row {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    padding: 10px;
    border-radius: 12px;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
    transition: background .2s;
  }

  .video-row:hover {
    background: rgba(128,128,128,.13);
  }

  .video-thumbnail {
    position: relative;
    flex: 0 0 280px;
    max-width: 40%;
  }

  .video-thumbnail img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: 10px;
  }

  .video-duration {
    position: absolute;
    bottom: 8px;
    right: 8px;
    color: white;
    background: rgba(0,0,0,.85);
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 12px;
  }

  .video-info {
    flex: 1;
    min-width: 0;
  }

  .video-info h3 {
    margin: 4px 0 9px;
  }

  .video-info p {
    margin: 5px 0;
    opacity: .75;
  }

  #tubePlayerContainer {
    width: 100%;
    background: #000;
    overflow: hidden;
  }

  #youtubePlayer {
    width: 100%;
    aspect-ratio: 16 / 9;
    min-height: 240px;
  }

  #youtubePlayer iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }

  #playerStatus {
    color: white;
    padding: 12px;
    text-align: center;
    background: #111;
    margin: 0;
  }

  #youtubeFallback {
    display: block;
    color: white;
    padding: 12px;
    text-align: center;
    background: #111;
  }

  #modalDescription {
    display: none !important;
  }

  @media(max-width:650px) {
    .video-row {
      flex-direction: column;
    }

    .video-thumbnail {
      flex: 1 1 auto;
      max-width: 100%;
      width: 100%;
    }
  }
`;

document.head.appendChild(tubeStyle);


/* =====================================================
   34. START WEBSITE
===================================================== */

console.log("TUBE website loaded successfully.");

loadHomeVideos();

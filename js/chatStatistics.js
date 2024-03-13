import { setSessionStartTime, calculateSessionDuration } from "./timer.js";

const urlParams = new URLSearchParams(window.location.search);
let channel = urlParams.get("channel") || "pamk";
const topListLength = urlParams.get("listLength") || 5;

let messageCount = 0;
const uniqueUsernames = new Set();
const topUsernames = new Map();
let totalViewerCount = 0;
let peakViewerCount = 0;
let updateCount = 0;
let twoOrLessCount = 0;

const excludedKickBots = [
  "babblechat",
  "botrix",
  "casterlabs",
  "intrx",
  "livebot",
  "lottobot",
  "logibot",
  "mrbeefbot",
  "notibot",
  "squadbot",
  "babzbot",
  "kickbot"
];

// kick websocket uri
const kickWSUri =
  "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false";
let kickWS = null; // WebSocket instance

// Function to establish a WebSocket connection
function connectWebSocket() {
  kickWS = new WebSocket(kickWSUri);

  // WebSocket open event listener
  kickWS.addEventListener("open", async function open() {
    const userData = await fetch(
      `https://kick.com/api/v2/channels/${channel}`
    ).then((response) => response.json());

    kickWS.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: `chatrooms.${userData.chatroom.id}.v2` },
      })
    );
    console.log(
      "Connected to Kick.com Streamer Chat: " +
        channel +
        " Chatroom ID: " +
        userData.chatroom.id
    );
    setSessionStartTime(); // Set the session start time when the WebSocket connection opens
    updateIsLiveStatus();
    await fetchViewerCount();
  });

  // WebSocket error event listener
  kickWS.addEventListener("error", function error(event) {
    console.error("WebSocket error:", event);
  });

  // WebSocket close event listener
  kickWS.addEventListener("close", function close(event) {
    console.log("WebSocket connection closed:", event);
    // Attempt to reconnect after a delay
    setTimeout(connectWebSocket, 5000);
  });
}

// handle the WebSocket Chat Message Event
function handleMessageEvent(event) {
  const data = JSON.parse(event.data);
  if (data.event === "App\\Events\\ChatMessageEvent") {
    const messageData = JSON.parse(data.data);
    let chatMessageSender = messageData.sender.username;

    // Convert sender name to lowercase for case insensitivity
    const sender = chatMessageSender.toLowerCase();

    // Check if sender is in the excludedKickBots array
    if (excludedKickBots.includes(sender)) {
      // Skip processing if the sender is in the excludedKickBots
      return;
    }

    // If not excluded, proceed with the functions
    incrementMessageCount();
    handleSenderData(messageData.sender);
    updateTopUsernames();
  }
}

// update the HTML elements with the latest information
function updateHTMLElements(
  messageCount,
  uniqueUsernamesCount,
  topUsernames,
  twoOrLessCount
) {
  // Get the HTML elements for displaying the information
  const messageCountElement = document.getElementById("message-count");
  const uniqueUsernamesElement = document.getElementById("unique-usernames");
  const topUsernamesElement = document.getElementById("top-usernames");
  const twoOrLessElement = document.getElementById("2x-usernames");

  // Update the HTML elements with the latest information
  messageCountElement.textContent = messageCount.toLocaleString();
  uniqueUsernamesElement.textContent = uniqueUsernamesCount.toLocaleString();
  twoOrLessElement.textContent = twoOrLessCount.toLocaleString();

  // Clear the existing list of top usernames
  topUsernamesElement.innerHTML = "";

  // Create and append <li> elements for each top username
  topUsernames.forEach(({ username, count }) => {
    const listItem = document.createElement("li");

    const usernameSpan = document.createElement("span");
    usernameSpan.textContent = username;
    usernameSpan.className = "username"; // Assign 'username' as the class name
    listItem.appendChild(usernameSpan);

    const countSpan = document.createElement("span");
    countSpan.textContent = count.toLocaleString();
    countSpan.className = "messageCount"; // Assign 'messageCount' as the class name
    listItem.appendChild(countSpan);

    topUsernamesElement.appendChild(listItem);
  });
}

// make sure HTML elements are loaded before updated
document.addEventListener("DOMContentLoaded", function () {
  kickWS.addEventListener("message", handleMessageEvent);
});

// handle the message sender data
function handleSenderData(sender) {
  const senderId = sender.id;
  const senderUsername = sender.username;
  const senderUniqueId = createSenderUniqueId(senderId, senderUsername);
  addSenderUniqueId(senderUniqueId);
  incrementUsernameCount(senderUniqueId);
}

// update the concurrent viewer count
function updateViewerCount(viewerCount) {
  totalViewerCount += viewerCount;
  updateCount++;
  const averageViewerCount = totalViewerCount / updateCount;
  const viewerCountElement = document.getElementById("viewer-count");
  const viewerAverageElement = document.getElementById("viewer-average");
  viewerCountElement.textContent = viewerCount.toLocaleString();
  viewerAverageElement.textContent = Math.round(averageViewerCount).toLocaleString();
  // call peak viewer count check
  updatePeakViewerCount(viewerCount);
  console.log("Current Viewer Count for " + channel + ": " + viewerCount);
}

function updatePeakViewerCount(viewerCount) {
  if (viewerCount > peakViewerCount) {
    peakViewerCount = viewerCount;
    document.getElementById("viewer-peak").textContent =
      peakViewerCount.toLocaleString();
  }
}

// set initial peak viewers
const peakViewersElement = document.getElementById("viewer-peak");
peakViewersElement.textContent = peakViewerCount;

// Fetch the viewer count and check is_live status
async function fetchViewerCount() {
  try {
    const response = await fetch(`https://kick.com/api/v2/channels/${channel}`);
    const data = await response.json();

    const viewerCount = data.livestream.viewer_count || 0;
    const isLive = data.livestream.is_live || false;

    // Update the viewer count
    updateViewerCount(viewerCount);

    // Update the is_live status
    updateIsLiveStatus(isLive);

    // Check if the viewer count is zero and the channel is not live
    if (viewerCount === 0 && !isLive) {
      // Fetch a new channel from your list
      const newChannel = await fetchNewChannel();
      // If a new channel is found, switch to it
      if (newChannel) {
        channel = newChannel;
        console.log("Switching to new channel: " + channel);
        connectWebSocket(); // Reconnect WebSocket with the new channel
      }
    }
  } catch (error) {
    console.error("Error fetching viewer count:", error
    );
  }
  
  // Function to fetch a new channel from your list
  async function fetchNewChannel() {
    // List of channels to try
    const channelsToTry = ["channel1", "channel2", "channel3"]; // Add your list of channels here
    for (const newChannel of channelsToTry) {
      try {
        const response = await fetch(`https://kick.com/api/v2/channels/${newChannel}`);
        const data = await response.json();
        const isLive = data.livestream.is_live || false;
        const viewerCount = data.livestream.viewer_count || 0;
        if (isLive && viewerCount > 0) {
          return newChannel; // Return the first live channel found with non-zero viewers
        }
      } catch (error) {
        console.error("Error fetching new channel:", error);
      }
    }
    return null; // Return null if no live channel found
  }
  
  // Your existing code here...
  
  // Fetch initial viewer count immediately after connecting WebSocket
  kickWS.addEventListener("open", async function open() {
    // Your existing code here...
    await fetchViewerCount();
  });
  
  // Update viewer count every 1 minutes
  setInterval(fetchViewerCount, 1 * 60 * 1000);
  
  // update the session duration
  setInterval(updateSessionDuration, 1000);
  
  function updateSessionDuration() {
    const sessionDuration = calculateSessionDuration();
    const sessionDurationElement = document.getElementById("session-duration");
    sessionDurationElement.textContent = sessionDuration;
  }
  
  // establish initial Kick WebSocket connection
  connectWebSocket();
}  
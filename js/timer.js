let sessionStartTime;

function setSessionStartTime() {
  // set session start time
  const startTime = new Date();
  sessionStartTime = startTime;
}

// calculate session duration
function calculateSessionDuration() {
  if (!sessionStartTime) {
    return "Session start time not available.";
  }

  const startTimestamp = sessionStartTime.getTime();
  const currentTimestamp = Date.now();
  const duration = currentTimestamp - startTimestamp;

  // Calculate the duration in hours, minutes, and seconds
  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);

  // Format the duration as HH:MM:SS
  let formattedDuration = "";
  if (hours > 0) {
    formattedDuration += `${hours.toString().padStart(2, "0")}:`;
  }
  if (minutes > 0 || hours > 0) {
    formattedDuration += `${minutes.toString().padStart(2, "0")}:`;
  }
  formattedDuration += seconds.toString().padStart(2, "0");

  return formattedDuration;
}

export { setSessionStartTime, calculateSessionDuration };

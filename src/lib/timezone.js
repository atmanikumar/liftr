/**
 * Timezone utility for consistent IST (Indian Standard Time) display
 * IST is UTC+5:30
 */

/**
 * Format a date/time string to IST
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string in IST
 */
export function formatToIST(date, options = {}) {
  if (!date) return 'N/A';
  
  let dateObj;
  
  if (typeof date === 'string') {
    // If the date string doesn't have timezone info (no Z or +/-), 
    // assume it's UTC and append Z
    if (!date.includes('Z') && !date.includes('+') && !date.match(/-\d{2}:\d{2}$/)) {
      // Replace space with T if needed and add Z for UTC
      const utcDateStr = date.replace(' ', 'T') + 'Z';
      dateObj = new Date(utcDateStr);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    ...options,
  };

  return dateObj.toLocaleString('en-IN', defaultOptions);
}

/**
 * Format date only (no time) in IST
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string (DD/MM/YYYY)
 */
export function formatDateIST(date) {
  return formatToIST(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format time only (no date) in IST
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted time string (HH:MM:SS)
 */
export function formatTimeIST(date) {
  return formatToIST(date, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time in IST
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date-time string
 */
export function formatDateTimeIST(date) {
  return formatToIST(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get relative time in IST (e.g., "2 hours ago", "yesterday")
 * @param {string|Date} date - Date to format
 * @returns {string} - Relative time string
 */
export function getRelativeTimeIST(date) {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return formatDateIST(dateObj);
  }
}

/**
 * Format date for display with relative time if recent
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatSmartDateIST(date) {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now - dateObj;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If within last 7 days, show relative time
  if (diffDays < 7) {
    return getRelativeTimeIST(dateObj);
  }
  
  // Otherwise show full date
  return formatDateTimeIST(dateObj);
}


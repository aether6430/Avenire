let browser = "Unknown",
  os = "Unknown",
  device = "Unknown";


export const getBrowser = (ua: string) => {
  if (/chrome|crios|crmo/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua) && !/chrome|crios|crmo/i.test(ua)) {
    browser = "Safari";
  } else if (/msie|trident/i.test(ua)) {
    browser = "Internet Explorer";
  } else if (/edg/i.test(ua)) {
    browser = "Edge";
  } else if (/opera|opr/i.test(ua)) {
    browser = "Opera";
  }

  return browser

}

export const parseUserAgent = (ua: string) => {

  // Detect Browser

  const userAgents = {
    "Generic Linux": /Linux/i,
    "Android": /Android/i,
    "BlackBerry": /BlackBerry/i,
    "Bluebird": /EF500/i,
    "Chrome OS": /CrOS/i,
    "Datalogic": /DL-AXIS/i,
    "Honeywell": /CT50/i,
    "iPad": /iPad/i,
    "iPhone": /iPhone/i,
    "iPod": /iPod/i,
    "macOS": /Macintosh/i,
    "Windows": /IEMobile|Windows/i,
    "Zebra": /TC70|TC55/i,
  } as const


  Object.keys(userAgents).map((val) => {
    if (userAgents[val as keyof typeof userAgents].test(ua)) {
      device = val
    }
  });

  // Detect OS
  if (/windows nt/i.test(ua)) {
    os = "Windows";
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = "Mac OS";
  } else if (/android/i.test(ua)) {
    os = "Android";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
  }

  // Detect Device Type
  if (/mobile/i.test(ua)) {
    device = "Mobile";
  } else if (/tablet/i.test(ua)) {
    device = "Tablet";
  } else {
    device = "Desktop";
  }

  return `${browser} on ${device} running ${os}`;
};

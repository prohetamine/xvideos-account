import fetch from 'node-fetch'

const createProfile = async ({ title, token, comment }) => {
  const {
    appCodeName,
    webgl2Maximum,
    platform: platformName,
    userAgent,
    webgl: {
      unmaskedRenderer,
      unmaskedVendor
    },
    deviceMemory,
    hardwareConcurrency,
    cpu: {
      architecture: cpuArchitecture
    },
    platformVersion,
    uaFullVersion,
    connection: {
      rtt: connectionRtt,
      effectiveType: connectionEffectiveType,
      downlink: connectionDownlink,
      saveData: connectionSaveData
    },
    os: {
      name: platform, 
      version: osVersion
    },
    product,
    productSub,
    vendor,
    vendorSub,
    donottrack: doNotTrack
  } = await fetch('https://dolphin-anty-api.com/fingerprints/fingerprint?platform=windows&browser_type=anty&browser_version=114&type=fingerprint&screen=1440x900', {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${token}`
    },
    body: null,
    method: 'GET'
  }).then(data => data.json())

  const fingerprint = {
    name: title,
    tags: [],
    platform: platform.toLowerCase(),
    browserType: 'anty',
    mainWebsite: 'https://reddit.com',
    doNotTrack,
    statusId: 4593694,
    useragent: {
      mode: 'manual',
      value: userAgent
    },
    webrtc: {
      mode: 'altered',
      ipAddress: null
    },
    canvas: {
      mode: 'real'
    },
    webgl: {
      mode: 'real'
    },
    webglInfo: {
      mode: 'manual',
      vendor: unmaskedVendor,
      renderer: unmaskedRenderer,
      webgl2Maximum
    },
    clientRect: {
      mode: 'real'
    },
    notes: {
      content: comment,
      color: 'blue',
      style: 'text',
      icon: 'info'
    },
    timezone: {
      mode: 'auto',
      value: null
    },
    locale: {
      mode: 'auto',
      value: null
    },
    proxy: null,
    geolocation: {
      mode: 'auto',
      latitude: null,
      longitude: null,
      accuracy: null
    },
    cpu: {
      mode: 'manual',
      value: hardwareConcurrency
    },
    memory: {
      mode: 'manual',
      value: deviceMemory
    },
    screen: {
      mode: 'real',
      resolution: null
    },
    audio: {
      mode: 'real'
    },
    mediaDevices: {
      mode: 'real',
      audioInputs: null,
      videoInputs: null,
      audioOutputs: null,
      ports: { 
        mode: 'protect',
        blacklist: '3389,5900,5800,7070,6568,5938'
      },
      doNotTrack: false,
      args: [],
      platformVersion,
      uaFullVersion,
      login: '',
      password: '',
      appCodeName,
      platformName,
      connectionDownlink,
      connectionEffectiveType, 
      connectionRtt,
      connectionSaveData,
      cpuArchitecture,
      osVersion,
      vendorSub,
      productSub,
      vendor,
      product
    }
  }

  const data = await fetch('https://dolphin-anty-api.com/browser_profiles', {
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(fingerprint),
    method: 'POST'
  })
  .then(response => response.json())

  return {
    ...data,
    fingerprint
  }
}

export default createProfile
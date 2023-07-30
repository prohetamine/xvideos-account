import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const checkBan = async (proxys, { password, username }, _username) => {
  let proxy = proxys[parseInt(Math.random() * proxys.length)]

  for (;;) {
    try {
      const resp = await fetch(`https://www.reddit.com/user/${_username}.json`, {
        agent: new HttpsProxyAgent(`https://${username}:${password}@${proxy.dns}:443`)
      })
      .then(data => data.json())
      
      if (resp.error) {
        return {
          isBan: true,
          proxy
        }
      } else {
        return {
          isBan: false,
          proxy
        }
      }
    } catch (e) {
      proxy = proxys[parseInt(Math.random() * proxys.length)]
    }
  }
}

export default checkBan 
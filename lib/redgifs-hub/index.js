import amateur from './amateur.js'
import ass from './ass.js'
import boobs from './boobs.js'
import teen from './teen.js'
import asshole from './asshole.js'

const videos = [
  ...amateur,
  ...ass,
  ...boobs,
  ...teen,
  ...asshole
]

const random = () => 
  'https://www.redgifs.com/watch/'+videos[parseInt(Math.random() * videos.length)]

export default random
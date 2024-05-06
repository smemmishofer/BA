import {getReplicas} from "./repo.js";
import {generateWantVector, sendP2P} from "./tremola.js";

function sendWantVector() {
  console.log('WANT-vector sent from worker-thread')

  const replicas = getReplicas()

  const wantVec = generateWantVector(replicas)

  sendP2P(wantVec)
}

// Send Want-Vector once every second.
setInterval(sendWantVector, 1000)
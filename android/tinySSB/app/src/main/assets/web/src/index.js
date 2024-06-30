//
// All JavaScript is optional, even bundling isn't necessary if you're using pure ESM.
// An index.js file generally waits for the DOM to be ready before getting started.
//
import fs from 'socket:fs'
import process from 'socket:process'
import path from 'socket:path'
import {network} from "socket:network";
import { createSocket } from 'socket:dgram'


import {custombackend} from "./tremola";

async function main () {

  console.log(process.platform)
  custombackend('ready')
  // console.log(await fs.readFile('index.html'))
  console.log('path.DOCUMENTS: ' + path.DOCUMENTS)
}

window.addEventListener('DOMContentLoaded', main)

const netsocket = createSocket('udp4');
netsocket.bind(50002, '0.0.0.0', () => console.log('Binding complete'))

function publicmsgposted(e) {
  try {
    netsocket.send(text, 50000, '192.168.1.255', (err) => {
      if (err) {
        console.error('Error sending message:', err);
        netsocket.close();
        console.log('Socket got closed...');
      } else {
        console.log('Message sent:', text);
      }
    });
  } catch (err) {
    console.error(err)
  }
}

export {publicmsgposted};
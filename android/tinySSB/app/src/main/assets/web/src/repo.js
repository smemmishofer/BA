import fs from 'socket:fs/promises'
import path from 'socket:path'
import { decode } from './bipf/decode.js'
import process from 'socket:process'

var fidlist = [];
var replicas = {};

// User should be given via the environment variable; else the path defaults to /repo
const username = process.env.USERNAME

let repoPath;
if(username) {
  repoPath = path.join(path.DOCUMENTS, 'repo', username)
} else {
  repoPath = path.join(path.DOCUMENTS, 'repo')
}
console.log('Repo Path:', repoPath);
const ignoredFiles = ['.DS_Store'];
// --> Use Path.DOCUMENTS; it is more predictable where the files get saved
// --> May change later, if necessary

// Diese Methode aufrufen, zum Beispiel im Main
export async function loadRepo() {
  // Mit Methode access testen ob directory "repo" existiert
  // Falls nein, dieses erstellen

  try {
    console.log(repoPath)
    await fs.access(repoPath);
    console.log('can access');
  } catch {
    console.error('cannot access repo path');
    console.log('making new directory...')
    try {
      await fs.mkdir(repoPath)
    } catch (err) {
      console.log('error making directory: ', err, 'directory-path: ', repoPath)
    }
  }

  // Alle Dateinamen holen (Dateiname = FeedID des entsprechenden Logs)
  // Liste zurückgeben, mit Strings oder Bytebuffers; Liste mit vorhandenen Feed ID's
  // Beziehungsweise lokale Variable initialisieren
  try {
    const dir = await fs.opendir(repoPath)
    for await (const dirent of dir) {
      // check, if it's a log file (ends with .log; and if it's in the ignored files)
      if (dirent.isFile() && !ignoredFiles.includes(dirent.name) && dirent.name.endsWith('.log')) {
        // .slice(0, -4) removes the .log from the end; such that only the fid's are remaining
        fidlist.push(dirent.name.slice(0, -4))
        console.log('dirent: ', dirent)
        console.log('push: ', dirent.name.slice(0, -4))
      }
    }
    //console.log('fidlist: ', fidlist)
  } catch (err) {
    console.error('Error scanning file names: ', err)
  }
}

export function delRepo() {
  // Reset local repo objects
  replicas = {};
  fidlist = [];
}

export function listFeeds() {
  // Liste zurückgeben, die vorher geladen wurde
  console.log('Listing Feeds...')
  return fidlist
}

export async function createReplica(fid) {
  // Legt leere Datei an, am gleichen Ort (./repo)
  try {
    // Write an empty file (you can later write binary data to it)
    // Check if the file already exists
    try {
      await fs.access(path.join(repoPath, `/${fid}.log`));
      console.log('File already exists:', path.join(repoPath, `/${fid}.log`));
      return; // File already exists
    } catch (err) {
      console.error('error while accessing file in createReplica: ', err)
      console.log('error while accessing file in createReplica: filepath: ', path.join(repoPath, `/${fid}.log`))
      // continue

      // Write an empty file (you can later write binary data to it)
      console.log('creating new file: repopath: ', repoPath)
      var filePath = path.join(repoPath, `/${fid}.log`)
      console.log('creating new file: filePath: ', filePath)
      await fs.writeFile(filePath, '')
      // var fhandle = await fs.open(filePath, 'a');
      console.log('after writing file...')
      // fidlist.push(fid)
      // await fhandle.close()
      console.log('File created successfully:', path.join(repoPath, `/${fid}.log`));
    }
  } catch (err) {
    console.error('Error creating file: ', err)
  }
}

export function getReplicas() {
  return replicas
}

export async function fid2replica(fid) {
  // Objekt zurückgeben
  // (Replika-)Objekt "r" hat folgende Felder:
    // Eigenen Namen, --> FeedID = Dateinamen
    // Liste von Log-Einträgen (könnte in BIPF sein; Nutzlast von jedem Log, inklusive Sidechains)
    // Müsste die Datei mit fid ... lesen und davon alle Log-Einträge holen.
    // Z.b. FeedID aaaaa...
    // Log-Einträge werden in BIPF-Format gespeichert.
  if (fid in replicas) {
    return replicas[fid]
  } else {
    try {
      const replica = {
        name: fid, // Setting the name of the replica as the FeedID
        logEntries: [] // Initializing an empty array to store log entries
      };
      var filePath = path.join(repoPath, `/${fid}.log`)
      var buf = new ArrayBuffer(100000)

      buf = await fs.readFile(filePath)

      var byteCount = buf.byteLength

      if(byteCount > 0) {
        var pos = 0
        do {
          var data = decode(buf, pos)
          replica.logEntries.push(buf.slice(pos, pos + decode.bytes))
          //console.log('pushed content: ', buf.slice(pos, pos + decode.bytes))
          pos += decode.bytes
        } while (pos < byteCount)
      } else {
        console.log('Buffer length is 0')
      }

      // check first, if file already has content, and if it's a string.
      // Maybe choose different separator for log Entries...
      replicas[fid] = replica
      return replica;
    } catch (err) {
      console.error('Error reading log file:', err);
      return null;
    }
  }
}

export async function appendContent(r, c) {
  // c ist ein Byte-Array (ist bereits in BIPF-Format konvertiert)
  //let cString = btoa(c)


  const filePath = path.join(repoPath, `/${r.name}.log`)

  //const oldBuffer = await fs.readFile(filePath)
  //console.log('Old content: ', oldBuffer)

  let fileHandle = null

  try {
    fileHandle = await fs.open(filePath, 'a')

    //await fileHandle.appendFile(filePath, c)
    await fileHandle.write(c, 0, c.length, -1)

    r.logEntries.push(c);
  } finally {
    if (fileHandle) {
      await fileHandle.close()
    }
  }
}

export function readContent(r, i) {
  // Nimmt Replika-Objekt von oben entgegen
  // Da R-Objekt eine Liste von Log-Einträgen ist:
  // i-tes Element dieser Liste zurückgeben

  // check, if Index is valid
  if (i >= 0 && i < r.logEntries.length) {
    return r.logEntries[i];
  } else {
    console.error('Index out of bounds.');
    return null;
  }
}
// Nach Aufruf dieser Funktion die erhaltenen bipf-Bytes decodieren

export function readAllContent(r) {
  // Nimmt Replika-Objekt von oben entgegen
  // Da R-Objekt eine Liste von Log-Einträgen ist:
  // i-tes Element dieser Liste zurückgeben
  return r.logEntries
}

// Format: 1 File pro Feed (Komplikation mit mid-Feld)
// Keine Crash-Resistenz

// Vor Aufruf dieser Funktion noch encoding in BIPF machen (in diesem File ist alles BIPF)
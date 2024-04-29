import fs from 'socket:fs/promises'
import path from 'socket:path'

const fidlist = [];
const repoPath = path.join(path.DOCUMENTS, './repo/')
// --> Use Path.DOCUMENTS; it is more predictable where the files get saved
// --> May change later, if necessary

// Diese Methode aufrufen, zum Beispiel im Main
export async function loadRepo() {
  // Mit Methode access testen ob directory "repo" existiert
  // Falls nein, dieses erstellen

  try {
    await fs.access(repoPath);
    console.log('can access');
  } catch {
    console.error('cannot access repo path');
    console.log('making new directory...')
    await fs.mkdir(repoPath)
  }

  // Alle Dateinamen holen (Dateiname = FeedID des entsprechenden Logs)
  // Liste zurückgeben, mit Strings oder Bytebuffers; Liste mit vorhandenen Feed ID's
  // Beziehungsweise lokale Variable initialisieren
  try {
    const dir = await fs.opendir(repoPath)
    for await (const dirent of dir) {
      if (dirent.isFile()) {
        fidlist.push(dirent.name)
      }
    }
    console.log('fidlist: ', fidlist)
  } catch (err) {
    console.error('Error scanning file names: ', err)
  }
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
      console.error('error while accessing file in createReplica')
      // continue
    }
    // Write an empty file (you can later write binary data to it)
    await fs.writeFile(path.join(repoPath, `/${fid}.log`), '');
    console.log('File created successfully:', path.join(repoPath, `/${fid}.log`));
  } catch (err) {
    console.error('Error creating file: ', err)
  }
}

export async function fid2replica(fid) {
  // Objekt zurückgeben
  // (Replika-)Objekt "r" hat folgende Felder:
    // Eigenen Namen, --> FeedID = Dateinamen
    // Liste von Log-Einträgen (könnte in BIPF sein; Nutzlast von jedem Log, inklusive Sidechains)
    // Müsste die Datei mit fid ... lesen und davon alle Log-Einträge holen.
    // Z.b. FeedID aaaaa...
    // Log-Einträge werden in BIPF-Format gespeichert.
  try {
    const replica = {
      name: fid, // Setting the name of the replica as the FeedID
      logEntries: [] // Initializing an empty array to store log entries
    };
    const fileContent = await fs.readFile(path.join(repoPath, `/${fid}.log`));
    // check first, if file already has content, and if it's a string.
    const trimmedContent = (typeof fileContent === 'string') ? fileContent.trim() : '';
    // Maybe choose different separator for log Entries...
    const logEntries = trimmedContent.split('\n');
    replica.logEntries = logEntries;
    return replica;
  } catch (err) {
    console.error('Error reading log file:', err);
    return null;
  }
}

export async function appendContent(r, c) {
  // c ist ein Byte-Array (ist bereits in BIPF-Format konvertiert)

  // Hängt am Schluss der Replika-Datei den Content c an
  // Und zusätzlich noch an lokaler Variable r (Liste) anhängen
  try {
    const filePath = path.join(repoPath, `/${r.name}.log`);
    // ${r.name}.log
    // Read existing content from the file
    let existingContent = '';
    try {
      existingContent = await fs.readFile(filePath);
    } catch (readError) {
      // File might not exist yet, ignore the error
    }
    // Combine existing content with the new content
    // existingContent ? '\n' : ''
    // this part ensures that we only add a newline, if there is already existing content
    // we add a newline, because above in the fid2replica method we split the log entries at '\n'
    const combinedContent = existingContent + (existingContent ? '\n' : '') + c;
    await fs.writeFile(filePath, combinedContent);
    // Append content to the local replica variable
    r.logEntries.push(c);
    console.log('Content appended successfully.');
  } catch (err) {
    console.log('File Path: ', filePath)
    console.error('Error appending content: ', err)
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

// Format: 1 File pro Feed (Komplikation mit mid-Feld)
// Keine Crash-Resistenz

// Vor Aufruf dieser Funktion noch encoding in BIPF machen (in diesem File ist alles BIPF)
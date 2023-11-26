const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('node:path')

// Get all added folder paths from the config
let appdataPath = ipcRenderer.sendSync('get-config')
let configPath = path.join(appdataPath, 'config.json')
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Automatically insert folder paths into the HTML
let flexDiv = document.querySelector('#flexdiv')
let folderLevel = 0
let folderId = 0
function loadFolders(array) {
    array.forEach(function(folder, index){
        insertPath(folder, array)
        folderId++
        folderLevel++
        loadFolders(folder.folders)
        folderLevel--
    }, array)
}
loadFolders(config.sourcePaths)

// Keyboard shortcut listener
window.addEventListener('keyup', (e) => {
    if(e.key == '5' || e.key == '4' || e.key == '3' || e.key == '2' || e.key == '1'){
        let element = document.elementFromPoint(mousePosition.x, mousePosition.y)
        if(element !== undefined && element.src !== undefined) rateImg(element, e.key)
    }else if(e.key == 'r'){
        ipcRenderer.send('reload')
    }else if(e.key == 'Control'){
        ipcRenderer.send('dev-tools')
    }
}, true)

// Add move target folder
let moveTarget = document.querySelector('#moveTarget')
moveTarget.innerText = "Current: " + config.movePath

// Add folder(s) button listeners
document.querySelector('#addFolderButton').addEventListener('click', (e) => {
    folderDialog('source', false)
})
document.querySelector('#addFoldersButton').addEventListener('click', (e) => {
    folderDialog('source', true)
})
document.querySelector('#pickMoveFolderButton').addEventListener('click', (e) => {
    folderDialog('move', false)
})

// Enable all button listener
document.querySelector('#enableAllButton').addEventListener('click', (e) => {
    let checkBoxes = document.querySelectorAll('input[type=checkbox]')
    checkBoxes.forEach(element => {
        element.checked = true
    });
    changeAllStates(config.sourcePaths, true)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
})
// Disable all button listener
document.querySelector('#disableAllButton').addEventListener('click', (e) => {
    let checkBoxes = document.querySelectorAll('input[type=checkbox]')
    checkBoxes.forEach(element => {
        element.checked = false
    });
    changeAllStates(config.sourcePaths, false)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
})

// Change all folder states function
function changeAllStates(array, newState) {
    array.forEach(function(folder){
        folder.state = newState
        changeAllStates(folder.folders, newState)
    }, array, newState)
}

// Add folder dialog function
function folderDialog(folderType, includeSubfolders){
    let pickedPath = ipcRenderer.sendSync('open-dialog')
    // If the user cancels the action then it will be undefined
    if(pickedPath !== undefined) {
        // Try adding the path(s) to the config
        if(folderType == 'source'){
            addFolder(pickedPath[0].split('\\'), config.sourcePaths)
            if(includeSubfolders){
                // Get all subfolders
                let foundFolders = scanFolder(pickedPath[0])
                for(i = 0; i < foundFolders.length; i++){
                    // Add all subfolders to the config as well
                    addFolder(foundFolders[i].split('\\'), config.sourcePaths)
                }
            }
        }else{
            config.movePath = pickedPath[0]
            moveTarget.innerText = "Current: " + config.movePath
        }
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
        ipcRenderer.send('reload')
    }
}

// Paths into HTML insertion function
function insertPath(folder, array){
    // Insert
    let path = folder.path.replace(/[:/\\\/ ]/g, "")
    let margin = (folderLevel * 25) + 10
    flexDiv.insertAdjacentHTML('beforeend', '<div id="div-' + path + '"><label><input type="checkbox" id="checkbox-' + folderId + '" value="' + path + '" style="margin-left:' + margin + 'px;">' + folder.path + '</label><button type="button" id="deletePath-' + folderId + '" class="deleteButton">Delete</button></div>')

    // Set checkbox state
    let checkbox = document.querySelector('#checkbox-' + folderId)
    if(folder.state) checkbox.checked = true

    // Left click event listener for the checkbox
    checkbox.addEventListener('change', (e) => {
        if(e.target.checked) array[array.indexOf(folder)].state = true
        else{array[array.indexOf(folder)].state = false}
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
    })

    // Event listener for the delete button
    let deleteButton = document.querySelector('#deletePath-' + folderId)
    deleteButton.addEventListener('click', (e) => {
        array.splice(array.indexOf(folder), 1)
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
        ipcRenderer.send('reload')
    })
}

// Add new folder to config function
function addFolder(pathParts, array) {
    // Go through the folders in the config, checking if the folder or its parent folders are already known
    let foundAt
    array.forEach(function(folder, index){
        if(folder.path == pathParts[0]) foundAt = index
    }, pathParts)
    if(foundAt === undefined) {
        // If no matching folder was found, the remaining path array elements have to be added as new nested objects
        let object = { "path": pathParts[0], "state": true, "folders": [] }
        buildFolderObject(pathParts, object)
        array.push(object)
    }else{
        // Found the folder => Continue checking the remaining subfolders
        pathParts.splice(0, 1)
        if(pathParts.length > 0) addFolder(pathParts, array[foundAt].folders)
    }
}

// Build nested folder object function
function buildFolderObject(pathParts, object){
    pathParts.splice(0, 1)
    if(pathParts.length > 0){
        let subObject = { "path": pathParts[0], "state": true, "folders": [] }
        object.folders.push(subObject)
        buildFolderObject(pathParts, object)
    }
}

// Scan folder for subfolders function
function scanFolder(foldersToScan){
    foldersToScan = [foldersToScan]
    let foundFolders = []
    while(foldersToScan.length > 0){
        // If it's a directory
        if(fs.lstatSync(foldersToScan[0]).isDirectory() && !foldersToScan[0].includes('.driveupload')){
            // Get all file and folder names within
            let tempFiles = fs.readdirSync(foldersToScan[0])
            for(i = 0; i < tempFiles.length; i++){
                let newPath = foldersToScan[0] + '\\' + tempFiles[i]
                if(fs.lstatSync(newPath).isDirectory()) {
                    // Add detected folders to the list of folders to scan
                    foldersToScan.push(newPath)
                    foundFolders.push(newPath)
                }
            }
        }
        foldersToScan.splice(0, 1)
    }
    return foundFolders
}
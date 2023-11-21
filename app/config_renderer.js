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
function loadFolders(array) {
    array.forEach(function(part, index){
        insertPath(this[index], this)
        folderLevel++
        loadFolders(this[index].folders)
        folderLevel--
    }, array)
}
loadFolders(config.newPaths)

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

// Add folder button listener
document.querySelector('#addFolderButton').addEventListener('click', () => {
    let pickedPath = ipcRenderer.sendSync('open-dialog')
    // If the user cancels the action then it will be undefined
    if(pickedPath !== undefined) {
        pickedPath = pickedPath[0].replace(/\\\\/g, "/")
        // TODO: Check if the path is already in the list (maybe as a subfolder)
        // Save the path
        config.sourcePaths.push(pickedPath)
        config.pathStates.push(true)
        insertPath(pickedPath, config.sourcePaths.length - 1)
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))

        // TODO: Check for subfolders to add as well
        //scanFolder(pickedPath)
    }
})

// Paths into HTML insertion function
function insertPath(folder, array){
    // Insert
    let path = folder.path.replace(/[:/\\\/ ]/g, "")
    let margin = (folderLevel * 25) + 10
    flexDiv.insertAdjacentHTML('beforeend', '<div id="div-' + path + '"><input type="checkbox" id="checkbox-' + path + '" value="' + path + '" style="margin-left:' + margin + 'px;"><label>' + folder.path + '</label><button type="button" id="deletePath-' + path + '" class="deleteButton">Delete</button></div>')

    // Set checkbox state
    let checkbox = document.querySelector('#checkbox-' + path)
    if(folder.state) checkbox.checked = true
    // Event listener for the checkbox
    checkbox.addEventListener('change', (e) => {
        if(e.target.checked) array[array.indexOf(folder)].state = true
        else{array[array.indexOf(folder)].state = false}
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
    })

    // Event listener for the delete button
    let deleteButton = document.querySelector('#deletePath-' + path)
    deleteButton.addEventListener('click', (e) => {
        let div = document.querySelector('#div-' + path)
        div.remove()
        array.splice(array.indexOf(folder), 1)
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
    })
}

// Scan folder structure function
let foundSubfolders = []
function scanFolder(folderPath){
    // If it's a directory
    if(fs.lstatSync(folderPath).isDirectory() && !folderPath.includes('.driveupload')){
        // Get all file and folder names within
        let tempFiles = fs.readdirSync(folderPath)
        for(i = 0; i < tempFiles.length; i++){
            let newPath = folderPath + '/' + tempFiles[i]
            if(fs.lstatSync(newPath).isDirectory()) {
                // Add detected folders to the list of folders to scan
                foundSubfolders.push(newPath)
            }
        }
    }
}
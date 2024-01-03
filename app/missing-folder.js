// Unsafe node access module
const { ipcRenderer } = require('electron')
let data = ''

// Wait for the custom data (missing folder name) from the main process
ipcRenderer.on('initial-data', (e, mainData) => {
    data = mainData
    let html = '<p>Warning!<br>The source folder <b>' + data + '</b> is missing!<br><br>Please press the "Define paths" button and delete the incorrectly named entry!<br>If the folder was simply renamed then you may re-add it afterwards</p>'
    let infoDiv = document.querySelector('#infoContainer')
    infoDiv.insertAdjacentHTML('beforeend', html)
})

// Settings button - Opens config window
document.querySelector('#configButton').addEventListener('click', () => {
    // Open new window
    let posX = window.screenLeft - 300 + window.outerWidth / 2
    ipcRenderer.send('open-window', 600, 850, posX, 'config.html', false, false, '')
    ipcRenderer.send('close-window')
})
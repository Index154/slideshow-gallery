// Modules
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('node:path')
const fs = require('fs')

// Get paths
// TODO: Create a config file with default values if it does not exist yet
let appdataPath = path.join(app.getPath('appData'), 'slideshow-gallery')
let configPath = path.join(appdataPath, 'config.json')
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
let movePath = config.movePath

// Function for creating the main window
const createWindow = () => {
	
	// Window object
	const win = new BrowserWindow({
		width: 1800,
		height: 1000,
		// TODO: Change these settings back to default and fix the issues it causes (require is unknown)
		webPreferences: {
			// DANGEROUS INSECURE SETTINGS
			contextIsolation: false,
			nodeIntegration: true,
			nodeIntegrationInWorker: true
		}
	})
	
	// Maximize window and load HTML
	win.maximize()
	win.loadFile('index.html')

	// Define settings for other windows opened through the renderer (see zoom function)
	win.webContents.setWindowOpenHandler(() => {
		return {
			action: 'allow',
			overrideBrowserWindowOptions: {
				frame: false,
				width: 900,
				height: 900
			}
		}
	})
}

// Create the main window when ready
app.whenReady().then(() => {
	createWindow()
  
	// MacOS listener: Open new window when the app is "started" while already running
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
	
})

// Stop the app when all windows are closed
app.on('window-all-closed', () => {
	// Exception for MacOS where apps generally keep running even when windows are closed
	if (process.platform !== 'darwin') app.quit()
})

// ipcMain event handlers
	// Create context / right click menu
	ipcMain.on('show-context-menu', (e, rightClickPosition, imgRating, elementClass) => {
		
		// Set the correct rating checkbox to true if the image already has a rating
		let checkBoxes = {5: false, 4: false, 3: false, 2: false, 1: false}
		if(imgRating != 0){checkBoxes[imgRating] = true}
		
		// Check the paused checkbox if the image is paused
		let pausedBox = false
		if(elementClass == 'pausedTimer'){pausedBox = true}
		
		// Define menu and create it
		// Menu items have click event listeners on them which call the renderer process
		// For many of the options the renderer process has to call back to the main process but can't be avoided I think
		const template = [
			{
				// Pause or unpause image
				label: 'Paused',
				type: 'checkbox',
				checked: pausedBox,
				click: () => { e.sender.send('context-menu-command', 'pause-resume', rightClickPosition) }
			},
			{type: 'separator'},
			{
				// Open image in new window
				label: 'Zoom',
				click: () => { e.sender.send('context-menu-command', 'zoom', rightClickPosition) }
			},
			{
				// Show image in folder view
				label: 'Open in folder',
				click: () => { e.sender.send('context-menu-command', 'open-path', rightClickPosition) }
			},
			{
				// Open image in external app
				label: 'Open',
				click: () => { e.sender.send('context-menu-command', 'open-image', rightClickPosition) }
			},
			{type: 'separator'},
			// Rate image 1 to 5
			{label: 'Rate 5', type: 'checkbox', checked: checkBoxes[5], click: () => { e.sender.send('context-menu-command', 'rate-5', rightClickPosition) }},
			{label: 'Rate 4', type: 'checkbox', checked: checkBoxes[4], click: () => { e.sender.send('context-menu-command', 'rate-4', rightClickPosition) }},
			{label: 'Rate 3', type: 'checkbox', checked: checkBoxes[3], click: () => { e.sender.send('context-menu-command', 'rate-3', rightClickPosition) }},
			{label: 'Rate 2', type: 'checkbox', checked: checkBoxes[2], click: () => { e.sender.send('context-menu-command', 'rate-2', rightClickPosition) }},
			{label: 'Rate 1', type: 'checkbox', checked: checkBoxes[1], click: () => { e.sender.send('context-menu-command', 'rate-1', rightClickPosition) }},
			// Move file to configured folder
			{
				label: 'Move file',
				click: () => { e.sender.send('context-menu-command', 'move-file', rightClickPosition) }
			}
		]
		const menu = Menu.buildFromTemplate(template)
		menu.popup({ window: BrowserWindow.fromWebContents(e.sender) })
	})
	// Open image in external app
	ipcMain.on('open-image', (e, path) => {
		shell.openPath(path)
	})
	// Show image in folder view
	ipcMain.on('open-folder', (e, path) => {
		shell.showItemInFolder(path)
	})
	// Move image to configured folder
	ipcMain.on('move-file', (e, path) => {
		let pathParts = path.split('/')
		fileName = pathParts[pathParts.length - 1]
		fs.rename(path, movePath + fileName, (err) => {if(err) throw err})
	})
	// Return appdataPath to the renderer when requested
	ipcMain.on('get-appdataPath', (e) => { e.returnValue = appdataPath })
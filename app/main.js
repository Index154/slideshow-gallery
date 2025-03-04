// Modules
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('node:path')
const fs = require('fs')
const { decode } = require('html-entities')
let mainWin
let mainWinState = 'preparing'
let devToolsOnStart = true

// Prevent the app from launching during a squirrel startup
if (require('electron-squirrel-startup')) app.quit()

// Handle installation, uninstallation and first run events for the packaged application setup
// npm run make => Make setup exe
if (handleSquirrelEvent()) {
	// Do not launch the app
	return;
}
// Function for the above
function handleSquirrelEvent() {
	if (process.argv.length === 1) {
	  	return false;
	}
	
	const ChildProcess = require('child_process')
	// Get default paths
	const appFolder = path.resolve(process.execPath, '..')
	const rootAtomFolder = path.resolve(appFolder, '..')
	const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'))
	const exeName = path.basename(process.execPath)
	
	const spawn = function(command, args) {
	  	let spawnedProcess, error;
  
	  	try {
			spawnedProcess = ChildProcess.spawn(command, args, {detached: true})
	  	} catch (error) {}
  
	  	return spawnedProcess;
	};
	
	const spawnUpdate = function(args) {
	  	return spawn(updateDotExe, args)
	};
  
	// Handle squirrel events
	const squirrelEvent = process.argv[1]
	switch (squirrelEvent) {
		case '--squirrel-firstrun':
			// Open config window
			app.whenReady().then(() => {
				createWindow(600, 850, 0, 'config.html', false, false)
			})
			return false

		case '--squirrel-install':
			// Create desktop and start menu shortcuts on installation
			spawnUpdate(['--createShortcut', exeName])
			return false

		case '--squirrel-updated':
			app.quit()
			return true
  
		case '--squirrel-uninstall':
			// Remove desktop and start menu shortcuts
			spawnUpdate(['--removeShortcut', exeName])
			setTimeout(app.quit, 1000)
			return true
  
		case '--squirrel-obsolete':
			// Called on the old version of the app before being updated
			app.quit()
			return true
	}
};

// Make folders if needed
let appdataPath = path.join(app.getPath('appData'), 'slideshow-gallery')
if(!fs.existsSync(appdataPath)) fs.mkdirSync(appdataPath)
let customPoolsPath = path.join(appdataPath, 'custom-pools')
if(!fs.existsSync(customPoolsPath)) fs.mkdirSync(customPoolsPath)

// Create a config file with default values if it does not exist yet
let configPath = path.join(appdataPath, 'config.json')
let config = {}
if(!fs.existsSync(configPath)){
	config = {
		imagePool: 'random',
		editingPool: '',
		delay: '15',
		offset: '5',
		changeWhenRated: true,
		rememberImages: true,
		fileNameFilter: '',
		metadataFilter: '',
		clickAction: 'pauseResume',
		imageCount: 'eight',
		windowState: {
			bounds: {x: -7, y: -7, width: 1550, height: 846},
			isMaximized: true
		},
		toggleSubFolders: false,
		movePath: '',
		sourcePaths: [],
		latestGrid: []
	}
	fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
}else{
	config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
}
let movePath = config.movePath

// Create a ratings file if it does not exist yet
let ratingsPath = path.join(appdataPath, 'ratings.json')
if(!fs.existsSync(ratingsPath)){
	let ratings = {}
	fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 4))
}

// Create a metadata cache file if it does not exist yet
let metadataPath = path.join(appdataPath, 'metadata.json')
if(!fs.existsSync(metadataPath)){
	let metadata = {}
	fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 4))
}

// Window creation function
const createWindow = (width, height, posX, htmlFile, maximize, alwaysOnTop, data) => {

	// Window object
	const win = new BrowserWindow({
		width: width,
		height: height,
		show: false,
		webPreferences: {
			// !! Do not use these values if your app connects to external resources !!
			contextIsolation: false,
			nodeIntegration: true,
			backgroundThrottling: false		// Prevent timers drifting while minimized
		}
	})
	win.setPosition(posX, win.getPosition()[1])
	
	// Maximize window and load HTML
	win.removeMenu()
	if(devToolsOnStart) win.webContents.openDevTools()
	if(maximize) win.maximize()
	if(alwaysOnTop) win.setAlwaysOnTop(true, 'modal-panel')
	htmlFile = path.join('.', 'html', htmlFile)
	win.loadFile(htmlFile)

	// Only show the window after it has finished loading
	win.webContents.on("did-finish-load", () => {
		// Send extra parameters to the window if needed
		if(data != '' && data != undefined){
			win.webContents.send('initial-data', data)
		}
		win.show();
        win.focus();
    });

	return win
}

// Create the main window when ready
app.whenReady().then(() => {
	mainWin = createWindow(config.windowState.bounds.width, config.windowState.bounds.height, config.windowState.bounds.x, 'index.html', config.windowState.isMaximized, false)
	mainWinState = 'active'
	mainWin.on("close", () => {
		mainWinState = 'closed'
		config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
		config.windowState.bounds = mainWin.getBounds()
		config.windowState.isMaximized = mainWin.isMaximized()
		// Wait a little bit before saving the config to avoid conflicts with renderer
		let timer = setTimeout(() => {
			fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
			app.quit()
		}, 100)
	})
  
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
// --------------------------------------------------------------------------------------------------------------
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
				label: 'Pause / resume (p)',
				type: 'checkbox',
				checked: pausedBox,
				click: () => { e.sender.send('context-menu-command', 'pause-resume', rightClickPosition) }
			},
			{
				label: 'Zoom (z)',
				click: () => { e.sender.send('context-menu-command', 'zoom', rightClickPosition) }
			},
			{
				label: 'Revert (u)',
				click: () => { e.sender.send('context-menu-command', 'revert', rightClickPosition)}
			},
			{
				label: 'Change (c)',
				click: () => { e.sender.send('context-menu-command', 'change-image', rightClickPosition) }
			},
			{
				label: 'Copy generative metadata...',
				submenu: [
					{
						label: 'Positive prompt',
						click: () => { e.sender.send('context-menu-command', 'copy-posprompt', rightClickPosition) }
					},
					{
						label: 'Negative prompt',
						click: () => { e.sender.send('context-menu-command', 'copy-negprompt', rightClickPosition) }
					},
					{
						label: 'Seed',
						click: () => { e.sender.send('context-menu-command', 'copy-seed', rightClickPosition) }
					},
					{
						label: 'Checkpoint',
						click: () => { e.sender.send('context-menu-command', 'copy-checkpoint', rightClickPosition) }
					}
				]
			},
			{type: 'separator'},
			{
				label: 'Open in folder (o)',
				click: () => { e.sender.send('context-menu-command', 'open-path', rightClickPosition) }
			},
			{
				label: 'Open',
				click: () => { e.sender.send('context-menu-command', 'open-image', rightClickPosition) }
			},
			{
				label: 'Move file (m)',
				click: () => { e.sender.send('context-menu-command', 'move-file', rightClickPosition) }
			},
			{
				label: 'Add to pool (e)',
				click: () => { e.sender.send('context-menu-command', 'add-to-pool', rightClickPosition) }
			},
			{
				label: 'Exclude from pool (q)',
				click: () => { e.sender.send('context-menu-command', 'remove-from-pool', rightClickPosition) }
			},
			{type: 'separator'},
			{label: 'Rate 5', type: 'checkbox', checked: checkBoxes[5], click: () => { e.sender.send('context-menu-command', 'rate-5', rightClickPosition) }},
			{label: 'Rate 4', type: 'checkbox', checked: checkBoxes[4], click: () => { e.sender.send('context-menu-command', 'rate-4', rightClickPosition) }},
			{label: 'Rate 3', type: 'checkbox', checked: checkBoxes[3], click: () => { e.sender.send('context-menu-command', 'rate-3', rightClickPosition) }},
			{label: 'Rate 2', type: 'checkbox', checked: checkBoxes[2], click: () => { e.sender.send('context-menu-command', 'rate-2', rightClickPosition) }},
			{label: 'Rate 1', type: 'checkbox', checked: checkBoxes[1], click: () => { e.sender.send('context-menu-command', 'rate-1', rightClickPosition) }}
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
		fs.rename(path, movePath + "\\" + fileName, (err) => {if(err) throw err})
	})
	// Copy image to configured folder
	ipcMain.on('copy-file', (e, src, dest) => {
		let pathParts = src.split('\\')
		fileName = pathParts[pathParts.length - 1]
		fs.copyFile(src, dest + "\\" + fileName, (err) => {if(err) throw err})
	})
	// Delete file
	ipcMain.on('delete-file', (e, path) => {
		let pathParts = path.split('/')
		fileName = pathParts[pathParts.length - 1]
		fs.unlinkSync(path)
	})
	// Return paths and configs to the renderer when requested
	ipcMain.on('get-config', (e) => { 
		e.returnValue = appdataPath
		/*e.returnValue = {
			'fallbackImage': fallbackImage,
			'ratingsPath': ratingsPath,
			'configPath': configPath,
			'config': config
		}*/
	})
	// Synchronize config here and to main renderer if necessary
	ipcMain.on('sync-config', (e, receivedConfig) => {
		config = receivedConfig
		if(mainWinState != 'closed' && e.sender != mainWin.webContents) mainWin.webContents.send('sync-config', receivedConfig)
	})
	// Reload window
	ipcMain.on('reload', (e) => {
		//config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
		e.sender.send('')
		BrowserWindow.fromWebContents(e.sender).reload()
	})
	// Open dev tools
	ipcMain.on('dev-tools', (e) => {
		BrowserWindow.fromWebContents(e.sender).webContents.openDevTools()
	})
	// Decode image
	ipcMain.on('decode', (e, path) => {
		e.returnValue = decode(path)
	})
	// Show open dialog
	ipcMain.on('open-dialog', (e) => {
		e.returnValue = dialog.showOpenDialogSync({
			properties: ['openDirectory', 'dontAddToRecent']
		})
	})
	// Open window
	ipcMain.on('open-window', (e, width, height, posX, html, max, alwaysOnTop, data) => {
		let newWin = createWindow(width, height, parseInt(posX), html, max, alwaysOnTop, data)
		// Make main renderer reload when a config window is closed
		if(html == 'config.html'){
			newWin.on("close", () => {
				if(mainWinState != 'closed'){
					mainWin.webContents.send('config-closed')
				}
			})
		}
	})
	// Close window
	ipcMain.on('close-window', (e) => {
		BrowserWindow.fromWebContents(e.sender).webContents.close()
	})
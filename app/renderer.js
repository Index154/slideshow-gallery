// Unsafe node access module (make it go through the preload script later)
const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('node:path')

// Defaults and paths
let appdataPath = ipcRenderer.sendSync('get-config')
let fallbackImage = path.join('..', 'images', 'no-images.png')
let ratingsPath = path.join(appdataPath, 'ratings.json')
let configPath = path.join(appdataPath, 'config.json')
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
let latestSavedGrid = []
let mousePosition = {x: 0, y: 0}

// Image count and size
let imgSettings = {
	eighteen: {dim: 240, count: 18},
	twelve: {dim: 260, count: 12},
	eight: {dim: 375, count: 8},
	eightSmall: {dim: 280, count: 8},
	one: {dim: 700, count: 1}
}
let imgDim = imgSettings[config.imageCount].dim
let imgCount = imgSettings[config.imageCount].count

// Get settings from config and update UI elements
// --------------------------------------------------------------------------------------------------------------
	// Selection mode / Image pool (what images should be cycled through)
	let imagePool = config.imagePool
	document.querySelector('#imagePoolSelector').value = imagePool
	// Click mode / Left click action (what happens when you click an image)
	let clickAction = config.clickAction
	document.querySelector('#clickActionSelector').value = clickAction
	// Delay (interval between images changing in seconds)
	let delay = parseInt(config.delay)
	if(delay < 1) delay = 999999
	document.querySelector('#delayInput').value = delay
	// Offset (difference in seconds between the individual images in the grid changing)
	let offset = parseInt(config.offset)
	if(offset < 1) offset = 999999
	document.querySelector('#offsetInput').value = offset
	// Whether images should change after being rated
	let changeWhenRated = config.changeWhenRated
	document.querySelector('#changeWhenRatedCheckbox').checked = changeWhenRated
	// Image count / Image amount in the grid
	let imageCount = config.imageCount
	document.querySelector('#imageCountSelector').value = imageCount

// Prepare image lists
// --------------------------------------------------------------------------------------------------------------
	// Create array of image paths by looping through all file names in all configured folders and their subfolders
	let images = []
	scanFolders(config.sourcePaths, '')
	if(images.length < 1) images.push(fallbackImage)

	// Get image ratings
	let ratingsRaw = fs.readFileSync(ratingsPath, 'utf8')
	let ratings = JSON.parse(ratingsRaw)
	let ratingsCopy = JSON.parse(ratingsRaw)

	// Prepare different image arrays for the various pool settings
	let unratedImages = []
	let highRatedImageObjects = []
	let highRatedImages = []
	let highestRatedImages = []
	let lowRatedImages = []
	let savedGrids = []
	let newImages = []
	let increment = 1
	for(obj in ratingsCopy){
		ratingsCopy[obj].index = increment
		increment++
	}
	for(i = 0; i < images.length; i++){
		let tempImg = images[i].replace(/\\/g, '/')	// Account for formatting differences
		if(!(tempImg in ratingsCopy)){
			unratedImages.push(tempImg)
		}else{
			if(parseInt(ratingsCopy[tempImg].rating) <= 2){
				lowRatedImages.push(tempImg)
			}else{
				if(parseInt(ratingsCopy[tempImg].rating) > 3) {
					highRatedImages.push(tempImg)
					highRatedImageObjects.push(ratingsCopy[tempImg])
					highRatedImageObjects[highRatedImageObjects.length - 1].link = tempImg
				}
				if(parseInt(ratingsCopy[tempImg].rating) > 4) highestRatedImages.push(tempImg)
			}
		}
	}
	// Prepare newest high rated images
	highRatedImageObjects.sort(function(a, b) {
		let indexA = a.index
		let indexB = b.index
		return (indexA < indexB) ? -1 : (indexA > indexB) ? 1 : 0;
	});
	highRatedImageObjects.splice(0, highRatedImageObjects.length - 300)
	for(i = 0; i < highRatedImageObjects.length; i++){
		newImages.push(highRatedImageObjects[i].link)
	}

	findFiles()
	document.querySelector('#unratedCounter').innerHTML = unratedImages.length

// Add images to HTML + start timeouts
// --------------------------------------------------------------------------------------------------------------
	// Prepare starting images
	let startingImages = [];
	let rememberImages = true
	for(i = 0; i < imgCount; i++){
		latestSavedGrid.push(0)	// Set the state of each image for the saved grids cycle later
		let img = getRandImg(i)
		let alt = ''
		if(rememberImages && config.latestGrid[i] != undefined){
			img = config.latestGrid[i].src
			alt = ' alt="' + config.latestGrid[i].alt + '"'
		}
		startingImages[i] = '<img id="img' + i + '" src="' + img + '" width="' + imgDim + '" height="' + imgDim + '" style="border-style: solid; border-width: 3px; border-color: white"' + alt + '></img>'
	}

	// Insert starting images into HTML, within the imgDisplay element
	let infoDiv = document.querySelector('#imgDisplay')
	startingImages.forEach(img => {
		infoDiv.insertAdjacentHTML('beforeend', img)
	})

	// Start timeouts for image cycling
	for(i = 0; i < imgCount; i++){
		// Start with all images paused
		let element = document.getElementById('img' + i)
		// Pause images that were previously paused
		if(rememberImages && config.latestGrid[i].state == 'pausedTimer'){
			pauseImg(element)
		}

		// The first timeout only accounts for the offset so it can be tested immediately
		let thisDelay = (offset * i) * 1000;
		let timer = setTimeout(function doThing(i) {
			// Get and change image
			let element = document.querySelector('#img' + i)
			changeImg(element, i, 'cycle', false)
			// Update timer delay with the global variable
			thisDelay = delay * 1000;
			// Function calls itself again with the new delay
			timer = setTimeout(doThing, thisDelay, i)

		}, thisDelay, i)
	}

// Functions
// --------------------------------------------------------------------------------------------------------------
	// Image source path decoding function
	function decodeImg(path){
		return ipcRenderer.sendSync('decode', path.replace(/%20/g, ' ').replace(/file:\/\/\//g, ''))
	}

	// Function for getting a random image link based on the selected pool
	function getRandImg(id) {
		let tempImages
		switch(imagePool){
			// No rating
			case 'unrated':
				tempImages = unratedImages
				break
			// Rating > 3
			case 'highRating':
				tempImages = highRatedImages
				break
			// Rating == 5
			case 'highestRating':
				tempImages = highestRatedImages
				break
			// Rating < 3
			case 'lowRating':
				tempImages = lowRatedImages
				break
			// Saved grids of current session (only if there are 2 or more - otherwise jump to default case)
			case 'savedGrids':
				if(savedGrids.length > 1){
					// savedGrids is an array of arrays of image paths (one image for each grid slot)
					let newSrc = savedGrids[latestSavedGrid[id]][id]
					let nextGrid = latestSavedGrid[id] + 1
					if(nextGrid > savedGrids.length - 1) nextGrid = 0
					latestSavedGrid[id] = nextGrid
					return newSrc
				}
			case 'newest':
				tempImages = newImages
				break
			// Random (default setting / fallback)
			default:
				tempImages = images
		}
		// Add the fallback image if the array is empty
		if(tempImages.length < 1){tempImages.push(fallbackImage)}
		return tempImages[Math.floor(Math.random()*tempImages.length)]
	}

	// Image changing function
	function changeImg(element, id, source, revertFlag){
		// Prevent changing the image if it is paused, unless the function was called with the click argument
		if(element.class != 'pausedTimer' || source == 'click'){
			let fadeDelay = 250
			let classList = element.classList
			let newImg
			if(!revertFlag) newImg = getRandImg(parseInt(id))
				else newImg = element.alt
			element.alt = element.src
			classList.add('faded')
			
			let timer = setTimeout(() => {
				element.src = newImg
				classList.remove('faded')
			}, fadeDelay)
		}
	}

	// Image pausing / unpausing function
	// The timers actually keep going, their effects are just ignored for "paused images" - This way the cycles don't become desynced
	function pauseImg(img){
		// Change element class and border color to indicate the state
		if(img.class == 'pausedTimer'){
			img.class = ''
			img.style = 'border-style: solid; border-width: 3px; border-color: white;'
		}else{
			img.class = 'pausedTimer'
			img.style = 'border-style: solid; border-width: 3px; border-color: red;'
		}
	}

	// Zoom in on image function
	function zoom(element){
		// Get image dimensions, then limit them based on screen size
		let image = new Image()
		image.src = element.src
		let dims = [image.naturalWidth, image.naturalHeight]
		let mult = 1
		if(dims[1] > window.screen.availHeight) {
			mult = window.screen.availHeight / dims[1]
		} else if(dims[0] * mult > window.screen.availWidth) {
			mult = window.screen.availWidth / dims[0]
		}
		dims[0] = dims[0] * mult
		dims[1] = dims[1] * mult

		// Open new window with only the image in it
		let posX = window.screenLeft - dims[0] / 2 + window.outerWidth / 2
		let posY = 0
		if(dims[1] < window.screen.availHeight) posY = (window.screen.availHeight - dims[1]) / 2
		const imgWindow = window.open(element.src, '_blank', 'frame=false,width=' + dims[0] + ',height=' + dims[1] + ',x=' + posX + ',y=' + posY)
		// Add left click event listener to new window to make any click close it
		imgWindow.addEventListener('click', () => {
			imgWindow.close()
		})
		// Close window when it loses focus
		imgWindow.onblur = function() { this.close(); };
	}

	// Move image function
	function move(element){
		let image = decodeImg(element.src)
		// TODO: Account for image arrays here
		// Change image
		let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
		changeImg(element, id, 'click', false)
		// The file has to be moved through the main process (I think)
		ipcRenderer.send('move-file', image)
	}

	// Rate an image 1 to 5 function
	function rateImg(element, rating){
		let image = decodeImg(element.src)
		// Add image to ratings object with the rating itself as a property (if it already exists it will be replaced)
		ratings[image] = {
			rating: rating
		}
		// Save ratings to user appdata
		fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 4))

		// Update image arrays
		unratedImages.splice(unratedImages.indexOf(image), 1)
		if(rating < 3){
			lowRatedImages.push(image)
		} else if(rating > 3){
			// Remove oldest image from the newImages array and add this one
			newImages.splice(0, 1)
			newImages.push(image)
			highRatedImages.push(image)
			if(rating > 4){
				highestRatedImages.push(image)
			}
		}
		
		// Update unrated images counter
		document.querySelector('#unratedCounter').innerHTML = unratedImages.length

		// Change image if the relevant setting is enabled
		if(changeWhenRated) {
			let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
			changeImg(element, id, 'click', false)
		}
	}

	// Scan all configured paths function
	function scanFolders(array, parentPath, images) {
		array.forEach(function(folder){
			let fullPath = folder.path
			if(parentPath != '') fullPath = path.join(parentPath, folder.path)
			if(folder.state) scanFolder(fullPath)
			scanFolders(folder.folders, fullPath, images)
		}, array, parentPath, images)
	}

	// Scan folder for images function
	function scanFolder(folderPath){
		// Get all file and folder names within
		if(!fs.existsSync(folderPath)) {
			let posX = window.screenLeft - 225 + window.outerWidth / 2
			ipcRenderer.send('open-window', 450, 400, posX, 'missing-folder.html', false, false)
		}
		let tempImages = fs.readdirSync(folderPath)
		for(i = 0; i < tempImages.length; i++){
			
			// Only keep files with specific file extensions
			let fileEnding = tempImages[i].substring(tempImages[i].length - 5, tempImages[i].length)
			if(fileEnding.includes('.png') || fileEnding.includes('.jpg') || fileEnding.includes('.jpeg') || fileEnding.includes('.gif') || fileEnding.includes('.webp')){
				tempImages[i] = path.join(folderPath, tempImages[i])
			}else{
				tempImages.splice(i, 1)
				i--
			}
			
		}
		// Add found images to the main array
		images = images.concat(tempImages)
	}
	// Fix missing file paths in ratings
	function findFiles(){
		// Build an object with the unrated image file names
		let unratedImagesObj = {}
		for(i = 0; i < unratedImages.length; i++){
			let parts = unratedImages[i].split('/')
			unratedImagesObj[parts[parts.length - 1]] = unratedImages[i]
		}
		// Check for missing files in the ratings
		for(var e in ratings){
			if(Object.prototype.hasOwnProperty.call(ratings, e)){
				if(!fs.existsSync(e)) {
					let fileParts = e.split('/')
					// Look for the file in the unrated images array
					if(fileParts[fileParts.length - 1] in unratedImagesObj){
						ratings[unratedImagesObj[fileParts[fileParts.length - 1]]] = ratings[e]
						delete ratings[e]
						unratedImages.splice(unratedImages.indexOf(e), 1)
					}
				}
			}
		}
		fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 4))
	}

	// Reload window
	function reload(){
		ipcRenderer.send('reload')
	}

	// Save config
	function saveConfig(profile){
		ipcRenderer.send('sync-config', config)
		let savePath = configPath
		if(profile != '') savePath = path.join(appdataPath, 'config-profiles', profile + '.json')
		fs.writeFileSync(savePath, JSON.stringify(config, null, 4))
	}

// Misc event listeners
// --------------------------------------------------------------------------------------------------------------
	// Right click / context menu event listener
	window.addEventListener('contextmenu', (e) => {
		e.preventDefault()
		// Get element from click position
		let rightClickPosition = {x: e.x, y: e.y}
		let element = document.elementFromPoint(e.x, e.y)

		// Only continue if the clicked element has a src property (if it is an img)
		if(element.src !== undefined){
			let imgRating = 0
			let source = decodeImg(element.src)
			// Get rating if possible - Will be shown as checked in the context menu
			if(ratings[source] != null){imgRating = ratings[source].rating}
			// Send to main process for building the menu
			ipcRenderer.send('show-context-menu', rightClickPosition, imgRating, element.class)
		}
	})

	// Right click / context menu actions (received from main process)
	ipcRenderer.on('context-menu-command', (e, command, rightClickPosition) => {
		
		// Get clicked element
		let element = document.elementFromPoint(rightClickPosition.x, rightClickPosition.y)

		// Pause / resume the image cycling
		if(command == 'pause-resume'){
			pauseImg(element)
		}
		// Open image in external app (OS default)
		else if(command == 'open-image'){
			ipcRenderer.send('open-image', element.src)
		}
		// Open the file's location in a folder view
		else if(command == 'open-path'){
			ipcRenderer.send('open-folder', element.src)
		}
		// Rate image 1 to 5
		else if(command.includes('rate')){
			let rating = command.substring(5)
			rateImg(element, rating)
		}
		// Zoom in (open image in new window)
		else if(command == 'zoom'){
			zoom(element)
		}
		// Revert to previous image
		else if(command == 'revert'){
			let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
			changeImg(element, id, 'click', true)
		}
		// Change image
		else if(command == 'change-image'){
			let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
			changeImg(element, id, 'click', false)
		}
		// Move file to the configured folder
		else if(command == 'move-file'){
			move(element)
		}

	})

	// Receive config changes from main when it is synchronized across windows
	ipcRenderer.on('sync-config', (e, receivedConfig) => {
		let changedConfig = false
		if(config.sourcePaths != receivedConfig.sourcePaths || config.movePath != receivedConfig.movePath || config.toggleSubFolders != receivedConfig.toggleSubFolders) changedConfig = true
		if(changedConfig){
			config = receivedConfig
		}
	})

	// Reload when the config window is closed
	ipcRenderer.on('config-closed', (e) => {
		reload()
	})

	// Mouse movement event listener for updating the cursor position
	window.addEventListener("mousemove", (e) => {
		mousePosition.x = e.clientX
		mousePosition.y = e.clientY
	});

	// Keyboard shortcut listener
	window.addEventListener('keyup', (e) => {
		let element = document.elementFromPoint(mousePosition.x, mousePosition.y)

		if(e.key == '5' || e.key == '4' || e.key == '3' || e.key == '2' || e.key == '1'){
			if(element !== undefined && element.src !== undefined) rateImg(element, e.key)
		}else if(e.key == 'u'){
			if(element !== undefined && element.src !== undefined) {
				let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
				changeImg(element, id, 'click', true)
			}
		}else if(e.key == 'r'){
			reload()
		}else if(e.key == 'z'){
			if(element !== undefined && element.src !== undefined) zoom(element)
		}else if(e.key == 'c'){
			if(element !== undefined && element.src !== undefined){
				let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
				changeImg(element, id, 'click', false)
			}
		}else if(e.key == 'p'){
			if(element !== undefined && element.src !== undefined) pauseImg(element)
		}else if(e.key == 'o'){
			if(element !== undefined && element.src !== undefined) ipcRenderer.send('open-folder', element.src)
		}else if(e.key == 'm'){
			if(element !== undefined && element.src !== undefined) move(element)
		}else if(e.key == 'Control'){
			ipcRenderer.send('dev-tools')
		}
	}, true)

	// Left click event listener - Add to all images
	let imageElements = document.querySelectorAll('img')
	for(i = 0; i < imageElements.length; i++){
		imageElements[i].addEventListener('click', (e) => {
			// Execute different action based on setting
			if(clickAction == 'pauseResume'){
				pauseImg(e.target)
			} else
			if(clickAction == 'change') {
				changeImg(e.target, i, 'click', false)
			} else
			if(clickAction == 'zoom') {
				zoom(e.target)
			}
		})
	}

	// Save config on unload / close
	window.addEventListener('beforeunload', (e) => {
		// Get current grid images
		imageElements = document.querySelectorAll('img')
		for(x = 0; x < imageElements.length; x++){
			config.latestGrid[x] = {src: imageElements[x].src, alt: imageElements[x].alt, state: imageElements[x].class}
		}
		// Save config
		saveConfig('')
	})

// Button, input and selector event listeners
// --------------------------------------------------------------------------------------------------------------
	// Pause all button - Pauses all images so they don't get cycled
	document.querySelector('#pauseButton').addEventListener('click', () => {
		for(i = 0; i < imgCount; i++){
			let img = document.querySelector('#img' + i)
			if(img.class == '' || img.class == undefined) pauseImg(img)
		}
	})
	// Resume all button - Resumes all images being cycled
	document.querySelector('#continueButton').addEventListener('click', () => {
		for(i = 0; i < imgCount; i++){
			let img = document.querySelector('#img' + i)
			if(img.class == 'pausedTimer') pauseImg(img)
		}
	})
	// Change all button - Rerolls all images
	document.querySelector('#changeButton').addEventListener('click', () => {
		for(i = 0; i < imgCount; i++){
			let img = document.querySelector('#img' + i)
			changeImg(img, i, 'click', false)
		}
	})
	// Reload button - Reloads window
	document.querySelector('#reloadButton').addEventListener('click', () => {
		reload()
	})
	// Settings button - Opens config window
	document.querySelector('#configButton').addEventListener('click', () => {
		// Open new window
		let posX = window.screenLeft - 300 + window.outerWidth / 2
		ipcRenderer.send('open-window', 600, 850, posX, 'config.html', false, false)
	})
	// Save grid button - Saves all current images to an array (for the current session only)
	// Grids can be cycled through with the corresponding image pool setting
	document.querySelector('#saveGridButton').addEventListener('click', () => {
		let grid = []
		for(i = 0; i < imgCount; i++){
			let img = document.querySelector('#img' + i)
			grid[i] = img.src
		}
		savedGrids.push(grid)
	})
	// Move all low rated button - Moves lowly rated images to the configured target folder
	document.querySelector('#moveButton').addEventListener('click', () => {
		for(i = 0; i < lowRatedImages.length; i++){
			if(lowRatedImages[i] != fallbackImage){
				let img = decodeImg(lowRatedImages[i])
				ipcRenderer.send('move-file', img)
			}
		}
		lowRatedImages = []
	})
	// Image pool selector - Controls which array new images are drawn from when being changed
	document.querySelector('#imagePoolSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		imagePool = e.target.value
		config.imagePool = e.target.value
		reload()
	})
	// Image count selector - Controls the number of images in the window (only applied on reload)
	document.querySelector('#imageCountSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		imageCount = e.target.value
		config.imageCount = e.target.value
		reload()
	})
	// Left click action selector - Controls what action is performed when an image is clicked on
	document.querySelector('#clickActionSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		clickAction = e.target.value
		config.clickAction = e.target.value
	})
	// Delay input field - Sets the interval for images being cycled in seconds
	document.querySelector('#delayInput').addEventListener('change', (e) => {
		// Update variable and save to config file
		delay = e.target.value
		if(delay < 1) delay = 999999
		config.delay = e.target.value
	})
	// Offset input field - Sets the difference in seconds between the individual images in the grid cycling
	document.querySelector('#offsetInput').addEventListener('change', (e) => {
		// Update variable and save to config file
		offset = e.target.value
		if(offset < 1) offset = 999999
		config.offset = e.target.value
	})
	// Change when rated checkbox - If enabled, rating an image also changes it
	document.querySelector('#changeWhenRatedCheckbox').addEventListener('change', (e) => {
		// Update variable and save to config file
		changeWhenRated = e.target.checked
		config.changeWhenRated = e.target.checked
	})
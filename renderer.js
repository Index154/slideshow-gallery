// Modules
const { ipcRenderer } = require('electron')
const fs = require('fs')
const { decode } = require('html-entities')
const path = require('node:path')

// Defaults and paths
let appdataPath = ipcRenderer.sendSync('get-appdataPath')
let fallbackImage = path.join(__dirname, 'icons', 'no-images.png')
let ratingsPath = path.join(appdataPath, 'ratings.json')
let configPath = path.join(appdataPath, 'config.json')
let latestGrid = []
let mousePosition = {x: 0, y: 0}

// Get config file
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

// Image count and size
let imgSettings = {
	'eight': {'dim': 375, 'count': 8},
	'one': {'dim': 700, 'count': 1}
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
	document.querySelector('#delayInput').value = delay
	// Offset (difference in seconds between the individual images in the grid changing)
	let offset = parseInt(config.offset)
	document.querySelector('#offsetInput').value = offset
	// Whether images should change after being rated
	let changeWhenRated = config.changeWhenRated
	document.querySelector('#changeWhenRatedCheckbox').checked = changeWhenRated
	// Image count / Image amount in the grid
	let imageCount = config.imageCount
	document.querySelector('#imageCountSelector').value = imageCount

// Prepare image lists
// --------------------------------------------------------------------------------------------------------------
	// Create array of image paths by looping through all file names in all configured folders
	let images = []
	for(x = 0; x < config.sourcePaths.length; x++){
		if(fs.existsSync(config.sourcePaths[x])){
			let tempImages = fs.readdirSync(config.sourcePaths[x])
			for(i = 0; i < tempImages.length; i++){
				tempImages[i] = path.join(config.sourcePaths[x], tempImages[i])
			}
			images = images.concat(tempImages)
		}
	}
	if(images.length < 1) images.push(fallbackImage)

	// Get image ratings
	let ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'))

	// Prepare different image arrays for the various pool settings
	let unratedImages = []
	let highRatedImages = []
	let highestRatedImages = []
	let lowRatedImages = []
	let savedGrids = []
	for(i = 0; i < images.length; i++){
		let tempImg = images[i].replace(/\\/g, '/')	// Account for formatting differences
		if(!(tempImg in ratings)){
			unratedImages.push(tempImg)
		}else if(parseInt(ratings[tempImg].rating) <= 2){
			lowRatedImages.push(tempImg)
		}else{
			if(parseInt(ratings[tempImg].rating) > 3) highRatedImages.push(tempImg)
			if(parseInt(ratings[tempImg].rating) > 4) highestRatedImages.push(tempImg)
		}
	}
	document.querySelector('#unratedCounter').innerHTML = unratedImages.length

// Add images to HTML + start timeouts
// --------------------------------------------------------------------------------------------------------------
	// Prepare starting images
	let startingImages = [];
	for(i = 0; i < imgCount; i++){
		latestGrid.push(0)	// Set the state of each image for the saved grids cycle later
		let img = getRandImg(i)
		startingImages[i] = '<img id="img' + i + '" src="' + img + '" width="' + imgDim + '" height="' + imgDim + '" style="border-style: solid; border-width: 3px; border-color: white"></img>'
	}

	// Insert starting images into HTML, within the imgDisplay element
	let infoDiv = document.querySelector('#imgDisplay')
	startingImages.forEach(img => {
		infoDiv.insertAdjacentHTML('beforeend', img)
	})

	// Start timeouts for image cycling
	for(i = 0; i < imgCount; i++){
		// The first timeout only accounts for the offset so it can be tested immediately
		let thisDelay = (offset * i) * 1000;
		let timer = setTimeout(function doThing(i) {
			// Get and change image
			let element = document.querySelector('#img' + i)
			changeImg(element, i, 'cycle')
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
		return decode(path.replace(/%20/g, ' ').replace(/file:\/\/\//g, ''))
	}

	// Function for getting a random image link based on the selected pool
	function getRandImg(id) {
		let tempImages
		switch(imagePool){
			// No rating
			case 'unrated':
				tempImages = unratedImages
				break;
			// Rating > 3
			case 'highRating':
				tempImages = highRatedImages
				break;
			// Rating == 5
			case 'highestRating':
				tempImages = highestRatedImages
				break;
			// Rating < 3
			case 'lowRating':
				tempImages = lowRatedImages
				break;
			// Saved grids of current session (only if there are 2 or more - otherwise jump to default case)
			case 'savedGrids':
				if(savedGrids.length > 1){
					// savedGrids is an array of arrays of image paths (one image for each grid slot)
					console.log(latestGrid)
					let newSrc = savedGrids[latestGrid[id]][id]
					let nextGrid = latestGrid[id] + 1
					if(nextGrid > savedGrids.length - 1) nextGrid = 0
					latestGrid[id] = nextGrid
					return newSrc
				}
			// Random (default setting / fallback)
			default:
				tempImages = images
		}
		// Add the fallback image if the array is empty
		if(tempImages.length < 1){tempImages.push(fallbackImage)}
		return tempImages[Math.floor(Math.random()*tempImages.length)]
	}

	// Image changing function
	function changeImg(element, id, source){
		// Prevent changing the image if it is paused, unless the function was called with the click argument
		// TODO: Add fancy animation maybe
		if(element.class != 'pausedTimer' || source == 'click'){
			let newImg = getRandImg(parseInt(id))
			element.src = newImg
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
		// Open new window with only the image in it
		const imgWindow = window.open(element.src, '_blank')
		// Add left click event listener to new window to make any click close it
		imgWindow.addEventListener('click', () => {
			imgWindow.close()
		})
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
		// Update unrated images
		unratedImages.splice(unratedImages.indexOf(image), 1)
		document.querySelector('#unratedCounter').innerHTML = unratedImages.length
		// Change image if the relevant setting is enabled
		let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
		if(changeWhenRated) changeImg(element, id, 'click')
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
		else if(command == "zoom"){
			zoom(element)
		}
		// Move file to the configured folder
		else if(command == "move-file"){
			let image = decodeImg(element.src)
			// Remove from low rated images list
			// TODO: Also account for other image arrays here
			// TODO: Update ratings entry for the image with the new path
			lowRatedImages.splice(lowRatedImages.indexOf(image), 1)
			// Change image
			let id = parseInt(element.id.substring(element.id.length - 1, element.id.length))
			changeImg(element, id, 'click')
			// The file has to be moved through the main process (I think)
			ipcRenderer.send('move-file', image)
		}

	})

	// Mouse movement event listener for updating the cursor position
	window.addEventListener("mousemove", (e) => {
		mousePosition.x = e.clientX
		mousePosition.y = e.clientY
	});

	// Shortcut listener for rating images with number keys
	window.addEventListener('keyup', (e) => {
		if(e.key == '5' || e.key == '4' || e.key == '3' || e.key == '2' || e.key == '1'){
			let element = document.elementFromPoint(mousePosition.x, mousePosition.y)
			if(element !== undefined && element.src !== undefined) rateImg(element, e.key)
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
				changeImg(e.target, i, 'click')
			} else
			if(clickAction == 'zoom') {
				zoom(e.target)
			}
		})
	}

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
			let img = decodeImg(lowRatedImages[i])
			ipcRenderer.send('move-file', img)
		}
		lowRatedImages = []
	})
	// Image pool selector - Controls which array new images are drawn from when being changed
	document.querySelector('#imagePoolSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		imagePool = e.target.value
		config.imagePool = e.target.value
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
	// Image count selector - Controls the number of images in the window (only applied on reload)
	document.querySelector('#imageCountSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		imageCount = e.target.value
		config.imageCount = e.target.value
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
	// Left click action selector - Controls what action is performed when an image is clicked on
	document.querySelector('#clickActionSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		clickAction = e.target.value
		config.clickAction = e.target.value
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
	// Delay input field - Sets the interval for images being cycled in seconds
	document.querySelector('#delayInput').addEventListener('change', (e) => {
		// Update variable and save to config file
		delay = e.target.value
		config.delay = e.target.value
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
	// Offset input field - Sets the difference in seconds between the individual images in the grid cycling
	document.querySelector('#offsetInput').addEventListener('change', (e) => {
		// Update variable and save to config file
		offset = e.target.value
		config.offset = e.target.value
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
	// Change when rated checkbox - If enabled, 
	document.querySelector('#changeWhenRatedCheckbox').addEventListener('change', (e) => {
		// Update variable and save to config file
		changeWhenRated = e.target.checked
		config.changeWhenRated = e.target.checked
		fs.writeFileSync(configPath, JSON.stringify(config, null, 4))
	})
// Unsafe node access module
const { ipcRenderer, clipboard } = require('electron')
const fs = require('fs')
const path = require('node:path')
//const ExifReader = require('exifreader')

// Defaults and paths
let appdataPath = ipcRenderer.sendSync('get-config')
let fallbackImage = path.join('..', 'images', 'no-images.png')
let ratingsPath = path.join(appdataPath, 'ratings.json')
let metadataPath = path.join(appdataPath, 'metadata.json')
let configPath = path.join(appdataPath, 'config.json')
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
let configChanged = false;
let mousePosition = {x: 0, y: 0}
let inputFieldFocus = false

// Image count and size
let gallery = document.getElementById('imgDisplay')
let configDiv = document.getElementById('config')
let imgSettings = {
	eighteen: {dim: 240, count: 18},
	twelve: {dim: 252, count: 12},
	eight: {dim: 375, count: 8},
	eightSmall: {dim: 275, count: 8},
	two: {dim: 750, count: 2},
	one: {dim: 750, count: 1}
}
let imgCount = imgSettings[config.imageCount].count
let imgDim = imgSettings[config.imageCount].dim

// Some unsuccessful attempts at dynamic image sizes
//let menuBar = document.querySelector('#menuBar')
//imgDim = Math.floor(Math.sqrt(((window.innerHeight - menuBar.offsetHeight) * (window.innerWidth - 50)) / imgCount) - 12)
//imgDim = Math.min((window.innerHeight - menuBar.offsetHeight) / imgCount, (window.innerWidth - 0) / imgCount);


// Get settings from config and update UI elements
// --------------------------------------------------------------------------------------------------------------
	// Selection mode / Image pool (what images should be cycled through)
	let imagePool = config.imagePool	// The UI values for these are updated later because of custom pools not being loaded yet!
	let editingPool = config.editingPool	
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
	// Get previously exported metadata
	let metadataRaw = fs.readFileSync(metadataPath, 'utf8')
	let metadata = JSON.parse(metadataRaw)
	let metadataFetchCount = 0

	// Create array of image paths by looping through all file names in all configured folders and their subfolders
	let images = []
	scanFolders(config.sourcePaths, '')
	if(images.length < 1) images.push(fallbackImage)
	metadata = JSON.parse(metadataRaw)
	metadataFetchCount = 0

	// Get image ratings
	let ratingsRaw = fs.readFileSync(ratingsPath, 'utf8')
	let ratings = JSON.parse(ratingsRaw)
	let ratingsCopy = JSON.parse(ratingsRaw)

	// Insert custom image pools into selectors
	let imagePoolSelector = document.querySelector('#imagePoolSelector')
	let editingPoolSelector = document.querySelector('#editingPoolSelector')
	// Get custom pool files from folder and prepare variables
	let customPoolList = []
	let customPools = {}
	let activeCustomPool = { include: [], exclude: [] }
	let customPoolPath = path.join(appdataPath, 'custom-pools')
	let customPoolFiles = fs.readdirSync(path.join(appdataPath, 'custom-pools'))
	customPoolFiles.forEach(customPool => {
		if(customPool.substring(customPool.length - 5, customPool.length).includes('.json')){
			let customPoolName = customPool.replace(/\.json/, '')
			customPools[customPoolName] = JSON.parse(fs.readFileSync(path.join(customPoolPath, customPool), 'utf8'))
			customPoolList.push(customPoolName)
			let poolHtml = '<option value="' + customPoolName + '">' + customPoolName + '</option>'
			imagePoolSelector.insertAdjacentHTML('beforeend', poolHtml)
			editingPoolSelector.insertAdjacentHTML('beforeend', poolHtml)
		}
	})
	// Update UI elements that only now have all their values
	document.querySelector('#imagePoolSelector').value = imagePool
	if(editingPool != '') editingPoolSelector.value = editingPool
	else {
		editingPool = editingPoolSelector.value
		config.editingPool = editingPoolSelector.value
	}

	// Prepare different image arrays for the various pool settings
	let unratedImages = []
	let highRatedImageObjects = []
	let highRatedImages = []
	let highestRatedImages = []
	let lowRatedImages = []
	let newImages = []
	let increment = 1
	for(obj in ratingsCopy){
		ratingsCopy[obj].index = increment
		increment++
	}
	for(i = 0; i < images.length; i++){
		let tempImg = images[i].replace(/\\/g, '/')	// Account for formatting differences
		// Add images to active custom pool if one is selected right now
		if(customPools[imagePool] != undefined){
			if(customPools[imagePool].include.includes(tempImg)) activeCustomPool.include.push(tempImg)
		}

		// Add images to default pool unless they are in the editing pool
		let isInEditingPool = false
		if(customPools[editingPool] != undefined){
			isInEditingPool = customPools[editingPool].include.includes(tempImg) || customPools[editingPool].exclude.includes(tempImg)
		}
		if(!isInEditingPool){
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
		}else{
			images.splice(i, 1)
			i--
		}
	}
	// Prepare newest high rated images. For sorting purporses we have the ratingsCopy array with the extra index properties
	highRatedImageObjects.sort(function(a, b) {
		let indexA = a.index
		let indexB = b.index
		return (indexA < indexB) ? -1 : (indexA > indexB) ? 1 : 0;
	});
	highRatedImageObjects.splice(0, highRatedImageObjects.length - 300)
	for(i = 0; i < highRatedImageObjects.length; i++){
		newImages.push(highRatedImageObjects[i].link)
	}

	fixRatingPaths()
	fixCustomPoolPaths()
	let uiImageCount = getImagePool().length
	if(uiImageCount == 1 && getImagePool()[0] == "../images/no-images.png") uiImageCount = 0
	document.querySelector('#imageCounter').innerHTML = uiImageCount

	//let buffer = fs.readFileSync('G:\\1.png')
	//console.log(ExifReader.load(buffer))

// Add images to HTML + start timeouts
// --------------------------------------------------------------------------------------------------------------
	// Prepare starting images
	let startingImages = [];
	let rememberImages = true
	for(i = 0; i < imgCount; i++){
		let img = getRandImg()
		let alt = ''
		if(rememberImages && config.latestGrid[i] != undefined && fs.existsSync(decodeImg(config.latestGrid[i].src))){
			img = config.latestGrid[i].src
			alt = ' alt="' + config.latestGrid[i].alt + '"'
		}
		elementType = 'img'
		//if(img.includes(".mp4")) elementType = 'video'
		divTemp = '<div class="imgVideoDiv" width="' + imgDim + '" height="' + imgDim + '" style="border-style: solid; border-width: 3px; border-color: green;"> '
		startingImages[i] = '<' + elementType + ' loop="" autoplay="" muted="" id="img' + i + '" src="' + img + '" width="' + imgDim + '" height="' + imgDim + '" style="border-style: solid; border-width: 3px; border-color: white"' + alt + '></' + elementType + '>'
	}

	// Insert starting images into HTML, within the imgDisplay element
	startingImages.forEach(img => {
		gallery.insertAdjacentHTML('beforeend', img)
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
		let timer = setTimeout(function startTimer(i) {
			// Get and change image
			let element = document.querySelector('#img' + i)
			changeImg(element, 'cycle', false)
			// Update timer delay with the global variable, removing the offset
			thisDelay = delay * 1000;

			// Keep cycling with the new delay
			timer = setInterval(function repeat(i) {
				// Get and change image
				let element = document.querySelector('#img' + i)
				changeImg(element, 'cycle', false)
			}, thisDelay, i)

		}, thisDelay, i)
	}

// Config tab stuff
// --------------------------------------------------------------------------------------------------------------
	// Insert folder names
	let pathsFlex = document.querySelector('#pathsFlex')
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

	// Diplay current file name filter
	let fileNameFilter = document.querySelector('#fileFilterInput')
	fileNameFilter.value = config.fileNameFilter
	// Diplay current metadata filter
	let metadataFilter = document.querySelector('#metadataFilterInput')
	metadataFilter.value = config.metadataFilter
	let metadataFilterNeg = document.querySelector('#metadataNegFilterInput')
	metadataFilterNeg.value = config.metadataFilterNegative
	// Display current move target folder
	let moveTarget = document.querySelector('#moveTarget')
	moveTarget.innerText = "Current: " + config.movePath
	// Update toggle subfolder checkbox state
	let toggleSubFolders = config.toggleSubFolders
	document.querySelector('#toggleSubCheckbox').checked = toggleSubFolders

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
            if(element.id != "toggleSubCheckbox") element.checked = true
        });
        changeAllStates(config.sourcePaths, true)
    })
    // Disable all button listener
    document.querySelector('#disableAllButton').addEventListener('click', (e) => {
        let checkBoxes = document.querySelectorAll('input[type=checkbox]')
        checkBoxes.forEach(element => {
            if(element.id != "toggleSubCheckbox") element.checked = false
        });
        changeAllStates(config.sourcePaths, false)
    })

    // Toggle subfolders checkbox - If enabled, toggling a folder checkbox will also affect all its subfolders
    document.querySelector('#toggleSubCheckbox').addEventListener('change', (e) => {
        if(e.target.checked) config.toggleSubFolders = true
        else{config.toggleSubFolders = false}
		configChanged = true
    })
    // File name filter input listener
    fileNameFilter.addEventListener('blur', (e) => {
        // Update variable for config change when closing the config
		if(e.target.value != config.fileNameFilter) configChanged = true
        config.fileNameFilter = e.target.value
    })
    // Metadata filter input listener
    metadataFilter.addEventListener('blur', (e) => {
        // Update variable for config change when closing the config
		if(e.target.value != config.metadataFilter) configChanged = true
        config.metadataFilter = e.target.value
    })
	// Metadata (negative) filter input listener
    metadataFilterNeg.addEventListener('blur', (e) => {
        // Update variable for config change when closing the config
		if(e.target.value != config.metadataFilterNegative) configChanged = true
        config.metadataFilterNegative = e.target.value
    })


// Functions
// --------------------------------------------------------------------------------------------------------------
	// Image source path decoding function
	function decodeImg(path){
		return ipcRenderer.sendSync('decode', path.replace(/%20/g, ' ').replace(/file:\/\/\//g, ''))
	}

	// Pick the array corresponding to the current image pool setting
	function getImagePool(){
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
			case 'newest':
				tempImages = newImages
				break
			// Random
			case 'random':
				tempImages = images
				break
			// Default: Try to load a custom image pool profile
			default:
				tempImages = activeCustomPool.include
		}
		return tempImages
	}

	// Function for getting a random image link based on the selected pool
	function getRandImg() {
		let tempImages = getImagePool()
		// Add the fallback image if the array is empty
		if(tempImages.length < 1){tempImages.push(fallbackImage)}
		// Pick a random image
		return tempImages[Math.floor(Math.random() * tempImages.length)]
	}

	// Image changing function
	function changeImg(element, source, revertFlag){
		// Prevent changing the image if it is paused, unless the function was called with the click argument
		if(element.class != 'pausedTimer' || source == 'click'){
			let fadeDelay = 250
			let classList = element.classList
			let newImg
			if(!revertFlag) newImg = getRandImg()
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
		changeImg(element, 'click', false)
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
		if(imagePool == 'unrated') document.querySelector('#imageCounter').innerHTML = unratedImages.length

		// Change image if the relevant setting is enabled
		if(changeWhenRated) changeImg(element, 'click', false)
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
			ipcRenderer.send('open-window', 450, 400, posX, 'missing-folder.html', false, true, folderPath)
		}else{
			let tempImages = fs.readdirSync(folderPath)
			let metadataFilterList = config.metadataFilter.toLowerCase().split(",")
			let metadataFilterListNeg = config.metadataFilterNegative.toLowerCase().split(",")
			console.log(tempImages.length)
			for(i = 0; i < tempImages.length; i++){
				
				// Only keep files with specific file extensions. Also filter out files not matching the set filter
				let fileEnding = tempImages[i].substring(tempImages[i].length - 5, tempImages[i].length)
				if(fileEnding.includes('.png') || fileEnding.includes('.jpg') || fileEnding.includes('.jpeg') || fileEnding.includes('.gif') || fileEnding.includes('.webp')){
					if(config.fileNameFilter == "" || tempImages[i].includes(config.fileNameFilter)){
						if(config.metadataFilter == ""){
							tempImages[i] = path.join(folderPath, tempImages[i])
						}else{
							// Filter out files that do not have all given filter strings in their metadata
							// Split filter strings by comma
							let imgPath = path.join(folderPath, tempImages[i])
							let imgData = getMetadata(imgPath, 'positive').toLowerCase()
							let filterMatch = true;
							for(b = 0; b < metadataFilterList.length && filterMatch; b++){
								if(!imgData.includes(metadataFilterList[b])) filterMatch = false;
							}
							for(c = 0; c < metadataFilterListNeg.length && filterMatch && config.metadataFilterNegative != ""; c++){
								console.log(metadataFilterListNeg.length)
								if(!metadataFilterList.includes(metadataFilterListNeg[c]) && imgData.includes(metadataFilterListNeg[c])) filterMatch = false;
							}
							if(filterMatch) tempImages[i] = imgPath
							else{
								tempImages.splice(i, 1)
								i--
							}
						}
					}else{
						tempImages.splice(i, 1)
						i--
					}
				}else{
					tempImages.splice(i, 1)
					i--
				}
				
			}
			// Add found images to the main array
			images = images.concat(tempImages)
			// Save metadata to cache file
			fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 4))
		}
	}

	// Fix missing file paths in ratings
	function fixRatingPaths(){
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
						// Also correct the strings in the metadata cache to avoid duplicates
						metadata[unratedImagesObj[fileParts[fileParts.length - 1]]] = metadata[e]
						delete metadata[e]
						console.log("Removing element")
					}
				}
			}
		}
		//fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 4))
		//fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 4))
	}

	// Fix missing file paths in custom pools
	function fixCustomPoolPaths(){

		// Build list of image file names referencing the full paths to the image files
		let imagesObj = {}
		for(i = 0; i < images.length; i++){
			let parts = images[i].split('\\')
			imagesObj[parts[parts.length - 1]] = images[i].replace(/\\/g, '/')	// Formatting differences...
		}

		// Loop through all detected custom pools, update the arrays and then save the files
		for(o = 0; o < customPoolList.length; o++){
			let pool = customPools[customPoolList[o]]
			fixPoolComponent(pool.include, imagesObj)
			fixPoolComponent(pool.exclude, imagesObj)
			//fs.writeFileSync(path.join(customPoolPath, customPoolList[o] + '.json'), JSON.stringify(pool, null, 4))
		}
	}

	// Fix missing file paths in a specific sub-array of a custom pool
	function fixPoolComponent(component, imagesObj){

		// Check for missing files in the custom pool component
		for(i = 0; i < component.length; i++){
			if(!fs.existsSync(component[i])) {
				let fileParts = component[i].split('/')
				
				// Look for the file name in the list of loaded image names
				if(fileParts[fileParts.length - 1] in imagesObj){
					component[i] = imagesObj[fileParts[fileParts.length - 1]]
				}
			}
		}
	}

	// Reload window
	function reload(){
		ipcRenderer.send('reload')
	}

	// Save config
	function saveConfig(profile){
		//ipcRenderer.send('sync-config', config)
		let savePath = configPath
		if(profile != '') savePath = path.join(appdataPath, 'config-profiles', profile + '.json')
		fs.writeFileSync(savePath, JSON.stringify(config, null, 4))
	}

	// Remove from custom pool
	function removeFromPool(element){
		let img = decodeImg(element.src)
		let doChange = false

		if(editingPool != ''){

			// Add to exclude section
			if(!customPools[editingPool].exclude.includes(img)) {
				customPools[editingPool].exclude.push(img)
				let updatePoolPath = path.join(customPoolPath, editingPool + '.json')
				fs.writeFileSync(updatePoolPath, JSON.stringify(customPools[editingPool], null, 4))
				doChange = true
			}

			// Remove from include section
			if(customPools[editingPool].include.includes(img)) {
				customPools[editingPool].include.splice(customPools[editingPool].include.indexOf(img), 1)
				if(editingPool == imagePool && activeCustomPool.includes(img)) activeCustomPool.include.splice(activeCustomPool.include.indexOf(img), 1)
				let updatePoolPath = path.join(customPoolPath, editingPool + '.json')
				fs.writeFileSync(updatePoolPath, JSON.stringify(customPools[editingPool], null, 4))
				doChange = true
			}

			if (doChange) {
				removeFromAllPools(img)
				changeImg(element, 'click', false)
			}
		}
	}

	// Add image to custom pool
	function addToPool(element){
		let img = decodeImg(element.src)
		let doChange = false

		if(editingPool != ''){

			// Add to include section
			if(!customPools[editingPool].include.includes(img)) {
				customPools[editingPool].include.push(img)
				if(editingPool == imagePool) activeCustomPool.include.push(img)
				let updatePoolPath = path.join(customPoolPath, editingPool + '.json')
				fs.writeFileSync(updatePoolPath, JSON.stringify(customPools[editingPool], null, 4))
				doChange = true
			}

			// Remove from exclude section
			if(customPools[editingPool].exclude.includes(img)) {
				customPools[editingPool].exclude.splice(customPools[editingPool].exclude.indexOf(img), 1)
				let updatePoolPath = path.join(customPoolPath, editingPool + '.json')
				fs.writeFileSync(updatePoolPath, JSON.stringify(customPools[editingPool], null, 4))
				doChange = true
			}

			if (doChange) {
				removeFromAllPools(img)
				changeImg(element, 'click', false)
			}
		}
	}

	// Add all visible images to custom pool
	function addAllToPool(){
		let elements = document.querySelectorAll('img')
		elements.forEach(element => {
			addToPool(element)
		})
	}

	// Remove all visible images from custom pool
	function removeAllFromPool(){
		let images = document.querySelectorAll('img')
		images.forEach(img => {
			removeFromPool(img)
		})
	}

	// Remove an array value from an array if it is in the array
	function removeIfIncludes(value, array){
		if(array.includes(value)) {
			array.splice(array.indexOf(value), 1)
		}
	}

	// Remove an image from all default image pools
	function removeFromAllPools(img){
		img = decodeImg(img)
		removeIfIncludes(img, unratedImages)
		removeIfIncludes(img, highRatedImages)
		removeIfIncludes(img, highestRatedImages)
		removeIfIncludes(img, lowRatedImages)
		removeIfIncludes(img, newImages)
		removeIfIncludes(img, images)

		document.querySelector('#imageCounter').innerHTML = getImagePool().length
	}

	// Compare the contents of two files at specified paths (buffers)
	function compareFileBuffers(pathA, pathB){
		let bufferA = fs.readFileSync(pathA)
		let bufferB = fs.readFileSync(pathB)
		return bufferA.equals(bufferB)
	}

	// Copy some prompt information to clipboard (depending on specified parameter)
	function getMetadata(elementSource, option){
		splitStrings = {
			'positive': ['parameters', 'Negative prompt:'],
			'negative': ['Negative prompt:', 'Steps:'],
			'seed': ['Seed:', ', Size:'],
			'checkpoint': ['Model:', ', VAE']
		}

		elementSource = decodeImg(elementSource).replace(/\\/g, '/') // Account for formatting differences
		let result = ""
		if(metadata[elementSource] != null){ result = metadata[elementSource] }
		else if(metadataFetchCount < 1000){
			// Get metadata for newly detected images and then save it to the cache
			console.log("Fetching new image metadata...")
			metadataFetchCount++
			let bufferString = fs.readFileSync(elementSource).toString()
			if(bufferString.includes(splitStrings[option][0]) && bufferString.includes(splitStrings[option][1])){
				result = bufferString.split(splitStrings[option][0])[1].split(splitStrings[option][1])[0].slice(1).replace(/(\r\n|\n|\r|\u0000)/gm, '')	// Replace linebreaks and remove first char cause idk how else to remove the char after 'tEXtparameters'
			}
			bufferString = null		// Set to null to prevent memory issues
			metadata[elementSource] = result
		}
		return result
	}

	// Change all folder states function
	function changeAllStates(array, newState) {
		configChanged = true
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
					let foundFolders = scanFolderPaths(pickedPath[0])
					for(i = 0; i < foundFolders.length; i++){
						// Add all subfolders to the config as well
						addFolder(foundFolders[i].split('\\'), config.sourcePaths)
					}
				}
			}else{
				config.movePath = pickedPath[0]
				moveTarget.innerText = "Current: " + config.movePath
			}
			ipcRenderer.send('reload')
		}
	}

	// Paths into HTML insertion function
	function insertPath(folder, array){
		// Insert
		let path = folder.path.replace(/[:/\\\/ ]/g, "")
		let margin = (folderLevel * 25) + 10
		pathsFlex.insertAdjacentHTML('beforeend', '<div id="div-' + path + '"><label><input type="checkbox" id="checkbox-' + folderId + '" value="' + path + '" style="margin-left:' + margin + 'px;">' + folder.path + '</label><button type="button" id="deletePath-' + folderId + '" class="deleteButton">Delete</button></div>')

		// Set checkbox state
		let checkbox = document.querySelector('#checkbox-' + folderId)
		if(folder.state) checkbox.checked = true

		// Left click event listener for the checkbox
		checkbox.addEventListener('change', (e) => {
			// Toggle the clicked checkbox
			let newState = true
			if(!e.target.checked) newState = false
			array[array.indexOf(folder)].state = newState

			// Toggle subfolders if enabled
			if(config.toggleSubFolders) {
				changeAllStates(array[array.indexOf(folder)].folders, newState)
			}
		})

		// Event listener for the delete button
		let deleteButton = document.querySelector('#deletePath-' + folderId)
		deleteButton.addEventListener('click', (e) => {
			array.splice(array.indexOf(folder), 1)
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
	function scanFolderPaths(foldersToScan){
		foldersToScan = [foldersToScan]
		let foundFolders = []
		while(foldersToScan.length > 0){
			// If it's a directory
			if(fs.lstatSync(foldersToScan[0]).isDirectory() && !foldersToScan[0].includes('.tmp')){
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
			changeImg(element, 'click', true)
		}
		// Change image
		else if(command == 'change-image'){
			changeImg(element, 'click', false)
		}
		// Move file to the configured folder
		else if(command == 'move-file'){
			move(element)
		}
		// Add file to custom pool
		else if(command == 'add-to-pool'){
			addToPool(element)
		}
		// Remove file from custom pool
		else if(command == 'remove-from-pool'){
			removeFromPool(element)
		}
		// Copy positive prompt from file metadata if possible
		else if(command == 'copy-posprompt'){
			clipboard.writeText(getMetadata(element.src, 'positive'))
		}
		// Copy negative prompt from file metadata if possible
		else if(command == 'copy-negprompt'){
			clipboard.writeText(getMetadata(element.src, 'negative'))
		}
		// Copy seed from file metadata if possible
		else if(command == 'copy-seed'){
			clipboard.writeText(getMetadata(element.src, 'seed'))
		}
		// Copy negative prompt from file metadata if possible
		else if(command == 'copy-checkpoint'){
			clipboard.writeText(getMetadata(element.src, 'checkpoint'))
		}

	})

	// Receive config changes from main when it is synchronized across windows
	// OLD?
	ipcRenderer.on('sync-config', (e, receivedConfig) => {
		let changedConfig = false
		if(config.sourcePaths != receivedConfig.sourcePaths || config.movePath != receivedConfig.movePath || config.toggleSubFolders != receivedConfig.toggleSubFolders) changedConfig = true
		if(changedConfig){
			config = receivedConfig
		}
	})

	// Mouse movement event listener for updating the cursor position
	window.addEventListener("mousemove", (e) => {
		mousePosition.x = e.clientX
		mousePosition.y = e.clientY
	});

	// Keyboard shortcut listener
	window.addEventListener('keyup', (e) => {

		// Ignore keyup event while the text field is focused
		if(inputFieldFocus) return
		
		if(e.key == 'Control'){
			ipcRenderer.send('dev-tools')
			return
		}else if(e.key == 'r'){
			reload()
			return
		}

		// Prepare for interactions that require the mouse being over an element
		let element = document.elementFromPoint(mousePosition.x, mousePosition.y)
		if(element == undefined || element.src == undefined){
			if(imgCount == 1){
				element = document.querySelector('#img0')
			}else if(e.code == 'Space'){
				for(i = 0; i < imgCount; i++){
					let img = document.querySelector('#img' + i)
					pauseImg(img)
				}
			}else{
				return
			}
		}

		if(e.key == '5' || e.key == '4' || e.key == '3' || e.key == '2' || e.key == '1'){
			rateImg(element, e.key)
		}else if(e.key == 'u'){
			changeImg(element, 'click', true)
		}else if(e.key == 'z'){
			zoom(element)
		}else if(e.key == 'c'){
			changeImg(element, 'click', false)
		}else if(e.key == 'p'){
			pauseImg(element)
		}else if(e.key == 'q'){
			removeFromPool(element)
		}else if(e.key == 'e'){
			addToPool(element)
		}else if(e.key == 'o'){
			ipcRenderer.send('open-folder', element.src)
		}else if(e.key == 'm'){
			move(element)
		}
	}, true)

	// Left click event listener - Add it to all images
	let imageElements = document.querySelectorAll('img')
	for(i = 0; i < imageElements.length; i++){
		imageElements[i].addEventListener('click', (e) => {
			// Execute different action based on setting
			if(clickAction == 'pauseResume'){
				pauseImg(e.target)
			} else
			if(clickAction == 'change') {
				changeImg(e.target, 'click', false)
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
			changeImg(img, 'click', false)
		}
	})
	// Reload button - Reloads window
	document.querySelector('#reloadButton').addEventListener('click', () => {
		reload()
	})
	// Settings button - Opens config window
	document.querySelector('#configButton').addEventListener('click', () => {
		// Switch visibility of content
		if(!configDiv.classList.contains('hidden')){
			// Switch to gallery, reloading if changes were made
			if(!configChanged){
				gallery.classList.add('flex')
				gallery.classList.remove('hidden')
				configDiv.classList.remove('flex')
				configDiv.classList.add('hidden')
			}else{
				reload()
			}
		}else{
			// Switch to config
			gallery.classList.add('hidden')
			gallery.classList.remove('flex')
			configDiv.classList.remove('hidden')
			configDiv.classList.add('flex')
		}
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
		reload()
	})
	// Copy all button - Copies all images in the active pool to the target folder (selected on click)
	document.querySelector('#copyButton').addEventListener('click', () => {
		let pickedPath = ipcRenderer.sendSync('open-dialog')

		// If the user cancels the action then the path will be undefined. In that case don't do anything
		if(pickedPath !== undefined) {			
			let imgs = getImagePool()
			for(i = 0; i < imgs.length; i++){
				let img = decodeImg(imgs[i])
				ipcRenderer.send('copy-file', img, pickedPath)
			}
		}
	})
	// Export prompts button - Export all positive prompts from the active image pool to a text file
	document.querySelector('#copyPrompt').addEventListener('click', () => {
		// Get random prompt from active pool
		clipboard.writeText(getMetadata(getRandImg(), 'positive'))
	})
	// Image pool selector - Controls which array new images are drawn from when being changed
	document.querySelector('#imagePoolSelector').addEventListener('change', (e) => {
		// Update variable and save to config file
		if(imagePool != e.target.value){
			imagePool = e.target.value
			config.imagePool = e.target.value
			reload()
		}
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
	// Add pool button - Adds the pool currently in the custom pool input field
	document.querySelector('#addPoolButton').addEventListener('click', () => {
		let element = document.querySelector('#customPoolInput')
		if(element.value != '' && element.value != 'None'){
			// Add the custom pool (make file)
			let newPoolPath = path.join(customPoolPath, element.value + '.json')
			let newPool = {
				include: [],
				exclude: []
			}
			if(!fs.existsSync(newPoolPath)) {
				fs.writeFileSync(newPoolPath, JSON.stringify(newPool, null, 4))
				let poolHtml = '<option value="' + element.value + '">' + element.value + '</option>'
				editingPoolSelector.insertAdjacentHTML('beforeend', poolHtml)
			}
		}
	})
	// Editing pool selector - Changes the currently active editing pool (will be modified by the relevant functions)
	document.querySelector('#editingPoolSelector').addEventListener('change', (e) => {
		// Update variable
		if(editingPool != e.target.value){
			editingPool = e.target.value
			config.editingPool = e.target.value
			reload()
		}
	})
	// Add all to pool button - Adds all active images to the active editing pool
	document.querySelector('#addToPoolButton').addEventListener('click', (e) => {
		addAllToPool()
	})
	// Remove all from pool button - Removes all active images from the active editing pool
	document.querySelector('#removeFromPoolButton').addEventListener('click', (e) => {
		removeAllFromPool()
	})
	// Input fields - Detect focus and unfocus so keyup events can be ignored while typing in them
	let customPoolInput = document.querySelector('#customPoolInput')
	customPoolInput.addEventListener('focus', () => {
		inputFieldFocus = true
	})
	customPoolInput.addEventListener('blur', () => {
		inputFieldFocus = false
	})
	fileNameFilter.addEventListener('focus', () => {
		inputFieldFocus = true
	})
	fileNameFilter.addEventListener('blur', () => {
		inputFieldFocus = false
	})
	metadataFilter.addEventListener('focus', () => {
		inputFieldFocus = true
	})
	metadataFilter.addEventListener('blur', () => {
		inputFieldFocus = false
	})
	metadataFilterNeg.addEventListener('focus', () => {
		inputFieldFocus = true
	})
	metadataFilterNeg.addEventListener('blur', () => {
		inputFieldFocus = false
	})
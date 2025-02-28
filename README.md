![image](https://github.com/Index154/slideshow-gallery/assets/105119758/3db4c39b-99d1-457a-af8d-8033ad260681)

# Introduction
An image slideshow gallery with several images independently changing. Also offers the ability to rate images for sorting purposes.

This app has been tested solely on Windows! I frankly have no clue if it would work on other systems.


## Basic functionality
I made this app for the main purpose of rating and sorting images as well as cycling through large amounts of images to get some inspiration.


## Installation
1. Go to the releases page and download the setup for the latest version
2. Run the setup with your normal user. Do not run it as admin - The installation is user-based
3. Done. Launch the app through the desktop or start menu shortcuts


# Detailed functionality

## Files
The installation is user-based. The app will be installed in your local AppData folder (for example `C:\Users\%username%\AppData\Local\slideshow_gallery` in Windows). Start menu and desktop shortcuts will be created during installation. Delete them if you don't need them.

The app's settings and your user data are stored in your roaming AppData directory within the subfolder slideshow-gallery (for example `C:\Users\%username%\Appdata\Roaming\slideshow-gallery` in Windows). The important files and folders here are:
- config.json = Contains settings
- ratings.json = Contains image ratings
- custom-pools (folder) = Contains custom image pool files

## GUI
Here is an example of what the application window looks like:
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/08fa22dd-2ced-4679-b4c9-3d46c37b29c8)
There is a small bar at the top with several buttons and settings. I will mention the ones requiring an explanation in the features section below.


## Features
The basic functionality of the app is to display a set number of images simultaneously. Displayed images will be replaced by other randomly selected images on a configurable cycle. It's like a classic slideshow but with multiple slides at once and more configurability.

A note on hotkeys: When you press a hotkey the associated action will be applied to the image your cursor is hovering over. If there is only one image in the grid however, it will always apply to it no matter where your cursor is. Most hotkey actions can also be done by right clicking on an image and selecting the corresponding context menu option. The context menu also lists a lot of the available hotkeys in parentheses next to the available options.

### Defining which images to load / show
The app loads images from the paths added by you. All basic file types are supported: PNG, JPEG, JPG, WEBP and GIF (maybe even more). You can click on the button "Define paths" to open the path config menu:

![image](https://github.com/Index154/slideshow-gallery/assets/105119758/16b8a70c-06e6-4b60-be61-a33af4eeca36)

Here you can add folders from your file system to the available directory tree. Once added, they can be toggled on and off with checkboxes at any time by opening this menu again. You can remove previously added folders (along with all their subfolders) from the menu as well.

Besides simply choosing the folders to load images from you can also further filter the images by selecting a specific "image pool" in the main window. Your options are:
- Random: All images
- Unrated: Images which have not been rated yet
- High rating: Images rated 4 or 5
- Highest rating: Images rated 5
- Low rating: Images rated 1 or 2
- New high rating: The 300 newest images with a rating of 4 or 5
- Custom pool: Any custom pool you've made can also be selected here

#### Custom pools
Custom pools offer a way for you to define your own static sets of images without having to change your folder structure. Here's how they work:
- You can create a custom pool in the main window by typing a name into the "New custom pool" text field and clicking on "Add" next to it
- You can edit a custom pool after selecting it in the dropdown next to "Editing custom pool"
  - You can then add images to it with E or with the button "Add all to pool" (applies to all visible images)
  - You can also exclude images from the editing pool with Q or with the button "Remove all from pool" (applies to all visible images)
- Any images that are added to or excluded from the currently selected editing pool **will NOT** be displayed in the grid. This is so you can go through all your images, adding and excluding them as you go without  ever getting any repeats. Make sure to select "None" in the editing pool dropdown if you wish to see all available images again.
- After your custom pool has been modified you can select it in the "Image pool" dropdown

### Rating images
Images can be given ratings from 1 to 5. Use the context menu (right click) or the number keys to assign ratings. Tip: You can see the currently assigned rating of an image by right clicking on it. The corresponding option in the context menu will have a checkmark next to it.

There is a checkbox option in the main window called "Change after rating?". When enabled, images will *always* be changed / rerolled immediately after you rate them. This is useful in conjunction with the "Unrated" image pool for when you're trying to rate all of your images one by one.

### Moving images
There is a special folder path called "Move target folder" that you can change at will in the "Define paths" menu. You can move image files to this configured location through several ways:
- Right click on an image and select "Move file" to move the selected image
- Alternatively you can hover your cursor over an image and press M on your keyboard to move it as well
- Press the "Move low rated" button in the main window to move all images with a rating of less than 3

You can also copy all images that are both in the currently active folders and in the currently selected pool to a new location with the "Copy all available" button.

### Controlling when images are changed
There are two settings in the main window that control the slideshow timers of the grid images:
- Delay = Controls how many seconds have to pass before an image fades out and is replaced by a new image
- Offset = Controls how many seconds are between the individual grid images changing. If set to 0, all images always change at the same time

Images can be "paused" to keep them from being changed by their timers. The timers will however keep running in the background. This means that the image cycles won't get out of sync with the others even if they are paused independently.
- Press P to pause or unpause an image
- Use the buttons "Pause all" and "Resume all" in the main window for changing the states of all visible images. The hotkey Space can also be used to pause and unpause all images
- The border around an image is red while paused and white while unpaused
- Paused images can still be rerolled through all other means besides the timers

### Defining the left click action
You can change what happens when you left click an image in the main window's menu bar with the "On left click" dropdown. These are the options:
- Pause/resume: Pauses or resumes an image
- Change image: Manually changes / rerolls an image when clicked. Works on "paused" images too
- Zoom: Opens the image in a new window at a larger size. Clicking anywhere in this window will close it again. This action is also available in the context menu and with the hotkey Z
- No effect: No effect

### Stable Diffusion metadata support
When you right click on an image you have an option called "Copy generative metadata". This section can be used to copy the metadata of images generated with Stable Diffusion WebUI to your clipboard. Available options are:
- Positive prompt
- Negative prompt
- Seed
- Checkpoint

Additionally you can use the button "Copy random prompt" to get the positive prompt of a random image available in your currently selected pool.

### Context menu window
Here's a screenshot of all the context menu options for completion's sake:

![image](https://github.com/Index154/slideshow-gallery/assets/105119758/5946dbe2-b022-400a-b680-ef2a37968d43)

Options not yet covered in the sections above are:
- Revert = Displays the previous image again
- Open in folder = Opens the location of the image in your native file explorer and selects the file
- Open = Opens the image in the default application of your operating system

## Other keyboard shortcuts / hotkeys
- R: Reloads the window (can be used to restart timers)
- Ctrl: Opens the devtools (inspect element and such)



# Planned changes and additions

## Important
- Deletion and renaming of custom pools through GUI
- Popup when previously rated images or custom pool images are missing. Right now it automatically changes the saved paths if an image of the same name is found in a different folder source. This should be avoided
- Determine image identity not by name but by file hash or something like that?
- Button for cleaning up the ratings file, removing ratings for files that no longer exist
- Either the config html being opened in the main window OR only specific configs being synced from the config window to the main window to prevent overwriting other values + preventing interactions with the main window when another window is open
- A setting for giving each active folder an equal chance of being chosen as the source for the next image
- Keep timers running when changing settings not related to the timer
- Confirmation prompts for certain actions
- Fix bug of folder sources not being added correctly sometimes

## Minor
- Hotkey configuration
- Reduced chances of duplicate images appearing in the grid (ideally 0)
- Full freedom in image count selection + automatic scaling to the window size (annoying and hard to implement)
- One combined notification for all missing folders
- Maybe put some "config" values into other files
- Better looking UI
- A toggleable way to see an image's rating without right-clicking it
- In-app help pages?
- A button for hiding / displaying the main menu's buttons and stuff
- Source folder save states
- Config profiles + option for turning off autosaves?
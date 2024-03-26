![image](https://github.com/Index154/slideshow-gallery/assets/105119758/3db4c39b-99d1-457a-af8d-8033ad260681)

# Introduction
An image slideshow gallery with the ability to rate images for sorting purposes.
Warning: This documentation is slightly outdated.

## Basic functionality
I made this app for the main purpose of rating my images and then sorting out the bad ones. It's also useful for cycling through large amounts of images to get some random inspiration.

## Planned changes and additions
### Important
- Deletion and renaming of custom pools through GUI
- Popup when previously rated images or custom pool images are missing. Right now it automatically changes the saved paths if an image of the same name is found in a different folder source. This should be avoided
- Determine image identity not by name but by file hash or something like that?
- Button for cleaning up the ratings file, removing ratings for files that no longer exist
- Source folder save states
- Config profiles + option for turning off autosaves?
- Either the config html being opened in the main window OR only specific configs being synced from the config window to the main window to prevent overwriting other values + preventing interactions with the main window when another window is open
- A setting for giving each active folder an equal chance of being chosen as the source for the next image

### Minor
- Configurable hotkeys
- Reduced chances of duplicate images in the grid (ideally 0)
- Config for whether the grid images should be the same after reloading (rememberImages flag)
- Full freedom in image count selection + automatic scaling to the window size (annoying and hard to implement)
- One combined notification for all missing folders
- Maybe put some "config" values into other files
- Better looking UI
- A toggleable way to see an image's rating without right-clicking it
- Re-write of this documentation
- In-app help pages?

# Detailed functionality
## Files
The installation is user-based. The app will be installed in your local appdata folder (for example `C:\Users\%username%\AppData\Local\slideshow_gallery` in Windows). Start menu and desktop shortcuts will be created during installation. Delete them if you don't need them.
The app's settings and such are stored in your appdata directory, within the subfolder slideshow-gallery (for example `C:\Users\%username%\Appdata\Roaming\slideshow-gallery` in Windows).
### config.json
This file contains the app's configs. Whenever you change a setting in the GUI it will be saved to this file (no need for manual saving). When the app starts it will look for the file and load the saved configurations.
### ratings.json
An image can be rated using the right click context menu or by pressing the corresponding number key (1, 2, 3, 4 or 5) while hovering the cursor over it. Your image ratings are stored in this file. Previously rated images that can no longer be found by the app will be re-assigned their current paths if the app finds them in your currently loaded folders.
### <custom-pool-name>.json
Custom image pools created by you are saved in the subfolder custom-pools. These contain simple arrays of image paths.

## GUI
Here is an example of what the application window looks like:
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/08fa22dd-2ced-4679-b4c9-3d46c37b29c8)
There is a small bar at the top with several buttons and settings. I will now explain them in order.
### Define paths
Press this button to configure the source folder paths to be scanned for images as well as the "move" target path. See more details below.
### Image count
Allows you to select the amount of images to display. Currently you can only choose between 8 and 1. This setting only goes into effect after reloading the app (restarting it or pressing R).
### Delay
Controls how many seconds have to pass before an image will be replaced with a new image.
### Offset
Controls how many seconds are between the individual images changing. If set to 0, all images change at the same time. Changing this value will only have an effect after reloading the app (restarting it or pressing R).
### Pause all
This button "pauses" all images, meaning that they will no longer be changed every X seconds. Paused images have red borders.
While an image is "paused", its timer keeps running in the background. It simply doesn't affect the image while in this state. This has the effect of keeping images in sync even if you pause and unpause them independently of one another.
### Resume all
Unpauses all images that are paused.
### Image pool
Controls which images from the configured source folder(s) (see **config.json**) can be selected when existing images are replaced. There are a few options here:
- Random: All images
- Unrated: Images which have not been rated yet (default for new images)
- High rating: Images rated 4 or 5
- Highest rating: Images rated 5
- Low rating: Images rated 1 or 2
- Saved grids: See further below
- Custom pool: Any custom pool the app detects can also be selected in this menu
### On left click
Defines the action that happens when you left click an image. These are the options:
- Pause/resume: Pauses or resumes an image
- Change image: Manually changes / rerolls an image when clicked. Works on "paused" images as well
- Zoom: Opens the image in a new window at a larger size. Clicking anywhere in this window will close it again
- No effect: No effect
### Save grid
When pressed, this button saves all currently active / visible images. As long as you have at least 2 saved grids and the image pool option is set to "Saved grids", the images will cycle through these specific configurations. Grids are only saved for the current session so they are lost when the app is reloaded.
### Change after rating?
If checked, images will change after you rate them. Even if an image is "paused" it will still work. This is useful for iterating through all your unrated images until you're done with them.
For the sake of knowing how much progress you've made there is also the item "Unrated count" which shows you how many images you have yet to rate.
### Move all low rated
Moves all images rated 1 or 2 to the configured move target folder, see **Select move target folder**.

## Path config menu
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/16b8a70c-06e6-4b60-be61-a33af4eeca36)

Here you can configure the image source paths as well as the "move" action target path.
### Add source
Pressing this button will open a dialog for selecting one folder to add as a source.
### Add source with subfolders
Same as above. However, this one will also add all subfolders automatically.
### Inherit state from parent folder?
This checkbox currently does nothing. It's a work in progress.
### Select move target folder
Opens a dialog for selecting the "move" target folder. The currently set folder is shown next to the button.
### Enable all
Enables all configured folder paths.
### Disable all
Disables all configured folder paths.
### List of paths
You can see a list of all your added paths in this window. They will be shown as a hierarchical tree.
A folder and all its subfolders will be removed if you press the Delete button next to it.

## Context menu (right click)
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/5946dbe2-b022-400a-b680-ef2a37968d43)

You can right click an image and select an action to perform on it:
- Paused: Can be used to pause or unpause an image
- Zoom: Can be used to open an image in a new window at a larger size. Clicking anywhere in this window will close it again
- Change: Manually changes / rerolls an image. Works on "paused" images as well
- Open in folder: Opens the folder the image is in and selects the image
- Open: Opens the image with your OS' default application
- Rate 5 to 1: Can be used to rate the image, see **ratings.json**
- Move file: Moves the file to the configured target folder, see **Select move target folder**

## Keyboard shortcuts
- R: Reloads the window
- Ctrl: Opens the devtools (inspect element and such)
- Number keys 1 to 5: Apply the corresponding rating to the image your mouse cursor is currently on
- For more hotkeys, look at the right click context menu
# Introduction
An image slideshow gallery with the ability to rate images for sorting purposes

## Basic functionality
I made this app for the main purpose of cycling through large amounts of AI artwork so I could get some inspiration, rate the images and then get rid of the ones I've rated lowly.

## Flaws and missing features
Since I made this app mostly for my own use it currently isn't as flexible or secure as it should be. This is why there are several issues:
- Images are assumed to have a 1:1 ratio
- The renderer process has no contextIsolation and it has nodeIntegration as well as nodeIntegrationInWorker. These are security risks and I've used them for my own comfort. I do plan to undo them however
- The UI looks bad. I probably won't change it unless I'm super bored either
- At the moment you can't even define the folder paths for images in the UI. They have to be added directly to the config file
- Folders are not searched for images recursively
- The app always starts maximized and it does not remember its last position / size after you close it
- Other "minor" limitations, see below

# Detailed functionality
## Files
The app's files are stored in your appdata directory, within the subfolder slideshow-gallery (for example `C:\users\%username%\appdata\roaming\slideshow-gallery` in Windows).
# Config.json
This file contains the app's configs. Whenever you change a setting in the GUI it will be saved to this file. When the app starts it will look for the file and load the saved configurations.
Here is an example config:
```json
{
    "imagePool": "random",
    "delay": "8",
    "offset": "0",
    "changeWhenRated": true,
    "clickAction": "zoom",
    "imageCount": "eight",
    "sourcePaths": [
        "D:/Images/New"
    ],
    "movePath": "D:/Images/Bad images"
}
```
There are two settings here which are currently not available in the GUI:
- sourcePaths: An array of strings representing folder paths where the app will look for image files to use
- movePath: A single string representing a folder path where the app will move files when you press the "Move all low rated" button or when you right click an image and select "Move file"
# Ratings.json
An image can be rated using the right click context menu or by pressing the corresponding number key (1, 2, 3, 4 or 5) while hovering the cursor over it. Your image ratings are stored in this file. Currently one limitation of this application is that image ratings are saved with their folder path to avoid duplicate naming issues. However this means that if you move an image it will go back to being unrated. The rating will still be in the list but the file will no longer be associated with it. I plan on changing this behavior if possible.

## GUI
Here is an example of what the application window looks like:
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/6151281c-0270-4387-b355-f8cd36e2ae71)
### Image count
Allows you to select the amount of images to display. Currently you can only choose between 8 and 1. This setting only goes into effect after reloading the page (restarting the app or pressing R).
### Delay
Controls how many seconds have to pass before an image will be replaced with a new image.
### Offset
Controls how many seconds are between the individual images changing. If set to 0, all images change at the same time.
### Pause all
This button "pauses" all images, meaning that they will no longer be changed every X seconds. Paused images have red borders.
While an image is "paused", its timer keeps running in the background. It simply doesn't affect the image while in this state. This has the effect of keeping images in sync even if you pause and unpause them independently of one another.
### Resume all
Unpauses all images that are paused
### Image pool
Controls which images from the configured source folder(s) (see **Config.json**) can be selected when existing images are replaced. There are a few options here:
- Random: All images
- Unrated: Images which have not been rated yet (default for new images)
- High rating: Images rated 4 or 5
- Highest rating: Images rated 5
- Low rating: Images rated 1 or 2
- Saved grids: See further below
### On left click
Defines the action that happens when you left click an image. These are the options:
- Pause/resume: Pauses or resumes an image
- Change image: Manually changes / rerolls an image when clicked. Works on "paused" images as well
- Zoom: Opens the image in a new window at a larger size. Clicking anywhere in this window will close it again
- No effect: No effect
### Save grid
When pressed, this button saves all currently active / visible images. As long as you have at least 2 saved grids and the image pool option is set to "Saved grids", the images will cycle through these specific configurations. Grids are only saved for the current session so they are lost when the app is reloaded
### Change after rating?
If checked, images will change after you rate them. Even if an image is "paused" it will still work. This is useful for iterating through all your unrated images until you're done with them.
For the sake of knowing how much progress you've made there is also the item "Unrated count" which shows you how many images you have yet to rate
### Move all low rated
Moves all images rated 1 or 2 to the configured target folder

## Context menu (right click)
![image](https://github.com/Index154/slideshow-gallery/assets/105119758/283f41cb-0e53-46fd-8d79-ad0210c40c4e)
You can right click an image and select an action to perform on it:
- Paused: Can be used to pause or unpause an image
- Zoom: Can be used to open an image in a new window at a larger size. Clicking anywhere in this window will close it again
- Open in folder: Opens the folder the image is in and selects the image
- Open: Opens the image with your OS' default application
- Rate 5 to 1: Can be used to rate the image. See **Ratings.json**
- Move file: Moves the file to the configured target folder. See **Config.json**

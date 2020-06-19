# WebP WASM

## Quick start

- Sign into the backoffice as an admin user.
- Install the plugin and activate it.

### Convert a single media library image

- Navigate to **Media > Library**
- Select the **list view** icon
- Locate a jpeg or png image for editing and click the media's title link or the "edit" link under the entry.
- Scroll down to the bottom of the edit page to the (new) _WebP Conversion_ section
- Click **Create** to create a webp version of this media library image on the server
- Click **Delete** to delete a webp version if it exists for this media library image

### Convert all media library images

- Navigate to **Plugins** 
- Set the quality and overwrite flag as desired
- Click **Create** to create webp files for all media library images
- Click **Delete** to delete existing webp files for all media library images

## How it works

The client (browser) creates a webp version of the image when the **Create** button is clicked. This is then sent to the server where it is saved in the same folder as the original image, but with a `.webp` extension. 

For example, if the original image is

`/wp-content/uploads/2020/05/test.jpg`

an additional 

`/wp-content/uploads/2020/05/test.webp`

will be created there.

A filter is applied in the WordPress hook `the_content` to swap an image for its webp equivalent if available.

## More about the conversion

Conversion is done on the client, so a modern browser with wasm support is needed. This is because conversion to webp with php requires shell_exec to make calls to Google's cwebp or other php extensions are needed. These features often pose security risks that outweigh the benefits. This plugin gets around that by delegating the actual image conversion to the client. It's based on [this encoder](https://github.com/wrburnham/webp-wasm) to save webp versions of uploaded jpeg and png images.

## License

This plugin is licensed as GPLv3.

### License notes

The simple html dom parser library is used to render webp images directly in WordPress content where possible. The client-side conversion to WebP leverages Google's libwebp.

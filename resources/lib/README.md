# Bundled libraries

Third-party code bundled with the extension, each in its own folder with its licence file.

| Library | Version | Licence | Used for |
| --- | --- | --- | --- |
| Cropper.js | 1.7.0, from the npm package `cropperjs` (`dist/cropper.js`, `dist/cropper.css`) | MIT, see `cropperjs/LICENSE` | Crop, rotate, flip, straighten |

Cropper.js runs with `checkOrientation: false`; see the spec. To update it, replace the two files and the licence with those from a newer 1.x release and run the tests.

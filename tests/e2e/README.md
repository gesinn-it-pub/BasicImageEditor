# Browser walkthrough

`walkthrough.mjs` drives the editor in headless Chromium against a running
wiki and checks the result of each step. It covers:

- every tool: rotate, flip, straighten, brightness, contrast, crop ratios, the
  edit summary and Reset
- flip after rotate: the preview and the saved output in four orders
- brightness and contrast keeping a manual crop
- EXIF orientation: a sideways-stored JPG shown and saved upright
- saving as a new version: notice, file history, tag, unchanged description
- saving as a new file: name checks, the duplicate warning, the "Derived from"
  description and tag

Each image is checked by sampling corner colours and sizes of the exact file a
save would upload, and of a screenshot of the preview.

**It uploads to the wiki.** Use a development wiki only.

## Wiki setup

- The extension enabled, and an account with `upload` and `reupload` rights.
- Three files:

  | File | Content |
  | --- | --- |
  | `File:BIE-test.jpg` | 1600×1200 JPG with some description text. Each run adds versions; the run reverts it to the original at the start and end. |
  | `File:BIE-test-quadrants.jpg` | 1600×1200 JPG with four differently coloured quadrants. |
  | `File:BIE-test-orientation.jpg` | Portrait JPG stored sideways with EXIF orientation 6. |

  The quadrant image can be made with ImageMagick:

  ```sh
  convert -size 800x600 xc:'#d62728' -size 800x600 xc:'#2ca02c' +append \
    \( -size 800x600 xc:'#1f77b4' -size 800x600 xc:'#ffbf00' +append \) -append \
    -quality 92 BIE-test-quadrants.jpg
  ```

Each run creates one `File:BIE-test-derived-<timestamp>.jpg`.

## Running

With Docker; no local Node.js or browser needed:

```sh
BIE_WIKI_URL=https://wiki.example BIE_USER=TestUser BIE_PASSWORD=secret \
  tests/e2e/run.sh
```

Add `BIE_INSECURE_TLS=1` for a self-signed certificate. Results print as
PASS/FAIL lines; screenshots and `results.json` go to `tests/e2e/output/`.
The exit code is 0 when every check passes.

Don't start other Docker containers while it runs: a network change on the
host can interrupt the save requests.

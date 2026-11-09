# Confidence in document review

The OCR engine now retains measured word scores for recovered birth dates, street and given-name crops. A recovered value requires at least two agreeing readings; valid contradictory candidates remain unresolved. The score uses the lower of the two best agreeing word measurements, without adding a bonus for agreement. A matching full-page measurement remains available.

State names use the existing printed abbreviation catalogue when matching OCR words (for example GTO. to Guanajuato). Unknown abbreviations do not receive a score.

Focused CURP processing evaluates the four existing scale/segmentation combinations instead of returning the first valid pair. It retains the best measured agreeing pair; disagreement between valid pairs sets its confidence to zero. It never uses declared identity values as recognition hints.

At the project owner's request, critical fields now require at least 75 in both independent document readings, matching declarations and all existing identity, validity and duplicate checks. Recognized text alone is insufficient. Missing verified confidence is displayed explicitly instead of as 0%.

These are local source changes. Existing saved analyses do not change automatically. After running this version, an administrator may use Por revisar > Reanalizar observaciones to explicitly retry eligible pending applications. Approved providers are unaffected. No real identification image or raw OCR text is included in these changes.

Verification: unit/API tests, browser capture and OCR fixtures, TypeScript and production build. Real documents may still require manual review; no accuracy percentage is promised.

## Printed rows and busy backgrounds

When the page pass misses CURP or birth headings, a bounded lower-card scan suppresses the light background and verifies the printed headings before defining any field crop. It cannot populate a field from coordinates alone. Existing page anchors remain preferred. Date and CURP crops follow detected word boxes where available to exclude the neighboring section/registration columns and decorative lines. Thresholded CURP retries retain measured scores and conflicting variants remain in review. Date variants that disagree remain unresolved, even when one looks plausible. The minimum remains 75 in both critical readings.

The lower-card heading recovery includes the validity column and still runs when CURP and birth headings are already present but validity is missing. Given-name crops follow the actual third printed name row and preserve adjacent compound-name words, while excluding distant background marks. Rotation and crop in the editor are applied before OCR; a remaining extraction failure should not be attributed to the orientation of the originally attached photo alone.

## Street noise and character rereads

Address parsing tolerates the observed DOMICILO spelling of its heading. It can skip up to two non-numeric, unlabeled noise rows before an explicitly prefixed street, without treating colony/locality rows as a street. A local address heading scan verifies uncertain headings in two actual crops and rejects distorted heading boxes; street crops follow the verified text row.

CURP handling can re-read the observed final glyph when the complete 18-character line ends with a letter in the mandatory numeric position. It requires matching symbol coordinates, two agreeing image-based digit reads and a structurally valid reconstructed value. It never uses the declared CURP as an OCR hint or assigns a digit from a character substitution table. Conflicting readings and missing independent evidence still require manual review. Existing approved providers and saved analyses are not changed automatically.

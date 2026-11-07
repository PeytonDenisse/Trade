# Confidence in document review

The OCR engine now retains measured word scores for recovered birth dates, street and given-name crops. A recovered value requires at least two agreeing readings; valid contradictory candidates remain unresolved. The score uses the lower of the two best agreeing word measurements, without adding a bonus for agreement. A matching full-page measurement remains available.

State names use the existing printed abbreviation catalogue when matching OCR words (for example GTO. to Guanajuato). Unknown abbreviations do not receive a score.

Focused CURP processing evaluates the four existing scale/segmentation combinations instead of returning the first valid pair. It retains the best measured agreeing pair; disagreement between valid pairs sets its confidence to zero. It never uses declared identity values as recognition hints.

At the project owner's request, critical fields now require at least 75 in both independent document readings, matching declarations and all existing identity, validity and duplicate checks. Recognized text alone is insufficient. Missing verified confidence is displayed explicitly instead of as 0%.

These are local source changes. Existing saved analyses do not change automatically. After running this version, an administrator may use Por revisar > Reanalizar observaciones to explicitly retry eligible pending applications. Approved providers are unaffected. No real identification image or raw OCR text is included in these changes.

Verification: unit/API tests, browser capture and OCR fixtures, TypeScript and production build. Real documents may still require manual review; no accuracy percentage is promised.

## Printed rows and busy backgrounds

When the page pass misses CURP or birth headings, a bounded lower-card scan suppresses the light background and verifies the printed headings before defining any field crop. It cannot populate a field from coordinates alone. Existing page anchors remain preferred. Date and CURP crops follow detected word boxes where available to exclude the neighboring section/registration columns and decorative lines. Thresholded CURP retries retain measured scores and conflicting variants remain in review. Date variants that disagree remain unresolved, even when one looks plausible. The minimum remains 75 in both critical readings.

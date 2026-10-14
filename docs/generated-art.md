# Generated Travel Artwork

## Generation Record

- Created on 2026-09-12 using Codex's built-in image-generation tool, not an API/CLI fallback.
- Six new images; no reference images or real-person likenesses were supplied.
- The PNG originals are stored under `assets/img/editorial/`. They are source assets, not external image URLs.
- This record documents generation and intended usage, not copyright exclusivity or clearance of every possible third-party right. Do not apply the separate Wikimedia photo licenses to generated artwork.
- These are imagined editorial scenes, not exact locations, hotel photographs, maps, firsthand travel evidence or endorsements. Visible EN/KO captions and alternative text preserve that distinction.

| Source asset | Dimensions | Placement |
| --- | --- | --- |
| `short-trip-hero.png` | 1774 x 887 | Both homepage heroes; default social preview |
| `fukuoka-weekend.png` | 1536 x 1024 | Fukuoka weekend card, guide and social preview |
| `osaka-food.png` | 1536 x 1024 | Osaka four-day card, guide and social preview |
| `tokyo-neighborhoods.png` | 1536 x 1024 | Tokyo four-day card, guide and social preview |
| `fukuoka-parents.png` | 1536 x 1024 | Fukuoka with parents card, guide and social preview |
| `hotel-neighborhood.png` | 1536 x 1024 | Hakata/Tenjin area-choice card, guide and social preview |

Hugo generates 900/1600px WebP hero renditions, 480/960px WebP cover renditions and 1200px JPEG social previews. UI variants use `srcset`, explicit dimensions and lazy loading for covers. Hero loading is prioritized. Original PNG files are not fetched by the homepage. Responsive framing can crop an illustration; it does not make the scene geographically accurate.

The previous owner-confirmed planning-desk illustration remains on the decision board. Existing licensed destination photographs remain in the guides' location-reference sections with their credits. See [Image Provenance](image-provenance.md).

## Exact Prompt Set

The five cover requests used the common cover prompt followed by one space and the corresponding subject prompt below. The hero used its own complete prompt. Each request generated a new image without reference inputs.

### Hero

```text
Use case: illustration-story. Create a premium editorial travel illustration for the full-bleed hero of TripCompass AI, a bilingual short-trip planning site for travelers from Korea. Wide landscape 2:1 composition. An inviting imagined Japanese waterfront neighborhood seen from a pedestrian promenade: clear turquoise water, a curving walking path, leafy trees, small cafes and pale modern city buildings, a few tiny travelers taking an unhurried walk. The feeling is a real small holiday rather than a planning desk. Contemporary hand-painted gouache / fine-grain travel magazine art, clean architectural shapes, sophisticated and joyful, rich natural daylight, balanced teal, sky blue, leaf green, small vermilion accents, white. Main recognizable travel scene in the center and right; keep left third simple with dark teal leafy shade so white website title can overlay legibly, without a blank rectangular panel. Keep important scene elements center-safe for mobile cropping. This is clearly an artistic concept, not a photograph and not a literal geographic map. No text, lettering, logo, watermark, frame, stock-photo look, gradients, bokeh or floating decorative blobs. Full bleed, high quality.
```

### Common Cover Prompt

```text
Use case: illustration-story. Asset: TripCompass AI editorial travel guide cover, landscape 3:2 composition, no text. Premium contemporary hand-painted gouache travel magazine art, fine grain, clean shapes, sophisticated and inviting. Bright readable scene, balanced teal, sky blue, leafy green and small coral accents, no heavy brown filter. This is a clearly illustrated imaginative travel scene, not a photograph or factual map. Keep key subjects inside central 70% for responsive cropping. No lettering, logos, watermark, frame, floating ornaments or UI.
```

### Fukuoka Weekend

```text
Subject: a Fukuoka-inspired unhurried weekend. A lakeside path with a wooden bench under trees, broad reflective blue water, small low city buildings on the opposite side, a charming small street-food counter with a simple unbranded bowl of ramen visible at the near-right edge. A couple of tiny adult travelers walking. Artful coherent perspective, generous open space and crisp pleasant light. Do not reproduce an exact landmark or promise a specific business exists.
```

### Osaka Food And Neighborhoods

```text
Subject: an Osaka-inspired food-and-neighborhood short trip. Lively canal-side pedestrian street, small bridge, unbranded red lanterns and modest food stalls, two friends choosing a snack, colorful mid-rise shopfronts reflected in the canal. Late afternoon moving toward early evening but still bright, lilac sky, teal water, warm lit storefronts, a feeling of cheerful exploration. No iconic commercial signs, no famous mascots, no legible advertisements. A coherent imagined city scene rather than an exact rendering of a named place.
```

### Tokyo Cafes And Shopping

```text
Subject: a Tokyo-inspired cafe-and-shopping neighborhood day. A stylish tree-lined side street at human scale, a small cafe terrace with ceramic coffee cups, bicycles parked neatly, independent unbranded boutiques with glass windows, a few adults browsing. Light concrete, cobalt-blue cafe awning, coral flowers, dappled green tree shade and white afternoon light. View along the street with appealing small details. No giant crossing, no crowded tourist spectacle, no exact branded venue. An imagined editorial scene, not an actual cafe recommendation.
```

### Fukuoka With Parents

```text
Subject: a relaxed Fukuoka-inspired trip with parents. Two older adults and their adult daughter sitting comfortably together on a shaded lakeside park bench, quietly chatting, reusable water bottles in a tote, small day bags, an easy open walking path nearby, blue lake and soft green trees, distant modest city skyline. Family are anonymous illustrated people with natural expressions and anatomy, not a portrait of real people. Bright calm daytime, welcoming and unhurried, emphasize rest and companionship rather than age stereotypes. Clearly drawn editorial art; not evidence of accessible facilities or a real booked trip.
```

### Hotel Neighborhood Choice

```text
Subject: choosing a hotel neighborhood for a short Japan trip, without showing a real hotel. An adult traveler at an airy cafe window considering an unfolded simple abstract street map (lines only, absolutely no labels) beside a small rolling suitcase and cup of coffee. Beyond the glass, a walkable imagined city block with a station entrance shape on one side and shops on the other, leafy street trees. Foreground luggage in muted teal, pale interior with coral seat and blue sky, bright natural light. Make it clearly a conceptual illustration about location choices, not a luxury hotel advert, not a room photograph, not an accurate map or actual transport access promise.
```

## Nara Cover: 2026-09-22

- Created with Codex's built-in image-generation tool, followed by one built-in corrective edit. No API key or CLI fallback was used.
- Final source: `assets/img/editorial/nara-park-day.png`, 1536 x 1024 pixels. Both Nara guide languages use this cover and its 1200px JPEG sharing rendition.
- The first version had an overlapping foreground deer cluster. The selected edited version separates that into one deer; three deer remain in the scene. Only the selected asset was copied into the repository.
- This is an imagined park with distant architecture, not a Todaiji photograph, a real walking map, current animal behavior or a safety/accessibility claim. No third-party reference image was supplied.

### Generation Prompt

```text
Use case: illustration-story. Asset: TripCompass AI bilingual editorial guide cover for a Nara day trip from an Osaka base. Landscape 3:2 composition. Premium contemporary hand-painted gouache travel magazine illustration, fine grain, clean shapes, bright readable daylight, balanced leafy greens, pale blue sky, stone gray and small coral clothing accents. A broad tree-lined park path curves toward a modest traditional Japanese roof silhouette far in the background. Two anonymous adult travelers stay together on the path in the middle distance, quietly observing three sika deer grazing well away on a grassy area; show a clear generous distance between people and deer. Emphasize patient looking and a slow day outdoors. Natural anatomically coherent animals, natural human proportions. No feeding, touching, petting, posing with or approaching deer; no snacks or crackers. Keep subjects within central 70 percent so a wide crop and a mobile 3:2 crop remain coherent. The park is an imagined Nara-inspired scene, not a reconstruction or photo of Nara Park or Todaiji; do not depict the Great Buddha, an identifiable temple facade, exact maps or religious artworks. No text, letters, logos, mascots, watermark, frame, floating ornaments or UI. Inviting and quietly interesting, not a dramatic spectacle or a safety guarantee.
```

### Corrective Edit Prompt

The generated first version was the sole edit reference.

```text
Use case: precise-object-edit. Edit only the overlapping deer cluster in the right-middle foreground on the grass, directly above the rocky pond. It currently looks like a merged two-headed animal. Replace that entire cluster with ONE clearly defined anatomically correct sika deer in side profile grazing, with one head lowered to the left, one neck, one torso and exactly four natural legs. Keep the two other smaller deer in the background unchanged, for a total of three deer. Preserve the travelers, their distance from the deer, the path, trees, pond, distant roof, palette, lighting, gouache style, landscape dimensions and all other composition. No text or other additions.
```

## Future Reuse

Keep AI identification visible, preserve the source originals and document future replacements. Inspect anatomy, unintended lettering, cropping and mobile legibility before publication. Do not treat illustrated roads, facilities, food counters or hotel surroundings as travel facts. Nothing in this imagery establishes current prices, availability, opening hours, entry rules, safety, accessibility or booking guarantees.

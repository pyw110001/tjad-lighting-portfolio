# Night architecture scenes

Source: https://github.com/pyw110001/threejs-night-architecture

Pinned commit: `d6b7cf166038332bef29a9f7fa64508b426454b4`.

The scene factories, geometry, materials, surface details, batching, and necessary
component specifications are adapted from that commit. Material images are copied
to `public/assets/light-lab/night`. The upstream repository does not contain a
LICENSE file; this record identifies the supplied source, not a new license grant.

Integration changes: material paths are namespaced; model specifications contain
only runtime fields; stand-alone DOM UI, roaming, collision controls, and external
model loading are omitted. Static display sculptures remain. Scene-specific
environment targets are disposed and shared environment geometry is cloned per use.
The original elliptical display winding is retained. The mixed upstream JS/TS
is retained as vendor TS with `@ts-nocheck`; the host renderer, mapping, and interfaces
are strictly typed. Media mapping is implemented in the host adapter, with native
materials retained for the built-in previews.

The retired upstream dot/hex pavilion sources are retained for provenance only;
they are not registered or imported by the active scene factories.

The current studio exposes only City Dome, Fluid Facade, and Light Field Plaza.
The dome maps the front image as a mirror on its rear; the fluid curtain stretches
media across each full half of its envelope. The plaza ignores media entirely and
uses the host-owned nine-second, bottom-up warm-white breathing cycle.

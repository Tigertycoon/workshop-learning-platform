# Unity runtime model-loading sample

`Activity-example` is a minimal Unity URP project. The scene provides a small gorge layout and a `GlbLoader` component that loads the included `Assets/wooden_bridge.glb` at runtime using glTFast.

## Open it

Open `Activity-example` in Unity Hub using the editor version recorded in `ProjectSettings/ProjectVersion.txt`. Let the Unity Package Manager resolve the pinned packages, then open `Assets/Scenes/SampleScene.unity` and enter Play mode.

The project was imported and compiled successfully in Unity **6000.3.19f1** on Windows. Runtime/visual behavior and a WebGL build were not tested as part of publication preparation.

The component's `testFilePath` is project-relative. It no longer depends on the original author's Windows home directory or a separate localhost upload service. Unity account/project associations and optional development bridges are omitted.

## C# entry points

- `LoadFromFile(path, parent)` resolves a local file path relative to the Unity project and reads its bytes. This path is for editor/desktop experiments.
- `LoadFromBytes(data, parent)` imports a GLB buffer and instantiates its main scene.
- `LoadModel(url, parent)` delegates URL loading to glTFast. WebGL usage needs an accessible URL, compatible hosting/CORS and a separate build test.

The sample does not implement a completed web upload-to-Unity workflow, gameplay controls or an XR interaction system. It is a small implementation example alongside the web platform.

The environment images in the root README show separate Unity work by the owner; those full environment scenes are not bundled into this minimal sample. Alternative model iterations and generated game builds remain outside the release tree to keep the checkout focused.

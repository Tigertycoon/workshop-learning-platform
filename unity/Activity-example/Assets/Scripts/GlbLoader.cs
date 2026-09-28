using System.IO;
using System.Threading.Tasks;
using GLTFast;
using UnityEngine;

/// <summary>
/// L\u00e4dt zur Laufzeit ein GLB-Modell und instanziiert es.
/// Zwei Wege:
///  - LoadFromFile/LoadFromBytes: lokale Datei \u2192 Bytes \u2192 glTFast (robust im Editor, Leerzeichen im Pfad egal)
///  - LoadModel(url): Download via UnityWebRequest (f\u00fcr den sp\u00e4teren WebGL-Build)
/// Grundbaustein f\u00fcr die Selbstlern-Aktivit\u00e4t "Br\u00fccke bauen".
/// </summary>
public class GlbLoader : MonoBehaviour
{
    [Tooltip("Optionaler lokaler Dateipfad (Editor-Test): wird beim Start aus Bytes geladen.")]
    public string testFilePath;

    [Tooltip("Optionale Test-URL (http/file): wird beim Start geladen, falls kein testFilePath gesetzt ist.")]
    public string testUrl;

    async void Start()
    {
        if (!string.IsNullOrEmpty(testFilePath))
        {
            await LoadFromFile(testFilePath, null);
        }
        else if (!string.IsNullOrEmpty(testUrl))
        {
            await LoadModel(testUrl, null);
        }
    }

    /// <summary>L\u00e4dt ein GLB von einem lokalen Pfad (\u00fcber Bytes).</summary>
    public async Task<GameObject> LoadFromFile(string path, Transform parent)
    {
        if (!Path.IsPathRooted(path))
        {
            path = Path.GetFullPath(Path.Combine(Application.dataPath, "..", path));
        }

        if (!File.Exists(path))
        {
            Debug.LogError($"[GlbLoader] Datei nicht gefunden: {path}");
            return null;
        }

        byte[] data = File.ReadAllBytes(path);
        return await LoadFromBytes(data, parent);
    }

    /// <summary>L\u00e4dt ein GLB aus Bytes (glTFast LoadGltfBinary).</summary>
    public async Task<GameObject> LoadFromBytes(byte[] data, Transform parent)
    {
        var gltf = new GltfImport();

        bool success = await gltf.LoadGltfBinary(data);
        if (!success)
        {
            Debug.LogError("[GlbLoader] LoadGltfBinary fehlgeschlagen.");
            return null;
        }

        return await InstantiateScene(gltf, parent);
    }

    /// <summary>L\u00e4dt ein GLB von einer URL (Download via glTFast / UnityWebRequest).</summary>
    public async Task<GameObject> LoadModel(string url, Transform parent)
    {
        var gltf = new GltfImport();

        bool success = await gltf.Load(url);
        if (!success)
        {
            Debug.LogError($"[GlbLoader] Konnte GLB nicht laden: {url}");
            return null;
        }

        return await InstantiateScene(gltf, parent);
    }

    async Task<GameObject> InstantiateScene(GltfImport gltf, Transform parent)
    {
        var root = new GameObject("LoadedModel");
        if (parent != null)
        {
            root.transform.SetParent(parent, false);
        }

        bool instantiated = await gltf.InstantiateMainSceneAsync(root.transform);
        if (!instantiated)
        {
            Debug.LogError("[GlbLoader] Instanziierung fehlgeschlagen.");
            Destroy(root);
            return null;
        }

        return root;
    }
}

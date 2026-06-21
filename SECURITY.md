# Security Policy

## Threat model

SuperSimplePDF renders a document from two inputs: a source JSON and a theme. The trust level of each is different, and the engine is built around that split.

- Source JSON is data. It can come from untrusted input, including content a user supplies. The engine reads it as a description of what to render. It is never executed as code.
- Theme files are code. A `.js` theme is loaded with `require` and runs with the privileges of your process. A theme is a module you choose to import, so only load themes you trust. Built-in themes referenced by name are part of the package and are safe.
- Output is a file on disk. The caller chooses `outputPath`. Point it somewhere your process is allowed to write.

## Behaviors worth knowing

### Image paths are contained

The `image` operation reads a file from disk through its `src` field. To stop an untrusted source document from pulling arbitrary files into a PDF, `src` must be a relative path that resolves inside the current working directory. Absolute paths, parent directory traversal with `..`, and null bytes are rejected. This is enforced both when an image is rendered and when its height is measured during layout.

### Image size is limited

A source document cannot force the engine to read an unbounded image file. Image files are rejected if they exceed 50MB. This limits memory exhaustion from malicious or accidental huge inputs.

### Colors are clamped

RGB color arrays in themes and sources are clamped to the 0-255 range before being passed to jsPDF. Out-of-range values cannot corrupt the PDF content stream.

### No network access

The base install has no runtime dependencies and makes no network calls, so a source document cannot trigger an outbound request. The optional chart plugin adds the `canvas` native module, which renders charts locally.

### Theme code runs

Because themes are real JavaScript modules, a malicious theme can do anything your process can. This is by design, themes need to compute layout, but it means theme files must be treated as trusted code, not as configuration data.

## Supported versions

Security fixes land on the latest published version. The image path containment, image size limit, and RGB clamping were introduced in 1.3.2. If you run an older version and accept untrusted source documents, upgrade.

```bash
npm install h17-sspdf
```

## Reporting a vulnerability

If you find a security issue, please do not open a public issue first. Report it privately:

- Open a GitHub security advisory on the repository, or
- Email the maintainer at the address listed on the npm package and GitHub profile.

Include the version, a description, and steps to reproduce. You will get an acknowledgement, and a fix or explanation will follow. Coordinated disclosure is appreciated.

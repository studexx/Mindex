import Foundation
import AppKit
import Vision

let paths = Array(CommandLine.arguments.dropFirst())
if paths.isEmpty {
  fputs("usage: swift scripts/vision_ocr_text.swift <image>...\n", stderr)
  exit(2)
}

func jsonLine(_ value: Any) {
  do {
    let data = try JSONSerialization.data(withJSONObject: value, options: [])
    print(String(data: data, encoding: .utf8) ?? "{}")
  } catch {
    print("{\"error\":\"json\"}")
  }
}

for path in paths {
  let url = URL(fileURLWithPath: path)
  guard let image = NSImage(contentsOf: url) else {
    jsonLine(["path": path, "error": "image-load"])
    continue
  }
  var rect = CGRect(origin: .zero, size: image.size)
  guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
    jsonLine(["path": path, "error": "cgimage"])
    continue
  }

  var boxes: [[String: Any]] = []
  let request = VNRecognizeTextRequest { request, error in
    guard error == nil else { return }
    let observations = request.results as? [VNRecognizedTextObservation] ?? []
    for observation in observations {
      guard let candidate = observation.topCandidates(1).first else { continue }
      let box = observation.boundingBox
      boxes.append([
        "text": candidate.string,
        "confidence": candidate.confidence,
        "x": box.origin.x,
        "y": box.origin.y,
        "width": box.size.width,
        "height": box.size.height,
      ])
    }
  }
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.recognitionLanguages = ["ko-KR", "en-US"]

  do {
    try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
    jsonLine(["path": path, "boxes": boxes])
  } catch {
    jsonLine(["path": path, "error": error.localizedDescription])
  }
}

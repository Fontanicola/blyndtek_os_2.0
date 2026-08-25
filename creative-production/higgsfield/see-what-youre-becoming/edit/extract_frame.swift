import AppKit
import AVFoundation
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 4, let seconds = Double(arguments[2]) else {
    fputs("Usage: extract_frame.swift <video.mp4> <seconds> <output.png>\n", stderr)
    exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: arguments[1]))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.02, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.02, preferredTimescale: 600)
let frame = try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
let image = NSImage(cgImage: frame, size: .zero)
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not encode frame")
}
try png.write(to: URL(fileURLWithPath: arguments[3]))
print(arguments[3])

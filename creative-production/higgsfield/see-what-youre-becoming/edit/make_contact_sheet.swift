import AppKit
import AVFoundation
import Foundation

let arguments = CommandLine.arguments
guard arguments.count >= 4 else {
    fputs("Usage: make_contact_sheet.swift <video.mp4> <output.jpg> <time> [time ...]\n", stderr)
    exit(2)
}

let videoURL = URL(fileURLWithPath: arguments[1])
let outputURL = URL(fileURLWithPath: arguments[2])
let times = arguments.dropFirst(3).compactMap(Double.init)
let asset = AVURLAsset(url: videoURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
generator.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)

let columns = 3
let rows = Int(ceil(Double(times.count) / Double(columns)))
let cellWidth = 480
let cellHeight = 300
let image = NSImage(size: NSSize(width: columns * cellWidth, height: rows * cellHeight))
image.lockFocus()
NSColor(calibratedWhite: 0.04, alpha: 1).setFill()
NSRect(origin: .zero, size: image.size).fill()

for (index, seconds) in times.enumerated() {
    let time = CMTime(seconds: seconds, preferredTimescale: 600)
    let cg = try await generator.image(at: time).image
    let frame = NSImage(cgImage: cg, size: .zero)
    let column = index % columns
    let row = rows - 1 - index / columns
    let rect = NSRect(x: column * cellWidth, y: row * cellHeight, width: cellWidth, height: cellHeight)
    frame.draw(in: rect, from: .zero, operation: .copy, fraction: 1)
    let label = String(format: "%02.0fs", seconds)
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.monospacedDigitSystemFont(ofSize: 20, weight: .semibold),
        .foregroundColor: NSColor.white,
        .backgroundColor: NSColor.black.withAlphaComponent(0.65)
    ]
    label.draw(at: NSPoint(x: rect.minX + 12, y: rect.maxY - 34), withAttributes: attributes)
}
image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.88]) else {
    fatalError("Could not create contact sheet")
}
try jpeg.write(to: outputURL)
print(outputURL.path)

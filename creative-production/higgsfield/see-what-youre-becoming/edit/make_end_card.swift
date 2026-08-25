import AppKit
import AVFoundation
import CoreVideo
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 4 else {
    fputs("Usage: make_end_card.swift <logo.svg> <output.png> <output.mp4>\n", stderr)
    exit(2)
}

let logoURL = URL(fileURLWithPath: arguments[1])
let pngURL = URL(fileURLWithPath: arguments[2])
let videoURL = URL(fileURLWithPath: arguments[3])
let width = 1280
let height = 720
let navy = NSColor(calibratedRed: 38.0 / 255.0, green: 58.0 / 255.0, blue: 109.0 / 255.0, alpha: 1)

guard let logo = NSImage(contentsOf: logoURL) else {
    fputs("Could not load official logo SVG\n", stderr)
    exit(3)
}

let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

let logoWidth: CGFloat = 500
let logoHeight = logoWidth * logo.size.height / logo.size.width
let logoRect = NSRect(x: (CGFloat(width) - logoWidth) / 2,
                      y: CGFloat(height) / 2 + 18,
                      width: logoWidth,
                      height: logoHeight)
logo.draw(in: logoRect, from: .zero, operation: .sourceOver, fraction: 1)

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .center
let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 34, weight: .medium),
    .foregroundColor: navy,
    .kern: 0.2,
    .paragraphStyle: paragraph
]
let line = "See what you’re becoming."
line.draw(in: NSRect(x: 180, y: 240, width: 920, height: 60), withAttributes: attributes)
image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not render end card PNG\n", stderr)
    exit(4)
}
try png.write(to: pngURL)

try? FileManager.default.removeItem(at: videoURL)
let writer = try AVAssetWriter(outputURL: videoURL, fileType: .mp4)
let settings: [String: Any] = [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: width,
    AVVideoHeightKey: height,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 8_000_000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]
)
guard writer.canAdd(input) else { fatalError("Cannot add video input") }
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

guard let cgImage = bitmap.cgImage else { fatalError("Could not create CGImage") }
func pixelBuffer() -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32ARGB,
                        [kCVPixelBufferCGImageCompatibilityKey: true,
                         kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary,
                        &buffer)
    let target = buffer!
    CVPixelBufferLockBaseAddress(target, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(target),
                            width: width,
                            height: height,
                            bitsPerComponent: 8,
                            bytesPerRow: CVPixelBufferGetBytesPerRow(target),
                            space: CGColorSpaceCreateDeviceRGB(),
                            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(target, [])
    return target
}

let frame = pixelBuffer()
let fps: Int32 = 24
let frameCount = 72
for index in 0..<frameCount {
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
    adaptor.append(frame, withPresentationTime: CMTime(value: CMTimeValue(index), timescale: fps))
}
input.markAsFinished()
await writer.finishWriting()
guard writer.status == .completed else {
    fputs("End card export failed: \(writer.error?.localizedDescription ?? "unknown")\n", stderr)
    exit(5)
}
print(videoURL.path)

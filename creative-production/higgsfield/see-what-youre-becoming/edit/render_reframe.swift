import AppKit
import AVFoundation
import QuartzCore
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 5 else {
    fputs("Usage: render_reframe.swift <master.mp4> <width> <height> <output.mp4>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: arguments[1])
let targetWidth = CGFloat(Int(arguments[2]) ?? 1080)
let targetHeight = CGFloat(Int(arguments[3]) ?? 1920)
let outputURL = URL(fileURLWithPath: arguments[4])
let targetSize = CGSize(width: targetWidth, height: targetHeight)
let asset = AVURLAsset(url: inputURL)
let duration = try await asset.load(.duration)
guard let sourceVideo = try await asset.loadTracks(withMediaType: .video).first else { fatalError("Missing video") }
let sourceSize = try await sourceVideo.load(.naturalSize)

let composition = AVMutableComposition()
guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Could not create video track")
}
try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
guard let backgroundTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Could not create background video track")
}
try backgroundTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
if let sourceAudio = try await asset.loadTracks(withMediaType: .audio).first,
   let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudio, at: .zero)
}

let scale = min(targetWidth / sourceSize.width, targetHeight / sourceSize.height)
let scaledWidth = sourceSize.width * scale
let scaledHeight = sourceSize.height * scale
let offsetX = (targetWidth - scaledWidth) / 2
let offsetY = (targetHeight - scaledHeight) / 2
let transform = CGAffineTransform(scaleX: scale, y: scale)
    .translatedBy(x: offsetX / scale, y: offsetY / scale)
let backgroundScale = max(targetWidth / sourceSize.width, targetHeight / sourceSize.height)
let backgroundWidth = sourceSize.width * backgroundScale
let backgroundHeight = sourceSize.height * backgroundScale
let backgroundX = (targetWidth - backgroundWidth) / 2
let backgroundY = (targetHeight - backgroundHeight) / 2
let backgroundTransform = CGAffineTransform(scaleX: backgroundScale, y: backgroundScale)
    .translatedBy(x: backgroundX / backgroundScale, y: backgroundY / backgroundScale)

let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
layerInstruction.setTransform(transform, at: .zero)
let backgroundInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: backgroundTrack)
backgroundInstruction.setTransform(backgroundTransform, at: .zero)
backgroundInstruction.setOpacity(0.22, at: .zero)
let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
instruction.layerInstructions = [layerInstruction, backgroundInstruction]
let videoComposition = AVMutableVideoComposition()
videoComposition.renderSize = targetSize
videoComposition.frameDuration = CMTime(value: 1, timescale: 24)
videoComposition.instructions = [instruction]

let parent = CALayer()
let videoLayer = CALayer()
parent.frame = CGRect(origin: .zero, size: targetSize)
parent.backgroundColor = NSColor(calibratedRed: 38.0 / 255.0,
                                 green: 58.0 / 255.0,
                                 blue: 109.0 / 255.0,
                                 alpha: 1).cgColor
videoLayer.frame = parent.frame
parent.addSublayer(videoLayer)

let accent = NSColor(calibratedRed: 223.0 / 255.0,
                     green: 238.0 / 255.0,
                     blue: 1,
                     alpha: 1).cgColor
for y in [offsetY - 4, offsetY + scaledHeight + 2] {
    let line = CALayer()
    line.frame = CGRect(x: offsetX, y: y, width: scaledWidth, height: 2)
    line.backgroundColor = accent
    line.opacity = 0.72
    parent.addSublayer(line)
}
videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer, in: parent)

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fatalError("Could not create exporter")
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.videoComposition = videoComposition
exporter.shouldOptimizeForNetworkUse = true
await exporter.export()
guard exporter.status == .completed else {
    fputs("Reframe export failed: \(exporter.error?.localizedDescription ?? "unknown")\n", stderr)
    exit(4)
}
print(outputURL.path)

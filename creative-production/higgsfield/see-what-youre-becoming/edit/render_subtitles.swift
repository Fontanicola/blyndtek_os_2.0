import AppKit
import AVFoundation
import QuartzCore
import Foundation

struct Cue: Decodable {
    let text: String
    let source_in: Double
    let duration: Double
    let timeline_in: Double
}
struct CueSheet: Decodable { let source: String; let cues: [Cue] }

let arguments = CommandLine.arguments
guard arguments.count == 4 else {
    fputs("Usage: render_subtitles.swift <master.mp4> <cues.json> <output.mp4>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: arguments[1])
let cueURL = URL(fileURLWithPath: arguments[2])
let outputURL = URL(fileURLWithPath: arguments[3])
let cues = try JSONDecoder().decode(CueSheet.self, from: Data(contentsOf: cueURL))
let asset = AVURLAsset(url: inputURL)
let duration = try await asset.load(.duration)
guard let sourceVideo = try await asset.loadTracks(withMediaType: .video).first else { fatalError("Missing video") }
let naturalSize = try await sourceVideo.load(.naturalSize)

let composition = AVMutableComposition()
guard let videoTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Could not create video track")
}
try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceVideo, at: .zero)
if let sourceAudio = try await asset.loadTracks(withMediaType: .audio).first,
   let audioTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
    try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: sourceAudio, at: .zero)
}

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: duration)
instruction.layerInstructions = [AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)]
let videoComposition = AVMutableVideoComposition()
videoComposition.renderSize = naturalSize
videoComposition.frameDuration = CMTime(value: 1, timescale: 24)
videoComposition.instructions = [instruction]

let parentLayer = CALayer()
let videoLayer = CALayer()
parentLayer.frame = CGRect(origin: .zero, size: naturalSize)
videoLayer.frame = parentLayer.frame
parentLayer.addSublayer(videoLayer)

let scale = naturalSize.width / 1920.0
func makeSubtitleImage(_ value: String, width: CGFloat, height: CGFloat, fontSize: CGFloat) -> CGImage {
    let image = NSImage(size: NSSize(width: width, height: height))
    image.lockFocus()
    NSColor.clear.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    NSColor.black.withAlphaComponent(0.68).setFill()
    NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: width, height: height),
                 xRadius: 10 * scale,
                 yRadius: 10 * scale).fill()
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize, weight: .medium),
        .foregroundColor: NSColor.white,
        .paragraphStyle: paragraph
    ]
    value.draw(in: NSRect(x: 22 * scale, y: 15 * scale,
                          width: width - 44 * scale,
                          height: height - 20 * scale),
               withAttributes: attributes)
    image.unlockFocus()
    var proposed = NSRect(origin: .zero, size: image.size)
    return image.cgImage(forProposedRect: &proposed, context: nil, hints: nil)!
}

for cue in cues.cues {
    let container = CALayer()
    container.frame = CGRect(x: naturalSize.width * 0.12,
                             y: naturalSize.height * 0.075,
                             width: naturalSize.width * 0.76,
                             height: 92 * scale)
    container.contents = makeSubtitleImage(cue.text,
                                           width: container.bounds.width,
                                           height: container.bounds.height,
                                           fontSize: 38 * scale)
    container.contentsGravity = .resizeAspect
    container.contentsScale = 2
    container.opacity = 0

    let animation = CAKeyframeAnimation(keyPath: "opacity")
    animation.values = [0, 1, 1, 0]
    animation.keyTimes = [0, 0.025, 0.94, 1]
    animation.beginTime = AVCoreAnimationBeginTimeAtZero + cue.timeline_in
    animation.duration = cue.duration
    animation.isRemovedOnCompletion = false
    animation.fillMode = .both
    container.add(animation, forKey: "subtitle-\(cue.timeline_in)")
    parentLayer.addSublayer(container)
}

videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: videoLayer,
                                                                      in: parentLayer)

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
    fputs("Subtitle export failed: \(exporter.error?.localizedDescription ?? "unknown")\n", stderr)
    exit(4)
}
print(outputURL.path)

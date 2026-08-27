import AVFoundation
import Foundation

struct Canvas: Decodable { let width: Int; let height: Int }
struct Clip: Decodable {
    let id: String
    let file: String
    let source_in: Double
    let duration: Double
    let purpose: String
}
struct EDL: Decodable {
    let title: String
    let timebase: Int32
    let canvas: Canvas
    let duration_seconds: Double
    let clips: [Clip]
}

let arguments = CommandLine.arguments
guard arguments.count == 4 else {
    fputs("Usage: render_rough_cut.swift <edl.json> <temp-voice.aiff> <output.mp4>\n", stderr)
    exit(2)
}

let edlURL = URL(fileURLWithPath: arguments[1])
let voiceURL = URL(fileURLWithPath: arguments[2])
let outputURL = URL(fileURLWithPath: arguments[3])
let editDirectory = edlURL.deletingLastPathComponent()
let edl = try JSONDecoder().decode(EDL.self, from: Data(contentsOf: edlURL))

let composition = AVMutableComposition()
guard let videoTrack = composition.addMutableTrack(withMediaType: .video,
                                                   preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Could not create composition video track")
}

var cursor = CMTime.zero
for clip in edl.clips {
    let url = URL(fileURLWithPath: clip.file, relativeTo: editDirectory).standardizedFileURL
    let asset = AVURLAsset(url: url)
    guard let sourceTrack = try await asset.loadTracks(withMediaType: .video).first else {
        fatalError("Missing video track: \(url.path)")
    }
    let sourceDuration = try await asset.load(.duration)
    let start = CMTime(seconds: clip.source_in, preferredTimescale: 600)
    let requested = CMTime(seconds: clip.duration, preferredTimescale: 600)
    guard CMTimeCompare(CMTimeAdd(start, requested), sourceDuration) <= 0 else {
        fatalError("Requested range exceeds \(clip.id): \(clip.source_in)+\(clip.duration)")
    }
    try videoTrack.insertTimeRange(CMTimeRange(start: start, duration: requested),
                                   of: sourceTrack,
                                   at: cursor)
    cursor = CMTimeAdd(cursor, requested)
}

let expected = CMTime(seconds: edl.duration_seconds, preferredTimescale: 600)
guard abs(CMTimeGetSeconds(cursor) - edl.duration_seconds) < 0.001 else {
    fatalError("EDL duration is \(CMTimeGetSeconds(cursor)), expected \(edl.duration_seconds)")
}

if FileManager.default.fileExists(atPath: voiceURL.path) {
    let voiceAsset = AVURLAsset(url: voiceURL)
    if let sourceVoice = try await voiceAsset.loadTracks(withMediaType: .audio).first,
       let audioTrack = composition.addMutableTrack(withMediaType: .audio,
                                                    preferredTrackID: kCMPersistentTrackID_Invalid) {
        let voiceDuration = try await voiceAsset.load(.duration)
        let available = CMTimeMinimum(voiceDuration, expected)
        try audioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: available),
                                       of: sourceVoice,
                                       at: .zero)
    }
}

let instruction = AVMutableVideoCompositionInstruction()
instruction.timeRange = CMTimeRange(start: .zero, duration: expected)
let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: videoTrack)
layerInstruction.setOpacity(0, at: .zero)
layerInstruction.setOpacityRamp(fromStartOpacity: 0,
                                toEndOpacity: 1,
                                timeRange: CMTimeRange(start: CMTime(seconds: 0.35, preferredTimescale: 600),
                                                       duration: CMTime(seconds: 1.35, preferredTimescale: 600)))
instruction.layerInstructions = [layerInstruction]
let videoComposition = AVMutableVideoComposition()
videoComposition.renderSize = CGSize(width: edl.canvas.width, height: edl.canvas.height)
videoComposition.frameDuration = CMTime(value: 1, timescale: edl.timebase)
videoComposition.instructions = [instruction]

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(asset: composition,
                                          presetName: AVAssetExportPresetHighestQuality) else {
    fatalError("Could not create export session")
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
exporter.timeRange = CMTimeRange(start: .zero, duration: expected)
exporter.videoComposition = videoComposition
await exporter.export()
guard exporter.status == .completed else {
    fputs("Rough cut export failed: \(exporter.error?.localizedDescription ?? "unknown")\n", stderr)
    exit(4)
}
print(outputURL.path)

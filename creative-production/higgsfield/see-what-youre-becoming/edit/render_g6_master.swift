import AVFoundation
import Foundation

struct Cue: Decodable {
    let text: String
    let source_in: Double
    let duration: Double
    let timeline_in: Double
}
struct CueSheet: Decodable { let source: String; let cues: [Cue] }

let arguments = CommandLine.arguments
guard arguments.count == 7 else {
    fputs("Usage: render_g6_master.swift <picture.mp4> <cues.json> <score.m4a> <signature.wav> <output.mp4> <duration>\n", stderr)
    exit(2)
}

let pictureURL = URL(fileURLWithPath: arguments[1])
let cueURL = URL(fileURLWithPath: arguments[2])
let scoreURL = URL(fileURLWithPath: arguments[3])
let signatureURL = URL(fileURLWithPath: arguments[4])
let outputURL = URL(fileURLWithPath: arguments[5])
let masterDuration = Double(arguments[6]) ?? 60
let timescale: CMTimeScale = 600
let duration = CMTime(seconds: masterDuration, preferredTimescale: timescale)
let cues = try JSONDecoder().decode(CueSheet.self, from: Data(contentsOf: cueURL))
let voiceURL = URL(fileURLWithPath: cues.source, relativeTo: cueURL.deletingLastPathComponent()).standardizedFileURL

let composition = AVMutableComposition()
let pictureAsset = AVURLAsset(url: pictureURL)
guard let pictureSource = try await pictureAsset.loadTracks(withMediaType: .video).first,
      let pictureTrack = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Missing picture track")
}
try pictureTrack.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: pictureSource, at: .zero)

let voiceAsset = AVURLAsset(url: voiceURL)
guard let voiceSource = try await voiceAsset.loadTracks(withMediaType: .audio).first,
      let voiceTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Missing voice track")
}
for cue in cues.cues {
    let sourceRange = CMTimeRange(start: CMTime(seconds: cue.source_in, preferredTimescale: timescale),
                                  duration: CMTime(seconds: cue.duration, preferredTimescale: timescale))
    try voiceTrack.insertTimeRange(sourceRange,
                                   of: voiceSource,
                                   at: CMTime(seconds: cue.timeline_in, preferredTimescale: timescale))
}

let scoreAsset = AVURLAsset(url: scoreURL)
guard let scoreSource = try await scoreAsset.loadTracks(withMediaType: .audio).first,
      let scoreTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Missing score track")
}
let scoreDuration = try await scoreAsset.load(.duration)
try scoreTrack.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(scoreDuration, duration)), of: scoreSource, at: .zero)

let signatureAsset = AVURLAsset(url: signatureURL)
guard let signatureSource = try await signatureAsset.loadTracks(withMediaType: .audio).first,
      let signatureTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
    fatalError("Missing signature track")
}
let signatureDuration = try await signatureAsset.load(.duration)
try signatureTrack.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(signatureDuration, duration)), of: signatureSource, at: .zero)

let voiceParameters = AVMutableAudioMixInputParameters(track: voiceTrack)
voiceParameters.setVolume(1.0, at: .zero)

let scoreParameters = AVMutableAudioMixInputParameters(track: scoreTrack)
scoreParameters.setVolumeRamp(fromStartVolume: 0.08,
                              toEndVolume: 0.20,
                              timeRange: CMTimeRange(start: .zero, duration: CMTime(seconds: 4, preferredTimescale: timescale)))
scoreParameters.setVolume(0.15, at: CMTime(seconds: 4, preferredTimescale: timescale))
scoreParameters.setVolumeRamp(fromStartVolume: 0.15,
                              toEndVolume: 0.22,
                              timeRange: CMTimeRange(start: CMTime(seconds: 48, preferredTimescale: timescale),
                                                     duration: CMTime(seconds: 7, preferredTimescale: timescale)))
scoreParameters.setVolumeRamp(fromStartVolume: 0.22,
                              toEndVolume: 0.10,
                              timeRange: CMTimeRange(start: CMTime(seconds: 55, preferredTimescale: timescale),
                                                     duration: CMTime(seconds: 5, preferredTimescale: timescale)))

let signatureParameters = AVMutableAudioMixInputParameters(track: signatureTrack)
signatureParameters.setVolumeRamp(fromStartVolume: 0.65,
                                  toEndVolume: 0.18,
                                  timeRange: CMTimeRange(start: .zero, duration: CMTime(seconds: 4, preferredTimescale: timescale)))
signatureParameters.setVolumeRamp(fromStartVolume: 0.18,
                                  toEndVolume: 0,
                                  timeRange: CMTimeRange(start: CMTime(seconds: 4, preferredTimescale: timescale),
                                                         duration: CMTime(seconds: 5.5, preferredTimescale: timescale)))

let audioMix = AVMutableAudioMix()
audioMix.inputParameters = [voiceParameters, scoreParameters, signatureParameters]

try? FileManager.default.removeItem(at: outputURL)
guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fatalError("Could not create export session")
}
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
exporter.audioMix = audioMix
exporter.timeRange = CMTimeRange(start: .zero, duration: duration)
await exporter.export()
guard exporter.status == .completed else {
    fputs("Master export failed: \(exporter.error?.localizedDescription ?? "unknown")\n", stderr)
    exit(4)
}
print(outputURL.path)

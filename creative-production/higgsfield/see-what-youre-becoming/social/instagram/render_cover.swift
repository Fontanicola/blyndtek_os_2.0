import AppKit

let canvasSize = NSSize(width: 1080, height: 1350)
let baseURL = URL(fileURLWithPath: CommandLine.arguments[1])
let logoURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

guard let base = NSImage(contentsOf: baseURL),
      let logo = NSImage(contentsOf: logoURL) else {
    fatalError("Could not load cover base or logo")
}

let image = NSImage(size: canvasSize)
image.lockFocus()

NSColor.black.setFill()
NSRect(origin: .zero, size: canvasSize).fill()
base.draw(in: NSRect(origin: .zero, size: canvasSize),
          from: NSRect(origin: .zero, size: base.size),
          operation: .sourceOver,
          fraction: 1)

// Quiet editorial vignette: keeps the film cinematic while preserving the
// pale-blue glow already used across the current Blyndtek feed.
let overlay = NSGradient(colorsAndLocations:
    (NSColor(calibratedWhite: 0, alpha: 0.20), 0.0),
    (NSColor(calibratedWhite: 0, alpha: 0.04), 0.48),
    (NSColor(calibratedWhite: 0, alpha: 0.24), 1.0)
)!
overlay.draw(in: NSRect(origin: .zero, size: canvasSize), angle: -90)

let centered = NSMutableParagraphStyle()
centered.alignment = .center
centered.lineBreakMode = .byWordWrapping

let eyebrowFont = NSFont.systemFont(ofSize: 22, weight: .semibold)
let eyebrow = NSAttributedString(string: "BLYNDTEK PRESENTA", attributes: [
    .font: eyebrowFont,
    .foregroundColor: NSColor(calibratedRed: 0.84, green: 0.92, blue: 1.0, alpha: 0.96),
    .kern: 4.2,
    .paragraphStyle: centered
])
eyebrow.draw(in: NSRect(x: 140, y: 1035, width: 800, height: 35))

let headlineStyle = centered.mutableCopy() as! NSMutableParagraphStyle
headlineStyle.lineSpacing = 1
headlineStyle.maximumLineHeight = 78
headlineStyle.minimumLineHeight = 78
let headline = NSAttributedString(string: "TU EMPRESA CRECIÓ.\n¿TUS SISTEMAS TAMBIÉN?", attributes: [
    .font: NSFont.systemFont(ofSize: 68, weight: .medium),
    .foregroundColor: NSColor.white,
    .kern: -1.6,
    .paragraphStyle: headlineStyle
])
headline.draw(in: NSRect(x: 92, y: 815, width: 896, height: 180))

// A small official-logo capsule mirrors the restrained logo placement of the feed.
let capsule = NSBezierPath(roundedRect: NSRect(x: 426, y: 1135, width: 228, height: 64), xRadius: 32, yRadius: 32)
NSColor(calibratedRed: 0.94, green: 0.97, blue: 1.0, alpha: 0.94).setFill()
capsule.fill()
logo.draw(in: NSRect(x: 457, y: 1150, width: 166, height: 34),
          from: NSRect(origin: .zero, size: logo.size),
          operation: .sourceOver,
          fraction: 1)

image.unlockFocus()

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize.width),
    pixelsHigh: Int(canvasSize.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    fatalError("Could not create output bitmap")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
image.draw(in: NSRect(origin: .zero, size: canvasSize))
NSGraphicsContext.current?.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Could not encode cover")
}
try png.write(to: outputURL)

import Cocoa
import QuartzCore

private var globalX: CGFloat = 20.0
private var globalY: CGFloat = 18.0

@available(macOS 14.0, *)
class TrafficLightObserverView: NSView {
    private var displayLink: CADisplayLink?

    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()

        if self.window != nil {
            if #available(macOS 15.0, *) {

                let link = self.displayLink(target: self, selector: #selector(forceReposition))

                link.add(to: RunLoop.main, forMode: RunLoop.Mode.common)

                link.isPaused = false
                self.displayLink = link
            }
        }
    }

    @objc func forceReposition() {
        reposition()
    }

    override func layout() {
        super.layout()
        reposition()
    }

    func reposition() {
        guard let window = self.window, !window.styleMask.contains(.fullScreen) else { return }

        if let close = window.standardWindowButton(.closeButton),
            let mini = window.standardWindowButton(.miniaturizeButton),
            let zoom = window.standardWindowButton(.zoomButton),
            let titleBar = close.superview
        {

            let bSize = close.bounds.size
            let spacing: CGFloat = 8.0
            let targetY = titleBar.bounds.height - globalY - bSize.height

            if abs(close.frame.origin.x - globalX) > 0.1
                || abs(close.frame.origin.y - targetY) > 0.1
            {
                close.setFrameOrigin(NSPoint(x: globalX, y: targetY))
                mini.setFrameOrigin(NSPoint(x: globalX + bSize.width + spacing, y: targetY))
                zoom.setFrameOrigin(NSPoint(x: globalX + (bSize.width + spacing) * 2, y: targetY))
            }
        }
    }

    deinit {
        displayLink?.invalidate()
    }
}

private var observerView: NSView?
private var hasAddedAccessory = false

@_cdecl("SetTrafficLightPosition")
public func SetTrafficLightPosition(x: Double, y: Double) {
    globalX = CGFloat(x)
    globalY = CGFloat(y)

    DispatchQueue.main.async {
        guard let window = NSApplication.shared.windows.first(where: { $0.canBecomeMain }),
            let contentView = window.contentView
        else { return }

        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true

        if !hasAddedAccessory {
            let accessory = NSTitlebarAccessoryViewController()
            accessory.layoutAttribute = .leading
            accessory.view = NSView(frame: NSRect(x: 0, y: 0, width: 100, height: 0))
            window.addTitlebarAccessoryViewController(accessory)
            hasAddedAccessory = true
        }

        if observerView == nil {
            if #available(macOS 14.0, *) {
                let view = TrafficLightObserverView(frame: contentView.bounds)
                view.autoresizingMask = [.width, .height]
                contentView.addSubview(view)
                observerView = view
            }
        }

        if #available(macOS 14.0, *) {
            (observerView as? TrafficLightObserverView)?.reposition()
        }
    }
}

import Cocoa

private var globalX: CGFloat = 20.0
private var globalY: CGFloat = 18.0

class TrafficLightObserverView: NSView {
    override func layout() {
        super.layout()
        
        guard let window = self.window, !window.styleMask.contains(.fullScreen) else { return }
        
        if let close = window.standardWindowButton(.closeButton),
           let mini = window.standardWindowButton(.miniaturizeButton),
           let zoom = window.standardWindowButton(.zoomButton),
           let titleBar = close.superview {
            
            let buttonSize = close.bounds.size
            let spacing: CGFloat = 8.0
            
            // X stays the same
            let closeX = globalX
            let miniX = closeX + buttonSize.width + spacing
            let zoomX = miniX + buttonSize.width + spacing
            
            // Y FIX: 
            // titleBar.bounds.height is the total available height.
            // globalY is your offset from the TOP.
            // buttonSize.height is the height of the button.
            // We subtract BOTH to find the bottom-left coordinate.
            let yPos = titleBar.bounds.height - globalY - buttonSize.height
            
            close.setFrameOrigin(NSPoint(x: closeX, y: yPos))
            mini.setFrameOrigin(NSPoint(x: miniX, y: yPos))
            zoom.setFrameOrigin(NSPoint(x: zoomX, y: yPos))
        }
    }
}

private var observerView: TrafficLightObserverView?
private var hasAddedAccessory = false

@_cdecl("SetTrafficLightPosition")
public func SetTrafficLightPosition(x: Double, y: Double) {
    globalX = CGFloat(x)
    globalY = CGFloat(y)
    
    DispatchQueue.main.async {
        // Find the main application window
        guard let window = NSApplication.shared.windows.first(where: { $0.canBecomeMain }),
              let contentView = window.contentView else { return }
        
        // 1. Add the Accessory Spacer (prevents the 'reset' on height change)
        if !hasAddedAccessory {
            let accessory = NSTitlebarAccessoryViewController()
            accessory.layoutAttribute = .top
            
            // Make the spacer tall enough to accommodate your offset
            let spacerHeight: CGFloat = max(globalY + 20.0, 28.0)
            let spacerView = NSView(frame: NSRect(x: 0, y: 0, width: 1, height: spacerHeight))
            
            accessory.view = spacerView
            window.addTitlebarAccessoryViewController(accessory)
            hasAddedAccessory = true
        }
        
        // 2. Add the Layout Observer
        if observerView == nil {
            let view = TrafficLightObserverView(frame: contentView.bounds)
            view.autoresizingMask = [.width, .height]
            contentView.addSubview(view)
            observerView = view
        }
        
        observerView?.needsLayout = true
    }
}